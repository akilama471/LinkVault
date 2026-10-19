import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { BookmarksPage } from './pages/BookmarksPage';
import { DomainsPage } from './pages/DomainsPage';
import { TagsPage } from './pages/TagsPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { RecycleBinPage } from './pages/RecycleBinPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { JobsPage } from './pages/JobsPage';
import { useBookmarks } from './hooks/useBookmarks';
import { useAuth } from './hooks/useAuth';
import { useToast } from './context/ToastContext';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { warning, error, success } = useToast();
  const { hasPassword, isAuthenticated, loading: authLoading, verifyPassword, setPassword, removePassword, lock } = useAuth();
  const {
    bookmarks,
    deletedBookmarks,
    loading,
    addBookmark,
    deleteBookmark,
    restoreBookmark,
    permanentDeleteBookmark,
    emptyRecycleBin,
    toggleFavorite,
    toggleImportant,
    updateBookmark,
    refetchBookmark,
    refresh: refreshBookmarks
  } = useBookmarks(isAuthenticated);

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

  const handleAddSubmit = async (e?: React.FormEvent, urlOverride?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (urlOverride || newUrl).trim();
    if (!targetUrl) return;
    
    setIsAdding(true);
    const result = await addBookmark(targetUrl);
    setNewUrl('');
    setIsAdding(false);

    if (result && !result.success) {
      const err = (result.error || '').toLowerCase();
      if (
        err.includes('already exists') ||
        err.includes('unique constraint') ||
        err.includes('duplicate')
      ) {
        warning(
          'Already Added Bookmark',
          'This bookmark is already in your bookmark list.'
        );
      } else {
        error(
          'Failed to add bookmark',
          result.error || 'An error occurred while adding the bookmark.'
        );
      }
    } else if (result && result.success) {
      success('Bookmark Added', 'Bookmark has been added successfully.');
    }
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
      trashCount={deletedBookmarks.length}
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
              onRefetchBookmark={refetchBookmark}
            />
          )}

          {currentTab === 'domains' && (
            <DomainsPage 
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
            />
          )}

          {currentTab === 'tags' && (
            <TagsPage 
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
            />
          )}

          {currentTab === 'collections' && (
            <CollectionsPage 
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
            />
          )}

          {currentTab === 'trash' && (
            <RecycleBinPage
              deletedBookmarks={deletedBookmarks}
              loading={loading}
              searchQuery={searchQuery}
              onRestoreBookmark={restoreBookmark}
              onPermanentDeleteBookmark={permanentDeleteBookmark}
              onEmptyRecycleBin={emptyRecycleBin}
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
