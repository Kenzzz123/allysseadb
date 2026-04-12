import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export interface CharacterStats {
  level: number;
  exp: number;
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

interface DataContextType {
  characters: Character[];
  allCharacters: Character[]; // For admin
  allUsers: any[]; // For admin
  logs: Log[];
  allLogs: Log[]; // For admin
  transactions: Transaction[];
  allTransactions: Transaction[]; // For admin
  createCharacter: (name: string, stats: CharacterStats) => Promise<void>;
  updateCharacter: (id: string, newStats: CharacterStats, from?: string, reason?: string) => Promise<void>;
  updateCharacterPin: (id: string, newPin: string | null) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserRole: (userId: string, newRole: 'player' | 'admin' | 'system') => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  clearAllLogs: () => Promise<void>;
  resetEconomy: () => Promise<void>;
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
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [allLogs, setAllLogs] = useState<Log[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

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

    // Listen to user's logs
    const qLogs = query(collection(db, 'logs'), where('userId', '==', currentUser.uid));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
      logsData.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(logsData.slice(0, 100));
    }, (error) => {
      console.error("Logs listener error:", error);
    });

    // Listen to user's transactions (where user is sender or recipient)
    // Firestore OR queries are supported but we can also just fetch all and filter, or use two queries.
    // Let's use two queries and merge them, or fetch all if admin.
    // Actually, Firestore supports 'or' queries now, but for simplicity we can just query where senderUserId == uid or recipientUserId == uid.
    // Wait, firebase/firestore might not have 'or' imported. Let's just fetch all transactions and filter client-side for now since it's a small app, or use two queries.
    // Let's use two queries and merge.
    const qTransSender = query(collection(db, 'transactions'), where('senderUserId', '==', currentUser.uid));
    const qTransRecipient = query(collection(db, 'transactions'), where('recipientUserId', '==', currentUser.uid));
    
    let userTransMap = new Map<string, Transaction>();
    
    const updateTrans = () => {
      const sorted = Array.from(userTransMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(sorted);
    };

    const unsubTransSender = onSnapshot(qTransSender, (snapshot) => {
      snapshot.docs.forEach(doc => userTransMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
      updateTrans();
    }, (error) => {
      console.error("TransSender listener error:", error);
    });
    
    const unsubTransRecipient = onSnapshot(qTransRecipient, (snapshot) => {
      snapshot.docs.forEach(doc => userTransMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction));
      updateTrans();
    }, (error) => {
      console.error("TransRecipient listener error:", error);
    });

    let unsubAllChars = () => {};
    let unsubAllLogs = () => {};
    let unsubAllUsers = () => {};
    let unsubAllTrans = () => {};

    const qAllChars = query(collection(db, 'characters'));
    unsubAllChars = onSnapshot(qAllChars, (snapshot) => {
      const charsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Character));
      setAllCharacters(charsData);
    }, (error) => {
      console.error("AllChars listener error:", error);
    });

    // If admin, listen to all logs, users, and transactions
    if (userProfile?.role === 'admin') {
      const qAllLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(500));
      unsubAllLogs = onSnapshot(qAllLogs, (snapshot) => {
        const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
        setAllLogs(logsData);
      }, (error) => {
        console.error("All Logs listener error:", error);
      });

      const qAllUsers = query(collection(db, 'users'));
      unsubAllUsers = onSnapshot(qAllUsers, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllUsers(usersData);
      }, (error) => {
        console.error("AllUsers listener error:", error);
      });

      const qAllTrans = query(collection(db, 'transactions'));
      unsubAllTrans = onSnapshot(qAllTrans, (snapshot) => {
        const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        transData.sort((a, b) => b.timestamp - a.timestamp);
        setAllTransactions(transData);
      }, (error) => {
        console.error("AllTrans listener error:", error);
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
    if (!currentUser || userProfile?.role !== 'admin') return;
    
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
    <DataContext.Provider value={{ characters, allCharacters, allUsers, logs, allLogs, transactions, allTransactions, createCharacter, updateCharacter, updateCharacterPin, deleteCharacter, deleteUser, updateUserRole, deleteLog, clearAllLogs, resetEconomy, createTransaction }}>
      {children}
    </DataContext.Provider>
  );
};
