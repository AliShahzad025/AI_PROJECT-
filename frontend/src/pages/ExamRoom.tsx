import { useState, useEffect, useRef, SyntheticEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { submitExam, getExamById, WS_URL } from '../lib/api';
import { motion } from 'motion/react';
import { Clock, ShieldCheck, Video, Send, ShieldAlert, Camera, Shield, Check, Mic, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ExamRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAppAuth();

  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [incidents, setIncidents] = useState<{ time: string, type: string }[]>([]);
  const [isAiConnected, setIsAiConnected] = useState(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WebSocket for AI Monitoring
  const socketRef = useRef<WebSocket | null>(null);

  const [verificationStage, setVerificationStage] = useState<'idle' | 'verifying' | 'completed'>('idle');
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Browser Lockdown
  useEffect(() => {
    const requestFS = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => { });
      }
    };
    requestFS();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIncidents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: "Tab Switched / Out of Focus" }]);
        toast.error("Warning: Tab switching is prohibited!");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIncidents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: "Exited Fullscreen" }]);
        toast.error("Warning: You left fullscreen mode!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, []);

  // WebSocket Connection & Frame Sending
  useEffect(() => {
    if (!user || verificationStage !== 'completed' || isSubmitting || !stream) return;

    const socket = new WebSocket(`${WS_URL}/monitor/${id}/${user.uid}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("AI Monitor Connected");
      setIsAiConnected(true);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'alert') {
        setAiWarning(data.message);
        setIncidents(prev => [...prev, { time: new Date().toLocaleTimeString(), type: data.message }]);
        toast.error(data.message);
      }
    };

    socket.onclose = () => {
      console.log("AI Monitor Disconnected");
      setIsAiConnected(false);
    };

    // Frame Sender Loop
    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = 320; // Reduced size for bandwidth
          canvas.height = 240;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const base64Image = canvas.toDataURL('image/jpeg', 0.5);
          socket.send(JSON.stringify({ image: base64Image }));
        }
      }
    }, 1000); // Send 1 frame per second

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [user, id, verificationStage, isSubmitting, stream]);

  // Audio Monitoring
  useEffect(() => {
    if (!stream || verificationStage !== 'completed') return;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    analyserRef.current = analyser;
    audioContextRef.current = context;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const average = sum / bufferLength;

      if (Math.abs(audioLevelRef.current - average) > 2) {
        audioLevelRef.current = average;
        setAudioLevel(average);
      }
    };

    const audioInterval = setInterval(checkAudio, 100);

    return () => {
      clearInterval(audioInterval);
      context.close();
      analyserRef.current = null;
      audioContextRef.current = null;
    };
  }, [stream, verificationStage]);

  // Fetch exam data
  useEffect(() => {
    if (!id) return;
    getExamById(id).then(exam => {
      if (!exam) { toast.error('Exam not found.'); navigate('/student'); return; }
      setExamData(exam);
    }).catch(() => { toast.error('Failed to load exam.'); navigate('/student'); });
  }, [id]);

  const questions: any[] = examData?.questions || [];

  // Request camera access
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch (err) {
        toast.error("Camera access required.");
      }
    };
    initCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    if (stream) stream.getTracks().forEach(track => track.stop());

    try {
      const trustScore = Math.max(0, 100 - incidents.length * 15);
      await submitExam(id || 'unknown', user.uid, user.name, user.email, answers, incidents, trustScore);
      localStorage.setItem('examIncidents', JSON.stringify(incidents));
      navigate(`/results/${id}`, { state: { incidentCount: incidents.length } });
    } catch (err) {
      toast.error("Submission failed. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  if (loading) return null;
  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans relative overflow-hidden flex flex-col select-none"
      onCopy={e => e.preventDefault()} onPaste={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}>
      
      <canvas ref={canvasRef} className="hidden" />

      {verificationStage !== 'completed' && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full bg-[#0A0A0C] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-display font-bold mb-8 text-center">Identity Verification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm"><Camera className="text-indigo-400" /> Camera Ready</div>
                  <div className="flex items-center gap-3 text-sm"><Shield className="text-indigo-400" /> AI Monitor Ready</div>
               </div>
               <div className="aspect-square bg-black rounded-2xl border border-white/10 overflow-hidden relative">
                  <video autoPlay playsInline muted ref={v => { if (v) v.srcObject = stream; }} className="w-full h-full object-cover transform -scale-x-100" />
                  {verificationPhoto && <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center"><Check className="text-white w-12 h-12" /></div>}
               </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => {
                const video = videoRef.current;
                const canvas = document.createElement('canvas');
                if (video) {
                  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
                  canvas.getContext('2d')?.drawImage(video, 0, 0);
                  setVerificationPhoto(canvas.toDataURL('image/jpeg'));
                }
              }} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold">Capture Snap</button>
              <button disabled={!verificationPhoto} onClick={() => setVerificationStage('completed')}
                className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold disabled:opacity-50">Start Exam</button>
            </div>
          </motion.div>
        </div>
      )}

      <nav className="h-16 border-b border-white/5 bg-[#0A0A0C] flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span className="font-display font-medium">ProctorAI Secure Session</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="font-mono text-sm">{formatTime(timeLeft)}</span>
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 px-4 py-1.5 rounded-lg text-sm font-medium">Submit</button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 pb-32">
        <h1 className="text-3xl font-display font-bold mb-8">{examData?.name || 'Exam'}</h1>
        <div className="space-y-8">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-medium mb-4">{index + 1}. {q.text}</h3>
              {q.type === 'textarea' ? (
                <textarea className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none h-32"
                  value={answers[q.id] || ""} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
              ) : (
                <div className="space-y-2">
                  {q.options?.map((opt: string) => (
                    <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${answers[q.id] === opt ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5'}`}>
                      <input type="radio" className="hidden" checked={answers[q.id] === opt} onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-6 right-6 w-64 aspect-video bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl z-50">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
        {aiWarning && <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center text-center p-4 text-xs font-bold uppercase">{aiWarning}</div>}
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] uppercase font-bold text-white/50">{isAiConnected ? 'AI ACTIVE' : 'AI OFFLINE'}</span>
        </div>
      </div>
    </div>
  );
}
