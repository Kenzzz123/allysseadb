import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRightLeft, Search, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Transactions() {
  const { userProfile, currentUser } = useAuth();
  const { characters, allCharacters, transactions, allTransactions, createTransaction } = useData();
  
  const [isTransferring, setIsTransferring] = useState(false);
  const [senderId, setSenderId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearchRecipient = (queryStr: string) => {
    setSearchQuery(queryStr);
    if (queryStr.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const results = allCharacters.filter(c => 
      c.name.toLowerCase().includes(queryStr.toLowerCase()) && c.id !== senderId
    ).slice(0, 5);
    
    setSearchResults(results);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!senderId || !recipientId || !amount || !reason) {
      setError('Please fill in all fields.');
      return;
    }
    
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    
    const sender = characters.find(c => c.id === senderId);
    if (!sender) {
      setError('Sender character not found.');
      return;
    }
    
    if (sender.stats.vela < numAmount) {
      setError('Insufficient Vela.');
      return;
    }
    
    setLoading(true);
    try {
      await createTransaction(senderId, recipientId, numAmount, reason);
      setSuccess('Transfer successful!');
      setSenderId('');
      setRecipientId('');
      setAmount('');
      setReason('');
      setSearchQuery('');
      setSearchResults([]);
      setTimeout(() => setIsTransferring(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  const displayLogs = useMemo(() => {
    if (userProfile?.role === 'admin' && viewMode === 'all') {
      return allTransactions;
    }
    return transactions;
  }, [userProfile, viewMode, allTransactions, transactions]);
  
  const filteredLogs = useMemo(() => {
    if (!logSearchQuery) return displayLogs;
    return displayLogs.filter(log => log.id.toLowerCase().includes(logSearchQuery.toLowerCase()));
  }, [displayLogs, logSearchQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <button 
            onClick={() => {
              setIsTransferring(!isTransferring);
              setSuccess('');
              setError('');
            }}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10 active:scale-95 border border-indigo-400/20"
          >
            <ArrowRightLeft className="w-5 h-5" />
            New Transfer
          </button>
      </div>

      <AnimatePresence>
        {isTransferring && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-neutral-900 p-6 rounded-3xl shadow-sm border border-neutral-800 mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Transfer Vela</h2>
              
              {error && (
                <div className="mb-6 p-4 bg-red-900/30 border border-red-900/50 text-red-400 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-900/50 text-emerald-400 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{success}</p>
                </div>
              )}

              <form onSubmit={handleTransfer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">From Character</label>
                      <select
                        value={senderId}
                        onChange={(e) => setSenderId(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-800 bg-black text-white rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                        required
                      >
                        <option value="">Select your character</option>
                        {characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.stats?.vela || 0} Vela)</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Amount (Vela)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Coins className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                          type="number"
                          min="1"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-neutral-800 bg-black text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">To Character (Search by Name)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-neutral-500" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchRecipient(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-neutral-800 bg-black text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                          placeholder="Type character name..."
                        />
                      </div>
                      
                      {searchResults.length > 0 && (
                        <div className="mt-2 border border-neutral-800 rounded-xl overflow-hidden bg-black shadow-sm">
                          {searchResults.map(res => (
                            <div 
                              key={res.id}
                              onClick={() => {
                                setRecipientId(res.id);
                                setSearchQuery(res.name);
                                setSearchResults([]);
                              }}
                              className={`px-4 py-2 cursor-pointer hover:bg-neutral-800 flex justify-between items-center ${recipientId === res.id ? 'bg-indigo-500/10' : ''}`}
                            >
                              <span className="font-medium text-white">{res.name}</span>
                              <span className="text-xs text-neutral-500 font-mono">{res.id.slice(0, 8)}...</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-400 mb-1">Reason / Purpose</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-2 border border-neutral-800 bg-black text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none"
                        placeholder="e.g. Payment for items"
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsTransferring(false)}
                    className="px-6 py-2 text-neutral-400 font-medium hover:bg-neutral-800 rounded-xl mr-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !senderId || !recipientId || !amount || !reason}
                    className="px-10 py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-white/5"
                  >
                    {loading ? 'Processing...' : 'Confirm Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Transaction Logs</h2>
            {userProfile?.role === 'admin' && (
              <div className="flex bg-neutral-950 border border-neutral-800 p-1.5 rounded-xl shadow-inner shadow-black">
                <button 
                  onClick={() => setViewMode('my')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'my' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Personal
                </button>
                <button 
                  onClick={() => setViewMode('all')} 
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'all' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Universal (Admin)
                </button>
              </div>
            )}
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-500" />
            </div>
            <input
              type="text"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-neutral-800 bg-black text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-sm"
              placeholder="Search by Transaction Number..."
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">No transactions found.</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="border border-neutral-800 rounded-xl overflow-hidden">
                <div 
                  onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                  className="p-5 bg-neutral-900/50 hover:bg-neutral-900 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all border-b border-neutral-800/50 group"
                >
                  <div className="flex items-center gap-3 text-white font-bold">
                    <div className="w-8 h-8 rounded-lg bg-black border border-neutral-800 flex items-center justify-center text-xs text-neutral-500 font-mono group-hover:border-indigo-500/30 transition-colors">
                      {log.senderCharName?.charAt(0) || '?'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={log.senderUserId === currentUser?.uid ? 'text-red-400' : 'text-emerald-400'}>{log.senderCharName || 'Unknown'}</span>
                        <ArrowRightLeft className="w-3 h-3 text-neutral-600" />
                        <span className={log.recipientUserId === currentUser?.uid ? 'text-emerald-400' : 'text-neutral-300'}>{log.recipientCharName || 'Unknown'}</span>
                      </div>
                      <span className="text-[10px] text-neutral-600 font-mono tracking-tighter uppercase">{log.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-black font-mono ${log.senderUserId === currentUser?.uid ? 'text-red-500' : 'text-emerald-500'}`}>
                      {log.senderUserId === currentUser?.uid ? '-' : '+'}{(log.amount || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-neutral-600">
                      {log.timestamp ? formatDistanceToNow(log.timestamp) : 'unknown'} ago
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {selectedLog === log.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-neutral-800 bg-neutral-900 p-4 text-sm"
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
                          <p className="font-medium text-white">{log.senderCharName} <span className="text-xs text-neutral-500 font-mono">[{log.senderCharId.slice(0,8)}...]</span></p>
                        </div>
                        <div>
                          <p className="text-neutral-500 mb-1">Recipient</p>
                          <p className="font-medium text-white">{log.recipientCharName} <span className="text-xs text-neutral-500 font-mono">[{log.recipientCharId.slice(0,8)}...]</span></p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
