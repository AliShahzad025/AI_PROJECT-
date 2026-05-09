import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, StatusBadge, StatCard } from '../components/UI';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  User, Mail, Shield, Calendar, Clock, 
  Award, ShieldAlert, FileText, CheckCircle,
  Hash, MapPin
} from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAppAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch submissions
    const unsubSub = onSnapshot(
      query(collection(db, 'submissions'), where('studentId', '==', user.uid), orderBy('timestamp', 'desc')), 
      (snapshot) => {
        setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    // Fetch violations
    const unsubAlerts = onSnapshot(
      query(collection(db, 'monitoringAlerts'), where('studentId', '==', user.uid)), 
      (snapshot) => {
        setAlerts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubSub();
      unsubAlerts();
    };
  }, [user]);

  const averageTrustScore = submissions.length > 0 
    ? Math.round(submissions.reduce((acc, s) => acc + (s.trustScore || 0), 0) / submissions.length)
    : 100;

  if (!user) return null;

  return (
    <Layout role="student">
      <PageHeader 
        title="My Profile" 
        subtitle="Manage your personal details and review your academic standing." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Personal Details */}
        <div className="lg:col-span-4 space-y-8">
          <GlassCard className="p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00B4D8] to-transparent opacity-50" />
            
            <div className="w-24 h-24 bg-gradient-to-br from-[#00B4D8]/20 to-[#0077B6]/20 border border-[#00B4D8]/30 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-display font-black text-white shadow-2xl">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            
            <h3 className="text-2xl font-display font-bold text-white mb-1">{user.name}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00B4D8] mb-6">Institutional {user.role}</p>
            
            <div className="space-y-4 text-left border-t border-white/5 pt-6">
              <DetailItem icon={<Mail className="w-4 h-4" />} label="Email Address" value={user.email} />
              <DetailItem icon={<Hash className="w-4 h-4" />} label="Student ID" value={user.uid.slice(0, 8).toUpperCase()} />
              <DetailItem icon={<Calendar className="w-4 h-4" />} label="Member Since" value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'} />
              <DetailItem icon={<Shield className="w-4 h-4" />} label="Account Status" value={<StatusBadge status="Verified" variant="success" />} />
            </div>
          </GlassCard>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
             <StatMini card label="Exams Taken" value={submissions.length} icon={<FileText className="text-blue-400" />} />
             <StatMini card label="Violations" value={alerts.length} icon={<ShieldAlert className="text-red-400" />} />
          </div>

          <GlassCard className="p-6">
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-white/40">Overall Trust Score</h4>
                <Award className="w-4 h-4 text-yellow-400" />
             </div>
             <div className="flex items-end gap-2 mb-4">
                <span className="text-4xl font-display font-black text-white">{averageTrustScore}%</span>
                <span className="text-xs font-bold text-white/30 mb-1.5">Average</span>
             </div>
             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${averageTrustScore > 80 ? 'bg-green-500' : averageTrustScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                  style={{ width: `${averageTrustScore}%` }} 
                />
             </div>
          </GlassCard>
        </div>

        {/* Right Column: History & Details */}
        <div className="lg:col-span-8 space-y-8">
          {/* Exam History */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#00B4D8]" />
                <h3 className="text-lg font-display font-bold text-white">Recent Exam Activity</h3>
              </div>
            </div>
            
            <div className="divide-y divide-white/5">
              {submissions.length > 0 ? submissions.map((sub) => (
                <div key={sub.id} className="p-6 hover:bg-white/[0.01] transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
                        {sub.timestamp?.toDate ? sub.timestamp.toDate().toLocaleString('default', { month: 'short' }) : '---'}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {sub.timestamp?.toDate ? sub.timestamp.toDate().getDate() : '--'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">{sub.examName || 'Final Assessment'}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        <span>Score: {sub.trustScore}%</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>{sub.incidents?.length || 0} Incidents</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge 
                      status={sub.trustScore > 70 ? 'Passed' : 'Review'} 
                      variant={sub.trustScore > 70 ? 'success' : 'warning'} 
                    />
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center">
                  <p className="text-white/20 text-sm italic">No exam history recorded yet.</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Violations Summary */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-display font-bold text-white">Security Violations</h3>
              </div>
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{alerts.length} Total</span>
            </div>

            <div className="space-y-4">
              {alerts.length > 0 ? alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.severity === 'high' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-white/80">{alert.alertType.replace('_', ' ')}</span>
                      <span className="text-[10px] text-white/20 font-bold">{alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">{alert.description}</p>
                  </div>
                </div>
              )) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-green-400/80 font-medium">Your record is perfectly clean! No violations detected.</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
}

function DetailItem({ icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-white/20">{icon}</div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-0.5">{label}</div>
        <div className="text-xs font-bold text-white/70">{value}</div>
      </div>
    </div>
  );
}

function StatMini({ label, value, icon, card = false }: { label: string, value: any, icon: any, card?: boolean }) {
  const content = (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xl font-display font-black text-white leading-none mb-1">{value}</div>
        <div className="text-[9px] font-black uppercase tracking-tighter text-white/30">{label}</div>
      </div>
    </div>
  );

  if (card) {
    return <GlassCard className="p-4">{content}</GlassCard>;
  }
  return content;
}
