import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Weight() {
   const navigate = useNavigate();

   return (
      <div className="min-h-full pb-28 pt-4 px-4 bg-gray-50 dark:bg-[#0B0C10] w-full max-w-md mx-auto">
         <div className="flex items-center justify-between mb-8 flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse">
               <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shadow-sm border border-gray-100 dark:border-white/5 active:scale-95">
                  <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
               </button>
               <h1 className="text-xl font-black text-gray-900 dark:text-white">الوزن والمقاسات</h1>
            </div>
         </div>

         <div className="bg-white dark:bg-[#1A1A1A] rounded-[24px] p-6 shadow-sm border border-gray-100 dark:border-white/5 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
               <Scale className="w-8 h-8 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">سجل وزنك اليوم</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">تتبع تغييرات وزنك للوصول إلى هدفك الصحي بشكل أسرع.</p>
            <button className="bg-indigo-600 dark:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-indigo-500/25 active:scale-95 transition-all w-full">
               إضافة قراءة جديدة
            </button>
         </div>
      </div>
   );
}
