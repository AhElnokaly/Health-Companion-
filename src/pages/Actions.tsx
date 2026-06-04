import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Droplets, Pill, CheckCircle2, ChevronDown, Check, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getTimeTheme } from '../lib/timeTheme';

type Tab = 'daily' | 'weekly' | 'monthly';

export default function Actions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Month navigation (mock)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const baseDate = new Date();
  baseDate.setMonth(baseDate.getMonth() + currentMonthOffset);
  const monthLabel = `${monthNames[baseDate.getMonth()]} ${baseDate.getFullYear()}`;

  // Weekly navigation (mock)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Sample missions
  const [missions, setMissions] = useState([
    { id: 'm1', type: 'water', timeLabel: '٦:٠٠ ص', hour: 6, title: 'شرب الماء صباحاً', progress: 0, total: 3, unit: 'كوب', doneMsg: '' },
    { id: 'm2', type: 'med', timeLabel: '٨:٠٠ ص', hour: 8, title: 'دواء الضغط', progress: 0, total: 1, unit: 'حبة', doneMsg: '' },
    { id: 'm3', type: 'med', timeLabel: '٢:٠٠ م', hour: 14, title: 'فيتامينات', progress: 1, total: 1, unit: 'حبة', doneMsg: 'تم أخذه' },
    { id: 'm4', type: 'water', timeLabel: '٥:٠٠ م', hour: 17, title: 'ترطيب المساء', progress: 0, total: 2, unit: 'لتر', doneMsg: '' },
    { id: 'm5', type: 'med', timeLabel: '٨:٠٠ م', hour: 20, title: 'دواء الضغط', progress: 0, total: 1, unit: 'حبة', doneMsg: '' },
  ]);

  const handleComplete = (id: string, msg: string = 'Done', addProgress: number = 1) => {
    setMissions(prev => prev.map(m => {
       if (m.id === id) {
          const newProgress = Math.min(m.progress + addProgress, m.total);
          return { ...m, progress: newProgress, doneMsg: newProgress >= m.total ? msg : m.doneMsg };
       }
       return m;
    }));
    setExpandedId(null);
  };

  const totalMissions = missions.length;
  const completedMissions = missions.filter(m => m.progress >= m.total).length;
  const progressPercent = Math.round((completedMissions / totalMissions) * 100);

  return (
    <div className="min-h-full pb-28 pt-4 px-4 bg-gray-50 dark:bg-[#0B0C10] w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-row-reverse">
         <div className="flex items-center gap-2 flex-row-reverse">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm border border-gray-100 dark:border-white/5 active:scale-95">
               <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
            </button>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">جدول المهام</h1>
         </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-full p-1.5 flex border border-gray-200 dark:border-white/10 mb-6 shadow-sm">
         {(['monthly', 'weekly', 'daily'] as Tab[]).map((tab) => {
            const labels = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' };
            const isActive = activeTab === tab;
            return (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-full transition-colors",
                    isActive ? "bg-[#1E2638] text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                 )}
               >
                 {labels[tab]}
               </button>
            );
         })}
      </div>

      {activeTab === 'monthly' && (
         <div className="flex items-center justify-between bg-white dark:bg-[#1e1e1e] rounded-2xl p-3 mb-4 shadow-sm border border-gray-100 dark:border-white/5">
            <button onClick={() => setCurrentMonthOffset(p => p - 1)} className="p-2 bg-gray-50 dark:bg-black/20 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
               <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
               <span>{monthLabel}</span>
               <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <button onClick={() => setCurrentMonthOffset(p => p + 1)} className="p-2 bg-gray-50 dark:bg-black/20 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
               <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
         </div>
      )}

      {activeTab === 'weekly' && (
         <div className="flex items-center justify-between bg-white dark:bg-[#1e1e1e] rounded-2xl p-3 mb-4 shadow-sm border border-gray-100 dark:border-white/5">
            <button onClick={() => setCurrentWeekOffset(p => p - 1)} className="p-2 bg-gray-50 dark:bg-black/20 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
               <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
               <span>الأسبوع {currentWeekOffset === 0 ? 'الحالي' : currentWeekOffset > 0 ? `+${currentWeekOffset}` : currentWeekOffset}</span>
               <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <button onClick={() => setCurrentWeekOffset(p => p + 1)} className="p-2 bg-gray-50 dark:bg-black/20 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
               <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
         </div>
      )}

      {/* Progress Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 mb-6 text-right relative overflow-hidden flex justify-between items-center flex-row-reverse shadow-lg shadow-indigo-500/20">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="z-10">
              <h3 className="font-bold text-sm text-white mb-1">التقدم {activeTab === 'daily' ? 'اليومي' : activeTab === 'weekly' ? 'الأسبوعي' : 'الشهري'}</h3>
              <p className="text-xs text-indigo-100">أكملت {completedMissions} من {totalMissions} مهام</p>
          </div>
          <div className="z-10 flex items-center justify-center w-14 h-14 rounded-full border-[5px] border-white/20 text-white font-black text-lg bg-white/10 backdrop-blur-sm shadow-inner">
              {progressPercent}٪
          </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4 relative">
         {/* Vertical Timeline Line */}
         <div className="absolute top-4 bottom-4 right-[25px] w-px bg-gray-200 dark:bg-white/10 z-0"></div>

         {missions.map((mission) => {
            const theme = getTimeTheme(mission.hour);
            const isExpanded = expandedId === mission.id;
            const isDone = mission.progress >= mission.total;

            return (
               <div key={mission.id} className="relative z-10 flex flex-row-reverse items-start gap-3">
                  
                  {/* Timeline Dot */}
                  <div className={cn("w-[22px] h-[22px] rounded-full mt-3 flex items-center justify-center border-2 border-white dark:border-[#0B0C10] shadow-sm z-10 shrink-0 transition-colors", 
                     isDone ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                  )}>
                     {isDone && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>

                  {/* Card */}
                  <motion.div 
                     layout
                     className={cn(
                        "flex-1 rounded-[24px] overflow-hidden border shadow-sm transition-all duration-300",
                        isDone 
                          ? "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5 opacity-80" 
                          : `bg-gradient-to-br ${theme.bgGradient} border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]`
                     )}
                  >
                     <div 
                        onClick={() => setExpandedId(isExpanded ? null : mission.id)}
                        className="p-4 cursor-pointer flex justify-between items-center flex-row-reverse"
                     >
                         <div className="flex gap-3 items-center flex-row-reverse">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDone ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-500" : theme.cardClasses)}>
                               {mission.type === 'water' ? <Droplets className={cn("w-5 h-5", isDone ? "text-emerald-500" : theme.textPrimary)} /> : <Pill className={cn("w-5 h-5", isDone ? "text-emerald-500" : theme.textPrimary)} />}
                            </div>
                            <div className="text-right">
                               <h4 className={cn("font-bold text-sm tracking-wide mb-0.5", isDone ? "text-emerald-600 dark:text-emerald-400" : theme.textPrimary)}>{mission.title}</h4>
                               <div className={cn("flex items-center gap-1 justify-end opacity-80 text-[10px] font-medium", isDone ? "text-emerald-500/80" : theme.textPrimary)}>
                                  {isDone && <span className="font-bold opacity-100 ml-1">{mission.doneMsg} •</span>}
                                  <span>{mission.timeLabel}</span>
                                  <Clock className="w-3 h-3" />
                               </div>
                            </div>
                         </div>
                         <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform", isExpanded ? "rotate-180" : "", isDone ? "text-emerald-500" : theme.textPrimary)}>
                            {isDone ? <CheckCircle2 className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 opacity-70" />}
                         </div>
                     </div>

                     {/* Expanded Content */}
                     <AnimatePresence>
                        {isExpanded && !isDone && (
                           <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className={cn("px-4 pb-4 border-t pt-3 flex flex-row-reverse items-center justify-between gap-2 overflow-hidden", theme.cardClasses)}
                           >
                              {mission.type === 'water' ? (
                                 <div className="flex gap-2 flex-row-reverse flex-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleComplete(mission.id, 'تم الشرب', 1); }} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl py-2 flex flex-col items-center gap-1 active:scale-95 transition-all">
                                       <span className={cn("text-[10px] font-bold", theme.textPrimary)}>كوب لتر</span>
                                       <Droplets className={cn("w-4 h-4", theme.textPrimary)} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleComplete(mission.id, 'تم الشرب', 1); }} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl py-2 flex flex-col items-center gap-1 active:scale-95 transition-all">
                                       <span className={cn("text-[10px] font-bold", theme.textPrimary)}>نصف لتر</span>
                                       <Droplets className={cn("w-3.5 h-3.5", theme.textSecondary)} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleComplete(mission.id, 'تم الشرب', 1); }} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl py-2 flex flex-col items-center gap-1 active:scale-95 transition-all">
                                       <span className={cn("text-[10px] font-bold", theme.textPrimary)}>كوب</span>
                                       <Droplets className={cn("w-3 h-3", theme.textSecondary)} />
                                    </button>
                                 </div>
                              ) : (
                                 <div className="flex gap-2 flex-row-reverse flex-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleComplete(mission.id, 'تم الأخذ الآن', 1); }} className="flex-1 bg-emerald-500/90 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl py-2 active:scale-95 transition-all shadow-sm">
                                       تم الأخذ الآن
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleComplete(mission.id, 'تم الأخذ متأخر', 1); }} className="flex-1 bg-blue-500/90 hover:bg-blue-500 text-white font-bold text-[11px] rounded-xl py-2 active:scale-95 transition-all shadow-sm">
                                       أخذته متأخر
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setExpandedId(null); }} className="flex-1 bg-amber-500/90 hover:bg-amber-500 text-white font-bold text-[11px] rounded-xl py-2 active:scale-95 transition-all shadow-sm">
                                       تأجيل ساعة
                                    </button>
                                 </div>
                              )}
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               </div>
            );
         })}
      </div>
    </div>
  );
}
