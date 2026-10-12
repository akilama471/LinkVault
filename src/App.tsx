import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { BookmarksPage } from './pages/BookmarksPage';
import { DomainsPage } from './pages/DomainsPage';
import { TagsPage } from './pages/TagsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { JobsPage } from './pages/JobsPage';
import { useBookmarks } from './hooks/useBookmarks';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { hasPassword, isAuthenticated, loading: authLoading, verifyPassword, setPassword, removePassword, lock } = useAuth();
  const { bookmarks, loading, addBookmark, deleteBookmark, toggleFavorite, toggleImportant, updateBookmark, refresh: refreshBookmarks } = useBookmarks(isAuthenticated);

  const refreshAllData = () => {
    refreshBookmarks();
    // Soft reload by resetting state if needed
    window.location.reload(); // Simple full reload as fallback for wiping data across pages
  };

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      refreshBookmarks(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, refreshBookmarks, isAuthenticated]);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setSearchQuery('');
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    
    setIsAdding(true);
    await addBookmark(newUrl);
    setNewUrl('');
    setIsAdding(false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onVerify={verifyPassword} />;
  }

  return (
    <MainLayout
      currentTab={currentTab}
      onTabChange={handleTabChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      newUrl={newUrl}
      onUrlChange={setNewUrl}
      onAddSubmit={handleAddSubmit}
      isAdding={isAdding}
      hasPassword={hasPassword}
      onLock={lock}
    >
      {(currentTab === 'all' || currentTab === 'favorites' || currentTab === 'important') && (
            <BookmarksPage 
              type={currentTab as any}
              bookmarks={bookmarks}
              loading={loading}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
            />
          )}

          {currentTab === 'domains' && (
            <DomainsPage 
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
            />
          )}

          {currentTab === 'tags' && (
            <TagsPage 
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
            />
          )}

          {currentTab === 'collections' && (
            <CollectionsPage 
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage 
              hasPassword={hasPassword}
              onSetPassword={setPassword}
              onRemovePassword={removePassword}
              onRefreshAll={refreshAllData}
            />
          )}

          {currentTab === 'jobs' && (
            <JobsPage />
          )}
    </MainLayout>
  );
};

export default App;
