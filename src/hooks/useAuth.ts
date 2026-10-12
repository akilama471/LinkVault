import { useState, useEffect, useCallback } from 'react';

export function useAuth() {
  const [hasPassword, setHasPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      // @ts-ignore
      const hasPwd = await window.electronAPI.auth.hasPassword();
      setHasPassword(hasPwd);
      
      // If no password is set, the user is automatically authenticated
      setIsAuthenticated(!hasPwd);
    } catch (err) {
      console.error('Failed to check auth status', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPassword = async (password: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.auth.verifyPassword(password);
      if (result.success) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const setPassword = async (password: string) => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.auth.setPassword(password);
      if (result.success) {
        setHasPassword(true);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const removePassword = async () => {
    try {
      // @ts-ignore
      const result = await window.electronAPI.auth.removePassword();
      if (result.success) {
        setHasPassword(false);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const lock = async () => {
    try {
      // @ts-ignore
      await window.electronAPI.auth.lock();
      setIsAuthenticated(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return {
    hasPassword,
    isAuthenticated,
    loading,
    verifyPassword,
    setPassword,
    removePassword,
    lock,
    refresh: checkAuthStatus
  };
}
