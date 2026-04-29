import { useState, useEffect } from 'react';
import { getUser } from './api';

export function useAppAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  return { user, loading };
}
