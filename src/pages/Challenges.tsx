import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Trophy, Target, Star, Gift, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

export default function Challenges() {
  const navigate = useNavigate();
  const { isFastingMode } = useAppContext();

  const achievements = [
    { id: 1, title: 'بطل الماء', desc: 'شرب ٣ لتر ماء لمدة ٧ أيام متتالية', progress: 5, total: 7, points: 50, icon: <Trophy className="w-5 h-5 text-blue-500" /> },
    { id: 2, title: 'نوم العوافي', desc: 'نوم ٨ ساعات منتظمة', progress: 8, total: 8, points: 100, icon: <Moon className="w-5 h-5 text-indigo-500" />, completed: true },
    { id: 3, title: 'صيدليتي أمان', desc: 'تسجيل ٥ أدوية في صيدلية المنزل', progress: 2, total: 5, points: 30, icon: <Target className="w-5 h-5 text-rose-500" /> },
  ];

  return (
    <div className={cn("min-h-[100dvh] pb-28 transition-colors duration-500", isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white")}>
      
      {/* Header */}
      <div className={cn("px-6 pt-10 pb-4 sticky top-0 z-30", isFastingMode ? "bg-[#1A1A1A] border-b border-[#3D3834]" : "bg-[#FDFBF7] dark:bg-[#121415] border-b border-[#F0EBE1] dark:border-white/5")}>
        <div className="flex items-center gap-4 flex-row-reverse">
          <button onClick={() => navigate(-1)} className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-colors active:scale-95", 
            isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-500"
          )}>
             <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black flex-1 text-right flex items-center gap-2 justify-end">
            <Trophy className="w-6 h-6 text-amber-500" /> التحديات والإنجازات
          </h1>
        </div>
      </div>

      <div className="p-6">
         {/* Points Banner */}
         <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-[32px] p-8 text-center text-white shadow-xl shadow-amber-500/20 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
               <Star className="w-24 h-24" />
            </div>
            <p className="text-sm font-bold text-amber-100 mb-1">إجمالي النقاط</p>
            <div className="text-5xl font-black mb-4 tracking-tighter">120</div>
            <div className="bg-black/10 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md border border-white/20">
               <Gift className="w-4 h-4" /> مكافأة قريبة عند ٥٠٠ نقطة!
            </div>
         </div>

         {/* Achievements List */}
         <h2 className="text-lg font-black mb-4 text-right px-2">المهام الحالية</h2>
         <div className="space-y-4">
            {achievements.map(a => (
               <div key={a.id} className={cn("rounded-[24px] p-5 border shadow-sm text-right flex gap-4",
                  isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5"
               )}>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-2 flex-row-reverse">
                         <h3 className="font-bold text-sm">{a.title}</h3>
                         <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-1 rounded-full font-bold">+{a.points} نقطة</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mb-4">{a.desc}</p>
                      
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-gray-400 w-8">{a.progress}/{a.total}</span>
                         <div className="h-2 flex-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(a.progress/a.total)*100}%` }} className={cn("h-full", a.completed ? "bg-emerald-500" : "bg-amber-500")} />
                         </div>
                      </div>
                   </div>
                   <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4",
                      a.completed ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10"
                   )}>
                      {a.completed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : a.icon}
                   </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}

function Moon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}
