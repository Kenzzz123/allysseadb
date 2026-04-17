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
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-medium text-sm mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Live Real-time Database
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
          Manage your game <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            characters in real-time
          </span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
          The ultimate single-page application for game character database management. 
          Experience instant updates, live stat tracking, and collaborative admin tools.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={loginWithGoogle}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-8 max-w-sm mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            {isResetting ? 'Reset Password' : 'Or use Email / Password'}
          </h3>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl">{success}</div>}
          
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (e.g. admin@game.com)" 
              required 
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500" 
            />
            {!isResetting && (
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" 
                required 
                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500" 
              />
            )}
            
            <div className="flex flex-col gap-2">
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
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                  >
                    Send Reset Link
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsResetting(false); setError(''); setSuccess(''); }}
                    className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-medium"
                  >
                    Back to Login
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={async () => {
                        try { setError(''); setSuccess(''); await loginWithEmail(email, password); } 
                        catch (err: any) { 
                          if (err.code === 'auth/operation-not-allowed') {
                            setError('Email/Password login is not enabled. Please enable it in the Firebase Console (Authentication > Sign-in method), or use Google Login.');
                          } else if (err.code === 'auth/invalid-credential') {
                            setError("Invalid email or password. If you haven't created this account yet, please click 'Register' instead.");
                          } else {
                            setError(err.message || 'Login failed'); 
                          }
                        }
                      }}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                    >
                      Login
                    </button>
                    <button 
                      type="button" 
                      onClick={async () => {
                        try { setError(''); setSuccess(''); await registerWithEmail(email, password); } 
                        catch (err: any) { 
                          if (err.code === 'auth/operation-not-allowed') {
                            setError('Email/Password login is not enabled. Please enable it in the Firebase Console (Authentication > Sign-in method), or use Google Login.');
                          } else {
                            setError(err.message || 'Registration failed'); 
                          }
                        }
                      }}
                      className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200"
                    >
                      Register
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setIsResetting(true); setError(''); setSuccess(''); }}
                    className="text-sm text-indigo-600 hover:underline mt-2 text-center"
                  >
                    Forgot Password?
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Sync</h3>
          <p className="text-slate-600">Every stat change, level up, and gold drop reflects instantly across all connected clients.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Secure Roles</h3>
          <p className="text-slate-600">Built-in player and admin roles with strict Firestore security rules protecting your data.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Live Analytics</h3>
          <p className="text-slate-600">Watch the game economy and player progression unfold in real-time on the admin dashboard.</p>
        </div>
      </div>
    </div>
  );
}
