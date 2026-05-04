import React, { useState, useEffect } from 'react';
import { GlassCard, GradientButton, PageHeader } from '../components/UI';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, User, Clock, Shield, CheckCircle, XCircle, FileText, Image as ImageIcon } from 'lucide-react';

export default function ExamReview() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    // Mock session data
    setSessions([
      { id: 's1', student: 'Alice Johnson', trustScore: 98, alerts: 0, status: 'completed', time: '45m' },
      { id: 's2', student: 'Bob Wilson', trustScore: 42, alerts: 12, status: 'flagged', time: '38m' },
      { id: 's3', student: 'Charlie Davis', trustScore: 85, alerts: 2, status: 'completed', time: '50m' },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader 
          title="Exam Review" 
          subtitle="Review student submissions and AI-detected incidents."
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-white">Student Submissions</h2>
              <div className="flex gap-2">
                 <GradientButton variant="secondary" className="text-xs">Export Report</GradientButton>
              </div>
            </div>

            {sessions.map((session) => (
              <GlassCard key={session.id} className="group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white font-bold">
                      {session.student.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">{session.student}</h3>
                      <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.time}</span>
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Trust: {session.trustScore}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={`text-sm font-bold ${session.status === 'flagged' ? 'text-red-400' : 'text-green-400'}`}>
                        {session.status.toUpperCase()}
                      </div>
                      <div className="text-xs text-white/30">{session.alerts} incidents detected</div>
                    </div>
                    <GradientButton 
                      variant={session.status === 'flagged' ? 'danger' : 'secondary'}
                      onClick={() => navigate(`/admin/report/${session.id}`)} // Reusing report page
                    >
                      View Logs
                    </GradientButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Quick Stats</h2>
            <GlassCard>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/40">Total Students</span>
                  <span className="text-lg font-bold text-white">124</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/40">Flagged Cases</span>
                  <span className="text-lg font-bold text-red-400">12</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-sm text-white/40">Avg Trust Score</span>
                  <span className="text-lg font-bold text-indigo-400">88%</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-red-400">Security Alerts</h3>
              </div>
              <p className="text-xs text-red-400/60 leading-relaxed">
                4 sessions were automatically terminated due to high-severity violations (multiple faces or browser exit).
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
