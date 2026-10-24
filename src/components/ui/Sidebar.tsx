import React from 'react';
import { Bookmark, Star, LayoutGrid, Hash, Folder, Settings, Globe, Activity, Lock, Trash2, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  hasPassword?: boolean;
  onLock?: () => void;
  trashCount?: number;
  auditorCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  hasPassword,
  onLock,
  trashCount = 0,
  auditorCount = 0
}) => {
  const navItems = [
    { id: 'all', label: 'All Bookmarks', icon: LayoutGrid },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'domains', label: 'Websites', icon: Globe },
    { id: 'collections', label: 'Collections', icon: Folder },
    { id: 'tags', label: 'Tags', icon: Hash },
    { id: 'auditor', label: 'Link Auditor', icon: ShieldAlert, badge: auditorCount },
    { id: 'trash', label: 'Recycle Bin', icon: Trash2, badge: trashCount },
    { id: 'jobs', label: 'Background Jobs', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
          <Bookmark className="w-6 h-6" />
          LinkVault
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={clsx(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
              currentTab === item.id 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={clsx(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  currentTab === item.id
                    ? 'bg-blue-700 text-white'
                    : item.id === 'auditor'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-gray-800 text-gray-300'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {hasPassword && onLock && (
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onLock}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Lock className="w-4 h-4 text-gray-400" />
            Lock App
          </button>
        </div>
      )}
    </div>
  );
};
