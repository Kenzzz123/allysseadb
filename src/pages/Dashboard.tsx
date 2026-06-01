import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Plus, Swords, Shield, Heart, Coins, TrendingUp, Clock, Activity, Gamepad2, ArrowUpRight, TrendingDown, Search, X, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { characters, createCharacter, logs } = useData();
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [searchLogChar, setSearchLogChar] = useState('');
  const [selectedInspectChar, setSelectedInspectChar] = useState<any | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    
    await createCharacter(newCharName, {
      level: 0,
      karmaPoint: 0,
      vela: 0,
      totalIncome: 0,
      totalExpense: 0
    });
    
    setNewCharName('');
    setIsCreating(false);
  };

  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => (b.stats?.level || 0) - (a.stats?.level || 0) || (b.stats?.vela || 0) - (a.stats?.vela || 0));
  }, [characters]);

  const totalVela = useMemo(() => characters.reduce((sum, c) => sum + (c.stats?.vela || 0), 0), [characters]);
  const avgLevel = useMemo(() => {
    const playerChars = characters.filter(c => !c.isSystem);
    return playerChars.length ? Math.round(playerChars.reduce((sum, c) => sum + (c.stats?.level || 0), 0) / playerChars.length) : 0;
  }, [characters]);

  const filteredLogs = useMemo(() => {
    if (!searchLogChar.trim()) return logs;
    const q = searchLogChar.toLowerCase();
    return logs.filter(log => {
      const char = characters.find(c => c.id === log.charId);
      const name = char?.name || log.charName || '';
      return name.toLowerCase().includes(q) || (log.action || '').toLowerCase().includes(q) || (log.reason || '').toLowerCase().includes(q);
    });
  }, [logs, searchLogChar, characters]);

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* Visual Greeting Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary">Character Dashboard</p>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white uppercase italic">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2.5 bg-neutral-900/60 backdrop-blur-md border border-white/5 py-2 px-4 rounded-full text-xs font-bold font-mono text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
          <span>REAL-TIME: CONNECTED</span>
        </div>
      </div>

      {/* Hero / Summary Section - Bento layout */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Assets Bento */}
        <div className="md:col-span-2 relative overflow-hidden bg-black/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/5 shadow-2xl group transition-all duration-500 hover:border-brand-primary/20">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 blur-[100px] rounded-full -mr-20 -mt-20 transition-all duration-700 group-hover:scale-125" />
          <div className="absolute bottom-0 left-0 w-52 h-52 bg-indigo-500/5 blur-[80px] rounded-full -ml-20 -mb-20" />
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_#FACC15]" />
                <span className="text-[9px] uppercase tracking-[0.35em] text-neutral-500 font-extrabold font-mono">Total Vela Balance</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-display font-black text-white italic tracking-tighter leading-none flex items-baseline gap-2 sm:gap-3">
                {totalVela.toLocaleString()}
                <span className="text-lg sm:text-2xl text-brand-primary font-bold not-italic font-mono uppercase tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.35)]">VELA</span>
              </h2>
            </div>
            
            <div className="flex gap-6 sm:gap-10 items-center border-t border-white/5 pt-6 mt-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-neutral-500 font-extrabold font-mono uppercase tracking-widest">Average Level</span>
                <span className="text-lg sm:text-xl font-display font-black text-white flex items-center gap-2">
                  <div className="p-1.5 bg-brand-secondary/10 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-brand-secondary" />
                  </div>
                  LVL {avgLevel}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-neutral-500 font-extrabold font-mono uppercase tracking-widest">Active Entries</span>
                <span className="text-lg sm:text-xl font-display font-black text-zinc-300 flex items-center gap-2">
                  <div className="p-1.5 bg-white/5 rounded-lg border border-white/5">
                    <Activity className="w-4 h-4 text-neutral-400" />
                  </div>
                  {characters.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Bento */}
        <div className="md:col-span-1">
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCreating(true)}
            className="w-full h-full flex flex-row md:flex-col justify-between items-center md:items-start p-6 bg-brand-primary text-black rounded-3xl group transition-all shadow-xl shadow-brand-primary/5 border border-white/10 hover:shadow-[0_0_35px_rgba(250,204,21,0.25)] relative overflow-hidden min-h-[140px] cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center group-hover:rotate-90 transition-transform duration-500 shadow-xl border border-white/10">
              <Plus className="w-6 h-6 text-brand-primary" />
            </div>
            <div className="text-left mt-0 md:mt-4">
              <p className="font-display font-black text-lg sm:text-xl uppercase italic tracking-tighter leading-none">New Record</p>
              <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-wider font-mono">Provision data slot</p>
            </div>
          </motion.button>
        </div>
      </section>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
        >
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="glass-card p-6 sm:p-10 shadow-3xl border-brand-primary/20 max-w-sm w-full relative overflow-hidden m-auto bg-neutral-900 border"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -mr-16 -mt-16"></div>
            <h2 className="text-2xl font-display font-black italic uppercase tracking-tighter mb-6 text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              Slot Provisioning
            </h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1">Identifier Name</label>
                <input
                  type="text"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="Record label..."
                  className="w-full px-5 py-4 bg-black/60 border border-white/5 text-white rounded-2xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary outline-none transition-all text-lg font-bold font-display uppercase tracking-wider"
                  autoFocus
                  maxLength={50}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-[2] py-4 bg-brand-primary text-black font-display font-black uppercase tracking-wider text-[10px] rounded-2xl shadow-lg border border-white/10 hover:bg-white transition-all cursor-pointer">
                  Activate
                </button>
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 bg-neutral-850 text-neutral-400 font-display font-black uppercase tracking-wider text-[10px] rounded-2xl hover:text-white border border-white/5 transition-all cursor-pointer">
                  Abort
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* Records Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between px-2 gap-3">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-tighter text-white">Active records collection</h2>
            <div className="w-8 h-1 bg-brand-primary rounded-full"></div>
          </div>
          <div className="text-[9px] text-neutral-500 font-mono font-extrabold uppercase tracking-[0.15em] bg-white/5 px-4 py-1.5 rounded-full border border-white/5 self-start">
            Sorted by hierarchy index
          </div>
        </div>

        {/* Dynamic Bento Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {sortedCharacters.map((char, index) => (
              <motion.div
                key={char.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: index * 0.04,
                  type: 'spring',
                  stiffness: 220,
                  damping: 18
                }}
                className="group"
              >
                <Link to={`/character/${char.id}`} className="block h-full">
                  <div className="glass-card p-6 h-full relative overflow-hidden transition-all duration-300 hover:border-brand-primary/30 active:scale-[0.99] flex flex-col justify-between border border-white/5 bg-neutral-900/40 backdrop-blur-xl">
                    {/* Glowing highlight trace */}
                    <div className="absolute top-0 right-0 w-28 h-28 bg-brand-primary/5 rounded-full blur-3xl group-hover:bg-brand-primary/10 transition-all pointer-events-none" />
                    
                    <div>
                      {/* Grid Header within card */}
                      <div className="flex justify-between items-start gap-3 mb-6">
                        <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                          <h3 className="text-xl sm:text-2xl font-display font-black italic uppercase tracking-tighter truncate text-zinc-100 group-hover:text-brand-primary transition-colors">
                            {char.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] text-neutral-500 font-mono tracking-tighter bg-black/40 border border-white/5 py-0.5 px-1.5 rounded uppercase">
                              ID: {char.id.slice(0, 8)}
                            </span>
                            {char.isSystem && (
                              <span className="text-[8px] font-black tracking-widest text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded border border-brand-primary/15 uppercase font-mono">SYSTEM</span>
                            )}
                          </div>
                        </div>

                        {!char.isSystem && (
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-brand-primary blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 font-display font-black text-xl italic text-brand-primary relative z-10 group-hover:scale-105 transition-transform duration-300">
                              {char.stats?.level || 0}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info blocks - Bento cells in card */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/30 border border-white/5 rounded-2xl p-3 flex flex-col justify-between min-h-[64px] group-hover:border-white/10 transition-all">
                          <span className="text-[8px] text-neutral-500 font-black uppercase tracking-wider font-mono">Vela Assets</span>
                          <span className="font-display font-black text-base sm:text-lg italic text-white flex items-baseline gap-1 mt-1">
                            {(char.stats?.vela || 0).toLocaleString()}
                            <span className="text-[9px] not-italic text-brand-primary font-mono font-bold opacity-60">V</span>
                          </span>
                        </div>
                        
                        {!char.isSystem ? (
                          <div className="bg-black/30 border border-white/5 rounded-2xl p-3 flex flex-col justify-between min-h-[64px] group-hover:border-white/10 transition-all">
                            <span className="text-[8px] text-neutral-500 font-black uppercase tracking-wider font-mono">Karma Point</span>
                            <span className="font-display font-black text-base sm:text-lg italic text-white mt-1">
                              {char.stats?.karmaPoint || 0}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-black/30 border border-white/5 rounded-2xl p-3 flex flex-col justify-between min-h-[64px]">
                            <span className="text-[8px] text-neutral-500 font-black uppercase tracking-wider font-mono">Status</span>
                            <span className="text-[10px] font-black uppercase text-brand-primary italic tracking-tight font-display mt-2">
                              RESERVED
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer actions */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] text-neutral-500 font-mono font-bold">
                        {formatDistanceToNow(char.updatedAt)} ago
                      </span>
                      <div className="flex items-center gap-1 text-brand-primary font-black text-[9px] tracking-widest uppercase group-hover:translate-x-1 transition-transform duration-300">
                        View Details
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>

          {characters.length === 0 && !isCreating && (
            <div className="col-span-full py-20 text-center bg-neutral-900/20 backdrop-blur-xl border border-white/5 rounded-[2.5rem] border-dashed">
              <Gamepad2 className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <h3 className="text-lg font-display font-bold mb-1">No characters created</h3>
              <p className="text-xs text-neutral-500 mb-6 max-w-xs mx-auto">Create your first character to start tracking metrics.</p>
              <button 
                onClick={() => setIsCreating(true)}
                className="btn-primary inline-flex cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Character
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Activity and Analytics Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Logs terminal */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/10">
                <Activity className="w-4 h-4 text-brand-primary" />
              </div>
              <h2 className="text-lg font-display font-black uppercase italic tracking-tighter text-white">Activity Logs</h2>
            </div>
            
            <div className="relative w-full sm:w-48 group">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 transition-colors group-focus-within:text-brand-primary" />
              <input
                type="text"
                value={searchLogChar}
                onChange={(e) => setSearchLogChar(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 bg-black/60 border border-white/5 text-white placeholder-neutral-700 rounded-full focus:ring-1 focus:ring-brand-primary outline-none transition-all text-[9.5px] font-mono tracking-wider uppercase"
                placeholder="SEARCH CHARACTER..."
              />
              {searchLogChar && (
                <button 
                  onClick={() => setSearchLogChar('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-neutral-900/40 backdrop-blur-xl rounded-3xl divide-y divide-white/5 overflow-hidden border border-white/5 max-h-[350px] overflow-y-auto no-scrollbar">
            {filteredLogs.slice(0, 30).map(log => {
              const char = characters.find(c => c.id === log.charId);
              return (
                <div key={log.id} className="p-4 hover:bg-white/[0.01] transition-colors group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span 
                      onClick={() => setSelectedInspectChar(char || { id: log.charId, name: log.charName || 'Archived Record', isArchived: true, stats: log.newData || {} })}
                      className="font-extrabold text-xs uppercase tracking-tight text-neutral-300 hover:text-brand-primary active:text-brand-primary/80 transition-colors truncate max-w-[150px] sm:max-w-xs cursor-pointer underline decoration-dotted decoration-neutral-700 hover:decoration-brand-primary underline-offset-4"
                      title="Inspect record inline"
                    >
                      {char?.name || log.charName || 'Archived ID'}
                    </span>
                    <span className="text-[9px] text-neutral-550 font-mono">{formatDistanceToNow(log.timestamp)} ago</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      log.action === 'CREATE' ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10B981]' : 
                      log.action === 'DELETE' ? 'bg-red-500' : 'bg-brand-primary'
                    }`} />
                    <span className="font-extrabold uppercase font-mono text-[9px] opacity-90 text-neutral-450">{log.action}:</span>
                    <span className="truncate">
                      {log.action === 'CREATE' && 'Character created'}
                      {log.action === 'UPDATE' && `${log.reason || 'Statistics updated'}`}
                      {log.action === 'UPDATE BY ADMIN' && `Updated by Admin: ${log.reason}`}
                      {log.action === 'DELETE' && 'Character deleted'}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredLogs.length === 0 && (
              <div className="p-16 text-center text-neutral-650 text-xs italic font-bold uppercase tracking-widest font-mono">No actions cached</div>
            )}
          </div>
        </div>

        {/* Analytics card */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-2">
            <div className="p-2 bg-brand-secondary/10 rounded-xl border border-brand-secondary/10">
              <TrendingUp className="w-4 h-4 text-brand-secondary" />
            </div>
            <h2 className="text-lg font-display font-black uppercase italic tracking-tighter text-white">System Analytics</h2>
          </div>

          <div className="bg-neutral-900/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-secondary/5 blur-[80px] -mr-10 -mt-10 rounded-full" />
            
            <div className="flex justify-between items-end mb-8">
              <div className="space-y-1">
                <p className="text-[9px] text-neutral-500 font-extrabold font-mono uppercase tracking-widest">Total Vela in Circulation</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-display font-black italic text-white leading-none">{totalVela.toLocaleString()}</span>
                  <span className="text-brand-primary font-bold text-lg font-mono uppercase tracking-widest">VELA</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-450 font-black text-[9px] bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 uppercase tracking-wider font-mono self-start">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ONLINE
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[9px] font-black uppercase font-mono tracking-wider">
                <span className="text-neutral-500">Active Circulation Rate</span>
                <span className="text-brand-secondary">65%</span>
              </div>
              <div className="h-3 w-full bg-black/40 border border-white/5 rounded-full overflow-hidden p-[2px]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5 mt-6">
              <div className="space-y-1">
                <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider font-mono">System Status</p>
                <p className="text-xs font-black text-emerald-400 italic uppercase tracking-wider font-display">Normal</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] text-neutral-550 font-bold uppercase tracking-wider font-mono">Security Status</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs font-black text-white italic uppercase tracking-wider font-display">Secured</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inline Sheet Inspection Modal overlay */}
      <AnimatePresence>
        {selectedInspectChar && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              className="bg-neutral-900 border border-white/5 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative overflow-hidden shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-[80px] rounded-full pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-display font-black text-xl italic shadow-md">
                    {selectedInspectChar.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-display font-black text-white uppercase italic tracking-tight">{selectedInspectChar.name}</h3>
                    <p className="text-[8px] text-neutral-500 font-mono tracking-tighter uppercase font-bold">SLOT: {selectedInspectChar.id?.slice(0, 10)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedInspectChar(null)} 
                  className="p-1.5 text-neutral-500 hover:text-white rounded-xl transition-colors bg-white/5 border border-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedInspectChar.isArchived ? (
                  <div className="py-8 text-center bg-black/30 border border-white/5 rounded-2xl">
                    <Shield className="w-8 h-8 text-neutral-700 mx-auto mb-2 animate-pulse" />
                    <p className="text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-widest">RECORD NOT DISCOVERABLE</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                        <span className="text-[8px] text-neutral-500 font-black uppercase tracking-wider font-mono">LEVEL</span>
                        <span className="font-display font-black text-lg text-white italic mt-1 flex items-center gap-1.5 text-brand-primary">
                          <Star className="w-3.5 h-3.5 fill-brand-primary/15" />
                          {selectedInspectChar.stats?.level || 0}
                        </span>
                      </div>
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between">
                        <span className="text-[8px] text-neutral-500 font-black uppercase tracking-wider font-mono">KARMA</span>
                        <span className="font-display font-black text-lg text-white italic mt-1 flex items-center gap-1.5 text-indigo-400">
                          <Heart className="w-3.5 h-3.5 fill-indigo-400/15" />
                          {selectedInspectChar.stats?.karmaPoint || 0}
                        </span>
                      </div>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[8px] text-neutral-550 font-black uppercase tracking-wider font-mono">VELA BALANCE</span>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="font-display font-black text-2xl text-white italic tracking-tight">{(selectedInspectChar.stats?.vela || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-brand-primary font-mono font-black tracking-widest">VELA</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[10px] bg-[#0A0A0A]/40 p-3 rounded-2xl border border-white/5 font-mono">
                      <div>
                        <p className="text-[8px] text-neutral-600 font-bold uppercase">Total Income</p>
                        <p className="text-emerald-400 font-black mt-0.5">{(selectedInspectChar.stats?.totalIncome || 0).toLocaleString()} V</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-neutral-600 font-bold uppercase">Total Expense</p>
                        <p className="text-red-400 font-black mt-0.5">{(selectedInspectChar.stats?.totalExpense || 0).toLocaleString()} V</p>
                      </div>
                    </div>
                  </>
                )}
                
                {!selectedInspectChar.isArchived && (
                  <Link
                    to={`/character/${selectedInspectChar.id}`}
                    onClick={() => setSelectedInspectChar(null)}
                    className="w-full py-3 bg-brand-primary hover:bg-white text-black rounded-2xl font-display font-black uppercase tracking-wider text-[10px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 border border-white/5 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    View Detailed Profile
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
