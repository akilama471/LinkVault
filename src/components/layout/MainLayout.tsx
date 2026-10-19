import React from 'react';
import { Sidebar } from '../ui/Sidebar';
import { TopHeader } from './TopHeader';

interface MainLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  newUrl: string;
  onUrlChange: (value: string) => void;
  onAddSubmit: (e?: React.FormEvent, urlOverride?: string) => void;
  isAdding: boolean;
  hasPassword?: boolean;
  onLock?: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  newUrl,
  onUrlChange,
  onAddSubmit,
  isAdding,
  hasPassword,
  onLock,
  children
}) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={onTabChange} 
        hasPassword={hasPassword}
        onLock={onLock}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <TopHeader 
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          newUrl={newUrl}
          onUrlChange={onUrlChange}
          onAddSubmit={onAddSubmit}
          isAdding={isAdding}
        />
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
