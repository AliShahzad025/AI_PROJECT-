import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, Clock, ChevronLeft, ChevronRight, 
  Send, AlertTriangle, Monitor, Eye, Info 
} from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard, GradientButton } from '../components/UI';
import { useGazeMonitor } from '../hooks/useGazeMonitor';
import { calculateViolationsCount } from '../lib/violations';
import { logTabSwitch } from '../lib/api';
import { uploadEvidence } from '../lib/supabase';

const WS_URL = "ws://localhost:8000/ws";

export default function ExamSession() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAppAuth();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Monitoring State
  const [cameraReady, setCameraReady] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [lastAlert, setLastAlert] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Gaze Monitoring Hook (Verified REST API)
  const gaze = useGazeMonitor(
    sessionId || '', 
    user.uid, 
    user.name, 
    examId!, 
    exam?.instructorId || exam?.createdBy || '',
    videoRef, 
    canvasRef, 
    !!sessionId && !isSubmitting
  );

  // Sync AI violations with UI Alert Feed
  useEffect(() => {
    if (gaze.violations > 0 && gaze.currentZone !== 'center') {
      const captureAndUpload = async () => {
        let evidenceUrl = '';
        
        // Capture current frame for evidence
        if (videoRef.current && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = 640; // Higher res for evidence
            canvasRef.current.height = 480;
            ctx.drawImage(videoRef.current, 0, 0, 640, 480);
            const frame = canvasRef.current.toDataURL('image/jpeg', 0.7);
            
            try {
              const path = `violations/${examId}/${user.uid}/${Date.now()}.jpg`;
              evidenceUrl = await uploadEvidence(frame, path);
            } catch (err) {
              console.error("Evidence upload failed:", err);
            }
          }
        }

        const newAlert = {
          type: 'gaze_away',
          message: `Looked ${gaze.currentZone.toUpperCase()} for too long`,
          severity: 'high',
          time: new Date().toLocaleTimeString(),
          details: `Gaze: ${gaze.currentZone}`,
          evidenceImageURL: evidenceUrl
        };
        
        setAlerts(prev => [newAlert, ...prev].slice(0, 5));
        setLastAlert(newAlert);
      };

      captureAndUpload();
    }
  }, [gaze.violations]);

  // 1. Initial Setup
  useEffect(() => {
    const startExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId!));
        if (!snap.exists()) throw new Error("Exam not found");
        
        const data = snap.data();
        setExam(data);
        setQuestions(data.questions || []);
        setTimeLeft((data.durationMinutes || 60) * 60);

        // Create Session
        const sessionRef = await addDoc(collection(db, 'examSessions'), {
          examId,
          studentId: user.uid,
          studentName: user.name,
          startTime: serverTimestamp(),
          status: 'in_progress'
        });
        setSessionId(sessionRef.id);

        // Fullscreen (Temporarily disabled for debugging)
        // if (document.documentElement.requestFullscreen) {
        //   document.documentElement.requestFullscreen().catch(() => {});
        // }

        setLoading(false);
      } catch (err) {
        toast.error("Failed to start exam session");
        navigate('/student/exams');
      }
    };
    startExam();
  }, [examId]);

  // 2. Monitoring - Webcam & WebSocket
  useEffect(() => {
    if (loading || !sessionId) return;

    const initMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);

        // WebSocket
        const socket = new WebSocket(`${WS_URL}/monitor/${examId}/${user.uid}/${sessionId}`);
        socketRef.current = socket;

        socket.onmessage = async (e) => {
          const data = JSON.parse(e.data);
          if (data.type === 'alert') {
            let evidenceUrl = '';
            
            // Capture frame for server-side alerts too
            if (videoRef.current && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                canvasRef.current.width = 640;
                canvasRef.current.height = 480;
                ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                const frame = canvasRef.current.toDataURL('image/jpeg', 0.7);
                try {
                  const path = `violations/${examId}/${user.uid}/server_${Date.now()}.jpg`;
                  evidenceUrl = await uploadEvidence(frame, path);
                } catch (err) {}
              }
            }

            const newAlert = { 
              ...data, 
              time: new Date().toLocaleTimeString(),
              evidenceImageURL: evidenceUrl 
            };
            setAlerts(prev => [newAlert, ...prev].slice(0, 3));
            setLastAlert(newAlert);
            toast.error(data.message || "Suspicious activity detected", { icon: <ShieldAlert /> });
          }
        };
      } catch (err) {
        toast.error("Webcam and Microphone are required for proctoring.");
      }
    };

    initMonitoring();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (socketRef.current) socketRef.current.close();
    };
  }, [loading, sessionId]);

  // 3. Frame Capture (2s)
  useEffect(() => {
    if (!cameraReady || !sessionId) return;
    const interval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = 320;
          canvasRef.current.height = 240;
          ctx.drawImage(videoRef.current, 0, 0, 320, 240);
          const frame = canvasRef.current.toDataURL('image/jpeg', 0.5);
          socketRef.current.send(JSON.stringify({ type: 'frame', data: frame }));
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [cameraReady, sessionId]);



  // 5. Lockdown Events
  useEffect(() => {
    const handleTabSwitch = () => {
      if (document.hidden && sessionId) {
        setAlerts(prev => [{ type: 'tab_switch', message: 'Tab switched', severity: 'high', time: new Date().toLocaleTimeString() }, ...prev]);
        toast.error("Security Alert: Tab switching is prohibited!");
        
        // Log to backend in real-time
        logTabSwitch(sessionId, examId!, user.uid, user.name, exam?.instructorId || exam?.createdBy || '').catch(err => {
          console.error("Failed to log tab switch to backend:", err);
        });
      }
    };

    const handleFSChange = () => {
      if (!document.fullscreenElement) {
        setShowFullscreenWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleTabSwitch);
    document.addEventListener('fullscreenchange', handleFSChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleTabSwitch);
      document.removeEventListener('fullscreenchange', handleFSChange);
    };
  }, [sessionId]);

  // 6. Timer
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loading]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!window.confirm("Submit your exam? You cannot change your answers after submission.")) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8000/api/exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          studentId: user.uid,
          studentName: user.name,
          studentEmail: user.email || '',
          sessionId,
          answers,
          incidents: alerts,
          trustScore: Math.max(0, 100 - (calculateViolationsCount(alerts) * 10)) // 10 points per violation
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Submission failed");

      navigate('/student/completed', { 
        state: { 
          examId, 
          violationCount: calculateViolationsCount(alerts),
          score: result.score 
        } 
      });
    } catch (err) {
      toast.error("Failed to submit exam");
      setIsSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return null;

  const currentQuestion = questions[currentQ];

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#FAFAFA] flex flex-col select-none">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Top Bar */}
      <header className="h-16 border-b border-white/5 bg-[#0D1117]/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Exam In Progress</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <h1 className="text-sm font-bold text-white truncate max-w-[300px]">{exam?.title}</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-4 h-4 text-[#00B4D8]" />
            <span className="font-mono text-lg font-bold text-white">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Questions */}
        <div className="flex-1 overflow-y-auto p-10 flex flex-col">
          <div className="max-w-3xl w-full mx-auto">
            {/* Progress Bar */}
            <div className="mb-10 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20">
                <span>Question {currentQ + 1} of {questions.length}</span>
                <span>{Math.round(((currentQ + 1) / questions.length) * 100)}% Complete</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#00B4D8]" 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white leading-relaxed">
                    {currentQuestion?.questionText}
                  </h2>
                </div>

                {currentQuestion?.questionType === 'mcq' ? (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((opt: string, i: number) => {
                      const prefix = ['A', 'B', 'C', 'D'][i];
                      return (
                        <button
                          key={i}
                          onClick={() => setAnswers({ ...answers, [currentQ]: prefix })}
                          className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${answers[currentQ] === prefix ? 'bg-[#00B4D8]/10 border-[#00B4D8]/40 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/[0.08]'}`}
                        >
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-black ${answers[currentQ] === prefix ? 'bg-[#00B4D8] border-[#00B4D8] text-white' : 'border-white/10'}`}>
                            {prefix}
                          </div>
                          <span className="text-sm font-medium">{opt.replace(/^[A-D]:\s*/, '')}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={answers[currentQ] || ''}
                    onChange={e => setAnswers({ ...answers, [currentQ]: e.target.value })}
                    placeholder="Type your answer here..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:border-[#00B4D8]/30 transition-all text-sm leading-relaxed"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="flex gap-2 overflow-x-auto pb-2 max-w-[300px]">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`w-8 h-8 rounded-lg text-[10px] font-black shrink-0 transition-all ${currentQ === i ? 'bg-[#00B4D8] text-white' : answers[i] ? 'bg-[#00B4D8]/20 text-[#00B4D8]' : 'bg-white/5 text-white/20 hover:bg-white/10'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <GradientButton 
                  variant="secondary" 
                  disabled={currentQ === 0}
                  onClick={() => setCurrentQ(prev => prev - 1)}
                  className="px-6 flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </GradientButton>
                
                {currentQ === questions.length - 1 ? (
                  <GradientButton 
                    className="px-8 bg-green-500 hover:bg-green-600 shadow-green-500/20"
                    onClick={handleSubmit}
                  >
                    Submit Exam <Send className="w-4 h-4 ml-2" />
                  </GradientButton>
                ) : (
                  <GradientButton 
                    className="px-6 flex items-center gap-2"
                    onClick={() => setCurrentQ(prev => prev + 1)}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </GradientButton>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Monitoring */}
        <div className="w-[400px] border-l border-white/5 p-8 overflow-y-auto bg-[#0D1117]">
          <div className="space-y-8">
            {/* Webcam */}
            <div className="aspect-video bg-black rounded-2xl border border-white/10 overflow-hidden relative">
               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
               <div className="absolute top-4 left-4 flex gap-2">
                  <div className="px-3 py-1 bg-[#00B4D8]/20 text-[#00B4D8] text-[8px] font-black uppercase tracking-widest rounded-full border border-[#00B4D8]/20 flex items-center gap-1.5 backdrop-blur-md">
                    <Monitor className="w-3 h-3" /> Live Monitor
                  </div>
               </div>

               {/* AI Status Overlay */}
               <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
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

               {/* Live AI Debug Panel (Temporary) */}
               <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-lg rounded-lg border border-white/10 p-2 pointer-events-none">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">AI Raw Data (Debug)</span>
                     <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${gaze.isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {gaze.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                   </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/80">
                     <div>Zone: <span className="text-indigo-400">{gaze.currentZone}</span></div>
                  </div>
               </div>
            </div>

            {/* Alert Feed */}
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-white/20">Recent Notifications</h3>
               {alerts.length > 0 ? alerts.map((alert, i) => (
                 <motion.div 
                   key={i} 
                   initial={{ x: 20, opacity: 0 }} 
                   animate={{ x: 0, opacity: 1 }}
                   className={`p-4 rounded-xl border flex items-start gap-3 ${alert.severity === 'high' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}
                 >
                   <div className={`mt-1 ${alert.severity === 'high' ? 'text-red-400' : 'text-white/40'}`}>
                     {alert.type === 'tab_switch' ? <Monitor className="w-4 h-4" /> : alert.type === 'gaze_away' ? <Eye className="w-4 h-4 text-red-500" /> : <ShieldAlert className="w-4 h-4" />}
                   </div>
                   <div>
                     <div className="text-xs font-bold text-white mb-0.5">{alert.message}</div>
                     <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{alert.time}</div>
                   </div>
                 </motion.div>
               )) : (
                 <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex items-center gap-3 text-white/40">
                   <ShieldAlert className="w-4 h-4" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">No violations detected</span>
                 </div>
               )}
            </div>

            {/* Tips */}
            <div className="p-6 bg-[#00B4D8]/5 border border-[#00B4D8]/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-4 text-[#00B4D8]">
                <Info className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-widest">Monitoring Tips</h4>
              </div>
              <ul className="space-y-3">
                <TipItem text="Stay centered in frame" />
                <TipItem text="Keep eyes on screen" />
                <TipItem text="Maintain quiet environment" />
                <TipItem text="Avoid switching tabs" />
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Warning Modal */}
      {showFullscreenWarning && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
          <GlassCard className="max-w-md w-full p-8 text-center border-red-500/30">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-display font-bold text-white mb-4">⚠ Please Return to Fullscreen</h2>
            <p className="text-sm text-white/40 mb-8 leading-relaxed">
              Exiting fullscreen has been flagged as a security violation. Please return to fullscreen mode immediately to continue your assessment.
            </p>
            <GradientButton 
              className="w-full py-4"
              onClick={() => {
                document.documentElement.requestFullscreen().catch(() => {});
                setShowFullscreenWarning(false);
              }}
            >
              Return to Fullscreen
            </GradientButton>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-[10px] font-bold text-white/60">
      <div className="w-1 h-1 rounded-full bg-[#00B4D8]" />
      {text}
    </li>
  );
}
