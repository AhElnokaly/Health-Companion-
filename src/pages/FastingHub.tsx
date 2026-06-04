import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Moon, 
  Calendar, 
  Bell, 
  Check, 
  Info, 
  BookOpen, 
  Clock, 
  Coffee, 
  Utensils, 
  Droplets,
  HeartPulse,
  Sparkles,
  Trophy,
  Plus,
  Minus,
  Settings,
  Trash2,
  CalendarClock
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';

export default function FastingHub() {
  const navigate = useNavigate();
  const { isFastingMode, toggleFastingMode, profile } = useAppContext();

  // +++ تم الإضافة لتنفيذ طلبك: الربط الذكي الهرموني بالصيام والنمط السلوكي للنوم +++
  const sleepHours = useMemo(() => {
    try {
      const savedSleep = localStorage.getItem('local_sleep_logs');
      const sleepList = savedSleep ? JSON.parse(savedSleep) : [];
      if (sleepList && sleepList.length > 0) {
         const latest = sleepList[0];
         return (latest.durationMinutes || (latest.sleepLength * 60) || 480) / 60;
      }
    } catch (e) {}
    return 8; // قيمة افتراضية
  }, []);

  const computedCycleStatus = useMemo(() => {
    if (profile.gender !== 'female') return null;
    try {
      const saved = localStorage.getItem('local_cycle_logs') || '[]';
      const cycleLogs: any[] = JSON.parse(saved);
      if (!cycleLogs.length) return null;

      // 1. pregnancy check
      const activePregnancy = cycleLogs.find(l => l.status === 'pregnancy' && !l.endDate);
      if (activePregnancy) return { phase: 'pregnancy' };

      // 2. postpartum check
      const activePostpartum = cycleLogs.find(l => l.status === 'postpartum' && !l.endDate);
      if (activePostpartum) return { phase: 'postpartum' };

      // Average cycle logic
      const periodLogs = cycleLogs.filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate);
      let totalCycleLen = 0;
      let cycleCount = 0;
      for (let i = 0; i < periodLogs.length - 1; i++) {
          const current = periodLogs[i];
          const prev = periodLogs[i + 1];
          const days = Math.floor((current.startDate - prev.startDate) / 86400000);
          if (days >= 20 && days <= 45) {
              totalCycleLen += days;
              cycleCount++;
          }
      }
      const averageCycle = cycleCount > 0 ? Math.round(totalCycleLen / cycleCount) : 28;

      // period duration stats
      const historicalPeriods = cycleLogs.filter(l => l.status === 'period' && l.endDate);
      let totalDays = 0;
      historicalPeriods.forEach(p => {
         const days = Math.floor((p.endDate! - p.startDate) / 86400000) + 1;
         totalDays += days;
      });
      const avgDur = historicalPeriods.length > 0 ? Math.round(totalDays / historicalPeriods.length) : 7;
      const periodDurationStats = Math.min(10, Math.max(3, avgDur));

      // Active period check
      const activePeriod = cycleLogs.find(l => {
         if (l.status !== 'period' || l.endDate) return false;
         const today = new Date().setHours(0,0,0,0);
         const start = new Date(l.startDate).setHours(0,0,0,0);
         const absDaysSince = Math.floor((today - start) / 86400000) + 1;
         return absDaysSince <= Math.max(10, periodDurationStats);
      });

      const lastPeriod = periodLogs[0];
      if (lastPeriod) {
         const today = new Date().setHours(0,0,0,0);
         const start = new Date(lastPeriod.startDate).setHours(0,0,0,0);
         const absDaysSince = Math.floor((today - start) / 86400000) + 1;

         if (activePeriod) {
            return { phase: 'menstrual', cycleDay: absDaysSince };
         }

         const cycleLength = averageCycle;
         const late = absDaysSince > cycleLength + 2;

         let calculatedPhase = 'luteal';
         if (late) {
            calculatedPhase = 'luteal';
         } else {
            const estimatedOvulation = Math.max(14, cycleLength - 14);
            if (absDaysSince < estimatedOvulation - 4) {
               calculatedPhase = 'follicular';
            } else if (absDaysSince >= estimatedOvulation - 4 && absDaysSince <= estimatedOvulation + 1) {
               calculatedPhase = 'ovulation';
            } else {
               calculatedPhase = 'luteal';
            }
         }
         return { phase: calculatedPhase, cycleDay: absDaysSince };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [profile]);
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  const [fastingAlertsEnabled, setFastingAlertsEnabled] = useState(() => {
    return localStorage.getItem('fasting_alerts_enabled') !== 'false';
  });

  const [fastingHistoryLog, setFastingHistoryLog] = useState<string[]>(() => {
    const saved = localStorage.getItem('fasting_history_log');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return ["2026-05-18", "2026-05-21"];
  });

  const [activeTabSuggestion, setActiveTabSuggestion] = useState<'suhoor' | 'iftar' | 'water' | 'women' | 'men'>('suhoor');

  // --- +++ أضيف بناءً على طلبك لشاشات تهيئة وتتبع قضاء صيام رمضان الفائت بذكاء وتسهيل احترافي متكامل للجنسين +++ ---
  const [ramadanSetupDone, setRamadanSetupDone] = useState<boolean>(() => {
    return localStorage.getItem('local_ramadan_remaining_days_setup_done') === 'true';
  });

  const [totalMissedDays, setTotalMissedDays] = useState<number>(() => {
    const saved = localStorage.getItem('local_ramadan_total_missed_days');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [makeupFasts, setMakeupFasts] = useState<{ id: string; dateStr: string; reason: string; timestamp: number }[]>(() => {
    try {
      const saved = localStorage.getItem('local_completed_makeup_days');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [inputMissedDays, setInputMissedDays] = useState<number>(totalMissedDays || 7);
  const [isAddingMakeup, setIsAddingMakeup] = useState<boolean>(false);
  const [isEditingSetup, setIsEditingSetup] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string>('');

  // حساب أيام الفائض التلقائي من دورة المرأة إذا كانت نشطة ومقاطعة لرمضان السابق
  const cycleMissedRamadanDays = useMemo(() => {
    if (profile.gender !== 'female') return 0;
    let autoMissed = 0;
    try {
      const saved = localStorage.getItem('local_cycle_logs') || '[]';
      const cycleLogs: any[] = JSON.parse(saved);
      
      // تواريخ رمضان لعام 2026 وعام 2025 كمرجع ذكي
      const RAMADANS = [
         { start: new Date('2025-02-28').setHours(0,0,0,0), end: new Date('2025-03-30').setHours(23,59,59,999) },
         { start: new Date('2026-02-17').setHours(0,0,0,0), end: new Date('2026-03-19').setHours(23,59,59,999) }
      ];

      cycleLogs.forEach(log => {
        if (log.status === 'period' || log.status === 'postpartum') {
          const logStart = new Date(log.startDate).getTime();
          const logEnd = log.endDate ? new Date(log.endDate).getTime() : Date.now();
          
          RAMADANS.forEach(ramadan => {
             const overlapStart = Math.max(logStart, ramadan.start);
             const overlapEnd = Math.min(logEnd, ramadan.end);
             if (overlapStart < overlapEnd) {
                // حساب عدد الأيام
                autoMissed += Math.ceil((overlapEnd - overlapStart) / 86400000);
             }
          });
        }
      });
    } catch (e) {
      console.error(e);
    }
    return autoMissed;
  }, [profile.gender]);

  // إجمالي الأيام المطلوبة = التلقائي للهرمونات (للنساء) + المدخل يدوياً
  const calculatedTotalMissed = useMemo(() => {
    return Math.max(0, totalMissedDays + cycleMissedRamadanDays);
  }, [totalMissedDays, cycleMissedRamadanDays]);

  const remainingMissedDays = useMemo(() => {
    return Math.max(0, calculatedTotalMissed - makeupFasts.length);
  }, [calculatedTotalMissed, makeupFasts]);

  const handleSaveSetup = (days: number) => {
    localStorage.setItem('local_ramadan_total_missed_days', days.toString());
    localStorage.setItem('local_ramadan_remaining_days_setup_done', 'true');
    setTotalMissedDays(days);
    setRamadanSetupDone(true);
    setIsEditingSetup(false);
    triggerSuccess("تم حفظ إعدادات قضاء رمضان وبدء المتوقع لرحلتك بنجاح! 🌙✨");
  };

  const handleAddMakeupFast = (reason: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newLog = {
      id: `makeup_${Date.now()}`,
      dateStr: todayStr,
      reason,
      timestamp: Date.now()
    };
    
    const updated = [newLog, ...makeupFasts];
    setMakeupFasts(updated);
    localStorage.setItem('local_completed_makeup_days', JSON.stringify(updated));
    setIsAddingMakeup(false);
    
    // إذا كان صائماً اليوم أيضاً، نفعله في وضع الصيام تلقائياً لتسهيل التجربة!
    if (!isFastingMode) {
      toggleFastingMode();
    }
    triggerSuccess("بطل(ة)! تم تسجيل صيامك كليوم تعويضي وقضاء مضاف لليوم بنجاح 🕋✨");
  };

  const handleDeleteMakeupFast = (id: string) => {
    const updated = makeupFasts.filter(x => x.id !== id);
    setMakeupFasts(updated);
    localStorage.setItem('local_completed_makeup_days', JSON.stringify(updated));
    triggerSuccess("تم حذف سجل اليوم التعويضي بنجاح وتحديث العداد 📂");
  };

  const triggerSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4500);
  };
  // ---------------------------------------------------------------------------------------------------------

  const toggleFastingAlerts = () => {
    setFastingAlertsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('fasting_alerts_enabled', next ? 'true' : 'false');
      return next;
    });
  };

  const handleLogFastingDayDirect = (dateStr: string) => {
    if (fastingHistoryLog.includes(dateStr)) {
      const nextLog = fastingHistoryLog.filter(d => d !== dateStr);
      setFastingHistoryLog(nextLog);
      localStorage.setItem('fasting_history_log', JSON.stringify(nextLog));
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr === todayStr && isFastingMode) {
        toggleFastingMode();
      }
    } else {
      const nextLog = [...fastingHistoryLog, dateStr];
      setFastingHistoryLog(nextLog);
      localStorage.setItem('fasting_history_log', JSON.stringify(nextLog));
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr === todayStr && !isFastingMode) {
        toggleFastingMode();
      }
    }
  };

  // Sync state
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (isFastingMode) {
      if (!fastingHistoryLog.includes(todayStr)) {
        setFastingHistoryLog(prev => {
          const next = [...prev, todayStr];
          localStorage.setItem('fasting_history_log', JSON.stringify(next));
          return next;
        });
      }
    } else {
      if (fastingHistoryLog.includes(todayStr)) {
        setFastingHistoryLog(prev => {
          const next = prev.filter(d => d !== todayStr);
          localStorage.setItem('fasting_history_log', JSON.stringify(next));
          return next;
        });
      }
    }
  }, [isFastingMode]);

  const recommendedDays = [
    { id: 'arafah', name: '🕋 صيام يوم عرفة العظيم', dateStr: '2026-05-26', dateLabel: '٢٦ مايو ٢٠٢٦ (اليوم)', icon: '🕋', virtue: 'يكفر ذنوب السنة الماضية والقابلة' },
    { id: 'thu', name: '🕌 صيام الخميس القادم', dateStr: '2026-05-28', dateLabel: '٢٨ مايو ٢٠٢٦', icon: '🕌', virtue: 'تُعرض فيه الأعمال على الله عز وجل' },
    { id: 'white13', name: '🌕 الأيام البيض (١٣ ذو الحجة)', dateStr: '2026-05-30', dateLabel: '٣٠ مايو ٢٠٢٦', icon: '🌕', virtue: 'صيامها كصيام الدهر كله' },
    { id: 'white14', name: '🌕 الأيام البيض (١٤ ذو الحجة)', dateStr: '2026-05-31', dateLabel: '٣١ مايو ٢٠٢٦', icon: '🌕', virtue: 'صيامها كصيام الدهر كله' },
    { id: 'mon', name: '🕌 صيام الإثنين المقبل', dateStr: '2026-06-01', dateLabel: '١ يونيو ٢٠٢٦', icon: '🕌', virtue: 'يوم وُلِد فيه النبي ﷺ ويستحب شكره بصومه' },
  ];

  const todayFastingType = useMemo(() => {
    const today = new Date();
    const isMay26_2026 = today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 26;
    if (isMay26_2026) return '🕋 يوم عرفة (أعظم أيام السنة الهجرية)';
    
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 1) return '🕌 صيام الإثنين (سنّة نبوية مؤكدة)';
    if (dayOfWeek === 4) return '🕌 صيام الخميس (سنّة نبوية مؤكدة)';
    
    const year = today.getFullYear();
    const month = today.getMonth(); 
    const day = today.getDate();
    if (year === 2026 && month === 4) {
      if (day === 30) return '🌕 الأيام البيض (١٣ ذو الحجة)';
      if (day === 31) return '🌕 الأيام البيض (١٤ ذو الحجة)';
    }
    if (year === 2026 && month === 5) {
      if (day === 1) return '🌕 الأيام البيض (١٥ ذو الحجة)';
    }
    return null;
  }, []);

  // +++ تم الإضافة لتنفيذ طلبك: تحديد الأيام المحرّم صيامها وإخفاء كارت الصيام فيها +++
  const isFastingForbiddenToday = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      const hDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
      const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
      
      // شهر ١٠ (شوال) يوم ١: عيد الفطر
      if (hMonth === 10 && hDay === 1) return true;
      // شهر ١٢ (ذو الحجة) أيام ١٠، ١١، ١٢، ١٣: عيد الأضحى وأيام التشريق الثلاثة
      if (hMonth === 12 && (hDay === 10 || hDay === 11 || hDay === 12 || hDay === 13)) return true;
    } catch (e) {
      console.error("Error in Hijri conversion:", e);
    }
    return false;
  }, []);

  const forbiddenFastingDayName = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      const hDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
      const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
      
      if (hMonth === 10 && hDay === 1) {
        return "عيد الفطر السعيد 🎉 (يحرم الصيام في العيدين)";
      }
      if (hMonth === 12) {
        if (hDay === 10) return "عيد الأضحى المبارك 🐑 (يوم النحر)";
        if (hDay === 11) return "أول أيام التشريق (ثاني أيام عيد الأضحى)";
        if (hDay === 12) return "ثاني أيام التشريق (ثالث أيام عيد الأضحى)";
        if (hDay === 13) return "ثالث أيام التشريق (رابع أيام عيد الأضحى)";
      }
    } catch (e) {}
    return null;
  }, []);

  return (
    <div className="p-4 pt-2 pb-24 min-h-full bg-slate-50 dark:bg-[#0c0c0c] transition-colors duration-1000 relative z-10 w-full overflow-hidden max-w-md mx-auto">
      {/* --- +++ إشعار النجاح المضاف بناءً على طلبك +++ --- */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl text-center font-bold text-xs animate-bounce" dir="rtl">
          {successToast}
        </div>
      )}

      {/* رأس الصفحة وزر العودة */}
      <div className="flex justify-between items-center mb-6 flex-row-reverse">
        <button 
          onClick={() => navigate('/')} 
          className="w-10 h-10 bg-white/80 dark:bg-white/10 shadow-xs flex items-center justify-center rounded-2xl border border-gray-100 dark:border-white/5 active:scale-95 transition-transform"
        >
          <ArrowRight className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <div className="text-right">
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 flex-row-reverse">
            <span>مركز صيام النوافل والسنن</span>
            <span className="text-xl">🌙</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-bold dark:text-gray-400">مساعدك الذكي لإدارة صيام السنن، الإشعارات، والوجبات</p>
        </div>
      </div>

      {/* بطاقة الحالة الحالية السريعة */}
      {isFastingForbiddenToday ? (
        <div className="rounded-[24px] p-5 shadow-sm border mb-5 text-right relative overflow-hidden bg-gradient-to-br from-[#FAF5EF] to-[#FFF9F2] dark:from-[#1E1A16] dark:to-[#171412] border-amber-200 dark:border-amber-900/40">
          <div className="absolute top-0 left-0 translate-x-1.5 translate-y-1.5 text-amber-500/10 dark:text-amber-500/5 text-5xl font-black font-sans pointer-events-none select-none">🎉</div>
          <div className="flex gap-3 items-start flex-row-reverse mb-4 relative z-10">
            <span className="text-2xl shrink-0">🎉</span>
            <div className="flex-grow">
              <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">تنبيه التقويم الإسلامي</span>
              <h3 className="font-extrabold text-base text-amber-900 dark:text-amber-400 leading-tight mt-0.5">
                اليوم هو {forbiddenFastingDayName}
              </h3>
              <p className="text-[11px] text-[#A27B5C] dark:text-[#E2C799] font-semibold leading-relaxed mt-2" dir="rtl">
                يحرم الصوم في هذا اليوم المبارك شرعاً وصحياً (أيام العيد والتشريق). اغتنم الفرصة لتناول وجبات صحية ومشاركتها مع أحبابك وعائلتك! تقبل الله صالح طاعاتكم وعيدكم مبارك سعيد! 🍬🌸
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(
          "rounded-[24px] p-5 shadow-sm border mb-5 text-right relative overflow-hidden",
          isFastingMode 
            ? "bg-gradient-to-br from-[#1E2638] to-[#111827] text-white border-blue-500/10" 
            : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
        )}>
          <div className="flex gap-3 items-start flex-row-reverse mb-4">
            <span className="text-2xl shrink-0">🕌</span>
            <div className="flex-grow">
              <span className="text-[10px] font-black uppercase text-amber-500">حالة الصيام اليوم</span>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight mt-0.5">
                {isFastingMode ? "أنت في وضع الصيام المفعل 🌙" : "أنت لست صائماً حالياً"}
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed mt-1">
                {isFastingMode 
                  ? "يتم تكييف أهداف شرب الماء والوجبات وأوقات الأدوية على الإفطار والسحور بشكل مثالي وتلقائي."
                  : "يمكنك تحويل التطبيق لوضع الصيام لتعديل أوقات التربية وأدق تفاصيل يومك بنقرة زر."}
              </p>
            </div>
          </div>

          {/* زرار تسجيل الصيام المباشر */}
          <div className="flex flex-col gap-2.5 bg-black/5 dark:bg-white/5 p-3 rounded-2xl">
            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
              {isFastingMode ? "🟢 تم تسجيل صيامك لليوم بنجاح!" : "❓ هل تصوم اليوم من أجل تفعيل تكييف الأهداف؟"}
            </div>
            <button
              onClick={toggleFastingMode}
              className={cn(
                "w-full py-2.5 px-4 rounded-xl text-center text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-row-reverse shadow-xs",
                isFastingMode 
                  ? "bg-red-500 text-white hover:bg-red-650"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              )}
            >
              {isFastingMode ? (
                <>
                  <span>إلغاء وضع الصيام الحالي</span>
                </>
              ) : (
                <>
                  <span>🕌 نعم، أنا صائم اليوم!</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- +++ بطاقة تتبع وإعداد قضاء صيام رمضان الفائت بمسوغاتها الشرعية لكل جنس مضاف بناءً على طلبك +++ --- */}
      {(!ramadanSetupDone || isEditingSetup) ? (
        <div className="bg-gradient-to-br from-[#FAF5EF] to-[#FFF9F2] dark:from-[#1E1A16] dark:to-[#171412] border border-amber-200 dark:border-amber-900/30 rounded-[24px] p-5 shadow-sm text-right mb-5 font-sans relative">
           <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-300 mb-2 flex items-center justify-end gap-1.5 flex-row-reverse">
              <span>تهيئة قضاء صيام رمضان الفائت 🕌⭐</span>
           </h3>
           <p className="text-[11px] text-amber-800/80 dark:text-amber-400 font-semibold leading-relaxed mb-4" dir="rtl">
              أهلاً بكِ/بكَ في متتبع العهد والتعويض لمتابعة الأيام الفائتة قبل قدوم رمضان القادم. حدد عدد الأيام المفطرة المتبقية عليك لقضائها (سواءً لمرض، سفر، عذر شرعي أو غيره).
           </p>

           <div className="flex flex-col gap-3.5 bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-amber-200/20" dir="rtl">
              <div className="flex justify-between items-center flex-row">
                 <span className="text-xs font-bold text-gray-700 dark:text-gray-300">أيام الصيام المطلوبة:</span>
                 <div className="flex items-center gap-3">
                    <button 
                       type="button" 
                       onClick={() => setInputMissedDays(prev => Math.max(0, prev - 1))}
                       className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold active:scale-90 transition-transform"
                    >
                       <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-black text-amber-900 dark:text-amber-200 w-12 text-center">{inputMissedDays} {inputMissedDays >= 3 && inputMissedDays <= 10 ? 'أيام' : 'يوم'}</span>
                    <button 
                       type="button" 
                       onClick={() => setInputMissedDays(prev => Math.min(30, prev + 1))}
                       className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold active:scale-90 transition-transform"
                    >
                       <Plus className="w-3.5 h-3.5" />
                    </button>
                 </div>
              </div>

              {profile.gender === 'female' && (
                 <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-200/25 text-[10px] text-rose-800 dark:text-[#E2C799] leading-snug">
                    ℹ️ <strong>ميزة ذكية للمرأة:</strong> سيقوم التطبيق تلقائياً بحساب وقراءة الأيام المقاطعة لدورتكِ أو نفاسك مع شهر رمضان الماضي وإضافتها لعدادكِ تيسيراً عليكِ!
                 </div>
              )}

              <div className="flex gap-2.5 pt-1">
                 <button
                    onClick={() => handleSaveSetup(inputMissedDays)}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all active:scale-97 shadow-xs font-sans"
                 >
                    حفظ وتفعيل المتتبع 🎯
                 </button>
                 {isEditingSetup && (
                    <button
                       onClick={() => setIsEditingSetup(false)}
                       className="py-2 px-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 text-xs font-bold transition-all active:scale-97 font-sans"
                    >
                       إلغاء
                    </button>
                 )}
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-5 shadow-sm text-right mb-5 font-sans relative overflow-hidden">
           {/* Header */}
           <div className="flex justify-between items-center mb-3.5 flex-row-reverse">
              <span className="font-extrabold text-xs text-gray-950 dark:text-white flex items-center gap-1.5 flex-row-reverse">
                 <CalendarClock className="w-4 h-4 text-amber-500" />
                 قضاء صيام رمضان الفائت 🌙📖
              </span>
              <button 
                 onClick={() => {
                    setInputMissedDays(totalMissedDays);
                    setIsEditingSetup(true);
                 }}
                 className="p-1.5 rounded-full bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-650 transition-colors"
                 title="تعديل عدد الأيام الكلية"
              >
                 <Settings className="w-2.5 h-2.5" />
              </button>
           </div>

           {/* Progress state */}
           <div className="bg-amber-500/5 p-4 rounded-2xl mb-4 border border-amber-500/10">
              <div className="flex justify-between items-center mb-1.5 flex-row-reverse text-xs font-bold text-gray-750 dark:text-gray-300">
                 <span>مؤشر إنجاز التعويض:</span>
                 <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                    {calculatedTotalMissed === 0 ? '100' : Math.round((makeupFasts.length / calculatedTotalMissed) * 100)}%
                 </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden flex flex-row-reverse">
                 <div 
                    className="bg-gradient-to-r from-amber-400 to-amber-600 h-full transition-all duration-500 ease-out" 
                    style={{ width: `${calculatedTotalMissed === 0 ? 100 : Math.min(100, (makeupFasts.length / calculatedTotalMissed) * 100)}%` }}
                 ></div>
              </div>

              {/* Stats values */}
              <div className="grid grid-cols-3 gap-2 text-center mt-3" dir="rtl">
                 <div className="p-1.5 bg-white dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="block text-xs font-black text-amber-600 dark:text-amber-400">{calculatedTotalMissed}</span>
                    <span className="text-[8.5px] font-bold text-gray-400">مطلوب قضائه</span>
                 </div>
                 <div className="p-1.5 bg-white dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="block text-xs font-black text-emerald-600 dark:text-emerald-450">{makeupFasts.length}</span>
                    <span className="text-[8.5px] font-bold text-gray-400">تم صيامهم</span>
                 </div>
                 <div className="p-1.5 bg-white dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="block text-xs font-black text-[#C2185B] dark:text-pink-400">{remainingMissedDays}</span>
                    <span className="text-[8.5px] font-bold text-gray-400">الأيام المتبقية</span>
                 </div>
              </div>

              {profile.gender === 'female' && cycleMissedRamadanDays > 0 && (
                 <div className="text-[9px] text-[#C2185B] dark:text-pink-400 font-bold mt-2 text-center">
                    ✨ تم دمج {cycleMissedRamadanDays} أيام حيض/نفاس تلقائياً متقاطعة مع رمضان الماضي!
                 </div>
              )}
           </div>

           {/* Quick Log completed dynamic actions */}
           {remainingMissedDays === 0 ? (
              <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-2" dir="rtl">
                 🏆 هنيئاً لك! لقد أتممت قضاء كافة أيام رمضان الفائت المطلوبة عليك بنجاح تام وبكامل الهمة والعافية. تذكّري/تذكّر أن صيام النوافل متاح دوماً في الركن السفلي!
              </div>
           ) : (
              <div className="space-y-3">
                 {!isAddingMakeup ? (
                    <button
                       onClick={() => setIsAddingMakeup(true)}
                       className="w-full py-2.5 px-4 rounded-xl text-center text-xs font-black bg-amber-500 text-white hover:bg-amber-600 transition-all active:scale-98 flex items-center justify-center gap-1.5 flex-row-reverse shadow-xs font-sans"
                    >
                       ✍️ تسجيل صيام يوم تعويضي (قضاء)
                    </button>
                 ) : (
                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5" dir="rtl">
                       <span className="block text-[10px] font-bold text-gray-500 mb-2">حددي/حدد العذر الشرعي لصيام هذا اليوم:</span>
                       <div className="grid grid-cols-2 gap-2">
                          {profile.gender === 'female' && (
                             <button
                                onClick={() => handleAddMakeupFast("عذر شرعي دورتكِ/نفاسكِ 🌸")}
                                className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/20 dark:hover:bg-pink-950/30 text-rose-700 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30 text-[10.5px] font-bold text-center"
                             >
                                عذر حيض/نفاس 🌸
                             </button>
                          )}
                          <button
                             onClick={() => handleAddMakeupFast("عذر السفر والترحال ✈️")}
                             className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/10 text-[10.5px] font-bold text-center"
                          >
                             سفر وترحال ✈️
                          </button>
                          <button
                             onClick={() => handleAddMakeupFast("عذر المرض أو الوعكة الصحية 🤒")}
                             className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/10 text-[10.5px] font-bold text-center"
                          >
                             وعكة ومرض 🤒
                          </button>
                          <button
                             onClick={() => handleAddMakeupFast("أعذار ومسوغات أخرى 📝")}
                             className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 border border-gray-250 dark:border-white/10 text-[10.5px] font-bold text-center"
                          >
                             أعذار أخرى 📝
                          </button>
                       </div>
                       <button
                          onClick={() => setIsAddingMakeup(false)}
                          className="w-full text-center text-[10px] text-gray-500 underline font-semibold mt-2.5 block"
                       >
                          تراجع
                       </button>
                    </div>
                 )}
              </div>
           )}

           {/* Logged makeup fast history collapse list */}
           {makeupFasts.length > 0 && (
              <div className="mt-3.5 border-t border-dashed border-gray-100 dark:border-white/5 pt-2.5">
                 <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex justify-between items-center text-[10px] font-bold text-gray-400 flex-row-reverse"
                 >
                    <span>سجلات قضاء الأيام المستوفاة ({makeupFasts.length})</span>
                    <span>{showHistory ? '▲ إخفاء' : '▼ عرض التفاصيل'}</span>
                 </button>

                 {showHistory && (
                    <div className="mt-2.5 space-y-2 max-h-[160px] overflow-y-auto pr-1" dir="rtl">
                       {makeupFasts.map((fast) => (
                          <div 
                             key={fast.id} 
                             className="flex justify-between items-center p-2 rounded-xl bg-gray-50 dark:bg-white/5 text-right border border-gray-100 dark:border-white/5"
                          >
                             <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">{fast.reason}</span>
                                <span className="text-[8px] font-bold text-gray-400">{fast.dateStr}</span>
                             </div>
                             <button
                                onClick={() => {
                                   if (window.confirm("هل تود حقاً التراجع وحذف هذا اليوم من سجل الأيام المقضية؟")) {
                                      handleDeleteMakeupFast(fast.id);
                                   }
                                }}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-500/5 rounded-full transition-colors"
                                title="حذف السجل"
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           )}
        </div>
      )}

      {/* +++ ربط ذكي هرموني بالصيام والنمط السلوكي للنوم +++ */}
      {profile.gender === 'female' ? (
        computedCycleStatus?.phase === 'luteal' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] p-5 shadow-sm border border-pink-100 dark:border-pink-900/30 bg-gradient-to-br from-rose-50 to-[#FCF4F6] dark:from-pink-950/20 dark:to-[#1A1A1A] mb-5 text-right relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 translate-x-2 translate-y-2 text-pink-500/10 text-4xl select-none">🌸</div>
            <div className="flex gap-3 items-start flex-row-reverse relative z-10">
              <span className="text-xl">🌸</span>
              <div className="flex-grow">
                <span className="text-[10px] font-black uppercase text-pink-650 text-pink-700 dark:text-pink-400">توجيه هرموني وقائي ذكي</span>
                <h3 className="font-extrabold text-xs text-rose-950 dark:text-pink-300 leading-tight mt-0.5">
                  تكييف صيامكِ الهرموني (الطور الأصفري / PMS) ⏱️
                </h3>
                <p className="text-[11px] text-rose-900/90 dark:text-rose-200/95 font-semibold leading-relaxed mt-2" dir="rtl">
                  عزيزتي، يمر جسدكِ الآن بـ <span className="font-black text-rose-750 text-rose-600 dark:text-rose-350">الطور الأصفري (متلازمة ما قبل الطمث)</span>. لمنع التعب والإجهاد الكظري الناجم عن مستويات سكر الدم المتذبذبة، <span className="font-extrabold text-rose-600 dark:text-rose-455">نوصي بتقليل ساعات الصيام المتقطع الطويلة</span> وتجهيز وجبة سحور أو إفطار دافئة غنية بمصادر الماغنسيوم الطبيعي (مثل الموز والكاكاو العضوي) وحبوب الشوفان المتوازنة لدعم الغدة الكظرية.
                </p>
                {sleepHours < 7 && (
                  <div className="mt-2.5 p-2 bg-pink-500/10 dark:bg-pink-950/40 rounded-xl border border-pink-200/30 text-[10px] text-pink-700 dark:text-pink-300 font-bold leading-normal">
                    💤 ملاحظة سلوكية: يظهر مؤشر نومكِ الأخير نقصاً في ساعات الراحة ({sleepHours.toFixed(1)} ساعة)، مما يضاعف الإجهاد؛ احرصي على النوم المبكر لمنع خلل هرمون الكورتيزول.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] p-5 shadow-sm border border-emerald-100 dark:border-emerald-950/30 bg-gradient-to-br from-emerald-50 to-[#FCFDFB] dark:from-emerald-950/20 dark:to-[#1A1A1A] mb-5 text-right relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 translate-x-2 translate-y-2 text-emerald-500/10 text-4xl select-none">⚡</div>
          <div className="flex gap-3 items-start flex-row-reverse relative z-10">
            <span className="text-xl">⚡</span>
            <div className="flex-grow">
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">تحسين الهيكل الفسيولوجي والذكوري للرجال</span>
              <h3 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-300 leading-tight mt-0.5">
                مواءمة صيامكَ مع التستوستيرون والنمو البدني ⏱️
              </h3>
              <p className="text-[11px] text-emerald-900/90 dark:text-emerald-250 font-semibold leading-relaxed mt-2" dir="rtl">
                عزيزي، ممارسة الصيام المتقطع لـ ١٦ ساعة أو أكثر يساهم بشكل مباشر في مضاعفة معدل إفراز هرمون النمو (GH) بنسبة تصل لـ ٢٠٠٠٪، مما يسرّع تعافي الأنسجة وحرق الدهون العميقة. ينشط هذا الصيام أيضاً حساسية خلايا العضلات للأنسولين لضمان بناء كتلة عضلية متناسقة.
              </p>
              {sleepHours < 7 && (
                <div className="mt-2.5 p-2 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/30 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold leading-normal">
                  💤 ملاحظة سلوكية: يظهر مؤشر نومكَ الأخير نقصاً في ساعات الراحة ({sleepHours.toFixed(1)} ساعة)، مما يقلل من الاستشفاء العضلي الليلة؛ احرص على النوم المنتظم لدعم التوازن العضلي والبدني.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* لوحة التحكم بالإشعارات وتنبيهات صيام السنن */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-4 mb-5 text-right">
        <div className="flex justify-between items-center flex-row-reverse mb-4">
          <div className="flex items-center gap-2 flex-row-reverse">
            <Bell className={cn("w-4 h-4 text-amber-500", fastingAlertsEnabled && "animate-bounce")} />
            <span className="font-extrabold text-xs text-gray-950 dark:text-white">إشعارات وتنبيهات النوافل</span>
          </div>
          <button 
            onClick={toggleFastingAlerts}
            className={cn(
              "text-[9.5px] font-black px-3 py-1 rounded-full border transition-all",
              fastingAlertsEnabled 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                : "bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10 text-gray-550"
            )}
          >
            {fastingAlertsEnabled ? "مفعّلة الآن" : "معطّلة الآن"}
          </button>
        </div>

        {fastingAlertsEnabled ? (
          <div className="p-3 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-[10px] text-amber-800 dark:text-amber-300/95 font-bold leading-normal">
            🔔 سيرسل لك التطبيق إشعاراً تذكيرياً جميلاً الليلة السابقة لأيام السنن (الإثنين والخميس والأيام البيض وعرفة) لتنبيهك لتناول السحور وتجهيز النية المباركة.
          </div>
        ) : (
          <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-[10px] text-gray-550 font-semibold leading-normal">
            ⚙️ التنبيهات معطلة. ننصح بتفعيلها لتصلك إشعارات ذكية مسبقة لتجهيز نية الصيام وتذكير السحور قبل أيام النوافل.
          </div>
        )}
      </div>

      {/* جدول السلاسل والأيام المستحبة */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-4 mb-5 text-right">
        <div className="flex justify-between items-center mb-3 flex-row-reverse">
          <span className="font-extrabold text-xs text-gray-950 dark:text-white flex items-center gap-1 flex-row-reverse">
            <Calendar className="w-4 h-4 text-amber-500" />
            الأيام المرشحة والمستحبة لعام ٢٠٢٦ 📅
          </span>
          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/10">
            سجلت {fastingHistoryLog.length} يوم صيام 🌟
          </span>
        </div>

        {todayFastingType && (
          <div className="mb-3.5 p-3 rounded-2xl bg-gradient-to-l from-amber-500/10 to-transparent border border-amber-500/25 text-right flex flex-col gap-1.5 animate-pulse">
            <h5 className="font-extrabold text-[10.5px] text-amber-900 dark:text-amber-400 flex items-center gap-1 flex-row-reverse">
              <span>تنويه: فرصة صيام مباركة متوفرة اليوم!</span>
            </h5>
            <p className="text-[10px] text-amber-800/90 dark:text-amber-300 font-bold leading-relaxed">
              اليوم هو صدى مبارك لـ {todayFastingType}. صيام اليوم يبني الصحة ويضاعف الحسنات المباركة.
            </p>
          </div>
        )}

        <div className="space-y-2" dir="rtl">
          {recommendedDays.map((day, idx) => {
            const isLogged = fastingHistoryLog.includes(day.dateStr);
            const isToday = day.dateStr === new Date().toISOString().split('T')[0];
            return (
              <div 
                key={day.id}
                className={cn(
                  "p-3 rounded-2xl border flex justify-between items-center transition-all text-right",
                  isLogged ? "bg-amber-500/5 border-amber-500/25" : "bg-black/5 dark:bg-white/5 border-gray-100 dark:border-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg select-none">{day.icon}</span>
                  <div>
                    <h6 className="font-extrabold text-[11px] text-gray-800 dark:text-white flex items-center gap-1.5 flex-row-reverse justify-end">
                      {isToday && <span className="text-[8px] bg-red-500 text-white font-black px-1.5 py-0.5 rounded animate-pulse">اليوم</span>}
                      <span>{day.name}</span>
                    </h6>
                    <p className="text-[9.5px] text-gray-400 font-bold leading-normal">{day.dateLabel}</p>
                    <p className="text-[9px] text-amber-600 dark:text-amber-405 font-medium leading-none mt-1-5">✨ فضله: {day.virtue}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleLogFastingDayDirect(day.dateStr)}
                  className={cn(
                    "text-[9.5px] font-black px-3 py-2 rounded-xl flex items-center gap-1 transition-all active:scale-95 shadow-sm",
                    isLogged 
                      ? "bg-amber-500 text-white font-black" 
                      : "bg-transparent hover:bg-black/5 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-550 dark:text-gray-300 font-bold"
                  )}
                >
                  {isLogged ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>صُمت بنجاح</span>
                    </>
                  ) : (
                    <span>تسجيل صوم</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* لوحة المقترحات والنصائح الصحية المتكاملة */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-4 text-right mb-5">
        <span className="text-xs font-black text-gray-900 dark:text-gray-200 flex items-center gap-1.5 border-b border-dashed border-gray-100 dark:border-white/5 pb-2.5 mb-3 flex-row-reverse">
          <BookOpen className="w-4 h-4 text-amber-500" />
          مقترحات وتوصيات الرعاية الصحية الذكية للصائمين 🌿
        </span>

        {/* الألسنة للتوصيات والمقترحات */}
        <div className="flex gap-1 mb-3 bg-black/5 dark:bg-white/5 p-1 rounded-2xl" dir="rtl">
          {[
            { id: 'suhoor', label: '🥣 سحور وقائي', icon: '🥣' },
            { id: 'iftar', label: '🥤 كسر آمن', icon: '🥤' },
            { id: 'water', label: '💧 ري متدرج', icon: '💧' },
            profile.gender === 'female' 
              ? { id: 'women', label: '🤰 صحة حواء', icon: '🤰' }
              : { id: 'men', label: '⚡ بناء الأبطال', icon: '⚡' }
          ].map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTabSuggestion(tab.id as any)}
              className={cn(
                "flex-1 py-2 rounded-xl text-[10px] font-black transition-all text-center flex flex-col items-center justify-center gap-1",
                activeTabSuggestion === tab.id 
                  ? "bg-white dark:bg-gray-800 shadow-xs text-amber-600 dark:text-amber-400 font-black" 
                  : "text-gray-400 dark:text-gray-400 hover:text-gray-600"
              )}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* محتوى الإرشاد المكتوب */}
        <div className="text-right p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 min-h-[110px] flex flex-col justify-between">
          {activeTabSuggestion === 'suhoor' && (
            <div>
              <h5 className="text-xs font-extrabold text-amber-900 dark:text-amber-400 mb-1.5 flex items-center justify-start gap-1 flex-row-reverse">
                <span>سحور مكيّف لمنع العطش والجفاف</span>
                <span className="text-xs">🥣</span>
              </h5>
              <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 font-bold leading-relaxed">
                تجنب الأغذية الغنية بالصوديوم أو المخللات والتوابل تماماً. ركّز على الألياف والمصادر الغنية بالبوتاسيوم مثل <span className="font-extrabold text-amber-600 dark:text-amber-400">الموز، التمر والزبادي</span>، لضمان بطء تحلل الكربوهيدرات والاحتفاظ بالمياه لأطول فترة.
              </p>
            </div>
          )}

          {activeTabSuggestion === 'iftar' && (
            <div>
              <h5 className="text-xs font-extrabold text-amber-900 dark:text-amber-400 mb-1.5 flex items-center justify-start gap-1 flex-row-reverse">
                <span>كسر الصيام المتوازن والآمن</span>
                <span className="text-xs">🥤</span>
              </h5>
              <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 font-bold leading-relaxed">
                ابدأ بتناول <span className="font-extrabold text-amber-600 dark:text-amber-400">١-٣ تمرات مع كوب ماء دافئ</span>. تجنب السوائل عالية السكر فوراً لعدم إرباك البنكرياس وبدء الهضم بلطف لحمايتك من خمول الدم والهبوط المفاجئ.
              </p>
            </div>
          )}

          {activeTabSuggestion === 'water' && (
            <div>
              <h5 className="text-xs font-extrabold text-amber-800 dark:text-amber-450 mb-1.5 flex items-center justify-start gap-1 flex-row-reverse">
                <span>نهج الإرواء والترطيب التدريجي</span>
                <span className="text-xs">💧</span>
              </h5>
              <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 font-bold leading-relaxed">
                شرب ٢ لتر فجأة يزيد العطش وإفراز البول لإجهاد الكلى! ننصح باستهلاك <span className="font-extrabold text-amber-650 dark:text-amber-402">كوب واحد من الماء (٢٥٠ مل) كل ٤٥ دقيقة</span> بانتظام طوال ساعات الإفطار، ليتمكن الجسم من تفعيل الترطيب الخلوي الحقيقي.
              </p>
            </div>
          )}

          {activeTabSuggestion === 'women' && profile.gender === 'female' && (
            <div>
              <h5 className="text-xs font-extrabold text-amber-800 dark:text-amber-450 mb-1.5 flex items-center justify-start gap-1 flex-row-reverse">
                <span>توجيه لصحة وسياق صيام المرأة</span>
                <span className="text-xs">🤰</span>
              </h5>
              <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 font-bold leading-relaxed">
                للحوامل أو المرضعات، احرصي على قياس نسبة السكر والنبض بانتظام. عند المعاناة من <span className="font-extrabold text-amber-655 dark:text-amber-400">الوهن أو تباطؤ التركيز أو برودة الكفين</span> يجب الإفطار فوراً؛ فالرخصة الدينية والطبية رفيقة بالمرأة بامتياز.
              </p>
            </div>
          )}

          {activeTabSuggestion === 'men' && profile.gender !== 'female' && (
            <div>
              <h5 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-450 mb-1.5 flex items-center justify-start gap-1 flex-row-reverse">
                <span>توجيه بناء الأجسام والجهد والتمثيل للرجال</span>
                <span className="text-xs">⚡</span>
              </h5>
              <p className="text-[10px] text-emerald-800/90 dark:text-emerald-300/90 font-bold leading-relaxed">
                لكل رياضي أو باحث عن تعزيز اللياقة البنائية؛ تمرين القوة والحديد يفضل أن يكون في الساعة الأخيرة قبل أذان المغرب مباشرة، أو بعد التراويح/العشاء بساعتين، ليكون معدل تخليق البروتين العضلي في قمته، واحرص على تناول ٣٠-٤٠ جرام بروتين سريع الامتصاص عند كسر الصيام!
              </p>
            </div>
          )}
          
          <div className="text-[8.5px] text-amber-600/80 dark:text-amber-400/80 mt-2 block font-extrabold text-left border-t border-amber-500/5 pt-1.5" dir="rtl">
            💡 تلميحة طبية: صوم التطوع يُصلح البنية الخلوية ويعزز من كفاءة التهام ذاتي للسموم!
          </div>
        </div>
      </div>

      {/* بطاقة الإحصائيات الفخمة */}
      <div className="bg-gradient-to-tr from-amber-500/10 to-transparent border border-amber-500/10 rounded-[24px] p-5 text-right relative overflow-hidden">
        <div className="absolute top-0 left-0 translate-x-3 translate-y-3 opacity-15">
          <Trophy className="w-16 h-16 text-amber-500" />
        </div>
        
        <h4 className="font-extrabold text-xs text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1.5 flex-row-reverse">
          <Sparkles className="w-3.5 h-3.5" />
          أثر الصيام على الطاعة والمؤشرات الحيوية
        </h4>
        <p className="text-[10px] text-gray-550 dark:text-gray-350 font-bold leading-relaxed mb-4">
          يساهم صيام النوافل المنتظم في خفض مستويات الأنسولين التراكمي وتوفير راحة دورية للجهاز الهضمي، بالإضافة للأجر العظيم والسكينة الروحية المصاحبة للعبادة.
        </p>

        <div className="grid grid-cols-3 gap-2.5 text-center mt-2">
          <div className="bg-white/50 dark:bg-white/5 p-2 rounded-xl border border-amber-500/10">
            <span className="block text-base font-black text-amber-600 dark:text-amber-400">{fastingHistoryLog.length}</span>
            <span className="text-[8.5px] font-bold text-gray-500 dark:text-gray-400">أيام الصيام</span>
          </div>
          <div className="bg-white/50 dark:bg-white/5 p-2 rounded-xl border border-amber-500/10">
            <span className="block text-base font-black text-amber-600 dark:text-amber-400">{Math.round(fastingHistoryLog.length * 14)}h</span>
            <span className="text-[8.5px] font-bold text-gray-500 dark:text-gray-400">ساعات الصوم</span>
          </div>
          <div className="bg-white/50 dark:bg-white/5 p-2 rounded-xl border border-amber-500/10">
            <span className="block text-base font-black text-emerald-600 dark:text-emerald-400">+{fastingHistoryLog.length * 10}</span>
            <span className="text-[8.5px] font-bold text-gray-500 dark:text-gray-400">نقاط التقوى</span>
          </div>
        </div>
      </div>
    </div>
  );
}
