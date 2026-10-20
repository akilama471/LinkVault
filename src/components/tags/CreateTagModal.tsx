import React, { useState, useEffect, useRef } from 'react';
import { Hash, Plus, X, Loader2 } from 'lucide-react';

interface CreateTagModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<{ success: boolean; error?: string } | any>;
}

export const CreateTagModal: React.FC<CreateTagModalProps> = ({
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isCreating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/^#+/, '');
    if (!cleanName) {
      setErrorMsg('Please enter a tag name');
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);
    try {
      const result = await onCreate(cleanName);
      if (result && result.success === false) {
        setErrorMsg(result.error || 'Failed to create tag');
        setIsCreating(false);
        return;
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create tag');
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => !isCreating && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Create Tag
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Add a tag to label and quickly filter your bookmarks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form id="create-tag-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-gray-400 font-bold text-sm pointer-events-none select-none">
                #
              </div>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.replace(/^#+/, ''));
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={isCreating}
                placeholder="design, reading, dev..."
                maxLength={50}
                required
                className="w-full pl-8 pr-4 py-2.5 bg-gray-50/50 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
              />
            </div>
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-100 bg-gray-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-tag-form"
            disabled={isCreating || !name.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Tag</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
