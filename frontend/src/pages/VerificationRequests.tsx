import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function VerificationRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'verificationRequests'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (req: any) => {
    try {
      const batch = writeBatch(db);
      
      // Update request status
      batch.update(doc(db, 'verificationRequests', req.id), {
        status: 'approved',
        reviewedAt: serverTimestamp()
      });

      // Update user doc
      batch.update(doc(db, 'users', req.uid), {
        isActive: true,
        role: req.requestedRole,
        isVerified: true
      });

      await batch.commit();
      toast.success("User approved and activated successfully!");
    } catch (err) {
      toast.error("Failed to approve user");
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectionReason.trim()) return;
    const req = requests.find(r => r.id === showRejectModal);
    
    try {
      const batch = writeBatch(db);
      
      // Update request status
      batch.update(doc(db, 'verificationRequests', req.id), {
        status: 'rejected',
        rejectionReason,
        reviewedAt: serverTimestamp()
      });

      // Ensure user remains inactive
      batch.update(doc(db, 'users', req.uid), {
        isActive: false,
        isVerified: false
      });

      await batch.commit();
      setShowRejectModal(null);
      setRejectionReason('');
      toast.success("User registration rejected");
    } catch (err) {
      toast.error("Failed to reject user");
    }
  };

  const filteredRequests = requests.filter(r => r.status === activeTab);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Layout role="admin">
      <PageHeader 
        title="Verification Requests" 
        subtitle="Review and approve new institutional account registrations." 
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl w-fit">
        {(['pending', 'approved', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-[#00B4D8] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            {tab}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredRequests.length > 0 ? filteredRequests.map(req => (
            <motion.div
              key={req.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <GlassCard className="h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-[#00B4D8]">
                    {(req.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{req.displayName}</h4>
                    <p className="text-[10px] text-white/30">{req.email}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Requested Role</label>
                    <StatusBadge status={req.requestedRole} variant="accent" />
                  </div>
                  
                  {req.additionalInfo && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Additional Info</label>
                      <p className="text-xs text-white/60 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                        {req.additionalInfo}
                      </p>
                    </div>
                  )}

                  {req.status === 'rejected' && req.rejectionReason && (
                    <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                      <label className="text-[10px] font-black uppercase tracking-widest text-red-400/50 block mb-1">Rejection Reason</label>
                      <p className="text-xs text-red-400/80">{req.rejectionReason}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    Submitted: {req.submittedAt?.toDate ? req.submittedAt.toDate().toLocaleDateString() : 'Pending'}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => handleApprove(req)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold uppercase tracking-widest hover:bg-green-500/20 transition-all"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button 
                      onClick={() => setShowRejectModal(req.id)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/5 border border-white/10 border-dashed rounded-3xl">
              <AlertCircle className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/40 font-medium">No {activeTab} requests found</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <GlassCard className="p-8 shadow-2xl">
              <h3 className="text-xl font-display font-bold text-white mb-2">Reject Request</h3>
              <p className="text-sm text-white/40 mb-6">Please provide a reason for rejecting this institutional account.</p>
              
              <textarea 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid institutional email, insufficient information..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-red-500/30 transition-all mb-6"
              />

              <div className="flex gap-4">
                <GradientButton variant="secondary" className="flex-1" onClick={() => setShowRejectModal(null)}>Cancel</GradientButton>
                <GradientButton variant="danger" className="flex-1" onClick={handleReject}>Reject User</GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
