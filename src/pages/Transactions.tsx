import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRightLeft, Search, CheckCircle2, AlertCircle, Coins, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Transactions() {
  const { userProfile, currentUser } = useAuth();
  const { characters, allCharacters, transactions, allTransactions, createTransaction, searchCharacters, setAllTransactionsActive } = useData();
  
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
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 1) {
        const results = await searchCharacters(searchQuery);
        setSearchResults(results.filter(c => c.id !== senderId));
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, senderId]);

  const handleSearchRecipient = (queryStr: string) => {
    setSearchQuery(queryStr);
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

    if (sender.isSystem && sender.pin && !showPinPrompt) {
      setShowPinPrompt(true);
      setPinInput('');
      setPinError('');
      return;
    }

    if (showPinPrompt && pinInput !== sender.pin) {
      setPinError('Incorrect PIN');
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
      setShowPinPrompt(false);
      setTimeout(() => setIsTransferring(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');

  useEffect(() => {
    if (viewMode === 'all') {
      setAllTransactionsActive(true);
    } else {
      setAllTransactionsActive(false);
    }
    return () => setAllTransactionsActive(false);
  }, [viewMode, setAllTransactionsActive]);

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
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">Transfer Vela</p>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white uppercase italic tracking-tight">
            Vela <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-amber-200 to-amber-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.25)]">Transfers</span>
          </h1>
        </div>
        <button 
          onClick={() => {
            setIsTransferring(!isTransferring);
            setSuccess('');
            setError('');
          }}
          className="px-6 py-3.5 bg-brand-primary hover:bg-white text-black rounded-2xl font-display font-black flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-brand-primary/10 active:scale-95 border border-white/10 uppercase tracking-widest text-[10px] cursor-pointer"
        >
          <ArrowRightLeft className="w-4 h-4" />
          New Transfer
        </button>
      </div>

      <AnimatePresence>
        {isTransferring && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="relative z-20"
          >
            <div className="bg-neutral-900/40 backdrop-blur-xl p-5 sm:p-8 rounded-3xl border border-brand-primary/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/15">
                  <Coins className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-black text-white italic uppercase tracking-tighter">New Vela Transfer</h2>
                  <p className="text-[9px] text-neutral-550 font-black uppercase tracking-wider font-mono">Secure balance transfer</p>
                </div>
              </div>
              
              {/* PIN Prompt Modal */}
              <AnimatePresence>
                {showPinPrompt && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md rounded-3xl"
                  >
                    <div className="max-w-sm w-full text-center space-y-6">
                       <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto border border-brand-primary/20">
                        <Shield className="w-8 h-8 text-brand-primary animate-pulse" />
                      </div>
                      <div className="space-y-1">
                         <h3 className="text-xl font-display font-black text-white italic uppercase tracking-tighter">Verification Needed</h3>
                         <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest leading-normal">Enter security PIN for {characters.find(c => c.id === senderId)?.name}</p>
                      </div>
                      
                      {pinError && (
                        <motion.div 
                          initial={{ x: 8, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="py-2.5 px-4 bg-red-950/20 border border-red-900/10 text-red-400 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider"
                        >
                          {pinError}
                        </motion.div>
                      )}
                      
                      <input
                        type="password"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-4 border border-white/5 rounded-2xl bg-blackFocus focus:ring-1 focus:ring-brand-primary bg-black/50 outline-none text-center text-4xl font-black tracking-[0.4em] text-brand-primary font-display shadow-2xl"
                        placeholder="••••"
                        autoFocus
                      />
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPinPrompt(false)}
                          className="flex-1 py-3 bg-neutral-850 text-neutral-400 hover:text-white rounded-xl font-display font-black uppercase tracking-wider text-[10px] border border-white/5 cursor-pointer"
                        >
                           Abort
                        </button>
                        <button
                          type="button"
                          onClick={handleTransfer}
                          className="flex-1 py-3 bg-brand-primary text-black rounded-xl font-display font-black uppercase tracking-wider text-[10px] shadow-lg transition-all active:scale-95 cursor-pointer"
                        >
                           Verify
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {error && (
                <div className="mb-6 p-4 bg-red-900/10 border border-red-900/20 text-red-500 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-mono font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-emerald-900/10 border border-emerald-950/20 text-emerald-400 rounded-2xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-mono font-bold uppercase tracking-wider leading-relaxed">{success}</p>
                </div>
              )}

              <form onSubmit={handleTransfer} className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1">Sender Character</label>
                      <select
                        value={senderId}
                        onChange={(e) => setSenderId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-black/60 border border-white/5 text-white rounded-2xl focus:ring-1 focus:ring-brand-primary outline-none transition-all font-bold text-sm cursor-pointer"
                        required
                      >
                         <option value="">Select sender...</option>
                        {characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name} [Vela: {c.stats?.vela || 0}]</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1">Transfer Amount</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                          <Coins className="h-4.5 w-4.5 text-brand-primary opacity-50" />
                        </div>
                        <input
                           type="number"
                           min="1"
                           value={amount}
                           onChange={(e) => setAmount(e.target.value)}
                           className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-white/5 text-white placeholder-neutral-700 rounded-2xl focus:ring-1 focus:ring-brand-primary outline-none transition-all text-lg font-bold font-display"
                           placeholder="0"
                           required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 relative">
                       <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1">Recipient Character</label>
                      <div className="relative group/search">
                        <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                          <Search className="h-4.5 w-4.5 text-neutral-600 transition-colors group-focus-within/search:text-brand-primary" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchRecipient(e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-white/5 text-white placeholder-neutral-700 rounded-2xl focus:ring-1 focus:ring-brand-primary outline-none transition-all text-sm font-bold"
                          placeholder="Search character name..."
                        />
                      </div>
                      
                      <AnimatePresence>
                        {searchResults.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            className="absolute left-0 right-0 mt-2 z-30 glass-card overflow-hidden shadow-3xl border-brand-primary/20 max-h-52 overflow-y-auto no-scrollbar bg-neutral-950 border rounded-2xl"
                          >
                            {searchResults.map(res => (
                              <div 
                                key={res.id}
                                onClick={() => {
                                  setRecipientId(res.id);
                                  setSearchQuery(res.name);
                                  setSearchResults([]);
                                }}
                                className={`px-4 py-3 cursor-pointer hover:bg-brand-primary hover:text-black flex justify-between items-center bg-black/80 border-b border-white/5 last:border-0 transition-colors group/item ${recipientId === res.id ? 'bg-brand-primary text-black' : 'text-zinc-300'}`}
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs uppercase italic tracking-tight">{res.name}</span>
                                  <span className={`text-[8px] font-mono tracking-tighter ${recipientId === res.id ? 'text-black/60' : 'text-neutral-500'}`}>IDENT: {res.id.slice(0, 10)}</span>
                                </div>
                                <ArrowRightLeft className={`w-3.5 h-3.5 transition-transform group-hover/item:translate-x-1 ${recipientId === res.id ? 'text-black' : 'text-neutral-700'}`} />
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1">Transfer Reason</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-4 py-3.5 bg-black/60 border border-white/5 text-white placeholder-neutral-700 rounded-2xl focus:ring-1 focus:ring-brand-primary outline-none transition-all text-xs font-bold"
                        placeholder="Enter reason or description..."
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsTransferring(false)}
                    className="order-2 sm:order-1 px-6 py-3.5 bg-neutral-850 text-neutral-400 hover:text-white rounded-xl font-display font-black uppercase tracking-wider text-[10px] transition-all border border-white/5 cursor-pointer"
                  >
                     Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !senderId || !recipientId || !amount || !reason}
                    className="order-1 sm:order-2 px-8 py-3.5 bg-brand-primary text-black rounded-xl font-display font-black uppercase tracking-wider text-[10px] hover:bg-white transition-all active:scale-95 shadow-md shadow-brand-primary/10 disabled:opacity-50 cursor-pointer"
                  >
                     {loading ? 'Sending...' : 'Confirm Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
               <h2 className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-tighter text-white">Transaction Ledger</h2>
              <div className="w-8 h-1 bg-brand-primary rounded-full"></div>
            </div>
            {userProfile?.role === 'admin' && (
              <div className="flex bg-black/40 p-1 rounded-full border border-white/5 shadow-2xl">
                <button 
                  onClick={() => setViewMode('my')} 
                  className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${viewMode === 'my' ? 'bg-brand-primary text-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                   My Transfers
                </button>
                <button 
                  onClick={() => setViewMode('all')} 
                  className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer ${viewMode === 'all' ? 'bg-indigo-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                   All Transfers
                </button>
              </div>
            )}
          </div>
          <div className="relative w-full md:w-72 group">
            <Search className="h-4 w-4 absolute left-4.5 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-brand-primary" />
            <input
              type="text"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-black/85 border border-white/5 text-white placeholder-neutral-700 rounded-full focus:ring-1 focus:ring-brand-primary outline-none transition-all text-[10px] font-mono tracking-widest uppercase"
              placeholder="SEARCH TRANSACTION ID..."
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1 no-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 bg-neutral-900/10 border border-white/5 border-dashed rounded-3xl">
              <Coins className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
               <p className="text-neutral-650 text-xs font-mono font-bold uppercase tracking-widest">No transactions found</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <motion.div 
                layout
                key={log.id} 
                className="glass-card overflow-hidden border-white/5 group hover:border-brand-primary/10 transition-all rounded-2xl bg-neutral-900/15"
              >
                <div 
                  onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                  className="p-4 sm:p-5 cursor-pointer relative overflow-hidden"
                >
                  {/* Status Indicator Left Strip */}
                  <div className={`absolute top-0 left-0 w-[3px] h-full ${log.senderUserId === currentUser?.uid ? 'bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-brand-primary/80 shadow-[0_0_8px_rgba(250,204,21,0.5)]'}`} />
                  
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-display font-black text-lg italic border transition-all ${log.senderUserId === currentUser?.uid ? 'bg-red-500/5 border-red-500/10 text-red-400' : 'bg-brand-primary/5 border-brand-primary/10 text-brand-primary'}`}>
                        {log.senderCharName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-2 text-white font-black uppercase italic tracking-tighter text-sm sm:text-base flex-wrap">
                          <span className={`${log.senderUserId === currentUser?.uid ? 'text-red-400' : 'text-neutral-250'} truncate max-w-[110px] sm:max-w-xs`}>{log.senderCharName || 'Sender Unavailable'}</span>
                          <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-700" />
                          <span className={`${log.recipientUserId === currentUser?.uid ? 'text-brand-primary' : 'text-neutral-450'} truncate max-w-[110px] sm:max-w-xs`}>{log.recipientCharName || 'Recipient Unavailable'}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[8px] text-neutral-550 font-mono tracking-tighter uppercase whitespace-nowrap bg-black/40 px-1 rounded border border-white/5">HSH: {log.id.slice(0, 10)}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-neutral-800" />
                          <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider font-mono whitespace-nowrap">{log.timestamp ? formatDistanceToNow(log.timestamp) : 'recent'} ago</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between sm:justify-center items-center sm:items-end sm:flex-col pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <div className={`text-[8px] sm:hidden font-mono font-black uppercase tracking-widest ${log.senderUserId === currentUser?.uid ? 'text-red-400/80' : 'text-brand-primary'}`}>
                        {log.senderUserId === currentUser?.uid ? 'DEBIT' : 'CREDIT'}
                      </div>
                      <div className={`text-2xl sm:text-3xl font-display font-black italic tabular-nums leading-none flex items-baseline gap-1.5 ${log.senderUserId === currentUser?.uid ? 'text-zinc-300' : 'text-brand-primary'}`}>
                        {log.senderUserId === currentUser?.uid ? '-' : '+'}{(log.amount || 0).toLocaleString()}
                        <span className="text-[9px] not-italic opacity-40 font-mono">V</span>
                      </div>
                      <div className={`hidden sm:block text-[8px] font-mono font-black uppercase tracking-widest ${log.senderUserId === currentUser?.uid ? 'text-red-400/80' : 'text-brand-primary'}`}>
                        {log.senderUserId === currentUser?.uid ? 'DEBIT' : 'CREDIT'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {selectedLog === log.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-black/30 p-4 sm:p-6 text-xs overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                           <p className="text-[8px] text-neutral-550 font-extrabold uppercase tracking-widest font-mono">Allocation Notes</p>
                          <p className="text-zinc-300 font-bold leading-relaxed py-2.5 px-3.5 bg-neutral-950/60 rounded-xl border border-white/5 font-mono text-[11px]">{log.reason}</p>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[8px] text-neutral-550 font-extrabold uppercase tracking-widest font-mono">Synchronized Time</p>
                          <div className="space-y-0.5 bg-neutral-950/40 p-3 rounded-xl border border-white/5 leading-none">
                            <p className="font-black text-neutral-200 uppercase italic text-sm tracking-tight">{new Date(log.timestamp).toLocaleDateString()}</p>
                            <p className="font-bold text-brand-primary/60 text-[10px] font-mono mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="space-y-4 bg-neutral-950/45 p-4 rounded-xl border border-white/5">
                          <div className="space-y-0.5">
                             <p className="text-[8px] text-neutral-550 font-extrabold uppercase tracking-widest font-mono">Source Slot</p>
                            <p className="font-black text-white text-xs italic uppercase tracking-tighter">{log.senderCharName}</p>
                            <p className="text-[8px] text-neutral-500 font-mono tracking-tighter truncate">{log.senderCharId}</p>
                          </div>
                          <div className="space-y-0.5 border-t border-white/5 pt-2">
                             <p className="text-[8px] text-neutral-550 font-extrabold uppercase tracking-widest font-mono">Recipient Slot</p>
                            <p className="font-black text-white text-xs italic uppercase tracking-tighter">{log.recipientCharName}</p>
                            <p className="text-[8px] text-neutral-500 font-mono tracking-tighter truncate">{log.recipientCharId}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
