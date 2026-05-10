import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { auth } from '../lib/firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

  const fetchLeaderboard = async () => {
    try {
      const { getDocs } = await import('firebase/firestore');
      
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

      setTopVela(velaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character)));
      setTopLevel(levelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character)));
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Refresh every 10 minutes to save budget
    const interval = setInterval(fetchLeaderboard, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const searchCharacters = async (queryStr: string) => {
    if (!queryStr || queryStr.length < 2) return [];
    try {
      const { getDocs } = await import('firebase/firestore');
      
      const qByName = query(
        collection(db, 'characters'),
        where('name', '>=', queryStr),
        where('name', '<=', queryStr + '\uf8ff'),
        limit(10)
      );
      
      // Also try searching by ID directly if it looks like one
      const qById = query(
        collection(db, 'characters'),
        where('__name__', '>=', queryStr),
        where('__name__', '<=', queryStr + '\uf8ff'),
        limit(5)
      );

      const [nameSnap, idSnap] = await Promise.all([getDocs(qByName), getDocs(qById)]);
      
      const resultsMap = new Map<string, Character>();
      nameSnap.docs.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as Character));
      idSnap.docs.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as Character));
      
      return Array.from(resultsMap.values());
    } catch (err) {
      console.error("Search characters error:", err);
      return [];
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

    // Listen to user's characters
    const qChars = query(collection(db, 'characters'), where('userId', '==', currentUser.uid));
    const unsubChars = onSnapshot(qChars, (snapshot) => {
      const charsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
      setCharacters(charsData);
    });

    // Listen to user's logs - Limited to 50
    const qLogs = query(collection(db, 'logs'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
      setLogs(logsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'logs');
    });

    // Listen to user's transactions (where user is sender or recipient)
    const qTransSender = query(collection(db, 'transactions'), where('senderUserId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(30));
    const qTransRecipient = query(collection(db, 'transactions'), where('recipientUserId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(30));
    
    let userTransMap = new Map<string, Transaction>();
    
      const updateTrans = () => {
        const sorted = Array.from(userTransMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setTransactions(sorted);
      };
    const unsubTransSender = onSnapshot(qTransSender, (snapshot) => {
      snapshot.docs.forEach(doc => userTransMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
      updateTrans();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });
    
    const unsubTransRecipient = onSnapshot(qTransRecipient, (snapshot) => {
      snapshot.docs.forEach(doc => userTransMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
      updateTrans();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    let unsubAllChars = () => {};
    let unsubAllLogs = () => {};
    let unsubAllUsers = () => {};
    let unsubAllTrans = () => {};
    let unsubAdminWarnings = () => {};

    // If admin, listen to all logs, users, and transactions
    if (userProfile?.role === 'admin') {
      const qAllChars = query(collection(db, 'characters'), limit(2000));
      unsubAllChars = onSnapshot(qAllChars, (snapshot) => {
        const charsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
        setAllCharacters(charsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'characters');
      });

      const qAllLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(1000));
      unsubAllLogs = onSnapshot(qAllLogs, (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
        setAllLogs(logsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
      });

      const qAllUsers = query(collection(db, 'users'), limit(1000));
      unsubAllUsers = onSnapshot(qAllUsers, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(usersData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });

      const qAllTrans = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(1000));
      unsubAllTrans = onSnapshot(qAllTrans, (snapshot) => {
        const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        setAllTransactions(transData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      });

      const qWarnings = query(collection(db, 'admin_warnings'), orderBy('timestamp', 'desc'), limit(50));
      unsubAdminWarnings = onSnapshot(qWarnings, (snapshot) => {
        const warningsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminWarning));
        setAdminWarnings(warningsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'admin_warnings');
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
  }, [currentUser, userProfile]);

  const createCharacter = async (name: string, stats: CharacterStats) => {
    if (!currentUser) return;
    const newCharRef = doc(collection(db, 'characters'));
    const now = Date.now();
    const newChar: Omit<Character, 'id'> = {
      userId: currentUser.uid,
      name,
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
    
    // We need to fetch the latest data for both characters to ensure we have the correct Vela amounts
    // Since this is client-side, we'll use the data we have in state, but ideally this should be a transaction in Firestore
    // For simplicity in this app, we'll just update both documents.
    
    const senderChar = characters.find(c => c.id === senderCharId);
    // Recipient could be any character, so we need to search allCharacters if admin, or we might need to fetch it if not admin.
    // Wait, if the user is not admin, they don't have `allCharacters`.
    // We need to fetch the recipient character directly from Firestore.
    const { getDoc } = await import('firebase/firestore');
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
    
    // Update sender
    const newSenderStats = {
      ...senderChar.stats,
      vela: senderChar.stats.vela - amount,
      totalExpense: (senderChar.stats.totalExpense || 0) + amount
    };
    await setDoc(doc(db, 'characters', senderCharId), {
      stats: newSenderStats,
      updatedAt: now
    }, { merge: true });

    // Update recipient
    const newRecipientStats = {
      ...recipientChar.stats,
      vela: recipientChar.stats.vela + amount,
      totalIncome: (recipientChar.stats.totalIncome || 0) + amount
    };
    await setDoc(doc(db, 'characters', recipientCharId), {
      stats: newRecipientStats,
      updatedAt: now
    }, { merge: true });

    // Create transaction record
    const transRef = doc(collection(db, 'transactions'));
    await setDoc(transRef, {
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

    // Priority Check for Transfers > 100,000
    if (amount > 100000) {
      setPriorityItems(prev => [...prev, { id: transRef.id, type: 'trans' }]);
    }

    // Create log for sender
    const senderLogRef = doc(collection(db, 'logs'));
    await setDoc(senderLogRef, {
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
    await setDoc(recipientLogRef, {
      charId: recipientCharId,
      charName: recipientChar.name,
      userId: recipientChar.userId,
      username: 'System (Transfer)',
      action: 'UPDATE',
      oldData: recipientChar.stats,
      newData: newRecipientStats,
      timestamp: now,
    });
  };

  return (
    <DataContext.Provider value={{ characters, topVela, topLevel, allCharacters, allUsers, logs, allLogs, transactions, allTransactions, adminWarnings, priorityItems, refreshLeaderboard: fetchLeaderboard, clearPriority, searchCharacters, createCharacter, updateCharacter, renameCharacter, updateCharacterPin, deleteCharacter, deleteUser, banUser, updateUserRole, deleteLog, clearAllLogs, dismissWarning, resetEconomy, resetAllProgress, createTransaction }}>
      {children}
    </DataContext.Provider>
  );
};
