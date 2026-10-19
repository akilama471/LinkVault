import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserOption, BrowserStatusInfo } from '../types/browser';
import { BrowserChoiceModal } from '../components/bookmarks/BrowserChoiceModal';
import { LocateBrowserModal } from '../components/bookmarks/LocateBrowserModal';
import { useToast } from './ToastContext';

interface BookmarkOpenerContextType {
  defaultBrowser: BrowserOption;
  browserStatuses: Record<string, BrowserStatusInfo>;
  loading: boolean;
  openBookmark: (url: string, title?: string) => Promise<void>;
  setDefaultBrowser: (browser: BrowserOption) => Promise<boolean>;
  refreshStatuses: () => Promise<void>;
  locateBrowserExecutable: (browserName: string, pendingUrl?: string) => Promise<string | null>;
  clearCustomBrowserPath: (browserName: string) => Promise<void>;
}

const BookmarkOpenerContext = createContext<BookmarkOpenerContextType | null>(null);

export const BookmarkOpenerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [defaultBrowser, setDefaultBrowserState] = useState<BrowserOption>('Always Ask');
  const [browserStatuses, setBrowserStatuses] = useState<Record<string, BrowserStatusInfo>>({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [choiceModal, setChoiceModal] = useState<{ isOpen: boolean; url: string; title?: string }>({
    isOpen: false,
    url: ''
  });

  const [locateModal, setLocateModal] = useState<{ isOpen: boolean; browserName: string; pendingUrl?: string }>({
    isOpen: false,
    browserName: ''
  });

  const { error: toastError, success: toastSuccess } = useToast();

  const loadSettingsAndStatuses = useCallback(async () => {
    try {
      // @ts-ignore
      const defaultRes = await window.electronAPI.browser.getDefault();
      if (defaultRes.success && defaultRes.data) {
        setDefaultBrowserState(defaultRes.data as BrowserOption);
      } else {
        setDefaultBrowserState('Always Ask');
      }

      // @ts-ignore
      const statusesRes = await window.electronAPI.browser.getStatuses();
      if (statusesRes.success && statusesRes.data) {
        setBrowserStatuses(statusesRes.data);
      }
    } catch (err) {
      console.error('Failed to load browser settings or statuses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsAndStatuses();
  }, [loadSettingsAndStatuses]);

  const setDefaultBrowser = async (browser: BrowserOption): Promise<boolean> => {
    try {
      // @ts-ignore
      const res = await window.electronAPI.browser.setDefault(browser);
      if (res.success) {
        setDefaultBrowserState(browser);
        return true;
      }
      return false;
    } catch (err: any) {
      toastError('Settings Error', err.message || 'Failed to update default browser setting.');
      return false;
    }
  };

  const refreshStatuses = async () => {
    try {
      // @ts-ignore
      const res = await window.electronAPI.browser.getStatuses();
      if (res.success && res.data) {
        setBrowserStatuses(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh browser statuses:', err);
    }
  };

  const locateBrowserExecutable = async (browserName: string, pendingUrl?: string): Promise<string | null> => {
    try {
      // @ts-ignore
      const res = await window.electronAPI.browser.browseExecutable(browserName);
      if (res.success && res.path) {
        toastSuccess('Browser Configured', `${browserName} executable path updated.`);
        await refreshStatuses();

        // If there was a pending URL, open it now!
        if (pendingUrl) {
          // @ts-ignore
          await window.electronAPI.browser.openUrl(pendingUrl, browserName);
        }
        setLocateModal({ isOpen: false, browserName: '' });
        return res.path;
      }
      return null;
    } catch (err: any) {
      toastError('Configuration Failed', err.message || 'Failed to set browser path.');
      return null;
    }
  };

  const clearCustomBrowserPath = async (browserName: string): Promise<void> => {
    try {
      // @ts-ignore
      await window.electronAPI.browser.clearCustomPath(browserName);
      toastSuccess('Path Reset', `${browserName} reset to automatic detection.`);
      await refreshStatuses();
    } catch (err: any) {
      toastError('Reset Failed', err.message || 'Failed to reset browser path.');
    }
  };

  const openBookmark = async (url: string, title?: string): Promise<void> => {
    if (!url) return;

    if (defaultBrowser === 'Always Ask') {
      setChoiceModal({ isOpen: true, url, title });
      return;
    }

    try {
      // @ts-ignore
      const res = await window.electronAPI.browser.openUrl(url, defaultBrowser);
      if (res.notFound) {
        setLocateModal({ isOpen: true, browserName: defaultBrowser, pendingUrl: url });
      } else if (!res.success && res.error) {
        toastError('Failed to Open Link', res.error);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'An error occurred while opening the bookmark.');
    }
  };

  const handleSelectFromModal = async (chosenBrowser: string, rememberChoice: boolean) => {
    const url = choiceModal.url;
    setChoiceModal({ isOpen: false, url: '' });

    if (rememberChoice) {
      await setDefaultBrowser(chosenBrowser as BrowserOption);
    }

    try {
      // @ts-ignore
      const res = await window.electronAPI.browser.openUrl(url, chosenBrowser);
      if (res.notFound) {
        setLocateModal({ isOpen: true, browserName: chosenBrowser, pendingUrl: url });
      } else if (!res.success && res.error) {
        toastError('Failed to Open Link', res.error);
      }
    } catch (err: any) {
      toastError('Error', err.message || 'An error occurred while opening the bookmark.');
    }
  };

  const handleTriggerLocateFromChoiceModal = (browserName: string) => {
    const pendingUrl = choiceModal.url;
    setChoiceModal({ isOpen: false, url: '' });
    locateBrowserExecutable(browserName, pendingUrl);
  };

  return (
    <BookmarkOpenerContext.Provider
      value={{
        defaultBrowser,
        browserStatuses,
        loading,
        openBookmark,
        setDefaultBrowser,
        refreshStatuses,
        locateBrowserExecutable,
        clearCustomBrowserPath
      }}
    >
      {children}

      <BrowserChoiceModal
        isOpen={choiceModal.isOpen}
        url={choiceModal.url}
        title={choiceModal.title}
        statuses={browserStatuses}
        onClose={() => setChoiceModal({ isOpen: false, url: '' })}
        onSelectBrowser={handleSelectFromModal}
        onLocateBrowser={handleTriggerLocateFromChoiceModal}
      />

      <LocateBrowserModal
        isOpen={locateModal.isOpen}
        browserName={locateModal.browserName}
        onClose={() => setLocateModal({ isOpen: false, browserName: '' })}
        onLocate={() => locateBrowserExecutable(locateModal.browserName, locateModal.pendingUrl)}
      />
    </BookmarkOpenerContext.Provider>
  );
};

export const useBookmarkOpener = () => {
  const context = useContext(BookmarkOpenerContext);
  if (!context) {
    throw new Error('useBookmarkOpener must be used within a BookmarkOpenerProvider');
  }
  return context;
};
