import React, { useEffect } from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Global & Application',
      items: [
        { keys: ['Ctrl', 'K'], label: 'Focus global search input' },
        { keys: ['Ctrl', 'N'], label: 'Focus add new URL input' },
        { keys: ['?'], label: 'Open / close this keyboard shortcuts guide' },
        { keys: ['Esc'], label: 'Close active modal or deselect all items' }
      ]
    },
    {
      title: 'Grid Navigation',
      items: [
        { keys: ['↑', '↓', '←', '→'], label: 'Navigate between bookmark cards' },
        { keys: ['Enter'], label: 'Open focused bookmark in default browser' },
        { keys: ['Space'], label: 'Toggle selection of currently focused card' }
      ]
    },
    {
      title: 'Multi-Selection & Batch Operations',
      items: [
        { keys: ['Ctrl', 'Click'], label: 'Toggle selection of individual bookmark' },
        { keys: ['Shift', 'Click'], label: 'Select range between clicked bookmarks' },
        { keys: ['Ctrl', 'A'], label: 'Select all visible bookmarks on page' },
        { keys: ['Del'], label: 'Delete selected bookmarks (or focused card)' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="shortcuts-title" className="text-base font-bold text-gray-900">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-gray-500">Quickly navigate and manage LinkVault without a mouse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {shortcutSections.map((section, idx) => (
            <div key={idx} className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </h4>
              <div className="space-y-2">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-700 text-xs font-medium">{item.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-2xs min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5" />
            <span>On macOS, use <kbd className="font-mono font-semibold">Cmd ⌘</kbd> instead of <kbd className="font-mono font-semibold">Ctrl</kbd></span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer shadow-2xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
