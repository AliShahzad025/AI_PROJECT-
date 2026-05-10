import React from 'react';
import { Layout } from '../components/Layout';
import { GlassCard, GradientButton } from '../components/UI';
import { CheckCircle2, ShieldCheck, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

export default function ExamCompleted() {
  const navigate = useNavigate();
  const location = useLocation();
  const { examId, violationCount, score } = location.state || {};

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <GlassCard className="p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00B4D8] via-green-500 to-[#00B4D8]" />
          
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 relative">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
          </div>

          <h1 className="text-3xl font-display font-black text-white mb-4">Exam Submitted Successfully!</h1>
          <p className="text-sm text-white/40 mb-10 leading-relaxed">
            Your responses have been securely recorded and are now under review. Results will be published by your instructor soon.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 text-left space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Status</span>
              <StatusBadge status="Under Review" variant="accent" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Security Violations</span>
              <span className={`text-xs font-bold ${violationCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {violationCount || 0} violations recorded
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Total Score</span>
              <span className="text-sm font-black text-white">
                {score !== undefined ? `${score} Points` : 'Grading...'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <GradientButton onClick={() => navigate('/student/violations')} className="w-full py-4 flex items-center justify-center gap-2">
              View My Violations <ArrowRight className="w-4 h-4" />
            </GradientButton>
            <GradientButton variant="secondary" onClick={() => navigate('/student')} className="w-full py-4 flex items-center justify-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status, variant }: any) {
  const variants: any = {
    accent: 'bg-[#00B4D8]/10 text-[#00B4D8] border-[#00B4D8]/20',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${variants[variant]}`}>
      {status}
    </span>
  );
}
