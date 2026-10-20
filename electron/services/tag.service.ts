import { Tag } from '../../src/types/models';
import { tagModel } from '../models/tag.model';
import { webContents } from 'electron';

export class TagService {
  public getAllTags(): Tag[] {
    return tagModel.getAll();
  }

  public getOrCreateTag(name: string): Tag {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Tag name cannot be empty');
    
    let tag = tagModel.findByName(cleanName);
    if (!tag) {
      tag = tagModel.create(cleanName);
      webContents.getAllWebContents().forEach(wc => {
        wc.send('tags:updated');
      });
    }
    return tag;
  }

  public renameTag(id: number, newName: string): Tag {
    const cleanName = newName.trim();
    if (!cleanName) throw new Error('Tag name cannot be empty');
    
    const existing = tagModel.findByName(cleanName);
    if (existing && existing.id !== id) {
      throw new Error('A tag with this name already exists');
    }
    
    tagModel.update(id, cleanName);
    const updated = tagModel.findById(id)!;
    webContents.getAllWebContents().forEach(wc => {
      wc.send('tags:updated');
    });
    return updated;
  }

  public deleteTag(id: number): void {
    tagModel.delete(id);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('tags:updated');
    });
  }

  public getTagsForBookmark(bookmarkId: number): Tag[] {
    return tagModel.getTagsForBookmark(bookmarkId);
  }

  public setTagsForBookmark(bookmarkId: number, tagNames: string[]): Tag[] {
    const tagIds = tagNames.map(name => this.getOrCreateTag(name).id);
    tagModel.setTagsForBookmark(bookmarkId, tagIds);
    webContents.getAllWebContents().forEach(wc => {
      wc.send('tags:updated');
    });
    return tagModel.getTagsForBookmark(bookmarkId);
  }
  
  public getBookmarkIdsForTag(tagId: number): number[] {
    return tagModel.getBookmarkIdsForTag(tagId);
  }
}

export const tagService = new TagService();
