import React from 'react';
import { Sidebar } from './Sidebar';
import { useAppAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'instructor' | 'student';
}

export const Layout: React.FC<LayoutProps> = ({ children, role }) => {
  const { user, loading } = useAppAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <Navigate to="/" />;
  if (user.isActive === false) return <Navigate to="/login" />;

  return (
    <div className="flex min-h-screen bg-[#0D1117]">
      <Sidebar role={role} />
      <main className="flex-1 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  );
};
