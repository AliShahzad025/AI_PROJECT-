import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, AlertTriangle, ArrowLeft, Video, Clock, EyeOff, MonitorSmartphone, UserCheck, Mic, PackageSearch, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { getSubmissionDetails } from '../lib/api';

export default function ProctoringReport() {
  const { id } = useParams();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSubmissionDetails(id).then(data => {
      setReport(data);
      setLoading(false);
      
      // Load verification photo from local storage (simulation)
      const storedPhoto = localStorage.getItem(`verification_${id}`);
      if (storedPhoto) setVerificationPhoto(storedPhoto);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const getIconForType = (type: string) => {
    if (type.includes("Tab")) return MonitorSmartphone;
    if (type.includes("Face")) return ShieldAlert;
    if (type.includes("Looking Away")) return Eye;
    if (type.includes("Object")) return PackageSearch;
    if (type.includes("Noise")) return Mic;
    if (type.includes("Identity")) return UserCheck;
    return EyeOff;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (score >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50">Loading report...</div>;
  if (!report) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-red-400">Report not found.</div>;

  const flags = report.incidents || [];

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans pb-20">
      <nav className="h-16 border-b border-white/5 bg-[#0A0A0C] flex items-center px-6 sticky top-0 z-50">
        <Link to="/admin" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="mx-auto font-display font-medium absolute left-1/2 -translate-x-1/2">
          Session Report: {id}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header section */}
        <div className="flex flex-col md:flex-row gap-8 items-start justify-between mb-12">
          <div>
            <h1 className="text-3xl font-display font-bold mb-2">{report.studentName}</h1>
            <p className="text-white/50">{report.studentEmail} &bull; Exam ID: {report.examId}</p>
          </div>
          
          <div className={`px-6 py-4 rounded-2xl border flex items-center gap-4 ${getScoreColor(report.trustScore)}`}>
            <div>
              <div className="text-xs font-bold tracking-wider uppercase opacity-70 mb-1">Trust Score</div>
              <div className="text-3xl font-bold font-mono">{report.trustScore}%</div>
            </div>
            {report.trustScore >= 90 ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
        </div>

        {/* Video Player Mockup */}
        <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl overflow-hidden mb-12">
          <div className="aspect-video bg-black relative flex items-center justify-center border-b border-white/10 group">
            <Video className="w-12 h-12 text-white/10" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <span className="text-white/60 font-medium">Session recording playback goes here</span>
            </div>
            
            {/* Timeline markers */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
               {flags.map((flag: any, i: number) => (
                 <div 
                   key={i} 
                   className={`absolute top-0 bottom-0 w-1 ${flag.type.includes('Tab') ? 'bg-yellow-500' : 'bg-red-500'}`}
                   style={{ left: `${Math.min(100, (i + 1) * 15)}%` }}
                   title={flag.type}
                 />
               ))}
            </div>
          </div>
          <div className="p-4 flex items-center justify-between bg-[#0A0A0C]">
             <div className="flex items-center gap-4 text-sm text-white/50">
               <button className="hover:text-white">Play</button>
               <span className="font-mono">00:00 / --:--</span>
             </div>
             <button className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded text-white/70 transition-colors">Export Video</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 mb-8">
          <button 
            className={`pb-4 font-medium transition-colors relative ${activeTab === 'overview' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
            {activeTab === 'overview' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
          <button 
            className={`pb-4 font-medium transition-colors relative ${activeTab === 'timeline' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
            onClick={() => setActiveTab('timeline')}
          >
            Incident Timeline
            {activeTab === 'timeline' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            {flags.map((flag: any, i: number) => {
              const Icon = getIconForType(flag.type);
              const isHighSeverity = flag.type.includes('Face') || flag.type.includes('Tab') || flag.type.includes('Object') || flag.type.includes('Looking Away');
              return (
                <div key={i} className="flex gap-6 items-start bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="font-mono text-sm text-white/40 pt-1 w-20">{flag.time}</div>
                  <div className={`p-2 rounded-lg ${isHighSeverity ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{flag.type}</div>
                    <div className="text-sm text-white/50 mt-1 capitalize">Severity: {isHighSeverity ? 'high' : 'medium'}</div>
                  </div>
                  <button className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 mt-2">Jump to video</button>
                </div>
              );
            })}
            {flags.length === 0 && (
              <div className="text-center text-white/40 py-12">No incidents recorded. Clean session.</div>
            )}
          </div>
        )}
        
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
               <div className="text-white/50 text-sm mb-1">Total Incidents</div>
               <div className="text-3xl font-display font-bold">{flags.length}</div>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
               <div className="text-white/50 text-sm mb-1">High Severity</div>
               <div className="text-3xl font-display font-bold text-red-400">{flags.filter((f: any) => f.type.includes('Face') || f.type.includes('Tab')).length}</div>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
               <div className="text-white/50 text-sm mb-1">Submission Date</div>
               <div className="text-xl font-display font-medium mt-1">{report.submittedAt ? new Date(report.submittedAt.toMillis()).toLocaleString() : 'N/A'}</div>
             </div>

             {verificationPhoto && (
               <div className="col-span-full mt-6">
                 <h3 className="text-sm font-medium text-white/50 mb-4 flex items-center gap-2">
                   <UserCheck className="w-4 h-4" /> Identity Verification Photo
                 </h3>
                 <div className="w-48 aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black">
                   <img src={verificationPhoto} alt="Verification" className="w-full h-full object-cover transform -scale-x-100" />
                 </div>
               </div>
             )}
           </div>
        )}

      </main>
    </div>
  );
}
