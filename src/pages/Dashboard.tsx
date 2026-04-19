import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Plus, Swords, Shield, Heart, Coins, TrendingUp, Clock, Activity, Gamepad2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const { characters, createCharacter, logs } = useData();
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState('');

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
  const avgLevel = useMemo(() => characters.length ? Math.round(characters.reduce((sum, c) => sum + (c.stats?.level || 0), 0) / characters.length) : 0, [characters]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Your Records</h1>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/10 active:scale-95 border border-indigo-400/20"
          >
            <Plus className="w-5 h-5" />
            Create Record
          </button>
        </div>

        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900 p-6 rounded-2xl shadow-sm border border-neutral-800"
          >
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="Enter record name..."
                className="flex-1 px-4 py-2 border border-neutral-800 bg-black text-white placeholder-neutral-500 rounded-xl focus:ring-1 focus:ring-neutral-700 focus:outline-none"
                autoFocus
                maxLength={50}
                required
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="submit" className="flex-1 sm:flex-none px-8 py-2 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 transition-all active:scale-95">
                  Save
                </button>
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 sm:flex-none px-6 py-2 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {sortedCharacters.map(char => (
              <motion.div
                key={char.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800 hover:shadow-xl hover:border-neutral-700 transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{char.name}</h3>
                    <div className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      Updated {formatDistanceToNow(char.updatedAt)} ago
                    </div>
                  </div>
                  {!char.isSystem && (
                    <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-indigo-400 font-bold text-lg border border-neutral-700/50">
                      Lv{char.stats?.level || 0}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {!char.isSystem && (
                    <>
                      <div className="flex items-center gap-2 text-neutral-300">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="font-medium">{char.stats?.karmaPoint || 0} Karma</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{(char.stats?.vela || 0).toLocaleString()} Vela</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link 
                    to={`/character/${char.id}`}
                    className="flex-1 text-center py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all border border-neutral-700 group-hover:border-indigo-500/50"
                  >
                    Manage Record
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {characters.length === 0 && !isCreating && (
            <div className="col-span-full py-12 text-center bg-neutral-900 rounded-3xl border border-dashed border-neutral-800">
              <Gamepad2 className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No records yet</h3>
              <p className="text-neutral-500 mb-4">Create your first record to start your journey.</p>
              <button 
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl font-medium hover:bg-indigo-500/20"
              >
                Create Record
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            Account Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <span className="text-neutral-500">Total Records</span>
              <span className="font-bold text-white">{characters.length}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <span className="text-neutral-500">Total Vela</span>
              <span className="font-bold text-yellow-500">{totalVela.toLocaleString()} V</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500">Average Level</span>
              <span className="font-bold text-indigo-400">Lv {avgLevel}</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-6 shadow-sm border border-neutral-800">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Recent Activity
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {logs.slice(0, 5).map(log => {
              const char = characters.find(c => c.id === log.charId);
              return (
                <div key={log.id} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white">{char?.name || 'Unknown'}</span>
                    <span className="text-xs text-neutral-500">{formatDistanceToNow(log.timestamp)} ago</span>
                  </div>
                  <div className="text-neutral-400">
                    {log.action === 'CREATE' && 'Record created'}
                    {log.action === 'UPDATE' && 'Stats updated'}
                    {log.action === 'DELETE' && 'Record deleted'}
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="text-sm text-neutral-500 text-center py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
