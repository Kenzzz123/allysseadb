import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trophy, Medal, Award, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function Leaderboard() {
  const { allCharacters } = useData();
  const [activeTab, setActiveTab] = useState<'vela' | 'exp'>('vela');

  // Filter out system characters
  const eligibleCharacters = allCharacters.filter(c => !c.isSystem);

  const velaLeaderboard = [...eligibleCharacters].sort((a, b) => (b.stats?.vela || 0) - (a.stats?.vela || 0));
  const expLeaderboard = [...eligibleCharacters].sort((a, b) => (b.stats?.exp || 0) - (a.stats?.exp || 0));

  const currentList = activeTab === 'vela' ? velaLeaderboard : expLeaderboard;

  const getRankLabel = (index: number) => {
    if (index === 0) return '1st';
    if (index === 1) return '2nd';
    if (index === 2) return '3rd';
    return `${index + 1}.`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-slate-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-slate-400">{index + 1}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 flex items-center justify-center gap-3">
          <Trophy className="w-10 h-10 text-indigo-600" />
          Hall of Fame
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          The most prestigious characters in the realm, ranked by their wealth and experience.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-2 shadow-sm border border-slate-200 flex">
        <button
          onClick={() => setActiveTab('vela')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'vela' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Top Wealth (Vela)
        </button>
        <button
          onClick={() => setActiveTab('exp')}
          className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'exp' 
              ? 'bg-indigo-600 text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Top Experience (EXP)
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 uppercase tracking-wider text-sm">
            {activeTab === 'vela' ? 'Vela Rankings' : 'Experience Rankings'}
          </h2>
          <span className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
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
                index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' :
                index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-slate-200' :
                index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' :
                'bg-white border-slate-100 hover:border-indigo-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-slate-400' :
                    index === 2 ? 'bg-amber-600' :
                    'bg-indigo-500'
                  }`}>
                    {char.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      {getRankLabel(index)} {char.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {activeTab === 'vela' ? (
                  <div className="font-mono font-bold text-yellow-600 flex items-center gap-1.5 justify-end">
                    <span>---</span>
                    {(char.stats?.vela || 0).toLocaleString()} Vela
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <div className="font-mono font-bold text-indigo-600 flex items-center gap-1.5">
                      <span>---</span>
                      {(char.stats?.exp || 0).toLocaleString()} EXP
                    </div>
                    <div className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3" />
                      Level {Math.floor((char.stats?.exp || 0) / 5000)}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {currentList.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No characters found in the rankings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
