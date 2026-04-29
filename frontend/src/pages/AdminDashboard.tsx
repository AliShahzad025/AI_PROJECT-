import { useState, useEffect } from 'react';
import { useAppAuth } from '../lib/auth';
import { logout, setUserRole, getExams, createExam, deleteExam, getSettings, updateSettings, getAllSubmissions, subscribeToExams, subscribeToSettings, subscribeToSubmissions } from '../lib/api';
import { ShieldCheck, LogOut, FileCheck2, Users, Settings, Save, RotateCcw, Calendar, Clock, Plus, Trash2, Search, X, AlignLeft, ListChecks, SortDesc, BrainCircuit, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { generateAIQuestions } from '../lib/gemini';

export default function AdminDashboard() {
  const { user, loading } = useAppAuth();

  const [sensitivity, setSensitivity] = useState('medium');
  const [allowedApps, setAllowedApps] = useState('Calculator, Notepad');
  const [timeLimit, setTimeLimit] = useState(120);
  const [lockdown, setLockdown] = useState(true);
  const [isGazeEnabled, setIsGazeEnabled] = useState(true);
  const [isObjectEnabled, setIsObjectEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isIdentityEnabled, setIsIdentityEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Calendar / Exam Schedule State
  const [exams, setExams] = useState<any[]>([]);
  const [showNewExamForm, setShowNewExamForm] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTime, setNewExamTime] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Question Builder
  type QType = { id: number; text: string; type: 'textarea' | 'mcq'; options: string };
  const [newExamQuestions, setNewExamQuestions] = useState<QType[]>([]);
  const addQuestion = (type: 'textarea' | 'mcq') =>
    setNewExamQuestions(prev => [...prev, { id: Date.now(), text: '', type, options: '' }]);
  const removeQuestion = (id: number) =>
    setNewExamQuestions(prev => prev.filter(q => q.id !== id));
  const updateQuestion = (id: number, field: string, value: string) =>
    setNewExamQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));

  // AI Generator State
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const questions = await generateAIQuestions(aiTopic);
      const formatted = questions.map((q, i) => ({
        id: Date.now() + i,
        ...q
      }));
      setNewExamQuestions(prev => [...prev, ...formatted]);
      toast.success(`Successfully generated ${questions.length} questions!`);
      setAiTopic('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate questions');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Submissions Filter
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'flagged' | 'clean'>('all');
  const [submissionSort, setSubmissionSort] = useState<'newest' | 'mostFlags'>('newest');

  useEffect(() => {
    const unsubExams = subscribeToExams((fetchedExams) => {
      setExams(fetchedExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });
    const unsubSettings = subscribeToSettings((settings) => {
      if (settings) {
        setSensitivity(settings.sensitivity ?? 'medium');
        setAllowedApps(settings.allowedApps ?? 'Calculator, Notepad');
        setTimeLimit(settings.timeLimit ?? 120);
        setLockdown(settings.lockdown ?? true);
        setIsGazeEnabled(settings.isGazeEnabled ?? true);
        setIsObjectEnabled(settings.isObjectEnabled ?? true);
        setIsAudioEnabled(settings.isAudioEnabled ?? true);
        setIsIdentityEnabled(settings.isIdentityEnabled ?? true);
      }
    });

    const unsubSubmissions = subscribeToSubmissions((fetchedSubmissions) => {
      setSubmissions(fetchedSubmissions);
    });

    return () => {
      unsubExams();
      unsubSettings();
      unsubSubmissions();
    };
  }, []);

  if (loading) return <div></div>;
  if (!user || user.role !== 'admin') return <Navigate to="/login" />;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        sensitivity,
        allowedApps,
        timeLimit,
        lockdown,
        isGazeEnabled,
        isObjectEnabled,
        isAudioEnabled,
        isIdentityEnabled
      });
      toast.success('Settings saved to database successfully!');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToStudent = async () => {
    if (confirm("Developer Mode: Switch your account to Student?")) {
      try {
        await setUserRole(user.uid, user.email, user.name, 'student');
        toast.info("Switched to Student portal");
      } catch (err: any) {
        toast.error("Failed to switch role: " + err.message);
      }
    }
  };

  const handleSaveExam = async () => {
    if (!newExamName || !newExamDate || !newExamTime) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const questions = newExamQuestions
        .filter(q => q.text.trim())
        .map((q, i) => {
          const base = { id: i + 1, text: q.text.trim(), type: q.type };
          if (q.type === 'mcq') {
            return { ...base, options: q.options.split(',').map(o => o.trim()).filter(Boolean) };
          }
          return base; // essay — no options field at all
        });
      await createExam(newExamName, newExamDate, newExamTime, user!.uid, questions);
      setShowNewExamForm(false);
      setNewExamName('');
      setNewExamDate('');
      setNewExamTime('');
      setNewExamQuestions([]);
      toast.success(`Exam scheduled with ${questions.length} question(s)!`);
    } catch (err: any) {
      toast.error('Failed to create exam: ' + err.message);
    }
  };

  const filteredSubmissions = submissions
    .filter(s => {
      const matchSearch = !submissionSearch ||
        s.studentName?.toLowerCase().includes(submissionSearch.toLowerCase()) ||
        s.studentEmail?.toLowerCase().includes(submissionSearch.toLowerCase());
      const matchFilter =
        submissionFilter === 'flagged' ? (s.incidents?.length || 0) > 0 :
          submissionFilter === 'clean' ? (s.incidents?.length || 0) === 0 : true;
      return matchSearch && matchFilter;
    })
    .sort((a, b) =>
      submissionSort === 'mostFlags'
        ? (b.incidents?.length || 0) - (a.incidents?.length || 0)
        : (b.submittedAt?.toMillis() || 0) - (a.submittedAt?.toMillis() || 0)
    );

  const handleDeleteExam = async (id: string) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      try {
        await deleteExam(id);
        toast.success('Exam removed from database.');
      } catch (err: any) {
        toast.error("Failed to delete exam: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans">
      <nav className="border-b border-white/5 bg-[#0A0A0C]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-medium text-lg">
            <ShieldCheck className="w-5 h-5 text-red-400" />
            <span>Admin Portal</span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="hidden sm:block text-sm text-white/50">{user.email}</span>
            <button
              onClick={handleSwitchToStudent}
              className="flex items-center gap-2 text-sm text-white/50 hover:text-indigo-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-indigo-400/30"
              title="Test Mode: Switch Role"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:block text-xs">Switch to Student</span>
            </button>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-white/50 hover:text-red-400 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-400/30">
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-display font-bold mb-8">Dashboard Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div whileHover={{ y: -4 }} className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
              <FileCheck2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-sm text-white/50 mb-1">Active Exams</div>
            <div className="text-3xl font-semibold">{exams.length}</div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-sm text-white/50 mb-1">Total Submissions</div>
            <div className="text-3xl font-semibold">{submissions.length}</div>
          </motion.div>

          <motion.div whileHover={{ y: -4 }} className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-sm text-white/50 mb-1">Flagged Incidents</div>
            <div className="text-3xl font-semibold text-red-400">
              {submissions.filter(s => (s.incidents?.length || 0) > 0).length}
            </div>
          </motion.div>
        </div>

        {/* Schedule & Calendar View */}
        <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h2>Exam Schedule</h2>
            </div>
            {!showNewExamForm && (
              <button
                onClick={() => setShowNewExamForm(true)}
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Schedule Exam
              </button>
            )}
          </div>

          {showNewExamForm ? (
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-2">
              <h3 className="text-sm font-medium mb-4 text-white/70">Schedule New Exam</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Exam Name</label>
                  <input type="text" value={newExamName} onChange={e => setNewExamName(e.target.value)}
                    placeholder="e.g. History 101 Midterm"
                    className="w-full bg-[#111115] border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Date</label>
                  <input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)}
                    className="w-full bg-[#111115] border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1.5">Time</label>
                  <input type="time" value={newExamTime} onChange={e => setNewExamTime(e.target.value)}
                    className="w-full bg-[#111115] border border-white/10 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors [color-scheme:dark]" />
                </div>
              </div>

              {/* AI Generator Panel */}
              <div className="border-t border-white/5 pt-5 mb-5">
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-indigo-200">AI Question Assistant</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                      placeholder="Enter topic (e.g. JavaScript Closures, World History...)"
                      className="flex-1 bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGeneratingAI}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    >
                      {isGeneratingAI ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30 mt-2">Gemini AI will generate a mix of MCQ and Essay questions based on your topic.</p>
                </div>
              </div>

              {/* Question Builder */}
              <div className="border-t border-white/5 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white/70">Questions <span className="text-white/30">({newExamQuestions.length})</span></label>
                  <div className="flex gap-2">
                    <button onClick={() => addQuestion('textarea')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 transition-colors">
                      <AlignLeft className="w-3.5 h-3.5" /> Essay
                    </button>
                    <button onClick={() => addQuestion('mcq')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 transition-colors">
                      <ListChecks className="w-3.5 h-3.5" /> MCQ
                    </button>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  {newExamQuestions.length === 0 && (
                    <div className="text-center py-5 border border-dashed border-white/10 rounded-xl text-xs text-white/30">
                      No questions yet — click Essay or MCQ to add one.
                    </div>
                  )}
                  {newExamQuestions.map((q, i) => (
                    <div key={q.id} className="bg-[#111115] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                          Q{i + 1} · {q.type === 'mcq' ? 'Multiple Choice' : 'Essay'}
                        </span>
                        <button onClick={() => removeQuestion(q.id)} className="text-white/30 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                      <textarea rows={2} value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                        placeholder="Question text..."
                        className="w-full bg-transparent text-sm text-white/80 outline-none resize-none placeholder:text-white/20 mb-2" />
                      {q.type === 'mcq' && (
                        <input type="text" value={q.options} onChange={e => updateQuestion(q.id, 'options', e.target.value)}
                          placeholder="Options (comma-separated): A, B, C, D"
                          className="w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2 text-xs text-white/70 outline-none focus:border-indigo-500/30" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button onClick={() => { setShowNewExamForm(false); setNewExamQuestions([]); }}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">Cancel</button>
                <button onClick={handleSaveExam}
                  className="px-4 py-2 text-sm bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors">Save Exam</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {exams.length > 0 ? exams.map((exam) => (
                <div key={exam.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col hover:border-white/20 transition-colors group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm font-semibold truncate pr-2" title={exam.name}>{exam.name}</div>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-white/5 rounded-md"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Calendar className="w-3.5 h-3.5 text-white/40" />
                      {new Date(exam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Clock className="w-3.5 h-3.5 text-white/40" />
                      {exam.time}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-8 text-center text-white/40 text-sm">
                  No exams scheduled yet.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 flex flex-col">
            <h2 className="text-lg font-medium mb-4">Recent Submissions & Alerts</h2>

            {/* Search + Filter bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input value={submissionSearch} onChange={e => setSubmissionSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-white/20 transition-colors" />
              </div>
              <div className="flex gap-1.5">
                {(['all', 'flagged', 'clean'] as const).map(f => (
                  <button key={f} onClick={() => setSubmissionFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${submissionFilter === f ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}>{f}</button>
                ))}
                <button onClick={() => setSubmissionSort(s => s === 'newest' ? 'mostFlags' : 'newest')}
                  title={submissionSort === 'newest' ? 'Sort: Newest' : 'Sort: Most Flags'}
                  className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/50 hover:bg-white/10 transition-colors flex items-center gap-1.5">
                  <SortDesc className="w-3.5 h-3.5" />
                  {submissionSort === 'newest' ? 'Newest' : 'Most Flags'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
              {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub: any) => {
                const flagCount = sub.incidents?.length || 0;
                const hasFlags = flagCount > 0;
                return (
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-colors">
                    <div className="flex gap-3 items-center min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${hasFlags ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{hasFlags ? `${flagCount} Flag${flagCount > 1 ? 's' : ''}` : 'Clean Session'}</div>
                        <div className="text-xs text-white/50 truncate">{sub.studentName} · Trust: {sub.trustScore}%</div>
                      </div>
                    </div>
                    <Link to={`/admin/report/${sub.id}`}
                      className="text-xs px-3 py-1.5 bg-white/10 rounded-md hover:bg-white/20 transition-colors shrink-0 ml-3">
                      Review
                    </Link>
                  </div>
                );
              }) : (
                <div className="text-sm text-white/40 text-center py-8">
                  {submissions.length === 0 ? 'No submissions yet.' : 'No results match your filter.'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6 text-lg font-medium">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h2>Exam Settings & Rules</h2>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">AI Detection Sensitivity</label>
                <select
                  value={sensitivity}
                  onChange={(e) => setSensitivity(e.target.value)}
                  className="w-full bg-[#111115] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="low">Low (Forgiving)</option>
                  <option value="medium">Medium (Standard)</option>
                  <option value="high">Strict (Maximum Security)</option>
                </select>
                <p className="text-xs text-white/40 mt-2">Determines how aggressively the AI flags background noise or eye movement.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Allowed Applications (Comma Separated)</label>
                <input
                  type="text"
                  value={allowedApps}
                  onChange={(e) => setAllowedApps(e.target.value)}
                  placeholder="e.g., Calculator, VS Code"
                  className="w-full bg-[#111115] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Default Time Limit (min)</label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="w-full bg-[#111115] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col justify-center pt-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${lockdown ? 'bg-indigo-500' : 'bg-white/10'}`} onClick={() => setLockdown(!lockdown)}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${lockdown ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Browser Lockdown</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4 border-t border-white/5 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Advanced AI Modules</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-sm text-white/70">Gaze Tracking</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isGazeEnabled ? 'bg-indigo-500' : 'bg-white/10'}`} onClick={() => setIsGazeEnabled(!isGazeEnabled)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isGazeEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-sm text-white/70">Object Detection</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isObjectEnabled ? 'bg-indigo-500' : 'bg-white/10'}`} onClick={() => setIsObjectEnabled(!isObjectEnabled)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isObjectEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-sm text-white/70">Audio Monitoring</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isAudioEnabled ? 'bg-indigo-500' : 'bg-white/10'}`} onClick={() => setIsAudioEnabled(!isAudioEnabled)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isAudioEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <span className="text-sm text-white/70">Identity Selfie</span>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${isIdentityEnabled ? 'bg-indigo-500' : 'bg-white/10'}`} onClick={() => setIsIdentityEnabled(!isIdentityEnabled)}>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${isIdentityEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 mt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full py-2.5 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
