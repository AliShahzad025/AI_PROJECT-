import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { FileText, Plus, Eye, Edit, Trash2, Calendar, Clock, Users, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export default function ManageExams() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'exams'), where('instructorId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setExams(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this exam? All student submissions and alerts will be preserved but the exam will no longer be accessible.")) return;
    try {
      await deleteDoc(doc(db, 'exams', id));
      toast.success("Exam deleted successfully");
    } catch (err) {
      toast.error("Failed to delete exam");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'exams', id), { 
        status: newStatus.toLowerCase(),
        updatedAt: serverTimestamp()
      });
      toast.success(`Exam marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const filteredExams = activeTab === 'All' 
    ? exams 
    : exams.filter(e => e.status.toLowerCase() === activeTab.toLowerCase());

  return (
    <Layout role="instructor">
      <div className="flex justify-between items-start mb-8">
        <PageHeader 
          title="Manage Exams" 
          subtitle="Create, edit, and monitor your assessments." 
        />
        <GradientButton className="flex items-center gap-2" onClick={() => navigate('/instructor/exams/create')}>
          <Plus className="w-4 h-4" /> Create New Exam
        </GradientButton>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-2xl w-fit">
        {['All', 'Scheduled', 'Active', 'Completed', 'Cancelled'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#00B4D8] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Exam Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Scheduled Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Duration</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Students</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredExams.length > 0 && filteredExams.map(exam => (
                <tr key={exam.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white mb-0.5">{exam.title || exam.name}</div>
                    <div className="text-[10px] text-white/30 font-medium">{exam.questions?.length || 0} Questions</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Calendar className="w-3.5 h-3.5" />
                      {exam.date || (exam.scheduledDate?.toDate().toLocaleDateString())}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Clock className="w-3.5 h-3.5" />
                      {exam.duration || exam.durationMinutes} min
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={exam.status}
                      onChange={(e) => updateStatus(exam.id, e.target.value)}
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border outline-none bg-transparent transition-all ${
                        exam.status === 'active' ? 'border-red-500/20 text-red-400 bg-red-500/5' : 
                        exam.status === 'completed' ? 'border-green-500/20 text-green-400 bg-green-500/5' : 
                        'border-[#00B4D8]/20 text-[#00B4D8] bg-[#00B4D8]/5'
                      }`}
                    >
                      <option value="scheduled" className="bg-[#0D1117]">Scheduled</option>
                      <option value="active" className="bg-[#0D1117]">Active</option>
                      <option value="completed" className="bg-[#0D1117]">Completed</option>
                      <option value="cancelled" className="bg-[#0D1117]">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Users className="w-3.5 h-3.5" />
                      {exam.enrolledStudents?.length || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/instructor/exams/${exam.id}/review`)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-[#00B4D8] hover:border-[#00B4D8]/20 transition-all"
                        title="View Review"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => navigate(`/instructor/exams/${exam.id}/edit`)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all"
                        title="Edit Exam"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        title="Delete Exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExams.length === 0 && !loading && (
            <div className="py-20 text-center">
              <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-sm font-medium">No {activeTab.toLowerCase()} exams found</p>
            </div>
          )}
        </div>
      </GlassCard>
    </Layout>
  );
}
