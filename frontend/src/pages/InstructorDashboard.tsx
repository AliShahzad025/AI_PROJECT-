import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, StatCard, GlassCard, StatusBadge, GradientButton } from '../components/UI';
import { FileText, Activity, Users, ShieldAlert, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';

export default function InstructorDashboard() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalExams: 0,
    activeExams: 0,
    totalStudents: 0,
    unreviewedAlerts: 0
  });

  const [activeExams, setActiveExams] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Stats and Active Exams
    const unsubExams = onSnapshot(query(collection(db, 'exams'), where('instructorId', '==', user.uid)), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStats(prev => ({
        ...prev,
        totalExams: docs.length,
        activeExams: docs.filter(e => e.status === 'active').length,
        totalStudents: docs.reduce((acc, e) => acc + (e.enrolledStudents?.length || 0), 0)
      }));
      setActiveExams(docs.filter(e => e.status === 'active'));
    });

    // Unreviewed Alerts
    const unsubAlerts = onSnapshot(query(collection(db, 'monitoringAlerts'), where('instructorId', '==', user.uid)), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStats(prev => ({
        ...prev,
        unreviewedAlerts: docs.filter(a => !a.reviewed).length
      }));
      setRecentAlerts(docs.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()).slice(0, 8));
    });

    return () => {
      unsubExams();
      unsubAlerts();
    };
  }, [user]);

  return (
    <Layout role="instructor">
      <PageHeader 
        title="Instructor Dashboard" 
        subtitle="Monitor your exams and review AI-generated proctoring alerts." 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Exams" value={stats.totalExams} icon={<FileText />} color="var(--accent-primary)" />
        <StatCard title="Active Exams" value={stats.activeExams} icon={<Activity />} color="var(--success)" />
        <StatCard title="Enrolled Students" value={stats.totalStudents} icon={<Users />} color="var(--info)" />
        <StatCard title="Unreviewed Alerts" value={stats.unreviewedAlerts} icon={<ShieldAlert />} color="var(--danger)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Exam Monitor */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white">Active Exam Monitor</h3>
            <StatusBadge status="Live" variant="danger" />
          </div>
          <div className="p-6 space-y-4">
            {activeExams.length > 0 ? activeExams.map(exam => (
              <div key={exam.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">{exam.title || exam.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Users className="w-3 h-3" /> {exam.enrolledStudents?.length || 0} Students
                    </span>
                    <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> {recentAlerts.filter(a => a.examId === exam.id).length} Alerts
                    </span>
                  </div>
                </div>
                <GradientButton 
                  variant="secondary" 
                  className="p-2.5" 
                  onClick={() => navigate(`/instructor/exams/${exam.id}/review`)}
                >
                  <Eye className="w-4 h-4" />
                </GradientButton>
              </div>
            )) : (
              <div className="py-12 text-center">
                <Activity className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/40 text-sm font-medium">No exams currently active</p>
                <GradientButton className="mt-4" onClick={() => navigate('/instructor/exams/create')}>Create Exam</GradientButton>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent Alerts Feed */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="font-display font-bold text-lg text-white">Recent Alerts Feed</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[450px] overflow-y-auto">
            {recentAlerts.length > 0 ? recentAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`p-4 hover:bg-white/[0.02] transition-all cursor-pointer border-l-4 ${
                  alert.severity === 'high' ? 'border-red-500' : 
                  alert.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'
                }`}
                onClick={() => navigate(`/instructor/exams/${alert.examId}/review`)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-white">{alert.studentName || 'Student'}</span>
                  <span className="text-[10px] text-white/30 font-bold">{alert.timestamp?.toDate().toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge 
                    status={alert.alertType.replace('_', ' ')} 
                    variant={alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'info'} 
                  />
                  <span className="text-[10px] text-white/40 font-medium truncate max-w-[150px]">{alert.examName || 'Exam'}</span>
                </div>
                <p className="text-xs text-white/60 line-clamp-1">{alert.description}</p>
              </div>
            )) : (
              <div className="py-20 text-center">
                <ShieldAlert className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/40 text-sm font-medium">No alerts recorded yet</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}
