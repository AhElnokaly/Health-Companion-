import { ChevronRight, Bell, HelpCircle, Wallet as WalletIcon, TrendingUp, TrendingDown, ArrowLeftRight, Sparkles, Plus, History, BarChart3, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export default function Wallet() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('نظرة عامة');

  return (
    <div className="flex flex-col min-h-screen bg-[#F0F2F5] dark:bg-[#121212] overflow-hidden text-right font-sans relative pb-28">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 bg-white dark:bg-[#1e1e1e] shadow-sm relative z-10 rounded-b-[32px]">
        <div className="flex gap-4 items-center">
            <HelpCircle className="w-6 h-6 text-gray-500" />
            <div className="relative">
                <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </div>
        </div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white flex-1 text-center pr-8">محفظتي</h1>
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-50 dark:bg-white/5 flex items-center justify-center rounded-2xl active:scale-95 transition-transform">
           <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
        {/* Weekly Summary Banner */}
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} className="bg-[#4176F9] rounded-[20px] p-4 text-white flex justify-between items-center shadow-lg shadow-blue-500/20">
            <button className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
               <span className="text-white text-[10px] font-bold">✕</span>
            </button>
            <div className="text-right">
                <h3 className="font-bold text-sm mb-0.5 flex items-center gap-1.5 flex-row-reverse justify-end">ملخص الأسبوع 📊</h3>
                <p className="text-[11px] text-blue-100">اطلع على ملخص مصروفاتك وإيراداتك لهذا الأسبوع.</p>
            </div>
            <div className="text-white opacity-80">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.1}} className="relative rounded-[24px] overflow-hidden p-6 shadow-xl bg-gradient-to-br from-[#1E2638] to-[#111827] text-white">
             {/* Decorative Background */}
             <div className="absolute inset-0 opacity-10">
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="0" x2="100" y2="100" stroke="white" strokeWidth="1" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="white" strokeWidth="1" />
                </svg>
             </div>
             <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white/10 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 mb-4">
                    <span className="text-[10px] font-bold tracking-wide">إجمالي الرصيد</span>
                    <WalletIcon className="w-3.5 h-3.5 opacity-80" />
                </div>
                <div className="text-4xl font-black tracking-tight" dir="ltr">
                   EGP <span className="text-4xl">120,875</span>
                </div>
             </div>
        </motion.div>

        {/* Smart Checkup Banner */}
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.2}} className="bg-[#5660FF] rounded-[20px] p-4 text-white flex justify-between items-center shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-[#6E75FF] rounded-l-[30px] z-0"></div>
            <div className="relative z-10 w-full flex items-center justify-between flex-row-reverse">
                <div className="flex gap-3 items-center flex-row-reverse">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-right">
                        <h3 className="font-bold text-sm mb-0.5">فحص مالي ذكي</h3>
                        <p className="text-[10px] text-white/80 line-clamp-1">احصل على تحليل فوري لنفقاتك</p>
                    </div>
                </div>
                <div className="bg-white/20 px-2.5 py-1 rounded-full text-[9px] font-bold">الذكاء الاصطناعي</div>
            </div>
        </motion.div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
             {/* Income */}
             <motion.button initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.3}} className="bg-[#10B981] hover:bg-emerald-600 transition-colors text-white rounded-[20px] p-4 shadow-md shadow-emerald-500/20 active:scale-95 flex flex-col items-end gap-4 relative overflow-hidden">
                 <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center self-end mb-1">
                    <Plus className="w-4 h-4" />
                 </div>
                 <div className="font-black text-sm w-full text-right flex justify-between items-center">
                    <span className="text-[10px] font-bold opacity-80 mt-0.5 block">إضافة</span>
                    <span>دخل جديد</span>
                 </div>
             </motion.button>
             
             {/* Expense */}
             <motion.button initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.4}} className="bg-[#F43F5E] hover:bg-rose-600 transition-colors text-white rounded-[20px] p-4 shadow-md shadow-rose-500/20 active:scale-95 flex flex-col items-end gap-4 relative overflow-hidden">
                 <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center self-end mb-1">
                    <Plus className="w-4 h-4" />
                 </div>
                 <div className="font-black text-sm w-full text-right flex justify-between items-center">
                    <span className="text-[10px] font-bold opacity-80 mt-0.5 block">إضافة</span>
                    <span>مصروف جديد</span>
                 </div>
             </motion.button>

             {/* Transfer */}
             <motion.button initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.5}} className="col-span-2 bg-[#1E2638] dark:bg-[#252a3a] text-white rounded-[20px] p-4 flex items-center justify-center gap-2.5 shadow-sm hover:bg-gray-800 transition-colors active:scale-95">
                 <span className="font-bold text-sm">تحويل</span>
                 <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                     <ArrowLeftRight className="w-3.5 h-3.5" />
                 </div>
             </motion.button>
        </div>

        {/* Segmented Control */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-full p-1.5 flex border border-gray-200 dark:border-white/10 mt-4 shadow-sm">
           {['رؤى', 'الحسابات', 'نظرة عامة'].map(tab => (
               <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn("flex-1 py-2 text-xs font-bold rounded-full transition-colors", activeTab === tab ? "bg-[#1E2638] text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
               >
                  {tab}
               </button>
           ))}
        </div>

      </div>

      {/* Floating Bottom Navigation */}
      <nav className="absolute mb-6 mx-5 bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-2xl border border-gray-100 dark:border-white/5 px-6 py-4 shadow-soft rounded-[32px] z-40">
          <div className="flex justify-between items-center h-10">
              <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300">
                  <Star className="w-6 h-6" />
              </button>
              <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300">
                  <BarChart3 className="w-6 h-6" />
              </button>
              <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300">
                  <History className="w-6 h-6" />
              </button>
              <button className="text-[#4176F9] scale-110 flex flex-col items-center transition-colors duration-300 relative">
                  <WalletIcon className="w-6 h-6" strokeWidth={3} />
                  <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#4176F9]"></div>
              </button>
          </div>
      </nav>
    </div>
  );
}
