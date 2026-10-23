import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { dbManager } from '../database/db';
import { domainModel } from '../models/domain.model';
import { collectionModel } from '../models/collection.model';
import { tagModel } from '../models/tag.model';
import { enrichmentService } from './enrichment.service';
import { webContents } from 'electron';

export interface ExportFilterOptions {
  format: 'html' | 'json' | 'csv';
  scope: 'all' | 'collection' | 'tag';
  collectionId?: number;
  tagId?: number;
  includeRecycleBin?: boolean;
}

export interface BookmarkExportItem {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  notes: string | null;
  domain: string | null;
  collections: string[];
  tags: string[];
  isFavorite: boolean;
  isImportant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedHtmlBookmark {
  url: string;
  title: string;
  description?: string;
  addDate?: number; // UNIX timestamp in ms
  folderPath: string[];
  tags: string[];
}

export interface HtmlImportResult {
  imported: number;
  duplicates: number;
  total: number;
  collectionsCreated: number;
  tagsCreated: number;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

export class BookmarkExchangeService {
  /**
   * Parses standard Netscape Bookmark HTML files (exported by Chrome, Firefox, Safari, Edge, Raindrop, etc.)
   */
  public parseNetscapeHtml(htmlContent: string): ParsedHtmlBookmark[] {
    const $ = cheerio.load(htmlContent);
    const results: ParsedHtmlBookmark[] = [];

    function walk(element: any, currentPath: string[]) {
      $(element).children().each((_, child) => {
        const tag = (child as any).tagName ? (child as any).tagName.toLowerCase() : '';

        if (tag === 'dt') {
          let folderName: string | null = null;
          $(child).children().each((_, grandChild) => {
            const gTag = (grandChild as any).tagName ? (grandChild as any).tagName.toLowerCase() : '';

            if (gTag === 'h3') {
              folderName = $(grandChild).text().trim();
            } else if (gTag === 'a') {
              const $a = $(grandChild);
              const url = $a.attr('href')?.trim();
              if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://'))) {
                const title = $a.text().trim() || url;
                const tagsStr = $a.attr('tags') || '';
                const tags = tagsStr
                  ? tagsStr.split(',').map(t => t.trim()).filter(Boolean)
                  : [];
                const addDateSec = parseInt($a.attr('add_date') || '0', 10);

                // Look for DD description following this DT or inside DT
                let description = '';
                const nextEl = $(child).next();
                if (nextEl.length && (nextEl[0] as any).tagName && (nextEl[0] as any).tagName.toLowerCase() === 'dd') {
                  description = nextEl.text().trim();
                } else {
                  const innerDd = $(child).find('dd');
                  if (innerDd.length) {
                    description = innerDd.text().trim();
                  }
                }

                results.push({
                  url,
                  title,
                  description,
                  addDate: addDateSec ? addDateSec * 1000 : Date.now(),
                  folderPath: [...currentPath],
                  tags
                });
              }
            } else if (gTag === 'dl' && folderName) {
              walk(grandChild, [...currentPath, folderName]);
              folderName = null;
            }
          });

          // In standard Netscape bookmark files, the DL list for a folder is often a direct sibling of the DT containing the H3
          if (folderName) {
            const nextDl = $(child).next('dl');
            if (nextDl.length) {
              walk(nextDl, [...currentPath, folderName]);
            }
          }
        } else if (tag === 'dl') {
          walk(child, currentPath);
        }
      });
    }

    const rootDl = $('dl').first();
    if (rootDl.length) {
      walk(rootDl, []);
    } else {
      // Fallback: If no DL structure exists, query all anchor tags directly
      $('a').each((_, a) => {
        const $a = $(a);
        const url = $a.attr('href')?.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          results.push({
            url,
            title: $a.text().trim() || url,
            folderPath: [],
            tags: ($a.attr('tags') || '').split(',').map(t => t.trim()).filter(Boolean)
          });
        }
      });
    }

    return results;
  }

