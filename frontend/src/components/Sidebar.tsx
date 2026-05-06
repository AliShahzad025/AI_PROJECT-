import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserCheck, Settings, 
  FileText, PlusSquare, Sparkles, ClipboardList, 
  ShieldAlert, User, LogOut, ShieldCheck
} from 'lucide-react';
import { logout } from '../lib/api';
import { motion } from 'motion/react';

interface SidebarProps {
  role: 'admin' | 'instructor' | 'student';
}

const navItems = {
  admin: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Users', icon: Users, path: '/admin/users' },
    { name: 'Verification Requests', icon: UserCheck, path: '/admin/verification' },
    { name: 'System Config', icon: Settings, path: '/admin/config' },
  ],
  instructor: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/instructor' },
    { name: 'My Exams', icon: FileText, path: '/instructor/exams' },
    { name: 'Create Exam', icon: PlusSquare, path: '/instructor/exams/create' },
    { name: 'AI Exam Generator', icon: Sparkles, path: '/instructor/ai-generator' },
  ],
  student: [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/student' },
    { name: 'My Exams', icon: ClipboardList, path: '/student/exams' },
    { name: 'My Violations', icon: ShieldAlert, path: '/student/violations' },
    { name: 'Profile', icon: User, path: '/student/profile' },
  ]
};

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const navigate = useNavigate();
  const items = navItems[role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen bg-[#0D1117] border-r border-white/5 flex flex-col sticky top-0">
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00B4D8]/10 border border-[#00B4D8]/20 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#00B4D8]" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">SEPS</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length <= 2}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group
              ${isActive 
                ? 'bg-[#00B4D8]/10 text-[#00B4D8] border border-[#00B4D8]/20' 
                : 'text-white/50 hover:text-white hover:bg-white/5'}
            `}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all group"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};
