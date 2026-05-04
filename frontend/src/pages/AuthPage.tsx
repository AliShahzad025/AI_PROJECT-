import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppAuth } from '../lib/auth';
import { login, setUserRoleLocal } from '../lib/api';
import { ShieldCheck, GraduationCap, ShieldAlert, ArrowLeft } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function LoginPage() {
  const { user, loading } = useAppAuth();
  const navigate = useNavigate();
  const [isSettingRole, setIsSettingRole] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!loading && user?.role) {
      // User is logged in and has a role, redirect to their dashboard
      if (user.role === 'admin') navigate('/admin');
      if (user.role === 'student') navigate('/student');
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const proctoraiUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        role: 'student', // Default role
        createdAt: new Date().toISOString()
      };
      
      // Save user to Firestore
      await setDoc(doc(db, "users", firebaseUser.uid), proctoraiUser, { merge: true });
      
      localStorage.setItem('proctorai_user', JSON.stringify(proctoraiUser));
      localStorage.setItem('proctorai_token', 'firebase-dummy-token-' + firebaseUser.uid);
      
      window.location.reload();
    } catch (error: any) {
      setIsLoggingIn(false);
      alert("Failed to login: " + error.message);
    }
  };

  const handleSelectRole = async (role: 'admin' | 'student') => {
    if (!user || !user.email) return;
    setIsSettingRole(true);
    try {
      setUserRoleLocal(role);
    } catch (err) {
      console.error(err);
      alert("Failed to set role.");
      setIsSettingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-[#050505] items-center justify-center min-h-screen text-white">
        <div className="animate-spin text-indigo-500"><ShieldCheck className="w-10 h-10" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-4 relative">
      <Link to="/" className="absolute top-6 left-6 text-white/50 hover:text-white flex items-center gap-2 transition-colors z-20 font-medium text-sm p-2">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0A0A0C] border border-white/10 rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center relative z-10">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        <h2 className="text-3xl font-display font-bold text-center text-white mb-2 relative z-10">
          Welcome to ProctorAI
        </h2>

        {!user ? (
          <>
            <p className="text-center text-white/50 mb-8 relative z-10 text-sm">Sign in to your institution portal</p>
            <button
              disabled={isLoggingIn}
              onClick={handleLogin}
              className={`w-full relative z-10 flex items-center justify-center gap-3 bg-white text-black font-medium py-3 px-4 rounded-xl transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white/90'}`}
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              Continue with Google
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-white/50 mb-8 relative z-10 text-sm">
              Select your account role to continue
            </p>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <button
                disabled={isSettingRole}
                onClick={() => handleSelectRole('student')}
                className="flex flex-col items-center p-6 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-white/70 hover:text-white"
              >
                <GraduationCap className="w-8 h-8 mb-3 text-blue-400" />
                <span className="font-medium">Student</span>
              </button>
              <button
                disabled={isSettingRole}
                onClick={() => handleSelectRole('admin')}
                className="flex flex-col items-center p-6 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-white/70 hover:text-white"
              >
                <ShieldAlert className="w-8 h-8 mb-3 text-red-400" />
                <span className="font-medium">Admin</span>
              </button>
            </div>
            {isSettingRole && <p className="text-center mt-4 text-sm text-indigo-400">Configuring account...</p>}
          </>
        )}
      </motion.div>
    </div>
  );
}
