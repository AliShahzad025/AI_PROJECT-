import React, { useState, useEffect } from 'react';
import { GlassCard, GradientButton, PageHeader } from '../components/UI';
import { Users, Shield, Trash2, Search, Filter, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Mock user data for UI demonstration
    const mockUsers = [
      { id: '1', name: 'Dr. John Smith', email: 'john@seps.edu', role: 'instructor', status: 'active', joined: '2024-01-15' },
      { id: '2', name: 'Alice Johnson', email: 'alice@student.edu', role: 'student', status: 'active', joined: '2024-02-10' },
      { id: '3', name: 'Bob Wilson', email: 'bob@student.edu', role: 'student', status: 'flagged', joined: '2024-03-05' },
      { id: '4', name: 'Admin One', email: 'admin@seps.edu', role: 'admin', status: 'active', joined: '2023-12-01' },
    ];
    setUsers(mockUsers);
    setLoading(false);
  }, []);

  const handleDeactivate = (id: string) => {
    toast.info(`User ${id} deactivation initiated`);
  };

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <PageHeader 
        title="User Management" 
        subtitle="Manage institutional accounts, roles, and security statuses."
      />

      <GlassCard className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or UID..." 
              className="w-full bg-[#050505] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500/50 transition-all"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <GradientButton variant="secondary" className="flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </GradientButton>
            <GradientButton className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Add User
            </GradientButton>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="p-4 text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
              <th className="p-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Role</th>
              <th className="p-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Joined</th>
              <th className="p-4 text-xs font-semibold text-white/40 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-white font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{user.name}</div>
                      <div className="text-xs text-white/40">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md border ${
                    user.role === 'admin' ? 'border-red-500/30 text-red-400 bg-red-500/5' :
                    user.role === 'instructor' ? 'border-purple-500/30 text-purple-400 bg-purple-500/5' :
                    'border-blue-500/30 text-blue-400 bg-blue-500/5'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    {user.status === 'active' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertTriangleIcon className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className={`text-sm ${user.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {user.status}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-sm text-white/40">{user.joined}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                      <Shield className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeactivate(user.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}

function AlertTriangleIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  );
}
