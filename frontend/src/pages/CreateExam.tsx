import React, { useState } from 'react';
import { GlassCard, GradientButton, PageHeader } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { Save, X, Plus, Trash2, BrainCircuit, Sparkles, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateExam() {
  const navigate = useNavigate();
  const [examName, setExamName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<any[]>([]);

  const addQuestion = (type: 'mcq' | 'essay') => {
    setQuestions([...questions, { 
      id: Date.now(), 
      type, 
      text: '', 
      options: type === 'mcq' ? ['', '', '', ''] : [] 
    }]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = () => {
    if (!examName || !date || !time) {
      toast.error('Please fill in all basic exam details.');
      return;
    }
    toast.success('Exam created successfully!');
    navigate('/instructor');
  };

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <PageHeader title="Create New Exam" subtitle="Design your assessment and set proctoring rules." />
          <div className="flex gap-4">
            <GradientButton variant="secondary" onClick={() => navigate('/instructor')}>
              Cancel
            </GradientButton>
            <GradientButton onClick={handleSave}>
              Save Exam
            </GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <GlassCard>
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <ClipboardIcon className="w-5 h-5 text-purple-400" />
                Exam Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/50 mb-2">Exam Title</label>
                  <input 
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="e.g., Advanced Calculus Final" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">Date</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-purple-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/50 mb-2">Start Time</label>
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-purple-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Question Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Question Bank</h2>
                <div className="flex gap-2">
                  <GradientButton variant="secondary" onClick={() => addQuestion('mcq')} className="text-xs py-1.5">
                    + MCQ
                  </GradientButton>
                  <GradientButton variant="secondary" onClick={() => addQuestion('essay')} className="text-xs py-1.5">
                    + Essay
                  </GradientButton>
                </div>
              </div>

              {questions.map((q, i) => (
                <GlassCard key={q.id} className="relative group">
                  <button 
                    onClick={() => removeQuestion(q.id)}
                    className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
                      Q{i + 1}
                    </span>
                    <span className="text-xs text-white/40 uppercase tracking-widest font-bold">
                      {q.type}
                    </span>
                  </div>
                  <textarea 
                    placeholder="Enter question text..."
                    className="w-full bg-transparent border-none text-lg text-white outline-none resize-none placeholder:text-white/10"
                    rows={2}
                  />
                  {q.type === 'mcq' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt: any, oi: number) => (
                        <div key={oi} className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-3">
                          <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center text-[10px] text-white/40">
                            {String.fromCharCode(65 + oi)}
                          </div>
                          <input 
                            placeholder="Option..." 
                            className="bg-transparent border-none text-sm text-white/70 outline-none w-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-white/20">No questions added yet. Use the buttons above or try AI generation.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <GlassCard className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">AI Assistant</h3>
              </div>
              <p className="text-sm text-white/50 mb-4">
                Describe your topic and we'll generate professional assessment questions for you.
              </p>
              <textarea 
                placeholder="e.g., Quantum Mechanics basics for undergraduate students..."
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-sm text-white outline-none focus:border-indigo-500/50 mb-4"
                rows={3}
              />
              <GradientButton className="w-full flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" /> Generate Questions
              </GradientButton>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold text-white mb-4">Exam Configuration</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Duration (min)</span>
                  <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-right text-sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Lockdown Mode</span>
                  <div className="w-10 h-5 bg-indigo-500 rounded-full relative">
                    <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClipboardIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
  );
}
