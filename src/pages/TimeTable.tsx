import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Moon, Sun, Coffee, Utensils, Droplets, Pill } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import { ExpandableCard } from '../components/ExpandableCard';

export default function TimeTable() {
  const { isFastingMode, toggleFastingMode } = useAppContext();
  const [activeTab, setActiveTab] = useState(isFastingMode ? 'fasting' : 'normal');

  useEffect(() => {
    setActiveTab(isFastingMode ? 'fasting' : 'normal');
  }, [isFastingMode]);

  const handleTabChange = (tab: 'fasting' | 'normal') => {
    setActiveTab(tab);
    if (tab === 'fasting' && !isFastingMode) {
      toggleFastingMode();
    } else if (tab === 'normal' && isFastingMode) {
      toggleFastingMode();
    }
  };

  const timelineEvents = [
    { time: '04:15 AM', name: 'السحور', icon: Coffee, desc: 'وجبة غنية بالألياف تمنع العطش.', type: 'suhoor' },
    { time: '04:45 AM', name: 'صلاة الفجر', icon: Moon, desc: 'بداية الصيام', type: 'prayer' },
    { time: '01:00 PM', name: 'صلاة الظهر + القيلولة', icon: Sun, desc: '٢٠ دقيقة لاستعادة النشاط.', type: 'nap' },
    { time: '06:10 PM', name: 'صلاة المغرب + الإفطار', icon: Utensils, desc: '١ تمرة + كوب ماء (كسر الصيام)', type: 'iftar' },
    { time: '06:20 PM', name: 'دوائك المجدول', icon: Pill, desc: 'فيتامين د / حديد', type: 'meds' },
    { time: '08:00 PM', name: 'خطة التروية', icon: Droplets, desc: 'كوب ماء كل ساعة حتى النوم.', type: 'water' },
  ];

  return (
    <div className={cn("p-6 pb-32 min-h-full transition-colors duration-1000",
      isFastingMode ? "bg-[#0A0F1C] text-amber-50" : "bg-[#F5F9F9] dark:bg-black text-gray-900 dark:text-white"
    )}>
      <div className="pt-6 mb-8 text-right">
        <h1 className="text-2xl font-black mb-2">قصة يومك</h1>
        <p className={cn("text-xs font-bold", isFastingMode ? "text-amber-400/70" : "text-gray-550")}>المواعيد المدمجة للعبادة والصحة</p>
      </div>

      <div className="flex gap-2 mb-8 bg-black/10 dark:bg-white/5 p-1 rounded-2xl">
         <button onClick={() => handleTabChange('fasting')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", activeTab === 'fasting' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-550")}>وضع الصيام</button>
         <button onClick={() => handleTabChange('normal')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", activeTab === 'normal' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-550")}>الأيام العادية</button>
      </div>

      <div className="relative">
         {/* Vertical Timeline Line */}
         <div className="absolute right-7 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />

         <div className="space-y-6 relative z-10">
            {timelineEvents.map((event, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={idx} 
                className="flex items-start gap-4 text-right flex-row-reverse"
              >
                 <div className={cn("w-14 h-14 rounded-full flex gap-1 flex-col items-center justify-center shrink-0 border-4 border-[#F5F9F9] dark:border-black z-10", 
                    event.type === 'suhoor' ? "bg-amber-100 text-amber-600" :
                    event.type === 'iftar' ? "bg-emerald-100 text-emerald-600" :
                    event.type === 'prayer' ? "bg-sky-100 text-sky-600" : "bg-gray-100 dark:bg-white/5 text-gray-500"
                 )}>
                    <event.icon className="w-5 h-5" />
                 </div>
                 <div className="flex-1 mt-1">
                    <div className="bg-white dark:bg-[#0c0c0c] border border-gray-100 dark:border-white/5 p-4 rounded-2xl shadow-soft">
                       <div className="flex justify-between items-center mb-1 flex-row-reverse">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">{event.name}</h4>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{event.time}</span>
                       </div>
                       <p className="text-xs text-gray-500 leading-relaxed font-medium">{event.desc}</p>
                    </div>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>
      
      <div className="mt-8">
        <ExpandableCard 
          title="قائمة طعام الإفطار والسحور"
          icon={<Utensils className="w-5 h-5"/>}
          className={isFastingMode ? "bg-[#1E2638] border-white/5" : ""}
          defaultExpanded={true}
          summary={<p className="text-xs text-gray-400 font-bold">لترطيب أفضل ومنع العطش اليوم.</p>}
          expandedContent={
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                 <h4 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 mb-1 flex justify-end">وجبة الإفطار المقترحة</h4>
                 <ul className="text-[11px] text-emerald-600 dark:text-emerald-300/80 mr-4 list-disc text-right">
                    <li>تمر ومياه فاترة لكسر الصيام</li>
                    <li>شوربة خضار أو دجاج غنية بالمعادن</li>
                    <li>مصدر بروتين صحي (دجاج مشوي، سمك)</li>
                    <li>كربوهيدرات معقدة (أرز بني، بطاطس مشوية)</li>
                 </ul>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                 <h4 className="font-bold text-xs text-amber-700 dark:text-amber-400 mb-1 flex justify-end">وجبة السحور المقترحة</h4>
                 <ul className="text-[11px] text-amber-600 dark:text-amber-300/80 mr-4 list-disc text-right">
                    <li>شوفان أو زبادي (لبطء الهضم وتقليل العطش)</li>
                    <li>خيار وبطيخ كأطعمة غنية بالمياه</li>
                    <li>تجنب القهوة والشاي المالح أو الحار لتجنب العطش</li>
                 </ul>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
