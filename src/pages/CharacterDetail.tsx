import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData, CharacterStats } from '../contexts/DataContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ArrowLeft, Save, Trash2, History, TrendingUp, TrendingDown, Minus, Plus, Shield, Edit2, Check, X, Download, Star, Zap, Coins, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile, characters, updateCharacter, renameCharacter, deleteCharacter } = useData();
  const [character, setCharacter] = useState<any>(null);
  const [hasLoadedAtLeastOnce, setHasLoadedAtLeastOnce] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const isAdmin = userProfile?.role === 'admin';
  const [charLogs, setCharLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    // Is it one of the current user's characters?
    const myChar = characters.find(c => c.id === id);
    if (myChar) {
      setCharacter(myChar);
      setHasLoadedAtLeastOnce(true);
      return;
    }

    // Otherwise, listen directly to this character doc (especially useful for admins or direct links)
    let unsub = () => {};
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      unsub = onSnapshot(doc(db, 'characters', id), (snap) => {
        if (snap.exists()) {
          setCharacter({ id: snap.id, ...snap.data() });
        } else {
          setCharacter(null);
        }
        setHasLoadedAtLeastOnce(true);
      }, (err) => {
        console.error("Error loading character detail doc:", err);
        setHasLoadedAtLeastOnce(true);
      });
    });

    return () => unsub();
  }, [id, characters]);

  // Load owner's profile on demand (without needing to download allUsers database)
  useEffect(() => {
    if (!character?.userId) {
      setOwnerEmail('');
      return;
    }
    
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'users', character.userId)).then((snap) => {
        if (snap.exists()) {
          setOwnerEmail(snap.data().email || 'N/A');
        } else {
          setOwnerEmail('N/A');
        }
      }).catch(() => {
        setOwnerEmail('N/A');
      });
    });
  }, [character?.userId]);

  const ownerProfile = { email: ownerEmail };

  useEffect(() => {
    if (!id) return;
    
    let unsub = () => {};
    
    import('firebase/firestore').then(({ collection, query, where, orderBy, limit, onSnapshot }) => {
      const q = query(
        collection(db, 'logs'),
        where('charId', '==', id),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      unsub = onSnapshot(q, (snap) => {
        setCharLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
      });
    });

    return () => unsub();
  }, [id]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (character) {
      setTempName(character.name);
    }
  }, [character?.name]);

  const [addStats, setAddStats] = useState<Record<string, string | number>>({
    level: '',
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
    if (!hasLoadedAtLeastOnce) {
      return <div className="p-8 text-center text-neutral-400">Loading record...</div>;
    }
    return <div className="p-8 text-center text-red-400 font-bold">Record not found.</div>;
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

      if (character.isSystem) {
        if (addStats.vela) {
          const adj = parseAdd(addStats.vela);
          if (adj > 0) {
            newStats.totalIncome = (newStats.totalIncome || 0) + adj;
          } else if (adj < 0) {
            newStats.totalExpense = (newStats.totalExpense || 0) + Math.abs(adj);
          }
        }
      } else {
        if (addStats.level) newStats.level = (newStats.level || 0) + parseAdd(addStats.level);
        if (addStats.karmaPoint) newStats.karmaPoint = (newStats.karmaPoint || 0) + parseAdd(addStats.karmaPoint);
        if (addStats.totalIncome) newStats.totalIncome = (newStats.totalIncome || 0) + parseAdd(addStats.totalIncome);
        if (addStats.totalExpense) newStats.totalExpense = (newStats.totalExpense || 0) + parseAdd(addStats.totalExpense);
      }
      
      // Auto-calculate Vela
      newStats.vela = (newStats.totalIncome || 0) - (newStats.totalExpense || 0);

      await updateCharacter(id, newStats, updateFrom, updateReason);
      
      // Reset add stats
      setAddStats({
        level: '',
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
    if (diff === 0) return <span className="text-neutral-500"><Minus className="w-3 h-3 inline" /></span>;
    if (diff > 0) return <span className="text-emerald-400 flex items-center text-xs"><TrendingUp className="w-3 h-3 mr-1" /> +{diff}</span>;
    return <span className="text-red-400 flex items-center text-xs"><TrendingDown className="w-3 h-3 mr-1" /> {diff}</span>;
  };

  const lastLog = charLogs[0];
  const lastUpdateWasAdmin = lastLog?.action === 'UPDATE BY ADMIN';

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex items-center justify-between px-2">
        <Link to="/dashboard" className="flex items-center text-neutral-500 hover:text-white transition-all group">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mr-3 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">Back</span>
        </Link>
        <button 
          onClick={handleDelete}
          className="text-red-500/50 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-all"
          title="Delete Record"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {lastUpdateWasAdmin && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary px-6 py-4 rounded-3xl flex items-start gap-4 shadow-xl"
        >
          <div className="mt-1">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">Admin Override Applied</h3>
            <p className="text-sm opacity-80 mt-1 font-medium">Reason: {lastLog.reason}</p>
          </div>
        </motion.div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="glass-card p-10 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl -mr-10 -mt-10 rounded-full" />
          
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-brand-primary to-amber-600 flex items-center justify-center text-black text-5xl font-display font-black shadow-[0_0_40px_rgba(250,204,21,0.2)]">
              {(character.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0A0A0A] border-4 border-[#0A0A0A] rounded-2xl flex items-center justify-center">
              <div className="w-full h-full bg-white/10 rounded-xl flex items-center justify-center">
                <Star className="w-4 h-4 text-brand-primary" />
              </div>
            </div>
          </div>
          
          {isEditingName ? (
            <div className="flex items-center gap-2 mb-4 w-full">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="input-field text-center font-bold text-xl"
                autoFocus
              />
              <button 
                onClick={async () => {
                  if (tempName.trim() && tempName !== character.name) {
                    await renameCharacter(character.id, tempName.trim());
                  }
                  setIsEditingName(false);
                }}
                className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors"
              >
                <Check className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  setTempName(character.name);
                  setIsEditingName(false);
                }}
                className="p-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="group cursor-pointer mb-2" onClick={() => setIsEditingName(true)}>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-black tracking-tight text-white">{character.name}</h1>
                <Edit2 className="w-4 h-4 text-neutral-600 group-hover:text-brand-primary transition-colors" />
              </div>
            </div>
          )}

          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 mb-6">
            Ref: {character.id.slice(0, 8)}
          </div>

          {!character.isSystem && (
            <div className="bg-white/5 border border-white/5 px-6 py-2 rounded-2xl flex items-center gap-3 mb-6">
              <Zap className="w-4 h-4 text-brand-primary" />
              <span className="font-bold text-lg">Level {character.stats?.level || 0}</span>
            </div>
          )}

          <div className="w-full space-y-3">
            <div className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Vela Balance</span>
              <span className="font-display font-black text-xl text-brand-primary">{(character.stats?.vela || 0).toLocaleString()} V</span>
            </div>
            {isAdmin && (
              <div className="p-3 bg-brand-secondary/5 border border-brand-secondary/10 rounded-2xl">
                <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Owner Account</p>
                <p className="text-xs font-bold text-neutral-300 truncate">{ownerProfile?.email || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 md:p-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
              <div>
                <h2 className="text-2xl font-display font-black uppercase italic tracking-tight">Edit <span className="text-brand-primary">Stats</span></h2>
                <p className="text-xs text-neutral-500 font-medium mt-1">Modify record statistics in real-time</p>
              </div>
              {hasChanges && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="px-4 py-1.5 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-[10px] font-black uppercase tracking-widest rounded-full"
                >
                  Pending Save
                </motion.div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {character.isSystem ? (
                <div className="md:col-span-2 space-y-2">
                  <label className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Add or Remove Vela</span>
                    {addStats.vela !== 0 && addStats.vela !== '' && addStats.vela !== '-' && (
                      <div className="text-xs font-bold">
                        {renderDiff(character.stats.vela, character.stats.vela + parseInt(addStats.vela as string))}
                      </div>
                    )}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Coins className="w-5 h-5 text-neutral-600 group-focus-within:text-brand-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={addStats.vela}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || val === '-' || /^-?\d+$/.test(val)) {
                          handleAddChange('vela', val);
                        }
                      }}
                      placeholder="0 (e.g. -500 to subtract)"
                      className="input-field pl-12 text-xl font-display font-bold py-4"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {[
                    { key: 'level', label: 'Level', icon: Zap },
                    { key: 'karmaPoint', label: 'Karma Points', icon: Heart },
                    { key: 'totalIncome', label: 'Total Income', icon: TrendingUp },
                    { key: 'totalExpense', label: 'Total Expense', icon: TrendingDown },
                  ].map(stat => {
                    const currentVal = (character.stats as any)[stat.key] || 0;
                    const addVal = addStats[stat.key as keyof CharacterStats] !== undefined ? addStats[stat.key as keyof CharacterStats] : '';
                    const Icon = stat.icon;
                    return (
                      <div key={stat.key} className="space-y-2">
                        <label className="flex justify-between items-end px-1">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{stat.label}</span>
                          {addVal !== 0 && addVal !== '' && addVal !== '-' && (
                            <div className="text-xs font-bold">
                              {renderDiff(currentVal, currentVal + parseInt(addVal as string))}
                            </div>
                          )}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Icon className="w-4 h-4 text-neutral-600 group-focus-within:text-brand-primary transition-colors" />
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
                            placeholder="+/- 0"
                            className="input-field pl-10 font-bold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {hasChanges && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-10 pt-10 border-t border-white/5 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">From</label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(['Quest', 'Event', 'System'] as const).map((preset) => {
                        const isSelected = updateFrom === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setUpdateFrom(preset)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                              isSelected 
                                ? 'bg-brand-primary text-black border-brand-primary shadow-lg shadow-brand-primary/10' 
                                : 'bg-black/40 text-neutral-400 border-white/5 hover:text-white hover:bg-neutral-800'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          if (['Quest', 'Event', 'System'].includes(updateFrom)) {
                            setUpdateFrom('');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          !['Quest', 'Event', 'System'].includes(updateFrom) 
                            ? 'bg-neutral-800 text-white border-white/20' 
                            : 'bg-black/40 text-neutral-400 border-white/5 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        Other (Ketik Sendiri)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={updateFrom}
                      onChange={(e) => setUpdateFrom(e.target.value)}
                      placeholder={
                        !['Quest', 'Event', 'System'].includes(updateFrom) 
                          ? "Type 'From' source here..." 
                          : "Selected: " + updateFrom
                      }
                      className="input-field mt-1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-1">Reason</label>
                    <input
                      type="text"
                      value={updateReason}
                      onChange={(e) => setUpdateReason(e.target.value)}
                      placeholder="e.g. Won Arena Match #42"
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div className="mt-10 flex justify-end">
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || (hasChanges && (!updateFrom.trim() || !updateReason.trim()))}
                className="btn-primary w-full sm:w-auto min-w-[200px]"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Processing...' : 'Save Stats'}
              </button>
            </div>
          </div>

          {character.isSystem && (
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-display font-bold">Secure <span className="text-brand-primary">PIN</span></h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">PIN Authorization</p>
                </div>
                <button 
                  onClick={() => setShowPinSettings(!showPinSettings)}
                  className="text-xs font-bold uppercase tracking-widest text-brand-primary hover:underline underline-offset-4"
                >
                  {showPinSettings ? 'Close' : (character.pin ? 'Manage PIN' : 'Configure')}
                </button>
              </div>
              
              <AnimatePresence>
                {showPinSettings && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {character.pin && (
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Current PIN</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={oldPin}
                            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                            className="input-field tracking-[0.5em] text-center"
                            placeholder="****"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">New 4-Digit PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          className="input-field tracking-[0.5em] text-center"
                          placeholder="****"
                        />
                      </div>
                    </div>
                    
                    {pinSettingsError && <p className="text-xs text-red-500 font-bold uppercase tracking-widest">{pinSettingsError}</p>}
                    {pinSettingsSuccess && <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest">{pinSettingsSuccess}</p>}
                    
                    <button onClick={handleUpdatePin} className="btn-secondary w-full">
                       Update PIN
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* History Log */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3 underline decoration-brand-primary underline-offset-8">
            <History className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-display font-black uppercase italic tracking-tight">Record <span className="text-brand-primary">History</span></h2>
          </div>
          {isAdmin && (
            <button 
              onClick={() => {
                const csv = [
                  ['Log ID', 'Action', 'Performer', 'Date', 'Reason'].join(','),
                  ...charLogs.map(l => [l.id, l.action, l.username || 'System', new Date(l.timestamp).toLocaleString().replace(/,/g, ''), (l.reason || '').replace(/,/g, '')].join(','))
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `logs_${character.name}_${character.id}.csv`;
                a.click();
              }}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <Download className="w-3 h-3" /> Export CSV
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {charLogs.map((log, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              key={log.id} 
              className="glass-card p-6 flex flex-col md:flex-row gap-6 border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex-shrink-0 flex md:flex-col items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${
                  log.action === 'CREATE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                  log.action === 'UPDATE BY ADMIN' ? 'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary' : 
                  'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                }`}>
                  {log.action === 'CREATE' ? <Plus className="w-6 h-6" /> : log.action === 'UPDATE BY ADMIN' ? <Shield className="w-6 h-6" /> : <Save className="w-6 h-6" />}
                </div>
                <div className="md:hidden flex-1">
                   <p className="text-sm font-bold">{log.action === 'CREATE' ? 'Record Created' : log.action === 'UPDATE BY ADMIN' ? 'Admin Override' : 'Stats Updated'}</p>
                   <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">{formatDistanceToNow(log.timestamp)} ago</p>
                </div>
              </div>

              <div className="flex-1">
                <div className="hidden md:flex justify-between items-center mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${log.action === 'UPDATE BY ADMIN' ? 'text-brand-secondary' : 'text-neutral-500'}`}>
                    {log.action === 'CREATE' ? 'Creation Event' : log.action === 'UPDATE BY ADMIN' ? `Authorized by ${log.username || 'Admin'}` : 'Manual Update'}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{formatDistanceToNow(log.timestamp)} ago</span>
                </div>
                
                {(log.action === 'UPDATE' || log.action === 'UPDATE BY ADMIN') && log.oldData && log.newData && (
                  <div className="flex flex-wrap gap-4 mb-4">
                    {Object.keys(log.newData).map(key => {
                      const k = key as keyof CharacterStats;
                      const oldVal = log.oldData![k];
                      const newVal = log.newData![k];
                      if (oldVal === newVal) return null;
                      return (
                        <div key={k} className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3">
                          <span className="text-[10px] font-bold text-neutral-500 uppercase">{k}</span>
                          <span className="text-xs font-bold text-white flex items-center gap-2">
                             {oldVal} <ArrowLeft className="w-3 h-3 rotate-180" /> {newVal}
                          </span>
                          <div className="text-[10px]">
                            {renderDiff(oldVal || 0, newVal || 0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {(log.from || log.reason) && (
                  <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {log.from && (
                        <div>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">From</p>
                          <p className="text-xs font-medium text-neutral-300">{log.from}</p>
                        </div>
                      )}
                      {log.reason && (
                        <div>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">Reason</p>
                          <p className="text-xs font-medium text-neutral-300">{log.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {charLogs.length === 0 && (
            <div className="py-20 text-center glass-card border-dashed">
              <History className="w-16 h-16 text-neutral-700 mx-auto mb-4 opacity-20" />
              <p className="text-neutral-500 italic">No events recorded in history</p>
            </div>
          )}
        </div>
      </section>

      {/* PIN Prompt Modal */}
      <AnimatePresence>
        {showPinPrompt && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card p-10 max-w-sm w-full border-white/10"
            >
              <h3 className="text-2xl font-display font-black text-center mb-2">PIN <span className="text-brand-primary">REQUIRED</span></h3>
              <p className="text-xs text-neutral-500 text-center font-bold uppercase tracking-widest mb-8">Verification Required</p>
              
              {pinError && <p className="text-xs text-red-500 font-bold text-center uppercase tracking-widest mb-4">{pinError}</p>}
              
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="input-field text-3xl tracking-[1em] text-center mb-8 py-5 border-white/10 bg-black"
                placeholder="****"
                autoFocus
              />
              
              <div className="flex gap-4">
                <button onClick={() => setShowPinPrompt(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSave} className="btn-primary flex-1">Verify</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
