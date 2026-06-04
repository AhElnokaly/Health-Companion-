import React from 'react';
import { motion } from 'motion/react';
import { Crown, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

interface PremiumLockProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PremiumLock({ title, description, children }: PremiumLockProps) {
  const { profile, isFastingMode } = useAppContext();
  const navigate = useNavigate();

  if (profile.isPro) {
    return <>{children}</>;
  }

  return (
    <div className={cn("min-h-[100dvh] p-6 pt-20 flex flex-col items-center justify-center text-center relative overflow-hidden",
       isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white"
    )}>
       {/* Background decoration */}
       <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden flex items-center justify-center">
          <Crown className="w-96 h-96 text-amber-500 scale-150 rotate-12" />
       </div>

       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-full max-w-sm">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2rem] flex items-center justify-center shadow-xl shadow-amber-500/20 mb-8 border-4 border-white dark:border-[#1A1A1A] rotate-3 relative">
             <Lock className="w-10 h-10 text-white" />
             <div className="absolute -bottom-2 -right-2 bg-white dark:bg-[#1A1A1A] p-1 rounded-full">
                <Crown className="w-6 h-6 text-amber-500" />
             </div>
          </div>
          
          <h1 className="text-2xl font-black mb-4">{title}</h1>
          <p className={cn("text-sm font-medium leading-relaxed mb-10 px-4", isFastingMode ? "text-gray-400" : "text-gray-500")}>
             {description}
          </p>

          <button 
             onClick={() => navigate('/profile')}
             className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-amber-500/30 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
          >
             ترقية الحساب مجاناً (تجريبي)
          </button>

          <button onClick={() => navigate(-1)} className="mt-6 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
             العودة للخلف
          </button>
       </motion.div>
    </div>
  );
}
