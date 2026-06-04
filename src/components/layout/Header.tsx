import React from 'react';
import { Heart, Moon, Sun, Cloud, Eye, EyeOff, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/context/AuthContext';
import { useUI } from '@/src/context/UIContext';
import { useAppContext } from '@/src/context/AppContext';
import { cn } from '@/src/lib/utils';

export default function Header() {
  const { privacyMode, setPrivacyMode, theme, setTheme } = useUI();
  const { setSidebarOpen, isFastingMode } = useAppContext();

  const handleCycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('sky');
    } else {
      setTheme('light');
    }
  };

  return (
    <header className={cn("flex items-center justify-between px-6 py-4 bg-transparent sticky top-0 z-[50] transition-colors duration-300",
      isFastingMode ? "text-amber-50" : "text-gray-900 dark:text-white"
    )}>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/5 active:scale-90 transition-all"
        >
          <Menu className="w-5 h-5 pointer-events-none" />
        </button>
        <div className="flex flex-col text-right">
          <h1 className="text-sm font-black leading-none tracking-tighter">الحياة</h1>
          <span className="text-[8px] font-black text-primary tracking-[0.2em] mt-0.5 uppercase">Companion</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => setPrivacyMode(!privacyMode)}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/5 active:scale-90 transition-all"
        >
          {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

         <button 
          onClick={handleCycleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/5 active:scale-90 transition-all overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {theme === 'light' ? (
              <motion.div
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Sun className="w-4 h-4 text-amber-500" />
              </motion.div>
            ) : theme === 'dark' ? (
              <motion.div
                key="moon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Moon className="w-4 h-4 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="cloud"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Cloud className="w-4 h-4 text-sky-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}
