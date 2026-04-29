import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, ShieldCheck, ArrowRight, Award, AlertTriangle, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [incidents, setIncidents] = useState<number>(() => {
    if (location.state?.incidentCount !== undefined) return location.state.incidentCount;
    const stored = localStorage.getItem('examIncidents');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Filter out meta-events like Identity Verified so they don't count as flags
      return parsed.filter((i: any) => !i.type.includes('Identity Verified')).length;
    }
    return 0;
  });

  useEffect(() => {
    // Only trigger confetti if 0 incidents
    if (incidents > 0) return;
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#4ade80', '#a855f7']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#4ade80', '#a855f7']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="bg-[#0A0A0C] border border-white/10 rounded-3xl p-10 md:p-14 max-w-lg w-full text-center relative z-10 shadow-2xl"
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 relative ${incidents === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            {incidents === 0 ? (
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            ) : (
              <ShieldAlert className="w-10 h-10 text-red-400" />
            )}
          </motion.div>
          <div className={`absolute inset-0 border-2 rounded-full animate-ping ${incidents === 0 ? 'border-green-500/20' : 'border-red-500/20'}`} />
        </div>

        <h1 className="text-3xl font-display font-bold mb-4">Exam Submitted Successfully!</h1>
        <p className="text-white/50 mb-8 leading-relaxed">
          Your answers and proctoring session data for Exam <span className="text-white/80 font-mono">{id}</span> have been securely encrypted and uploaded for review.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className={`bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 ${incidents > 0 && 'border-red-500/20 bg-red-500/5'}`}>
             {incidents === 0 ? <ShieldCheck className="w-6 h-6 text-indigo-400" /> : <AlertTriangle className="w-6 h-6 text-red-400" />}
             <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Integrity Check</span>
             {incidents === 0 ? (
               <span className="text-sm font-bold text-green-400">Passed</span>
             ) : (
               <span className="text-sm font-bold text-red-400">{incidents} Flags</span>
             )}
          </div>
          <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
             <Award className="w-6 h-6 text-purple-400" />
             <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Status</span>
             <span className="text-sm font-bold text-white/90">Pending Grade</span>
          </div>
        </div>

        <Link 
          to="/student"
          className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 transition-colors py-3.5 rounded-xl font-medium"
        >
          Return to Dashboard <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}
