import React from 'react';
import { useState, useEffect } from 'react';
import { GlassCard, GradientButton, PageHeader } from '../components/UI';
import { Layout, Calendar, Users, ClipboardCheck, AlertTriangle, Plus, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getExams } from '../lib/api';

export default function InstructorDashboard() {
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    pendingAlerts: 0
  });

  const [recentExams, setRecentExams] = useState<any[]>([]);

  useEffect(() => {
    // Fetch dashboard stats from backend
    // For now using mock data that fits the design
    setStats({
      totalExams: 12,
      activeExams: 2,
      totalStudents: 156,
      pendingAlerts: 8
    });

    const fetchExams = async () => {
      try {
        const exams = await getExams();
        setRecentExams(exams.slice(0, 3));
      } catch (err) {
        console.error(err);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <PageHeader 
        title="Instructor Dashboard" 
        subtitle="Manage your exams and monitor student performance in real-time."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={<ClipboardCheck className="text-purple-400" />} label="Total Exams" value={stats.totalExams} />
        <StatCard icon={<Layout className="text-blue-400" />} label="Active Now" value={stats.activeExams} color="text-blue-400" />
        <StatCard icon={<Users className="text-indigo-400" />} label="Students" value={stats.totalStudents} />
        <StatCard icon={<AlertTriangle className="text-red-400" />} label="Pending Alerts" value={stats.pendingAlerts} color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Recent Exams */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-display font-semibold text-white">Recent Exams</h2>
            <Link to="/instructor/exams/create">
              <GradientButton className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create New
              </GradientButton>
            </Link>
          </div>

          {recentExams.length > 0 ? (
            recentExams.map((exam, index) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="flex items-center justify-between group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-purple-500/30 transition-colors">
                      <Calendar className="w-6 h-6 text-white/40" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">{exam.name}</h3>
                      <p className="text-white/40 text-sm">{exam.date} · {exam.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${exam.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                        {exam.status || 'scheduled'}
                      </span>
                    </div>
                    <Link to={`/instructor/exams/${exam.id}/edit`}>
                      <GradientButton variant="secondary" className="p-2">
                        <ChevronRight className="w-5 h-5" />
                      </GradientButton>
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            ))
          ) : (
            <GlassCard className="text-center py-12">
              <p className="text-white/40">No exams created yet. Start by creating your first exam.</p>
            </GlassCard>
          )}
        </div>

        {/* Sidebar: Quick Actions / Monitoring */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-semibold text-white">Live Monitoring</h2>
          <GlassCard className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                placeholder="Search students..." 
                className="w-full bg-[#050505] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-sm text-white/70">System Status</span>
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Active
                </span>
              </div>
              <GradientButton variant="secondary" className="w-full text-sm py-3">
                View All Reports
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-white" }) {
  return (
    <GlassCard className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4 border border-white/10">
        {icon}
      </div>
      <p className="text-white/40 text-sm font-medium mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </GlassCard>
  );
}
