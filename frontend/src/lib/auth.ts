import { useState, useEffect, useCallback } from 'react';
import { getUser } from './api';

// Custom event name for auth state changes
const AUTH_EVENT = 'proctorai_auth_change';

// Dispatch event after any login/logout to notify all listeners
export function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useAppAuth() {
  const [user, setUser] = useState<any>(() => getUser()); // Initialize synchronously
  const [loading, setLoading] = useState(false); // No async needed — localStorage is sync

  const refresh = useCallback(() => {
    const currentUser = getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Listen for auth changes dispatched by login/logout
    window.addEventListener(AUTH_EVENT, refresh);
    // Also listen for changes from other tabs
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return { user, loading };
}
