import React, { useState, useEffect } from 'react';
import { GlassCard, GradientButton, PageHeader } from '../components/UI';
import { Layout, Calendar, Trash2, Edit, Plus, Filter, Search, MoreHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getExams } from '../lib/api';
import { toast } from 'sonner';

export default function ManageExams() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const data = await getExams();
        setExams(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] p-8">
      <div className="flex items-center justify-between mb-8">
        <PageHeader title="Manage Exams" subtitle="View, edit, and monitor your current assessments." />
        <Link to="/instructor/exams/create">
          <GradientButton className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Exam
          </GradientButton>
        </Link>
      </div>

      <GlassCard className="mb-8">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input placeholder="Search exams by name or date..." className="w-full bg-[#050505] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500/50 transition-all" />
          </div>
          <GradientButton variant="secondary" className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Status
          </GradientButton>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <GlassCard key={exam.id} className="flex flex-col h-full group">
            <div className="flex justify-between items-start mb-4">
              <div className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md ${
                exam.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-white/40 border border-white/10'
              }`}>
                {exam.status || 'scheduled'}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigate(`/instructor/exams/${exam.id}/edit`)} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">{exam.name}</h3>
            <div className="flex items-center gap-2 text-xs text-white/40 mb-6">
              <Calendar className="w-3.5 h-3.5" /> {exam.date} @ {exam.time}
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex gap-3">
              <GradientButton 
                variant="primary" 
                className="flex-1 text-sm"
                onClick={() => navigate(`/instructor/exams/${exam.id}/review`)}
              >
                Review Results
              </GradientButton>
              <GradientButton variant="secondary" className="px-3">
                <MoreHorizontal className="w-4 h-4" />
              </GradientButton>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
