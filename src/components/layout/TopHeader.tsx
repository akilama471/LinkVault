import React, { useState } from 'react';
import { Search, Plus, Loader2, ClipboardPaste } from 'lucide-react';

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  newUrl: string;
  onUrlChange: (value: string) => void;
  onAddSubmit: (e?: React.FormEvent, urlOverride?: string) => void;
  isAdding: boolean;
}

const getClipboardText = async (): Promise<string> => {
  try {
    // 1. Electron native clipboard if available
    // @ts-ignore
    if (window.electronAPI?.clipboard?.readText) {
      // @ts-ignore
      const text = window.electronAPI.clipboard.readText();
      if (text && typeof text === 'string') return text.trim();
    }
  } catch (err) {
    console.warn('Electron clipboard read error:', err);
  }

  try {
    // 2. Standard Web Clipboard API
    if (navigator?.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text && typeof text === 'string') return text.trim();
    }
  } catch (err) {
    console.warn('Navigator clipboard read error:', err);
  }

  return '';
};

const normalizeUrl = (rawText: string): string | null => {
  const text = rawText.trim();
  if (!text) return null;

  // If already starts with http:// or https://
  if (/^https?:\/\//i.test(text)) {
    try {
      new URL(text);
      return text;
    } catch {
      return null;
    }
  }

  // Domain-like string (e.g. github.com, sub.domain.com/path, localhost:3000)
  if (
    /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/i.test(text) ||
    /^localhost(:[0-9]+)?(\/.*)?$/i.test(text)
  ) {
    const withHttps = `https://${text}`;
    try {
      new URL(withHttps);
      return withHttps;
    } catch {
      return null;
    }
  }

  return null;
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  newUrl,
  onUrlChange,
  onAddSubmit,
  isAdding
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdding) return;

    let targetUrl = newUrl.trim();

    if (!targetUrl) {
      // User didn't type/paste a link: detect URL from clipboard
      const clipText = await getClipboardText();

      if (!clipText) {
        setFeedback('Clipboard is empty');
        setTimeout(() => setFeedback(null), 2500);
        return;
      }

      const validUrl = normalizeUrl(clipText);
      if (!validUrl) {
        setFeedback('No valid URL in clipboard');
        setTimeout(() => setFeedback(null), 2500);
        return;
      }

      targetUrl = validUrl;
      onUrlChange(validUrl);
    } else {
      const formatted = normalizeUrl(targetUrl);
      if (formatted) {
        targetUrl = formatted;
        onUrlChange(formatted);
      }
    }

    onAddSubmit(e, targetUrl);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search bookmarks..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
        />
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative">
          <input 
            type="text" 
            placeholder={feedback || "https://example.com"} 
            value={newUrl}
            onChange={(e) => {
              if (feedback) setFeedback(null);
              onUrlChange(e.target.value);
            }}
            className={`w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${
              feedback 
                ? 'border-amber-400 bg-amber-50 placeholder-amber-600 text-amber-900' 
                : 'border-gray-300'
            }`}
          />
        </div>
        <button 
          type="submit" 
          disabled={isAdding}
          title={newUrl.trim() ? "Add URL" : "Paste from clipboard and add bookmark"}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors text-sm shadow-sm active:scale-95 cursor-pointer"
        >
          {isAdding ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !newUrl.trim() ? (
            <ClipboardPaste className="w-5 h-5" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          Add URL
        </button>
      </form>
    </header>
  );
};
