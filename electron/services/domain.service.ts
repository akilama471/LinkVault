import { Domain } from '../../src/types/models';
import { domainModel } from '../models/domain.model';
import { assetService } from './asset.service';
import { metadataService } from './metadata.service';
import { dbManager } from '../database/db';
import { webContents } from 'electron';

export class DomainService {
  /**
   * Retrieves an existing domain or creates a new one, fetching and caching the favicon if needed.
   */
  public async getOrCreateDomain(domainName: string, faviconUrl: string | null): Promise<Domain> {
    let domain = domainModel.findByDomain(domainName);

    if (!domain) {
      // New domain, let's try to cache its favicon
      let cachedFaviconPath: string | null = null;
      if (faviconUrl) {
        cachedFaviconPath = await assetService.downloadImage(faviconUrl, 'fav');
      }

      domain = domainModel.create(domainName, cachedFaviconPath);
    } else if (!domain.favicon_path && faviconUrl) {
      // Domain exists but has no favicon, let's try to fetch it again
      const cachedFaviconPath = await assetService.downloadImage(faviconUrl, 'fav');
      if (cachedFaviconPath) {
        domainModel.updateFavicon(domain.id, cachedFaviconPath);
        domain = domainModel.findById(domain.id)!;
      }
    }

    return domain;
  }

  /**
   * Refetches the domain favicon and metadata from the internet.
   */
  public async refetchDomain(id: number): Promise<Domain> {
    const domain = domainModel.findById(id);
    if (!domain) {
      throw new Error(`Domain with id ${id} not found`);
    }

    const db = dbManager.getDb();
    // Check if there is an associated bookmark with a full URL
    const bookmarkRow = db.prepare('SELECT url FROM bookmarks WHERE domain_id = ? LIMIT 1').get(id) as { url: string } | undefined;
    const targetUrl = bookmarkRow?.url || `https://${domain.domain}`;

    let newFaviconPath: string | null = null;

    // 1. Try to extract metadata from the target URL
    try {
      const metadata = await metadataService.extractMetadata(targetUrl);
      if (metadata.faviconUrl) {
        newFaviconPath = await assetService.downloadImage(metadata.faviconUrl, 'fav', targetUrl);
      }
    } catch (e) {
      console.warn(`[refetchDomain] Metadata extraction failed for ${targetUrl}:`, e);
    }

    // 2. If metadata extraction didn't yield a favicon, try direct favicon paths
    if (!newFaviconPath) {
      try {
        const directFaviconUrl = `https://${domain.domain}/favicon.ico`;
        newFaviconPath = await assetService.downloadImage(directFaviconUrl, 'fav', `https://${domain.domain}`);
      } catch (e) {
        console.warn(`[refetchDomain] Direct favicon fetch failed for ${domain.domain}:`, e);
      }
    }

    // 3. Fallback to Google S2 favicon service
    if (!newFaviconPath) {
      try {
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain.domain}&sz=128`;
        newFaviconPath = await assetService.downloadImage(googleFaviconUrl, 'fav');
      } catch (e) {
        console.warn(`[refetchDomain] Google favicon fetch failed for ${domain.domain}:`, e);
      }
    }

    if (newFaviconPath) {
      domainModel.updateFavicon(domain.id, newFaviconPath);
    } else {
      // Touch updated_at even if favicon didn't change so user knows it was checked
      db.prepare('UPDATE domains SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(domain.id);
    }

    const updated = domainModel.findById(domain.id)!;

    // Broadcast domain and bookmark updates
    webContents.getAllWebContents().forEach(wc => {
      wc.send('domains:updated');
      wc.send('bookmarks:updated');
    });

    return updated;
  }

  /**
   * Renames the display name of a domain.
   */
  public renameDomain(id: number, newName: string): Domain {
    const domain = domainModel.findById(id);
    if (!domain) {
      throw new Error(`Domain with id ${id} not found`);
    }

    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Error('Display name cannot be empty');
    }

    const updated = domainModel.updateDisplayName(id, trimmed);

    webContents.getAllWebContents().forEach(wc => {
      wc.send('domains:updated');
    });

    return updated;
  }

  /**
   * Deletes a domain, either keeping or deleting its associated bookmarks.
   */
  public deleteDomain(id: number, deleteBookmarks: boolean): void {
    const domain = domainModel.findById(id);
    if (!domain) {
      throw new Error(`Domain with id ${id} not found`);
    }

    const db = dbManager.getDb();
    
    const deleteTransaction = db.transaction(() => {
      if (deleteBookmarks) {
        // Delete all associated bookmarks (FTS triggers and cascades will handle tags/collections)
        db.prepare('DELETE FROM bookmarks WHERE domain_id = ?').run(id);
      } else {
        // Disassociate bookmarks from this domain (set domain_id to NULL)
        db.prepare('UPDATE bookmarks SET domain_id = NULL WHERE domain_id = ?').run(id);
      }

      // Delete the domain record
      domainModel.delete(id);
    });

    deleteTransaction();

    webContents.getAllWebContents().forEach(wc => {
      wc.send('domains:updated');
      wc.send('bookmarks:updated');
    });
  }
}

export const domainService = new DomainService();
