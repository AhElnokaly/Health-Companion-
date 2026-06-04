import { 
  Bell, Search, Plus, AlertCircle, Users, Check, Pill, ClipboardList, 
  ShoppingCart, Archive, Info, Share2, MessageCircle, Plane, Clock, 
  CheckCircle2, AlertTriangle, ShieldAlert, Heart, CalendarCheck, HelpCircle, ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, increment, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { ExpandableCard } from '../components/ExpandableCard';

interface Medication {
  id: string;
  name: string;
  scientificName?: string;
  dosage: number | null;
  form: string;
  instruction: string;
  inventory: number | null;
  type: string;
  maxInventory?: number;
  frequencyPerDay?: number | null;
  duration?: string;
  durationDays?: number | null;
  autoAddShoppingList?: boolean;
  forWho?: string;
  isCritical?: boolean;
  alarmTimes?: string[];
  warnings?: {
      level: 'yellow' | 'orange' | 'red';
      title: string;
      desc: string;
  }[];
}

const OFFLINE_INTERACTION_RULES = [
  { match1: 'warfarin', match2: 'aspirin', level: 'red', title: 'خطر نزيف حاد (مميت)', desc: 'الأسبرين والوارفارين يزيدان سيولة الدم بشكل مفرط مما يعرضك للنزيف الداخلي الحاد.' },
  { match1: 'warfarin', match2: 'panadol', level: 'yellow', title: 'زيادة طفيفة في السيولة', desc: 'الجرعات الكبيرة والمتكررة من الباراسيتامول مع الوارفارين قد ترفع زمن السيولة، يرجى فحص السيولة دورياً.' },
  { match1: 'panadol', match2: 'paracetamol', level: 'orange', title: 'تكرار نفس المادة الفعالة', desc: 'كلاهما يحتوي على الباراسيتامول، تجنب تناولهما معاً لمنع التسمم الكبدي أو تشبّع الجرعة.' },
  { match1: 'concor', match2: 'capoten', level: 'red', title: 'هبوط ضغط حاد خطير', desc: 'الكونكور والكابوتن يؤديان لخفض ضغط الدم بطرق متقاطعة، الجمع بينهما بدون توقيت متباعد قد يؤدي لهبوط حاد ودوار مفرط.' },
  { match1: 'concor', match2: 'diovan', level: 'orange', title: 'هبوط نبض وضغط الدم', desc: 'قد يؤدي الجمع إلى انخفاض معدل نبض القلب وضغط الشرايين بشكل ملحوظ.' },
  { match1: 'aspirin', match2: 'ibuprofen', level: 'orange', title: 'قرحة ونزيف المعدة', desc: 'مزيجهما يتسبب في تهيج جدار المعدة ويرفع احتمالية الإصابة بقرحة نازفة.' }
];

const MOCK_MEDS: Medication[] = [
  { 
      id: 'm1', name: 'Warfarin', scientificName: 'Warfarin Sodium', dosage: 5, form: 'قرص', instruction: 'مساءً', inventory: 15, type: 'other', maxInventory: 30, frequencyPerDay: 1, isCritical: true, alarmTimes: ['20:00'],
      warnings: [
          { level: 'red', title: 'خطر تعارض مع الأكل', desc: 'تجنب الخضروات الورقية (السبانخ، الملوخية) لاحتوائها على فيتامين K' }
       ]
  },
  { 
      id: 'm2', name: 'Aspirin Cardio', scientificName: 'Acetylsalicylic acid', dosage: 81, form: 'قرص', instruction: 'بعد الغداء', inventory: 8, type: 'other', maxInventory: 28, frequencyPerDay: 1, isCritical: true, alarmTimes: ['14:00'],
      warnings: [
          { level: 'orange', title: 'تنبيه المعدة', desc: 'يُفضل خذه ممتداً بوسط الوجبة لحماية جدار المعدة من تهيجات البروستاجلاندين' }
      ]
  },
  { 
      id: 'm3', name: 'Panadol Extra', dosage: 500, form: 'قرص', instruction: 'عند اللزوم', inventory: 60, type: 'painkiller', maxInventory: 60, frequencyPerDay: null,
      warnings: [
          { level: 'yellow', title: 'تنبيه الكافيين', desc: 'يحتوي على الكافيين، قد يسبب الأرق إذا تم تناوله قبل النوم بمقدار قليل' }
      ]
  }
];

export default function Medications() {
  const { user } = useAuth();
  const { isFastingMode, profile } = useAppContext();
  
  const [medications, setMedications] = useState<Medication[]>(MOCK_MEDS);
  const [familyMembers, setFamilyMembers] = useState<{id: string, name: string}[]>([]);
  const [medLogs, setMedLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('النهاردة');
  const [selectedPerson, setSelectedPerson] = useState(''); // '' means self
  const [searchTerm, setSearchTerm] = useState('');

  // Travel Mode State
  const [isTravelMode, setIsTravelMode] = useState(false);
  const [travelDays, setTravelDays] = useState('7');

  // Multi-Dose Confirmation Dialog
  const [showTakeDialog, setShowTakeDialog] = useState(false);
  const [selectedMedForLog, setSelectedMedForLog] = useState<Medication | null>(null);
  const [takeStatus, setTakeStatus] = useState<'on_time' | 'late' | 'skipped'>('on_time');
  const [lateMinutes, setLateMinutes] = useState('30');
  const [customLogNotes, setCustomLogNotes] = useState('');

  // Whatsapp and contact variables
  const [isFasting, setIsFasting] = useState(isFastingMode);

  // --- +++ أضيف بناءً على طلبك - مولد صوت رنان ومؤشرات تنبيهات مرتبطة بوقت وجرعة الأدوية بذكاء واشعار مستقل +++ ---
  const [activeAlarm, setActiveAlarm] = useState<{ med: Medication; time: string } | null>(null);
  const [triggeredAlarms, setTriggeredAlarms] = useState<string[]>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`local_triggered_alarms_${todayStr}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const playActiveAlarmTone = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // سلسلة من الرنات المتكررة لإلغاء تفويت الجرعة بوعي هادئ
      let nowTime = ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc1.type = 'sine';
        osc2.type = 'triangle';
        
        // ترددات طبية لطيفة وغير مخرشة للأذن (بيانو رقمي نغمات نقية ومتناغمة)
        osc1.frequency.setValueAtTime(523.25, nowTime); 
        osc2.frequency.setValueAtTime(659.25, nowTime); 
        
        gain.gain.setValueAtTime(0, nowTime);
        gain.gain.linearRampToValueAtTime(0.20, nowTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.35);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start(nowTime);
        osc2.start(nowTime);
        osc1.stop(nowTime + 0.4);
        osc2.stop(nowTime + 0.4);
        
        nowTime += 0.55;
      }
    } catch (e) {
      console.warn("Audio Context automatic playback restriction. Needs user interaction:", e);
    }
  };

  useEffect(() => {
    // طلب صلاحيات الإشعارات تلقائياً للتنبيه بسلامة
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0];

      // فحص أوقات الأدوية
      medications.forEach(med => {
        if (med.alarmTimes && med.alarmTimes.includes(currentHourMin)) {
          const alarmKey = `${med.id}_${currentHourMin}`;
          
          if (!triggeredAlarms.includes(alarmKey)) {
            // تفعيل التنبيه المرئي
            setActiveAlarm({ med, time: currentHourMin });
            
            // إرسال إشعار المتصفح/النظام
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`⏱️ منبه الدواء الذكي: ${med.name}`, {
                  body: `حان الآن موعد أخذ جرعة ${med.name} (${med.instruction || 'بانتظام'}). تفادياً لأي طارئ صحي!`,
                  tag: alarmKey,
                  requireInteraction: true
                });
              } catch (err) {
                console.warn(err);
              }
            }

            // إطلاق منبه الصوت
            playActiveAlarmTone();

            // حفظ الحالة لمنع التكرار
            setTriggeredAlarms(prev => {
              const updated = [...prev, alarmKey];
              localStorage.setItem(`local_triggered_alarms_${todayStr}`, JSON.stringify(updated));
              return updated;
            });
          }
        }
      });
    }, 10000); // الفحص المكثف الكفؤ كل ١٠ ثواني

    return () => clearInterval(checkInterval);
  }, [medications, triggeredAlarms]);
  // ------------------------------------------------------------------------------------------------------

  useEffect(() => {
    setIsFasting(isFastingMode);
  }, [isFastingMode]);

  useEffect(() => {
    if (!user) return;
    
    // Medications Listener
    const qMeds = query(collection(db, 'users', user.uid, 'medications'));
    const unsubscribeMeds = onSnapshot(qMeds, (snapshot) => {
      const loaded: Medication[] = [];
      snapshot.forEach(doc => {
         loaded.push({ id: doc.id, ...doc.data() } as Medication);
      });
      // Fallback to beautiful default mock if database is completely empty so user experiences features
      setMedications(loaded.length > 0 ? loaded : MOCK_MEDS);
      setLoading(false);
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, `users/${user.uid}/medications`);
       setLoading(false);
    });

    // Family Listener
    const qFamily = query(collection(db, 'users', user.uid, 'family_members'));
    const unsubscribeFamily = onSnapshot(qFamily, (snapshot) => {
      const mems: {id: string, name: string}[] = [];
      snapshot.forEach(doc => {
        mems.push({ id: doc.id, name: doc.data().name });
      });
      setFamilyMembers(mems);
    });

    // Dose logs listener for today
    const qLogs = query(collection(db, 'users', user.uid, 'medication_logs'));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logs: any[] = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      setMedLogs(logs);
    });

    return () => {
       unsubscribeMeds();
       unsubscribeFamily();
       unsubscribeLogs();
    };
  }, [user]);

  // Offline Interaction Checker
  const activeInteractions = React.useMemo(() => {
    const list: {med1: string, med2: string, level: 'yellow' | 'orange' | 'red', title: string, desc: string}[] = [];
    const lowerNames = medications.map(m => ({ id: m.id, name: m.name.toLowerCase() }));
    
    // Check all combinations
    for (let i = 0; i < lowerNames.length; i++) {
      for (let j = i + 1; j < lowerNames.length; j++) {
        const n1 = lowerNames[i].name;
        const n2 = lowerNames[j].name;
        
        OFFLINE_INTERACTION_RULES.forEach(r => {
           if (
             (n1.includes(r.match1) && n2.includes(r.match2)) ||
             (n2.includes(r.match1) && n1.includes(r.match2))
           ) {
              list.push({
                med1: medications[i].name,
                med2: medications[j].name,
                level: r.level as any,
                title: r.title,
                desc: r.desc
              });
           }
        });
      }
    }
    return list;
  }, [medications]);

  const tabs = [
    { name: 'النهاردة', icon: ClipboardList },
    { name: 'كل الأدوية', icon: Archive },
    { name: 'خلصت', icon: AlertCircle },
    { name: 'عايزين نشتريها', icon: ShoppingCart },
  ];

  const handleTakeMedicationClick = (med: Medication) => {
    setSelectedMedForLog(med);
    setTakeStatus('on_time');
    setLateMinutes('30');
    setCustomLogNotes('');
    setShowTakeDialog(true);
  };

  const handleConfirmTakeDose = async () => {
    if (!user || !selectedMedForLog) return;
    try {
      // Deduct inventory
      if (selectedMedForLog.inventory !== null && selectedMedForLog.inventory > 0) {
        // If from mock, update local state or firebase
        if (!selectedMedForLog.id.startsWith('m')) {
          await updateDoc(doc(db, 'users', user.uid, 'medications', selectedMedForLog.id), {
            inventory: increment(-1)
          });
        } else {
          // If mock update locally
          setMedications(prev => prev.map(m => m.id === selectedMedForLog.id ? {...m, inventory: Math.max(0, (m.inventory || 1) - 1)} : m));
        }
      }

      // Add to logs
      const logBody = {
        medicationId: selectedMedForLog.id,
        medicationName: selectedMedForLog.name,
        takenAt: Date.now(),
        status: takeStatus,
        delayMinutes: takeStatus === 'late' ? Number(lateMinutes) : 0,
        notes: customLogNotes,
        forWho: selectedMedForLog.forWho || ''
      };

      await addDoc(collection(db, 'users', user.uid, 'medication_logs'), logBody);
      setShowTakeDialog(false);
      setSelectedMedForLog(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/medications`);
    }
  };

  const handleRestockMedication = async (med: Medication) => {
    if (!user) return;
    const max = med.maxInventory || 30;
    try {
      if (!med.id.startsWith('m')) {
        await updateDoc(doc(db, 'users', user.uid, 'medications', med.id), {
          inventory: max
        });
      } else {
        setMedications(prev => prev.map(m => m.id === med.id ? {...m, inventory: max} : m));
      }
    } catch (err) {
       handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/medications`);
    }
  };

  // Create auto-generated shopping list text to send straight to Pharmacist or family on WhatsApp
  const handleShareMedicines = () => {
    const lowStock = medications.filter(m => m.inventory !== null && m.inventory <= 12);
    if (lowStock.length === 0) {
      alert("كل مخزون أدويتك ممتاز حالياً!");
      return;
    }
    const text = "من فضلكم، محتاج أطلب الأدوية دي من الصيدلية عاجلاً لتجنب نفاذ المخزون:\n" + 
      lowStock.map(m => `- ${m.name} (المخزون المتوفر: ${m.inventory} حبة فقط)`).join('\n') + 
      "\n\nمستخرج تلقائياً عبر صيدليتي الذكية.";
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Check if a medication has been taken today
  const hasTakenToday = (medId: string) => {
    const startOfDay = new Date().setHours(0,0,0,0);
    return medLogs.some(log => log.medicationId === medId && log.takenAt >= startOfDay && log.status !== 'skipped');
  };

  return (
    <div className={cn("min-h-full pb-32 transition-colors duration-1000 text-right",
       isFasting ? "bg-[#1A1A1A]" : "bg-[#F8F9FB] dark:bg-[#121415]"
    )}>
      {/* ✈️ Smart Header */}
      <div className={cn("px-6 pt-10 pb-6 rounded-b-[40px] shadow-sm mb-6", 
          isFasting ? "bg-[#2D2824] shadow-black/20" : "bg-white dark:bg-[#1A1A1A] border-b border-[#F0EBE1] dark:border-white/5"
      )}>
        <h1 className={cn("text-xl font-bold tracking-tight mb-4", isFasting ? "text-[#FDFBF7]" : "text-[#1A4D42] dark:text-white")}>الصيدلية المرافقة</h1>
        
        {/* Actions panel */}
        <div className="flex gap-3 mb-6 w-full justify-end flex-row-reverse" dir="rtl">
           <div className="flex-1 relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="ابحث بدقة في دواليب أدويتك..." 
                className={cn("w-full h-12 pr-10 pl-4 rounded-2xl border-none focus:ring-2 focus:ring-[#1A4D42] transition-all font-bold text-xs text-right shadow-sm",
                   isFasting ? "bg-black/20 text-white" : "bg-gray-50 border border-gray-100 dark:bg-white/5 text-gray-900 dark:text-white"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           
           <button 
             onClick={handleShareMedicines}
             title="مشاركة النواقص للطلب"
             className={cn("flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-sm shrink-0 border",
               isFasting ? "bg-black/20 border-white/5 text-gray-300" : "bg-[#25D366]/10 border-[#25D366]/20 hover:bg-[#25D366]/20 text-[#25D366]"
           )}>
              <Share2 className="w-5 h-5" />
           </button>

           <button 
             onClick={() => setIsTravelMode(true)}
             title="حساب سفر وحقيبة الأدوية"
             className={cn("flex items-center justify-center w-12 h-12 rounded-2xl transition-all shadow-sm shrink-0 border",
               isFasting ? "bg-black/20 border-white/5 text-gray-300" : "bg-sky-50 border-sky-100 hover:bg-sky-150 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300"
           )}>
              <Plane className="w-5 h-5" />
           </button>
        </div>

        {/* Family Filters ("دواء ماما اتخد؟" & Multi profiles Integration) */}
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide flex-row-reverse mb-6 items-center px-1" dir="rtl">
           <button 
              onClick={() => setSelectedPerson('')}
              className={cn("px-4 py-2 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border flex items-center gap-1.5 flex-row-reverse shadow-sm",
                 selectedPerson === '' ? "bg-[#1A4D42] text-white border-[#1A4D42]" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300"
              )}
           >
              <span>أدويتي</span>
           </button>
           {familyMembers.map(member => (
              <button 
                 key={member.id}
                 onClick={() => setSelectedPerson(member.id)}
                 className={cn("px-4 py-2 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border flex items-center gap-1.5 flex-row-reverse shadow-sm",
                    selectedPerson === member.id ? "bg-[#D4A373] text-white border-[#D4A373]" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300"
                 )}
              >
                 <span>علاج {member.name}</span>
              </button>
           ))}
        </div>

        {/* Main Tab navigation */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-row-reverse pb-1" dir="rtl">
           {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button 
                 key={tab.name}
                 onClick={() => setActiveTab(tab.name)}
                 className={cn(
                   "px-4 py-2.5 rounded-full font-bold text-xs whitespace-nowrap transition-all border flex items-center gap-1.5 flex-row-reverse",
                   activeTab === tab.name 
                     ? (isFasting ? "bg-[#D4A373] border-[#D4A373] text-white" : "bg-[#1A4D42] border-[#1A4D42] text-white shadow-md shadow-[#1A4D42]/20")
                     : "bg-transparent border-[#F0EBE1] dark:border-white/10 text-gray-500 hover:bg-[#FDFBF7] dark:hover:bg-white/5"
                 )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </button>
              );
           })}
        </div>
      </div>

      <div className="px-6 space-y-6">
         {/* ⚠️ Dynamic Drug-Drug Interaction Warning Widget */}
         {activeInteractions.length > 0 && activeTab === 'النهاردة' && (
            <div className="p-5 rounded-[28px] bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/30 text-right space-y-3">
               <div className="flex items-center gap-2 flex-row-reverse">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                  <h3 className="font-extrabold text-sm text-rose-700 dark:text-rose-400">تنبيه تعارض دوائي نشط! (ذكي ودون إنترنت)</h3>
               </div>
               <p className="text-[10px] text-rose-600 dark:text-rose-300 leading-relaxed font-bold">
                  اكتشفنا تعارضاً هاماً بين أدويتك النشطة المجدولة الحالية. يرجى مباعدة مواعيد الجرعات أو الرجوع لطبيبك:
               </p>
               <div className="space-y-2">
                  {activeInteractions.map((item, i) => (
                     <div key={i} className="bg-white/75 dark:bg-black/20 p-3 rounded-xl border border-rose-100 flex flex-col gap-1 text-right">
                        <div className="flex justify-between items-center flex-row-reverse font-bold text-xs text-rose-900 dark:text-rose-300">
                           <span className="flex items-center gap-1"><ArrowLeftRight className="w-3.5 h-3.5 text-rose-600" /> {item.med1} • {item.med2}</span>
                           <span className="text-[9px] bg-rose-600 text-white rounded-md px-1.5 py-0.5">{item.level === 'red' ? 'خطرة جداً 🔴' : 'انتبه 🟠'}</span>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-normal">{item.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* "دواء ماما اتخد؟" / Quick Family Summary Widget */}
         {activeTab === 'النهاردة' && familyMembers.length > 0 && selectedPerson === '' && (
            <div className="p-4 rounded-[28px] bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-950 text-right space-y-3 shadow-sm">
               <div className="flex justify-between items-center flex-row-reverse mb-1">
                  <div className="flex items-center gap-1.5 flex-row-reverse">
                     <Heart className="w-4 h-4 text-sky-600" />
                     <h3 className="font-bold text-xs text-sky-900 dark:text-sky-300">جرعات عائلتك اليوم 🩺</h3>
                  </div>
                  <span className="text-[9px] text-sky-500 font-bold">متابعة صامتة آمنة</span>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  {medications.filter(m => m.forWho && m.isCritical).map(fMed => {
                     const taken = hasTakenToday(fMed.id);
                     const fName = familyMembers.find(fm => fm.id === fMed.forWho)?.name || "العائلة";
                     return (
                        <div key={fMed.id} className="bg-white/85 dark:bg-black/30 p-3 rounded-2xl border border-sky-100/50 text-right flex flex-col justify-between h-20">
                           <p className="text-[9px] text-gray-400 font-bold">{fName}</p>
                           <p className="font-bold text-xs truncate mb-1">{fMed.name}</p>
                           <div className="flex justify-between items-center flex-row-reverse">
                              <span className={cn("text-[8px] px-1.5 py-0.5 rounded-md font-bold", taken ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 animate-pulse")}>
                                 {taken ? 'تنـاوله' : 'لـم يؤخـذ بعد'}
                              </span>
                              {!taken && (
                                 <button 
                                   onClick={() => handleTakeMedicationClick(fMed)}
                                   className="text-[8px] bg-sky-600 text-white px-2 py-0.5 rounded-lg font-bold"
                                 >
                                    أكـد لـه
                                 </button>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         )}

         {/* Listed Medications Cards Grid */}
         <div className="space-y-4">
            {loading ? (
                <div className="py-20 flex justify-center">
                   <div className="w-8 h-8 border-4 border-[#1A4D42] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : medications.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#1A1A1A] rounded-[36px] border border-dashed border-[#F0EBE1] flex flex-col items-center">
                   <Pill className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                   <p className="text-sm font-bold text-gray-400">لا يوجد أدوية مسجلة حالياً</p>
                </div>
            ) : (() => {
                const searchLower = searchTerm.toLowerCase();
                const filtered = medications
                  .filter(med => {
                     // Filter by selected family member
                     if (selectedPerson === '') {
                        return !med.forWho;
                     } else {
                        return med.forWho === selectedPerson;
                     }
                  })
                  .filter(med => {
                     // Filter by search bar query
                     return med.name.toLowerCase().includes(searchLower) || (med.scientificName || '').toLowerCase().includes(searchLower);
                  })
                  .filter(med => {
                     // Filter by active Tab state
                     if (activeTab === 'خلصت') {
                        return med.inventory !== null && med.inventory <= 0;
                     }
                     if (activeTab === 'عايزين نشتريها') {
                        return med.inventory !== null && med.inventory <= 12; // Out of stock or low stock items
                     }
                     return true;
                  });

                if (filtered.length === 0) {
                    return (
                        <div className="text-center py-16 bg-white dark:bg-[#1A1A1A] rounded-[36px] border border-dashed border-gray-100 dark:border-white/5">
                           <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                           <p className="text-xs text-gray-400 font-bold">لا يوجد أدوية تنطبق عليها هذه الحالة أو البحث.</p>
                        </div>
                    );
                }

                return filtered.map(med => {
                    const takenToday = hasTakenToday(med.id);
                    const stockPercent = med.inventory !== null ? Math.min(((med.inventory || 0) / (med.maxInventory || 30)) * 100, 100) : 100;
                    const isLow = med.inventory !== null && med.inventory <= 12;
                    const daysLeft = med.inventory !== null && med.frequencyPerDay ? Math.floor(med.inventory / med.frequencyPerDay) : null;

                    return (
                       <ExpandableCard 
                          key={med.id}
                          title={med.name}
                          icon={
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", 
                                med.isCritical ? "bg-rose-100 text-rose-600" : "bg-teal-50 text-teal-600"
                             )}>
                                <Pill className="w-5 h-5" />
                             </div>
                          }
                          className={isFasting ? "bg-[#2D2824] border-[#3D3834]" : ""}
                          summary={
                             <div className="flex justify-between items-center w-full flex-row-reverse" dir="rtl">
                                <span className="text-[10px] text-gray-500 font-bold">{med.form} • {med.instruction}</span>
                                <div className="flex gap-1.5 items-center">
                                   {med.isCritical && (
                                      <span className="text-[8px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md font-bold">حرج 🩺</span>
                                   )}
                                   {takenToday ? (
                                      <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> اتخذت</span>
                                   ) : (
                                      <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">لم تُؤخذ اليوم</span>
                                   )}
                                </div>
                             </div>
                          }
                          expandedContent={
                             <div className="space-y-4 text-right pt-2" dir="rtl">
                                 {/* Scientific Name */}
                                 {med.scientificName && (
                                     <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-[10px] text-gray-400 font-bold">الاسم العلمي:</span>
                                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300 font-bold">{med.scientificName}</span>
                                     </div>
                                 )}

                                 {/* Duration / Treatment Course */}
                                 {med.duration && (
                                     <div className="flex items-center gap-1.5 justify-end">
                                        <span className="text-[10px] text-gray-400 font-bold">مدة العلاج:</span>
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            {med.duration === 'مستمر' ? 'مستمر (مزمن)' : `محددة لـ ${med.durationDays || 10} يوم`}
                                        </span>
                                     </div>
                                 )}

                                 {/* Reminder Alarm list */}
                                 {med.alarmTimes && med.alarmTimes.length > 0 && (
                                     <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-2xl border border-gray-100 dark:border-white/10 flex flex-col gap-1.5">
                                         <p className="text-[9px] text-[#1A4D42] dark:text-[#D4A373] font-bold flex items-center gap-1 justify-end"><Clock className="w-3.5 h-3.5" /> مواعيد التنبيه اليومية المضبوطة:</p>
                                         <div className="flex flex-wrap gap-1.5 justify-end">
                                            {med.alarmTimes.map((t, i) => (
                                               <span key={i} className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-white/5 border border-gray-200/50 text-gray-700 dark:text-white font-bold">{t}</span>
                                            ))}
                                         </div>
                                     </div>
                                 )}

                                 {/* AI Instructions / Safety guidelines */}
                                 <div className="bg-amber-50 dark:bg-amber-950/15 p-4 rounded-3xl border border-amber-100 flex gap-3 text-right">
                                     <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                     <div className="space-y-1">
                                         <p className="text-xs font-black text-amber-800 dark:text-amber-400">إرشادات الدكتور الصامت للسلامة:</p>
                                         <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-bold">
                                            {isFasting 
                                              ? (profile.gender === 'female' ? "عشان صومك، تم مواءمة ميعاد حباية الدوا ومزامنته لبعد الفطار بالسلامة وبدون إفراط." : "عشان صومك، تم مواءمة ميعاد حباية الدوا لبعد الفطار بالسلامة وبدون مشاكل.")
                                              : (med.instruction.includes('بعد الاكل') 
                                                 ? "احرص تماماً على أخذ الجرعة متبوعة بـ 250 مل ماء على الأقل لحماية بطانة جهازك الهضمي." 
                                                 : "أخذه على معدة فارغة يسرع من معدل امتصاص المادة الفعالة بالكامل.")}
                                         </p>
                                     </div>
                                 </div>

                                 {/* Warnings Lists */}
                                 {med.warnings?.map((warning, wIdx) => (
                                     <div key={wIdx} className={cn("p-4 rounded-[20px] flex gap-3 text-right flex-row-reverse border",
                                        warning.level === 'red' ? "bg-rose-50 border-rose-200 dark:bg-rose-950/20" :
                                        warning.level === 'orange' ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20" :
                                        "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                                     )}>
                                        <AlertTriangle className={cn("w-5 h-5 shrink-0", 
                                           warning.level === 'red' ? "text-rose-600" :
                                           warning.level === 'orange' ? "text-orange-600" :
                                           "text-amber-600"
                                        )} />
                                        <div>
                                           <h5 className="font-bold text-xs mb-1">{warning.title}</h5>
                                           <p className="text-[10px] text-gray-500 font-bold leading-normal">{warning.desc}</p>
                                        </div>
                                     </div>
                                 ))}

                                 {/* Stock Level with RESTOCK ACTION */}
                                 <div className="p-4 rounded-3xl bg-gray-50 dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 space-y-3">
                                    <div className="flex justify-between items-center">
                                       <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isLow ? "bg-rose-100 text-rose-700" : "bg-teal-100 text-teal-700")}>
                                          {isLow ? `متوفر لـ ${daysLeft || 2} أيام فقط!` : 'المخزون كافٍ وممتاز'}
                                       </span>
                                       <span className="text-xs font-bold text-gray-700 dark:text-gray-300">مخزن العلبة: {med.inventory} / {med.maxInventory || 30} حبة</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                       <div className={cn("h-full rounded-full transition-all duration-500", isLow ? "bg-rose-500" : "bg-teal-500")} style={{ width: `${stockPercent}%` }} />
                                    </div>
                                    
                                    {isLow && (
                                       <button 
                                         onClick={() => handleRestockMedication(med)}
                                         className="w-full h-10 rounded-xl bg-[#D4A373]/20 hover:bg-[#D4A373]/30 text-gray-900 dark:text-[#D4A373] font-bold text-[10px] transition-colors flex items-center justify-center gap-1"
                                       >
                                          <ShoppingCart className="w-3.5 h-3.5" /> لقد قمت بشراء عبوة جديدة! (تعبئة المخزون كاملاً)
                                       </button>
                                    )}
                                 </div>

                                 {/* Actions */}
                                 <div className="flex gap-3 pt-2">
                                    <button 
                                      onClick={() => handleTakeMedicationClick(med)}
                                      className={cn("flex-2 h-14 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95",
                                         isFasting ? "bg-[#D4A373]" : "bg-[#1A4D42]"
                                      )}
                                    >
                                       <span>أنا أخذت الجرعة الآن!</span>
                                       <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                         alert("تم تأجيل التنبيه لمقدار 15 دقيقة بنجاح. سنذكرك مجدداً لتجنب فوا السهو.");
                                      }}
                                      className="flex-1 h-14 bg-gray-100 dark:bg-white/5 border border-gray-200 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-2xl"
                                    >
                                       غفوة ١٥ د⏰
                                    </button>
                                 </div>
                             </div>
                          }
                       />
                    );
                });
            })()}
         </div>
      </div>

      {/* Floating Plus button */}
      <div className="fixed bottom-28 left-6 z-40">
          <Link to="/add-medication" 
             className={cn("w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all outline outline-4 outline-white dark:outline-[#1A1A1A]",
                isFasting ? "bg-[#D4A373] shadow-amber-900/30" : "bg-[#1A4D42] shadow-[#1A4D42]/30 hover:bg-[#0D2923]"
             )}>
             <Plus className="w-8 h-8" strokeWidth={3}/>
          </Link>
      </div>

      {/* ✈️ TRAVEL MODE ORGANIZER CALCULATOR */}
      <AnimatePresence>
         {isTravelMode && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                <div className={cn("w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative text-right",
                   isFasting ? "bg-[#2D2824] text-white" : "bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                )}>
                    <div className="flex items-center gap-3 flex-row-reverse mb-6">
                        <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
                            <Plane className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">قرية السفر الآمنة ✈️</h2>
                            <p className="text-[10px] text-gray-500 font-bold mt-1">منظم حقيبة السفر والجرعات الشامل</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-400 block mb-2">كم مدة سفرك بالليلي والأيام؟</label>
                        <input 
                            type="number"
                            value={travelDays}
                            onChange={(e) => setTravelDays(e.target.value)}
                            className={cn("w-full h-12 rounded-xl px-4 font-bold text-center border-none",
                                isFasting ? "bg-black/20 text-white" : "bg-gray-100 dark:bg-white/5"
                            )}
                        />
                    </div>

                    <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-1">
                        {medications.map(med => {
                            const daily = med.frequencyPerDay || 1;
                            const totalNeeded = daily * Number(travelDays);
                            const current = med.inventory || 0;
                            const enough = current >= totalNeeded;

                            return (
                                <div key={med.id} className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100/50 flex flex-col gap-1 text-right">
                                    <div className="flex justify-between items-center flex-row-reverse">
                                       <span className="font-bold text-xs text-gray-800 dark:text-white">{med.name}</span>
                                       <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold", enough ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                                          {enough ? 'مخزون مسافر كافٍ!' : 'نقص للمخازن ⚠️'}
                                       </span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-bold select-none leading-none">مطلوب للرحلة: {totalNeeded} حبة • المتوفر لديك: {current}</p>
                                    {!enough && (
                                       <p className="text-[8px] text-rose-500 font-extrabold">عليك تزوير المخزن بـ {totalNeeded - current} حبات إضافية قبل الصعود!</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                       <button 
                           onClick={() => {
                              const itemsToRefill = medications.filter(m => (m.inventory || 0) < ((m.frequencyPerDay || 1) * Number(travelDays)));
                              if (itemsToRefill.length === 0) {
                                 alert("كل أدويتك تكفي رحلتك بالسلامة!");
                                 return;
                              }
                              const printable = "قائمة أدوية السفر العاجلة:\n" + itemsToRefill.map(m => `- ${m.name} (النقص: ${((m.frequencyPerDay || 1) * Number(travelDays)) - (m.inventory || 0)} حبات)`).join('\n');
                              window.open(`https://wa.me/?text=${encodeURIComponent(printable)}`, '_blank');
                           }}
                           className="flex-1 py-3 bg-emerald-50 text-[#1A4D42] font-semibold text-xs rounded-xl flex items-center justify-center gap-1 border border-emerald-100"
                       >
                           <Share2 className="w-3.5 h-3.5" /> شارك حقيبة التعبئة
                       </button>
                       <button 
                           onClick={() => setIsTravelMode(false)}
                           className={cn("flex-1 h-12 rounded-xl font-bold text-xs text-white shadow-md",
                               isFasting ? "bg-[#D4A373]" : "bg-sky-500"
                           )}
                       >
                           تم، شكراً
                       </button>
                    </div>
                </div>
             </div>
         )}
      </AnimatePresence>

      {/* ⏰ SMART DOSE LOG CONFIRMATION DIALOG */}
      <AnimatePresence>
         {showTakeDialog && selectedMedForLog && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                <div className={cn("w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative text-right",
                   isFasting ? "bg-[#2D2824] text-white" : "bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
                )}>
                    <div className="flex items-center gap-3 flex-row-reverse mb-5">
                        <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center">
                            <Clock className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="font-bold text-[#1A2E35] dark:text-white text-sm">تفاصيل مؤشر وقت تناول الدواء</h2>
                            <p className="text-[10px] text-gray-500 font-bold mt-1">{selectedMedForLog.name}</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="flex p-1 rounded-xl bg-gray-100 dark:bg-white/5 flex-row-reverse" dir="rtl">
                           <button 
                             onClick={() => setTakeStatus('on_time')}
                             className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", takeStatus === 'on_time' ? "bg-emerald-500 text-white" : "text-gray-400")}
                           >
                              في وقته المضبوط
                           </button>
                           <button 
                             onClick={() => setTakeStatus('late')}
                             className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", takeStatus === 'late' ? "bg-amber-500 text-white" : "text-gray-400")}
                           >
                              أخذته متأخر
                           </button>
                           <button 
                             onClick={() => setTakeStatus('skipped')}
                             className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", takeStatus === 'skipped' ? "bg-rose-500 text-white" : "text-gray-400")}
                           >
                              تخطي الجرعة ❌
                           </button>
                        </div>

                        {takeStatus === 'late' && (
                           <div className="space-y-1.5">
                              <label className="text-[9px] text-[#D4A373] font-bold block">ما مقدار التأخير بالدقائق؟</label>
                              <select 
                                value={lateMinutes}
                                onChange={(e) => setLateMinutes(e.target.value)}
                                className={cn("w-full h-11 rounded-xl text-center border-none font-bold text-xs px-3", isFasting ? "bg-black/20 text-white" : "bg-gray-50 dark:bg-white/5")}
                                dir="rtl"
                              >
                                 <option value="15">🕒 ١٥ دقيقة متأخراً</option>
                                 <option value="30">🕒 ٣٠ دقيقة متأخراً</option>
                                 <option value="60">🕒 ساعة واحدة متأخراً</option>
                                 <option value="120">🕒 ساعتين أو أكثر متأخراً</option>
                              </select>
                           </div>
                        )}

                        <div className="space-y-1.5">
                           <label className="text-[9px] text-gray-400 font-bold block">ملاحظات إضافية بخصوص شعورك حالياً</label>
                           <input 
                             type="text" 
                             placeholder="مثال: شعرت بصداع خفيف بعدها..." 
                             value={customLogNotes}
                             onChange={(e) => setCustomLogNotes(e.target.value)}
                             className={cn("w-full h-11 rounded-xl px-3 text-right text-xs border-none", isFasting ? "bg-black/20 text-white" : "bg-gray-50 dark:bg-white/5")}
                             dir="rtl"
                           />
                        </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                           onClick={() => setShowTakeDialog(false)}
                           className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-500 font-bold text-xs rounded-xl"
                       >
                           إلغاء
                       </button>
                       <button 
                           onClick={handleConfirmTakeDose}
                           className="flex-2 py-3 bg-[#1A4D42] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1"
                       >
                           أكـد وقت اللوغ السري الطقسي
                       </button>
                    </div>
                </div>
             </div>
         )}
      </AnimatePresence>

    </div>
  );
}
