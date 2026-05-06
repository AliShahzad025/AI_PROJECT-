import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, ClipboardList, ListOrdered, Save, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function EditExam() {
  const { examId } = useParams();
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    maxStudents: 100,
    status: 'scheduled'
  });

  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!examId) return;
    const fetchExam = async () => {
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const data = snap.data();
          setExamData({
            title: data.title || '',
            description: data.description || '',
            date: data.date || '',
            time: data.time || '',
            durationMinutes: data.durationMinutes || 60,
            maxStudents: data.maxStudents || 100,
            status: data.status || 'scheduled'
          });
          setQuestions(data.questions || []);
        } else {
          toast.error("Exam not found");
          navigate('/instructor/exams');
        }
      } catch (err) {
        toast.error("Failed to load exam");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId]);

  const addQuestion = () => {
    setQuestions([...questions, {
      questionText: '',
      questionType: 'mcq',
      options: ['', '', '', ''],
      correctAnswer: 'A'
    }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async () => {
    if (!examData.title || !examData.date || !examData.time) {
      toast.error("Please fill in all exam details");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'exams', examId!), {
        ...examData,
        questions,
        updatedAt: serverTimestamp()
      });
      toast.success("Exam updated successfully!");
      navigate('/instructor/exams');
    } catch (err) {
      toast.error("Failed to update exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <Layout role="instructor">
      <div className="flex justify-between items-start mb-8">
        <PageHeader 
          title={`Edit: ${examData.title}`} 
          subtitle="Update exam details, questions, and scheduling." 
        />
        <div className="flex gap-3">
          <GradientButton variant="secondary" onClick={() => navigate('/instructor/exams')}>Cancel</GradientButton>
          <GradientButton 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </GradientButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left - Details */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard className="p-8">
             <h3 className="text-sm font-black uppercase tracking-widest text-white/20 mb-6 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> General Info
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Exam Title</label>
                <input 
                  value={examData.title}
                  onChange={e => setExamData({ ...examData, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Status</label>
                <select 
                  value={examData.status}
                  onChange={e => setExamData({ ...examData, status: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#00B4D8] font-bold outline-none"
                >
                  <option value="scheduled" className="bg-[#0D1117]">Scheduled</option>
                  <option value="active" className="bg-[#0D1117]">Active (Live)</option>
                  <option value="completed" className="bg-[#0D1117]">Completed</option>
                  <option value="cancelled" className="bg-[#0D1117]">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Date</label>
                  <input 
                    type="date"
                    value={examData.date}
                    onChange={e => setExamData({ ...examData, date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Time</label>
                  <input 
                    type="time"
                    value={examData.time}
                    onChange={e => setExamData({ ...examData, time: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Duration (min)</label>
                  <input 
                    type="number"
                    value={examData.durationMinutes}
                    onChange={e => setExamData({ ...examData, durationMinutes: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Max Students</label>
                  <input 
                    type="number"
                    value={examData.maxStudents}
                    onChange={e => setExamData({ ...examData, maxStudents: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right - Questions */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
              <ListOrdered className="w-4 h-4" /> Questions Bank ({questions.length})
            </h3>
            <button 
              onClick={addQuestion}
              className="px-4 py-2 bg-[#00B4D8]/10 text-[#00B4D8] text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#00B4D8]/20 hover:bg-[#00B4D8]/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-3 h-3" /> Add Question
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <GlassCard key={qIndex} className="p-8 group relative">
                <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => removeQuestion(qIndex)} className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-white/30 shrink-0">
                    {qIndex + 1}
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <textarea 
                        required
                        value={q.questionText}
                        onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                        placeholder="Enter question content..."
                      />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                         <div className="flex p-1 bg-white/5 rounded-xl w-fit border border-white/5">
                            {['mcq', 'short_answer'].map(type => (
                              <button
                                key={type}
                                onClick={() => updateQuestion(qIndex, 'questionType', type)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${q.questionType === type ? 'bg-[#00B4D8] text-white' : 'text-white/30 hover:text-white'}`}
                              >
                                {type.replace('_', ' ')}
                              </button>
                            ))}
                         </div>
                      </div>
                      {q.questionType === 'mcq' && (
                        <div className="flex-1">
                          <select 
                            value={q.correctAnswer}
                            onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#00B4D8] font-bold outline-none"
                          >
                            {['A', 'B', 'C', 'D'].map(opt => <option key={opt} value={opt} className="bg-[#0D1117]">Option {opt}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {q.questionType === 'mcq' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['A', 'B', 'C', 'D'].map((opt, oIndex) => (
                          <div key={opt} className="relative">
                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black ${q.correctAnswer === opt ? 'text-[#00B4D8]' : 'text-white/20'}`}>{opt}</span>
                            <input 
                              value={q.options[oIndex]}
                              onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                              className={`w-full bg-white/5 border rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none transition-all ${q.correctAnswer === opt ? 'border-[#00B4D8]/30' : 'border-white/5'}`}
                              placeholder={`Option ${opt}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
