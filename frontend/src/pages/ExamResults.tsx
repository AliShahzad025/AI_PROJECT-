import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, StatusBadge, GradientButton } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldCheck, ArrowRight, Award, AlertTriangle, ShieldAlert, Clock, LayoutDashboard, History } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAppAuth } from '../lib/auth';
import confetti from 'canvas-confetti';

export default function ExamResults() {
  const { id: examId } = useParams();
  const { user } = useAppAuth();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !examId) return;

    // Fetch Exam Details
    const unsubExam = onSnapshot(doc(db, 'exams', examId), (snap) => {
      setExam({ id: snap.id, ...snap.data() });
    });

    // Fetch Latest Submission for this student and exam
    const qSub = query(
      collection(db, 'submissions'), 
      where('examId', '==', examId),
      where('studentId', '==', user.uid),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );
    
    const unsubSub = onSnapshot(qSub, (snapshot) => {
      if (!snapshot.empty) {
        setSubmission({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
      setLoading(false);
    });

    // Fetch Alerts for this exam and student
    const qAlerts = query(
      collection(db, 'monitoringAlerts'),
      where('examId', '==', examId),
      where('studentId', '==', user.uid),
      orderBy('timestamp', 'asc')
    );

    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubExam();
      unsubSub();
      unsubAlerts();
    };
  }, [user, examId]);

  useEffect(() => {
    if (!loading && alerts.length === 0 && submission) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#00B4D8', '#4ade80', '#a855f7']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#00B4D8', '#4ade80', '#a855f7']
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [loading, alerts, submission]);

  if (loading) {
    return (
      <Layout role="student">
        <div className="h-[600px] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#00B4D8]/20 border-t-[#00B4D8] rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="flex items-center gap-2 mb-2">
        <StatusBadge status="Results Published" variant="success" />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Exam ID: {examId}</span>
      </div>
      <PageHeader 
        title={exam?.title || "Exam Performance"} 
        subtitle="Detailed analysis of your submission and proctoring session." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
        {/* Left Column - Score Cards */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-8 text-center bg-[#00B4D8]/5 border-[#00B4D8]/10 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-[#00B4D8]" />
             <Award className="w-12 h-12 text-[#00B4D8] mx-auto mb-4" />
             <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Score</div>
             <div className="text-5xl font-display font-black text-white mb-2">
               {submission?.score ?? '--'}<span className="text-xl text-white/20">/{submission?.totalQuestions ?? '?'}</span>
             </div>
             <p className="text-xs text-white/40 font-medium">Points awarded based on auto-grading</p>
          </GlassCard>

          <GlassCard className={`p-8 text-center relative overflow-hidden ${alerts.length > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-green-500/5 border-green-500/10'}`}>
             <div className={`absolute top-0 left-0 w-full h-1 ${alerts.length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
             {alerts.length > 0 ? <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" /> : <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />}
             <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Integrity Score</div>
             <div className={`text-4xl font-display font-black mb-2 ${alerts.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
               {submission?.trustScore ?? 100}%
             </div>
             <p className="text-xs text-white/40 font-medium">Based on {alerts.length} detected incidents</p>
          </GlassCard>

          <div className="flex flex-col gap-3">
            <GradientButton onClick={() => navigate('/student/exams')} className="w-full py-4 flex items-center justify-center gap-2">
               <LayoutDashboard className="w-4 h-4" /> Back to Portal
            </GradientButton>
            <GradientButton variant="secondary" onClick={() => navigate('/student/violations')} className="w-full py-4 flex items-center justify-center gap-2">
               <History className="w-4 h-4" /> My Full History
            </GradientButton>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-8">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold text-white">Monitoring Timeline</h3>
              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">
                {alerts.length} Incidents Logged
              </div>
           </div>

           <div className="space-y-4">
             {alerts.length > 0 ? alerts.map((alert, idx) => (
               <GlassCard key={alert.id} className="p-6 border-white/5 flex items-start gap-6 hover:border-white/20 transition-all">
                 <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white/20">
                      {idx + 1}
                    </div>
                    <div className="w-px h-full bg-white/5 mt-4" />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                         <StatusBadge status={alert.alertType?.replace('_', ' ') || 'Alert'} variant={alert.severity === 'high' ? 'danger' : 'warning'} />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                           {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString() : 'Recent'}
                         </span>
                       </div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Session: {alert.sessionId?.slice(-6) || 'N/A'}</div>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{alert.message}</p>
                    <p className="text-xs text-white/40 leading-relaxed">{alert.description}</p>
                 </div>
               </GlassCard>
             )) : (
               <div className="py-20 bg-white/5 border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center text-center px-10">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Perfect Session Integrity!</h4>
                  <p className="text-sm text-white/30 max-w-sm">No suspicious activities were detected by the AI proctoring engine during this exam.</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </Layout>
  );
}

// Re-import doc for firebase
import { doc } from 'firebase/firestore';
