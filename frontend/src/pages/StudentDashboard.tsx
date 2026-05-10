import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, StatCard, GlassCard, StatusBadge, GradientButton } from '../components/UI';
import { ClipboardList, CheckCircle, Clock, ShieldAlert, ArrowRight, Calendar, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { calculateViolationsCount } from '../lib/violations';

export default function StudentDashboard() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    enrolledExams: 0,
    completedExams: 0,
    upcomingToday: 0,
    violations: 0,
    alerts: 0
  });

  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch Exams for stats and upcoming list
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      const allExams = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setExams(allExams);
    });

    // Fetch Violations
    const unsubAlerts = onSnapshot(query(collection(db, 'monitoringAlerts'), where('studentId', '==', user.uid)), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const count = calculateViolationsCount(docs);
      setStats(prev => ({ ...prev, violations: count, alerts: docs.length }));
    });

    // Fetch Recent Activity (submissions)
    const unsubSub = onSnapshot(query(collection(db, 'submissions'), where('studentId', '==', user.uid), orderBy('timestamp', 'desc')), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(docs);
      setRecentActivity(docs.slice(0, 5));
    });

    return () => {
      unsubExams();
      unsubAlerts();
      unsubSub();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !exams.length) return;

    const enrolled = exams.filter(e => e.enrolledStudents?.includes(user?.uid));
    const completedExamIds = submissions.map(s => s.examId);
    
    const completed = enrolled.filter(e => e.status === 'completed' || completedExamIds.includes(e.id));
    const upcoming = enrolled.filter(e => !completedExamIds.includes(e.id) && e.status !== 'completed');

    setStats(prev => ({
      ...prev,
      enrolledExams: enrolled.length,
      completedExams: completed.length,
      upcomingToday: upcoming.filter(e => e.date === new Date().toISOString().split('T')[0]).length
    }));

    setUpcomingExams(upcoming.slice(0, 4));
  }, [user, exams, submissions]);

  return (
    <Layout role="student">
      <div className="flex justify-between items-end mb-8">
        <PageHeader 
          title={`Welcome back, ${user?.name.split(' ')[0]} 👋`} 
          subtitle="Check your exam schedule and performance history." 
        />
        <div className="text-right pb-8">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Current Time</div>
          <div className="text-lg font-display font-black text-white">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard title="Enrolled Exams" value={stats.enrolledExams} icon={<ClipboardList />} color="var(--accent-primary)" />
        <StatCard title="Completed" value={stats.completedExams} icon={<CheckCircle />} color="var(--success)" />
        <StatCard title="Upcoming Today" value={stats.upcomingToday} icon={<Clock />} color="var(--warning)" />
        <StatCard 
          title="My Violations" 
          value={`${stats.violations} (${stats.alerts} Alerts)`} 
          icon={<ShieldAlert />} 
          color="var(--danger)" 
          onClick={() => navigate('/student/violations')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Upcoming Exams Grid */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-white">Upcoming Exams</h2>
            <Link to="/student/exams" className="text-xs font-black uppercase tracking-widest text-[#00B4D8] hover:underline">View All</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingExams.length > 0 ? upcomingExams.map(exam => (
              <ExamCard key={exam.id} exam={exam} navigate={navigate} />
            )) : (
              <div className="col-span-full py-20 bg-white/5 border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center">
                 <Calendar className="w-12 h-12 text-white/10 mb-4" />
                 <p className="text-white/40 text-sm font-medium">No upcoming exams scheduled</p>
                 <GradientButton variant="secondary" className="mt-4" onClick={() => navigate('/student/exams')}>Browse Exams</GradientButton>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="lg:col-span-4">
          <h2 className="text-xl font-display font-bold text-white mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? recentActivity.map(session => (
              <GlassCard 
                key={session.id} 
                className="p-4 flex items-center justify-between border-white/5 cursor-pointer hover:border-[#00B4D8]/30 transition-all"
                onClick={() => navigate(`/student/exams/${session.examId}/results`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${session.incidents?.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                    {session.incidents?.length > 0 ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white truncate max-w-[140px]">{session.examName || 'Exam Session'}</div>
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                      {session.timestamp?.toDate ? session.timestamp.toDate().toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-xs font-bold text-white">
                    {session.score !== undefined ? `${session.score}/${session.totalQuestions || '?'}` : '--'}
                  </div>
                  <StatusBadge 
                    status={session.incidents?.length > 0 ? `${session.incidents.length} Flags` : 'Clean'} 
                    variant={session.incidents?.length > 0 ? 'danger' : 'success'} 
                  />
                </div>
              </GlassCard>
            )) : (
              <div className="py-12 text-center bg-white/5 border border-white/10 border-dashed rounded-3xl">
                <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-xs text-white/30">No recent exam sessions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ExamCard({ exam, navigate }: any) {
  const isJoinable = () => {
    const examDate = new Date(`${exam.date}T${exam.time}`);
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    const mins = diff / 60000;
    return mins <= 10 && mins >= -exam.durationMinutes;
  };

  const getCountdown = () => {
    const examDate = new Date(`${exam.date}T${exam.time}`);
    const now = new Date();
    const diff = examDate.getTime() - now.getTime();
    if (diff < 0) return "In Progress";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `Starts in ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
  };

  return (
    <GlassCard className="h-full flex flex-col hover:border-[#00B4D8]/30 transition-all group overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00B4D8]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#00B4D8]/10 transition-all" />
      
      <div className="flex-1">
        <div className="flex justify-between items-start mb-4">
          <StatusBadge status={exam.status} variant={exam.status === 'active' ? 'danger' : 'accent'} />
          <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{exam.durationMinutes} min</div>
        </div>
        
        <h3 className="text-xl font-display font-bold text-white mb-2 leading-tight group-hover:text-[#00B4D8] transition-colors">{exam.title || exam.name}</h3>
        <div className="flex items-center gap-2 text-xs text-white/40 mb-6">
          <User className="w-3 h-3" /> {exam.instructorName}
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-xs text-white/60 font-medium">
            <Calendar className="w-4 h-4 text-white/20" /> {exam.date}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/60 font-medium">
            <Clock className="w-4 h-4 text-white/20" /> {exam.time}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black text-[#00B4D8] bg-[#00B4D8]/5 p-2 rounded-xl border border-[#00B4D8]/10">
            <Clock className="w-3.5 h-3.5" /> {getCountdown()}
          </div>
        </div>
      </div>

      <GradientButton 
        disabled={!isJoinable()}
        onClick={() => navigate(`/student/exams/${exam.id}/session`)}
        className="w-full py-4 text-sm font-black flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform"
      >
        Enter Exam <ArrowRight className="w-4 h-4" />
      </GradientButton>
    </GlassCard>
  );
}
