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
import { AuditorPage } from './pages/AuditorPage';
import { useBookmarks } from './hooks/useBookmarks';
import { useCollections } from './hooks/useCollections';
import { useAuth } from './hooks/useAuth';
import { useAuditor } from './hooks/useAuditor';
import { useToast } from './context/ToastContext';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showHiddenBookmarks, setShowHiddenBookmarks] = useState(false);
  const { warning, error, success } = useToast();
  const { hasPassword, isAuthenticated, loading: authLoading, verifyPassword, setPassword, removePassword, lock } = useAuth();
  const {
    bookmarks,
    deletedBookmarks,
    loading: bookmarksLoading,
    addBookmark,
    deleteBookmark,
    restoreBookmark,
    permanentDeleteBookmark,
    emptyRecycleBin: emptyBookmarkTrash,
    toggleFavorite,
    toggleImportant,
    updateBookmark,
    refetchBookmark,
    bulkDeleteBookmarks,
    bulkUpdateBookmarks,
    bulkAddTags,
    bulkRemoveTags,
    bulkAddToCollection,
    refresh: refreshBookmarks
  } = useBookmarks(isAuthenticated);

  const {
    deletedCollections,
    loading: collectionsLoading,
    restoreCollection,
    permanentDeleteCollection,
    emptyCollectionTrash,
    refresh: refreshCollections
  } = useCollections(isAuthenticated);

  const { summary: auditorSummary } = useAuditor();
  const auditorIssueCount = (auditorSummary?.deadCount ?? 0) + (auditorSummary?.duplicateGroupCount ?? 0);

  const loading = bookmarksLoading || collectionsLoading;
  const totalTrashCount = deletedBookmarks.length + deletedCollections.length;

  const handleEmptyRecycleBin = async () => {
    const bookmarkRes = await emptyBookmarkTrash();
    const colRes = await emptyCollectionTrash();
    if (bookmarkRes.success || colRes.success) {
      return { success: true, count: (bookmarkRes.count || 0) + (colRes.count || 0) };
    }
    return { success: false, error: bookmarkRes.error || colRes.error };
  };

  const refreshAllData = () => {
    refreshBookmarks();
    refreshCollections();
    // Soft reload by resetting state if needed
    window.location.reload(); // Simple full reload as fallback for wiping data across pages
  };

  React.useEffect(() => {
    if (!isAuthenticated) return;
    // @ts-ignore
    window.electronAPI?.settings?.getShowHiddenBookmarks?.().then((res: any) => {
      if (res && res.success) {
        setShowHiddenBookmarks(Boolean(res.data));
      }
    });

    // @ts-ignore
    const unsubscribe = window.electronAPI?.events?.onShowHiddenUpdated?.((show: boolean) => {
      setShowHiddenBookmarks(show);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAuthenticated]);

  const handleToggleShowHiddenBookmarks = async (show: boolean) => {
    setShowHiddenBookmarks(show);
    try {
      // @ts-ignore
      await window.electronAPI.settings.setShowHiddenBookmarks(show);
    } catch (err: any) {
      console.error('Failed to update show hidden bookmarks setting', err);
    }
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
      success('Bookmark Added', 'Fetching preview and details in the background...');
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
      trashCount={totalTrashCount}
      auditorCount={auditorIssueCount}
    >
      {(currentTab === 'all' || currentTab === 'favorites' || currentTab === 'important') && (
            <BookmarksPage 
              type={currentTab as any}
              bookmarks={bookmarks}
              loading={bookmarksLoading}
              showHiddenBookmarks={showHiddenBookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
              onBulkDeleteBookmarks={bulkDeleteBookmarks}
              onBulkUpdateBookmarks={bulkUpdateBookmarks}
              onBulkAddTags={bulkAddTags}
              onBulkRemoveTags={bulkRemoveTags}
              onBulkAddToCollection={bulkAddToCollection}
            />
          )}

          {currentTab === 'domains' && (
            <DomainsPage 
              bookmarks={bookmarks}
              showHiddenBookmarks={showHiddenBookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
              onBulkDeleteBookmarks={bulkDeleteBookmarks}
              onBulkUpdateBookmarks={bulkUpdateBookmarks}
              onBulkAddTags={bulkAddTags}
              onBulkRemoveTags={bulkRemoveTags}
              onBulkAddToCollection={bulkAddToCollection}
            />
          )}

          {currentTab === 'tags' && (
            <TagsPage 
              bookmarks={bookmarks}
              showHiddenBookmarks={showHiddenBookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
              onBulkDeleteBookmarks={bulkDeleteBookmarks}
              onBulkUpdateBookmarks={bulkUpdateBookmarks}
              onBulkAddTags={bulkAddTags}
              onBulkRemoveTags={bulkRemoveTags}
              onBulkAddToCollection={bulkAddToCollection}
            />
          )}

          {currentTab === 'collections' && (
            <CollectionsPage 
              bookmarks={bookmarks}
              showHiddenBookmarks={showHiddenBookmarks}
              onDeleteBookmark={deleteBookmark}
              onToggleFavorite={toggleFavorite}
              onToggleImportant={toggleImportant}
              onUpdateBookmark={updateBookmark}
              onRefetchBookmark={refetchBookmark}
              onBulkDeleteBookmarks={bulkDeleteBookmarks}
              onBulkUpdateBookmarks={bulkUpdateBookmarks}
              onBulkAddTags={bulkAddTags}
              onBulkRemoveTags={bulkRemoveTags}
              onBulkAddToCollection={bulkAddToCollection}
            />
          )}

          {currentTab === 'trash' && (
            <RecycleBinPage
              deletedBookmarks={deletedBookmarks}
              deletedCollections={deletedCollections}
              loading={loading}
              searchQuery={searchQuery}
              onRestoreBookmark={restoreBookmark}
              onPermanentDeleteBookmark={permanentDeleteBookmark}
              onEmptyRecycleBin={handleEmptyRecycleBin}
              onRestoreCollection={restoreCollection}
              onPermanentDeleteCollection={permanentDeleteCollection}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage 
              hasPassword={hasPassword} 
              showHiddenBookmarks={showHiddenBookmarks}
              onSetPassword={setPassword}
              onRemovePassword={removePassword}
              onToggleShowHiddenBookmarks={handleToggleShowHiddenBookmarks}
              onRefreshAll={refreshAllData}
            />
          )}

          {currentTab === 'jobs' && (
            <JobsPage />
          )}

          {currentTab === 'auditor' && (
            <AuditorPage
              bookmarks={bookmarks}
              onDeleteBookmark={deleteBookmark}
              onUpdateBookmark={updateBookmark}
              onRefreshBookmarks={refreshBookmarks}
            />
          )}
    </MainLayout>
  );
};

export default App;
