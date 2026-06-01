import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Award, Star, RefreshCw, Clock, Flame, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Leaderboard() {
  const { 
    topVela, 
    topLevel, 
    refreshLeaderboard, 
    countdown, 
    morningHour, 
    morningMinute, 
    eveningHour, 
    eveningMinute, 
    updateLeaderboardHours 
  } = useData();
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'vela' | 'level'>('vela');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isEditingHours, setIsEditingHours] = useState(false);
  const [tempMorningHour, setTempMorningHour] = useState(morningHour);
  const [tempMorningMinute, setTempMorningMinute] = useState(morningMinute);
  const [tempEveningHour, setTempEveningHour] = useState(eveningHour);
  const [tempEveningMinute, setTempEveningMinute] = useState(eveningMinute);

  React.useEffect(() => {
    setTempMorningHour(morningHour);
    setTempMorningMinute(morningMinute);
    setTempEveningHour(eveningHour);
    setTempEveningMinute(eveningMinute);
  }, [morningHour, morningMinute, eveningHour, eveningMinute]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshLeaderboard();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const currentList = activeTab === 'vela' ? topVela : topLevel;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header Section */}
      <section className="text-center space-y-4 relative py-6">
        <div className="absolute inset-x-0 top-0 h-40 bg-brand-primary/5 blur-[80px] -z-10 rounded-full" />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 bg-neutral-900 border border-white/5 px-4 py-1.5 rounded-full mb-2"
        >
          <Flame className="w-3.5 h-3.5 text-brand-primary animate-pulse" />
          <span className="text-[9px] uppercase font-black tracking-[0.25em] text-neutral-450 font-mono text-zinc-400">Top Standings</span>
        </motion.div>
        
        <h1 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight uppercase italic">
          Hall <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-amber-200 to-indigo-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.2)]">of</span> Fame
        </h1>

        <div className="flex flex-col items-center gap-4 pt-2">
          {/* Stunning floating info card */}
          <div className="flex items-center gap-3.5 bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-3.5 shadow-xl">
            <div className="p-2 bg-brand-primary/10 rounded-xl border border-brand-primary/10">
              <Clock className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="text-left leading-none">
              <p className="text-[9px] text-neutral-500 font-black uppercase tracking-wider mb-1 font-mono">Sync Interval</p>
              <p className="text-lg font-display font-black text-white">{countdown}</p>
            </div>
          </div>
          
          <div className="text-[10px] text-neutral-550 bg-neutral-950/20 border border-white/5 px-4 py-2 rounded-full flex flex-col sm:flex-row items-center gap-2 text-zinc-400">
            <div className="flex items-center gap-1 font-mono">
              <span>Synchronized daily:</span>
              <span className="font-bold text-neutral-300">
                {morningHour.toString().padStart(2, '0')}:{morningMinute.toString().padStart(2, '0')}
              </span>
              <span>&</span>
              <span className="font-bold text-neutral-300">
                {eveningHour.toString().padStart(2, '0')}:{eveningMinute.toString().padStart(2, '0')}
              </span>
              <span className="text-brand-primary font-bold">WIB</span>
            </div>
            {userProfile?.role === 'admin' && (
              <button 
                onClick={() => setIsEditingHours(true)}
                className="text-brand-primary hover:text-white text-[9px] font-black uppercase tracking-wider bg-brand-primary/10 px-2.5 py-1 rounded-md border border-brand-primary/20 transition-all cursor-pointer"
              >
                Configure
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Hour Config Modal */}
      {isEditingHours && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 border-brand-primary/20 max-w-sm w-full space-y-6 bg-neutral-900 border rounded-3xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-black text-white uppercase tracking-wider font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-primary" />
              Sync Scheduler
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest pl-1">Morning Cycle</label>
                <div className="flex gap-2 items-center">
                  <select 
                    value={tempMorningHour}
                    onChange={(e) => setTempMorningHour(parseInt(e.target.value, 10))}
                    className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-3.5 text-white text-xs font-mono font-bold"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')} H</option>
                    ))}
                  </select>
                  <span className="text-white font-mono">:</span>
                  <select 
                    value={tempMorningMinute}
                    onChange={(e) => setTempMorningMinute(parseInt(e.target.value, 10))}
                    className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-3.5 text-white text-xs font-mono font-bold"
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')} M</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[9px] font-black text-neutral-500 uppercase tracking-widest pl-1">Evening Cycle</label>
                <div className="flex gap-2 items-center">
                  <select 
                    value={tempEveningHour}
                    onChange={(e) => setTempEveningHour(parseInt(e.target.value, 10))}
                    className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-3.5 text-white text-xs font-mono font-bold"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')} H</option>
                    ))}
                  </select>
                  <span className="text-white font-mono">:</span>
                  <select 
                    value={tempEveningMinute}
                    onChange={(e) => setTempEveningMinute(parseInt(e.target.value, 10))}
                    className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-3.5 text-white text-xs font-mono font-bold"
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')} M</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await updateLeaderboardHours(tempMorningHour, tempMorningMinute, tempEveningHour, tempEveningMinute);
                  setIsEditingHours(false);
                }}
                className="flex-[2] py-3 bg-brand-primary text-black font-display font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Authorize
              </button>
              <button
                onClick={() => setIsEditingHours(false)}
                className="flex-1 py-3 bg-neutral-850 text-neutral-400 font-display font-black text-[10px] uppercase tracking-wider rounded-xl border border-white/5 cursor-pointer hover:text-white"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Section with stunning pill shape styling */}
      <section className="bg-neutral-900/40 backdrop-blur-xl rounded-[2rem] p-1.5 border border-white/5 flex items-center gap-1.5 sticky top-20 z-30 mx-auto max-w-[320px] sm:max-w-[400px] shadow-2xl">
        <button
          onClick={() => setActiveTab('vela')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.75rem] font-display font-black uppercase text-xs transition-all relative overflow-hidden tracking-wider cursor-pointer ${
            activeTab === 'vela' 
              ? 'text-black' 
              : 'text-neutral-500 hover:text-zinc-300'
          }`}
        >
          {activeTab === 'vela' && (
            <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-primary -z-10 rounded-[1.75rem]" />
          )}
          <Zap className={`w-3.5 h-3.5 ${activeTab === 'vela' ? 'text-black' : 'text-neutral-600'}`} />
          Vela assets
        </button>
        <button
          onClick={() => setActiveTab('level')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.75rem] font-display font-black uppercase text-xs transition-all relative overflow-hidden tracking-wider cursor-pointer ${
            activeTab === 'level' 
              ? 'text-black' 
              : 'text-neutral-500 hover:text-zinc-300'
          }`}
        >
          {activeTab === 'level' && (
            <motion.div layoutId="activeTab" className="absolute inset-0 bg-brand-primary -z-10 rounded-[1.75rem]" />
          )}
          <Star className={`w-3.5 h-3.5 ${activeTab === 'level' ? 'text-black' : 'text-neutral-600'}`} />
          Hierarchy Index
        </button>
        
        {userProfile?.role === 'admin' && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-3 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-brand-primary rounded-full transition-all disabled:opacity-50 border border-white/5 cursor-pointer"
            title="Force Sync (Admin)"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </section>

      {/* List Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest font-mono">Global Standing array</span>
          <span className="text-[9px] font-extrabold text-neutral-500 uppercase tracking-widest bg-white/5 border border-white/5 py-1 px-3 rounded-full font-mono">{currentList.length} Connected</span>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {currentList.map((char, index) => {
              const rank = index + 1;
              
              return (
                <motion.div
                  key={char.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group glass-card p-4 sm:p-5 flex items-center justify-between border transition-all duration-300 hover:border-white/10 bg-neutral-900/20 backdrop-blur-md rounded-2xl ${
                    rank === 1 ? 'border-brand-primary/20 bg-gradient-to-r from-brand-primary/[0.04] to-transparent shadow-[0_0_20px_rgba(250,204,21,0.03)]' :
                    rank === 2 ? 'border-indigo-400/10 bg-gradient-to-r from-indigo-400/[0.02] to-transparent' :
                    rank === 3 ? 'border-amber-600/10 bg-gradient-to-r from-amber-600/[0.02] to-transparent' : 'border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Rank index badge */}
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl font-display font-black text-lg italic ${
                      rank === 1 ? 'text-brand-primary font-bold' :
                      rank === 2 ? 'text-indigo-300' :
                      rank === 3 ? 'text-amber-500' : 'text-neutral-600'
                    }`}>
                      {rank}
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-display font-black text-base shadow-sm border ${
                        rank === 1 ? 'bg-brand-primary text-black border-white/20' :
                        rank === 2 ? 'bg-indigo-400 text-black border-white/10' :
                        rank === 3 ? 'bg-amber-600 text-white border-white/10' :
                        'bg-neutral-950 text-neutral-500 border-white/5'
                      }`}>
                        {(char.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white group-hover:text-brand-primary transition-colors truncate text-sm sm:text-base">{char.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-bold text-neutral-500 font-mono tracking-tighter truncate uppercase bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                            ID: {char.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-4">
                    {activeTab === 'vela' ? (
                      <div className="flex flex-col items-end leading-none">
                        <p className="text-[8px] text-neutral-500 font-extrabold uppercase font-mono tracking-wider mb-1">Vela</p>
                        <p className={`font-display font-black text-base sm:text-[1.3rem] italic ${rank === 1 ? 'text-brand-primary' : 'text-white'}`}>
                          {(char.stats?.vela || 0).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end leading-none">
                        <p className="text-[8px] text-neutral-500 font-extrabold uppercase font-mono tracking-wider mb-1">LVL</p>
                        <p className="font-display font-black text-base sm:text-lg italic text-zinc-200">
                          {char.stats?.level || 0}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {currentList.length === 0 && (
            <div className="py-20 text-center bg-neutral-900/10 border-dashed border border-white/5 rounded-3xl">
              <Star className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-xs text-neutral-550 italic font-mono uppercase tracking-widest">Global stack empty</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
