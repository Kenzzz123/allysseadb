import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trophy, Medal, Award, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function Leaderboard() {
  const { allCharacters } = useData();
  const [activeTab, setActiveTab] = useState<'vela' | 'level'>('vela');

  // Filter out system characters
  const eligibleCharacters = allCharacters.filter(c => !c.isSystem);

  const velaLeaderboard = [...eligibleCharacters].sort((a, b) => (b.stats?.vela || 0) - (a.stats?.vela || 0));
  const levelLeaderboard = [...eligibleCharacters].sort((a, b) => (b.stats?.level || 0) - (a.stats?.level || 0));

  const currentList = activeTab === 'vela' ? velaLeaderboard : levelLeaderboard;

  const getRankLabel = (index: number) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}.`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-neutral-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-neutral-400">{index + 1}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-indigo-400" />
          Hall of Fame
        </h1>
        <p className="text-neutral-500 max-w-2xl mx-auto">
          The most prestigious characters in the realm, ranked by their wealth and level.
        </p>
      </div>

      <div className="bg-neutral-900 rounded-3xl p-2 shadow-sm border border-neutral-800 flex">
        <button
          onClick={() => setActiveTab('vela')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'vela' 
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
              : 'text-neutral-500 hover:bg-black hover:text-white'
          }`}
        >
          Top Wealth (Vela)
        </button>
        <button
          onClick={() => setActiveTab('level')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'level' 
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' 
              : 'text-neutral-500 hover:bg-black hover:text-white'
          }`}
        >
          Top Level
        </button>
      </div>

      <div className="bg-neutral-900 rounded-3xl shadow-sm border border-neutral-800 overflow-hidden">
        <div className="p-6 bg-black border-b border-neutral-800 flex justify-between items-center">
          <h2 className="font-bold text-neutral-300 uppercase tracking-wider text-sm">
            {activeTab === 'vela' ? 'Vela Rankings' : 'Level Rankings'}
          </h2>
          <span className="text-xs font-medium text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
            {currentList.length} Characters
          </span>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
          {currentList.map((char, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={char.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-md ${
                index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                index === 1 ? 'bg-neutral-800 border-neutral-700' :
                index === 2 ? 'bg-amber-600/10 border-amber-600/30' :
                'bg-black border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-neutral-400 text-black' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-neutral-800 text-neutral-400'
                  }`}>
                    {char.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {getRankLabel(index)} {char.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {activeTab === 'vela' ? (
                  <div className="font-mono font-bold text-yellow-500 flex items-center gap-1.5 justify-end">
                    <span>---</span>
                    {(char.stats?.vela || 0).toLocaleString()} Vela
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <div className="font-mono font-bold text-indigo-400 flex items-center gap-1.5">
                      <span>---</span>
                      Level {(char.stats?.level || 0)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {currentList.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              No characters found in the rankings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