  /**
   * Imports parsed bookmarks into LinkVault, creating collections for folders and assigning tags in chunked batches.
   */
  public async importFromHtmlFile(filePath: string): Promise<HtmlImportResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Bookmark file not found: ${filePath}`);
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const bookmarks = this.parseNetscapeHtml(content);

    if (bookmarks.length === 0) {
      return { imported: 0, duplicates: 0, total: 0, collectionsCreated: 0, tagsCreated: 0 };
    }

    const db = dbManager.getDb();
    const insertBookmark = db.prepare(`
      INSERT INTO bookmarks (url, title, description, domain_id, thumbnail_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        title = COALESCE(bookmarks.title, excluded.title),
        description = COALESCE(bookmarks.description, excluded.description)
    `);

    const selectBookmarkId = db.prepare('SELECT id FROM bookmarks WHERE url = ?');
    const insertBookmarkCollection = db.prepare(`
      INSERT OR IGNORE INTO bookmark_collections (bookmark_id, collection_id)
      VALUES (?, ?)
    `);
    const insertBookmarkTag = db.prepare(`
      INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
      VALUES (?, ?)
    `);

    // In-memory lookup caches to maximize batch performance
    const domainCache = new Map<string, number>();
    const collectionCache = new Map<string, number>();
    const tagCache = new Map<string, number>();

    let collectionsCreatedCount = 0;
    let tagsCreatedCount = 0;

    const getDomainId = (urlStr: string): number | null => {
      try {
        const hostname = new URL(urlStr).hostname;
        if (domainCache.has(hostname)) return domainCache.get(hostname)!;
        let domain = domainModel.findByDomain(hostname);
        if (!domain) {
          domain = domainModel.create(hostname, null);
        }
        domainCache.set(hostname, domain.id);
        return domain.id;
      } catch {
        return null;
      }
    };

    const getCollectionId = (name: string): number => {
      const cleanName = name.trim();
      if (collectionCache.has(cleanName)) return collectionCache.get(cleanName)!;
      let col = collectionModel.findByName(cleanName);
      if (!col) {
        col = collectionModel.create(cleanName, null);
        collectionsCreatedCount++;
      }
      collectionCache.set(cleanName, col.id);
      return col.id;
    };

    const getTagId = (name: string): number => {
      const cleanName = name.trim();
      if (tagCache.has(cleanName)) return tagCache.get(cleanName)!;
      let tag = tagModel.findByName(cleanName);
      if (!tag) {
        tag = tagModel.create(cleanName);
        tagsCreatedCount++;
      }
      tagCache.set(cleanName, tag.id);
      return tag.id;
    };

    let importedCount = 0;
    let duplicateCount = 0;
    const CHUNK_SIZE = 200;

    for (let i = 0; i < bookmarks.length; i += CHUNK_SIZE) {
      const chunk = bookmarks.slice(i, i + CHUNK_SIZE);

      db.transaction(() => {
        for (const item of chunk) {
          const domainId = getDomainId(item.url);
          const createdAt = item.addDate ? new Date(item.addDate).toISOString() : new Date().toISOString();

          // Check if it already exists before running insert
          const existingRow = selectBookmarkId.get(item.url) as { id: number } | undefined;
          const info = insertBookmark.run(
            item.url,
            item.title || null,
            item.description || null,
            domainId,
            createdAt,
            createdAt
          );

          let bookmarkId: number;
          if (existingRow) {
            duplicateCount++;
            bookmarkId = existingRow.id;
          } else {
            importedCount++;
            bookmarkId = Number(info.lastInsertRowid);
          }

          // Link collection hierarchy (filter out generic browser root folder names if desired, but preserve all user folders)
          if (item.folderPath && item.folderPath.length > 0) {
            for (const folder of item.folderPath) {
              if (folder && folder.trim()) {
                const colId = getCollectionId(folder);
                insertBookmarkCollection.run(bookmarkId, colId);
              }
            }
          }

          // Link tags
          if (item.tags && item.tags.length > 0) {
            for (const tag of item.tags) {
              if (tag && tag.trim()) {
                const tagId = getTagId(tag);
                insertBookmarkTag.run(bookmarkId, tagId);
              }
            }
          }
        }
      })();

      // Yield execution to event loop to keep UI smooth and prevent thread starvation
      await new Promise(resolve => setImmediate(resolve));
    }

    // Broadcast updates across the application
    webContents.getAllWebContents().forEach(wc => {
      wc.send('bookmarks:updated');
      wc.send('collections:updated');
      wc.send('tags:updated');
      wc.send('domains:updated');
    });

    // Start background enrichment worker to scrape icons & thumbnails
    enrichmentService.startEnrichmentJob();

    return {
      imported: importedCount,
      duplicates: duplicateCount,
      total: bookmarks.length,
      collectionsCreated: collectionsCreatedCount,
      tagsCreated: tagsCreatedCount
    };
  }

  /**
   * Fetches bookmarks formatted with associated domain, collections, and tags for export.
   */
  public fetchExportData(filter: ExportFilterOptions): BookmarkExportItem[] {
    const db = dbManager.getDb();
    const includeRecycle = filter.includeRecycleBin ? 1 : 0;

    let baseQuery = `
      SELECT 
        b.id,
        b.url,
        b.title,
        b.description,
        b.notes,
        b.is_favorite,
        b.is_important,
        b.created_at,
        b.updated_at,
        d.domain
      FROM bookmarks b
      LEFT JOIN domains d ON b.domain_id = d.id
      WHERE (b.deleted_at IS NULL OR ? = 1)
    `;

    const params: any[] = [includeRecycle];

    if (filter.scope === 'collection' && filter.collectionId) {
      baseQuery += ` AND b.id IN (SELECT bookmark_id FROM bookmark_collections WHERE collection_id = ?)`;
      params.push(filter.collectionId);
    } else if (filter.scope === 'tag' && filter.tagId) {
      baseQuery += ` AND b.id IN (SELECT bookmark_id FROM bookmark_tags WHERE tag_id = ?)`;
      params.push(filter.tagId);
    }

    baseQuery += ` ORDER BY b.id ASC`;

    const rows = db.prepare(baseQuery).all(...params) as any[];

    // Fetch collections and tags map
    const collectionsStmt = db.prepare(`
      SELECT c.name FROM collections c
      JOIN bookmark_collections bc ON c.id = bc.collection_id
      WHERE bc.bookmark_id = ? AND (c.deleted_at IS NULL OR ? = 1)
      ORDER BY c.name ASC
    `);

    const tagsStmt = db.prepare(`
      SELECT t.name FROM tags t
      JOIN bookmark_tags bt ON t.id = bt.tag_id
      WHERE bt.bookmark_id = ?
      ORDER BY t.name ASC
    `);

    return rows.map(r => {
      const colRows = collectionsStmt.all(r.id, includeRecycle) as { name: string }[];
      const tagRows = tagsStmt.all(r.id) as { name: string }[];

      return {
        id: r.id,
        url: r.url,
        title: r.title,
        description: r.description,
        notes: r.notes,
        domain: r.domain,
        collections: colRows.map(c => c.name),
        tags: tagRows.map(t => t.name),
        isFavorite: Boolean(r.is_favorite),
        isImportant: Boolean(r.is_important),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    });
  }

  /**
   * Generates a standard Netscape Bookmark HTML file (<!DOCTYPE NETSCAPE-Bookmark-file-1>)
   * compatible with Chrome, Firefox, Safari, Edge, Brave, and other bookmark managers.
   */
  public generateNetscapeHtml(items: BookmarkExportItem[]): string {
    const lines: string[] = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<!-- This is an automatically generated file.',
      '     It will be read and overwritten.',
      '     DO NOT EDIT! -->',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>'
    ];

    // Group bookmarks by collection
    const collectionMap = new Map<string, BookmarkExportItem[]>();
    const uncategorized: BookmarkExportItem[] = [];

    for (const item of items) {
      if (item.collections.length === 0) {
        uncategorized.push(item);
      } else {
        for (const col of item.collections) {
          if (!collectionMap.has(col)) {
            collectionMap.set(col, []);
          }
          collectionMap.get(col)!.push(item);
        }
      }
    }

    const renderBookmark = (b: BookmarkExportItem, indent: string) => {
      const addDateSec = Math.floor(new Date(b.createdAt).getTime() / 1000) || Math.floor(Date.now() / 1000);
      const tagsAttr = b.tags.length > 0 ? ` TAGS="${escapeHtml(b.tags.join(','))}"` : '';
      const title = escapeHtml(b.title || b.url);
      const url = escapeHtml(b.url);

      lines.push(`${indent}<DT><A HREF="${url}" ADD_DATE="${addDateSec}"${tagsAttr}>${title}</A>`);
      if (b.description || b.notes) {
        const desc = escapeHtml(b.notes ? `${b.description || ''}\n${b.notes}`.trim() : b.description);
        lines.push(`${indent}<DD>${desc}`);
      }
    };

    // Render categorized collections
    for (const [colName, colBookmarks] of collectionMap.entries()) {
      const nowSec = Math.floor(Date.now() / 1000);
      lines.push(`    <DT><H3 ADD_DATE="${nowSec}" LAST_MODIFIED="${nowSec}">${escapeHtml(colName)}</H3>`);
      lines.push(`    <DL><p>`);
      for (const b of colBookmarks) {
        renderBookmark(b, '        ');
      }
      lines.push(`    </DL><p>`);
    }

    // Render uncategorized bookmarks under root
    for (const b of uncategorized) {
      renderBookmark(b, '    ');
    }

    lines.push('</DL><p>');
    return lines.join('\n');
  }

  /**
   * Generates structured JSON export with metadata.
   */
  public generateJson(items: BookmarkExportItem[]): string {
    const payload = {
      version: '1.0',
      generator: 'LinkVault',
      exportedAt: new Date().toISOString(),
      totalBookmarks: items.length,
      bookmarks: items
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Generates RFC 4180 CSV export with UTF-8 BOM for Microsoft Excel and spreadsheet tools.
   */
  public generateCsv(items: BookmarkExportItem[]): string {
    const headers = [
      'ID',
      'Title',
      'URL',
      'Domain',
      'Collections',
      'Tags',
      'Favorite',
      'Important',
      'Description',
      'Notes',
      'Created At',
      'Updated At'
    ];

    const rows: string[] = [headers.map(escapeCsvField).join(',')];

    for (const item of items) {
      const row = [
        item.id,
        item.title || '',
        item.url,
        item.domain || '',
        item.collections.join('; '),
        item.tags.join('; '),
        item.isFavorite ? 'Yes' : 'No',
        item.isImportant ? 'Yes' : 'No',
        item.description || '',
        item.notes || '',
        item.createdAt,
        item.updatedAt
      ];
      rows.push(row.map(escapeCsvField).join(','));
    }

    // Prepend UTF-8 Byte Order Mark (\uFEFF) so Excel on Windows opens correctly with UTF-8 encoding
    return '\uFEFF' + rows.join('\r\n');
  }

  /**
   * Exports bookmarks to destination path in HTML, JSON, or CSV format.
   */
  public async exportToFile(destinationPath: string, filter: ExportFilterOptions): Promise<{ total: number }> {
    const items = this.fetchExportData(filter);
    let content: string;

    switch (filter.format) {
      case 'json':
        content = this.generateJson(items);
        break;
      case 'csv':
        content = this.generateCsv(items);
        break;
      case 'html':
      default:
        content = this.generateNetscapeHtml(items);
        break;
    }

    await fs.promises.writeFile(destinationPath, content, 'utf8');
    return { total: items.length };
  }
}

export const bookmarkExchangeService = new BookmarkExchangeService();
