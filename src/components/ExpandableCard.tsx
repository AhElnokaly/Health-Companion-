import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ExpandableCardProps {
  key?: React.Key;
  title: string;
  icon?: React.ReactNode;
  summary: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  gradientBorder?: boolean;
}

export function ExpandableCard({ title, icon, summary, expandedContent, className, defaultExpanded = false, gradientBorder = false }: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <motion.div 
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className={cn("bg-[#FFFFFF] dark:bg-[#1A1A1A] rounded-[24px] p-4 sm:p-5 shadow-sm hover:shadow-md cursor-pointer text-right transition-all relative overflow-hidden", className, gradientBorder ? "" : "border border-[#F0EBE1] dark:border-white/5")}
    >
       {gradientBorder && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4A373]/30 to-[#E07A5F]/30 p-[1px] -z-10 rounded-[24px]">
            <div className="absolute inset-0 bg-white dark:bg-[#1A1A1A] rounded-[24px]" />
          </div>
       )}
       
       <div className="flex justify-between items-center mb-4 relative z-10">
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="w-8 h-8 rounded-full bg-[#FDFBF7] border border-[#F0EBE1] flex items-center justify-center dark:bg-white/5 dark:border-white/10 shrink-0">
             <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.div>
          <div className="flex items-center gap-3">
             <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">{title}</h3>
             {icon && <div className={cn("w-10 h-10 rounded-[16px] flex items-center justify-center", gradientBorder ? "bg-amber-50/50 text-amber-600 dark:bg-amber-500/10" : "bg-[#FDFBF7] dark:bg-white/5 text-gray-600 dark:text-gray-300 border border-[#F0EBE1] dark:border-transparent")}>{icon}</div>}
          </div>
       </div>

       <motion.div layout className="mb-2 relative z-10 text-right">
         {summary}
       </motion.div>

       <AnimatePresence>
         {isExpanded && (
           <motion.div
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: 'auto' }}
             exit={{ opacity: 0, height: 0 }}
             transition={{ duration: 0.3 }}
             className="overflow-hidden relative z-10"
             onClick={(e) => e.stopPropagation()}
           >
             <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/10">
               {expandedContent}
             </div>
           </motion.div>
         )}
       </AnimatePresence>
    </motion.div>
  );
}
