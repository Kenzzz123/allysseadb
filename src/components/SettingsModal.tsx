import React, { useState } from 'react';
import { X, Shield, Key, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'security'>('security');
  
  const [newUsername, setNewUsername] = useState(userProfile?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const [pin, setPin] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(!!userProfile?.twoFactorPin);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setMessage({ type: 'error', text: 'Username cannot be empty' });
      return;
    }
    
    try {
      setLoading(true);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { username: newUsername.trim() }, { merge: true });
        setMessage({ type: 'success', text: 'Username updated successfully' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to update username' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      setLoading(true);
      if (currentUser) {
        await updatePassword(currentUser, newPassword);
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: 'Please log out and log back in to change your password.' });
      } else {
        setMessage({ type: 'error', text: error.message || 'Failed to update password' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    
    try {
      setLoading(true);
      const userRef = doc(db, 'users', currentUser.uid);
      
      if (is2FAEnabled) {
        // Disable 2FA
        if (pin !== userProfile.twoFactorPin) {
          setMessage({ type: 'error', text: 'Incorrect PIN. Cannot disable 2-Step Verification.' });
          setLoading(false);
          return;
        }
        await setDoc(userRef, { twoFactorPin: null }, { merge: true });
        setIs2FAEnabled(false);
        setPin('');
        setMessage({ type: 'success', text: '2-Step Verification disabled' });
      } else {
        // Enable 2FA
        if (pin.length < 4) {
          setMessage({ type: 'error', text: 'PIN must be at least 4 digits' });
          setLoading(false);
          return;
        }
        await setDoc(userRef, { twoFactorPin: pin }, { merge: true });
        setIs2FAEnabled(true);
        setPin('');
        setMessage({ type: 'success', text: '2-Step Verification enabled' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to update 2FA settings' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {message.text && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Change Username Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <User className="w-5 h-5 text-indigo-500" />
              <h3>Account Profile</h3>
            </div>
            <form onSubmit={handleUpdateUsername} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your username"
                  maxLength={30}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Update Username
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Key className="w-5 h-5 text-indigo-500" />
              <h3>Change Password</h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                Update Password
              </button>
            </form>
          </div>

          {/* 2-Step Verification (Admin Only) */}
          {userProfile?.role === 'admin' && (
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3>2-Step Verification (Admin)</h3>
              </div>
              <p className="text-sm text-slate-500">
                Require a custom PIN code when accessing the admin dashboard.
              </p>
              
              {!is2FAEnabled ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Set a Security PIN</label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. 1234"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={loading || pin.length < 4}
                    className="w-full py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    Enable 2-Step Verification
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enter PIN to Disable</label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="••••"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={loading || pin.length < 4}
                    className="w-full py-2 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    Disable 2-Step Verification
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
