import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, CharacterStats } from '../contexts/DataContext';
import { ArrowLeft, Save, Trash2, History, TrendingUp, TrendingDown, Minus, Plus, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { characters, allCharacters, updateCharacter, deleteCharacter, logs, allLogs } = useData();
  
  // Find character in user's characters or all characters (if admin)
  const character = characters.find(c => c.id === id) || allCharacters.find(c => c.id === id);
  const charLogs = (logs.length > 0 ? logs : allLogs).filter(l => l.charId === id).sort((a, b) => b.timestamp - a.timestamp);

  const [addStats, setAddStats] = useState<Record<string, string | number>>({
    exp: '',
    valorPoint: '',
    karmaPoint: '',
    vela: '',
    totalIncome: '',
    totalExpense: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [updateFrom, setUpdateFrom] = useState('');
  const [updateReason, setUpdateReason] = useState('');

  const [showPinSettings, setShowPinSettings] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [pinSettingsError, setPinSettingsError] = useState('');
  const [pinSettingsSuccess, setPinSettingsSuccess] = useState('');
  const { updateCharacterPin } = useData();

  if (!character) {
    return <div className="p-8 text-center">Loading record...</div>;
  }

  const handleSave = async () => {
    if (!id) return;
    
    if (character.isSystem && character.pin && !showPinPrompt) {
      setShowPinPrompt(true);
      setPinInput('');
      setPinError('');
      return;
    }

    if (showPinPrompt) {
      if (pinInput !== character.pin) {
        setPinError('Incorrect PIN');
        return;
      }
    }

    setIsSaving(true);
    try {
      const newStats = { ...character.stats };
      
      // Apply additions
      const parseAdd = (val: string | number | undefined) => {
        if (!val || val === '-' || val === '') return 0;
        const parsed = typeof val === 'string' ? parseInt(val) : val;
        return isNaN(parsed) ? 0 : parsed;
      };

      if (addStats.exp) newStats.exp = (newStats.exp || 0) + parseAdd(addStats.exp);
      if (addStats.valorPoint) newStats.valorPoint = (newStats.valorPoint || 0) + parseAdd(addStats.valorPoint);
      if (addStats.karmaPoint) newStats.karmaPoint = (newStats.karmaPoint || 0) + parseAdd(addStats.karmaPoint);
      if (addStats.totalIncome) newStats.totalIncome = (newStats.totalIncome || 0) + parseAdd(addStats.totalIncome);
      if (addStats.totalExpense) newStats.totalExpense = (newStats.totalExpense || 0) + parseAdd(addStats.totalExpense);
      
      // Auto-calculate Vela
      newStats.vela = (newStats.totalIncome || 0) - (newStats.totalExpense || 0);
      
      // Auto-calculate level based on EXP (1 level per 5000 EXP)
      newStats.level = Math.floor(newStats.exp / 5000);

      await updateCharacter(id, newStats, updateFrom, updateReason);
      
      // Reset add stats
      setAddStats({
        exp: '',
        valorPoint: '',
        karmaPoint: '',
        vela: '',
        totalIncome: '',
        totalExpense: '',
      });
      setUpdateFrom('');
      setUpdateReason('');
      setShowPinPrompt(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!id) return;
    setPinSettingsError('');
    setPinSettingsSuccess('');

    if (character.pin && oldPin !== character.pin) {
      setPinSettingsError('Original PIN is incorrect');
      return;
    }

    if (newPin && newPin.length !== 4) {
      setPinSettingsError('New PIN must be exactly 4 digits');
      return;
    }

    try {
      await updateCharacterPin(id, newPin || null);
      setPinSettingsSuccess(newPin ? 'PIN updated successfully' : 'PIN removed successfully');
      setOldPin('');
      setNewPin('');
    } catch (err) {
      setPinSettingsError('Failed to update PIN');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this record?')) {
      await deleteCharacter(id);
      navigate('/dashboard');
    }
  };

  const handleAddChange = (field: string, value: string) => {
    setAddStats(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = Object.values(addStats).some(val => {
    if (typeof val === 'string') {
      return val !== '' && val !== '-' && parseInt(val) !== 0 && !isNaN(parseInt(val));
    }
    return val !== 0;
  });

  const renderDiff = (oldVal: number, newVal: number) => {
    const diff = newVal - oldVal;
    if (diff === 0) return <span className="text-slate-400"><Minus className="w-3 h-3 inline" /></span>;
    if (diff > 0) return <span className="text-emerald-500 flex items-center text-xs"><TrendingUp className="w-3 h-3 mr-1" /> +{diff}</span>;
    return <span className="text-red-500 flex items-center text-xs"><TrendingDown className="w-3 h-3 mr-1" /> {diff}</span>;
  };

  const lastLog = charLogs[0];
  const lastUpdateWasAdmin = lastLog?.action === 'UPDATE BY ADMIN';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Link>
        <button 
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
          title="Delete Record"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {lastUpdateWasAdmin && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 px-6 py-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <div className="mt-0.5 text-purple-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-purple-900">Stats Updated by Admin</h3>
            <p className="text-sm mt-1">An admin recently updated your stats. Reason: {lastLog.reason}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-1/3 flex flex-col items-center text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-lg mb-4">
              {character.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{character.name}</h1>
            {!character.isSystem && (
              <p className="text-slate-500 mt-1">Level {Math.floor((character.stats?.exp || 0) / 5000)}</p>
            )}
            <div className="mt-4 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full font-bold flex items-center gap-2">
              <span className="text-xl">💰</span> {(character.stats?.vela || 0).toLocaleString()} Vela
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
              <h2 className="text-xl font-bold text-slate-900">Edit Stats</h2>
              {hasChanges && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-full animate-pulse">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { key: 'exp', label: 'Experience', hideSystem: true },
                { key: 'valorPoint', label: 'Valor Point', hideSystem: true },
                { key: 'karmaPoint', label: 'Karma Point', hideSystem: true },
                { key: 'totalIncome', label: 'Total Income' },
                { key: 'totalExpense', label: 'Total Expense' },
              ].filter(stat => !(character.isSystem && stat.hideSystem)).map(stat => {
                const currentVal = character.stats[stat.key as keyof CharacterStats] || 0;
                const addVal = addStats[stat.key as keyof CharacterStats] !== undefined ? addStats[stat.key as keyof CharacterStats] : '';
                return (
                  <div key={stat.key} className="space-y-2">
                    <label className="flex justify-between text-sm font-medium text-slate-700 capitalize">
                      {stat.label} (Current: {currentVal})
                      {addVal !== 0 && addVal !== '' && addVal !== '-' && (
                        <span className="text-indigo-600 font-bold">
                          {renderDiff(currentVal, currentVal + parseInt(addVal as string))}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-medium">+/-</span>
                      </div>
                      <input
                        type="text"
                        value={addVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
                            handleAddChange(stat.key, val);
                          }
                        }}
                        placeholder="0 (use - to subtract)"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-lg"
                      />
                    </div>
                    {addVal !== 0 && addVal !== '' && addVal !== '-' && (
                      <div className="text-xs text-slate-500 text-right">
                        New total: <span className="font-bold text-slate-700">{currentVal + parseInt(addVal as string)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasChanges && (
              <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900">Change Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">From <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={updateFrom}
                      onChange={(e) => setUpdateFrom(e.target.value)}
                      placeholder="e.g. Quest Reward, Shop Sale"
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Reason <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                      placeholder="e.g. Completed daily quest"
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || (hasChanges && (!updateFrom.trim() || !updateReason.trim()))}
                className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                  hasChanges && updateFrom.trim() && updateReason.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-200' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {character.isSystem && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Shop Security (PIN)</h2>
            <button 
              onClick={() => setShowPinSettings(!showPinSettings)}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              {showPinSettings ? 'Cancel' : (character.pin ? 'Change/Remove PIN' : 'Set PIN')}
            </button>
          </div>
          
          {showPinSettings && (
            <div className="space-y-4 max-w-md">
              {pinSettingsError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{pinSettingsError}</div>}
              {pinSettingsSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">{pinSettingsSuccess}</div>}
              
              {character.pin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    placeholder="****"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New PIN (Leave blank to remove)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="****"
                />
              </div>
              
              <button
                onClick={handleUpdatePin}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
              >
                Save PIN Settings
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          Change History
        </h2>
        
        <div className="space-y-6">
          {charLogs.map(log => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={log.id} 
              className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-slate-400">
                {log.action === 'CREATE' ? <Plus className="w-5 h-5 text-emerald-500" /> : log.action === 'UPDATE BY ADMIN' ? <Shield className="w-5 h-5 text-purple-500" /> : <Save className="w-5 h-5 text-indigo-500" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-medium ${log.action === 'UPDATE BY ADMIN' ? 'text-purple-700' : 'text-slate-900'}`}>
                    {log.action === 'CREATE' ? 'Record Created' : log.action === 'UPDATE BY ADMIN' ? 'Updated by Admin' : 'Stats Updated'}
                  </span>
                  <span className="text-sm text-slate-500">{formatDistanceToNow(log.timestamp)} ago</span>
                </div>
                
                {(log.action === 'UPDATE' || log.action === 'UPDATE BY ADMIN') && log.oldData && log.newData && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    {Object.keys(log.newData).map(key => {
                      const k = key as keyof CharacterStats;
                      const oldVal = log.oldData![k];
                      const newVal = log.newData![k];
                      if (oldVal === newVal) return null;
                      return (
                        <div key={k} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-slate-500 capitalize w-16">{k}:</span>
                          <span className="text-slate-400 line-through">{oldVal}</span>
                          <ArrowLeft className="w-3 h-3 text-slate-300 rotate-180" />
                          <span className="font-medium text-slate-900">{newVal}</span>
                          {renderDiff(oldVal || 0, newVal || 0)}
                        </div>
                      );
                    })}
                  </div>
                )}
                {log.from && log.reason && (
                  <div className="mt-3 text-sm bg-white p-3 rounded-xl border border-slate-200">
                    <p className="mb-1"><span className="font-semibold text-slate-700">From:</span> <span className="text-slate-600">{log.from}</span></p>
                    <p><span className="font-semibold text-slate-700">Reason:</span> <span className="text-slate-600">{log.reason}</span></p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {charLogs.length === 0 && (
            <div className="text-center text-slate-500 py-8">No history available.</div>
          )}
        </div>
      </div>

      {showPinPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Enter Shop PIN</h3>
            <p className="text-sm text-slate-500 mb-6">This system account requires a PIN to update stats.</p>
            
            {pinError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{pinError}</div>}
            
            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 mb-6 text-center text-2xl tracking-widest"
              placeholder="****"
              autoFocus
            />
            
            <div className="flex gap-4">
              <button
                onClick={() => setShowPinPrompt(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
              >
                Verify & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
