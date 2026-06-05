import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Database, 
  Activity, 
  Search, 
  Download, 
  Shield, 
  Trash2, 
  ArrowRightLeft, 
  Ban,
  TrendingUp,
  Coins,
  History,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    allCharacters, 
    allLogs, 
    allUsers, 
    allTransactions, 
    adminWarnings,
    priorityItems,
    deleteCharacter, 
    deleteUser, 
    banUser, 
    updateUserRole, 
    deleteLog, 
    clearAllLogs, 
    dismissWarning,
    clearPriority,
    resetEconomy, 
    resetAllProgress,
    setAdminPanelActive
  } = useData();
  
  useEffect(() => {
    setAdminPanelActive(true);
    return () => setAdminPanelActive(false);
  }, [setAdminPanelActive]);

  const [activeTab, setActiveTab] = useState<'characters' | 'logs' | 'users' | 'transactions' | 'alerts'>((searchParams.get('tab') as any) || 'characters');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['characters', 'logs', 'users', 'transactions', 'alerts'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'UPDATE BY ADMIN'>('ALL');
  const [transSearchTerm, setTransSearchTerm] = useState('');
  const [selectedTransLog, setSelectedTransLog] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logCharSearchQuery, setLogCharSearchQuery] = useState('');
  const [inspectingChar, setInspectingChar] = useState<any | null>(null);
  
  // Modals
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [charToDelete, setCharToDelete] = useState<any | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showResetEconomyConfirm, setShowResetEconomyConfirm] = useState(false);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetType, setResetType] = useState<'economy' | 'all'>('economy');
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  
  // User Actions Modal
  const [showUserActionConfirm, setShowUserActionConfirm] = useState(false);
  const [userActionType, setUserActionType] = useState<'delete' | 'ban'>('delete');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [userActionStep, setUserActionStep] = useState(1);
  const [userActionPin, setUserActionPin] = useState('');
  const [userActionError, setUserActionError] = useState('');
  
  // 2FA State
  const [is2FAVerified, setIs2FAVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 1. Optimize lookups with O(1) Map structures
  const charactersMap = useMemo(() => {
    const map = new Map<string, any>();
    if (allCharacters) {
      for (const c of allCharacters) {
        map.set(c.id, c);
      }
    }
    return map;
  }, [allCharacters]);

  const usersMap = useMemo(() => {
    const map = new Map<string, any>();
    if (allUsers) {
      for (const u of allUsers) {
        map.set(u.id, u);
      }
    }
    return map;
  }, [allUsers]);

  const userCharactersCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (allCharacters) {
      for (const c of allCharacters) {
        const count = map.get(c.userId) || 0;
        map.set(c.userId, count + 1);
      }
    }
    return map;
  }, [allCharacters]);

  // 2. Memoized, O(1)-powered filtered lists
  const filteredCharacters = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!allCharacters) return [];
    return allCharacters.filter(c => {
      const owner = usersMap.get(c.userId);
      const ownerName = owner?.username || '';
      return c.name.toLowerCase().includes(term) || 
             c.userId.toLowerCase().includes(term) ||
             ownerName.toLowerCase().includes(term);
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [allCharacters, usersMap, searchTerm]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!allUsers) return [];
    return allUsers.filter(u => 
      (u.username || '').toLowerCase().includes(term) || 
      (u.email || '').toLowerCase().includes(term)
    );
  }, [allUsers, searchTerm]);

  const filteredAndSortedTransactions = useMemo(() => {
    if (!allTransactions) return [];
    const term = transSearchTerm.toLowerCase();
    return allTransactions
      .filter(t => !term || t.id.toLowerCase().includes(term))
      .sort((a, b) => {
        const aPrio = priorityItems.some(p => p.id === a.id);
        const bPrio = priorityItems.some(p => p.id === b.id);
        if (aPrio && !bPrio) return -1;
        if (!aPrio && bPrio) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [allTransactions, transSearchTerm, priorityItems]);

  const filteredAndSortedLogs = useMemo(() => {
    if (!allLogs) return [];
    return allLogs
      .filter(log => {
        const matchesAction = logFilter === 'ALL' || log.action === logFilter;
        if (!matchesAction) return false;
        
        const clickedChar = charactersMap.get(log.charId);
        const charName = log.charName || clickedChar?.name || 'System Object';
        const term = logCharSearchQuery.toLowerCase();
        
        return logCharSearchQuery === '' || 
          charName.toLowerCase().includes(term) ||
          (log.charId && log.charId.toLowerCase().includes(term)) ||
          (log.username && log.username.toLowerCase().includes(term));
      })
      .sort((a, b) => {
        const aPrio = priorityItems.some(p => p.id === a.id);
        const bPrio = priorityItems.some(p => p.id === b.id);
        if (aPrio && !bPrio) return -1;
        if (!aPrio && bPrio) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [allLogs, logFilter, logCharSearchQuery, charactersMap, priorityItems]);

  const totalVela = useMemo(() => {
    return (allCharacters || []).reduce((sum, c) => sum + (c.stats?.vela || 0), 0);
  }, [allCharacters]);

  if (userProfile?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  // If 2FA is enabled but not verified, show PIN prompt
  if (userProfile.twoFactorPin && !is2FAVerified) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-neutral-900 p-8 rounded-3xl shadow-sm border border-neutral-800 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">2-Step Verification</h2>
          <p className="text-neutral-500 mb-6">Please enter your security PIN to access the admin dashboard.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === userProfile.twoFactorPin) {
              setIs2FAVerified(true);
              setPinError('');
            } else {
              setPinError('Incorrect PIN. Please try again.');
              setPinInput('');
            }
          }}>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-2xl tracking-widest px-4 py-3 bg-black text-white border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none mb-4"
              placeholder="••••"
              autoFocus
            />
            {pinError && <p className="text-red-400 text-sm mb-4">{pinError}</p>}
            <button
              type="submit"
              disabled={!pinInput}
              className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              Verify Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Owner ID', 'Level', 'Karma', 'Vela', 'Total Income', 'Total Expense', 'Created', 'Updated'];
    const rows = allCharacters.map(c => [
      c.id, c.name, c.userId, c.stats.level || 0, c.stats.karmaPoint, c.stats.vela, c.stats.totalIncome, c.stats.totalExpense,
      new Date(c.createdAt).toISOString(), new Date(c.updatedAt).toISOString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "characters_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight font-display">Admin Dashboard</h1>
          <p className="text-neutral-500 mt-2 text-lg">Central management of character records and audit history.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card px-5 py-2.5 flex items-center gap-3 border-brand-primary/20">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm font-bold text-neutral-200 tracking-wider">SYSTEM STATUS: ONLINE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-8 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-indigo-500/10"></div>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Active Records</p>
              <p className="text-4xl font-black text-white mt-1 tabular-nums">{(allCharacters || []).length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-8 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-yellow-500/10"></div>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 border border-yellow-400/20 group-hover:scale-110 transition-transform">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Vela Circulation</p>
              <p className="text-4xl font-black text-brand-primary mt-1 tabular-nums">{totalVela.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-8 group relative overflow-hidden border-emerald-500/10"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-emerald-500/10"></div>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-neutral-500 font-bold uppercase tracking-widest">Action Ledger</p>
              <p className="text-4xl font-black text-white mt-1 tabular-nums">{(allLogs || []).length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {adminWarnings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Abuse Detected!</h3>
                <p className="text-red-400/80">There are {adminWarnings.length} suspicious activities flagged by the system.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('alerts')}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
            >
              Take Action Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card shadow-xl overflow-hidden border-white/5">
        <div className="flex flex-wrap border-b border-white/5 bg-black/20 overflow-x-auto no-scrollbar">
          {(['characters', 'users', 'transactions', 'logs', 'alerts'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 min-w-[120px] py-5 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-brand-primary' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {tab === 'alerts' && adminWarnings.length > 0 && (
                <span className="absolute top-4 right-4 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'characters' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Filter records by name, ID or owner..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 text-white placeholder-neutral-500 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/50 outline-none transition-all"
                  />
                </div>
                <button onClick={exportCSV} className="btn-secondary w-full md:w-auto">
                  <Download className="w-4 h-4" /> Export Ledger
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {(filteredCharacters || []).map(char => {
                  const owner = usersMap.get(char.userId);
                  const displayEmail = owner?.email || (char.isSystem ? 'system@game.com' : 'Unknown');
                  
                  return (
                    <motion.div 
                      layout
                      key={char.id} 
                      className="glass-card p-5 glass-card-hover border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-xl border border-brand-primary/20">
                          {char.name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/character/${char.id}`} className="text-lg font-bold text-white hover:text-brand-primary transition-colors block truncate">
                            {char.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-neutral-500 font-mono">{char.userId?.slice(0, 12)}...</span>
                            <span className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full border border-white/10 uppercase font-black">{owner?.username || 'System'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 md:flex items-center gap-4 md:gap-8 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="text-center md:text-left">
                          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">Level</p>
                          <p className="text-brand-secondary font-bold">Lv {char.stats?.level || 0}</p>
                        </div>
                        <div className="text-center md:text-left">
                          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">Vela</p>
                          <p className="text-white font-bold">{(char.stats?.vela || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center md:text-right">
                          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">Status</p>
                          <p className="text-emerald-400 text-[10px] font-bold">Active</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto pt-2 md:pt-0">
                        <button
                          onClick={() => setCharToDelete(char)}
                          className="flex-1 md:flex-none p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/10"
                        >
                          <Trash2 className="w-5 h-5 mx-auto" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search users by name or email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 text-white placeholder-neutral-500 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/50 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map(user => {
                  const userCharsCount = userCharactersCountMap.get(user.id) || 0;
                  return (
                    <motion.div 
                      layout
                      key={user.id} 
                      className="glass-card p-6 glass-card-hover border-white/5"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${user.online ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-neutral-700'}`}></div>
                          <div>
                            <p className="font-bold text-white text-lg">{user.username || 'Anonymous User'}</p>
                            <p className="text-xs text-neutral-500 truncate max-w-[200px]">{user.email}</p>
                          </div>
                        </div>
                        <select
                          value={user.role || 'player'}
                          onChange={async (e) => {
                            await updateUserRole(user.id, e.target.value as any);
                          }}
                          disabled={user.role === 'admin'}
                          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-tighter border-0 cursor-pointer outline-none transition-all ${user.role === 'admin' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : user.role === 'system' ? 'bg-brand-primary text-black' : 'bg-neutral-800 text-neutral-400'}`}
                        >
                          <option value="player">Player</option>
                          <option value="system">System</option>
                          <option value="admin" disabled>Admin</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 pt-4 border-t border-white/5">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-1">Records</p>
                          <p className="text-white font-bold text-xl">{userCharsCount}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-1">Joined</p>
                          <p className="text-neutral-400 font-bold">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {user.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => {
                                setTargetUser(user);
                                setUserActionType('ban');
                                setUserActionStep(1);
                                setUserActionPin('');
                                setUserActionError('');
                                setShowUserActionConfirm(true);
                              }}
                              className="flex-1 py-2.5 bg-yellow-900/10 text-yellow-500 hover:bg-yellow-900/20 rounded-xl font-bold text-xs border border-yellow-900/20 transition-all uppercase tracking-widest"
                            >
                              Ban Acc
                            </button>
                            <button
                              onClick={() => {
                                setTargetUser(user);
                                setUserActionType('delete');
                                setUserActionStep(1);
                                setUserActionPin('');
                                setUserActionError('');
                                setShowUserActionConfirm(true);
                              }}
                              className="flex-1 py-2.5 bg-red-900/10 text-red-500 hover:bg-red-900/20 rounded-xl font-bold text-xs border border-red-900/20 transition-all uppercase tracking-widest"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        <button className="flex-1 py-2.5 bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-xl font-bold text-xs transition-all uppercase tracking-widest">
                          Manage
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Financial Ledger</h3>
                  <p className="text-sm text-neutral-500">Universal audit trail of all Vela transfers.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input 
                      type="text" 
                      placeholder="Audit by ID..." 
                      value={transSearchTerm}
                      onChange={(e) => setTransSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 text-white placeholder-neutral-500 rounded-2xl focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      priorityItems.filter(p => p.type === 'trans').forEach(p => clearPriority(p.id));
                    }}
                    className="p-3 bg-neutral-900 text-neutral-400 hover:text-brand-primary border border-white/5 rounded-2xl transition-all"
                    title="Refresh Data"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 no-scrollbar">
                {filteredAndSortedTransactions.map(log => {
                    const isPriority = priorityItems.some(p => p.id === log.id && p.type === 'trans');
                    return (
                      <motion.div 
                        layout
                        key={log.id} 
                        className={`glass-card overflow-hidden border-white/5 ${isPriority ? 'border-brand-primary/40 bg-brand-primary/5 shadow-[0_0_30px_rgba(250,204,21,0.05)]' : ''}`}
                      >
                        <div 
                          onClick={() => setSelectedTransLog(selectedTransLog === log.id ? null : log.id)}
                          className="p-5 cursor-pointer"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isPriority ? 'bg-brand-primary text-black' : 'bg-white/5 text-neutral-400'}`}>
                                {log.senderCharName?.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-3 text-white font-bold">
                                  <span>{log.senderCharName}</span>
                                  <ArrowRightLeft className="w-4 h-4 text-neutral-600" />
                                  <span className="text-neutral-400">{log.recipientCharName}</span>
                                </div>
                                <p className="text-[10px] text-neutral-600 font-mono tracking-tighter uppercase mt-1">{log.id}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                              <div className="text-right flex-1 md:flex-none">
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Transfer Amount</p>
                                <p className="text-2xl font-black text-brand-primary tabular-nums">{(log.amount || 0).toLocaleString()} <span className="text-xs font-bold uppercase">Vela</span></p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isPriority && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      clearPriority(log.id);
                                    }}
                                    className="p-3 bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 rounded-xl transition-all border border-brand-primary/20"
                                  >
                                    <Check className="w-5 h-5" />
                                  </button>
                                )}
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-neutral-600 group-hover:text-white transition-colors">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${selectedTransLog === log.id ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {selectedTransLog === log.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/5 bg-black/40 p-6 text-sm"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">Purpose</p>
                                  <p className="font-bold text-white leading-relaxed">{log.reason}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">Timestamp</p>
                                  <p className="font-bold text-neutral-200">{new Date(log.timestamp).toLocaleString()}</p>
                                  <p className="text-[10px] text-neutral-500 mt-1">{formatDistanceToNow(log.timestamp)} ago</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">Source Character</p>
                                  <p className="font-bold text-white">{log.senderCharName}</p>
                                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{log.senderCharId}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">Destination</p>
                                  <p className="font-bold text-white">{log.recipientCharName}</p>
                                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{log.recipientCharId}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Activity Stream</h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></div>
                    REAL-TIME SYNC
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                  {/* SEARCH CHARACTER */}
                  <div className="relative w-full sm:w-[260px] flex-shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-9 py-2 bg-black/40 border border-white/5 text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-xs font-bold uppercase tracking-wider h-[38px]"
                      placeholder="Search name or key..."
                      value={logCharSearchQuery}
                      onChange={(e) => setLogCharSearchQuery(e.target.value)}
                    />
                    {logCharSearchQuery && (
                      <button 
                        onClick={() => setLogCharSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-550 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar h-[38px]">
                    {(['ALL', 'CREATE', 'UPDATE', 'UPDATE BY ADMIN', 'DELETE'] as const).map(f => (
                      <button 
                        key={f}
                        onClick={() => setLogFilter(f)} 
                        className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${logFilter === f ? 'bg-brand-primary text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        {f.replace('UPDATE BY ADMIN', 'Admin')}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowClearAllConfirm(true)}
                      className="flex-1 sm:flex-none btn-secondary !py-2 !text-xs !bg-red-900/10 !text-red-500 border border-red-500/20 h-[38px] px-4"
                    >
                      Purge
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 no-scrollbar">
                {filteredAndSortedLogs.map(log => {
                    const clickedChar = charactersMap.get(log.charId);
                    const charName = log.charName || clickedChar?.name || 'System Object';
                    const owner = usersMap.get(log.userId);
                    const username = log.username || owner?.username || 'System';
                    const isPriority = priorityItems.some(p => p.id === log.id && p.type === 'stat');
                    
                    let details = '';
                    if ((log.action === 'UPDATE' || log.action === 'UPDATE BY ADMIN') && log.oldData && log.newData) {
                      const changes = [];
                      if (log.oldData.level !== log.newData.level) changes.push(`Lv ${log.oldData.level}→${log.newData.level}`);
                      if (log.oldData.karmaPoint !== log.newData.karmaPoint) changes.push(`KRM ${log.oldData.karmaPoint}→${log.newData.karmaPoint}`);
                      if (log.oldData.vela !== log.newData.vela) changes.push(`VEL ${log.oldData.vela}→${log.newData.vela}`);
                      details = changes.join(', ');
                    }

                    return (
                      <motion.div 
                        layout
                        key={log.id} 
                        className={`glass-card overflow-hidden border-white/5 ${isPriority ? 'border-brand-secondary/40 bg-brand-secondary/5' : ''}`}
                      >
                        <div 
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="p-4 cursor-pointer flex items-start gap-4"
                        >
                          <div className={`w-2.5 h-2.5 mt-2 rounded-full flex-shrink-0 ${isPriority ? 'bg-brand-secondary animate-pulse' : log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'DELETE' ? 'bg-red-500' : 'bg-brand-secondary'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-4">
                              <p className="font-bold text-white truncate flex items-center flex-wrap gap-2">
                                {clickedChar ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectingChar(clickedChar);
                                    }}
                                    className="hover:text-brand-primary hover:underline cursor-pointer text-left transition-colors font-bold text-white uppercase italic"
                                    title="Inspect Character Sheet"
                                  >
                                    {charName}
                                  </button>
                                ) : (
                                  <span className="font-bold text-white">{charName}</span>
                                )}
                                <span className="text-[10px] text-neutral-600 font-mono uppercase">[{log.charId?.slice(0, 8)}]</span>
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] text-neutral-500 font-mono">{formatDistanceToNow(log.timestamp)} ago</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLogToDelete(log.id);
                                  }}
                                  className="p-1.5 text-neutral-600 hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              <span className={`font-black uppercase tracking-widest ${log.action === 'DELETE' ? 'text-red-500' : log.action === 'CREATE' ? 'text-emerald-500' : 'text-brand-secondary'}`}>{log.action}</span>
                              <span className="mx-2">BY</span>
                              <span className="text-white font-bold">{username}</span>
                              {details && <span className="text-brand-primary ml-3 font-medium">// {details}</span>}
                            </p>
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedLogId === log.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-white/5 bg-black/40 p-6 text-sm"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">Operation</p>
                                  <p className="font-bold text-white">{log.action}</p>
                                  <p className="text-[10px] text-neutral-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">Subject</p>
                                  {clickedChar ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInspectingChar(clickedChar);
                                      }}
                                      className="font-bold text-white hover:text-brand-primary hover:underline text-left transition-colors block uppercase italic"
                                      title="Inspect Character Sheet"
                                    >
                                      {charName}
                                    </button>
                                  ) : (
                                    <p className="font-bold text-white">{charName}</p>
                                  )}
                                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{log.charId}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider mb-2">User Principal</p>
                                  <p className="font-bold text-white">{username}</p>
                                  <p className="text-[10px] text-neutral-500 font-mono mt-1">{log.userId}</p>
                                </div>
                              </div>

                              {/* Detailed Changes & Audit Fields */}
                              <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                                {(log.from || log.reason) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                                    {log.from && (
                                      <div>
                                        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider mb-1">From (Source)</p>
                                        <p className="text-brand-primary font-bold text-xs mt-1 uppercase tracking-wide bg-brand-primary/10 px-2.5 py-1.5 rounded-lg border border-brand-primary/15 inline-block">
                                          {log.from}
                                        </p>
                                      </div>
                                    )}
                                    {log.reason && (
                                      <div>
                                        <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider mb-1">Reason</p>
                                        <p className="text-neutral-200 font-medium text-xs mt-1 bg-black/20 px-3 py-2 rounded-lg border border-white/5 whitespace-pre-wrap">
                                          {log.reason}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Compare Stats Section */}
                                {log.oldData && log.newData && (
                                  <div className="space-y-2">
                                    <p className="text-[10px] text-neutral-400 font-black uppercase tracking-wider">Stat Modification Matrix</p>
                                    <div className="flex flex-wrap gap-3">
                                      {Object.keys(log.newData).map(key => {
                                        const oldVal = log.oldData![key];
                                        const newVal = log.newData![key];
                                        if (oldVal === newVal) return null;
                                        
                                        const diff = (typeof newVal === 'number' && typeof oldVal === 'number') 
                                          ? newVal - oldVal 
                                          : 0;

                                        return (
                                          <div key={key} className="bg-black/30 border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-4">
                                            <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">{key}</span>
                                            <span className="text-xs font-bold text-white flex items-center gap-2 font-mono">
                                              {(oldVal ?? 0).toLocaleString()} <span className="text-neutral-500">→</span> {(newVal ?? 0).toLocaleString()}
                                            </span>
                                            {diff !== 0 && (
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${diff > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'}`}>
                                                {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Threat Detection</h3>
                  <p className="text-sm text-neutral-500">Autonomous pattern analysis result.</p>
                </div>
              </div>

              {adminWarnings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-emerald-500/10">
                  <div className="w-20 h-20 bg-emerald-500/5 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                    <Check className="w-10 h-10" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Clean Bill of Health</h4>
                  <p className="text-neutral-500 max-w-xs">No suspicious behavior patterns detected within the current cycle.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adminWarnings.map((warning) => (
                    <motion.div 
                      key={warning.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-card p-6 border-red-500/20 relative group overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                      <div className="flex flex-col md:flex-row items-start gap-6">
                        <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 flex-shrink-0">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">Suspicious Activity</span>
                            <span className="text-[10px] text-neutral-500 font-mono uppercase">{formatDistanceToNow(warning.timestamp)} ago</span>
                          </div>
                          <p className="text-lg font-bold text-white leading-tight mb-2">{warning.message}</p>
                          <p className="text-sm text-neutral-400">Target ID: <span className="font-mono text-neutral-300">{warning.charId}</span></p>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto pt-4 md:pt-0">
                          <Link 
                            to={`/character/${warning.charId}`}
                            className="btn-primary !px-6 !py-2.5 !text-xs !bg-white !text-black !rounded-xl !shadow-lg !shadow-white/10"
                          >
                            Inspect
                          </Link>
                          <button 
                            onClick={() => dismissWarning(warning.id)}
                            className="btn-secondary !px-6 !py-2.5 !text-xs border border-white/5"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showClearAllConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Clear All Logs?</h3>
              <p className="text-neutral-400 mb-6">Are you sure you want to permanently delete all activity logs? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowClearAllConfirm(false)}
                  className="px-4 py-2 text-neutral-300 hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await clearAllLogs();
                    setShowClearAllConfirm(false);
                  }}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {(showResetEconomyConfirm || showResetAllConfirm) && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-900/30 border border-red-900/50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">
                {resetType === 'economy' ? 'Reset Global Economy?' : 'Reset All Progress?'}
              </h3>
              
              {resetStep === 1 ? (
                <>
                  <p className="text-neutral-400 mb-6 text-center">
                    {resetType === 'economy' 
                      ? 'Are you sure you want to reset the economy? This will set all Vela, Income, and Expense to 0 for ALL characters. Level, EXP, and Karma will NOT be affected.'
                      : 'Are you sure you want to reset ALL progress? This will set Level, EXP, Karma, Vela, Income, and Expense to 0 for ALL characters. This action is IRREVERSIBLE.'}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => {
                        setShowResetEconomyConfirm(false);
                        setShowResetAllConfirm(false);
                      }}
                      className="flex-1 px-4 py-2 text-neutral-300 hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setResetStep(2);
                        setResetPinInput('');
                        setResetPinError('');
                      }}
                      className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-red-900/20"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-red-500 font-medium mb-4 text-center">This action is IRREVERSIBLE. Please enter your 2-Step Verification PIN to confirm.</p>
                  {resetPinError && <div className="p-3 bg-red-900/30 border border-red-900/50 text-red-500 rounded-lg text-sm mb-4">{resetPinError}</div>}
                  <input
                    type="password"
                    maxLength={4}
                    value={resetPinInput}
                    onChange={(e) => setResetPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-black text-white border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none mb-6 text-center text-2xl tracking-widest"
                    placeholder="****"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => {
                        setResetStep(1);
                        setResetPinInput('');
                        setResetPinError('');
                      }}
                      className="flex-1 px-4 py-2 text-neutral-300 hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={async () => {
                        if (userProfile?.twoFactorPin && resetPinInput !== userProfile.twoFactorPin) {
                          setResetPinError('Incorrect PIN');
                          return;
                        }
                        try {
                          if (resetType === 'economy') {
                            await resetEconomy();
                            setShowResetEconomyConfirm(false);
                          } else {
                            await resetAllProgress();
                            setShowResetAllConfirm(false);
                          }
                          setResetStep(1);
                          setResetPinInput('');
                        } catch (err: any) {
                          setResetPinError(err.message || 'Reset failed');
                        }
                      }}
                      disabled={userProfile?.twoFactorPin ? resetPinInput.length !== 4 : false}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      CONFIRM RESET
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {inspectingChar && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-neutral-900 border border-white/10 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/10 blur-3xl rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-secondary/5 blur-3xl rounded-full -ml-20 -mb-20"></div>

              {/* Close Button */}
              <button 
                onClick={() => setInspectingChar(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-8 relative z-10">
                {/* Header Profile Info */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-brand-primary to-amber-600 flex items-center justify-center text-black text-4xl font-display font-black shadow-lg shadow-brand-primary/15 flex-shrink-0">
                    {(inspectingChar.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <h4 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">
                        {inspectingChar.name}
                      </h4>
                      {inspectingChar.isSystem && (
                        <span className="text-[9px] font-black uppercase tracking-widest bg-brand-secondary/20 text-brand-secondary px-2.5 py-1 rounded-full border border-brand-secondary/30">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 font-mono select-all">ID: {inspectingChar.id}</p>
                    
                    {allUsers && (
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1.5 flex items-center justify-center sm:justify-start gap-1.5">
                        <Users className="w-3.5 h-3.5 text-neutral-500" />
                        Owner: <span className="text-white">{(allUsers.find(u => u.id === inspectingChar.userId)?.email) || 'Unknown User'}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Cyberpunk Bento Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* LEVEL */}
                  <div className="glass-card p-5 border-white/5 space-y-1 bg-white/[0.02]">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em]">Record Level</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-display font-black text-white italic">{(inspectingChar.stats?.level !== undefined) ? inspectingChar.stats.level : '0'}</p>
                    </div>
                  </div>

                  {/* KARMA POINTS */}
                  <div className="glass-card p-5 border-white/5 space-y-1 bg-white/[0.02]">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em]">Karma Points</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-display font-black text-brand-secondary italic">{(inspectingChar.stats?.karmaPoint !== undefined) ? inspectingChar.stats.karmaPoint : '0'}</p>
                    </div>
                  </div>

                  {/* VELA BALANCE */}
                  <div className="col-span-2 md:col-span-1 glass-card p-5 border-brand-primary/20 space-y-1 bg-brand-primary/[0.03]">
                    <p className="text-[9px] text-brand-primary font-black uppercase tracking-[0.2em] flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Vela Balance
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-2xl font-display font-black text-brand-primary italic">
                        {((inspectingChar.stats?.vela !== undefined) ? inspectingChar.stats.vela : 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* TOTAL INCOME */}
                  <div className="glass-card p-5 border-white/5 space-y-1 bg-white/[0.02]">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em]">Total Income</p>
                    <p className="text-xl font-display font-black text-emerald-400 italic">
                      {((inspectingChar.stats?.totalIncome !== undefined) ? inspectingChar.stats.totalIncome : 0).toLocaleString()}
                    </p>
                  </div>

                  {/* TOTAL EXPENSE */}
                  <div className="glass-card p-5 border-white/5 space-y-1 bg-white/[0.02]">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em]">Total Expense</p>
                    <p className="text-xl font-display font-black text-red-400 italic">
                      {((inspectingChar.stats?.totalExpense !== undefined) ? inspectingChar.stats.totalExpense : 0).toLocaleString()}
                    </p>
                  </div>

                  {/* RECENT CHANGE TIMESTAMP */}
                  <div className="glass-card p-5 border-white/5 space-y-1 bg-white/[0.02]">
                    <p className="text-[9px] text-neutral-500 font-black uppercase tracking-[0.2em]">Last Updated</p>
                    <p className="text-xs font-black text-neutral-300 uppercase tracking-tight">
                      {inspectingChar.updatedAt ? new Date(inspectingChar.updatedAt).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-[9px] text-neutral-500 font-medium">
                      {inspectingChar.updatedAt ? `${formatDistanceToNow(inspectingChar.updatedAt)} ago` : 'Never'}
                    </p>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setInspectingChar(null)}
                    className="w-full sm:w-1/2 py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/5"
                  >
                    Close Sheet
                  </button>
                  <Link
                    to={`/character/${inspectingChar.id}`}
                    className="w-full sm:w-1/2 py-4 bg-brand-primary text-black rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all text-center flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/10"
                  >
                    Deep Inspect & Modify Record
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {logToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Log Entry?</h3>
              <p className="text-neutral-400 mb-6">Are you sure you want to delete this specific log entry?</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setLogToDelete(null)}
                  className="px-4 py-2 text-neutral-300 hover:bg-neutral-800 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await deleteLog(logToDelete);
                    setLogToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {charToDelete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-900/30 border border-red-900/50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">Delete Character Record?</h3>
              <p className="text-neutral-400 mb-6 text-center">Are you sure you want to delete <span className="text-white font-bold">{charToDelete.name}</span>? This action will permanently erase this character's data.</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    btn.innerText = 'Deleting...';
                    try {
                      await deleteCharacter(charToDelete.id);
                      setCharToDelete(null);
                    } catch (err: any) {
                      alert(`Delete failed: ${err.message}`);
                      btn.disabled = false;
                      btn.innerText = 'Yes, Delete Record';
                    }
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
                >
                  Yes, Delete Record
                </button>
                <button 
                  onClick={() => setCharToDelete(null)}
                  className="w-full py-3 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showUserActionConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border ${userActionType === 'ban' ? 'bg-amber-900/30 text-amber-500 border-amber-900/50' : 'bg-red-900/30 text-red-500 border-red-900/50'}`}>
                {userActionType === 'ban' ? <Ban className="w-8 h-8" /> : <Trash2 className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 text-center">
                {userActionType === 'ban' ? 'Ban User Account?' : 'Delete User Account?'}
              </h3>
              
              {userActionStep === 1 ? (
                <>
                  <p className="text-neutral-400 mb-6 text-center">
                    {userActionType === 'ban' 
                      ? `Are you sure you want to BAN ${targetUser?.email}? They will be logged out and unable to register again with this email.`
                      : `Are you sure you want to DELETE ${targetUser?.email}? All their records and profile data will be erased permanently.`}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setUserActionStep(2)}
                      className={`w-full py-3 text-white rounded-xl font-bold transition-colors ${userActionType === 'ban' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {userActionType === 'ban' ? 'Yes, Ban Account' : 'Yes, Delete Account'}
                    </button>
                    <button 
                      onClick={() => setShowUserActionConfirm(false)}
                      className="w-full py-3 bg-neutral-800 text-neutral-300 rounded-xl font-bold hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-neutral-400 text-center text-sm">
                    This action requires 2-Step Verification. Enter your Security PIN to confirm.
                  </p>
                  {userActionError && <div className="p-3 bg-red-900/30 border border-red-900/50 text-red-500 text-sm rounded-xl text-center">{userActionError}</div>}
                  <input
                    type="password"
                    value={userActionPin}
                    onChange={(e) => setUserActionPin(e.target.value)}
                    placeholder="Enter Security PIN"
                    className="w-full px-4 py-3 bg-black text-white border border-neutral-800 rounded-xl outline-none text-center font-bold text-2xl tracking-widest focus:ring-1 focus:ring-neutral-700"
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={async () => {
                        if (userProfile?.twoFactorPin && userActionPin !== userProfile.twoFactorPin) {
                          setUserActionError('Incorrect Security PIN');
                          return;
                        }
                        try {
                          if (userActionType === 'ban') {
                            await banUser(targetUser.id, targetUser.email);
                          } else {
                            await deleteUser(targetUser.id);
                          }
                          setShowUserActionConfirm(false);
                        } catch (err: any) {
                          setUserActionError(err.message || 'Action failed');
                        }
                      }}
                      className={`w-full py-3 text-white rounded-xl font-bold transition-colors ${userActionType === 'ban' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      Confirm {userActionType === 'ban' ? 'Ban' : 'Delete'}
                    </button>
                    <button 
                      onClick={() => setUserActionStep(1)}
                      className="w-full py-3 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors rounded-xl font-bold"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
