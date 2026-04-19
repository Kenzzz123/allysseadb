import React, { useState } from 'react';
import { X, Shield, Key, AlertCircle, CheckCircle2, User, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { updatePassword, deleteUser as deleteAuthUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { currentUser, userProfile, logout } = useAuth();
  const { deleteUser } = useData();
  const [activeTab, setActiveTab] = useState<'security'>('security');
  
  const [newUsername, setNewUsername] = useState(userProfile?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const [pin, setPin] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(!!userProfile?.twoFactorPin);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    // If admin and has PIN, check it
    if (userProfile?.role === 'admin' && userProfile.twoFactorPin) {
      if (deletePin !== userProfile.twoFactorPin) {
        setDeleteError('Incorrect Security PIN');
        return;
      }
    }

    try {
      setLoading(true);
      await deleteUser(currentUser.uid);
      await deleteAuthUser(currentUser);
      onClose();
      await logout();
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setDeleteError('Requires recent login. Please re-login and try again.');
      } else {
        // Even if auth delete fails, the firestore data is likely gone or will be handled
        setDeleteError(error.message || 'Failed to delete account');
        // Final attempt to logout
        await logout();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-300 rounded-full hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {message.text && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50'}`}>
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Change Username Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold">
              <User className="w-5 h-5 text-indigo-400" />
              <h3>Account Profile</h3>
            </div>
            <form onSubmit={handleUpdateUsername} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                  placeholder="Your username"
                  maxLength={30}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newUsername.trim() || newUsername === userProfile?.username}
                className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-indigo-500/10"
              >
                {loading ? 'Processing...' : 'Update Details'}
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="space-y-4 pt-6 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-white font-bold">
              <Key className="w-5 h-5 text-indigo-400" />
              <h3>Change Password</h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
              >
                {loading ? 'Processing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* 2-Step Verification (Admin Only) */}
          {userProfile?.role === 'admin' && (
            <div className="space-y-4 pt-6 border-t border-neutral-800">
              <div className="flex items-center gap-2 text-white font-bold">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3>2-Step Verification (Admin)</h3>
              </div>
              <p className="text-sm text-neutral-500">
                Require a custom PIN code when accessing the admin dashboard.
              </p>
              
              {!is2FAEnabled ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Set a Security PIN</label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-4 py-2 bg-black border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                      placeholder="e.g. 1234"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={loading || pin.length < 4}
                    className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 disabled:opacity-50 transition-all active:scale-95 shadow-lg"
                  >
                    Activate Security Layer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1">Enter PIN to Disable</label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-4 py-2 bg-black border border-neutral-800 text-white rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                      placeholder="••••"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={loading || pin.length < 4}
                    className="w-full py-2 bg-red-900/30 text-red-400 rounded-xl font-medium hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                  >
                    Disable 2-Step Verification
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Delete Account Section */}
          <div className="space-y-4 pt-6 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <Trash2 className="w-5 h-5" />
              <h3>Danger Zone</h3>
            </div>
            <p className="text-sm text-neutral-500">
              Permanently delete your account and all associated records. This action is irreversible.
            </p>
            <button
              onClick={() => {
                setDeleteStep(1);
                setShowDeleteConfirm(true);
              }}
              className="w-full py-3 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95"
            >
              Terminate Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal (2SV) */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
              <div className="w-16 h-16 bg-red-900/30 text-red-500 border border-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">Delete Account?</h3>
              
              {deleteStep === 1 ? (
                <>
                  <p className="text-neutral-400 mb-6 text-center">
                    Are you absolutely sure? All your records, transactions, and profile data will be permanently erased.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        if (userProfile?.role === 'admin' && userProfile.twoFactorPin) {
                          setDeleteStep(2);
                        } else {
                          handleDeleteAccount();
                        }
                      }}
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                      Yes, Proceed to Delete
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="w-full py-3 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-neutral-400 text-center text-sm">
                    Enter your Admin Security PIN to confirm this action.
                  </p>
                  {deleteError && <div className="p-3 bg-red-900/30 border border-red-900/50 text-red-400 text-sm rounded-xl text-center">{deleteError}</div>}
                  <input
                    type="password"
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value)}
                    placeholder="Enter Security PIN"
                    className="w-full px-4 py-3 bg-black border border-neutral-800 text-white rounded-xl text-center font-bold text-2xl tracking-widest focus:ring-1 focus:ring-neutral-700 outline-none"
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      disabled={loading}
                      onClick={handleDeleteAccount}
                      className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button 
                      onClick={() => setDeleteStep(1)}
                      className="w-full py-3 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
