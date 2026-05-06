import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = true }) => {
  return (
    <div className={`bg-glass border border-white/10 rounded-2xl p-6 backdrop-blur-xl ${hover ? 'hover:border-white/20 transition-all duration-300' : ''} ${className}`}>
      {children}
    </div>
  );
};

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const GradientButton: React.FC<GradientButtonProps> = ({ children, className = '', variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 text-white hover:opacity-90 shadow-[0_0_15px_rgba(99,102,241,0.3)]',
    secondary: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
    danger: 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
  };

  return (
    <button 
      className={`px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-8">
    <h1 className="text-2xl font-display font-extrabold text-white mb-1">{title}</h1>
    {subtitle && <p className="text-white/50 text-sm font-medium">{subtitle}</p>}
  </div>
);

export const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color?: string; onClick?: () => void }> = ({ title, value, icon, color = 'var(--accent-primary)', onClick }) => (
  <GlassCard 
    className={`p-5 flex flex-col gap-4 border-l-4 ${onClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
    style={{ borderLeftColor: color }}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest text-white/40">{title}</span>
      <div className="p-2 rounded-lg bg-white/5 text-white/60">
        {icon}
      </div>
    </div>
    <div className="text-3xl font-display font-black text-white">{value}</div>
  </GlassCard>
);

export const StatusBadge: React.FC<{ status: string; variant?: string }> = ({ status, variant = 'info' }) => {
  const variants: any = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/10 border-red-500/20 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    accent: 'bg-[#00B4D8]/10 border-[#00B4D8]/20 text-[#00B4D8]',
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${variants[variant]}`}>
      {status}
    </span>
  );
};
