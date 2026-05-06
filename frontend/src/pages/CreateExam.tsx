import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, ClipboardList, ListOrdered, Save } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function CreateExam() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    durationMinutes: 60,
    maxStudents: 100
  });

  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    // Check if coming from AI Generator
    if (location.state?.generatedQuestions) {
      setQuestions(location.state.generatedQuestions);
      setStep(2); // Start at questions step if pre-loaded
    }
  }, [location.state]);

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
      setStep(1);
      return;
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'exams'), {
        ...examData,
        questions,
        instructorId: user.uid,
        instructorName: user.name,
        status: 'scheduled',
        enrolledStudents: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Exam created successfully!");
      navigate('/instructor/exams');
    } catch (err) {
      toast.error("Failed to create exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout role="instructor">
      <PageHeader 
        title="Create New Exam" 
        subtitle="Design your assessment and set proctoring parameters." 
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-10 overflow-x-auto pb-2">
        <StepIndicator active={step >= 1} current={step === 1} number={1} label="Exam Details" icon={<ClipboardList className="w-4 h-4" />} />
        <div className="h-[1px] w-12 bg-white/5" />
        <StepIndicator active={step >= 2} current={step === 2} number={2} label="Questions" icon={<ListOrdered className="w-4 h-4" />} />
        <div className="h-[1px] w-12 bg-white/5" />
        <StepIndicator active={step >= 3} current={step === 3} number={3} label="Review" icon={<Check className="w-4 h-4" />} />
      </div>

      <div className="max-w-4xl">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <GlassCard className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Exam Title</label>
                  <input 
                    required
                    value={examData.title}
                    onChange={e => setExamData({ ...examData, title: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                    placeholder="e.g. Midterm Mathematics"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Description</label>
                  <textarea 
                    value={examData.description}
                    onChange={e => setExamData({ ...examData, description: e.target.value })}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                    placeholder="Describe the exam scope and instructions..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Scheduled Date</label>
                  <input 
                    type="date"
                    required
                    value={examData.date}
                    onChange={e => setExamData({ ...examData, date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Start Time</label>
                  <input 
                    type="time"
                    required
                    value={examData.time}
                    onChange={e => setExamData({ ...examData, time: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Duration (Minutes)</label>
                  <input 
                    type="number"
                    min="10" max="480"
                    value={examData.durationMinutes}
                    onChange={e => setExamData({ ...examData, durationMinutes: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Max Students</label>
                  <input 
                    type="number"
                    value={examData.maxStudents}
                    onChange={e => setExamData({ ...examData, maxStudents: parseInt(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-10">
                <GradientButton className="px-10 py-4 flex items-center gap-2" onClick={() => setStep(2)}>
                  Next Step <ArrowRight className="w-4 h-4" />
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-display font-bold text-white">Question Bank</h2>
               <div className="px-3 py-1 bg-[#00B4D8]/10 text-[#00B4D8] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#00B4D8]/20">
                {questions.length} questions
              </div>
            </div>

            {questions.map((q, qIndex) => (
              <GlassCard key={qIndex} className="p-8 relative group">
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Question Text</label>
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
                         <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Type</label>
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
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Correct Answer</label>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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

            <button 
              onClick={addQuestion}
              className="w-full py-6 bg-white/5 border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 text-white/40 hover:bg-white/[0.08] hover:border-[#00B4D8]/30 hover:text-[#00B4D8] transition-all group"
            >
              <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Add New Question</span>
            </button>

            <div className="flex justify-between items-center pt-8">
              <GradientButton variant="secondary" className="px-10 py-4 flex items-center gap-2" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" /> Exam Details
              </GradientButton>
              <GradientButton className="px-10 py-4 flex items-center gap-2" onClick={() => setStep(3)}>
                Review Exam <ArrowRight className="w-4 h-4" />
              </GradientButton>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <GlassCard className="p-8">
              <h3 className="text-xl font-display font-bold text-white mb-6">Final Review</h3>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Title</label>
                   <p className="text-lg font-bold text-white">{examData.title}</p>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Status</label>
                   <StatusBadge status="Ready to Launch" variant="success" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Date & Time</label>
                   <p className="text-sm text-white/60">{examData.date} at {examData.time}</p>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-1">Parameters</label>
                   <p className="text-sm text-white/60">{examData.durationMinutes} minutes • {examData.maxStudents} Students</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#00B4D8]/10 flex items-center justify-center text-[#00B4D8]">
                    <ListOrdered className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{questions.length} Questions Added</div>
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Multiple choice and short answer mixed</div>
                  </div>
                </div>
                <button onClick={() => setStep(2)} className="text-[10px] font-black uppercase tracking-widest text-[#00B4D8] hover:underline">Edit Questions</button>
              </div>

              <div className="flex justify-between items-center pt-10 mt-10 border-t border-white/5">
                <GradientButton variant="secondary" className="px-10 py-4 flex items-center gap-2" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4" /> Back
                </GradientButton>
                <GradientButton 
                  className="px-10 py-4 flex items-center gap-2" 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : <><Save className="w-4 h-4" /> Confirm & Create Exam</>}
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}

function StepIndicator({ number, label, active, current, icon }: any) {
  return (
    <div className={`flex items-center gap-3 whitespace-nowrap ${active ? 'opacity-100' : 'opacity-30'}`}>
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${current ? 'bg-[#00B4D8] border-[#00B4D8] text-white shadow-lg' : active ? 'bg-[#00B4D8]/10 border-[#00B4D8]/20 text-[#00B4D8]' : 'bg-white/5 border-white/10 text-white/20'}`}>
        {current ? icon : (active ? <Check className="w-4 h-4" /> : number)}
      </div>
      <div>
        <div className={`text-[10px] font-black uppercase tracking-widest ${current ? 'text-[#00B4D8]' : 'text-white/40'}`}>Step {number}</div>
        <div className={`text-xs font-bold ${current ? 'text-white' : 'text-white/40'}`}>{label}</div>
      </div>
    </div>
  );
}
