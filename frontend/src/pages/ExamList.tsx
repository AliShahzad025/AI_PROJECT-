import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, GradientButton, StatusBadge } from '../components/UI';
import { Search, Filter, ClipboardList, Calendar, Clock, User, Check, ArrowRight, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, updateDoc, doc, arrayUnion, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAppAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ExamList() {
  const { user } = useAppAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'exams'), (snapshot) => {
      setExams(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    let unsubRequests: () => void = () => {};
    let unsubSubmissions: () => void = () => {};
    
    if (user?.uid) {
      unsubRequests = onSnapshot(query(collection(db, 'enrollmentRequests'), where('studentId', '==', user.uid)), (snapshot) => {
        setEnrollmentRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      unsubSubmissions = onSnapshot(query(collection(db, 'submissions'), where('studentId', '==', user.uid)), (snapshot) => {
        setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsub();
      unsubRequests();
      unsubSubmissions();
    };
  }, [user]);

  const enroll = async (exam: any) => {
    try {
      await addDoc(collection(db, 'enrollmentRequests'), {
        examId: exam.id,
        examName: exam.title || exam.name || 'Untitled Exam',
        studentId: user.uid,
        studentName: user.name || 'Student',
        studentEmail: user.email || '',
        instructorId: exam.instructorId || exam.createdBy || '',
        status: 'pending',
        timestamp: serverTimestamp()
      });
      toast.success("Enrollment request sent! Waiting for instructor approval.");
    } catch (err) {
      toast.error("Failed to send enrollment request");
    }
  };

  const filteredExams = exams.filter(e => {
    const matchesSearch = (e.title || e.name || '').toLowerCase().includes(search.toLowerCase());
    const isEnrolled = e.enrolledStudents?.includes(user?.uid);
    const hasSubmitted = submissions.some(s => s.examId === e.id);
    
    if (activeTab === 'Enrolled') return matchesSearch && isEnrolled && !hasSubmitted;
    if (activeTab === 'Available') return matchesSearch && !isEnrolled && e.status === 'scheduled';
    if (activeTab === 'Completed') return matchesSearch && (e.status === 'completed' || hasSubmitted) && isEnrolled;
    return matchesSearch;
  });

  return (
    <Layout role="student">
      <PageHeader 
        title="Exam Portal" 
        subtitle="Browse available assessments, enroll in courses, and take your scheduled exams." 
      />

      {/* Toolbar */}
      <GlassCard className="mb-8 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exams by title or instructor..." 
              className="w-full bg-[#0D1117] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#00B4D8]/50 transition-all"
            />
          </div>
          
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit">
            {['All', 'Available', 'Enrolled', 'Completed'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-[#00B4D8] text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.length > 0 ? filteredExams.map(exam => {
          const isEnrolled = exam.enrolledStudents?.includes(user?.uid);
          const isJoinable = () => {
            if (!isEnrolled) return false;
            const examDate = new Date(`${exam.date}T${exam.time}`);
            const now = new Date();
            const diff = examDate.getTime() - now.getTime();
            const mins = diff / 60000;
            return mins <= 10 && mins >= -exam.durationMinutes;
          };

          return (
            <GlassCard key={exam.id} className="h-full flex flex-col group overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                <StatusBadge 
                  status={exam.status} 
                  variant={exam.status === 'active' ? 'danger' : exam.status === 'completed' ? 'success' : 'info'} 
                />
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">{exam.durationMinutes} min</div>
              </div>

              <h3 className="text-lg font-display font-bold text-white mb-2 leading-tight group-hover:text-[#00B4D8] transition-colors">{exam.title || exam.name}</h3>
              <div className="flex items-center gap-2 text-xs text-white/40 mb-6">
                <User className="w-3 h-3" /> {exam.instructorName}
              </div>

              <div className="space-y-3 mb-8 flex-1">
                <div className="flex items-center gap-3 text-xs text-white/60 font-medium">
                  <Calendar className="w-4 h-4 text-white/20" /> {exam.date}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/60 font-medium">
                  <Clock className="w-4 h-4 text-white/20" /> {exam.time}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                {(exam.status === 'completed' || submissions.some(s => s.examId === exam.id)) ? (
                  <GradientButton 
                    variant="secondary" 
                    onClick={() => navigate(`/student/exams/${exam.id}/results`)}
                    className="w-full text-xs font-black uppercase tracking-widest py-3"
                  >
                    View My Performance
                  </GradientButton>
                ) : isEnrolled ? (
                  <GradientButton 
                    disabled={!isJoinable()}
                    onClick={() => navigate(`/student/exams/${exam.id}/session`)}
                    className="w-full text-xs font-black uppercase tracking-widest py-3 flex items-center justify-center gap-2"
                  >
                    Enter Exam <ArrowRight className="w-4 h-4" />
                  </GradientButton>
                ) : (
                  <div className="w-full">
                    {enrollmentRequests.some(r => r.examId === exam.id && r.status === 'pending') ? (
                      <div className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                        <Clock className="w-3 h-3" /> Pending Approval
                      </div>
                    ) : enrollmentRequests.some(r => r.examId === exam.id && r.status === 'rejected') ? (
                      <div className="flex flex-col gap-2">
                        <div className="w-full py-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400/50">
                          <X className="w-3 h-3" /> Rejected
                        </div>
                        <button 
                          onClick={() => enroll(exam)}
                          className="text-[10px] font-black uppercase tracking-widest text-[#00B4D8] hover:underline"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <GradientButton 
                        variant="secondary" 
                        onClick={() => enroll(exam)}
                        className="w-full text-xs font-black uppercase tracking-widest py-3 flex items-center justify-center gap-2 border-[#00B4D8]/30 text-[#00B4D8] hover:bg-[#00B4D8]/10"
                      >
                        Enroll Now
                      </GradientButton>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          );
        }) : (
          <div className="col-span-full py-32 bg-white/5 border border-white/10 border-dashed rounded-3xl flex flex-col items-center justify-center">
             <ClipboardList className="w-12 h-12 text-white/10 mb-4" />
             <p className="text-white/40 font-medium">No exams found matching your criteria</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
