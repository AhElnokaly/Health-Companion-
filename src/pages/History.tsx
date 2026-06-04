import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, Edit2, 
  Droplet, Moon, Utensils, Pill, AlertTriangle, Activity, Heart, 
  Smile, Meh, Frown, Plus, X, Sparkles, User, Info, Check, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { useUI } from '../context/UIContext';
import { 
  collection, query, onSnapshot, doc, deleteDoc, updateDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface WaterLog {
  id: string;
  amount: number;
  beverageType: string;
  timestamp: number;
}

interface SymptomLog {
  id: string;
  painLevel: number;
  symptoms: string[];
  impact?: string;
  triggers?: string[];
  medication?: string;
  relief?: string;
  notes?: string;
  timestamp: number;
}

interface SleepLog {
  id: string;
  sleepLength: number;
  bedtime?: string;
  wakeTime?: string;
  sleepQuality?: string;
  timestamp: number;
}

interface DietLog {
  id: string;
  mealName: string;
  calories: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  foodCategory?: string;
  timestamp: number;
}

interface MedLog {
  id: string;
  medName: string;
  dosage: string;
  timestamp: number;
  status: string;
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFastingMode } = useAppContext();
  const { theme } = useUI();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Year & Month for the calendar controller
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

  // App data logs lists
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Editing State
  const [editingLog, setEditingLog] = useState<{
    id: string;
    type: 'water' | 'symptom' | 'sleep' | 'diet' | 'med';
    data: any;
  } | null>(null);

  // Subscriptions logic (compatible with guest and Firebase)
  useEffect(() => {
    if (!user) return;

    if (user.uid === 'local_guest_user') {
      const loadLocalLogs = () => {
        const localWater = localStorage.getItem('local_water_logs');
        setWaterLogs(localWater ? JSON.parse(localWater) : []);

        const localSymptoms = localStorage.getItem('local_symptoms');
        setSymptomLogs(localSymptoms ? JSON.parse(localSymptoms) : []);

        const localSleep = localStorage.getItem('local_sleep_logs');
        setSleepLogs(localSleep ? JSON.parse(localSleep) : []);

        const localDiet = localStorage.getItem('local_diet_logs');
        setDietLogs(localDiet ? JSON.parse(localDiet) : []);

        const localMedLogs = localStorage.getItem('local_medication_logs');
        setMedicationLogs(localMedLogs ? JSON.parse(localMedLogs) : []);

        setLoading(false);
      };

      loadLocalLogs();
      window.addEventListener('localWaterUpdated', loadLocalLogs);
      window.addEventListener('localSymptomsUpdated', loadLocalLogs);
      window.addEventListener('localSleepUpdated', loadLocalLogs);
      window.addEventListener('localDietUpdated', loadLocalLogs);
      window.addEventListener('localMedicationUpdated', loadLocalLogs);

      return () => {
        window.removeEventListener('localWaterUpdated', loadLocalLogs);
        window.removeEventListener('localSymptomsUpdated', loadLocalLogs);
        window.removeEventListener('localSleepUpdated', loadLocalLogs);
        window.removeEventListener('localDietUpdated', loadLocalLogs);
        window.removeEventListener('localMedicationUpdated', loadLocalLogs);
      };
    } else {
      // Subscriptions to live Firestore databases
      const unsubWater = onSnapshot(collection(db, 'users', user.uid, 'waterLogs'), (snapshot) => {
        const list: WaterLog[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as any);
        });
        setWaterLogs(list);
      });

      const unsubSymptoms = onSnapshot(collection(db, 'users', user.uid, 'symptoms'), (snapshot) => {
        const list: SymptomLog[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as any);
        });
        setSymptomLogs(list);
      });

      const unsubSleep = onSnapshot(collection(db, 'users', user.uid, 'sleepLogs'), (snapshot) => {
        const list: SleepLog[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as any);
        });
        setSleepLogs(list);
      });

      const unsubDiet = onSnapshot(collection(db, 'users', user.uid, 'dietLogs'), (snapshot) => {
        const list: DietLog[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as any);
        });
        setDietLogs(list);
      });

      const unsubMeds = onSnapshot(collection(db, 'users', user.uid, 'medication_logs'), (snapshot) => {
        const list: MedLog[] = [];
        snapshot.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() } as any);
        });
        setMedicationLogs(list);
        setLoading(false);
      });

      return () => {
        unsubWater();
        unsubSymptoms();
        unsubSleep();
        unsubDiet();
        unsubMeds();
      };
    }
  }, [user]);

  // Calendar Days generator
  const daysInMonth = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // Sun=0, Mon=1, etc.
    const prevMonthDaysCount = new Date(calendarYear, calendarMonth, 0).getDate();
    const daysCount = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    const days = [];
    
    // Arabic calendars typically start on SATURDAY
    // Sat = 6, Sun = 0, Mon = 1, Tue = 2, Wed = 3, Thu = 4, Fri = 5
    // Let's standardise on starting grid index to Saturday.
    const startDayOffset = (firstDayIndex + 1) % 7; // Sunday=0 -> Offset=1, Sat=6 -> Offset=0, etc.
    
    // Padding prefix from previous month
    for (let i = startDayOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(calendarYear, calendarMonth - 1, prevMonthDaysCount - i),
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let i = 1; i <= daysCount; i++) {
      days.push({
        date: new Date(calendarYear, calendarMonth, i),
        isCurrentMonth: true
      });
    }

    // Suffix from next month to fill grid (42 cells = 6 rows)
    const suffixCount = 42 - days.length;
    for (let i = 1; i <= suffixCount; i++) {
      days.push({
        date: new Date(calendarYear, calendarMonth + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  // Convert Gregorian to beautiful Hijri details
  const getHijriDetails = (date: Date) => {
    try {
      const formatterText = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const parts = formatterText.formatToParts(date);
      const day = parts.find(p => p.type === 'day')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const year = parts.find(p => p.type === 'year')?.value || '';
      return { day, month, year, text: `${day} ${month} ${year} هـ` };
    } catch (e) {
      return { day: '', month: '', year: '', text: '' };
    }
  };

  // Convert numbers inside Hijri day to standard digit if needed
  const getHijriDayNum = (date: Date) => {
    try {
      const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric' });
      const val = formatter.format(date);
      // Map Eastern Arabic numbers into standard ASCII representation
      const map: any = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
      return val.split('').map(char => map[char] || char).join('');
    } catch (e) {
      return '';
    }
  };

  // Check if a date has any events
  const hasEvents = (date: Date) => {
    const dateStr = date.toDateString();
    return (
      waterLogs.some(l => new Date(l.timestamp).toDateString() === dateStr) ||
      symptomLogs.some(l => new Date(l.timestamp).toDateString() === dateStr) ||
      sleepLogs.some(l => new Date(l.timestamp).toDateString() === dateStr) ||
      dietLogs.some(l => new Date(l.timestamp).toDateString() === dateStr) ||
      medicationLogs.some(l => new Date(l.timestamp).toDateString() === dateStr)
    );
  };

  // Filter events by selected day
  const dailyEvents = useMemo(() => {
    const selStr = selectedDate.toDateString();
    
    const w = waterLogs.filter(l => new Date(l.timestamp).toDateString() === selStr)
      .map(item => ({ ...item, section: 'water' as const }));
      
    const sy = symptomLogs.filter(l => new Date(l.timestamp).toDateString() === selStr)
      .map(item => ({ ...item, section: 'symptom' as const }));
      
    const sl = sleepLogs.filter(l => new Date(l.timestamp).toDateString() === selStr)
      .map(item => ({ ...item, section: 'sleep' as const }));
      
    const d = dietLogs.filter(l => new Date(l.timestamp).toDateString() === selStr)
      .map(item => ({ ...item, section: 'diet' as const }));
      
    const m = medicationLogs.filter(l => new Date(l.timestamp).toDateString() === selStr)
      .map(item => ({ ...item, section: 'med' as const }));

    return [...w, ...sy, ...sl, ...d, ...m].sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedDate, waterLogs, symptomLogs, sleepLogs, dietLogs, medicationLogs]);

  // Navigate calendar months
  const prevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const nextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  // Handle Event deletion
  const handleDeleteLog = async (type: string, id: string) => {
    if (!user) return;
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا السجل بشكل نهائي؟ 🗑️")) {
      return;
    }

    if (user.uid === 'local_guest_user') {
      if (type === 'water') {
        const saved = localStorage.getItem('local_water_logs') || '[]';
        const filtered = JSON.parse(saved).filter((item: any) => item.id !== id);
        localStorage.setItem('local_water_logs', JSON.stringify(filtered));
        window.dispatchEvent(new Event('localWaterUpdated'));
      } else if (type === 'symptom') {
        const saved = localStorage.getItem('local_symptoms') || '[]';
        const filtered = JSON.parse(saved).filter((item: any) => item.id !== id);
        localStorage.setItem('local_symptoms', JSON.stringify(filtered));
        window.dispatchEvent(new Event('localSymptomsUpdated'));
      } else if (type === 'sleep') {
        const saved = localStorage.getItem('local_sleep_logs') || '[]';
        const filtered = JSON.parse(saved).filter((item: any) => item.id !== id);
        localStorage.setItem('local_sleep_logs', JSON.stringify(filtered));
        window.dispatchEvent(new Event('localSleepUpdated'));
      } else if (type === 'diet') {
        const saved = localStorage.getItem('local_diet_logs') || '[]';
        const filtered = JSON.parse(saved).filter((item: any) => item.id !== id);
        localStorage.setItem('local_diet_logs', JSON.stringify(filtered));
        window.dispatchEvent(new Event('localDietUpdated'));
      } else if (type === 'med') {
        const saved = localStorage.getItem('local_medication_logs') || '[]';
        const filtered = JSON.parse(saved).filter((item: any) => item.id !== id);
        localStorage.setItem('local_medication_logs', JSON.stringify(filtered));
         window.dispatchEvent(new Event('localMedicationUpdated'));
      }
    } else {
      // Direct Firestore Deletion
      let collectionName = '';
      if (type === 'water') collectionName = 'waterLogs';
      if (type === 'symptom') collectionName = 'symptoms';
      if (type === 'sleep') collectionName = 'sleepLogs';
      if (type === 'diet') collectionName = 'dietLogs';
      if (type === 'med') collectionName = 'medication_logs';

      if (collectionName) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, collectionName, id));
        } catch (e) {
          console.error("Failed to delete log:", e);
        }
      }
    }
  };

  // Open edit log modal
  const handleOpenEdit = (event: any) => {
    setEditingLog({
      id: event.id,
      type: event.section,
      data: { ...event }
    });
  };

  // Save the modified log
  const handleSaveEdit = async () => {
    if (!editingLog || !user) return;
    const { id, type, data } = editingLog;

    const updatedPayload: any = {};
    if (type === 'water') {
      updatedPayload.amount = Number(data.amount);
      updatedPayload.beverageType = data.beverageType || 'ماء عادي';
    } else if (type === 'symptom') {
      updatedPayload.painLevel = Number(data.painLevel);
      updatedPayload.notes = data.notes || '';
      updatedPayload.symptoms = data.symptoms || [];
    } else if (type === 'diet') {
      updatedPayload.mealName = data.mealName || '';
      updatedPayload.calories = Number(data.calories);
    } else if (type === 'sleep') {
      updatedPayload.sleepLength = Number(data.sleepLength);
    } else if (type === 'med') {
      updatedPayload.dosage = data.dosage || '';
      updatedPayload.medName = data.medName || '';
    }

    if (user.uid === 'local_guest_user') {
      let key = '';
      let updateEvent = '';
      if (type === 'water') { key = 'local_water_logs'; updateEvent = 'localWaterUpdated'; }
      if (type === 'symptom') { key = 'local_symptoms'; updateEvent = 'localSymptomsUpdated'; }
      if (type === 'sleep') { key = 'local_sleep_logs'; updateEvent = 'localSleepUpdated'; }
      if (type === 'diet') { key = 'local_diet_logs'; updateEvent = 'localDietUpdated'; }
      if (type === 'med') { key = 'local_medication_logs'; updateEvent = 'localMedicationUpdated'; }

      if (key) {
        const saved = localStorage.getItem(key) || '[]';
        const list = JSON.parse(saved);
        const idx = list.findIndex((item: any) => item.id === id);
        if (idx > -1) {
          list[idx] = { ...list[idx], ...updatedPayload };
          localStorage.setItem(key, JSON.stringify(list));
          window.dispatchEvent(new Event(updateEvent));
        }
      }
    } else {
      let collectionName = '';
      if (type === 'water') collectionName = 'waterLogs';
      if (type === 'symptom') collectionName = 'symptoms';
      if (type === 'sleep') collectionName = 'sleepLogs';
      if (type === 'diet') collectionName = 'dietLogs';
      if (type === 'med') collectionName = 'medication_logs';

      if (collectionName) {
        try {
          await updateDoc(doc(db, 'users', user.uid, collectionName, id), updatedPayload);
        } catch (e) {
          console.error("Failed to edit doc:", e);
        }
      }
    }

    setEditingLog(null);
  };

  // Gregorian Month Names in Arabic
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const weekdayNames = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

  return (
    <div className={cn(
      "p-4 pb-28 min-h-full transition-colors duration-1000 text-right font-sans relative z-10 w-full max-w-md mx-auto",
      isFastingMode ? "text-amber-50" : "text-gray-900 dark:text-gray-100"
    )}>
      
      {/* Page Title Header */}
      <div className="pt-6 mb-6 text-right">
        <h1 className="text-2xl font-black mb-1.5 flex items-center justify-end gap-2 flex-row-reverse">
          <CalendarIcon className="w-6 h-6 text-primary dark:text-emerald-400 animate-pulse" />
          سجل الأحداث اليومية 📅
        </h1>
        <p className="text-[10px] font-bold text-gray-400">
          تتبع نشاطاتك الصحية والروحية، ورتب أحداث يومك بالتفصيل
        </p>
      </div>

      {/* Gregorian and Hijri Multi-Calender Card */}
      <div className={cn(
        "rounded-[24px] p-4 border mb-6 relative overflow-hidden text-right shadow-sm transition-all duration-300",
        isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
      )}>
        
        {/* Calendar Nav Header */}
        <div className="flex justify-between items-center mb-4 flex-row-reverse">
          <h2 className="text-xs font-black flex items-center gap-1 flex-row-reverse">
            <span className="text-[#1A4D42] dark:text-emerald-400 font-extrabold">{arabicMonths[calendarMonth]} {calendarYear}</span>
            <span className="text-gray-400">/</span>
            <span className="text-amber-600 dark:text-amber-500 text-[10px] font-bold">
              {getHijriDetails(new Date(calendarYear, calendarMonth, 15)).month} {getHijriDetails(new Date(calendarYear, calendarMonth, 15)).year}
            </span>
          </h2>

          <div className="flex items-center gap-1.5 flex-row-reverse">
            <button 
              onClick={prevMonth} 
              className="p-1.5 rounded-xl bg-gray-50 dark:bg-black/20 text-gray-400 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                const today = new Date();
                setCalendarYear(today.getFullYear());
                setCalendarMonth(today.getMonth());
                setSelectedDate(today);
              }}
              className="text-[9px] font-black px-2 py-1 rounded-lg bg-primary/10 text-primary dark:text-emerald-400 hover:bg-primary/20 transition-all"
            >
              اليوم 🎯
            </button>
            <button 
              onClick={nextMonth} 
              className="p-1.5 rounded-xl bg-gray-50 dark:bg-black/20 text-gray-400 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2 font-bold text-[9px] text-[#1A4D42] dark:text-emerald-500 bg-gray-50 dark:bg-black/10 py-1.5 rounded-xl">
          {weekdayNames.map((d, index) => (
            <div key={index}>{d}</div>
          ))}
        </div>

        {/* Month grid body */}
        <div className="grid grid-cols-7 gap-1 text-center font-sans">
          {daysInMonth.map((day, idx) => {
            const isSelected = day.date.toDateString() === selectedDate.toDateString();
            const isToday = day.date.toDateString() === new Date().toDateString();
            const hasLog = hasEvents(day.date);
            const hijriDay = getHijriDayNum(day.date);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "p-2 rounded-xl h-12 flex flex-col justify-between items-center relative transition-all cursor-pointer active:scale-95",
                  !day.isCurrentMonth && "opacity-25 grayscale",
                  isSelected 
                    ? "bg-primary text-white scale-105 shadow-md shadow-primary/30 dark:bg-emerald-600" 
                    : isToday
                      ? "bg-amber-100 text-[#1A4D42] border border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
                      : "hover:bg-gray-50 dark:hover:bg-black/30 text-gray-700 dark:text-gray-300"
                )}
              >
                {/* Hijri day top corner (very small) */}
                <span className={cn(
                  "text-[7.5px] font-mono self-start block leading-none select-none",
                  isSelected ? "text-amber-200" : "text-amber-600 dark:text-amber-500"
                )}>
                  {hijriDay}
                </span>

                {/* Gregorian numeric large day */}
                <span className="text-xs font-black leading-none block">
                  {day.date.getDate()}
                </span>

                {/* Event indicator dot */}
                {hasLog && (
                  <span className={cn(
                    "w-1 h-1 rounded-full block mt-0.5",
                    isSelected ? "bg-amber-300 animate-ping" : "bg-sky-500 dark:bg-sky-400"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Header and Highlights */}
      <div className="flex justify-between items-center mb-4 flex-row-reverse" dir="rtl">
        <h3 className="font-black text-[13px] text-gray-800 dark:text-white flex items-center gap-1.5">
          <span className="text-primary dark:text-emerald-400">أحداث وتفاصيل يوم:</span>
          <span className="text-[11px] font-bold text-gray-400 text-[#1A4D42] dark:text-emerald-400 bg-gray-50 dark:bg-black/25 px-2.5 py-1 rounded-lg">
            {selectedDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
          </span>
          <span className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg font-bold">
            {getHijriDetails(selectedDate).text}
          </span>
        </h3>
        <span className="text-[9px] font-bold text-gray-400">
          ({dailyEvents.length} أحداث مسجلة)
        </span>
      </div>

      {/* Empty State Illustration if no logs saved on this day */}
      {dailyEvents.length === 0 ? (
        <div className={cn(
          "rounded-[24px] p-8 border text-center flex flex-col justify-center items-center shadow-xs transition-all duration-300",
          isFastingMode ? "bg-[#091D17] border-emerald-950/45 text-white" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
        )}>
          <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-black/10 flex items-center justify-center text-gray-400 mb-3 animate-bounce">
            <Info className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-gray-500 dark:text-gray-400">
            لا توجد أحداث أو خيارات صحية مسجلة لهذا اليوم.
          </p>
          <p className="text-[9.5px] text-gray-400 mt-1">
            اضغط على شاشة الرئيسية أو زر الإدخال السريع لبدء ملء يومك بالنشاط!
          </p>
        </div>
      ) : (
        /* Display log items in complete visual cards format */
        <div className="space-y-3.5 mb-10 text-right">
          {dailyEvents.map((event: any, idx) => {
            const dateObj = new Date(event.timestamp);
            const formattedTime = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

            return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={event.id || idx}
                className={cn(
                  "p-4 rounded-[22px] border relative overflow-hidden text-right shadow-xs transition-all flex flex-col justify-between gap-1",
                  isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
                )}
              >
                {/* Card Title Header with Icons */}
                <div className="flex justify-between items-center flex-row-reverse mb-2 w-full">
                  <div className="flex items-center gap-2 flex-row-reverse" dir="rtl">
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0",
                      event.section === 'water' ? 'bg-sky-500' :
                      event.section === 'symptom' ? 'bg-rose-500' :
                      event.section === 'sleep' ? 'bg-purple-500' :
                      event.section === 'diet' ? 'bg-emerald-500' : 'bg-indigo-500'
                    )}>
                      {event.section === 'water' && <Droplet className="w-3.5 h-3.5" />}
                      {event.section === 'symptom' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {event.section === 'sleep' && <Moon className="w-3.5 h-3.5" />}
                      {event.section === 'diet' && <Utensils className="w-3.5 h-3.5" />}
                      {event.section === 'med' && <Pill className="w-3.5 h-3.5" />}
                    </span>
                    <span className="font-black text-xs text-gray-800 dark:text-white leading-none">
                      {event.section === 'water' && `شرب المياه (${event.beverageType || "ماء عادى"})`}
                      {event.section === 'symptom' && "تسجيل مغص وأعراض ألم اليوم"}
                      {event.section === 'sleep' && "تسجيل ساعات النوم"}
                      {event.section === 'diet' && `وجبة صحية (${event.mealName || "مجهولة"})`}
                      {event.section === 'med' && `جرعة دواء: ${event.medName}`}
                    </span>
                  </div>

                  {/* Actions buttons delete & edit */}
                  <div className="flex items-center gap-1.5 flex-row">
                    <button 
                      onClick={() => handleOpenEdit(event)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-primary transition-all active:scale-95 cursor-pointer"
                      title="تعديل هذا السجل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteLog(event.section, event.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-gray-400 hover:text-rose-500 transition-all active:scale-95 cursor-pointer"
                      title="مسح هذا السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Event Details Specifications */}
                <div className="pr-9 pr-rtl text-right" dir="rtl">
                  {/* Water section details */}
                  {event.section === 'water' && (
                    <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      لقد شربت <span className="font-extrabold text-sky-500 text-xs">{event.amount} مل</span> في تمام الساعة {formattedTime}.
                    </div>
                  )}

                  {/* Diet section details */}
                  {event.section === 'diet' && (
                    <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      الوجبة: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{event.mealName}</span> • الطاقة المستهلكة: <span className="font-black text-xs text-emerald-500">{event.calories} سعرة</span>.
                    </div>
                  )}

                  {/* Sleep section details */}
                  {event.section === 'sleep' && (
                    <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      ساعات النوم المسجلة: <span className="font-extrabold text-purple-600 dark:text-purple-400 text-xs">{event.sleepLength} ساعة</span> • وقت النوم: {event.bedtime || 'غير محدد'} • جودة النوم: {event.sleepQuality || 'جيدة'}.
                    </div>
                  )}

                  {/* Medication take specifications */}
                  {event.section === 'med' && (
                    <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                      الجرعة: <span className="font-extrabold text-indigo-500 text-xs">{event.dosage || "حسب الحاجة"}</span> • الحالة: <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 rounded-lg">تم أخذها ☑️</span>.
                    </div>
                  )}

                  {/* Symptoms tracker details */}
                  {event.section === 'symptom' && (
                    <div className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300 space-y-1">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <span className="font-bold">مستوى الألم:</span>
                        <div className="flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-lg text-rose-500">
                          {event.painLevel > 7 ? <Frown className="w-3 h-3" /> : event.painLevel > 3 ? <Meh className="w-3 h-3" /> : <Smile className="w-3 h-3" />}
                          <span className="font-black text-xs">{event.painLevel}/10</span>
                        </div>
                      </div>
                      {event.symptoms && event.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 flex-row-reverse justify-end">
                          <span className="font-bold shrink-0 self-center">الأعراض:</span>
                          {event.symptoms.map((s: string, idx2: number) => (
                            <span key={idx2} className="bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[9px] font-black px-1.5 py-0.5 rounded-md">{s}</span>
                          ))}
                        </div>
                      )}
                      {event.notes && (
                        <div className="bg-gray-50 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 mt-1 text-[10.5px]">
                          <span className="text-[9px] font-bold text-gray-400 block mb-0.5">ملاحظاتك:</span>
                          <span className="text-gray-600 dark:text-gray-300 italic">"{event.notes}"</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Event Exact recording Time */}
                  <div className="text-[8px] text-gray-400 mt-2 flex items-center justify-end gap-1 font-mono tracking-tight leading-none">
                    <span>{formattedTime}</span>
                    <Clock className="w-2.5 h-2.5 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Beautiful Edit Log Modal dialog box (AnimatePresence) */}
      <AnimatePresence>
        {editingLog && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className={cn(
                "rounded-[28px] p-6 text-right shadow-2xl border w-full max-w-sm overflow-hidden relative",
                isFastingMode ? "bg-[#161C22] border-white/15 text-white" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/10"
              )}
              dir="rtl"
            >
              {/* Head line */}
              <div className="flex justify-between items-center mb-5 flex-row-reverse">
                <h3 className="font-black text-sm text-[#1A4D42] dark:text-emerald-400 flex items-center gap-1">
                  🔨 تعديل سجل الأحداث
                </h3>
                <button 
                  onClick={() => setEditingLog(null)}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-black/20 text-gray-450 hover:bg-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form editing factors */}
              <div className="space-y-4">
                {editingLog.type === 'water' && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">الكمية المسجلة (مل):</label>
                    <input 
                      type="number" 
                      value={editingLog.data.amount}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        data: { ...editingLog.data, amount: e.target.value }
                      })}
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-3 text-xs font-black text-center"
                    />
                  </div>
                )}

                {editingLog.type === 'diet' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">اسم الوجبة:</label>
                      <input 
                        type="text" 
                        value={editingLog.data.mealName}
                        onChange={(e) => setEditingLog({
                          ...editingLog,
                          data: { ...editingLog.data, mealName: e.target.value }
                        })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-3 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">السعرات الحرارية:</label>
                      <input 
                        type="number" 
                        value={editingLog.data.calories}
                        onChange={(e) => setEditingLog({
                          ...editingLog,
                          data: { ...editingLog.data, calories: e.target.value }
                        })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-3 text-xs font-black text-center"
                      />
                    </div>
                  </div>
                )}

                {editingLog.type === 'sleep' && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">ساعات النوم:</label>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={editingLog.data.sleepLength}
                      onChange={(e) => setEditingLog({
                        ...editingLog,
                        data: { ...editingLog.data, sleepLength: e.target.value }
                      })}
                      className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-3 text-xs font-black text-center"
                    />
                  </div>
                )}

                {editingLog.type === 'med' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">اسم الدواء المأخوذ:</label>
                      <input 
                        type="text" 
                        value={editingLog.data.medName}
                        onChange={(e) => setEditingLog({
                          ...editingLog,
                          data: { ...editingLog.data, medName: e.target.value }
                        })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-3 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">الجرعة:</label>
                      <input 
                        type="text" 
                        value={editingLog.data.dosage}
                        onChange={(e) => setEditingLog({
                          ...editingLog,
                          data: { ...editingLog.data, dosage: e.target.value }
                        })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-3 text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                )}

                {editingLog.type === 'symptom' && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">مستوى الألم والتقلصات (0-10):</label>
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-black/20 px-3 py-1.5 rounded-xl mb-1 text-xs">
                        <span className="font-extrabold text-rose-500">{editingLog.data.painLevel}/10</span>
                        <input 
                          type="range" 
                          min="0" max="10" 
                          value={editingLog.data.painLevel}
                          onChange={(e) => setEditingLog({
                            ...editingLog,
                            data: { ...editingLog.data, painLevel: parseInt(e.target.value) }
                          })}
                          className="w-1/2 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">الملاحظات والوصف:</label>
                      <textarea 
                        rows={3} 
                        value={editingLog.data.notes}
                        onChange={(e) => setEditingLog({
                          ...editingLog,
                          data: { ...editingLog.data, notes: e.target.value }
                        })}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 rounded-xl p-2.5 text-xs font-bold text-right"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm submit buttons */}
              <div className="flex gap-2 mt-6">
                <button 
                  onClick={handleSaveEdit}
                  className="flex-1 bg-primary text-white font-black text-xs py-2.5 rounded-xl hover:bg-opacity-90 transition-all active:scale-95 cursor-pointer"
                >
                  ✓ حفظ التغييرات
                </button>
                <button 
                  onClick={() => setEditingLog(null)}
                  className="flex-1 bg-gray-100 dark:bg-black/40 text-gray-650 hover:bg-gray-200 py-2.5 rounded-xl text-xs font-bold hover:text-gray-900 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
