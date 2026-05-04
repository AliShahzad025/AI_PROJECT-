import { useState, useEffect } from 'react';
import { getUser } from './api';

export function useAppAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = () => {
      const currentUser = getUser();
      setUser(currentUser);
      setLoading(false);
    };
    fetchUser();
    
    // Optional: listen for storage changes
    window.addEventListener('storage', fetchUser);
    return () => window.removeEventListener('storage', fetchUser);
  }, []);

  return { user, loading };
}
