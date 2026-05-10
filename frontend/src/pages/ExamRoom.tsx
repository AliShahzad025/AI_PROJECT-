import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { submitExam, getExamById, WS_URL } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldCheck, Send, ShieldAlert, Camera, Shield, Check, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, GradientButton } from '../components/UI';
import { useGazeMonitor } from '../hooks/useGazeMonitor';

export default function ExamRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAppAuth();

  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [incidents, setIncidents] = useState<{ time: string, type: string }[]>([]);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const [verificationStage, setVerificationStage] = useState<'idle' | 'verifying' | 'completed'>('idle');
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);

  // Gaze Monitoring Hook (must be AFTER verificationStage is declared)
  const gaze = useGazeMonitor(id || '', videoRef, canvasRef, verificationStage === 'completed' && !isSubmitting);

  // Ref for cleanup
  const cleanupRefs = useRef<{
    frameInterval?: NodeJS.Timeout;
    timerInterval?: NodeJS.Timeout;
  }>({});

  // 1. Browser Lockdown & Fullscreen
  useEffect(() => {
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => { });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const time = new Date().toLocaleTimeString();
        setIncidents(prev => [...prev, { time, type: "Tab Switched" }]);
        toast.error("Security Alert: Tab switching detected!");

        // Log to backend if connected
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'alert', message: 'tab_switch' }));
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && verificationStage === 'completed') {
        toast.error("Please remain in fullscreen mode!");
        enterFullscreen();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [verificationStage, id]);

  // 2. Monitoring Intervals (Webcam 2s, Audio 5s)
  useEffect(() => {
    if (verificationStage !== 'completed' || !stream || !user || isSubmitting) return;

    // WebSocket Setup
    const socket = new WebSocket(`${WS_URL}/monitor/${id}`);
    socketRef.current = socket;

    socket.onopen = () => setIsAiConnected(true);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'alert') {
        setAiWarning(data.message);
        setIncidents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: data.message }]);
        toast.error(data.message, { icon: <ShieldAlert className="text-red-400" /> });
      }
    };

    // Frame capture every 2s
    cleanupRefs.current.frameInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          canvasRef.current.width = 320;
          canvasRef.current.height = 240;
          context.drawImage(videoRef.current, 0, 0, 320, 240);
          const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6);
          socket.send(JSON.stringify({ type: 'frame', data: base64 }));
        }
      }
    }, 2000);

    return () => {
      clearInterval(cleanupRefs.current.frameInterval);
      socket.close();
    };
  }, [verificationStage, stream, user, id, isSubmitting]);

  // 3. Exam Timer & Data
  useEffect(() => {
    if (!id) return;
    getExamById(id).then(data => {
      setExamData(data);
      if (data?.durationMinutes) setTimeLeft(data.durationMinutes * 60);
    });

    cleanupRefs.current.timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(cleanupRefs.current.timerInterval);
  }, [id]);

  // 4. Camera Init & Cleanup
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        toast.error("Camera access is required to take this exam.");
      }
    };
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Stop all media
    if (stream) stream.getTracks().forEach(track => track.stop());

    try {
      const trustScore = Math.max(0, 100 - incidents.length * 10);
      await submitExam(id!, user!.uid, user!.name, user!.email, answers, incidents, trustScore);
      navigate(`/results/${id}`, { state: { incidents } });
      toast.success("Exam submitted successfully!");
    } catch (err) {
      toast.error("Submission error. Please contact support.");
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] select-none" onCopy={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}>
      <canvas ref={canvasRef} className="hidden" />

      {/* Identity Verification Overlay */}
      <AnimatePresence>
        {verificationStage !== 'completed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#050505]/95 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <GlassCard className="max-w-2xl w-full p-8 text-center" hover={false}>
              <h2 className="text-3xl font-display font-bold mb-2">Identity Check</h2>
              <p className="text-white/40 mb-8">Please align your face within the frame to begin the session.</p>

              <div className="aspect-video bg-black rounded-3xl border border-white/10 mb-8 overflow-hidden relative">
                <video autoPlay playsInline muted ref={videoRef} className="w-full h-full object-cover transform -scale-x-100" />
                {verificationPhoto && (
                  <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-md flex items-center justify-center">
                    <Check className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <GradientButton variant="secondary" className="flex-1" onClick={() => setVerificationPhoto('captured')}>
                  Capture Photo
                </GradientButton>
                <GradientButton
                  className="flex-1"
                  disabled={!verificationPhoto}
                  onClick={() => {
                    setVerificationStage('completed');
                    document.documentElement.requestFullscreen().catch(() => { });
                  }}
                >
                  Start Exam
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-20 border-b border-white/5 bg-glass sticky top-0 z-50 backdrop-blur-xl px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <div className="leading-tight">
            <h1 className="font-display font-bold text-lg">Secure Exam Session</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">{examData?.name || 'Loading...'}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 bg-white/5 px-5 py-2 rounded-2xl border border-white/10">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>
          <GradientButton onClick={handleSubmit} disabled={isSubmitting}>
            Finish & Submit
          </GradientButton>
        </div>
      </header>

      {/* Gaze Warning Banner */}
      <AnimatePresence>
        {gaze.showWarning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/90 backdrop-blur-md text-white py-2 px-8 flex items-center justify-between z-[60]"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4" /> Suspicious Eye Movement Detected! Please stay focused on the screen.
            </div>
            <button onClick={() => gaze.setShowWarning(false)} className="text-white/50 hover:text-white transition-colors">
              <Check className="w-4 h-4" /> Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-4xl mx-auto px-6 py-12 pb-40">
        <div className="space-y-12">
          {examData?.questions?.map((q: any, i: number) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard>
                <div className="flex gap-4 mb-6">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                    {i + 1}
                  </span>
                  <h3 className="text-xl font-medium text-white/90">{q.text}</h3>
                </div>

                {q.type === 'mcq' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {q.options?.map((opt: string) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${answers[q.id] === opt ? 'bg-indigo-500/10 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                          }`}
                      >
                        <input
                          type="radio"
                          className="hidden"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${answers[q.id] === opt ? 'border-indigo-400' : 'border-white/20'
                          }`}>
                          {answers[q.id] === opt && <div className="w-2 h-2 bg-indigo-400 rounded-full" />}
                        </div>
                        <span className="text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-white outline-none focus:border-indigo-500/50 transition-all min-h-[200px] placeholder:text-white/5"
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Floating Webcam Monitor */}
      <div className="fixed bottom-8 right-8 w-72 group">
        <GlassCard className="p-2 overflow-hidden border-indigo-500/30">
          <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
            <canvas ref={canvasRef} className="hidden" />

            {/* AI Status Overlay */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                <div className={`w-2 h-2 rounded-full ${gaze.isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">AI Monitor</span>
              </div>
              {gaze.isConnected && (
                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${gaze.currentZone === 'center' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  Gaze: {gaze.currentZone}
                </div>
              )}
            </div>

            {/* Alerts overlay */}
            <AnimatePresence>
              {aiWarning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-500/40 backdrop-blur-sm flex items-center justify-center p-4 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="text-white w-8 h-8" />
                    <p className="text-[10px] font-bold uppercase text-white drop-shadow-md">{aiWarning}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-2 flex items-center justify-between px-2">
            <span className="text-[10px] text-white/40 font-medium">TRUST SCORE</span>
            <span className={`text-[10px] font-bold ${incidents.length > 5 ? 'text-red-400' : 'text-indigo-400'}`}>
              {Math.max(0, 100 - incidents.length * 10)}%
            </span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={{ width: '100%' }}
              animate={{ width: `${Math.max(0, 100 - incidents.length * 10)}%` }}
            />
          </div>
        </GlassCard>
      </div>

      {/* Connection Indicator */}
      {!gaze.isConnected && verificationStage === 'completed' && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-red-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
            <ShieldAlert className="w-3 h-3" /> AI MONITOR OFFLINE - CHECKING BACKEND
          </div>
        </div>
      )}

      {/* Gaze Violation Modal */}
      <AnimatePresence>
        {gaze.showModal && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
            <GlassCard className="max-w-md p-10 border-red-500/50" hover={false}>
              <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-display font-bold text-white mb-4 uppercase tracking-tighter">Security Violation</h2>
              <p className="text-white/50 mb-8 leading-relaxed">
                Persistent suspicious eye movement detected ({gaze.totalViolations} times). This incident has been logged and the proctor has been notified.
              </p>
              <GradientButton variant="danger" className="w-full" onClick={() => gaze.setShowModal(false)}>
                I Understand
              </GradientButton>
            </GlassCard>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ClipboardIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
  );
}
