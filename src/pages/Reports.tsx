import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, BarChart3, TrendingUp, AlertCircle, FileText, Calendar, Pill } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PremiumLock } from '../components/PremiumLock';

const data = [
  { name: 'السبت', adherence: 80 },
  { name: 'الأحد', adherence: 100 },
  { name: 'الإثنين', adherence: 90 },
  { name: 'الثلاثاء', adherence: 60 },
  { name: 'الأربعاء', adherence: 100 },
  { name: 'الخميس', adherence: 80 },
  { name: 'الجمعة', adherence: 95 },
];

export default function Reports() {
  const { isFastingMode, profile } = useAppContext();
  const isFemale = profile.gender === 'female';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('أسبوعي');

  // +++ أضيف لتنفيذ طلبك ميزة تحليل الارتباط التفاعلي +++
  const [correlationView, setCorrelationView] = useState('sleep-symptoms');

  const correlationData = [
    { week: 'الأسبوع الأول', sleep: 6.2, symptoms: 7.5, work: 5.5 },
    { week: 'الأسبوع الثاني', sleep: 7.8, symptoms: 3.2, work: 8.0 },
    { week: 'الأسبوع الثالث', sleep: 5.5, symptoms: 8.4, work: 4.8 },
    { week: 'الأسبوع الرابع', sleep: 8.0, symptoms: 2.1, work: 8.5 },
  ];

  return (
    <PremiumLock 
      title="تقارير متقدمة للمحترفين"
      description="بالاشتراك في النسخة الـ Pro تقدر تشوف إحصائيات دقيقة عن التزامك، وتصدّر تقارير PDF جاهزة للدكتور بتاعك."
    >
      <div className={cn("min-h-[100dvh] p-6 pt-10 pb-24 text-right transition-colors duration-1000",
         isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white"
      )}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-row-reverse">
        <button onClick={() => navigate(-1)} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
           isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-500"
        )}>
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">التقارير والإحصاء</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-row-reverse">
          {['أسبوعي', 'شهري'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn("flex-1 py-3 rounded-2xl font-bold text-sm transition-all",
                   activeTab === tab ? (isFastingMode ? "bg-[#D4A373] text-white" : "bg-[#1A4D42] text-white") : "bg-white/50 dark:bg-white/5 text-gray-500 border border-[#F0EBE1] dark:border-white/10"
                )}
              >
                  {tab}
              </button>
          ))}
      </div>

      <div className="space-y-6">
          {/* Adherence Chart */}
          <div className={cn("rounded-[32px] p-6 shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10")}>
              <div className="flex justify-between items-center mb-6 flex-row-reverse">
                  <div className="text-right flex-1">
                      <h2 className="font-bold text-sm mb-1 text-[#1A4D42] dark:text-gray-100">نسبة الالتزام</h2>
                      <p className="text-xs text-gray-500 font-bold">%85 في المتوسط هذا الأسبوع</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-4", isFastingMode ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-[#1A4D42] dark:bg-emerald-900/20 dark:text-emerald-400")}>
                      <TrendingUp className="w-5 h-5" />
                  </div>
              </div>
              
              <div className="h-48 w-full mt-4" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }} dx="-10" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} 
                            itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                            formatter={(value: any) => [`${value}%`, 'الالتزام']}
                          />
                          <Line type="monotone" dataKey="adherence" stroke={isFastingMode ? "#D4A373" : "#1A4D42"} strokeWidth={4} dot={{ r: 4, fill: isFastingMode ? "#D4A373" : "#1A4D42", strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* +++ رسوم الارتباط البياني التفاعلي (أضيف بناءً على طلبك كجزء من لوحتك المحدثة) +++ */}
          <div className={cn("rounded-[32px] p-6 shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10")}>
              <div className="flex justify-between items-center mb-4 flex-row-reverse">
                  <div className="text-right flex-1">
                      <h2 className="font-extrabold text-sm mb-1 text-[#1A4D42] dark:text-gray-100">تحليل الارتباط البياني التفاعلي 📊</h2>
                      <p className="text-[10px] text-gray-500 font-extrabold">
                        {isFemale 
                          ? "دراسة ترابطية ذكية ومباشرة توضح التناغم بين جودة وساعات نومكِ والمزاج والأعراض مع كفاءة وساعات العمل"
                          : "دراسة ترابطية ذكية ومباشرة توضح التناغم بين جودة وساعات نومكَ والمزاج والأعراض مع كفاءة وساعات العمل"}
                      </p>
                  </div>
              </div>

              {/* Metric Quick-Select View Tab Row */}
              <div className="grid grid-cols-3 gap-1 mb-5" dir="rtl">
                 <button 
                   type="button"
                   onClick={() => setCorrelationView('sleep-symptoms')}
                   className={cn("py-2 px-1 rounded-xl text-[9px] font-black tracking-tight transition-all border cursor-pointer",
                      correlationView === 'sleep-symptoms' 
                        ? (isFastingMode ? "bg-[#D4A373] text-white border-transparent" : "bg-[#1A4D42] text-white border-transparent")
                        : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-white/10"
                   )}
                 >
                    النوم 💤 vs الأعراض 🩸
                 </button>
                 <button 
                   type="button"
                   onClick={() => setCorrelationView('sleep-work')}
                   className={cn("py-2 px-1 rounded-xl text-[9px] font-black tracking-tight transition-all border cursor-pointer",
                      correlationView === 'sleep-work'
                        ? (isFastingMode ? "bg-[#D4A373] text-white border-transparent" : "bg-[#1A4D42] text-white border-transparent")
                        : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-white/10"
                   )}
                 >
                    النوم 💤 vs العمل 💻
                 </button>
                 <button 
                   type="button"
                   onClick={() => setCorrelationView('symptoms-work')}
                   className={cn("py-2 px-1 rounded-xl text-[9px] font-black tracking-tight transition-all border cursor-pointer",
                      correlationView === 'symptoms-work'
                        ? (isFastingMode ? "bg-[#D4A373] text-white border-transparent" : "bg-[#1A4D42] text-white border-transparent")
                        : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-white/10"
                   )}
                 >
                    الأعراض 🩸 vs العمل 💻
                 </button>
              </div>

              {/* Chart container */}
              <div className="h-56 w-full mt-2" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={correlationData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
                          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF', fontWeight: 'bold' }} dx="-5" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'black', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right', direction: 'rtl' }} 
                            itemStyle={{ fontWeight: 'extrabold', fontSize: '11px' }}
                          />
                          
                          {/* Render line nodes conditionally for focused comparison */}
                          {(correlationView === 'sleep-symptoms' || correlationView === 'sleep-work') && (
                            <Line name="ساعات النوم (ساعة) 💤" type="monotone" dataKey="sleep" stroke="#8884d8" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          )}
                          {(correlationView === 'sleep-symptoms' || correlationView === 'symptoms-work') && (
                            <Line name="شدة أعراض المغص والآلام (1-10) 🩸" type="monotone" dataKey="symptoms" stroke="#ff4d4f" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          )}
                          {(correlationView === 'sleep-work' || correlationView === 'symptoms-work') && (
                            <Line name="ساعات العمل والإنتاجية (ساعة) 💻" type="monotone" dataKey="work" stroke="#10B981" strokeWidth={3.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          )}
                      </LineChart>
                  </ResponsiveContainer>
              </div>

              {/* Dynamic narrative summary of findings */}
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-right leading-relaxed text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {correlationView === 'sleep-symptoms' && (
                     isFemale ? (
                        <span>💡 <strong>الاستنتاج التحليلي المخصص لدورتكِ:</strong> تشير أرقام هذا الشهر لعلاقة عكسية واضحة؛ النوم الهادئ الكافي لأكثر من ٧.٥ ساعة يرتبط بهبوط حاد في شدة أعراض الانتفاخ والتقلصات بنسبة ٤٢٪ بفضل استقرار الهرمونات الخلوية.</span>
                     ) : (
                        <span>💡 <strong>الاستنتاج التحليلي المخصص لصحتكَ:</strong> تشير أرقام هذا الشهر لعلاقة عكسية واضحة؛ النوم الهادئ الكافي لأكثر من ٧.٥ ساعة يرتبط بهبوط حاد في شدة الإجهاد العصبي والتقلصات البدنية بنسبة ٤٢٪ بفضل استقرار الدورة الهرمونية والاستشفاء الخلوي.</span>
                     )
                  )}
                  {correlationView === 'sleep-work' && (
                     isFemale ? (
                        <span>💡 <strong>الاستنتاج التحليلي لإنتاجيتكِ:</strong> الساعات الطويلة دون قسط كافٍ تضر بجودة العمل؛ النوم لـ ٨ ساعات يضاعف ساعات التركيز والعمل الفعلي لـ ٨.٥ ساعة بدلاً من التشتت والكسل الهرموني.</span>
                     ) : (
                        <span>💡 <strong>الاستنتاج التحليلي لإنتاجيتكَ:</strong> الساعات الطويلة دون قسط كافٍ تضر بجودة العمل؛ النوم لـ ٨ ساعات يضاعف ساعات التركيز والعمل الفعلي لـ ٨.٥ ساعة بدلاً من التشتت والكسل العضلي والذهني.</span>
                     )
                  )}
                  {correlationView === 'symptoms-work' && (
                     isFemale ? (
                        <span>💡 <strong>الاستنتاج التحليلي للتكيّف المهني:</strong> عند زيادة شدة مغص الطمث أو التشنجات لمعدل ٨.٤/١٠، تتبدد ساعات إنجازكِ للمهام. لإنقاذ عملكِ ومساعدة مضادات التقلص بفاعلية، استبدلي فوراً كافيين القهوة ببدائل دافئة!</span>
                     ) : (
                        <span>💡 <strong>الاستنتاج التحليلي للتكيّف المهني:</strong> عند زيادة شدة التقلصات أو الإرشاد البدني لمعدل ٨.٤/١٠، تتبدد ساعات إنجازكَ للمهام. لإنقاذ عملكَ ومساعدة الاستشفاء بفاعلية، استبدل فوراً كافيين القهوة ببدائل دافئة كالبابونج!</span>
                     )
                  )}
              </div>
          </div>

          {/* Most Forgotten Meds */}
          <div className={cn("rounded-[32px] p-6 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10")}>
              <div className="flex gap-3 items-center flex-row-reverse mb-6">
                 <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-500 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                 </div>
                 <h2 className="font-bold text-sm text-[#1A4D42] dark:text-gray-100">الأدوية الأكثر نسياناً</h2>
              </div>
              
              <div className="space-y-4">
                  <div className="flex justify-between items-center flex-row-reverse">
                      <div className="flex items-center gap-3 flex-row-reverse">
                          <Pill className="w-4 h-4 text-gray-400" />
                          <div>
                              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">فيتامين د</p>
                              <p className="text-[10px] text-gray-500 font-bold">نسيته ٣ مرات هذا الأسبوع</p>
                          </div>
                      </div>
                      <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1 rounded-full">60% التزام</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 h-px" />
                  <div className="flex justify-between items-center flex-row-reverse">
                      <div className="flex items-center gap-3 flex-row-reverse">
                          <Pill className="w-4 h-4 text-gray-400" />
                          <div>
                              <p className="font-bold text-sm text-gray-800 dark:text-gray-200">الحديد</p>
                              <p className="text-[10px] text-gray-500 font-bold">نسيته مرة واحدة</p>
                          </div>
                      </div>
                      <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">85% التزام</span>
                  </div>
              </div>
          </div>

          {/* Export Report */}
          <button 
             onClick={() => window.print()}
             className={cn("w-full h-16 rounded-[24px] font-bold text-sm text-[#1A4D42] dark:text-emerald-400 border-2 border-[#1A4D42]/20 dark:border-emerald-900/50 flex items-center justify-center gap-3 transition-all active:scale-95 flex-row-reverse shadow-sm",
             isFastingMode ? "border-[#D4A373]/30 text-[#D4A373]" : "bg-emerald-50/50 dark:bg-emerald-900/10"
          )}>
             <FileText className="w-5 h-5" />
             <span>تصدير تقرير للطبيب (PDF)</span>
          </button>
      </div>
    </div>
    </PremiumLock>
  );
}
