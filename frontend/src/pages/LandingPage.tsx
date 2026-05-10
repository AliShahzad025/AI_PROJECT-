import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppAuth } from '../lib/auth';
import { 
  ShieldCheck, Eye, Smartphone, FileCheck2, Lock, ArrowRight, Play, 
  GraduationCap, Building2, CheckCircle2, BrainCircuit, AlertTriangle, Fingerprint
} from 'lucide-react';

export default function LandingPage() {
  const { user, loading } = useAppAuth();
  const navigate = useNavigate();

  const handlePortalAccess = () => {
    console.log("Accessing portal, user:", user);
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin');
    } else if (user.role === 'student') {
      navigate('/student');
    } else {
      console.warn("User has no role, redirecting to login to select one.");
      // If user exists but role is missing, we might need to select a role
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0D1117]/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl tracking-tight">
            <ShieldCheck className="w-6 h-6 text-[#00B4D8]" />
            <span>SEPS</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          </div>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <button onClick={handlePortalAccess} className="bg-[#00B4D8] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#00B4D8]/90 outline-none transition-all flex items-center gap-2 cursor-pointer">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link to="/login">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="hidden md:block text-sm font-medium hover:text-[#00B4D8] transition-colors cursor-pointer text-white/60">
                    Log In
                  </motion.button>
                </Link>
                <Link to="/login">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#00B4D8] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#00B4D8]/90 outline-none transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,180,216,0.2)] hover:shadow-[0_0_25px_rgba(0,180,216,0.4)] cursor-pointer">
                    Portal Access <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex flex-col items-center justify-center text-center px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#00B4D8]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#0077B6]/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#00B4D8] mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00B4D8] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B4D8]"></span>
            </span>
            Smart Exam Proctoring System v2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight leading-[1.1] mb-6 text-white">
             The intelligent standard for <br />
            <span className="text-[#00B4D8]">secure assessments.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed font-body">
            Ensure academic integrity with AI-driven monitoring, real-time behavioral analytics, and seamless institutional workflows. The platform built for modern educators.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <Link to="/login">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto bg-[#00B4D8] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#00B4D8]/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,180,216,0.15)] hover:shadow-[0_0_30px_rgba(0,180,216,0.3)] cursor-pointer">
                  Enter Portal <ArrowRight className="w-4 h-4" />
                </motion.button>
             </Link>
          </div>
        </motion.div>

        {/* Simple Features Summary - LLM Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full max-w-6xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left px-4"
        >
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#00B4D8]/30 transition-all">
            <div className="w-10 h-10 bg-[#00B4D8]/10 rounded-xl flex items-center justify-center mb-4">
               <ShieldCheck className="w-5 h-5 text-[#00B4D8]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Academic Integrity</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Maintain the highest standards with intelligent monitoring that ensures every exam is fair and every grade is earned.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#00B4D8]/30 transition-all">
            <div className="w-10 h-10 bg-[#00B4D8]/10 rounded-xl flex items-center justify-center mb-4">
               <BrainCircuit className="w-5 h-5 text-[#00B4D8]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Smart Observations</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Our system understands natural student behavior, focusing only on genuine security threats while respecting privacy.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#00B4D8]/30 transition-all">
            <div className="w-10 h-10 bg-[#00B4D8]/10 rounded-xl flex items-center justify-center mb-4">
               <CheckCircle2 className="w-5 h-5 text-[#00B4D8]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Total Control</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              From automated grading to detailed audit logs, manage the entire exam lifecycle from a single, intuitive interface.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 md:py-32 max-w-7xl mx-auto px-6 relative">
         <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">Built for Secure Assessments</h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg hover:text-white transition-colors duration-300">
               Everything you need to maintain academic integrity, packed into a single, seamless platform.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 (Large) */}
            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="md:col-span-2 bg-glass rounded-3xl p-8 glow-effect flex flex-col justify-between group overflow-hidden relative transition-shadow hover:shadow-[0_8px_30px_rgba(0,180,216,0.15)]">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B4D8]/10 blur-[80px] rounded-full group-hover:bg-[#00B4D8]/20 transition-all duration-500" />
               <div className="relative z-10 w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <BrainCircuit className="w-7 h-7 text-[#00B4D8]" />
               </div>
               <div className="relative z-10 mt-auto pt-32">
                  <h3 className="text-2xl font-bold font-display mb-2">AI Behavioral Analysis</h3>
                  <p className="text-white/60 leading-relaxed">
                     Our proprietary models analyze eye movement, posture, and micro-expressions in real-time. Detects suspicious behavior with 99% accuracy without violating student privacy.
                  </p>
               </div>
            </motion.div>

            {/* Feature 2 (Tall) */}
            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="bg-glass rounded-3xl p-8 glow-effect flex flex-col group overflow-hidden relative transition-shadow hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]">
               <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full" />
               <div className="relative z-10 w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                  <Fingerprint className="w-7 h-7 text-purple-400" />
               </div>
               <h3 className="text-2xl font-bold font-display mb-2 mt-auto">Automated ID Verification</h3>
               <p className="text-white/60 leading-relaxed text-sm">
                  Seamlessly verify student identities pre-exam using facial recognition against official university records.
               </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="bg-glass rounded-3xl p-8 glow-effect group transition-shadow hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)]">
               <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-6">
                  <Lock className="w-6 h-6 text-blue-400" />
               </div>
               <h3 className="text-xl font-bold font-display mb-2">Browser Lockdown</h3>
               <p className="text-white/60 text-sm">
                  Restricts access to dual monitors, keyboard shortcuts, external sites, and unauthorized applications.
               </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="bg-glass rounded-3xl p-8 glow-effect group border border-red-500/10 transition-all hover:border-red-500/30 hover:shadow-[0_8px_30px_rgba(248,113,113,0.15)]">
               <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
               </div>
               <h3 className="text-xl font-bold font-display mb-2">Real-Time Alerts</h3>
               <p className="text-white/60 text-sm">
                  Live proctors receive instantly flagged timestamps for manual review when AI detects anomalies.
               </p>
            </motion.div>

            {/* Feature 5 */}
            <motion.div whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300 }} className="bg-glass rounded-3xl p-8 glow-effect group overflow-hidden relative transition-shadow hover:shadow-[0_8px_30px_rgba(74,222,128,0.15)]">
               {/* Decorative background grid */}
               <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
               <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-6 relative z-10">
                  <FileCheck2 className="w-6 h-6 text-green-400" />
               </div>
               <h3 className="text-xl font-bold font-display mb-2 relative z-10">Detailed Audit Logs</h3>
               <p className="text-white/60 text-sm relative z-10">
                  Comprehensive post-exam reports including severity scores, video clips, and behavioral graphs.
               </p>
            </motion.div>
         </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 relative border-t border-white/5 bg-[#08080A]">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-8">
               <div className="max-w-2xl">
                  <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">Plug & play integration.</h2>
                  <p className="text-lg text-white/60">Get your institution set up in minutes, not months. ProctorAI integrates directly into your existing workflow.</p>
               </div>
               <div className="flex gap-4">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium">View API Docs</motion.button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
               {[
                  { title: "Connect LMS", desc: "One-click integrations for Canvas, Blackboard, and Moodle." },
                  { title: "Configure Rules", desc: "Select AI strictness, lockdown settings, and allowed materials." },
                  { title: "Students Verify", desc: "30-second automated facial ID check before starting." },
                  { title: "Review Results", desc: "Access the dashboard for flagged incidents and video logs." }
               ].map((step, i) => (
                  <div key={i} className="relative">
                     {/* Connector line */}
                     {i < 3 && <div className="hidden md:block absolute top-6 left-12 w-full h-[1px] bg-white/10" />}
                     
                     <div className="relative z-10 w-12 h-12 rounded-full bg-[#00B4D8]/20 border border-[#00B4D8]/50 flex items-center justify-center text-[#00B4D8] font-bold mb-6">
                        {i + 1}
                     </div>
                     <h4 className="text-lg font-bold font-display mb-2">{step.title}</h4>
                     <p className="text-sm text-white/60">{step.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
         <div className="absolute inset-0 bg-indigo-500/10 blur-[150px] pointer-events-none" />
         <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold font-display mb-6">Ready to secure your exams?</h2>
            <p className="text-xl text-white/60 mb-10">
               Join hundreds of institutions using ProctorAI to maintain academic integrity on a massive scale.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto bg-[#00B4D8] text-white px-8 py-4 rounded-full font-bold hover:bg-[#00B4D8]/90 transition-all shadow-[0_0_40px_rgba(0,180,216,0.4)] hover:shadow-[0_0_60px_rgba(0,180,216,0.6)]">
                 Start Your Free Trial
               </motion.button>
               <motion.button 
                 whileHover={{ scale: 1.05 }} 
                 whileTap={{ scale: 0.95 }} 
                 onClick={() => window.open('https://wa.me/923218528796', '_blank')}
                 className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 px-8 py-4 rounded-full font-medium transition-all cursor-pointer"
               >
                 Contact Sales
               </motion.button>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/40">
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cancel anytime</li>
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> SOC2 Compliant</li>
               <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 24/7 Support</li>
            </ul>
         </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#050505] py-12">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-12">
            <div className="max-w-xs">
               <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight mb-4">
                 <ShieldCheck className="w-6 h-6 text-indigo-400" />
                 <span>Proctor<span className="text-white/60">AI</span></span>
               </div>
               <p className="text-sm text-white/40 leading-relaxed">
                  Building the future of secure, accessible, and intelligent online assessments for everyone.
               </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 text-sm">
               <div>
                  <h5 className="font-semibold text-white mb-4">Product</h5>
                  <ul className="flex flex-col gap-2 text-white/50">
                     <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
                  </ul>
               </div>
               <div>
                  <h5 className="font-semibold text-white mb-4">Resources</h5>
                  <ul className="flex flex-col gap-2 text-white/50">
                     <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                  </ul>
               </div>
               <div>
                  <h5 className="font-semibold text-white mb-4">Company</h5>
                  <ul className="flex flex-col gap-2 text-white/50">
                     <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                     <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                  </ul>
               </div>
            </div>
         </div>
         <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-center text-sm text-white/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2026 ProctorAI Inc. All rights reserved.</p>
            <div className="flex gap-4">
               <a href="#" className="hover:text-white transition-colors">Twitter</a>
               <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
               <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
         </div>
      </footer>
    </div>
  );
}
