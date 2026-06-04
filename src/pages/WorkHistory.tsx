import { ChevronDown, ChevronUp, Bell, Settings, Filter, FileEdit, History, Home, Calendar, Zap, LayoutDashboard, Globe, Moon, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function WorkHistory() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('سجل الدوام');
  const [expandedDate, setExpandedDate] = useState<string | null>('12');

  const [localHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('local_work_history_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => ({
          date: item.date.replace(/[^0-9]/g, '') || '1',
          dayName: 'اليوم',
          month: item.date.replace(/[0-9]/g, '').trim() || 'عقد العمل',
          type: item.tag || 'عمل وعافية 💼',
          hours: item.hours || '0.0',
          shift: `${item.checkIn} - ${item.checkOut}`,
          isExpanded: false,
          note: item.checkOut === '--:--' ? 'الدوام مستمر حالياً وسجل الرعاية الصحية للمكتب نشط.' : 'تم توثيق هذا الدوام وقمت باتباع نصائح الترطيب وشرب المياه والتحرك للحفاظ على مظهرك البدني.',
          details: `دخول: ${item.checkIn} • خروج: ${item.checkOut}`,
          extraTitle: `${item.hours || '0.0'} س`,
          extraVal: 'طبيعي'
        }));
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const historyData = [
    ...localHistory,
    { date: '15', dayName: 'جمعة', month: 'مايو 2026', type: 'عمل اعتيادي', hours: '07:10', shift: 'PM 03:53', isExpanded: false },
    { date: '14', dayName: 'خميس', month: 'مايو 2026', type: 'عمل اعتيادي', hours: '08:01', shift: 'PM 03:59', isExpanded: false },
    { date: '13', dayName: 'أربعاء', month: 'مايو 2026', type: 'عمل اعتيادي', hours: '08:15', shift: 'PM 03:55', isExpanded: false },
    { date: '12', dayName: 'ثلاثاء', month: 'مايو 2026', type: 'عمل اعتيادي', hours: '08:11', shift: 'PM 04:03', isExpanded: true, note: 'انتهى العمل', details: '12:13 AM - 04:03 PM', extraTitle: '8 س', extraVal: '+1 س' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#0E1015] dark:bg-[#0c0c0c] text-white overflow-hidden text-right font-sans relative pb-28">
      {/* Top Bar matching Log view style */}
      <div className="flex justify-between items-center p-6 bg-[#0E1015] dark:bg-[#0c0c0c] relative z-10">
        <div className="flex gap-4 items-center">
            <button><Settings className="w-6 h-6 text-[#5b8793]" /></button>
            <div className="flex flex-col items-start bg-[#161c22] px-3 py-1.5 rounded-xl text-[#B9E6FE] font-bold">
               <span className="text-sm border-b border-[#B9E6FE]/20 pb-0.5">Work Companion</span>
               <span className="text-[10px] tracking-widest uppercase text-center w-full block">Log History</span>
            </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
           <div className="relative">
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
           </div>
           <Globe className="w-5 h-5 text-gray-300" />
           <span className="font-bold text-xs uppercase text-gray-300">EN</span>
           <Moon className="w-5 h-5 text-indigo-300" />
           <button onClick={() => navigate(-1)} className="w-6 h-6 flex justify-center items-center text-gray-300">
              <LayoutDashboard className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        
        {/* Toggle Bar */}
        <div className="bg-[#1A1D24] dark:bg-[#1e1e1e] rounded-full p-1.5 flex border border-white/5 mx-2">
            {['الإجازات', 'التحليلات', 'سجل الدوام'].map((tab) => (
               <button 
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={cn(
                    "flex-1 py-2 text-[10px] font-bold rounded-full transition-colors",
                    activeTab === tab ? "bg-[#252A36] text-white shadow-sm border border-white/5" : "text-gray-400 hover:text-white"
                 )}
               >
                 {tab}
               </button>
            ))}
        </div>

        {/* Search */}
        <div className="bg-[#1A1D24] dark:bg-[#1e1e1e] rounded-[16px] p-3 flex items-center justify-end border border-white/5 mx-2">
            <span className="text-[11px] font-bold text-gray-500">...ابحث بملاحظة أو تاريخ</span>
        </div>

        {/* Filter */}
        <div className="flex justify-between items-center px-4 py-1">
           <ChevronDown className="w-4 h-4 text-gray-400" />
           <div className="flex items-center gap-1.5 text-white">
              <span className="text-[11px] font-bold">كل الأيام</span>
              <Filter className="w-3.5 h-3.5" />
           </div>
        </div>

        {/* List of Days */}
        <div className="space-y-3 px-2">
            {historyData.map((item, idx) => {
               const isExp = expandedDate === item.date;
               return (
                  <motion.div key={idx} className={cn("rounded-[20px] overflow-hidden border border-white/5 transition-colors", isExp ? "bg-[#1A1D24] border-white/10" : "bg-[#141A25]")}>
                     {/* Header summary */}
                     <div 
                       onClick={() => setExpandedDate(isExp ? null : item.date)}
                       className="p-4 flex justify-between items-center cursor-pointer"
                     >
                         <div className="w-8 h-8 rounded-full bg-[#1A2534] flex items-center justify-center text-blue-400 shrink-0">
                            {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                         </div>
                         <div className="flex-1 text-right px-3 flex flex-col justify-center">
                            <div className="flex justify-end gap-1.5 items-center mb-1">
                                <span className="text-blue-400 font-bold text-[11px] tracking-wide">{item.type}</span>
                                <span className="font-bold text-gray-300 text-[10px]">{item.month}</span>
                            </div>
                            <div className="flex justify-end items-center gap-1.5 opacity-60 text-[9px] font-bold">
                                <span>س {item.hours}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                   <span>{item.shift}</span>
                                   <Clock className="w-2.5 h-2.5" />
                                </div>
                            </div>
                         </div>
                         <div className="w-12 h-12 bg-[#2176FF] rounded-[16px] flex flex-col items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                             <span className="text-base font-black leading-none mb-0.5">{item.date}</span>
                             <span className="text-[9px] font-bold opacity-80">{item.dayName}</span>
                         </div>
                     </div>
                     
                     {/* Expanded content */}
                     <AnimatePresence>
                         {isExp && (
                             <motion.div 
                               initial={{ height: 0, opacity: 0 }}
                               animate={{ height: 'auto', opacity: 1 }}
                               exit={{ height: 0, opacity: 0 }}
                               className="px-4 pb-4 border-t border-white/5 pt-3"
                             >
                                 <div className="flex justify-between items-center flex-row-reverse mb-4">
                                     <div className="text-right">
                                         <h4 className="font-bold text-white text-[11px] mb-1">{item.type}</h4>
                                         <p className="text-[10px] text-gray-400 font-mono tracking-widest">{item.details}</p>
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="font-bold text-white text-[10px]">{item.extraTitle}</div>
                                            <div className="text-emerald-400 text-[10px] font-black">{item.extraVal}</div>
                                        </div>
                                        <button className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
                                           <FileEdit className="w-3.5 h-3.5" />
                                        </button>
                                     </div>
                                 </div>
                                 <div className="bg-black/30 rounded-xl p-3 border border-white/5 text-right">
                                     <span className="text-[9px] font-bold text-gray-500 mb-1 block">ملاحظة:</span>
                                     <p className="text-[11px] text-gray-300 leading-relaxed">{item.note}</p>
                                 </div>
                             </motion.div>
                         )}
                     </AnimatePresence>
                  </motion.div>
               );
            })}
        </div>
      </div>

      {/* Floating Bottom Navigation */}
        <nav className="absolute mb-6 mx-5 bottom-0 left-0 right-0 bg-[#161B22]/95 backdrop-blur-2xl border border-white/10 py-4 px-6 shadow-xl rounded-full z-40">
          <div className="flex justify-between items-center h-8">
              <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
                  <Zap className="w-5 h-5" />
                  <span className="text-[9px] font-bold">Pro Vibe</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors">
                  <Calendar className="w-5 h-5" />
                  <span className="text-[9px] font-bold">التقويم</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-white transition-colors" onClick={() => navigate('/work-log')}>
                  <Home className="w-5 h-5" />
                  <span className="text-[10px] font-bold">الرئيسية</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white scale-110 drop-shadow-md">
                  <History className="w-6 h-6" strokeWidth={2.5} />
                  <span className="text-[9px] font-bold">السجل</span>
              </button>
          </div>
      </nav>
    </div>
  );
}
