import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { PageHeader, GlassCard, StatusBadge, GradientButton } from '../components/UI';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Users, ShieldAlert, CheckCircle, Download, FileJson, FileSpreadsheet, Clock, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ExamReview() {
  const { examId } = useParams();
  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | 'all'>('all');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;

    // Fetch Exam
    getDoc(doc(db, 'exams', examId)).then(snap => {
      if (snap.exists()) setExam({ id: snap.id, ...snap.data() });
    });

    // Fetch Alerts
    const unsubAlerts = onSnapshot(query(collection(db, 'monitoringAlerts'), where('examId', '==', examId), orderBy('timestamp', 'asc')), (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAlerts(docs);
      setLoading(false);
    });

    // Fetch enrolled students logic - for simplicity extracting from alerts or enrolledStudents list
    return () => unsubAlerts();
  }, [examId]);

  useEffect(() => {
    if (exam && exam.enrolledStudents) {
      // In a real app, you'd fetch user profiles for these IDs
      // Mocking for now based on unique student IDs in alerts + enrolled list
      const alertStudentIds = [...new Set(alerts.map(a => a.studentId))];
      const allIds = [...new Set([...(exam.enrolledStudents || []), ...alertStudentIds])];
      setStudents(allIds.map(id => ({
        uid: id,
        name: alerts.find(a => a.studentId === id)?.studentName || `Student ${id.slice(-4)}`,
        alertCount: alerts.filter(a => a.studentId === id).length,
        reviewed: alerts.filter(a => a.studentId === id && !a.reviewed).length === 0
      })));
    }
  }, [exam, alerts]);

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

  const filteredAlerts = selectedStudent === 'all' 
    ? alerts 
    : alerts.filter(a => a.studentId === selectedStudent);

  const stats = {
    total: filteredAlerts.length,
    faces: filteredAlerts.filter(a => a.alertType === 'multiple_faces').length,
    gaze: filteredAlerts.filter(a => a.alertType === 'gaze_deviation').length,
    audio: filteredAlerts.filter(a => a.alertType === 'audio_anomaly').length,
    tab: filteredAlerts.filter(a => a.alertType === 'tab_switch').length,
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
        <div className="w-[280px] flex flex-col gap-4 overflow-y-auto">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40 px-2">Students ({students.length})</h3>
          <button 
            onClick={() => setSelectedStudent('all')}
            className={`p-4 rounded-2xl border text-left transition-all ${selectedStudent === 'all' ? 'bg-[#00B4D8]/10 border-[#00B4D8]/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
          >
            <div className="text-sm font-bold text-white">All Students</div>
            <div className="text-[10px] text-white/30 uppercase font-bold tracking-widest">{alerts.length} Total Alerts</div>
          </button>
          
          <div className="space-y-2">
            {students.map(student => (
              <button 
                key={student.uid}
                onClick={() => setSelectedStudent(student.uid)}
                className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${selectedStudent === student.uid ? 'bg-[#00B4D8]/10 border-[#00B4D8]/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40">
                    {student.name.charAt(0)}
                   </div>
                   <div>
                     <div className="text-sm font-bold text-white truncate max-w-[120px]">{student.name}</div>
                     {student.reviewed && <CheckCircle className="w-3 h-3 text-green-400 mt-0.5" />}
                   </div>
                </div>
                {student.alertCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-red-500/20">
                    {student.alertCount}
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
                {selectedStudent === 'all' ? 'Aggregate Overview' : students.find(s => s.uid === selectedStudent)?.name}
              </h3>
              <div className="flex gap-2">
                <StatusBadge status={`${stats.total} Alerts`} variant="danger" />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <MiniStat label="Faces" value={stats.faces} />
              <MiniStat label="Gaze" value={stats.gaze} />
              <MiniStat label="Audio" value={stats.audio} />
              <MiniStat label="Tabs" value={stats.tab} />
              <MiniStat label="Trust" value={Math.max(0, 100 - stats.total * 5) + '%'} color="#2ECC71" />
            </div>
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
                <span className="text-sm text-white/60">{students.length} Total Students</span>
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
