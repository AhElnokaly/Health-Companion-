import React, { useState } from 'react';
import { Plus, Droplets, Pill, Utensils, Moon, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

export default function SmartFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { name: 'إضافة دواء', icon: Pill, color: 'text-blue-500', bg: 'bg-blue-100', path: '/add-medication' },
    { name: 'سجل شرب الماء', icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-100', path: '/water' },
    { name: 'وجبة صحية', icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-100', path: '/diet' },
    { name: 'تسجيل النوم', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-100', path: '/sleep' },
    { name: 'فحص الأعراض', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-100', path: '/symptoms' },
  ];

  const handleActionClick = (name: string, path: string) => {
    setIsOpen(false);
    
    const cardMap: { [key: string]: string } = {
      'سجل شرب الماء': 'water',
      'وجبة صحية': 'diet',
      'تسجيل النوم': 'sleep',
      'إضافة دواء': 'meds',
    };

    const cardKey = cardMap[name];
    if (cardKey) {
      if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.dispatchEvent(new CustomEvent('open-dashboard-card', { detail: { card: cardKey } }));
      } else {
        navigate('/');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-dashboard-card', { detail: { card: cardKey } }));
        }, 150);
      }
    } else {
      navigate(path);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-gray-950/40 z-40 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-[110px] left-6 z-50 flex flex-col items-start gap-4 pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
                hidden: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
              }}
              className="flex flex-col gap-4 items-start pointer-events-auto"
            >
              {actions.map((action, idx) => (
                <motion.button
                  key={action.name}
                  variants={{
                    hidden: { opacity: 0, x: 25, scale: 0.9 },
                    visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 25 } }
                  }}
                  onClick={() => handleActionClick(action.name, action.path)}
                  className="flex flex-row-reverse items-center gap-4 bg-gray-950/95 dark:bg-white/95 backdrop-blur-3xl p-2 pr-5 rounded-full shadow-2xl border border-white/5 active:scale-90 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/10 dark:bg-gray-950/10`}>
                    <action.icon className={`w-4 h-4 ${action.color}`} strokeWidth={3} />
                  </div>
                  <span className="font-black text-white dark:text-gray-950 text-xs whitespace-nowrap">{action.name}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          animate={{ rotate: isOpen ? 135 : 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl pointer-events-auto transition-colors z-[100] ${
            isOpen ? 'bg-primary text-white' : 'bg-gray-950 dark:bg-white text-white dark:text-black'
          }`}
        >
          <Plus className={`w-7 h-7 transition-transform`} strokeWidth={3} />
        </motion.button>
      </div>
    </>
  );
}
