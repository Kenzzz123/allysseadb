import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signInWithRedirect,
  signOut, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  getRedirectResult
} from 'firebase/auth';
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
  resetPassword: (email: string) => Promise<void>;
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
    // Check for redirect result on mount
    getRedirectResult(auth).then(async (result) => {
      if (result?.user?.email) {
        const bannedDoc = await getDoc(doc(db, 'banned_emails', result.user.email));
        if (bannedDoc.exists()) {
          await signOut(auth);
          // We can't easily throw an error here that reaches the UI,
          // but onAuthStateChanged will trigger and currentUser will be null.
          // The landing page will show up.
        }
      }
    }).catch(err => {
      console.error("Redirect login error:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user?.email) {
          const bannedDoc = await getDoc(doc(db, 'banned_emails', user.email));
          if (bannedDoc.exists()) {
            setCurrentUser(null);
            await signOut(auth);
            setLoading(false);
            return;
          }
        }
        
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
              if (!data?.role) {
                updates.role = user.email === 'ferdinand262010@gmail.com' ? 'admin' : 'player';
              }
              if (!data?.username) {
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
          }, (err) => {
            console.error("Profile snapshot error:", err);
            setLoading(false);
          });

          // Handle offline status on disconnect with throttling/debouncing
          let statusTimeout: NodeJS.Timeout | null = null;
          const updateOnlineStatus = (isOnline: boolean) => {
            if (statusTimeout) clearTimeout(statusTimeout);
            
            // Debounce the update to avoid spamming writes on rapid tab switching
            statusTimeout = setTimeout(async () => {
              // Only update if the status is actually changed or if it's been a while
              // But we don't easily have the current actual DB value without a fetch
              // So we rely on the debounce to at least stop rapid changes.
              try {
                await setDoc(userRef, { 
                  online: isOnline, 
                  lastSeen: serverTimestamp() 
                }, { merge: true });
              } catch (err) {
                console.error("Error updating status:", err);
              }
            }, 3000); // 3 second debounce
          };

          const handleVisibilityChange = () => {
            updateOnlineStatus(document.visibilityState === 'visible');
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);

          return () => {
            unsubProfile();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            updateOnlineStatus(false);
          };
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // Check if it's a mobile device and if we're NOT in an iframe
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isInIframe = window.self !== window.top;

      let result;
      if (isMobile && !isInIframe) {
        // Redirect is better for mobile browsers when not in an iframe
        await signInWithRedirect(auth, googleProvider);
        return; // Redirect resets the page
      } else {
        // Popup is better for desktop and iframe environments
        result = await signInWithPopup(auth, googleProvider);
      }

      if (result?.user?.email) {
        const bannedDoc = await getDoc(doc(db, 'banned_emails', result.user.email));
        if (bannedDoc.exists()) {
          await signOut(auth);
          throw new Error('AKUN DI BANNED');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Login popup was blocked by your browser. Please allow popups or open this app in a new tab.');
      }
      throw error;
    }
  };

  const loginWithEmail = async (e: string, p: string) => {
    // Check if email is banned before login
    const bannedDoc = await getDoc(doc(db, 'banned_emails', e));
    if (bannedDoc.exists()) {
      throw new Error('AKUN DI BANNED');
    }

    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const registerWithEmail = async (e: string, p: string) => {
    // Check if email is banned
    const bannedDoc = await getDoc(doc(db, 'banned_emails', e));
    if (bannedDoc.exists()) {
      throw new Error('AKUN DI BANNED');
    }

    try {
      await createUserWithEmailAndPassword(auth, e, p);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Reset password error:', error);
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
    <AuthContext.Provider value={{ currentUser, userProfile, loading, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
