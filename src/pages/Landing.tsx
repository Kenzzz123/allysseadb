import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Gamepad2, Shield, Zap, Users, ArrowRight } from 'lucide-react';

export default function Landing() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, currentUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  React.useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] py-12 px-4 relative overflow-hidden">
      {/* Immersive background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-primary/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="text-center max-w-4xl mx-auto space-y-8 relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-neutral-900/60 backdrop-blur-xl border border-white/5 text-neutral-300 font-bold text-xs uppercase tracking-[0.2em] shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
          </span>
          Live Real-time Database
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-display font-black tracking-tight text-white uppercase italic leading-[0.9] select-none text-balance">
          Manage your game <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-amber-200 to-indigo-300 drop-shadow-[0_0_30px_rgba(250,204,21,0.1)]">
            Characters live
          </span>
        </h1>
        
        <p className="text-base sm:text-lg text-neutral-450 max-w-2xl mx-auto font-medium leading-relaxed tracking-wide text-zinc-400">
          The ultimate database cockpit for game character management. 
          Experience instant synchronization, live stat tracking, and collaborative moderator tools.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={loginWithGoogle}
            className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-black font-display font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-[0_0_30px_rgba(250,204,21,0.15)] flex items-center justify-center gap-3 border border-white/20 active:scale-95 hover:bg-white hover:text-black hover:shadow-[0_0_40px_rgba(250,204,21,0.3)] duration-300 cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Email Form with stunning neon design */}
        <div className="mt-12 max-w-sm mx-auto bg-neutral-900/40 backdrop-blur-3xl p-8 rounded-[2rem] shadow-2xl border border-white/5 relative group/form hover:border-brand-primary/20 transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-primary/5 to-transparent opacity-0 group-hover/form:opacity-100 transition-all duration-500 rounded-[2rem]" />
          
          <h3 className="text-xs font-black text-neutral-300 uppercase tracking-[0.2em] mb-6 font-display italic text-center relative z-10 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            {isResetting ? 'Reset Password' : 'Login'}
          </h3>
          
          {error && (
            <div className="mb-6 p-4 bg-red-900/10 border border-red-500/15 text-red-400 text-[11px] font-bold uppercase tracking-wider rounded-xl relative z-10">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-900/10 border border-emerald-500/15 text-emerald-400 text-[11px] font-bold uppercase tracking-wider rounded-xl relative z-10">
              {success}
            </div>
          )}
          
          <form className="space-y-4 relative z-10" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1 text-left">
              <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest pl-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@allyssea.com" 
                required 
                className="w-full px-5 py-3.5 border border-white/5 bg-black/60 text-white placeholder-neutral-600 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-all text-xs font-bold font-mono" 
              />
            </div>
            
            {!isResetting && (
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase text-neutral-500 tracking-widest pl-1">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  className="w-full px-5 py-3.5 border border-white/5 bg-black/60 text-white placeholder-neutral-600 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary focus:outline-none transition-all text-xs font-bold font-mono" 
                />
              </div>
            )}
            
            <div className="flex flex-col gap-3 pt-3">
              {isResetting ? (
                <>
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (!email) { setError('Please enter your email address first.'); return; }
                      try { 
                        setError(''); 
                        setSuccess('');
                        await resetPassword(email); 
                        setSuccess('Password reset link sent! Please check your email inbox.');
                        setIsResetting(false);
                      } 
                      catch (err: any) { setError(err.message || 'Reset failed'); }
                    }}
                    className="w-full py-4 bg-brand-primary text-black rounded-xl font-display font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-primary/10 transition-all hover:bg-white cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsResetting(false); setError(''); setSuccess(''); }}
                    className="w-full py-4 bg-neutral-800 text-neutral-400 rounded-xl font-display font-black uppercase tracking-widest text-[10px] hover:bg-neutral-700 hover:text-white transition-all cursor-pointer"
                  >
                    Back to Login
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={async () => {
                        try { setError(''); setSuccess(''); await loginWithEmail(email, password); } 
                        catch (err: any) { 
                          if (err.code === 'auth/operation-not-allowed') {
                            setError('Email/Password login is not enabled.');
                          } else if (err.code === 'auth/invalid-credential') {
                            setError("Invalid credentials. Try registering a new account!");
                          } else {
                            setError(err.message || 'Login failed'); 
                          }
                        }
                      }}
                      className="flex-1 py-4 bg-neutral-100 text-black rounded-xl font-display font-black uppercase tracking-widest text-[10px] transition-all hover:bg-brand-primary active:scale-95 cursor-pointer"
                    >
                      Login
                    </button>
                    <button 
                      type="button" 
                      onClick={async () => {
                        try { setError(''); setSuccess(''); await registerWithEmail(email, password); } 
                        catch (err: any) { 
                          if (err.code === 'auth/operation-not-allowed') {
                            setError('Email/Password registration is not enabled.');
                          } else {
                            setError(err.message || 'Registration failed'); 
                          }
                        }
                      }}
                      className="flex-1 py-4 bg-neutral-850 border border-white/5 text-neutral-300 rounded-xl font-display font-black uppercase tracking-widest text-[10px] transition-all hover:bg-neutral-800 hover:text-white active:scale-95 cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setIsResetting(true); setError(''); setSuccess(''); }}
                    className="text-[10px] text-neutral-500 hover:text-white mt-1 text-center transition-colors font-bold uppercase tracking-wider"
                  >
                    Forgot Password?
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Feature Bento Section */}
      <div className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mx-auto relative z-10 px-4">
        <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-xl hover:border-brand-primary/20 transition-all duration-300 group/feature relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl group-hover/feature:bg-brand-primary/10 transition-all" />
          <div className="w-12 h-12 bg-black/40 text-brand-primary border border-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-display font-black uppercase tracking-tight text-white mb-2 italic">Instant Sync</h3>
          <p className="text-xs text-neutral-450 leading-relaxed font-medium text-zinc-400">All level-ups, parameter modifications, and Vela assets update in real-time instantly.</p>
        </div>
        <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-xl hover:border-brand-secondary/20 transition-all duration-300 group/feature relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-secondary/5 rounded-full blur-2xl group-hover/feature:bg-brand-secondary/10 transition-all" />
          <div className="w-12 h-12 bg-black/40 text-brand-secondary border border-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-display font-black uppercase tracking-tight text-white mb-2 italic">Secure verification</h3>
          <p className="text-xs text-neutral-450 leading-relaxed font-medium text-zinc-400">Integrates strict client authorization, optional multi-digit PIN locks, and secure administrative rules.</p>
        </div>
        <div className="bg-neutral-900/30 backdrop-blur-xl border border-white/5 p-8 rounded-[2rem] shadow-xl hover:border-brand-primary/20 transition-all duration-300 group/feature relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl group-hover/feature:bg-brand-primary/10 transition-all" />
          <div className="w-12 h-12 bg-black/40 text-brand-primary border border-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-md">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-display font-black uppercase tracking-tight text-white mb-2 italic">Interactive Dashboard</h3>
          <p className="text-xs text-neutral-450 leading-relaxed font-medium text-zinc-400">Manage, sort, filter, and track balances, activity logs, and standings in one continuous beautiful space.</p>
        </div>
      </div>
    </div>
  );
}
