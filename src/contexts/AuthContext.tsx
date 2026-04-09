import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export interface UserProfile {
  username: string;
  email: string;
  role: 'player' | 'admin' | 'system';
  createdAt: number;
  lastSeen: number;
  online: boolean;
  twoFactorPin?: string | null;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        // First check if doc exists to avoid race condition
        try {
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists()) {
            const isAdmin = user.email === 'ferdinand262010@gmail.com';
            const newProfile: UserProfile = {
              username: user.displayName || user.email?.split('@')[0] || 'Player',
              email: user.email || '',
              role: isAdmin ? 'admin' : 'player',
              createdAt: Date.now(),
              lastSeen: Date.now(),
              online: true,
            };
            await setDoc(userRef, newProfile);
          } else {
            const data = docSnap.data();
            const updates: any = { lastSeen: Date.now(), online: true };
            // Fix corrupted profiles that might be missing fields due to previous race condition
            if (!data.role) {
              updates.role = user.email === 'ferdinand262010@gmail.com' ? 'admin' : 'player';
            }
            if (!data.username) {
              updates.username = user.displayName || user.email?.split('@')[0] || 'Player';
            }
            await setDoc(userRef, updates, { merge: true });
          }
        } catch (err) {
          console.error("Error initializing user profile:", err);
        }

        // Set up real-time listener for user profile
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
          setLoading(false);
        });

        // Handle offline status on disconnect or tab hide
        const updateOnlineStatus = (isOnline: boolean) => {
          setDoc(userRef, { online: isOnline, lastSeen: Date.now() }, { merge: true }).catch(console.error);
        };

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            updateOnlineStatus(true);
          } else {
            updateOnlineStatus(false);
          }
        };

        const handlePageHide = () => {
          updateOnlineStatus(false);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
          unsubProfile();
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('pagehide', handlePageHide);
          window.removeEventListener('beforeunload', handlePageHide);
          // Set offline when unmounting
          updateOnlineStatus(false);
        };
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithEmail = async (e: string, p: string) => {
    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const registerWithEmail = async (e: string, p: string) => {
    try {
      await createUserWithEmailAndPassword(auth, e, p);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { online: false, lastSeen: Date.now() }, { merge: true });
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
