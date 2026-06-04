import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, Plus, Droplet, Coffee, ThermometerSun, Activity, 
  Flame, GlassWater, Trophy, AlertTriangle, ShieldAlert, Moon, 
  Sparkles, Settings, Star, TrendingUp, Calendar, Heart, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { useWeather } from '../hooks/useWeather';
import DrinkBuilderModal from '../components/DrinkBuilderModal';
import { customTrackerStore } from '../lib/custom-tracker-store';

interface WaterLog {
  id: string;
  amount: number; // The visual/input amount
  effectiveAmount: number; // The calculated amount (e.g. coffee is 50%)
  context?: string;
  beverageType: string;
  timestamp: number;
}

const BEVERAGE_TYPES = [
  { name: 'ماء عادي', icon: Droplet, factor: 1, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { name: 'عصير طبيعي', icon: GlassWater, factor: 0.8, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  { name: 'شاي (بدون سكر)', icon: Coffee, factor: 0.9, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { name: 'شاي (بسكر)', icon: Coffee, factor: 0.7, color: 'text-amber-800', bg: 'bg-amber-100 dark:bg-amber-900/40' },
  { name: 'قهوة', icon: Coffee, factor: 0.5, color: 'text-stone-700', bg: 'bg-stone-100 dark:bg-stone-900/30' },
  { name: 'مشروبات غازية', icon: GlassWater, factor: 0, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
];

export default function Water() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, isFastingMode } = useAppContext();
  const { temperature, loading: weatherLoading } = useWeather();
  
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'today' | 'reports'>('today');
  const [isWorkoutDay, setIsWorkoutDay] = useState(false);
  const [selectedBeverage, setSelectedBeverage] = useState(BEVERAGE_TYPES[0]);
  
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState('250');
  const [showCelebration, setShowCelebration] = useState(false);

  // Custom favorite mug settings loaded from LocalStorage
  const [favoriteMugSize, setFavoriteMugSize] = useState<number>(() => {
    return Number(localStorage.getItem('favorite_mug_size')) || 250;
  });
  const [favoriteMugName, setFavoriteMugName] = useState<string>(() => {
    return localStorage.getItem('favorite_mug_name') || 'مج الشاي المفضل';
  });
  const [showMugEditor, setShowMugEditor] = useState(false);
  const [isDrinkCreatorOpen, setIsDrinkCreatorOpen] = useState(false);

  // +++ أضيفت بناءً على طلبك - إتاحة استخدام زر سري يمثل المشروب المثبت للارتواء اليومي مباشرة +++
  const [pinnedWaterConfig, setPinnedWaterConfig] = useState(() => customTrackerStore.getPinnedWater());

  useEffect(() => {
    const handleWaterPinChange = () => {
      setPinnedWaterConfig(customTrackerStore.getPinnedWater());
    };
    window.addEventListener('waterQuickPinnedChanged', handleWaterPinChange);
    return () => {
      window.removeEventListener('waterQuickPinnedChanged', handleWaterPinChange);
    };
  }, []);

  const [tempMugSize, setTempMugSize] = useState(String(favoriteMugSize));
  const [tempMugName, setTempMugName] = useState(favoriteMugName);
  
  const baseGoal = profile.weight ? Math.round(profile.weight * 35) : 2500;
  
  let tempExtra = 0;
  if (temperature !== null) {
      if (temperature >= 35) tempExtra = 500;
      else if (temperature >= 25) tempExtra = 300;
  }
  const workoutExtra = isWorkoutDay ? 400 : 0;
  
  const effectiveDailyGoal = baseGoal + tempExtra + workoutExtra;

  // Real-time Firestore logic
  useEffect(() => {
    if (!user) return;
    
    if (user.uid === 'local_guest_user') {
      const loadLocalData = () => {
        // Water
        const savedWater = localStorage.getItem('local_water_logs');
        const loadedLogs: WaterLog[] = savedWater ? JSON.parse(savedWater) : [];
        const normalizedLogs = loadedLogs.map((log, idx) => ({
          ...log,
          id: log.id || `local_water_${log.timestamp}_${idx}`
        }));
        normalizedLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(normalizedLogs);
        setLoading(false);

        // Symptoms
        const savedSymptoms = localStorage.getItem('local_symptoms');
        const loadedSymptoms = savedSymptoms ? JSON.parse(savedSymptoms) : [];
        setSymptomLogs(loadedSymptoms);
      };

      loadLocalData();
      window.addEventListener('localWaterUpdated', loadLocalData);
      window.addEventListener('localSymptomsUpdated', loadLocalData);

      return () => {
        window.removeEventListener('localWaterUpdated', loadLocalData);
        window.removeEventListener('localSymptomsUpdated', loadLocalData);
      };
    } else {
      // Water logs loading
      const qWater = query(collection(db, 'users', user.uid, 'waterLogs'));
      const unsubscribeWater = onSnapshot(qWater, (snapshot) => {
        const loadedLogs: WaterLog[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          loadedLogs.push({
            id: doc.id,
            amount: data.amount,
            effectiveAmount: typeof data.effectiveAmount === 'number' ? data.effectiveAmount : data.amount,
            context: data.context || '',
            beverageType: data.beverageType || 'ماء عادي',
            timestamp: data.timestamp
          });
        });
        loadedLogs.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(loadedLogs);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/waterLogs`);
        setLoading(false);
      });

      // Symptom logs loading
      const qSymptom = query(collection(db, 'users', user.uid, 'symptoms'));
      const unsubscribeSymptom = onSnapshot(qSymptom, (snapshot) => {
        const loadedSymptoms: any[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          loadedSymptoms.push({
            id: doc.id,
            ...data
          });
        });
        setSymptomLogs(loadedSymptoms);
      });

      return () => {
        unsubscribeWater();
        unsubscribeSymptom();
      };
    }
  }, [user]);

  // Helper helper to check local date format
  const isToday = (timestamp: number) => {
    const d = new Date(timestamp);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  // Filter ONLY today's logs for today's visual progress
  const todayLogs = useMemo(() => {
    return logs.filter(log => isToday(log.timestamp));
  }, [logs]);

  const currentWater = useMemo(() => {
    return todayLogs.reduce((sum, log) => sum + log.effectiveAmount, 0);
  }, [todayLogs]);

  const percentage = Math.min((currentWater / effectiveDailyGoal) * 105, 100);

  // Trigger celebration once per session when hitting 100%
  useEffect(() => {
    if (percentage >= 100 && percentage < 101) {
      setShowCelebration(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 300]);
      }
      const t = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(t);
    }
  }, [percentage]);

  // Add beverage
  const addBeverage = async (amount: number, context: string) => {
    if (!user) return;
    const effectiveTarget = amount * selectedBeverage.factor;
    if (user.uid === 'local_guest_user') {
      try {
        const savedWater = localStorage.getItem('local_water_logs');
        const waterList = savedWater ? JSON.parse(savedWater) : [];
        waterList.push({
          id: Math.random().toString(),
          amount,
          effectiveAmount: effectiveTarget,
          context: context || 'سريع',
          beverageType: selectedBeverage.name,
          timestamp: Date.now()
        });
        localStorage.setItem('local_water_logs', JSON.stringify(waterList));
        window.dispatchEvent(new Event('localWaterUpdated'));
        setIsCustomMode(false);
      } catch (e) {
        console.error("Local guest add beverage error:", e);
      }
    } else {
      try {
        await addDoc(collection(db, 'users', user.uid, 'waterLogs'), {
          amount,
          effectiveAmount: effectiveTarget,
          context: context || 'سريع',
          beverageType: selectedBeverage.name,
          timestamp: Date.now()
        });
        setIsCustomMode(false);
      } catch (error) {
         handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/waterLogs`);
      }
    }
  };

  const handleLogDrinkFromModal = async (
    amount: number,
    name: string,
    factor: number,
    calories: number,
    carbs: number,
    protein: number,
    fats: number
  ) => {
    if (!user) return;
    const timestamp = Date.now();
    const cleanName = name || 'مشروب مخصص';

    if (user.uid === 'local_guest_user') {
      try {
        const savedWater = localStorage.getItem('local_water_logs');
        const waterList = savedWater ? JSON.parse(savedWater) : [];
        waterList.push({
          id: Math.random().toString(),
          amount,
          effectiveAmount: Math.round(amount * factor),
          context: 'مصمم المشروبات الذكي',
          beverageType: cleanName,
          timestamp
        });
        localStorage.setItem('local_water_logs', JSON.stringify(waterList));
        window.dispatchEvent(new Event('localWaterUpdated'));
      } catch (e) {
        console.error("Local water custom log error:", e);
      }
    } else {
      try {
        await addDoc(collection(db, 'users', user.uid, 'waterLogs'), {
          amount,
          effectiveAmount: Math.round(amount * factor),
          context: 'مصمم المشروبات الذكي',
          beverageType: cleanName,
          timestamp
        });
      } catch (e) {
        console.error("Cloud water custom log error:", e);
      }
    }

    if (calories > 0) {
      const newMeal = {
        name: cleanName,
        category: 'مشروبات',
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fats: Math.round(fats * 10) / 10,
        timestamp
      };

      if (user.uid === 'local_guest_user') {
        try {
          const savedMeals = localStorage.getItem('local_diet_logs');
          const list = savedMeals ? JSON.parse(savedMeals) : [];
          list.unshift({ id: `local_${Date.now()}_diet`, ...newMeal });
          localStorage.setItem('local_diet_logs', JSON.stringify(list));
          window.dispatchEvent(new Event('localDietUpdated'));
        } catch (e) {
          console.error("Local meal error mapping custom beverage:", e);
        }
      } else {
        try {
          await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
        } catch (e) {
          console.error("Cloud meal mapping custom beverage error:", e);
        }
      }
    }
  };
  
  const handleDelete = async (id: string) => {
     if (!user) return;
     if (user.uid === 'local_guest_user') {
       try {
         const savedWater = localStorage.getItem('local_water_logs');
         if (savedWater) {
           let waterList = JSON.parse(savedWater);
           waterList = waterList.filter((log: any, idx: number) => (log.id || `local_water_${log.timestamp}_${idx}`) !== id);
           localStorage.setItem('local_water_logs', JSON.stringify(waterList));
           window.dispatchEvent(new Event('localWaterUpdated'));
         }
       } catch (e) {
         console.error("Local guest delete beverage error:", e);
       }
     } else {
       try {
           await deleteDoc(doc(db, 'users', user.uid, 'waterLogs', id));
       } catch (e) {
           handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/waterLogs`);
       }
     }
  };

  // Stats / Overloads scan
  const caffeineLogsCount = todayLogs.filter(log => log.beverageType === 'قهوة' || log.beverageType.includes('شاي')).length;
  const sugarLogsCount = todayLogs.filter(log => log.beverageType === 'عصير طبيعي' || log.beverageType === 'شاي (بسكر)').length;
  const loggedSodaToday = todayLogs.some(log => log.beverageType === 'مشروبات غازية');

  const handleSaveMugSettings = () => {
    const sizeVal = Number(tempMugSize) || 250;
    const nameVal = tempMugName.trim() || 'المج المخصص';
    localStorage.setItem('favorite_mug_size', String(sizeVal));
    localStorage.setItem('favorite_mug_name', nameVal);
    setFavoriteMugSize(sizeVal);
    setFavoriteMugName(nameVal);
    setShowMugEditor(false);
  };

  // Gap Detector (2 hours check)
  const hydrationGapMessage = useMemo(() => {
    if (todayLogs.length === 0) {
      const h = new Date().getHours();
      if (h > 9 && !isFastingMode) {
        return "صباح الجمال والنشاط! 🌅 لم ترشف أي مياه اليوم بعد. ابدأ بكوب كبير لتعويض فترات خمول الليل وتنشيط جهازك العصبي!";
      }
      return null;
    }
    const lastLog = todayLogs[0]; // Sorted desc
    const elapsedMs = Date.now() - lastLog.timestamp;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    if (elapsedHours >= 2 && !isFastingMode) {
      return `مرّت أكثر من ${Math.round(elapsedHours)} ساعات دون ارتواء! ⏳ جسمك يستغيث، اشرب كوباً الآن لتجنب تقلب المزاج وصداع العصر.`;
    }
    return null;
  }, [todayLogs, isFastingMode]);

  // Analytics Computation (Group logs by date)
  const statsData = useMemo(() => {
    const groups: { [key: string]: number } = {};
    logs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' });
      groups[dateStr] = (groups[dateStr] || 0) + log.effectiveAmount;
    });

    const dates = Object.keys(groups);
    const volumes = Object.values(groups);
    const average = volumes.length ? Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length) : 0;
    
    let bestDay = { date: '-', volume: 0 };
    let worstDay = { date: '-', volume: 99999 };

    dates.forEach(d => {
      const vol = groups[d];
      if (vol > bestDay.volume) {
        bestDay = { date: d, volume: vol };
      }
      if (vol < worstDay.volume) {
        worstDay = { date: d, volume: vol };
      }
    });

    if (worstDay.volume === 99999) worstDay.volume = 0;

    // Compile last 7 days chart array
    const chartArray = dates.slice(0, 7).reverse().map(d => ({
      date: d,
      volume: groups[d]
    }));

    return {
      average,
      chartArray,
      bestDay,
      worstDay,
      totalRecordedDays: dates.length
    };
  }, [logs]);

  // Advanced dehydration vs symptoms correlation logic
  const symptomCorrelationResult = useMemo(() => {
    if (symptomLogs.length === 0 || logs.length === 0) return null;

    // Group logs by exact ISO date string
    const waterByDateStr: { [key: string]: number } = {};
    logs.forEach(log => {
      const iso = new Date(log.timestamp).toISOString().split('T')[0];
      waterByDateStr[iso] = (waterByDateStr[iso] || 0) + log.effectiveAmount;
    });

    // Group symptom occurrences
    let lowWaterSymptomCounts: { [key: string]: number } = {};
    let lowWaterDaysCount = 0;

    symptomLogs.forEach(symptom => {
      const iso = new Date(symptom.timestamp).toISOString().split('T')[0];
      const waterTotal = waterByDateStr[iso] || 0;
      
      // If water is below 65% of standard weight (approx 1700 ml or below goal)
      if (waterTotal < 1800) {
        lowWaterDaysCount++;
        symptom.symptoms?.forEach((sym: string) => {
          lowWaterSymptomCounts[sym] = (lowWaterSymptomCounts[sym] || 0) + 1;
        });
      }
    });

    // Extract top symptom logged on dehydrated days
    const sortedSymptoms = Object.entries(lowWaterSymptomCounts).sort((a, b) => b[1] - a[1]);
    
    return {
      hasCorrelation: sortedSymptoms.length > 0,
      topSymptom: sortedSymptoms[0]?.[0] || null,
      occurrences: sortedSymptoms[0]?.[1] || 0,
    };
  }, [logs, symptomLogs]);

  return (
    <div className={cn("min-h-full pb-28 transition-colors duration-1000 text-right",
       isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-sky-50/50 dark:bg-sky-950 text-gray-900 dark:text-white"
    )}>
       {/* Header */}
       <div className="p-6 pt-10 flex justify-between items-center flex-row-reverse">
        <button onClick={() => navigate(-1)} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
           isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-sky-100 dark:border-white/5 text-gray-500"
        )}>
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex flex-row-reverse items-center gap-2">
            متابعة الماء <Droplet className="w-5 h-5 text-sky-500 animate-pulse" />
        </h1>
      </div>

      {/* Tabs Switcher */}
      <div className="px-6 mb-4">
        <div className="bg-gray-100 dark:bg-black/20 p-1 rounded-2xl flex gap-1" dir="rtl">
           <button 
             onClick={() => setActiveTab('today')}
             className={cn("flex-1 py-2.5 rounded-xl text-xs font-black transition-all", 
               activeTab === 'today' 
                 ? "bg-sky-500 text-white shadow-md shadow-sky-500/15" 
                 : "text-gray-400 hover:text-gray-600"
             )}
           >
             اليوم والارتواء 💧
           </button>
           <button 
             onClick={() => setActiveTab('reports')}
             className={cn("flex-1 py-2.5 rounded-xl text-xs font-black transition-all", 
               activeTab === 'reports' 
                 ? "bg-sky-500 text-white shadow-md shadow-sky-500/15" 
                 : "text-gray-400 hover:text-gray-600"
             )}
           >
             الإحصائيات والتحليلات 📈
           </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'today' ? (
          <motion.div 
            key="today-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 space-y-6"
          >
              {/* Confetti Visual Celebration */}
              {showCelebration && (
                <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
                   <div className="text-center space-y-3 p-6 rounded-3xl bg-white/90 dark:bg-[#222]/90 backdrop-blur-md shadow-2xl border border-sky-400 animate-bounce">
                      <Trophy className="w-16 h-16 text-amber-500 mx-auto animate-pulse" />
                      <h2 className="text-xl font-black text-sky-600">تهانينا! حققت هدفك اليوم 🌟</h2>
                      <p className="text-xs text-gray-500 font-bold">جسمك خلاياه مرتوية وقوية الآن!</p>
                   </div>
                   {/* Star floats */}
                   {[...Array(12)].map((_, i) => (
                     <motion.div
                       key={i}
                       initial={{ opacity: 1, y: 100, x: (i - 6) * 30 }}
                       animate={{ opacity: 0, y: -300, rotate: 360 }}
                       transition={{ duration: 4, ease: "easeOut", delay: i * 0.1 }}
                       className="absolute text-xl"
                     >
                       ✨
                     </motion.div>
                   ))}
                </div>
              )}

              {/* Reminders / Idle Gaps warning */}
              {hydrationGapMessage && (
                <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-right flex gap-3 flex-row-reverse items-start shadow-sm">
                   <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                   <div>
                     <h4 className="font-bold text-xs text-amber-900 dark:text-amber-400">تحذير الجفاف والتشتت الذهني! ⏱️</h4>
                     <p className="text-[10px] text-gray-600 dark:text-gray-300 font-bold mt-1 leading-relaxed">
                       {hydrationGapMessage}
                     </p>
                   </div>
                </div>
              )}

              {/* Smart Tip */}
              {percentage >= 100 ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-[24px] flex items-center gap-3 flex-row-reverse text-right">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-800/30 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                          <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">ممتاز! تجاوزت هدفك اليوم 🎉</h3>
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">الحفاظ على رطوبة الجسم رائع لبشرتك ومزاجك وكليتيك.</p>
                      </div>
                  </div>
              ) : percentage >= 50 ? (
                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 p-4 rounded-[24px] flex items-center gap-3 flex-row-reverse text-right">
                      <div className="w-10 h-10 bg-sky-100 dark:bg-sky-800/30 rounded-full flex items-center justify-center text-sky-500 shrink-0">
                          <Droplet className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-sky-800 dark:text-sky-400 text-sm">عاش! وصلت لنص الطريق 👏</h3>
                          <p className="text-xs text-sky-600 dark:text-sky-500 mt-0.5">أنت رائع، المتبقي قليل للحفاظ على خلايا رطبة وممتزة.</p>
                      </div>
                  </div>
              ) : isFastingMode ? (
                  <div className="bg-[#D4A373]/10 border border-[#D4A373]/30 p-4 rounded-[24px] flex items-center gap-3 flex-row-reverse text-right">
                      <div className="w-10 h-10 bg-[#D4A373]/20 rounded-full flex items-center justify-center text-[#D4A373] shrink-0">
                          <Activity className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-[#D4A373] text-sm">هدف الصيام مضبوط</h3>
                          <p className="text-[11px] text-[#D4A373]/80 mt-0.5">عوض النقص في الليل. استهلاك الماية تدريجياً ضروري.</p>
                      </div>
                  </div>
              ) : temperature !== null && temperature >= 25 ? (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-4 rounded-[24px] flex items-center gap-3 flex-row-reverse text-right">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-800/30 rounded-full flex items-center justify-center text-orange-500 shrink-0">
                          <ThermometerSun className="w-5 h-5" />
                      </div>
                      <div>
                          <h3 className="font-bold text-orange-800 dark:text-orange-400 text-sm">الجو حار النهارده 🥵</h3>
                          <p className="text-[11px] text-orange-600 dark:text-orange-500 mt-0.5">علشان الحرارة {Math.round(temperature)}°م، نزيد المقدار المستهدف بـ {tempExtra} مل تعويضاً عن التعرق الزائد.</p>
                      </div>
                  </div>
              ) : null}

              {/* Goal Modifiers Map */}
              <div className="flex gap-2 justify-end mb-2">
                  <button onClick={() => setIsWorkoutDay(!isWorkoutDay)} className={cn("px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex gap-2 items-center flex-row-reverse shadow-sm",
                      isWorkoutDay ? "bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-900/30 dark:border-rose-800" : "bg-white text-gray-400 border-gray-150 dark:bg-white/5 dark:border-white/10"
                  )}>
                      <Flame className="w-4 h-4" />
                      يوم مجهود رياضي / مشي طويل (+400 مل)
                  </button>
              </div>

              {/* Liquid Container Visual */}
              <div className="flex flex-col items-center justify-center py-6 relative">
                 <div className="w-48 h-64 border-4 border-sky-150 dark:border-white/10 rounded-b-[40px] rounded-t-[10px] relative overflow-hidden backdrop-blur-md bg-white/30 dark:bg-white/5 shadow-inner">
                    <motion.div 
                       className={cn("absolute bottom-0 w-full rounded-b-[36px]",
                          isFastingMode ? "bg-gradient-to-t from-[#D4A373] to-[#D4A373]/60" : "bg-gradient-to-t from-sky-400 to-sky-350"
                       )}
                       initial={{ height: 0 }}
                       animate={{ height: `${percentage}%` }}
                       transition={{ type: 'spring', damping: 20, stiffness: 60 }}
                    />
                    
                    {/* Visual percentage text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center mix-blend-exclusion text-white pointer-events-none drop-shadow-md">
                       <span className="text-5xl font-black">{Math.round((currentWater/effectiveDailyGoal)*100)}%</span>
                       <span className="text-xs font-extrabold opacity-95 mt-1">{currentWater} / {effectiveDailyGoal} مل</span>
                    </div>
                 </div>
              </div>

              {/* Soda warning widget */}
              {loggedSodaToday && (
                <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/30 text-right flex gap-3 flex-row-reverse items-start">
                   <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                   <div>
                     <h4 className="font-bold text-xs text-rose-900 dark:text-rose-450">المشروبات الغازية تزيد العطش! ❌</h4>
                     <p className="text-[10px] text-gray-600 dark:text-gray-300 font-bold mt-1 leading-relaxed">
                       المشروبات الغازية لا تحتسب في الارتواء الذكي بل تساهم في تهيج جدران الكلى وسحب الماء من أنسجتك لطرد السكريات والمحليات الزائدة. يُفضل دائماً استبدالها بماء أو عصائر نقية.
                     </p>
                   </div>
                </div>
              )}

              {/* ☕ Caffeine & Sugar Overload Dynamic Warning Widgets */}
              {caffeineLogsCount >= 3 && (
                <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/30 text-right flex gap-3 flex-row-reverse items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-400">تنبيه لامتصاص الماية من الكافيين ☕</h4>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 font-bold mt-1 leading-relaxed">
                      لقد شربت {caffeineLogsCount} مشروبات تحتوي على الكافيين حتى الآن. الكافيين مُدر للبول، ويقلل من فاعلية المياه في خلاياك. ننصحك بشرب أول كوب مياه نقي لتعويض الجفاف الإضافي.
                    </p>
                  </div>
                </div>
              )}

              {sugarLogsCount >= 2 && (
                <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/30 text-right flex gap-3 flex-row-reverse items-start">
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-rose-900 dark:text-rose-400">مؤشر المحتوى السكري للمشروبات مرتفع 🥤</h4>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 font-bold mt-1 leading-relaxed">
                      لقد استهلكت مشروبات وعصائر محلاة مكررة. السكريات تجعل الكلى تعمل على زيادة التبول لطرد الجلوكوز وتسبب عطشًا سريعًا. عد لشرب الماء العادي النقي.
                    </p>
                  </div>
                </div>
              )}

              {/* ⏱️ Hydration Distribution Advisor Widget */}
              {isFastingMode ? (
                <div className="bg-[#2D2824] border border-[#3D3834] p-5 rounded-[32px] text-right space-y-3">
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <Moon className="w-5 h-5 text-[#D4A373]" />
                    <h4 className="font-extrabold text-xs text-[#D4A373]">مرشد الترطيب الذكي في الصيام 🌙</h4>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold leading-normal">
                    توزيع كميات المياه بين الإفطار والسحور لتجنب جفاف الكلى والصداع النهاري:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-right">
                    <div className="p-2.5 bg-black/15 rounded-xl border border-[#3D3834] flex flex-col justify-between">
                      <p className="text-[9px] text-[#D4A373] font-bold">1. عند الإفطار 🕌</p>
                      <p className="text-[9px] text-gray-300 font-extrabold">كوب دافئ (٢٥٠ مل)</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">يفتح الهضم ويحفز الغدد اللعابية لتجهيز المعدة بأمان.</p>
                    </div>
                    <div className="p-2.5 bg-black/15 rounded-xl border border-[#3D3834] flex flex-col justify-between">
                      <p className="text-[9px] text-emerald-400 font-bold">2. بعد التراويح 📿</p>
                      <p className="text-[9px] text-gray-300 font-extrabold">كوبين (٥٠٠ مل)</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">يعوض فقد السوائل من المشي والحركة أثناء الصلاة الجماعية.</p>
                    </div>
                    <div className="p-2.5 bg-black/15 rounded-xl border border-[#3D3834] flex flex-col justify-between">
                      <p className="text-[9px] text-sky-400 font-bold">3. منتصف الليل 🌃</p>
                      <p className="text-[9px] text-gray-300 font-extrabold">كوبين (٥٠٠ مل)</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">يمنع تراكم الأملاح والرواسب في الحالبين والكلى أثناء النوم.</p>
                    </div>
                    <div className="p-2.5 bg-black/15 rounded-xl border border-[#3D3834] flex flex-col justify-between">
                      <p className="text-[9px] text-amber-400 font-bold">4. السحور الاستراتيجي 🍞</p>
                      <p className="text-[9px] text-gray-300 font-extrabold">كوبين متباعدين</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">اشربهما على جرعات متباعدة لمنع تصريف الكلية للماء فوراً بالصباح.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-800 p-5 rounded-[32px] text-right space-y-3">
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <Sparkles className="w-5 h-5 text-sky-600 dark:text-sky-450" />
                    <h4 className="font-extrabold text-xs text-sky-800 dark:text-sky-300">خارطة التوزيع السليم لكاساتك اليـوم ⏱️</h4>
                  </div>
                  <p className="text-[10px] text-gray-500 font-bold leading-normal">
                    وزع المياه بذكاء على مدار اليوم لضمان امتصاص مثالي دون عناء وضغط على الكلى والتأثر المباشر:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-right">
                    <div className="p-2.5 bg-white dark:bg-black/20 rounded-xl border border-sky-100/30 flex flex-col justify-between h-28">
                      <p className="text-[9px] text-amber-600 font-extrabold">الصباح الباكر 🌅</p>
                      <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300 leading-tight">كوبان دافئان فور الاستيقاظ</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">ينشط القولون ويطهر مجرى البول بعد خمول الليل.</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-black/20 rounded-xl border border-sky-100/30 flex flex-col justify-between h-28">
                      <p className="text-[9px] text-sky-600 font-extrabold">أوقات العمل 🏢</p>
                      <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300 leading-tight">رشفة كل ساعة (١٥٠ مل)</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">يضمن مرونة فكرية للذاكرة ويمنع الصداع المفاجئ لقلة المياه.</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-black/20 rounded-xl border border-sky-100/30 flex flex-col justify-between h-28">
                      <p className="text-[9px] text-[#D4A373] font-extrabold">مباعدة الوجبات 🍽️</p>
                      <p className="text-[9px] font-bold text-gray-700 dark:text-gray-300 leading-tight">نصف ساعة قبل الأكل</p>
                      <p className="text-[8px] text-gray-400 leading-normal mt-1">يهيئ الأنزيمات ولا يخفف حمض المعدة الهاضم بالكامل.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Beverage Type Selection */}
              <div className="text-right">
                  <h3 className="font-bold text-sm mb-3">بتشرب إيه؟ نوع السائل بيفرق!</h3>
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 flex-row-reverse">
                      {BEVERAGE_TYPES.map(bev => (
                          <button 
                             key={bev.name}
                             onClick={() => setSelectedBeverage(bev)}
                             className={cn("px-4 py-3 rounded-2xl flex items-center gap-2 flex-row-reverse transition-all whitespace-nowrap border-2",
                                selectedBeverage.name === bev.name 
                                    ? `${bev.bg} border-sky-400 dark:border-sky-500` 
                                    : "bg-white dark:bg-white/5 border-transparent text-gray-500"
                             )}
                          >
                              <bev.icon className={cn("w-5 h-5", selectedBeverage.name === bev.name ? bev.color : "")} />
                              <div className="text-right">
                                  <p className="text-xs font-bold">{bev.name}</p>
                                  <p className="text-[10px] opacity-85">
                                    {bev.factor === 0 ? "لا يُرطب الكلى ❌" : `الترطيب الفعلي: ${Math.round(bev.factor * 100)}%`}
                                  </p>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>

              {/* Personal Cup Settings Panel */}
              <div className="bg-white dark:bg-[#1C1F21] rounded-[28px] border border-sky-100/30 dark:border-white/5 p-4 text-right shadow-sm">
                 <div className="flex justify-between items-center mb-3 flex-row-reverse">
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                       <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                       <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">ميزة المج المعياري المفضل لديك</h3>
                    </div>
                    <button 
                       onClick={() => {
                         setTempMugSize(String(favoriteMugSize));
                         setTempMugName(favoriteMugName);
                         setShowMugEditor(!showMugEditor);
                       }}
                       className="text-xs font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-1"
                    >
                       <Settings className="w-3.5 h-3.5" /> ضبط الإعدادات
                    </button>
                 </div>

                 <AnimatePresence>
                    {showMugEditor && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden border-t border-gray-100 dark:border-white/5 pt-3 mt-3 space-y-3"
                       >
                          <div className="grid grid-cols-2 gap-3" dir="rtl">
                             <div>
                                <label className="text-[9px] text-gray-400 block mb-1">اسم المج أو الكوب</label>
                                <input 
                                  type="text" 
                                  value={tempMugName}
                                  onChange={(e) => setTempMugName(e.target.value)}
                                  className="w-full h-10 px-3 bg-gray-50 dark:bg-black/15 rounded-xl text-xs font-bold border-none text-right"
                                />
                             </div>
                             <div>
                                <label className="text-[9px] text-gray-400 block mb-1">الحجم بالمليلتر</label>
                                <input 
                                  type="number" 
                                  value={tempMugSize}
                                  onChange={(e) => setTempMugSize(e.target.value)}
                                  className="w-full h-10 px-3 bg-gray-50 dark:bg-black/15 rounded-xl text-xs font-bold border-none text-right"
                                />
                             </div>
                          </div>
                          <div className="flex gap-2">
                             <button 
                                onClick={handleSaveMugSettings}
                                className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[10px] px-4 py-2 rounded-xl"
                             >
                                حفظ وحفظ دائم
                             </button>
                             <button 
                                onClick={() => setShowMugEditor(false)}
                                className="text-gray-400 text-[10px] font-bold px-3 py-2"
                             >
                                تجاهل
                             </button>
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>

                 {!showMugEditor && (
                    <p className="text-[10px] text-gray-400 leading-normal">
                       تذكير مفيد: اضبط الكوب المفضل لديك للكبس بضغطة واحدة من القائمة لإضافة رطوبتك بسرعة. حالياً: <span className="text-gray-600 dark:text-gray-300 font-extrabold">{favoriteMugName} ({favoriteMugSize} مل)</span>
                    </p>
                 )}
              </div>

              {/* Quick Add Buttons */}
              <div className="text-right mt-6">
                  <h3 className="font-bold text-sm mb-3">أضف مشروبك سريعاً</h3>
                  {!isCustomMode ? (
                     <div className="grid grid-cols-3 gap-2" dir="rtl">
                          {/* Pinned custom beverage quick action */}
                          {pinnedWaterConfig && (
                             <button
                               onClick={() => handleLogDrinkFromModal(
                                  pinnedWaterConfig.ml,
                                  pinnedWaterConfig.displayName,
                                  pinnedWaterConfig.effectiveHydration / pinnedWaterConfig.ml,
                                  pinnedWaterConfig.totalCalories,
                                  0, // carbs
                                  0, // protein
                                  0  // fats
                               )}
                               className="col-span-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border border-amber-300 dark:border-amber-800/60 rounded-2xl p-3 flex items-center justify-between gap-2 active:scale-95 transition-all shadow-md text-white shrink-0 cursor-pointer text-right flex-row-reverse"
                             >
                                <div className="flex items-center gap-2 flex-row-reverse text-right">
                                   <Star className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse shrink-0" />
                                   <div className="text-right">
                                      <p className="text-[9px] font-black text-amber-100 leading-none mb-0.5">مشروبك السريع المثبّت 📌</p>
                                      <p className="text-xs font-black leading-tight truncate max-w-[190px] text-right">{pinnedWaterConfig.beverageName}</p>
                                   </div>
                                </div>
                                <span className="text-[10.5px] font-black bg-white/25 px-2.5 py-1 rounded-xl shrink-0 font-mono">
                                   +{pinnedWaterConfig.ml} مل
                                </span>
                             </button>
                          )}

                          {/* One tap to log custom Mug */}
                          <button 
                            onClick={() => addBeverage(favoriteMugSize, favoriteMugName)} 
                            className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm hover:border-amber-400"
                          >
                              <Coffee className="w-5 h-5 text-amber-500 animate-bounce" />
                              <span className="text-[10px] font-black">{favoriteMugSize} مل<br/>
                                 <span className="text-[8px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-full block">{favoriteMugName}</span>
                              </span>
                          </button>

                          <button onClick={() => addBeverage(200, 'كوب صغير')} className="bg-white dark:bg-white/5 border border-sky-100 dark:border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm hover:border-sky-300">
                              <GlassWater className="w-5 h-5 text-sky-400" />
                              <span className="text-[10px] font-bold">٢٠٠ مل<br/><span className="text-[9px] text-gray-400 font-normal">كوب صغير</span></span>
                          </button>

                          <button onClick={() => addBeverage(350, 'كوب كبير')} className="bg-white dark:bg-white/5 border border-sky-100 dark:border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm hover:border-sky-300">
                              <Droplet className="w-5 h-5 text-sky-450" />
                              <span className="text-[10px] font-bold">٣٥٠ مل<br/><span className="text-[9px] text-gray-400 font-normal">كوب كبير</span></span>
                          </button>

                          <button onClick={() => addBeverage(500, 'زجاجة')} className="bg-white dark:bg-white/5 border border-sky-100 dark:border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm hover:border-sky-300">
                              <Droplet className="w-6 h-6 text-sky-500" />
                              <span className="text-[10px] font-bold">٥٠٠ مل<br/><span className="text-[9px] text-gray-400 font-normal">مياه</span></span>
                          </button>

                          {/* New Thermos 1L preset! */}
                          <button onClick={() => addBeverage(1000, 'ترمس كبير')} className="bg-white dark:bg-white/5 border border-sky-100 dark:border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm hover:border-sky-350">
                              <Activity className="w-6 h-6 text-indigo-500" />
                              <span className="text-[10px] font-bold">١٠٠٠ مل<br/><span className="text-[9px] text-gray-400 font-normal">ترمس لتر كامل</span></span>
                          </button>

                          <button onClick={() => setIsDrinkCreatorOpen(true)} className="bg-sky-50 dark:bg-sky-900/20 text-[#E07A5F] border border-dashed border-[#E07A5F]/40 rounded-2xl flex items-center justify-center active:scale-95 transition-all flex-col shadow-sm cursor-pointer">
                              <Coffee className="w-6 h-6 mb-0.5 animate-pulse text-[#E07A5F]" />
                              <span className="text-[10px] font-black">ميكسر المشروبات 🥤</span>
                          </button>
                     </div>
                  ) : (
                     <div className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-sky-100 dark:border-white/10 flex flex-col gap-4 shadow-sm" dir="rtl">
                          <div className="flex justify-between items-center text-sm font-bold">
                              <span>كمية مخصصة (مليلتر)</span>
                              <button onClick={() => setIsCustomMode(false)} className="text-gray-400 text-xs">إلغاء</button>
                          </div>
                          <input 
                             type="number"
                             value={customAmount}
                             onChange={(e) => setCustomAmount(e.target.value)}
                             className="w-full h-14 bg-gray-50 dark:bg-black/20 rounded-2xl text-center font-bold text-lg border-none focus:ring-2 focus:ring-sky-200"
                          />
                          <button 
                             onClick={() => addBeverage(Number(customAmount) || 250, 'مخصص')}
                             className="w-full h-14 bg-sky-500 text-white rounded-[20px] font-bold text-sm shadow-xl shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                             <Plus className="w-5 h-5" /> إضافة
                          </button>
                     </div>
                  )}
              </div>

              <div className="h-px bg-gray-200 dark:bg-white/10 w-full my-6"></div>

              {/* Today's Log Timeline */}
              <div className="text-right">
                  <h3 className="font-bold text-sm mb-4">سجل الارتواء اليومي (بالتفصيل)</h3>
                  {loading ? (
                      <p className="text-xs text-gray-400 text-center">جاري التحميل والتعبئة...</p>
                  ) : todayLogs.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">لم تقم بتسجيل أي كاسات اليوم بعد.</p>
                  ) : (
                      <div className="space-y-3 relative before:absolute before:right-[15px] before:top-4 before:bottom-4 before:w-0.5 before:bg-gray-100 dark:before:bg-white/5">
                          {todayLogs.map((log, idx) => {
                              const dt = new Date(log.timestamp);
                              const iconEl = BEVERAGE_TYPES.find(b => b.name === log.beverageType)?.icon || Droplet;
                              return (
                                  <div key={`${log.id || idx}-${idx}`} className="relative flex items-center justify-end gap-4 pl-4 pr-1">
                                      <div className="flex-1 bg-white dark:bg-white/5 p-3 rounded-2xl shadow-sm border border-gray-50 dark:border-white/5 text-right relative flex items-center justify-between flex-row-reverse">
                                          <div className="flex items-center gap-3 flex-row-reverse">
                                              <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-500 flex items-center justify-center shrink-0">
                                                  {React.createElement(iconEl, { className: "w-4 h-4" })}
                                              </div>
                                              <div>
                                                  <p className="font-bold text-sm">{log.amount} مل</p>
                                                  <p className="text-[10px] text-gray-500">{log.beverageType} • {log.context}</p>
                                              </div>
                                          </div>
                                          <div className="flex flex-col items-center gap-2">
                                              <span className="text-[10px] font-bold text-gray-400">{dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                              <button onClick={() => handleDelete(log.id)} className="text-xs text-rose-300 hover:text-rose-500 font-bold transition-colors">حذف</button>
                                          </div>
                                      </div>
                                      <div className="w-8 h-8 bg-white dark:bg-[#1A1A1A] rounded-full border-4 border-sky-100 dark:border-sky-900/30 z-10 shrink-0 flex items-center justify-center">
                                          <div className="w-2 h-2 bg-sky-500 rounded-full" />
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </div>
          </motion.div>
        ) : (
          <motion.div 
            key="reports-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-6 space-y-6"
            dir="rtl"
          >
             {/* Report Cards grid */}
             <div className="grid grid-cols-2 gap-3 text-right">
                <div className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-sky-100/30 dark:border-white/5">
                   <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-sky-500" />
                      <span className="text-[10px] font-bold text-gray-400">المتوسط اليومي</span>
                   </div>
                   <h3 className="text-xl font-black text-sky-600 dark:text-sky-400">{statsData.average} مل</h3>
                   <p className="text-[9px] text-gray-450 mt-1">المعدل المحسوب للترطيب اليومي لجميع الأيام السابقة.</p>
                </div>
                
                <div className="bg-white dark:bg-white/5 p-4 rounded-3xl border border-sky-100/30 dark:border-white/5">
                   <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold text-gray-400">أفضل أرقامك</span>
                   </div>
                   <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400">{statsData.bestDay.volume} مل</h3>
                   <p className="text-[9px] text-gray-450 mt-1">تاريخ: {statsData.bestDay.date || 'اليوم'}</p>
                </div>
             </div>

             {/* Chart Trends Visual representation (Bento stylized timeline) */}
             <div className="bg-white dark:bg-[#1A1E20] p-5 rounded-[32px] border border-sky-100/45 dark:border-white/5 space-y-4">
                <div className="flex justify-between items-center flex-row-reverse">
                   <span className="text-[10px] text-gray-400 font-bold">خطوات امتلاء الخلايا وارتوائها</span>
                   <h3 className="font-black text-xs text-gray-700 dark:text-gray-300">مخطط الشرب الأخير</h3>
                </div>
                
                {statsData.chartArray.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">لا توجد بيانات كافية لرسم المخطط بعد.</p>
                ) : (
                  <div className="space-y-3 pt-2">
                     {statsData.chartArray.map((item, idx) => {
                       const barPercentage = Math.min((item.volume / effectiveDailyGoal) * 100, 100);
                       return (
                          <div key={idx} className="space-y-1">
                             <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-gray-600 dark:text-gray-300">{item.date}</span>
                                <span className="text-sky-500">{item.volume} مل ({Math.round(barPercentage)}%)</span>
                             </div>
                             <div className="h-2.5 w-full bg-gray-150 dark:bg-black/25 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${barPercentage}%` }}
                                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                                  className={cn("h-full rounded-full", barPercentage >= 100 ? "bg-emerald-550" : "bg-sky-500")}
                                />
                             </div>
                          </div>
                       )
                     })}
                  </div>
                )}
             </div>

             {/* Dehydration & Symptom Intelligent correlation widget */}
             {symptomCorrelationResult && symptomCorrelationResult.hasCorrelation ? (
               <div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-[#1A1A1A] rounded-[32px] border border-rose-100 dark:border-rose-900/30 p-5 space-y-3">
                  <div className="flex gap-2 items-center">
                     <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
                     <h3 className="font-extrabold text-xs text-rose-800 dark:text-rose-400">ملاحظ ذكاء الارتباط بين الارتواء والألم 🔍</h3>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                     {profile.gender === 'female' ? (
                        <>نلاحظ من تحليلاتنا لملفاتك الحيوية والعاطفية أنه في الأيام التي قلّ فيها شربكِ للماء عن <span className="text-rose-600 font-black">١٨٠٠ مل</span>، قمتِ بتسجيل عَرَض <span className="text-rose-600 font-black">({symptomCorrelationResult.topSymptom})</span> بمعدل <span className="font-black">{symptomCorrelationResult.occurrences} مرات</span>.</>
                      ) : (
                        <>نلاحظ من تحليلاتنا لملفاتكَ الحيوية والرياضية أنه في الأيام التي قلّ فيها شربكَ للماء عن <span className="text-rose-600 font-black">١٨٠٠ مل</span>، قمتَ بتسجيل عَرَض <span className="text-rose-600 font-black">({symptomCorrelationResult.topSymptom})</span> بمعدل <span className="font-black">{symptomCorrelationResult.occurrences} مرات</span>.</>
                      )}
                  </p>
                  <div className="p-3 bg-white/50 dark:bg-black/15 rounded-2xl text-[10px] text-gray-500 font-bold leading-relaxed border border-rose-50">
                     💡 <span className="text-rose-700 dark:text-rose-450">
                        {profile.gender === 'female' ? "نصيحة طبيبتكِ الرقمية:" : "نصيحة طبيبكَ الرقمي:"}
                     </span> {profile.gender === 'female'
                        ? "نقص المياه يقلل من سماكة بطانة السائل الدماغي النخاعي ويسبب تهيج الشرايين، مما يزيد الصداع بشكل فوري! اجعلي هدف اليوم خط أحمر."
                        : "نقص المياه يقلل من سماكة بطانة السائل الدماغي النخاعي ويسبب تهيج الشرايين، مما يزيد الصداع بشكل فوري! اجعل هدف اليوم خط أحمر."
                     }
                  </div>
               </div>
             ) : (
                <div className="bg-sky-50/40 dark:bg-sky-950/10 rounded-[32px] p-5 border border-dashed border-sky-100 text-center space-y-2">
                   <Sparkles className="w-6 h-6 text-sky-400 mx-auto" />
                   <h4 className="text-xs font-bold text-sky-800 dark:text-sky-300">مساعد الارتباط الذكي (مصحح الطاقة)</h4>
                   <p className="text-[10px] text-gray-500 leading-normal">
                      قم بتسجيل أعراض يومك باستمرار في "متابعة الأعراض" لنقوم بربط مستويات جفافك بطاقتك وصداع الخلايا بدقة تامة وتوفير تذكيرات مخصصة لك.
                   </p>
                </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>

      <DrinkBuilderModal
        isOpen={isDrinkCreatorOpen}
        onClose={() => setIsDrinkCreatorOpen(false)}
        onLogDrink={handleLogDrinkFromModal}
      />
    </div>
  );
}
