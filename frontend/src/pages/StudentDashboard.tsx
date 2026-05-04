import { useState, useEffect, useRef } from 'react';
import { useAppAuth } from '../lib/auth';
import { logout, setUserRole, getExams, subscribeToExams, subscribeToStudentSubmissions } from '../lib/api';
import { GraduationCap, LogOut, Calendar, Clock, Video, RotateCcw, Play, History, ShieldCheck, ShieldAlert, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GlassCard, GradientButton, PageHeader } from '../components/UI';

const WebcamPlayer = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 relative group">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-4 flex gap-2">
         <div className="px-3 py-1.5 bg-green-500/20 text-green-400 text-[10px] uppercase font-bold tracking-widest rounded-lg border border-green-500/20 flex items-center gap-2 backdrop-blur-md">
           <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
           Secure Feed Active
         </div>
      </div>
    </div>
  );
};

export default function StudentDashboard() {
  const { user, loading } = useAppAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<any[]>([]);
  const [pastSubmissions, setPastSubmissions] = useState<any[]>([]);
  const [checkingSystem, setCheckingSystem] = useState<{ id: string; status: 'idle' | 'checking' | 'ready' } | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const getExamStatus = (exam: any) => {
    const dt = new Date(`${exam.date}T${exam.time}`);
    const diffMs = dt.getTime() - now.getTime();
    const diffMins = diffMs / 60_000;
    if (diffMins > 15) {
      const h = Math.floor(diffMins / 60);
      const m = Math.round(diffMins % 60);
      return { canJoin: false, expired: false, countdown: `Starts in ${h > 0 ? h + 'h ' : ''}${m}m` };
    }
    if (diffMins > -240) return { canJoin: true, expired: false, countdown: null };
    return { canJoin: false, expired: true, countdown: 'Exam ended' };
  };

  useEffect(() => {
    const unsubExams = subscribeToExams((fetchedExams) => {
      setExams(fetchedExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });
    return () => { unsubExams(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToStudentSubmissions(user.uid, setPastSubmissions);
    return () => unsub();
  }, [user]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  if (loading) return null;
  if (!user || user.role !== 'student') return <Navigate to="/login" />;

  const handleStartSystemCheck = async (id: string) => {
    setCheckingSystem({ id, status: 'checking' });
    const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      await minDelay;
      setStream(mediaStream);
      setCheckingSystem({ id, status: 'ready' });
      toast.success("System & Camera verified!");
    } catch (err: any) {
      await minDelay;
      setCheckingSystem(null);
      toast.error("Failed to access camera.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA]">
      <nav className="h-20 border-b border-white/5 bg-glass backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center group-hover:border-indigo-500/40 transition-all">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Student Portal</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-white">{user.name}</span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest">{user.email}</span>
          </div>
          <button onClick={logout} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-red-400 hover:border-red-500/20 transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Ready for your next assessment? Check your schedule below." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Upcoming Exams Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-display font-bold text-white">Upcoming Exams</h2>
              <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-indigo-500/20">
                {exams.length} scheduled
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.length > 0 ? exams.map((exam) => {
                const status = getExamStatus(exam);
                const isChecking = checkingSystem?.id === exam.id;

                return (
                  <motion.div key={exam.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <GlassCard className="h-full flex flex-col group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full pointer-events-none" />
                      
                      <h3 className="text-xl font-bold text-white mb-1">{exam.name}</h3>
                      <p className="text-indigo-400/60 text-xs font-bold uppercase tracking-widest mb-6">
                        {exam.questions?.length || 0} Questions
                      </p>

                      <div className="space-y-3 mb-8 flex-1">
                        <div className="flex items-center gap-3 text-sm text-white/60">
                          <Calendar className="w-4 h-4 text-white/20" />
                          {exam.date}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-white/60">
                          <Clock className="w-4 h-4 text-white/20" />
                          {exam.time}
                        </div>
                        {status.countdown && (
                          <div className="flex items-center gap-3 text-xs font-bold text-indigo-400 bg-indigo-500/5 p-2.5 rounded-xl border border-indigo-500/10">
                            <Timer className="w-4 h-4" /> {status.countdown}
                          </div>
                        )}
                      </div>

                      <AnimatePresence mode="wait">
                        {status.expired ? (
                          <div className="w-full py-3 bg-white/5 text-white/20 rounded-xl text-xs font-bold uppercase tracking-widest text-center border border-white/5">Session Closed</div>
                        ) : isChecking && checkingSystem.status === 'checking' ? (
                          <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center gap-3">
                            <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            <span className="text-xs font-bold text-white/40">CALIBRATING SYSTEM...</span>
                          </div>
                        ) : isChecking && checkingSystem.status === 'ready' ? (
                          <div className="flex flex-col gap-4">
                            <WebcamPlayer stream={stream!} />
                            <GradientButton onClick={() => navigate(`/student/exams/${exam.id}/session`)} className="w-full py-4 text-sm font-bold flex items-center justify-center gap-3">
                              <Play className="w-4 h-4 fill-current" /> BEGIN ASSESSMENT
                            </GradientButton>
                          </div>
                        ) : (
                          <GradientButton 
                            variant={status.canJoin ? 'primary' : 'secondary'}
                            disabled={!status.canJoin}
                            onClick={() => handleStartSystemCheck(exam.id)}
                            className="w-full py-3 text-sm flex items-center justify-center gap-2"
                          >
                            <Video className="w-4 h-4" /> {status.canJoin ? 'System Check & Join' : 'Locked'}
                          </GradientButton>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  </motion.div>
                );
              }) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl border-dashed">
                  <Calendar className="w-12 h-12 text-white/10 mb-4" />
                  <p className="text-white/40 font-medium">No assessments currently scheduled.</p>
                </div>
              )}
            </div>
          </div>

          {/* Past Results Sidebar */}
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-white mb-2">Performance History</h2>
            <div className="space-y-4">
              {pastSubmissions.length > 0 ? pastSubmissions.map(sub => {
                const flagCount = sub.incidents?.length || 0;
                const score = sub.trustScore ?? 100;
                return (
                  <GlassCard key={sub.id} className="p-4 flex items-center justify-between border-white/5 hover:bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${flagCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                        {flagCount > 0 ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-green-400" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white truncate w-32">{sub.examId}</div>
                        <div className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Trust Score: {score}%</div>
                      </div>
                    </div>
                    <Link to={`/results/${sub.id}`}>
                      <GradientButton variant="secondary" className="p-2">
                         <History className="w-4 h-4" />
                      </GradientButton>
                    </Link>
                  </GlassCard>
                );
              }) : (
                <GlassCard className="py-12 text-center">
                  <History className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-xs text-white/30">No previous submissions found.</p>
                </GlassCard>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
