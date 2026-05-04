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
    <h1 className="text-4xl font-display font-bold text-white mb-2">{title}</h1>
    {subtitle && <p className="text-white/50 text-lg">{subtitle}</p>}
  </div>
);
