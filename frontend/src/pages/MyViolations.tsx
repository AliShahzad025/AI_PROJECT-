import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, StatusBadge } from '../components/UI';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAppAuth } from '../lib/auth';
import { ShieldAlert, CheckCircle, Info, Calendar, Clock } from 'lucide-react';

export default function MyViolations() {
  const { user } = useAppAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch alerts for current student
    const unsubAlerts = onSnapshot(query(collection(db, 'monitoringAlerts'), where('studentId', '==', user.uid)), (snapshot) => {
      setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Fetch exams to map examId to title
    const unsubExams = onSnapshot(collection(db, 'exams'), (snapshot) => {
      setExams(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAlerts();
      unsubExams();
    };
  }, [user]);

  // Group alerts by exam
  const alertsByExam = alerts.reduce((acc: any, alert) => {
    const examId = alert.examId;
    if (!acc[examId]) {
      const exam = exams.find(e => e.id === examId);
      acc[examId] = {
        examName: exam?.title || exam?.name || 'Unknown Exam',
        date: exam?.date || alert.timestamp?.toDate().toLocaleDateString(),
        alerts: []
      };
    }
    acc[examId].alerts.push(alert);
    return acc;
  }, {});

  const totalExams = [...new Set(alerts.map(a => a.examId))].length;
  const cleanExams = exams.filter(e => e.enrolledStudents?.includes(user.uid) && !alerts.some(a => a.examId === e.id)).length;

  return (
    <Layout role="student">
      <PageHeader 
        title="My Exam Monitoring History" 
        subtitle="Review AI-generated alerts and violations from your past assessment sessions." 
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <SummaryCard 
          label="Total Exams Taken" 
          value={totalExams + cleanExams} 
          icon={<Calendar className="w-5 h-5 text-white/40" />} 
        />
        <SummaryCard 
          label="Zero Violation Exams" 
          value={cleanExams} 
          icon={<CheckCircle className="w-5 h-5 text-green-400" />} 
          variant="success"
        />
        <SummaryCard 
          label="Exams with Violations" 
          value={totalExams} 
          icon={<ShieldAlert className="w-5 h-5 text-red-400" />} 
          variant="danger"
        />
      </div>

      <GlassCard className="mb-10 p-6 bg-[#00B4D8]/5 border-[#00B4D8]/10 flex items-start gap-4">
        <Info className="w-5 h-5 text-[#00B4D8] shrink-0 mt-1" />
        <p className="text-sm text-white/60 leading-relaxed">
          AI monitoring assists instructors by flagging suspicious behavior. Final decisions regarding exam integrity are made by your instructor after reviewing the evidence.
        </p>
      </GlassCard>

      <div className="space-y-10">
        {Object.keys(alertsByExam).length > 0 ? Object.entries(alertsByExam).map(([examId, data]: [string, any]) => (
          <div key={examId} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-display font-bold text-white">{data.examName}</h3>
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{data.date}</span>
              </div>
              <StatusBadge status={`${data.alerts.length} Incidents`} variant="danger" />
            </div>

            <div className="space-y-3">
              {data.alerts.map((alert: any) => (
                <GlassCard key={alert.id} className="p-5 border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <Clock className="w-4 h-4 text-white/20 mb-1" />
                        <span className="text-[10px] font-bold text-white/40">{alert.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                         <div className="flex items-center gap-3 mb-1">
                           <StatusBadge status={alert.alertType.replace('_', ' ')} variant={alert.severity === 'high' ? 'danger' : 'warning'} />
                           <span className={`text-[10px] font-black uppercase tracking-widest ${alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>{alert.severity} Severity</span>
                         </div>
                         <p className="text-xs text-white/60">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )) : (
          <div className="py-20 bg-white/5 border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center">
            <CheckCircle className="w-16 h-16 text-green-500/20 mb-4" />
            <h3 className="text-xl font-display font-bold text-white/40">Clean Record!</h3>
            <p className="text-sm text-white/20 mt-2">You have no violations recorded across any of your exams.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function SummaryCard({ label, value, icon, variant = 'info' }: any) {
  const colors: any = {
    info: 'border-white/10',
    success: 'border-green-500/20 text-green-400',
    danger: 'border-red-500/20 text-red-400'
  };

  return (
    <GlassCard className={`p-6 border-l-4 ${colors[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-display font-black text-white">{value}</div>
    </GlassCard>
  );
}
