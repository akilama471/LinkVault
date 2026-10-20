import React, { useState } from 'react';
import { Bookmark } from '../../types/models';
import { X, Save } from 'lucide-react';
import { useBookmarkTags } from '../../hooks/useBookmarkTags';
import { useBookmarkCollections } from '../../hooks/useBookmarkCollections';
import { TagSelector } from './TagSelector';
import { CollectionSelector } from './CollectionSelector';

interface BookmarkDetailsModalProps {
  bookmark: Bookmark;
  onClose: () => void;
  onSave: (id: number, data: Partial<Bookmark>) => any;
}

export const BookmarkDetailsModal: React.FC<BookmarkDetailsModalProps> = ({ bookmark, onClose, onSave }) => {
  const [title, setTitle] = useState(bookmark.title || '');
  const [url, setUrl] = useState(bookmark.url);
  const [description, setDescription] = useState(bookmark.description || '');
  const [notes, setNotes] = useState(bookmark.notes || '');
  const [hideMode, setHideMode] = useState<number>(bookmark.hide_mode ?? 0);
  const [saving, setSaving] = useState(false);
  
  const { bookmarkTags, availableTags, addTag, removeTag } = useBookmarkTags(bookmark.id);
  const { bookmarkCols, availableCols, addCollection, removeCollection } = useBookmarkCollections(bookmark.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(bookmark.id, { title, url, description, notes, hide_mode: hideMode });
    
    // Save tags and collections
    try {
      // @ts-ignore
      await window.electronAPI.tags.setForBookmark(bookmark.id, bookmarkTags.map(t => t.name));
      // @ts-ignore
      await window.electronAPI.collections.setForBookmark(bookmark.id, bookmarkCols.map(c => c.name));
    } catch (err) {
      console.error('Failed to save tags/collections', err);
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">Edit Bookmark</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="edit-bookmark-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Bookmark Title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Short description..."
              />
            </div>

            <TagSelector 
              tags={bookmarkTags}
              availableTags={availableTags}
              onAdd={addTag}
              onRemove={removeTag}
            />

            <CollectionSelector 
              collections={bookmarkCols}
              availableCollections={availableCols}
              onAdd={addCollection}
              onRemove={removeCollection}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="hide_mode"
                    value={0}
                    checked={hideMode === 0}
                    onChange={() => setHideMode(0)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Visible everywhere (Default)</span>
                    <p className="text-xs text-gray-500">Visible in All Bookmarks, Favorites, Domains, Collections, and Tags.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="hide_mode"
                    value={1}
                    checked={hideMode === 1}
                    onChange={() => setHideMode(1)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Hide from "All Bookmarks" (Method 1)</span>
                    <p className="text-xs text-gray-500">Hidden only from "All Bookmarks", but remains visible in Favorites, Domains, Collections, and Tags.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="hide_mode"
                    value={2}
                    checked={hideMode === 2}
                    onChange={() => setHideMode(2)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Hide from all locations (Method 2)</span>
                    <p className="text-xs text-gray-500">Hidden from all pages including Favorites, Domains, Collections, and Tags unless "Show Hidden Bookmarks" is enabled.</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="Add your personal notes here..."
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-bookmark-form"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
