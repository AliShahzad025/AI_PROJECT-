import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { Sparkles, ArrowRight, Trash2, Edit2, RotateCcw, BrainCircuit, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// NOTE: In a production app, the API key should never be exposed in the frontend.
// It should be handled by a secure backend proxy. 
// For this FYP template as requested, we implement the direct fetch.
const ANTHROPIC_API_KEY = ""; // User should provide this or it should be in .env

export default function AIExamGenerator() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing topic...");
  const [questions, setQuestions] = useState<any[]>([]);

  // Form State
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(10);
  const [types, setTypes] = useState<string[]>(['MCQ']);
  const [instructions, setInstructions] = useState('');

  const loadingTexts = ["Analyzing topic...", "Crafting questions...", "Reviewing difficulty...", "Almost ready..."];

  const generateQuestions = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    let textIdx = 0;
    const interval = setInterval(() => {
      textIdx = (textIdx + 1) % loadingTexts.length;
      setLoadingText(loadingTexts[textIdx]);
    }, 2000);

    try {
      const prompt = `Generate ${numQuestions} exam questions about "${topic}" at ${difficulty} difficulty level.
      Question types: ${types.join(', ')}.
      Additional instructions: ${instructions || 'None'}.
      
      Return ONLY a JSON array with no markdown, no backticks, no explanation. Format:
      [
        {
          "questionText": "...",
          "questionType": "mcq" or "short_answer",
          "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
          "correctAnswer": "A" or "B" or "C" or "D"
        }
      ]`;

      const response = await fetch("http://127.0.0.1:8000/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Failed to generate");

      const rawContent = data.content[0].text;
      const parsedQuestions = JSON.parse(rawContent.trim());
      
      // Normalize options if they don't have A:, B:, etc.
      const normalized = parsedQuestions.map((q: any) => {
        if (q.questionType === 'mcq' && q.options) {
          q.options = q.options.map((opt: string, i: number) => {
             const prefix = ['A', 'B', 'C', 'D'][i];
             return opt.startsWith(prefix + ':') ? opt : `${prefix}: ${opt}`;
          });
        }
        return q;
      });

      setQuestions(normalized);
      toast.success("Questions generated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to generate questions. Check API key.");
    } finally {
      setLoading(false);
      clearInterval(interval);
    }
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleAddToExam = () => {
    navigate('/instructor/exams/create', { state: { generatedQuestions: questions } });
  };

  const toggleType = (type: string) => {
    if (types.includes(type)) {
      if (types.length === 1) return;
      setTypes(types.filter(t => t !== type));
    } else {
      setTypes([...types, type]);
    }
  };

  return (
    <Layout role="instructor">
      <PageHeader 
        title="AI Exam Generator" 
        subtitle="Leverage Claude 3.5 Sonnet to generate high-quality assessment questions instantly." 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel - Form */}
        <div className="lg:col-span-4">
          <GlassCard className="p-8 sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <BrainCircuit className="w-5 h-5 text-[#00B4D8]" />
              <h3 className="text-lg font-display font-bold text-white">Generation Parameters</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Subject / Topic</label>
                <input 
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. World War II, Calculus Integration"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${difficulty === d ? 'bg-[#00B4D8]/10 border-[#00B4D8]/40 text-[#00B4D8]' : 'bg-white/5 border-white/5 text-white/20'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Questions</label>
                  <span className="text-[#00B4D8] text-xs font-bold">{numQuestions}</span>
                </div>
                <input 
                  type="range" min="5" max="30" step="1"
                  value={numQuestions}
                  onChange={e => setNumQuestions(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#00B4D8]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Question Types</label>
                <div className="flex gap-3">
                  {['MCQ', 'Short Answer'].map(t => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${types.includes(t) ? 'bg-[#00B4D8]/10 border-[#00B4D8]/40 text-[#00B4D8]' : 'bg-white/5 border-white/5 text-white/20'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 block mb-2">Additional Instructions</label>
                <textarea 
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="e.g. Focus on causes and effects. Avoid specific dates."
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#00B4D8]/30 transition-all"
                />
              </div>

              <GradientButton 
                disabled={loading}
                onClick={generateQuestions}
                className="w-full py-4 flex items-center justify-center gap-3 mt-4"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : <><Sparkles className="w-4 h-4" /> Generate Questions</>}
              </GradientButton>
            </div>
          </GlassCard>
        </div>

        {/* Right Panel - Preview */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="h-[600px] flex flex-col items-center justify-center bg-white/5 border border-white/10 border-dashed rounded-3xl"
              >
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-[#00B4D8]/20 border-t-[#00B4D8] rounded-full animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-[#00B4D8] animate-pulse" />
                </div>
                <h3 className="text-xl font-display font-bold text-white mb-2">{loadingText}</h3>
                <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Powered by Anthropic Claude 3.5</p>
              </motion.div>
            ) : questions.length > 0 ? (
              <motion.div key="questions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                       <Check className="w-5 h-5" />
                     </div>
                     <div>
                       <div className="text-sm font-bold text-white">Generation Complete</div>
                       <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{questions.length} questions ready</div>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <GradientButton variant="secondary" onClick={() => setQuestions([])}>
                       <RotateCcw className="w-4 h-4" />
                     </GradientButton>
                     <GradientButton onClick={handleAddToExam} className="flex items-center gap-2">
                       Add to Exam <ArrowRight className="w-4 h-4" />
                     </GradientButton>
                   </div>
                </div>

                {questions.map((q, idx) => (
                  <GlassCard key={idx} className="p-8 group relative overflow-hidden">
                    <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => removeQuestion(idx)} className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-start gap-6">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-white/30 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="mb-4">
                          <StatusBadge status={q.questionType} variant="accent" />
                        </div>
                        <p className="text-lg font-bold text-white mb-6">{q.questionText}</p>

                        {q.questionType === 'mcq' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options?.map((opt: string, i: number) => {
                              const prefix = ['A', 'B', 'C', 'D'][i];
                              const isCorrect = q.correctAnswer === prefix;
                              return (
                                <div 
                                  key={i} 
                                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${isCorrect ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/5 text-white/40'}`}
                                >
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </motion.div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center bg-white/5 border border-white/10 border-dashed rounded-3xl">
                <BrainCircuit className="w-16 h-16 text-white/5 mb-6" />
                <h3 className="text-xl font-display font-bold text-white/20">Ready to Generate</h3>
                <p className="text-white/10 text-xs font-bold uppercase tracking-widest mt-2 text-center max-w-xs leading-relaxed">
                  Fill in the parameters on the left to start generating custom questions for your exam.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
