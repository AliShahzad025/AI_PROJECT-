import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, StatusBadge, GradientButton } from '../components/UI';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Users, ShieldAlert, CheckCircle, Download, FileJson, FileSpreadsheet, Clock, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';
import { calculateViolationsCount, getViolationSummary } from '../lib/violations';

export default function ExamReview() {
  const { examId } = useParams();
  const [exam, setExam] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<string | 'all'>('all');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;

    // Fetch Exam
    getDoc(doc(db, 'exams', examId)).then(snap => {
      if (snap.exists()) setExam({ id: snap.id, ...snap.data() });
    });

    // Fetch Alerts
    const unsubAlerts = onSnapshot(
      query(collection(db, 'monitoringAlerts'), where('examId', '==', examId)), 
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log(`Fetched ${docs.length} alerts for exam ${examId}`);
        setAlerts(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Alerts subscription error:", error);
        toast.error("Failed to sync alerts");
      }
    );

    // Fetch Sessions
    const unsubSessions = onSnapshot(
      query(collection(db, 'examSessions'), where('examId', '==', examId)), 
      (snapshot) => {
        setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Sessions subscription error:", error);
      }
    );

    // Fetch Submissions
    const unsubSubmissions = onSnapshot(
      query(collection(db, 'submissions'), where('examId', '==', examId)),
      (snapshot) => {
        setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubAlerts();
      unsubSessions();
      unsubSubmissions();
    };
  }, [examId]);

  const studentSessions = sessions.map(session => {
    // Match by sessionId or session_id for compatibility
    const sessionAlerts = alerts.filter(a => (a.sessionId === session.id) || (a.session_id === session.id));
    // Match submission by sessionId
    const submission = submissions.find(s => s.sessionId === session.id);
    
    return {
      sessionId: session.id,
      studentId: session.studentId,
      studentName: session.studentName,
      startTime: session.startTime?.toDate?.() || new Date(session.startTime),
      violationCount: calculateViolationsCount(sessionAlerts),
      alertCount: sessionAlerts.length,
      score: submission?.score,
      totalQuestions: submission?.totalQuestions,
      reviewed: sessionAlerts.length > 0 && sessionAlerts.every(a => a.reviewed)
    };
  }).sort((a, b) => b.startTime - a.startTime);

  // Group by student to count attempts
  const studentAttemptCount: Record<string, number> = {};
  const roster = studentSessions.map(s => {
    studentAttemptCount[s.studentId] = (studentAttemptCount[s.studentId] || 0) + 1;
    return { ...s, attemptNumber: studentAttemptCount[s.studentId] };
  }).reverse(); // Reverse so earlier attempts get lower numbers if sorted by time desc originally, wait.
  
  // Better way: sort by time ASC, then count.
  const rosterAsc = [...studentSessions].sort((a, b) => a.startTime - b.startTime);
  const counts: Record<string, number> = {};
  const finalRoster = rosterAsc.map(s => {
    counts[s.studentId] = (counts[s.studentId] || 0) + 1;
    return { ...s, attemptNumber: counts[s.studentId] };
  }).sort((a, b) => b.startTime - a.startTime);

  const markReviewed = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'monitoringAlerts', alertId), {
        reviewed: true,
        reviewedBy: 'Dr. Instructor', // use current user name
        reviewedAt: new Date().toISOString()
      });
      toast.success("Alert marked as reviewed");
    } catch (err) {
      toast.error("Failed to update alert");
    }
  };

  const filteredAlerts = selectedSession === 'all' 
    ? alerts 
    : alerts.filter(a => a.sessionId === selectedSession);

  const stats = {
    total: filteredAlerts.length,
    faces: filteredAlerts.filter(a => a.alertType?.includes('face')).length,
    gaze: filteredAlerts.filter(a => a.alertType?.includes('gaze')).length,
    tab: filteredAlerts.filter(a => a.alertType?.includes('tab')).length,
  };

  const downloadReport = () => {
    const report = {
      exam: exam.title,
      date: exam.date,
      totalAlerts: alerts.length,
      alerts: alerts.map(a => ({
        student: a.studentName,
        type: a.alertType,
        severity: a.severity,
        time: a.timestamp?.toDate ? a.timestamp.toDate().toLocaleString() : new Date().toLocaleString(),
        description: a.description
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${examId}.json`;
    a.click();
  };

  return (
    <Layout role="instructor">
      <div className="flex justify-between items-start mb-8">
        <PageHeader 
          title={exam?.title || 'Exam Review'} 
          subtitle="Analyze proctoring data and review suspicious behavior evidence." 
        />
        <div className="flex gap-3">
          <GradientButton variant="secondary" className="flex items-center gap-2" onClick={downloadReport}>
            <Download className="w-4 h-4" /> Export Report
          </GradientButton>
        </div>
      </div>

      <div className="flex gap-8 h-[calc(100vh-240px)]">
        {/* Left Panel - Student Roster */}
        <div className="w-[300px] flex flex-col gap-4 overflow-y-auto pr-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40 px-2">Exam Attempts ({finalRoster.length})</h3>
          <button 
            onClick={() => setSelectedSession('all')}
            className={`p-4 rounded-2xl border text-left transition-all ${selectedSession === 'all' ? 'bg-[#00B4D8]/10 border-[#00B4D8]/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
          >
            <div className="text-sm font-bold text-white">All Activity</div>
            <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{alerts.length} Total Alerts</div>
          </button>
          
          <div className="space-y-2">
            {finalRoster.map(session => (
              <button 
                key={session.sessionId}
                onClick={() => setSelectedSession(session.sessionId)}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${selectedSession === session.sessionId ? 'bg-[#00B4D8]/10 border-[#00B4D8]/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                    {session.studentName.charAt(0)}
                   </div>
                   <div>
                     <div className="text-sm font-bold text-white truncate max-w-[140px]">{session.studentName}</div>
                     <div className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">Attempt {session.attemptNumber} • {session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                     {session.reviewed && <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />}
                   </div>
                </div>
                {session.violationCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-red-500/20">
                    {session.violationCount}V
                  </span>
                )}
                {session.score !== undefined && (
                  <span className="ml-2 bg-[#00B4D8]/20 text-[#00B4D8] text-[10px] font-black px-1.5 py-0.5 rounded-md border border-[#00B4D8]/20">
                    {session.score}/{session.totalQuestions}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Panel - Evidence Viewer */}
        <div className="flex-1 flex flex-col gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-bold text-white">
                {selectedSession === 'all' ? 'Aggregate Overview' : `${finalRoster.find(s => s.sessionId === selectedSession)?.studentName} (Attempt ${finalRoster.find(s => s.sessionId === selectedSession)?.attemptNumber})`}
              </h3>
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Raw Database Feed: {alerts.length} alerts</span>
                <StatusBadge status={`${stats.total} Alerts`} variant="danger" />
              </div>
            </div>

            {(() => {
              const summary = getViolationSummary(filteredAlerts);
              return (
                <div className="grid grid-cols-5 gap-4">
                  <MiniStat label="Score" value={selectedSession === 'all' ? '--' : `${finalRoster.find(s => s.sessionId === selectedSession)?.score || 0}/${finalRoster.find(s => s.sessionId === selectedSession)?.totalQuestions || 0}`} color="var(--accent-primary)" />
                  <MiniStat label="Faces (1:1)" value={`${summary.faceViolations} (${summary.rawCounts.face})`} />
                  <MiniStat label="Gaze (4:1)" value={`${summary.gazeViolations} (${summary.rawCounts.gaze})`} />
                  <MiniStat label="Tabs (2:1)" value={`${summary.tabViolations} (${summary.rawCounts.tab})`} />
                  <MiniStat label="Total Violations" value={summary.totalViolations} color="var(--danger)" />
                </div>
              );
            })()}
          </GlassCard>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {filteredAlerts.length > 0 ? filteredAlerts.map(alert => (
              <GlassCard key={alert.id} className={`p-6 border-l-4 ${alert.severity === 'high' ? 'border-red-500' : alert.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded border border-white/5 text-white/40">
                         {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString() : 'Recent'}
                      </span>
                      <StatusBadge status={alert.alertType.replace('_', ' ')} variant={alert.severity === 'high' ? 'danger' : 'warning'} />
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        {Math.round((alert.confidenceScore || 0) * 100)}% Confidence
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed mb-4">{alert.description}</p>
                    
                    {alert.evidenceImageURL && (
                      <div className="w-32 h-24 bg-black rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-[#00B4D8]/50 transition-all group">
                         <img src={alert.evidenceImageURL} alt="evidence" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex flex-col items-end gap-3">
                    {alert.reviewed ? (
                      <div className="flex items-center gap-2 text-[10px] font-black text-green-400 uppercase tracking-widest bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                        <CheckCircle className="w-3.5 h-3.5" /> Reviewed
                      </div>
                    ) : (
                      <button 
                        onClick={() => markReviewed(alert.id)}
                        className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/20 transition-all"
                      >
                        Mark Reviewed
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            )) : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-white/5 border border-white/10 border-dashed rounded-3xl">
                <CheckCircle className="w-12 h-12 text-green-400/20 mb-4" />
                <p className="text-white/40 font-medium">No violations detected 🎉</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Actions */}
        <div className="w-[300px] space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6">Actions & Reports</h3>
            <div className="space-y-3">
              <ReportButton icon={<FileJson />} label="Download JSON Report" onClick={downloadReport} />
              <ReportButton icon={<FileSpreadsheet />} label="CSV Summary" />
              <ReportButton icon={<ShieldAlert />} label="Export with Evidence" />
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5">
               <GradientButton variant="danger" className="w-full py-3 text-xs font-black uppercase tracking-widest">
                Clear All for Student
               </GradientButton>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-4">Exam Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-white/20" />
                <span className="text-sm text-white/60">{exam?.duration || 0} min Duration</span>
              </div>
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-white/20" />
                <span className="text-sm text-white/60">{[...new Set(finalRoster.map(r => r.studentId))].length} Total Students</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-white/20" />
                <span className="text-sm text-white/60">{finalRoster.length} Total Attempts</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-white/20" />
                <span className="text-sm text-white/60">{alerts.length} Total Incidents</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
}

function MiniStat({ label, value, color = 'white' }: any) {
  return (
    <div className="bg-white/5 border border-white/5 p-3 rounded-xl text-center">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{label}</div>
      <div className="text-lg font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function ReportButton({ icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/30 transition-all text-xs font-bold"
    >
      {icon} {label}
    </button>
  );
}
