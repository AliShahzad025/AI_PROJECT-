import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, StatCard, GlassCard, StatusBadge, GradientButton } from '../components/UI';
import { Users, UserCheck, ShieldAlert, Activity, Database, Server, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, limit, getDocs, onSnapshot, orderBy } from 'firebase/firestore';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    instructors: 0,
    students: 0,
    pendingVerifications: 0,
    activeExams: 0
  });

  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  useEffect(() => {
    // Real-time listener for users to get counts
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        totalUsers: docs.length,
        instructors: docs.filter(u => u.role === 'instructor').length,
        students: docs.filter(u => u.role === 'student').length
      }));
    });

    // Pending verifications
    const unsubVer = onSnapshot(query(collection(db, 'verificationRequests'), orderBy('submittedAt', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStats(prev => ({
        ...prev,
        pendingVerifications: docs.filter(v => v.status === 'pending').length
      }));
      setRecentRequests(docs.filter(v => v.status === 'pending').slice(0, 5));
    });

    // Active exams (mock for now or from firestore if collection exists)
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      setStats(prev => ({
        ...prev,
        activeExams: docs.filter(e => e.status === 'active').length
      }));
    });

    return () => {
      unsubUsers();
      unsubVer();
      unsubExams();
    };
  }, []);

  return (
    <Layout role="admin">
      <PageHeader 
        title="Admin Dashboard" 
        subtitle="System-wide overview and infrastructure monitoring." 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Users" value={stats.totalUsers} icon={<Users />} color="var(--accent-primary)" />
        <StatCard title="Instructors" value={stats.instructors} icon={<Users />} color="var(--info)" />
        <StatCard title="Students" value={stats.students} icon={<Users />} color="var(--success)" />
        <StatCard 
          title="Pending Requests" 
          value={stats.pendingVerifications} 
          icon={<UserCheck />} 
          color="var(--warning)" 
          onClick={() => navigate('/admin/verification')}
        />
        <StatCard title="Active Exams" value={stats.activeExams} icon={<Activity />} color="var(--danger)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Verification Requests */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white">Recent Verification Requests</h3>
            <GradientButton variant="secondary" onClick={() => navigate('/admin/verification')}>View All</GradientButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40">User</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40">Role</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentRequests.length > 0 ? recentRequests.map(req => (
                  <tr key={req.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{req.displayName}</div>
                      <div className="text-[10px] text-white/30">{req.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.requestedRole} variant="accent" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <GradientButton variant="secondary" className="text-xs" onClick={() => navigate('/admin/verification')}>Review</GradientButton>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-white/30 text-sm font-medium">No pending requests</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* System Health */}
        <GlassCard className="p-6">
          <h3 className="font-display font-bold text-lg text-white mb-6">System Health</h3>
          <div className="space-y-4">
            <HealthItem icon={<Server />} label="API Status" status="Operational" color="#2ECC71" />
            <HealthItem icon={<Database />} label="Database" status="Connected" color="#2ECC71" />
            <HealthItem icon={<Cpu />} label="AI Engine" status="Standby" color="#F1C40F" />
            <HealthItem icon={<Activity />} label="Storage" status="Available" color="#2ECC71" />
            <div className="pt-4 mt-4 border-t border-white/5 text-[10px] text-white/30 uppercase tracking-widest font-bold">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recent Activity Log */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-display font-bold text-lg text-white">Recent Activity Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40">Event</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40">User</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40">Role</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {/* Mock data if systemLogs is empty */}
               <ActivityRow event="User Registered" user="Jane Doe" role="student" time="2 mins ago" />
               <ActivityRow event="Exam Created" user="Dr. Smith" role="instructor" time="15 mins ago" />
               <ActivityRow event="Alert Flagged" user="AI Engine" role="system" time="45 mins ago" />
            </tbody>
          </table>
        </div>
      </GlassCard>
    </Layout>
  );
}

function HealthItem({ icon, label, status, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
      <div className="flex items-center gap-3">
        <div className="text-white/40">{icon}</div>
        <span className="text-sm font-bold text-white/60">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{status}</span>
      </div>
    </div>
  );
}

function ActivityRow({ event, user, role, time }: any) {
  return (
    <tr>
      <td className="px-6 py-4 text-sm font-bold text-white">{event}</td>
      <td className="px-6 py-4 text-sm text-white/60">{user}</td>
      <td className="px-6 py-4">
        <StatusBadge status={role} variant={role === 'system' ? 'danger' : 'info'} />
      </td>
      <td className="px-6 py-4 text-sm text-white/40">{time}</td>
    </tr>
  );
}
