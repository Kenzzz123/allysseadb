import React from 'react';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../contexts/DataContext';

export default function QuotaBanner() {
  const { hasQuotaError } = useData();

  return (
    <AnimatePresence>
      {hasQuotaError && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-400/20 text-xs sm:text-sm overflow-hidden shadow-xl"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-1.5 bg-black/20 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-100" />
            </div>
            <div className="space-y-0.5">
              <p className="font-extrabold text-white tracking-widest uppercase text-[10px] sm:text-xs">
                Firestore Quota Exceeded / Limit Kuota Terpenuhi
              </p>
              <p className="text-amber-100 font-medium leading-relaxed max-w-2xl text-[11px] sm:text-xs">
                Limit harian baca/tulis Firebase Sandbox (Spark gratis) Anda telah tercapai. Anda dapat 
                mengecek sisa kuota, mengosongkan database lama, atau beralih ke paket berbayar/custom di tautan resmi konsol Firebase berikut.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-shrink-0">
            <div className="flex items-center justify-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-250 border border-white/5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5" />
              <span>Resets Midnight PT (14:00 WIB)</span>
            </div>
            
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0743677107/firestore/databases/ai-studio-6e4a070c-9805-4d48-b3d2-52feaade1c67/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 bg-white text-amber-950 hover:bg-amber-50 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <span>Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

