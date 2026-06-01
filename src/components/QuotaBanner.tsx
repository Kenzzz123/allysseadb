import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
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
          className="bg-amber-500 text-black px-4 py-2 flex items-center justify-center gap-3 font-bold text-xs sm:text-sm overflow-hidden"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Firestore Quota Exceeded (Free Tier Reached). Data may not be real-time.</span>
          <div className="flex items-center gap-1 opacity-80">
            <Clock className="w-3 h-3" />
            <span>Resets daily at midnight PT</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
