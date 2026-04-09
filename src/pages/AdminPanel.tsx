import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Users, Database, Activity, Search, Download, Shield, Trash2, ArrowRightLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const { allCharacters, allLogs, allUsers, allTransactions, deleteCharacter, deleteUser, updateUserRole, deleteLog, clearAllLogs, resetEconomy } = useData();
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
  const [resetEconomyStep, setResetEconomyStep] = useState<1 | 2>(1);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  
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
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">2-Step Verification</h2>
          <p className="text-slate-500 mb-6">Please enter your security PIN to access the admin dashboard.</p>
          
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
              className="w-full text-center text-2xl tracking-widest px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
              placeholder="••••"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mb-4">{pinError}</p>}
            <button
              type="submit"
              disabled={!pinInput}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Verify Access
            </button>
          </form>
        </div>
      </div>
    );
  }

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Owner ID', 'Level', 'EXP', 'Valor', 'Karma', 'Vela', 'Total Income', 'Total Expense', 'Created', 'Updated'];
    const rows = allCharacters.map(c => [
      c.id, c.name, c.userId, Math.floor((c.stats?.exp || 0) / 5000), c.stats.exp, c.stats.valorPoint, c.stats.karmaPoint, c.stats.vela, c.stats.totalIncome, c.stats.totalExpense,
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
          <h1 className="text-3xl font-extrabold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 mt-1">Monitor game economy and player activity in real-time.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-slate-700">System Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Records</p>
            <p className="text-2xl font-bold text-slate-900">{allCharacters.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Economy (Vela)</p>
            <p className="text-2xl font-bold text-slate-900">{totalVela.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Actions</p>
            <p className="text-2xl font-bold text-slate-900">{allLogs.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'characters' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            All Records
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Transactions
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Live Logs Feed
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-64">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                      <th className="p-4 font-medium rounded-tl-xl">Name</th>
                      <th className="p-4 font-medium">Owner</th>
                      <th className="p-4 font-medium">Level</th>
                      <th className="p-4 font-medium">EXP</th>
                      <th className="p-4 font-medium">Valor / Karma</th>
                      <th className="p-4 font-medium">Vela</th>
                      <th className="p-4 font-medium">Last Update</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(filteredCharacters || []).map(char => {
                      const owner = (allUsers || []).find(u => u.id === char.userId);
                      return (
                        <tr key={char.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">
                            <Link to={`/character/${char.id}`} className="hover:text-indigo-600 transition-colors flex items-center gap-2">
                              {char.name}
                            </Link>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-slate-900">{owner?.username || 'Unknown'}</div>
                            <div className="text-slate-500 font-mono text-xs" title={char.userId}>{char.userId.slice(0, 8)}...</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium">Lv {Math.floor((char.stats?.exp || 0) / 5000)}</span>
                          </td>
                          <td className="p-4 font-medium text-slate-700">{(char.stats?.exp || 0).toLocaleString()}</td>
                          <td className="p-4">
                            <div className="text-orange-600 font-medium">{char.stats?.valorPoint || 0} V</div>
                            <div className="text-pink-600 font-medium">{char.stats?.karmaPoint || 0} K</div>
                          </td>
                          <td className="p-4 font-medium text-yellow-600">{(char.stats?.vela || 0).toLocaleString()}</td>
                          <td className="p-4 text-slate-500">{formatDistanceToNow(char.updatedAt)} ago</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete ${char.name}?`)) {
                                  await deleteCharacter(char.id);
                                }
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
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
                        <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">
                            {user.username || 'Unknown'}
                            <div className="text-slate-500 font-mono text-xs font-normal" title={user.id}>{user.id.slice(0, 8)}...</div>
                          </td>
                          <td className="p-4 text-slate-600">{user.email}</td>
                          <td className="p-4">
                            <select
                              value={user.role || 'player'}
                              onChange={async (e) => {
                                await updateUserRole(user.id, e.target.value as any);
                              }}
                              disabled={user.role === 'admin'}
                              className={`px-2 py-1 rounded-md font-medium text-xs border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 ${user.role === 'admin' ? 'bg-purple-50 text-purple-700' : user.role === 'system' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'}`}
                            >
                              <option value="player">Player</option>
                              <option value="system">System</option>
                              <option value="admin" disabled>Admin</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                              <span className="text-slate-600">{user.online ? 'Online' : 'Offline'}</span>
                            </div>
                          </td>
                          <td className="p-4 font-medium text-slate-700">{userChars.length}</td>
                          <td className="p-4 text-slate-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</td>
                          <td className="p-4 text-right">
                            {user.role !== 'admin' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to delete user ${user.username} and all their characters? This action cannot be undone.`)) {
                                    await deleteUser(user.id);
                                  }
                                }}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                <h3 className="font-bold text-slate-900">Transaction Logs</h3>
                <div className="relative w-64">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by Transaction Number..." 
                    value={transSearchTerm}
                    onChange={(e) => setTransSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {(allTransactions || [])
                  .filter(t => !transSearchTerm || t.id.toLowerCase().includes(transSearchTerm.toLowerCase()))
                  .map(log => (
                  <div key={log.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div 
                      onClick={() => setSelectedTransLog(selectedTransLog === log.id ? null : log.id)}
                      className="p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-slate-900 font-medium">
                        <span>{log.senderCharName}</span>
                        <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                        <span>{log.recipientCharName}</span>
                        <span className="text-yellow-600 ml-2">= {log.amount.toLocaleString()} V</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        ({log.id})
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {selectedTransLog === log.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-200 bg-white p-4 text-sm"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-slate-500 mb-1">Reason / Purpose</p>
                              <p className="font-medium text-slate-900">{log.reason}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Date & Time</p>
                              <p className="font-medium text-slate-900">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Sender</p>
                              <p className="font-medium text-slate-900">{log.senderCharName} <span className="text-xs text-slate-400 font-mono">[{log.senderCharId.slice(0,8)}...]</span></p>
                            </div>
                            <div>
                              <p className="text-slate-500 mb-1">Recipient</p>
                              <p className="font-medium text-slate-900">{log.recipientCharName} <span className="text-xs text-slate-400 font-mono">[{log.recipientCharId.slice(0,8)}...]</span></p>
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
                  <h3 className="font-bold text-slate-900">Real-time Activity Feed</h3>
                  <span className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    Live
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                    <button onClick={() => setLogFilter('ALL')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>All</button>
                    <button onClick={() => setLogFilter('CREATE')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'CREATE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-emerald-600'}`}>Creates</button>
                    <button onClick={() => setLogFilter('UPDATE')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'UPDATE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-indigo-600'}`}>Updates</button>
                    <button onClick={() => setLogFilter('UPDATE BY ADMIN')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'UPDATE BY ADMIN' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-purple-600'}`}>Admin Updates</button>
                    <button onClick={() => setLogFilter('DELETE')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${logFilter === 'DELETE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-600 hover:text-red-600'}`}>Deletes</button>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setShowResetEconomyConfirm(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl font-medium transition-colors text-sm"
                    >
                      Reset Economy
                    </button>
                    <button 
                      onClick={() => setShowClearAllConfirm(true)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors text-sm"
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
                    if (log.oldData.exp !== log.newData.exp) changes.push(`EXP ${log.oldData.exp}→${log.newData.exp}`);
                    if (log.oldData.valorPoint !== log.newData.valorPoint) changes.push(`Valor ${log.oldData.valorPoint}→${log.newData.valorPoint}`);
                    if (log.oldData.karmaPoint !== log.newData.karmaPoint) changes.push(`Karma ${log.oldData.karmaPoint}→${log.newData.karmaPoint}`);
                    if (log.oldData.vela !== log.newData.vela) changes.push(`Vela ${log.oldData.vela}→${log.newData.vela}`);
                    details = changes.join(', ');
                  }

                  return (
                    <div key={log.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-start gap-4 transition-colors"
                      >
                        <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${log.action === 'CREATE' ? 'bg-emerald-500' : log.action === 'DELETE' ? 'bg-red-500' : log.action === 'UPDATE BY ADMIN' ? 'bg-purple-500' : 'bg-indigo-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">{charName} <span className="text-slate-400 font-normal text-sm hidden sm:inline" title={log.charId}>({log.charId.slice(0, 8)}...)</span></span>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${log.action === 'UPDATE BY ADMIN' ? 'bg-purple-100 text-purple-700' : 'hidden'}`}>ADMIN</span>
                              <span className="text-xs text-slate-400">{formatDistanceToNow(log.timestamp)} ago</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLogToDelete(log.id);
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Delete log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            <span className="font-medium">{log.action}</span> by user <span className="font-medium text-slate-900">{username}</span> <span className="font-mono text-xs text-slate-400 hidden sm:inline" title={log.userId}>[{log.userId.slice(0, 8)}...]</span>
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
                            className="border-t border-slate-200 bg-white p-4 text-sm"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-slate-500 mb-1">Action Details</p>
                                <p className="font-medium text-slate-900">{log.action} on {new Date(log.timestamp).toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 mb-1">Performed By</p>
                                <p className="font-medium text-slate-900">{username} <span className="text-xs text-slate-400 font-mono">[{log.userId}]</span></p>
                              </div>
                              {log.from && (
                                <div>
                                  <p className="text-slate-500 mb-1">From</p>
                                  <p className="font-medium text-slate-900">{log.from}</p>
                                </div>
                              )}
                              {log.reason && (
                                <div>
                                  <p className="text-slate-500 mb-1">Reason</p>
                                  <p className="font-medium text-slate-900">{log.reason}</p>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Clear All Logs?</h3>
              <p className="text-slate-600 mb-6">Are you sure you want to permanently delete all activity logs? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowClearAllConfirm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await clearAllLogs();
                    setShowClearAllConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResetEconomyConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 text-center">Reset Global Economy?</h3>
              
              {resetEconomyStep === 1 ? (
                <>
                  <p className="text-slate-600 mb-6 text-center">Are you sure you want to reset the economy? This will set all Vela, Income, and Expense to 0 for ALL characters. Level, EXP, Valor, and Karma will NOT be affected.</p>
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setShowResetEconomyConfirm(false)}
                      className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setResetEconomyStep(2);
                        setResetPinInput('');
                        setResetPinError('');
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-red-600 font-medium mb-4 text-center">This action is IRREVERSIBLE. Please enter your 2-Step Verification PIN to confirm.</p>
                  {resetPinError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{resetPinError}</div>}
                  <input
                    type="password"
                    maxLength={4}
                    value={resetPinInput}
                    onChange={(e) => setResetPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 mb-6 text-center text-2xl tracking-widest"
                    placeholder="****"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => {
                        setResetEconomyStep(1);
                        setResetPinInput('');
                        setResetPinError('');
                      }}
                      className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={async () => {
                        if (userProfile.twoFactorPin && resetPinInput !== userProfile.twoFactorPin) {
                          setResetPinError('Incorrect PIN');
                          return;
                        }
                        await resetEconomy();
                        setShowResetEconomyConfirm(false);
                        setResetEconomyStep(1);
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Log Entry?</h3>
              <p className="text-slate-600 mb-6">Are you sure you want to delete this specific log entry?</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setLogToDelete(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
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
      </AnimatePresence>
    </div>
  );
}
