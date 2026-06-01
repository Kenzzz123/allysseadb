import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface CharacterStats {
  level: number;
  karmaPoint: number;
  vela: number;
  totalIncome: number;
  totalExpense: number;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  keywords?: string[];
  isSystem?: boolean;
  pin?: string;
  stats: CharacterStats;
  createdAt: number;
  updatedAt: number;
}

export interface Log {
  id: string;
  charId: string;
  charName?: string;
  userId: string;
  username?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'UPDATE BY ADMIN';
  oldData?: Partial<CharacterStats>;
  newData?: Partial<CharacterStats>;
  from?: string;
  reason?: string;
  timestamp: number;
}

export interface Transaction {
  id: string;
  senderCharId: string;
  senderCharName: string;
  senderUserId: string;
  recipientCharId: string;
  recipientCharName: string;
  recipientUserId: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface AdminWarning {
  id: string;
  userId: string;
  userEmail: string;
  charId: string;
  charName: string;
  type: 'Vela' | 'Level';
  amount: number;
  message: string;
  timestamp: number;
}

interface DataContextType {
  characters: Character[];
  topVela: Character[];
  topLevel: Character[];
  allCharacters: Character[]; // For admin
  allUsers: any[]; // For admin
  logs: Log[];
  allLogs: Log[]; // For admin
  transactions: Transaction[];
  allTransactions: Transaction[]; // For admin
  adminWarnings: AdminWarning[]; // For admin
  priorityItems: {id: string, type: 'stat' | 'trans'}[];
  hasQuotaError: boolean;
  countdown: string;
  nextRefresh: number;
  refreshLeaderboard: () => Promise<void>;
  clearPriority: (id: string) => void;
  searchCharacters: (query: string) => Promise<Character[]>;
  createCharacter: (name: string, stats: CharacterStats) => Promise<void>;
  updateCharacter: (id: string, newStats: CharacterStats, from?: string, reason?: string) => Promise<void>;
  renameCharacter: (id: string, newName: string) => Promise<void>;
  updateCharacterPin: (id: string, newPin: string | null) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  banUser: (userId: string, email: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: 'player' | 'admin' | 'system') => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  clearAllLogs: () => Promise<void>;
  dismissWarning: (warningId: string) => Promise<void>;
  resetEconomy: () => Promise<void>;
  resetAllProgress: () => Promise<void>;
  createTransaction: (senderCharId: string, recipientCharId: string, amount: number, reason: string) => Promise<void>;
  setAdminPanelActive: (active: boolean) => void;
  setAllTransactionsActive: (active: boolean) => void;
  morningHour: number;
  morningMinute: number;
  eveningHour: number;
  eveningMinute: number;
  updateLeaderboardHours: (morningHour: number, morningMinute: number, eveningHour: number, eveningMinute: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [topVela, setTopVela] = useState<Character[]>([]);
  const [topLevel, setTopLevel] = useState<Character[]>([]);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [allLogs, setAllLogs] = useState<Log[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [adminWarnings, setAdminWarnings] = useState<AdminWarning[]>([]);
  const [priorityItems, setPriorityItems] = useState<{id: string, type: 'stat' | 'trans'}[]>([]);
  const [hasQuotaError, setHasQuotaError] = useState(false);
  const [nextRefresh, setNextRefresh] = useState<number>(0);
  const [countdown, setCountdown] = useState<string>('00:00:00');
  const [adminPanelActive, setAdminPanelActive] = useState(false);
  const [allTransactionsActive, setAllTransactionsActive] = useState(false);
  const [morningHour, setMorningHour] = useState<number>(9);
  const [morningMinute, setMorningMinute] = useState<number>(0);
  const [eveningHour, setEveningHour] = useState<number>(21);
  const [eveningMinute, setEveningMinute] = useState<number>(0);

  const isFetchingRef = React.useRef(false);
  const lastAutoFetchRef = React.useRef<number>(0);

  const calculateNextRefresh = (
    mHour: number = morningHour,
    mMin: number = morningMinute,
    eHour: number = eveningHour,
    eMin: number = eveningMinute
  ) => {
    const now = new Date();
    const wibOffset = 7 * 60; // WIB is UTC+7
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const wibNow = new Date(utcNow.getTime() + (wibOffset * 60000));
    
    // Set targets: mHour:mMin and eHour:eMin WIB
    const morningTarget = new Date(wibNow);
    morningTarget.setHours(mHour, mMin, 0, 0);
    
    const eveningTarget = new Date(wibNow);
    eveningTarget.setHours(eHour, eMin, 0, 0);
    
    let next: Date;
    if (wibNow < morningTarget) {
      next = morningTarget;
    } else if (wibNow < eveningTarget) {
      next = eveningTarget;
    } else {
      next = new Date(morningTarget.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // Convert WIB target back to local machine time
    const nextLocal = new Date(next.getTime() - (wibOffset * 60000) - (now.getTimezoneOffset() * 60000));
    return nextLocal.getTime();
  };

  const fetchLeaderboard = async (
    force: boolean = false, 
    mHour?: number, 
    mMin?: number, 
    eHour?: number, 
    eMin?: number
  ) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const { getDocs, getDoc, setDoc: firestoreSetDoc } = await import('firebase/firestore');
      
      const lbRef = doc(db, 'system', 'leaderboard');
      const lbSnap = await getDoc(lbRef);
      const now = Date.now();
      
      // If not forcing (admin refresh) and not reached next refresh time, 
      // just try to load from the cache if available.
      if (!force && lbSnap.exists()) {
        const data = lbSnap.data();
        if (data.nextRefresh && now < data.nextRefresh) {
          setTopVela(data.topVela || []);
          setTopLevel(data.topLevel || []);
          setNextRefresh(data.nextRefresh);
          if (typeof data.morningHour === 'number') setMorningHour(data.morningHour);
          if (typeof data.morningMinute === 'number') setMorningMinute(data.morningMinute);
          if (typeof data.eveningHour === 'number') setEveningHour(data.eveningHour);
          if (typeof data.eveningMinute === 'number') setEveningMinute(data.eveningMinute);
          return;
        }
      }

      // If we reach here, we need to perform a real refresh.
      // ONLY ADMIN can perform the refresh to Firestore.
      // Players will just use the latest data and wait for an admin or schedule (simulated here)
      
      if (userProfile?.role === 'admin' || force) {
        const qVela = query(
          collection(db, 'characters'), 
          where('isSystem', '==', false),
          orderBy('stats.vela', 'desc'), 
          limit(50)
        );
        const qLevel = query(
          collection(db, 'characters'), 
          where('isSystem', '==', false),
          orderBy('stats.level', 'desc'), 
          limit(50)
        );

        const [velaSnap, levelSnap] = await Promise.all([
          getDocs(qVela),
          getDocs(qLevel)
        ]);

        const newTopVela = velaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
        const newTopLevel = levelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
        
        const finalMorningHour = typeof mHour === 'number' ? mHour : morningHour;
        const finalMorningMinute = typeof mMin === 'number' ? mMin : morningMinute;
        const finalEveningHour = typeof eHour === 'number' ? eHour : eveningHour;
        const finalEveningMinute = typeof eMin === 'number' ? eMin : eveningMinute;
        const refreshTime = calculateNextRefresh(finalMorningHour, finalMorningMinute, finalEveningHour, finalEveningMinute);

        const lbData = {
          topVela: newTopVela,
          topLevel: newTopLevel,
          lastRefresh: now,
          nextRefresh: refreshTime,
          morningHour: finalMorningHour,
          morningMinute: finalMorningMinute,
          eveningHour: finalEveningHour,
          eveningMinute: finalEveningMinute,
          updatedBy: currentUser?.uid || 'system'
        };

        // Update local state
        setTopVela(newTopVela);
        setTopLevel(newTopLevel);
        setNextRefresh(refreshTime);

        // Update Firestore for everyone
        await firestoreSetDoc(lbRef, lbData);
      } else {
        // Player: try to get the latest even if expired (maybe no admin logged in)
        if (lbSnap.exists()) {
          const data = lbSnap.data();
          setTopVela(data.topVela || []);
          setTopLevel(data.topLevel || []);
          const mH = typeof data.morningHour === 'number' ? data.morningHour : morningHour;
          const mM = typeof data.morningMinute === 'number' ? data.morningMinute : morningMinute;
          const eH = typeof data.eveningHour === 'number' ? data.eveningHour : eveningHour;
          const eM = typeof data.eveningMinute === 'number' ? data.eveningMinute : eveningMinute;
          setNextRefresh(data.nextRefresh || calculateNextRefresh(mH, mM, eH, eM));
          if (typeof data.morningHour === 'number') setMorningHour(data.morningHour);
          if (typeof data.morningMinute === 'number') setMorningMinute(data.morningMinute);
          if (typeof data.eveningHour === 'number') setEveningHour(data.eveningHour);
          if (typeof data.eveningMinute === 'number') setEveningMinute(data.eveningMinute);
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('Quota exceeded')) {
        setHasQuotaError(true);
      }
      console.error("Leaderboard fetch error:", error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    // Listen to universal leaderboard doc for all users
    const lbRef = doc(db, 'system', 'leaderboard');
    const unsubLb = onSnapshot(lbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTopVela(data.topVela || []);
        setTopLevel(data.topLevel || []);
        const mH = typeof data.morningHour === 'number' ? data.morningHour : 9;
        const mM = typeof data.morningMinute === 'number' ? data.morningMinute : 0;
        const eH = typeof data.eveningHour === 'number' ? data.eveningHour : 21;
        const eM = typeof data.eveningMinute === 'number' ? data.eveningMinute : 0;
        setMorningHour(mH);
        setMorningMinute(mM);
        setEveningHour(eH);
        setEveningMinute(eM);
        const nRef = data.nextRefresh || calculateNextRefresh(mH, mM, eH, eM);
        setNextRefresh(nRef);
      } else {
        // If doc doesn't exist, try initial fetch
        fetchLeaderboard();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system/leaderboard');
    });

    return () => unsubLb();
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      // Update countdown
      if (nextRefresh > 0) {
        const diff = Math.max(0, nextRefresh - now);
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        
        // Auto fetch if expired and user is admin (to trigger sync for others)
        if (diff <= 0 && userProfile?.role === 'admin' && !isFetchingRef.current) {
          const currentTime = Date.now();
          // Gatekeeper: only allow auto-fetch once every 30 seconds if expired
          if (currentTime - lastAutoFetchRef.current > 30000) {
            lastAutoFetchRef.current = currentTime;
            fetchLeaderboard();
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRefresh, userProfile?.role]);

  const searchCharacters = async (queryStr: string) => {
    if (!queryStr || queryStr.length < 1) return [];
    const lowerQuery = queryStr.toLowerCase().trim();
    try {
      const { getDocs } = await import('firebase/firestore');
      
      // We'll perform a broad search and then filter locally for better UX
      // since Firestore doesn't support easy "contains" on strings.
      
      // 1. Prefix search by name (already good for "Ayam...")
      const qByName = query(
        collection(db, 'characters'),
        where('name', '>=', queryStr),
        where('name', '<=', queryStr + '\uf8ff'),
        limit(20)
      );
      
      // 2. Keyword search (exact match on elements like "Goreng")
      const qByKeyword = query(
        collection(db, 'characters'),
        where('keywords', 'array-contains', lowerQuery),
        limit(50)
      );
      
      // 3. Search by ID
      const qById = query(
        collection(db, 'characters'),
        where('__name__', '==', queryStr),
        limit(5)
      );

      const [nameSnap, keywordSnap, idSnap] = await Promise.all([
        getDocs(qByName), 
        getDocs(qByKeyword),
        getDocs(qById)
      ]);
      
      const resultsMap = new Map<string, Character>();
      
      const addRes = (doc: any) => {
        const data = doc.data() as Character;
        // Local filtering to ensure "contains" behavior if it wasn't a perfect prefix match
        if (
          data.name.toLowerCase().includes(lowerQuery) || 
          data.id.toLowerCase().includes(lowerQuery) ||
          data.keywords?.some(k => k.includes(lowerQuery))
        ) {
          resultsMap.set(doc.id, { id: doc.id, ...data });
        }
      };

      nameSnap.docs.forEach(addRes);
      keywordSnap.docs.forEach(addRes);
      idSnap.docs.forEach(addRes);
      
      return Array.from(resultsMap.values());
    } catch (err) {
      console.error("Search characters error:", err);
      return [];
    }
  };

  const generateKeywords = (name: string) => {
    const keywords = new Set<string>();
    const words = name.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 0) {
        keywords.add(word);
        // Add partials? For "Goreng", we already have it.
        // If they want "reng" to find "Goreng", we'd need more logic, but "contains word" is usually what they mean.
      }
    });
    return Array.from(keywords);
  };

  useEffect(() => {
    if (!currentUser) {
      setCharacters([]);
      setAllCharacters([]);
      setLogs([]);
      setAllLogs([]);
      setTransactions([]);
      setAllTransactions([]);
      return;
    }

    // Listen to user's characters
    const qChars = query(collection(db, 'characters'), where('userId', '==', currentUser.uid));
    const unsubChars = onSnapshot(qChars, (snapshot) => {
      const charsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
      setCharacters(charsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'characters');
    });

    // Listen to user's logs - Limited to 20
    const qLogs = query(collection(db, 'logs'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(20));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
      setLogs(logsData);
    }, (error) => {
      if (error.message.includes('Quota exceeded')) {
        setHasQuotaError(true);
        console.warn('Quota exceeded for logs listener. Real-time updates paused.');
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    // Listen to user's transactions (where user is sender or recipient)
    const qTransSender = query(collection(db, 'transactions'), where('senderUserId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(20));
    const qTransRecipient = query(collection(db, 'transactions'), where('recipientUserId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(20));
    
    let senderTransList: Transaction[] = [];
    let recipientTransList: Transaction[] = [];

    const updateTransList = () => {
      const combined = [...senderTransList, ...recipientTransList];
      // remove duplicates
      const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
      const sorted = unique.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTransactions(sorted);
    };

    const unsubTransSender = onSnapshot(qTransSender, (snapshot) => {
      senderTransList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      updateTransList();
    }, (error) => {
      if (error.message.includes('Quota exceeded')) {
        setHasQuotaError(true);
        return;
      }
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });
    
    const unsubTransRecipient = onSnapshot(qTransRecipient, (snapshot) => {
      recipientTransList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      updateTransList();
    }, (error) => {
      if (error.message.includes('Quota exceeded')) return;
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    let unsubAllChars = () => {};
    let unsubAllLogs = () => {};
    let unsubAllUsers = () => {};
    let unsubAllTrans = () => {};
    let unsubAdminWarnings = () => {};

    // If admin AND the admin panel is active, listen to all characters, logs, users, and warnings to avoid infinite reads
    if (userProfile?.role === 'admin' && adminPanelActive) {
      const qAllChars = query(collection(db, 'characters'), limit(500));
      unsubAllChars = onSnapshot(qAllChars, (snapshot) => {
        const charsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
        setAllCharacters(charsData);
      }, (error) => {
        if (!error.message.includes('Quota exceeded')) {
          handleFirestoreError(error, OperationType.LIST, 'characters');
        }
      });

      const qAllLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(300));
      unsubAllLogs = onSnapshot(qAllLogs, (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
        setAllLogs(logsData);
      }, (error) => {
        if (!error.message.includes('Quota exceeded')) {
          handleFirestoreError(error, OperationType.LIST, 'logs');
        }
      });

      const qAllUsers = query(collection(db, 'users'), limit(300));
      unsubAllUsers = onSnapshot(qAllUsers, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(usersData);
      }, (error) => {
        if (!error.message.includes('Quota exceeded')) {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      });

      const qWarnings = query(collection(db, 'admin_warnings'), orderBy('timestamp', 'desc'), limit(50));
      unsubAdminWarnings = onSnapshot(qWarnings, (snapshot) => {
        const warningsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminWarning));
        setAdminWarnings(warningsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'admin_warnings');
      });
    }

    // Separate listener for all transactions so they are only loaded when viewing All Transactions or on Admin Panel
    if (userProfile?.role === 'admin' && (adminPanelActive || allTransactionsActive)) {
      const qAllTrans = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(300));
      unsubAllTrans = onSnapshot(qAllTrans, (snapshot) => {
        const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setAllTransactions(transData);
      }, (error) => {
        if (!error.message.includes('Quota exceeded')) {
          handleFirestoreError(error, OperationType.LIST, 'transactions');
        }
      });
    }

    return () => {
      unsubChars();
      unsubLogs();
      unsubTransSender();
      unsubTransRecipient();
      unsubAllChars();
      unsubAllLogs();
      unsubAllUsers();
      unsubAllTrans();
      unsubAdminWarnings();
    };
  }, [currentUser?.uid, userProfile?.role, adminPanelActive, allTransactionsActive]);

  const createCharacter = async (name: string, stats: CharacterStats) => {
    if (!currentUser) return;
    const newCharRef = doc(collection(db, 'characters'));
    const now = Date.now();
    const newChar: Omit<Character, 'id'> = {
      userId: currentUser.uid,
      name,
      keywords: generateKeywords(name),
      stats,
      isSystem: userProfile?.role === 'system',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(newCharRef, newChar);

    // Create log
    const newLogRef = doc(collection(db, 'logs'));
    await setDoc(newLogRef, {
      charId: newCharRef.id,
      charName: name,
      userId: currentUser.uid,
      username: userProfile?.username || 'Unknown',
      action: 'CREATE',
      newData: stats,
      timestamp: now,
    });
  };

  const clearPriority = (id: string) => {
    setPriorityItems(prev => prev.filter(item => item.id !== id));
  };

  const updateCharacter = async (id: string, newStats: CharacterStats, from?: string, reason?: string) => {
    if (!currentUser) return;
    const char = characters.find(c => c.id === id) || allCharacters.find(c => c.id === id);
    if (!char) throw new Error('Character not found');

    const now = Date.now();
    await setDoc(doc(db, 'characters', id), {
      stats: newStats,
      updatedAt: now,
    }, { merge: true });

    // Create log
    const isAdminUpdate = currentUser.uid !== char.userId;
    const newLogRef = doc(collection(db, 'logs'));
    const logData: any = {
      charId: id,
      charName: char.name,
      userId: char.userId,
      username: userProfile?.username || 'Unknown',
      action: isAdminUpdate ? 'UPDATE BY ADMIN' : 'UPDATE',
      oldData: char.stats,
      newData: newStats,
      timestamp: now,
    };
    if (from) logData.from = from;
    if (reason) logData.reason = reason;
    await setDoc(newLogRef, logData);

    // Abuse Detection (Updated Thresholds: Level > 20, Vela > 500,000)
    const levelDiff = newStats.level - char.stats.level;
    const velaDiff = newStats.vela - char.stats.vela;

    if (levelDiff > 20 || (velaDiff > 500000 && from !== 'System (Transfer)')) {
      const warningRef = doc(collection(db, 'admin_warnings'));
      const type = levelDiff > 20 ? 'Level' : 'Vela';
      const amount = levelDiff > 20 ? levelDiff : velaDiff;
      const ownerEmail = (allUsers.find(u => u.id === char.userId)?.email) || currentUser.email || 'Unknown';
      
      await setDoc(warningRef, {
        userId: char.userId,
        userEmail: ownerEmail,
        charId: id,
        charName: char.name,
        type,
        amount,
        message: `[${char.name}] telah melakukan abuse di bagian [${type}] sebanyak [${amount.toLocaleString()}] (${ownerEmail}). Lakukan tindakan segera!`,
        timestamp: now
      });
    } else if (levelDiff > 5 || (velaDiff > 100000 && from !== 'System (Transfer)')) {
      // Priority Check Highlight (Level > 5 or Vela > 100,000)
      setPriorityItems(prev => [...prev, { id: newLogRef.id, type: 'stat' }]);
    }
  };

  const renameCharacter = async (id: string, newName: string) => {
    if (!currentUser) return;
    const char = characters.find(c => c.id === id) || allCharacters.find(c => c.id === id);
    if (!char) throw new Error('Character not found');

    const now = Date.now();
    const oldName = char.name;
    
    await setDoc(doc(db, 'characters', id), {
      name: newName,
      keywords: generateKeywords(newName),
      updatedAt: now,
    }, { merge: true });

    // Create log
    const newLogRef = doc(collection(db, 'logs'));
    await setDoc(newLogRef, {
      charId: id,
      charName: newName,
      userId: char.userId,
      username: userProfile?.username || 'Unknown',
      action: 'UPDATE',
      reason: `Name changed from "${oldName}" to "${newName}"`,
      timestamp: now,
    });
  };

  const updateCharacterPin = async (id: string, newPin: string | null) => {
    if (!currentUser) return;
    const now = Date.now();
    if (newPin === null) {
      // To remove a field in Firestore, we use deleteField(), but for simplicity we can set it to null or empty string
      await setDoc(doc(db, 'characters', id), {
        pin: null,
        updatedAt: now,
      }, { merge: true });
    } else {
      await setDoc(doc(db, 'characters', id), {
        pin: newPin,
        updatedAt: now,
      }, { merge: true });
    }
  };

  const deleteCharacter = async (id: string) => {
    if (!currentUser) return;
    const char = characters.find(c => c.id === id) || allCharacters.find(c => c.id === id);
    await deleteDoc(doc(db, 'characters', id));
    
    // Create log
    const newLogRef = doc(collection(db, 'logs'));
    await setDoc(newLogRef, {
      charId: id,
      charName: char?.name || 'Unknown',
      userId: char?.userId || currentUser.uid,
      username: userProfile?.username || 'Unknown',
      action: 'DELETE',
      timestamp: Date.now(),
    });
  };

  const deleteUser = async (userId: string) => {
    if (!currentUser) return;
    
    // Check if cleaning up self or if admin
    const isAdmin = userProfile?.role === 'admin';
    if (!isAdmin && currentUser.uid !== userId) return;

    // Delete user's characters
    const userChars = allCharacters.filter(c => c.userId === userId);
    for (const char of userChars) {
      await deleteDoc(doc(db, 'characters', char.id));
      // Create log
      const newLogRef = doc(collection(db, 'logs'));
      await setDoc(newLogRef, {
        charId: char.id,
        charName: char.name,
        userId: char.userId,
        username: userProfile?.username || 'Unknown',
        action: 'DELETE',
        timestamp: Date.now(),
      });
    }
    
    // Delete user document
    await deleteDoc(doc(db, 'users', userId));
  };

  const banUser = async (userId: string, email: string) => {
    if (!currentUser || userProfile?.role !== 'admin') return;

    // 1. Add to banned_emails collection
    await setDoc(doc(db, 'banned_emails', email), {
      userId,
      email,
      bannedAt: Date.now(),
      bannedBy: currentUser.uid
    });

    // 2. Delete user data (same as deleteUser)
    await deleteUser(userId);

    // 3. Create a special log for the ban
    const newLogRef = doc(collection(db, 'logs'));
    await setDoc(newLogRef, {
      action: 'ADMIN_ACTION',
      reason: `User ${email} has been BANNED from the system.`,
      timestamp: Date.now(),
      userId: currentUser.uid,
      username: userProfile?.username || 'Admin'
    });
  };

  const updateUserRole = async (userId: string, newRole: 'player' | 'admin' | 'system') => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
    
    // Update all characters owned by this user
    const isSystem = newRole === 'system';
    const userChars = allCharacters.filter(c => c.userId === userId);
    for (const char of userChars) {
      await setDoc(doc(db, 'characters', char.id), { isSystem }, { merge: true });
    }
  };

  const deleteLog = async (logId: string) => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    await deleteDoc(doc(db, 'logs', logId));
  };

  const clearAllLogs = async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    const { getDocs, writeBatch } = await import('firebase/firestore');
    const logsSnapshot = await getDocs(collection(db, 'logs'));
    const batch = writeBatch(db);
    logsSnapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  };

  const dismissWarning = async (warningId: string) => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    await deleteDoc(doc(db, 'admin_warnings', warningId));
  };

  const resetEconomy = async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    const { writeBatch } = await import('firebase/firestore');
    
    const chunks = [];
    for (let i = 0; i < allCharacters.length; i += 500) {
      chunks.push(allCharacters.slice(i, i + 500));
    }
    
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(char => {
        batch.update(doc(db, 'characters', char.id), {
          'stats.vela': 0,
          'stats.totalIncome': 0,
          'stats.totalExpense': 0,
          updatedAt: Date.now()
        });
      });
      await batch.commit();
    }

    // Create a log for the economy reset
    const newLogRef = doc(collection(db, 'logs'));
    await setDoc(newLogRef, {
      charId: 'SYSTEM',
      charName: 'Global Economy',
      userId: currentUser.uid,
      username: userProfile?.username || 'Admin',
      action: 'UPDATE',
      reason: 'Admin triggered global economy reset',
      timestamp: Date.now(),
    });
  };

  const resetAllProgress = async () => {
    if (!currentUser || userProfile?.role !== 'admin') return;
    const { writeBatch } = await import('firebase/firestore');
    
    const chunks = [];
    for (let i = 0; i < allCharacters.length; i += 500) {
      chunks.push(allCharacters.slice(i, i + 500));
    }
    
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(char => {
        batch.update(doc(db, 'characters', char.id), {
          'stats.level': 0,
          'stats.karmaPoint': 0,
          'stats.vela': 0,
          'stats.totalIncome': 0,
          'stats.totalExpense': 0,
          updatedAt: Date.now()
        });
      });
      await batch.commit();
    }

    // Create a log for the full reset
    const newLogRef = doc(collection(db, 'logs'));
    await setDoc(newLogRef, {
      charId: 'SYSTEM',
      charName: 'Global Reset',
      userId: currentUser.uid,
      username: userProfile?.username || 'Admin',
      action: 'UPDATE',
      reason: 'Admin triggered global progress reset',
      timestamp: Date.now(),
    });
  };

  const createTransaction = async (senderCharId: string, recipientCharId: string, amount: number, reason: string) => {
    if (!currentUser) return;
    
    try {
      const senderChar = characters.find(c => c.id === senderCharId);
      const { getDoc, writeBatch } = await import('firebase/firestore');
      const recipientRef = doc(db, 'characters', recipientCharId);
      const recipientSnap = await getDoc(recipientRef);
      
      if (!senderChar || !recipientSnap.exists()) {
        throw new Error("Sender or recipient character not found.");
      }
      
      const recipientChar = { id: recipientSnap.id, ...recipientSnap.data() } as Character;
      
      if (senderChar.stats.vela < amount) {
        throw new Error("Insufficient Vela.");
      }

      const now = Date.now();
      const batch = writeBatch(db);

      // Update sender
      const newSenderStats = {
        ...senderChar.stats,
        vela: senderChar.stats.vela - amount,
        totalExpense: (senderChar.stats.totalExpense || 0) + amount
      };
      batch.update(doc(db, 'characters', senderCharId), {
        stats: newSenderStats,
        updatedAt: now
      });

      // Update recipient
      const newRecipientStats = {
        ...recipientChar.stats,
        vela: (recipientChar.stats.vela || 0) + amount,
        totalIncome: (recipientChar.stats.totalIncome || 0) + amount
      };
      batch.update(doc(db, 'characters', recipientCharId), {
        stats: newRecipientStats,
        updatedAt: now
      });

      // Create transaction record
      const transRef = doc(collection(db, 'transactions'));
      batch.set(transRef, {
        senderCharId,
        senderCharName: senderChar.name,
        senderUserId: senderChar.userId,
        recipientCharId,
        recipientCharName: recipientChar.name,
        recipientUserId: recipientChar.userId,
        amount,
        reason,
        timestamp: now
      });

      // Create log for sender
      const senderLogRef = doc(collection(db, 'logs'));
      batch.set(senderLogRef, {
        charId: senderCharId,
        charName: senderChar.name,
        userId: senderChar.userId,
        username: userProfile?.username || 'Unknown',
        action: 'UPDATE',
        oldData: senderChar.stats,
        newData: newSenderStats,
        timestamp: now,
      });

      // Create log for recipient
      const recipientLogRef = doc(collection(db, 'logs'));
      batch.set(recipientLogRef, {
        charId: recipientCharId,
        charName: recipientChar.name,
        userId: recipientChar.userId,
        username: 'System (Transfer)',
        action: 'UPDATE',
        oldData: recipientChar.stats,
        newData: newRecipientStats,
        timestamp: now,
      });

      await batch.commit();

      // Priority Check for Transfers > 100,000
      if (amount > 100000) {
        setPriorityItems(prev => [...prev, { id: transRef.id, type: 'trans' }]);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  };

  const updateLeaderboardHours = async (mH: number, mM: number, eH: number, eM: number) => {
    try {
      const { setDoc: firestoreSetDoc } = await import('firebase/firestore');
      const lbRef = doc(db, 'system', 'leaderboard');
      
      setMorningHour(mH);
      setMorningMinute(mM);
      setEveningHour(eH);
      setEveningMinute(eM);
      const nextTime = calculateNextRefresh(mH, mM, eH, eM);
      setNextRefresh(nextTime);
      
      await firestoreSetDoc(lbRef, {
        morningHour: mH,
        morningMinute: mM,
        eveningHour: eH,
        eveningMinute: eM,
        nextRefresh: nextTime
      }, { merge: true });
      
      await fetchLeaderboard(true, mH, mM, eH, eM);
    } catch (err) {
      console.error("Failed to update leaderboard hours:", err);
    }
  };

  return (
    <DataContext.Provider value={{ 
      characters, topVela, topLevel, allCharacters, allUsers, logs, allLogs, 
      transactions, allTransactions, adminWarnings, priorityItems, hasQuotaError, 
      countdown, nextRefresh,
      refreshLeaderboard: () => fetchLeaderboard(true), clearPriority, searchCharacters, 
      createCharacter, updateCharacter, renameCharacter, updateCharacterPin, 
      deleteCharacter, deleteUser, banUser, updateUserRole, deleteLog, 
      clearAllLogs, dismissWarning, resetEconomy, resetAllProgress, createTransaction,
      setAdminPanelActive, setAllTransactionsActive,
      morningHour, morningMinute, eveningHour, eveningMinute, updateLeaderboardHours
    }}>
      {children}
    </DataContext.Provider>
  );
};
