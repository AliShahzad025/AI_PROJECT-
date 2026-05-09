import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { useAppAuth } from '../lib/auth';
import { toast } from 'sonner';
import { Check, X, Clock, User, ClipboardList, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function EnrollmentRequests() {
  const { user } = useAppAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (!user) return;

    // Fetch enrollment requests for this instructor's exams
    const q = query(collection(db, 'enrollmentRequests'), where('instructorId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleApprove = async (req: any) => {
    try {
      const batch = writeBatch(db);
      
      // Update request status
      batch.update(doc(db, 'enrollmentRequests', req.id), {
        status: 'approved',
        reviewedAt: serverTimestamp()
      });

      // Add student to exam
      batch.update(doc(db, 'exams', req.examId), {
        enrolledStudents: arrayUnion(req.studentId)
      });

      await batch.commit();
      toast.success(`Approved ${req.studentName} for ${req.examName}`);
    } catch (err) {
      toast.error("Failed to approve enrollment");
    }
  };

  const handleReject = async (req: any) => {
    try {
      await updateDoc(doc(db, 'enrollmentRequests', req.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp()
      });
      toast.success(`Rejected ${req.studentName} for ${req.examName}`);
    } catch (err) {
      toast.error("Failed to reject enrollment");
    }
  };

  const filteredRequests = requests.filter(r => r.status === activeTab);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <Layout role="instructor">
      <PageHeader 
        title="Enrollment Management" 
        subtitle="Review and approve student applications for your exams." 
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
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{req.studentName}</h4>
                    <p className="text-[10px] text-white/30">{req.studentEmail}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Applying For</label>
                    <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                      <ClipboardList className="w-3.5 h-3.5 text-[#00B4D8]" />
                      {req.examName}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    Applied: {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleDateString() : 'Just now'}
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
                      onClick={() => handleReject(req)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}

                {req.status !== 'pending' && (
                  <div className="pt-4 border-t border-white/5 text-center">
                    <StatusBadge 
                      status={req.status} 
                      variant={req.status === 'approved' ? 'success' : 'danger'} 
                    />
                    <div className="text-[10px] text-white/20 mt-2 font-bold uppercase">
                      Reviewed on {req.reviewedAt?.toDate ? req.reviewedAt.toDate().toLocaleDateString() : 'Pending'}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/5 border border-white/10 border-dashed rounded-3xl">
              <AlertCircle className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/40 font-medium">No {activeTab} enrollment requests</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
