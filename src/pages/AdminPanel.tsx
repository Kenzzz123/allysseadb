import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
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
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const { 
    allCharacters, 
    allLogs, 
    allUsers, 
    allTransactions, 
    deleteCharacter, 
    deleteUser, 
    banUser, 
    updateUserRole, 
    deleteLog, 
    clearAllLogs, 
    resetEconomy, 
    resetAllProgress 
  } = useData();
  const [activeTab, setActiveTab] = useState<'characters' | 'logs' | 'users' | 'transactions'>('characters');
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'UPDATE BY ADMIN'>('ALL');
  const [transSearchTerm, setTransSearchTerm] = useState('');
  const [selectedTransLog, setSelectedTransLog] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Modals
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
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

  const filteredCharacters = useMemo(() => {
    return (allCharacters || []).filter(c => {
      const owner = (allUsers || []).find(u => u.id === c.userId);
      const ownerName = owner?.username || '';
      return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             c.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
             ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [allCharacters, allUsers, searchTerm]);

  const totalVela = (allCharacters || []).reduce((sum, c) => sum + (c.stats?.vela || 0), 0);

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
          <p className="text-neutral-500 mt-1">Monitor game economy and player activity in real-time.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-neutral-900 px-4 py-2 rounded-xl shadow-sm border border-neutral-800 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-neutral-300">System Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 p-6 rounded-3xl shadow-sm border border-neutral-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Total Records</p>
            <p className="text-2xl font-bold text-white">{allCharacters.length}</p>
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-3xl shadow-sm border border-neutral-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Total Economy (Vela)</p>
            <p className="text-2xl font-bold text-white">{totalVela.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-neutral-900 p-6 rounded-3xl shadow-sm border border-neutral-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Total Actions</p>
            <p className="text-2xl font-bold text-white">{allLogs.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-3xl shadow-sm border border-neutral-800 overflow-hidden">
        <div className="flex border-b border-neutral-800">
          <button 
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'characters' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500 shadow-inner shadow-indigo-500/5' : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300'}`}
          >
            All Records
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500 shadow-inner shadow-indigo-500/5' : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500 shadow-inner shadow-indigo-500/5' : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300'}`}
          >
            Transactions
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500 shadow-inner shadow-indigo-500/5' : 'text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300'}`}
          >
            Live Logs Feed
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-64">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                  />
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl font-medium transition-colors">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-400 text-sm border-b border-neutral-700">
                      <th className="p-4 font-medium rounded-tl-xl">Name</th>
                      <th className="p-4 font-medium">Owner</th>
                      <th className="p-4 font-medium">Level</th>
                      <th className="p-4 font-medium">Karma</th>
                      <th className="p-4 font-medium">Vela</th>
                      <th className="p-4 font-medium">Last Update</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(filteredCharacters || []).map(char => {
                      const owner = (allUsers || []).find(u => u.id === char.userId);
                      return (
                        <tr key={char.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                          <td className="p-4 font-bold text-white">
                            <Link to={`/character/${char.id}`} className="hover:text-indigo-400 transition-colors flex items-center gap-2">
                              {char.name}
                            </Link>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-white">{owner?.username || 'Unknown'}</div>
                            <div className="text-neutral-500 font-mono text-xs" title={char.userId}>{char.userId?.slice(0, 8) || 'unknown'}...</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md font-medium">Lv {char.stats?.level || 0}</span>
                          </td>
                          <td className="p-4">
                            <div className="text-pink-500 font-medium">{char.stats?.karmaPoint || 0} K</div>
                          </td>
                          <td className="p-4 font-medium text-yellow-400">{(char.stats?.vela || 0).toLocaleString()}</td>
                          <td className="p-4 text-neutral-500">{char.updatedAt ? formatDistanceToNow(char.updatedAt) : 'Never'} ago</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete ${char.name}?`)) {
                                  await deleteCharacter(char.id);
                                }
                              }}
                              className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete Character"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-64">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-800 text-neutral-400 text-sm border-b border-neutral-700">
                      <th className="p-4 font-medium rounded-tl-xl">Username</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Characters</th>
                      <th className="p-4 font-medium">Joined</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(allUsers || []).filter(u => u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(user => {
                      const userChars = allCharacters.filter(c => c.userId === user.id);
                      return (
                        <tr key={user.id} className="border-b border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                          <td className="p-4 font-bold text-white">
                            {user.username || 'Unknown'}
                            <div className="text-neutral-500 font-mono text-xs font-normal" title={user.id}>{user.id?.slice(0, 8) || 'unknown'}...</div>
                          </td>
                          <td className="p-4 text-neutral-400">{user.email}</td>
                          <td className="p-4">
                            <select
                              value={user.role || 'player'}
                              onChange={async (e) => {
                                await updateUserRole(user.id, e.target.value as any);
                              }}
                              disabled={user.role === 'admin'}
                              className={`px-2 py-1 rounded-md font-medium text-xs border-0 cursor-pointer outline-none focus:ring-1 focus:ring-neutral-700 ${user.role === 'admin' ? 'bg-purple-900/30 text-purple-400' : user.role === 'system' ? 'bg-amber-900/30 text-amber-400' : 'bg-neutral-800 text-neutral-300'}`}
                            >
                              <option value="player">Player</option>
                              <option value="system">System</option>
                              <option value="admin" disabled>Admin</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-neutral-600'}`}></div>
                              <span className="text-neutral-400">{user.online ? 'Online' : 'Offline'}</span>
                            </div>
                          </td>
                          <td className="p-4 font-medium text-neutral-300">{userChars.length}</td>
                          <td className="p-4 text-neutral-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</td>
                          <td className="p-4 text-right">
                            {user.role !== 'admin' && (
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setTargetUser(user);
                                    setUserActionType('ban');
                                    setUserActionStep(1);
                                    setUserActionPin('');
                                    setUserActionError('');
                                    setShowUserActionConfirm(true);
                                  }}
                                  className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-900/30 rounded-lg transition-colors"
                                  title="Ban User"
                                >
                                  <Ban className="w-4 h-4" />
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
                                  className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white">Transaction Logs</h3>
                <div className="relative w-64">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" 
                    placeholder="Search by Transaction Number..." 
                    value={transSearchTerm}
                    onChange={(e) => setTransSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {(allTransactions || [])
                  .filter(t => !transSearchTerm || t.id.toLowerCase().includes(transSearchTerm.toLowerCase()))
                  .map(log => (
                  <div key={log.id} className="border border-neutral-800 rounded-xl overflow-hidden">
                    <div 
                      onClick={() => setSelectedTransLog(selectedTransLog === log.id ? null : log.id)}
                      className="p-4 bg-neutral-900 hover:bg-neutral-800 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-white font-medium">
                        <span>{log.senderCharName}</span>
                        <ArrowRightLeft className="w-4 h-4 text-neutral-500" />
                        <span>{log.recipientCharName}</span>
                        <span className="text-yellow-400 ml-2">= {log.amount.toLocaleString()} V</span>
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">
                        ({log.id})
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {selectedTransLog === log.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-neutral-800 bg-black p-4 text-sm"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-neutral-500 mb-1">Reason / Purpose</p>
                              <p className="font-medium text-white">{log.reason}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 mb-1">Date & Time</p>
                              <p className="font-medium text-white">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 mb-1">Sender</p>
                              <p className="font-medium text-white">{log.senderCharName} <span className="text-xs text-neutral-600 font-mono">[{log.senderCharId?.slice(0, 8) || 'unknown'}...]</span></p>
                            </div>
                            <div>
                              <p className="text-neutral-500 mb-1">Recipient</p>
                              <p className="font-medium text-white">{log.recipientCharName} <span className="text-xs text-neutral-600 font-mono">[{log.recipientCharId?.slice(0, 8) || 'unknown'}...]</span></p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-white">Real-time Activity Feed</h3>
                  <span className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-900/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    Live
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  <div className="flex bg-neutral-800 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                    <button onClick={() => setLogFilter('ALL')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'ALL' ? 'bg-black text-white shadow-sm border border-neutral-700' : 'text-neutral-400 hover:text-white'}`}>All</button>
                    <button onClick={() => setLogFilter('CREATE')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'CREATE' ? 'bg-black text-emerald-400 shadow-sm border border-neutral-700' : 'text-neutral-400 hover:text-emerald-400'}`}>Creates</button>
                    <button onClick={() => setLogFilter('UPDATE')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'UPDATE' ? 'bg-black text-indigo-400 shadow-sm border border-neutral-700' : 'text-neutral-400 hover:text-indigo-400'}`}>Updates</button>
                    <button onClick={() => setLogFilter('UPDATE BY ADMIN')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'UPDATE BY ADMIN' ? 'bg-black text-purple-400 shadow-sm border border-neutral-700' : 'text-neutral-400 hover:text-purple-400'}`}>Admin Updates</button>
                    <button onClick={() => setLogFilter('DELETE')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'DELETE' ? 'bg-black text-red-400 shadow-sm border border-neutral-700' : 'text-neutral-400 hover:text-red-400'}`}>Deletes</button>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setResetType('economy');
                        setResetStep(1);
                        setShowResetEconomyConfirm(true);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-900/50 text-yellow-400 rounded-xl font-medium transition-colors text-sm"
                    >
                      <Database className="w-4 h-4" /> Reset Economy
                    </button>
                    <button 
                      onClick={() => {
                        setResetType('all');
                        setResetStep(1);
                        setShowResetAllConfirm(true);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-900/50 text-orange-400 rounded-xl font-medium transition-colors text-sm"
                    >
                      <Activity className="w-4 h-4" /> Reset All Progress
                    </button>
                    <button 
                      onClick={() => setShowClearAllConfirm(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 text-red-400 rounded-xl font-medium transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Clear All
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {(allLogs || []).filter(log => logFilter === 'ALL' || log.action === logFilter).map(log => {
                  const charName = log.charName || (allCharacters || []).find(c => c.id === log.charId)?.name || 'Unknown Record';
                  const username = log.username || (allUsers || []).find(u => u.id === log.userId)?.username || 'Unknown';
                  
                  let details = '';
                  if ((log.action === 'UPDATE' || log.action === 'UPDATE BY ADMIN') && log.oldData && log.newData) {
                    const changes = [];
                    if (log.oldData.level !== log.newData.level) changes.push(`Level ${log.oldData.level}→${log.newData.level}`);
                    if (log.oldData.karmaPoint !== log.newData.karmaPoint) changes.push(`Karma ${log.oldData.karmaPoint}→${log.newData.karmaPoint}`);
                    if (log.oldData.vela !== log.newData.vela) changes.push(`Vela ${log.oldData.vela}→${log.newData.vela}`);
                    details = changes.join(', ');
                  }

                  return (
                    <div key={log.id} className="border border-neutral-800 rounded-xl overflow-hidden">
                      <div 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="p-4 bg-neutral-900 hover:bg-neutral-800 cursor-pointer flex items-start gap-4 transition-colors"
                      >
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'DELETE' ? 'bg-red-500' : log.action === 'UPDATE BY ADMIN' ? 'bg-purple-500' : 'bg-indigo-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-white">{charName} <span className="text-neutral-500 font-normal text-sm hidden sm:inline" title={log.charId}>({log.charId?.slice(0, 8) || 'unknown'}...)</span></span>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${log.action === 'UPDATE BY ADMIN' ? 'bg-purple-900/30 text-purple-400' : 'hidden'}`}>ADMIN</span>
                              <span className="text-xs text-neutral-500">{log.timestamp ? formatDistanceToNow(log.timestamp) : 'unknown'} ago</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogToDelete(log.id);
                                }}
                                className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                                title="Delete log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-400 mt-1">
                            <span className="font-medium">{log.action}</span> by user <span className="font-medium text-white">{username}</span> <span className="font-mono text-xs text-neutral-500 hidden sm:inline" title={log.userId}>[{log.userId?.slice(0, 8) || 'unknown'}...]</span>
                            {log.action === 'CREATE' && ` = Created ${charName}`}
                            {log.action === 'DELETE' && ` = Deleted ${charName}`}
                            {log.action === 'UPDATE' && ` = Updated ${details ? `[${details}]` : 'stats'} for ${charName}`}
                          </p>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {expandedLogId === log.id && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-neutral-800 bg-black p-4 text-sm"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-neutral-500 mb-1">Action Details</p>
                                <p className="font-medium text-white">{log.action} on {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-neutral-500 mb-1">Performed By</p>
                                <p className="font-medium text-white">{username} <span className="text-xs text-neutral-500 font-mono">[{log.userId}]</span></p>
                              </div>
                              {log.from && (
                                <div>
                                  <p className="text-neutral-500 mb-1">From</p>
                                  <p className="font-medium text-white">{log.from}</p>
                                </div>
                              )}
                              {log.reason && (
                                <div>
                                  <p className="text-neutral-500 mb-1">Reason</p>
                                  <p className="font-medium text-white">{log.reason}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
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
                        if (userProfile.twoFactorPin && resetPinInput !== userProfile.twoFactorPin) {
                          setResetPinError('Incorrect PIN');
                          return;
                        }
                        if (resetType === 'economy') {
                          await resetEconomy();
                          setShowResetEconomyConfirm(false);
                        } else {
                          await resetAllProgress();
                          setShowResetAllConfirm(false);
                        }
                        setResetStep(1);
                        setResetPinInput('');
                      }}
                      disabled={userProfile.twoFactorPin ? resetPinInput.length !== 4 : false}
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
                        if (userActionPin !== userProfile?.twoFactorPin) {
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
