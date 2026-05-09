import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { Users, Search, Filter, Download, Trash2, Check, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleUserStatus = async (user: any) => {
    try {
      const currentStatus = user.isActive === undefined ? true : user.isActive;
      await updateDoc(doc(db, 'users', user.id), {
        isActive: !currentStatus
      });
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const toggleVerification = async (user: any) => {
    try {
      const currentStatus = user.isVerified === undefined ? false : user.isVerified;
      await updateDoc(doc(db, 'users', user.id), {
        isVerified: !currentStatus
      });
      toast.success(`User ${currentStatus ? 'unverified' : 'verified'} successfully`);
    } catch (err) {
      toast.error("Failed to update verification");
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success("User deleted successfully");
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const exportCSV = () => {
    const headers = ['Full Name', 'Email', 'Role', 'Status', 'Joined Date'];
    const rows = filteredUsers.map(u => [
      u.name || u.displayName,
      u.email,
      u.role,
      u.isActive ? 'Active' : 'Inactive',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "users.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || u.displayName || '').toLowerCase().includes(search.toLowerCase()) || 
                          u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Active' ? u.isActive === true : u.isActive === false);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Layout role="admin">
      <PageHeader 
        title="User Management" 
        subtitle="Manage institutional accounts, roles, and security statuses." 
      />

      {/* Toolbar */}
      <GlassCard className="mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..." 
              className="w-full bg-[#0D1117] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#00B4D8]/50 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
            >
              <option value="All">All Roles</option>
              <option value="Student">Student</option>
              <option value="Instructor">Instructor</option>
              <option value="Admin">Admin</option>
            </select>

            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <GradientButton variant="secondary" className="flex items-center gap-2" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </GradientButton>
          </div>
        </div>
        <div className="mt-4 text-[10px] text-white/30 font-bold uppercase tracking-widest">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </GlassCard>

      {/* Users Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">User</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Verified</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Joined</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00B4D8]/20 to-[#0077B6]/20 border border-white/10 flex items-center justify-center text-white font-bold">
                        {(user.name || user.displayName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{user.name || user.displayName}</div>
                        <div className="text-[10px] text-white/40">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-black uppercase tracking-widest text-[#00B4D8]">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleVerification(user)}>
                      <StatusBadge 
                        status={user.isVerified ? 'Verified' : 'Pending'} 
                        variant={user.isVerified ? 'success' : 'warning'} 
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleUserStatus(user)}>
                      <StatusBadge 
                        status={(user.isActive !== false) ? 'Active' : 'Inactive'} 
                        variant={(user.isActive !== false) ? 'success' : 'danger'} 
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => toggleUserStatus(user)}
                        className={`p-2 rounded-lg border transition-all ${user.isActive ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'}`}
                        title={user.isActive ? 'Deactivate User' : 'Activate User'}
                      >
                        {user.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </Layout>
  );
}
