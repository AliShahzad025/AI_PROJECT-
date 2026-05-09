import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppAuth, notifyAuthChange } from '../lib/auth';
import { ShieldCheck, GraduationCap, ShieldAlert, ArrowLeft, Mail, Lock, User, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { GlassCard, GradientButton } from '../components/UI';
import { toast } from 'sonner';
import { register as apiRegister, login as apiLogin, googleLogin } from '../lib/api';

export default function AuthPage() {
  const { user, loading } = useAppAuth();
  const navigate = useNavigate();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'instructor' | 'admin' | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role && user.isVerified !== false) {
        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'instructor') navigate('/instructor');
        else if (user.role === 'student') navigate('/student');
      }
    }
  }, [user, loading, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    if (!email || !password || (isRegistering && !name)) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegistering) {
        if (!selectedRole) {
          toast.error("Please select a role first");
          setIsSubmitting(false);
          return;
        }
        const newUser = await apiRegister(email, password, name, selectedRole);
        toast.success("Account created successfully! Admin approval is required.");
        notifyAuthChange();
        navigate('/login'); // Show pending verification screen
      } else {
        const loggedInUser = await apiLogin(email, password);
        toast.success("Welcome back!");
        notifyAuthChange();
        // Navigate based on role immediately
        if (loggedInUser.role === 'admin') navigate('/admin');
        else if (loggedInUser.role === 'instructor') navigate('/instructor');
        else navigate('/student');
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();
      
      // Call backend to verify token and get JWT
      const loggedInUser = await googleLogin(idToken);
      
      notifyAuthChange();
      toast.success("Welcome back!");
      
      if (loggedInUser.role === 'admin') navigate('/admin');
      else if (loggedInUser.role === 'instructor') navigate('/instructor');
      else if (loggedInUser.role === 'student') navigate('/student');
      else {
          // If for some reason role is still missing
          toast.info("Please select your role to continue");
      }
    } catch (error: any) {
      toast.error("Authentication failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelection = async (role: 'student' | 'instructor' | 'admin') => {
    if (!user) {
        setSelectedRole(role);
        return;
    }

    setIsSubmitting(true);
    try {
      const updatedUser = {
        ...user,
        role,
        isVerified: false // Everyone needs admin approval now
      };
      await setDoc(doc(db, "users", user.uid), updatedUser, { merge: true });
      localStorage.setItem('proctorai_user', JSON.stringify(updatedUser));
      notifyAuthChange();
      toast.success(`Role set to ${role}`);
      if (role === 'admin') navigate('/admin');
      else if (role === 'instructor') navigate('/instructor');
      else navigate('/student');
    } catch (error: any) {
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  // View: Pending Verification
  if (user && user.role && user.isVerified === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md z-10 text-center">
            <div className="w-24 h-24 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                <AlertCircle className="w-12 h-12 text-amber-500" />
                <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white mb-4">Verification Pending</h2>
            <p className="text-white/50 mb-8 leading-relaxed">
                Your account as an <span className="text-amber-400 font-bold">{user.role}</span> requires administrator approval. Please contact your institution's system administrator.
            </p>
            <GradientButton onClick={() => { localStorage.removeItem('proctorai_user'); localStorage.removeItem('proctorai_token'); notifyAuthChange(); navigate('/login'); }} variant="secondary" className="px-8">
                Sign Out
            </GradientButton>
        </motion.div>
      </div>
    );
  }

  // View: Role Selection (for existing users without a role)
  if (user && !user.role) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg z-10">
          <GlassCard className="p-10 shadow-2xl" hover={false}>
            <h2 className="text-4xl font-display font-bold text-center text-white mb-2">Select Your Role</h2>
            <p className="text-center text-white/40 mb-10 text-sm">Configure your institutional profile to access the platform</p>
            <div className="grid grid-cols-1 gap-4">
              <RoleButton 
                active={false}
                onClick={() => handleRoleSelection('student')}
                icon={<GraduationCap className="w-6 h-6 text-blue-400" />} 
                title="Student" 
                desc="Take exams and view results." 
              />
              <RoleButton 
                active={false}
                onClick={() => handleRoleSelection('instructor')}
                icon={<User className="w-6 h-6 text-purple-400" />} 
                title="Instructor" 
                desc="Create exams and review alerts." 
              />
              <RoleButton 
                active={false}
                onClick={() => handleRoleSelection('admin')}
                icon={<ShieldAlert className="w-6 h-6 text-red-400" />} 
                title="Administrator" 
                desc="System and user management." 
              />
            </div>
            <div className="mt-8 text-center">
                 <button onClick={() => { localStorage.removeItem('proctorai_user'); localStorage.removeItem('proctorai_token'); notifyAuthChange(); navigate('/login'); }} className="text-white/30 hover:text-white text-xs transition-colors">Sign out and use a different account</button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <Link 
        to="/" 
        className="absolute top-8 left-8 text-white/50 hover:text-white flex items-center gap-2 transition-all font-medium text-sm p-2 hover:translate-x-[-4px]"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 bg-glass border border-white/10 rounded-3xl flex items-center justify-center relative shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
          </div>
        </div>

        <GlassCard className="p-8 shadow-2xl" hover={false}>
          <h2 className="text-3xl font-display font-bold text-center text-white mb-2">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-center text-white/40 mb-8 text-sm">
            {isRegistering ? 'Join the secure proctoring network' : 'Sign in to continue your assessment'}
          </p>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isRegistering && (
                <>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-indigo-500/30 transition-all" 
                      placeholder="Full Name" 
                    />
                </div>
                <div className="pt-2">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-2 block">Choose Your Role</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['student', 'instructor', 'admin'] as const).map(r => (
                            <button 
                              key={r}
                              type="button"
                              onClick={() => setSelectedRole(r)}
                              className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${selectedRole === r ? 'bg-indigo-500/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-white/30 hover:bg-white/10'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                </>
            )}
            <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-indigo-500/30 transition-all" 
                  placeholder="Institutional Email" 
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input 
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:border-indigo-500/30 transition-all" 
                  placeholder="Password" 
                />
            </div>

            <GradientButton disabled={isSubmitting} type="submit" className="w-full py-4 text-sm font-bold uppercase tracking-widest">
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" /> : (isRegistering ? 'Create Account' : 'Sign In')}
            </GradientButton>
          </form>

          <div className="relative flex items-center justify-center py-6">
            <div className="absolute w-full h-[1px] bg-white/5" />
            <span className="relative bg-[#0A0A0C] px-4 text-[10px] uppercase tracking-widest text-white/20">or continue with</span>
          </div>

          <button
            disabled={isSubmitting}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm">Google Account</span>
          </button>

          <p className="text-center text-xs text-white/30 mt-8">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}

function RoleButton({ icon, title, desc, onClick, active }: { icon: any, title: string, desc: string, onClick: () => void, active: boolean }) {
  return (
    <button 
        onClick={onClick}
        className={`flex items-center gap-5 p-5 border rounded-2xl transition-all text-left group ${active ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
    >
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${active ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-black/40 border-white/10 group-hover:border-white/30'}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-[10px] text-white/30 uppercase tracking-widest">{desc}</div>
      </div>
    </button>
  );
}
