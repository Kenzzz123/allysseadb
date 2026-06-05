import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, orderBy, limit, getDocs, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';
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
  totalReadsSaved: number;
  isSyncingData: boolean;
  forceSyncAll: (forceServer?: boolean) => Promise<void>;
  lastSyncTimes: Record<string, number>;
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

  const [totalReadsSaved, setTotalReadsSaved] = useState<number>(() => {
    const saved = localStorage.getItem('firestore_reads_saved');
    return saved ? parseInt(saved) : 0;
  });
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setHasQuotaError(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

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

  const syncLeaderboard = async (forceServer: boolean = false) => {
    if (!currentUser) return;
    try {
      const { getDocFromCache, getDocFromServer } = await import('firebase/firestore');
      const lbRef = doc(db, 'system', 'leaderboard');
      const now = Date.now();
      const lastLbSync = lastSyncTimes['leaderboard'] || 0;
      const cacheCooldown = 60000; // 1 minute local cache-reuse cooldown for leaderboard

      const applyLeaderboardData = (data: any) => {
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
      };

      // 1. Try cache first (0 cost)
      let loadedFromCache = false;
      try {
        const cacheSnap = await getDocFromCache(lbRef);
        if (cacheSnap.exists()) {
          applyLeaderboardData(cacheSnap.data());
          loadedFromCache = true;
          setTotalReadsSaved(prev => {
            const next = prev + 1;
            localStorage.setItem('firestore_reads_saved', next.toString());
            return next;
          });
        }
      } catch (e) {
        // Safe to ignore cache miss
      }

      // 2. Fetch from Server if forced, cooldown expired or cache was empty
      const needsServer = forceServer || !loadedFromCache || (now - lastLbSync > cacheCooldown);
      if (needsServer) {
        try {
          const { getDoc } = await import('firebase/firestore');
          const serverSnap = await getDoc(lbRef); // standard or server-fallbacked
          if (serverSnap.exists()) {
            applyLeaderboardData(serverSnap.data());
            setLastSyncTimes(prev => ({ ...prev, leaderboard: now }));
          } else {
            // Document not found? Try to initialize it
            if (userProfile?.role === 'admin') {
              console.log("No leaderboard found, regenerating standard STANDINGS...");
              await fetchLeaderboard(true);
            }
          }
        } catch (serverErr: any) {
          if (serverErr.message?.includes('Quota exceeded')) {
            setHasQuotaError(true);
          } else {
            console.error("Leaderboard background sync issue:", serverErr);
          }
        }
      }
    } catch (importErr) {
      console.error("Failed to load firestore modules for syncLeaderboard:", importErr);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    syncLeaderboard(false);
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

    // Strategy 1: If admin is viewing and we already have all characters locally in state, search them directly.
    // Extremely fast and saves 100% of network costs.
    if (userProfile?.role === 'admin' && allCharacters && allCharacters.length > 0) {
      return allCharacters.filter(c => 
        c.name.toLowerCase().includes(lowerQuery) || 
        c.id.toLowerCase().includes(lowerQuery) ||
        c.keywords?.some(k => k.includes(lowerQuery))
      );
    }

    try {
      const { getDocsFromCache, getDocsFromServer } = await import('firebase/firestore');
      
      const qByName = query(
        collection(db, 'characters'),
        where('name', '>=', queryStr),
        where('name', '<=', queryStr + '\uf8ff'),
        limit(20)
      );
      
      const qByKeyword = query(
        collection(db, 'characters'),
        where('keywords', 'array-contains', lowerQuery),
        limit(50)
      );
      
      const qById = query(
        collection(db, 'characters'),
        where('__name__', '==', queryStr),
        limit(5)
      );

      let nameDocs: any[] = [];
      let keywordDocs: any[] = [];
      let idDocs: any[] = [];

      try {
        // Strategy 2: Attempt to query from local persistent cache first!
        // This is 0-cost because the documents are stored in the client's IndexedDB.
        const [nameSnap, keywordSnap, idSnap] = await Promise.all([
          getDocsFromCache(qByName),
          getDocsFromCache(qByKeyword),
          getDocsFromCache(qById)
        ]);
        nameDocs = nameSnap.docs;
        keywordDocs = keywordSnap.docs;
        idDocs = idSnap.docs;
      } catch (cacheErr) {
        // Strategy 3: Fallback to server if cache is empty or fails
        const [nameSnap, keywordSnap, idSnap] = await Promise.all([
          getDocsFromServer(qByName),
          getDocsFromServer(qByKeyword),
          getDocsFromServer(qById)
        ]);
        nameDocs = nameSnap.docs;
        keywordDocs = keywordSnap.docs;
        idDocs = idSnap.docs;
      }
      
      const resultsMap = new Map<string, Character>();
      
      const addRes = (doc: any) => {
        const data = doc.data() as Character;
        if (
          data.name.toLowerCase().includes(lowerQuery) || 
          data.id.toLowerCase().includes(lowerQuery) ||
          data.keywords?.some(k => k.includes(lowerQuery))
        ) {
          resultsMap.set(doc.id, { id: doc.id, ...data });
        }
      };

      nameDocs.forEach(addRes);
      keywordDocs.forEach(addRes);
      idDocs.forEach(addRes);
      
      return Array.from(resultsMap.values());
    } catch (err) {
      console.error("Search characters error (fallback):", err);
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

  // Smart Sync & Quota Saver Engine
  const forceSyncAll = async (forceServer: boolean = false) => {
    if (!currentUser) return;
    setIsSyncingData(true);
    
    // Synergize Leaderboard into our Unified Sync Pipeline!
    await syncLeaderboard(forceServer);
    
    const now = Date.now();
    const cooldownPlayer = 45000; // 45 seconds player cooldown
    const cooldownAdmin = 90000;  // 1.5 minutes admin cooldown (heavy chunks)

    // Reusable, optimized cache-then-server fetch pipeline
    const syncCollection = async (
      key: string,
      qRef: any,
      setter: (data: any) => void,
      cooldown: number
    ) => {
      let docsLoadedFromCache = false;
      let currentCacheCount = 0;

      // 1. Load from local IndexedDB cache first (Cost = 0 reads on Firestore server!)
      try {
        const cacheSnap = await getDocsFromCache(qRef);
        if (!cacheSnap.empty) {
          const cacheData = cacheSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          setter(cacheData);
          docsLoadedFromCache = true;
          currentCacheCount = cacheSnap.docs.length;
          
          setTotalReadsSaved(prev => {
            const next = prev + cacheSnap.docs.length;
            localStorage.setItem('firestore_reads_saved', next.toString());
            return next;
          });
        }
      } catch (cacheErr) {
        // Cache is likely empty, fallback silently
      }

      // 2. Decide if we call the server based on cooldown timer
      const lastSync = lastSyncTimes[key] || 0;
      const needsServerCall = forceServer || (now - lastSync > cooldown) || !docsLoadedFromCache;

      if (needsServerCall) {
        try {
          const serverSnap = await getDocsFromServer(qRef);
          const serverData = serverSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          setter(serverData);
          setLastSyncTimes(prev => ({ ...prev, [key]: now }));
        } catch (serverErr: any) {
          if (serverErr.message?.includes('Quota exceeded')) {
            setHasQuotaError(true);
          } else {
            console.error(`SmartSync server error for [${key}]:`, serverErr);
          }
        }
      }
    };

    try {
      // 1. User characters (Throttled & cached)
      const qChars = query(collection(db, 'characters'), where('userId', '==', currentUser.uid));
      await syncCollection('characters', qChars, setCharacters, cooldownPlayer);

      // 2. User logs (Throttled & cached)
      const qLogs = query(collection(db, 'logs'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(20));
      await syncCollection('logs', qLogs, setLogs, cooldownPlayer);

      // 3. User transactions (Sender + Recipient, multi-query cache optimization)
      const qTransSender = query(collection(db, 'transactions'), where('senderUserId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(20));
      const qTransRecipient = query(collection(db, 'transactions'), where('recipientUserId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(20));

      const lastTransSync = lastSyncTimes['transactions'] || 0;
      const transNeedsServer = forceServer || (now - lastTransSync > cooldownPlayer);

      let senderTrans: any[] = [];
      let recipientTrans: any[] = [];
      let walletCacheFound = false;

      try {
        const [castSender, castRecipient] = await Promise.all([
          getDocsFromCache(qTransSender),
          getDocsFromCache(qTransRecipient)
        ]);
        senderTrans = castSender.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        recipientTrans = castRecipient.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
        if (senderTrans.length > 0 || recipientTrans.length > 0) {
          walletCacheFound = true;
          const combined = [...senderTrans, ...recipientTrans];
          const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
          const sorted = unique.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
          setTransactions(sorted);

          setTotalReadsSaved(prev => {
            const next = prev + castSender.docs.length + castRecipient.docs.length;
            localStorage.setItem('firestore_reads_saved', next.toString());
            return next;
          });
        }
      } catch (e) {}

      if (transNeedsServer || !walletCacheFound) {
        try {
          const [servSender, servRecipient] = await Promise.all([
            getDocsFromServer(qTransSender),
            getDocsFromServer(qTransRecipient)
          ]);
          senderTrans = servSender.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          recipientTrans = servRecipient.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          
          const combined = [...senderTrans, ...recipientTrans];
          const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
          const sorted = unique.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
          setTransactions(sorted);
          setLastSyncTimes(prev => ({ ...prev, transactions: now }));
        } catch (err: any) {
          if (err.message?.includes('Quota exceeded')) {
            setHasQuotaError(true);
          }
        }
      }

      // 4. Admin Panels heavy datasets (Only loaded active datasets, bypassing continuous streams)
      if (userProfile?.role === 'admin') {
        if (adminPanelActive) {
          const qAllChars = query(collection(db, 'characters'), limit(500));
          await syncCollection('allCharacters', qAllChars, setAllCharacters, cooldownAdmin);

          const qAllLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(300));
          await syncCollection('allLogs', qAllLogs, setAllLogs, cooldownAdmin);

          const qAllUsers = query(collection(db, 'users'), limit(300));
          await syncCollection('allUsers', qAllUsers, setAllUsers, cooldownAdmin);

          const qWarnings = query(collection(db, 'admin_warnings'), orderBy('timestamp', 'desc'), limit(50));
          await syncCollection('adminWarnings', qWarnings, setAdminWarnings, cooldownAdmin);
        }

        if (adminPanelActive || allTransactionsActive) {
          const qAllTrans = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(300));
          await syncCollection('allTransactions', qAllTrans, setAllTransactions, cooldownAdmin);
        }
      }
    } catch (gErr) {
      console.error("SmartSync background execution error:", gErr);
    } finally {
      setIsSyncingData(false);
    }
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

    // Trigger cached / hybrid sync instantly on mount or dependency shift
    forceSyncAll(false);

    // Dynamic background poller (Passive update checks every 60 seconds)
    // Runs in background to catch other user operations without keeping real-time sockets open 
    const interval = setInterval(() => {
      forceSyncAll(false);
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUser?.uid, userProfile?.role, adminPanelActive, allTransactionsActive]);

  const createCharacter = async (name: string, stats: CharacterStats) => {
    if (!currentUser) return;
    const newCharRef = doc(collection(db, 'characters'));
    const now = Date.now();
    const newChar: Character = {
      id: newCharRef.id,
      userId: currentUser.uid,
      name,
      keywords: generateKeywords(name),
      stats,
      isSystem: userProfile?.role === 'system',
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic state-updates (Zero server latency, zero stream demands!)
    setCharacters(prev => [...prev, newChar]);
    setAllCharacters(prev => [...prev, newChar]);

    await setDoc(newCharRef, {
      userId: currentUser.uid,
      name,
      keywords: generateKeywords(name),
      stats,
      isSystem: userProfile?.role === 'system',
      createdAt: now,
      updatedAt: now,
    });

    // Create log
    const newLogRef = doc(collection(db, 'logs'));
    const logData: any = {
      charId: newCharRef.id,
      charName: name,
      userId: currentUser.uid,
      username: userProfile?.username || 'Unknown',
      action: 'CREATE',
      newData: stats,
      timestamp: now,
    };

    setLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);
    setAllLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);

    await setDoc(newLogRef, logData);
  };

  const clearPriority = (id: string) => {
    setPriorityItems(prev => prev.filter(item => item.id !== id));
  };

  const updateCharacter = async (id: string, newStats: CharacterStats, from?: string, reason?: string) => {
    if (!currentUser) return;
    const char = characters.find(c => c.id === id) || allCharacters.find(c => c.id === id);
    if (!char) throw new Error('Character not found');

    const now = Date.now();

    // Optimistic Update for stats
    const updatedChar = { ...char, stats: newStats, updatedAt: now };
    setCharacters(prev => prev.map(c => c.id === id ? updatedChar : c));
    setAllCharacters(prev => prev.map(c => c.id === id ? updatedChar : c));

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

    setLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);
    setAllLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);

    await setDoc(newLogRef, logData);

    // Abuse Detection (Updated Thresholds: Level > 20, Vela > 500,000)
    const levelDiff = newStats.level - char.stats.level;
    const velaDiff = newStats.vela - char.stats.vela;

    if (levelDiff > 20 || (velaDiff > 500000 && from !== 'System (Transfer)')) {
      const warningRef = doc(collection(db, 'admin_warnings'));
      const type = levelDiff > 20 ? 'Level' : 'Vela';
      const amount = levelDiff > 20 ? levelDiff : velaDiff;
      const ownerEmail = (allUsers.find(u => u.id === char.userId)?.email) || currentUser.email || 'Unknown';
      
      const newWarning = {
        id: warningRef.id,
        userId: char.userId,
        userEmail: ownerEmail,
        charId: id,
        charName: char.name,
        type: type as 'Vela' | 'Level',
        amount,
        message: `[${char.name}] telah melakukan abuse di bagian [${type}] sebanyak [${amount.toLocaleString()}] (${ownerEmail}). Lakukan tindakan segera!`,
        timestamp: now
      };

      setAdminWarnings(prev => [newWarning, ...prev]);

      await setDoc(warningRef, newWarning);
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
    
    // Optimistic Update
    const updatedChar = { ...char, name: newName, keywords: generateKeywords(newName), updatedAt: now };
    setCharacters(prev => prev.map(c => c.id === id ? updatedChar : c));
    setAllCharacters(prev => prev.map(c => c.id === id ? updatedChar : c));

    await setDoc(doc(db, 'characters', id), {
      name: newName,
      keywords: generateKeywords(newName),
      updatedAt: now,
    }, { merge: true });

    // Create log
    const newLogRef = doc(collection(db, 'logs'));
    const logData = {
      charId: id,
      charName: newName,
      userId: char.userId,
      username: userProfile?.username || 'Unknown',
      action: 'UPDATE' as const,
      reason: `Name changed from "${oldName}" to "${newName}"`,
      timestamp: now,
    };

    setLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);
    setAllLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);

    await setDoc(newLogRef, logData);
  };

  const updateCharacterPin = async (id: string, newPin: string | null) => {
    if (!currentUser) return;
    const now = Date.now();

    // Optimistic Update
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, pin: newPin || undefined, updatedAt: now } : c));
    setAllCharacters(prev => prev.map(c => c.id === id ? { ...c, pin: newPin || undefined, updatedAt: now } : c));

    if (newPin === null) {
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

    // Optimistic Update
    setCharacters(prev => prev.filter(c => c.id !== id));
    setAllCharacters(prev => prev.filter(c => c.id !== id));

    await deleteDoc(doc(db, 'characters', id));
    
    // Create log
    const newLogRef = doc(collection(db, 'logs'));
    const logData = {
      charId: id,
      charName: char?.name || 'Unknown',
      userId: char?.userId || currentUser.uid,
      username: userProfile?.username || 'Unknown',
      action: 'DELETE' as const,
      timestamp: Date.now(),
    };

    setLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);
    setAllLogs(prev => [{ id: newLogRef.id, ...logData }, ...prev]);

    await setDoc(newLogRef, logData);
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

      // Optimistic state-updates for transfers (Ensures instant wallet synchronization with 0 reads!)
      const updateStatsFn = (charList: Character[]) => charList.map(c => {
        if (c.id === senderCharId) {
          return { ...c, stats: newSenderStats, updatedAt: now };
        }
        if (c.id === recipientCharId) {
          return { ...c, stats: newRecipientStats, updatedAt: now };
        }
        return c;
      });
      setCharacters(prev => updateStatsFn(prev));
      setAllCharacters(prev => updateStatsFn(prev));

      const newTrans: Transaction = {
        id: transRef.id,
        senderCharId,
        senderCharName: senderChar.name,
        senderUserId: senderChar.userId,
        recipientCharId,
        recipientCharName: recipientChar.name,
        recipientUserId: recipientChar.userId,
        amount,
        reason,
        timestamp: now
      };
      setTransactions(prev => [newTrans, ...prev]);
      setAllTransactions(prev => [newTrans, ...prev]);

      const logSender = {
        id: senderLogRef.id,
        charId: senderCharId,
        charName: senderChar.name,
        userId: senderChar.userId,
        username: userProfile?.username || 'Unknown',
        action: 'UPDATE' as const,
        oldData: senderChar.stats,
        newData: newSenderStats,
        timestamp: now,
      };
      const logRecipient = {
        id: recipientLogRef.id,
        charId: recipientCharId,
        charName: recipientChar.name,
        userId: recipientChar.userId,
        username: 'System (Transfer)',
        action: 'UPDATE' as const,
        oldData: recipientChar.stats,
        newData: newRecipientStats,
        timestamp: now,
      };
      setLogs(prev => [logSender, logRecipient, ...prev]);
      setAllLogs(prev => [logSender, logRecipient, ...prev]);

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
      morningHour, morningMinute, eveningHour, eveningMinute, updateLeaderboardHours,
      totalReadsSaved, isSyncingData, forceSyncAll, lastSyncTimes
    }}>
      {children}
    </DataContext.Provider>
  );
};
