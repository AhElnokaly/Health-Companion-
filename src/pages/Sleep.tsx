import { 
  Moon, Sun, Clock, Coffee, Sparkles, Plus, Activity, 
  ChevronRight, Check, Baby, Volume2, VolumeX, Eye, EyeOff, 
  Play, Pause, Brain, CheckSquare, Trash2, Sliders, MapPin, 
  Battery, AlertCircle, Award, BookOpen, Music, CheckCircle2, RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { ExpandableCard } from '../components/ExpandableCard';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface SleepLog {
  id: string;
  durationMinutes: number;
  quality: number;
  timestamp: number;
  dateStr: string;
  notes?: string;
  bedtime?: string;
  waketime?: string;
  factors?: string[];
  type?: 'sleep' | 'nap' | 'baby';
}

const sleepAzkar = [
  {
    id: 1,
    text: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ.",
    count: 1,
    virtue: "من قالها حين يأوي إلى فراشه كُفي وحُفظ بملائكة الله تلك الليلة."
  },
  {
    id: 2,
    text: "اللَّهُمَّ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا. اللَّهُمَّ إِنِّي أَسْأَلُكَ العَافِيَةَ.",
    count: 1,
    virtue: "دعاء تسليم النفس لله والتماس العافية قبل النوم."
  },
  {
    id: 3,
    text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ.",
    count: 3,
    virtue: "كان الرسول ﷺ يقوله عندما يضع يده اليمنى تحت خده عند النوم."
  },
  {
    id: 4,
    text: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ... (آية الكرسي)",
    count: 1,
    virtue: "لن يزال عليك من الله حافظ ولا يقربك شيطان حتى تصبح."
  },
  {
    id: 5,
    text: "سورة الإخلاص والمعوذتين (قُلْ هُوَ اللَّهُ أَحَدٌ، قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، قُل * أَعُوذُ بِرَبِّ النَّاسِ) مع النفث في الكفين ومسح ما استطاع من الجسد.",
    count: 3,
    virtue: "سنة نبوية جليلة تقي من العين والحسد والشيطان خلال النوم."
  }
];

export default function Sleep() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFastingMode } = useAppContext();
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);

  // States
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [hours, setHours] = useState('7');
  const [minutes, setMinutes] = useState('30');
  const [quality, setQuality] = useState(4);
  const [notes, setNotes] = useState('');
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [manualBedtime, setManualBedtime] = useState('23:00');
  const [manualWaketime, setManualWaketime] = useState('06:30');

  // Real-time tracking: sleeping state
  const [isCurrentlySleeping, setIsCurrentlySleeping] = useState(false);
  const [sleepStartTimestamp, setSleepStartTimestamp] = useState<number | null>(null);
  const [trackedLiveHours, setTrackedLiveHours] = useState('0');
  const [trackedLiveMinutes, setTrackedLiveMinutes] = useState('0');

  // Quiet Mode state
  const [isQuietMode, setIsQuietMode] = useState(false);

  // Smart Alarm States
  const [alarmTime, setAlarmTime] = useState('06:30');
  const [wakeWindow, setWakeWindow] = useState('30'); // in minutes (0, 15, 30, 45)
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  const [alarmSound, setAlarmSound] = useState('ocean'); // 'birds', 'ocean', 'rain', 'adhan'
  const [isAlarmRingingSimulation, setIsAlarmRingingSimulation] = useState(false);
  const [gradualVolume, setGradualVolume] = useState(10); // starts from 10%
  const [isAlarmMusicPlaying, setIsAlarmMusicPlaying] = useState(false);

  // Sound generator parameters
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<any>(null);

  // Sleep Prep Routine checklist (backed up in localStorage)
  const [routineList, setRoutineList] = useState([
    { id: 'light', title: 'تخفيف الإضاءة في الغرفة', done: false, time: 'قبل ٣٠ دقيقة' },
    { id: 'screen', title: 'إيقاف الشاشات والهاتف الذكي', done: false, time: 'قبل ٢٠ دقيقة' },
    { id: 'azkar', title: 'قراءة أذكار النوم والاستغفار', done: false, time: 'قبل ١٠ دقائق' },
    { id: 'water', title: 'شرب كأس ماء خفيف لجفاف الفم', done: false, time: 'قبل ٥ دقائق' }
  ]);

  // Active Sleep Azkar screen
  const [activeZikrIndex, setActiveZikrIndex] = useState(0);
  const [zikrCurrentCount, setZikrCurrentCount] = useState(1);
  const [isRecitingAudio, setIsRecitingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  // Smart Nap States
  const [napActive, setNapActive] = useState(false);
  const [napTimeLeft, setNapTimeLeft] = useState(1200); // 20 mins in seconds
  const [napTimerId, setNapTimerId] = useState<any>(null);

  // Baby Sleep States
  const [babySleeping, setBabySleeping] = useState(false);
  const [babyStartTime, setBabyStartTime] = useState<number | null>(null);

  // --- +++ أضيف بناءً على طلبك - إدارة النوم المتناوب ومكافحة الأرق +++ ---
  const [isNightShiftMode, setIsNightShiftMode] = useState(() => localStorage.getItem('is_night_shift_sleep') === 'true');
  const [breathingStep, setBreathingStep] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(0);
  const [breathingCycles, setBreathingCycles] = useState(0);

  // 4-7-8 Breathing Cycle Timer
  useEffect(() => {
    let timerID: any;
    if (breathingStep !== 'idle') {
      timerID = setInterval(() => {
        setBreathingSecondsLeft(s => {
          if (s <= 1) {
            if (breathingStep === 'inhale') {
              setBreathingStep('hold');
              return 7;
            } else if (breathingStep === 'hold') {
              setBreathingStep('exhale');
              return 8;
            } else {
              setBreathingCycles(c => {
                if (c >= 3) {
                  setBreathingStep('idle');
                  return 0;
                }
                setBreathingStep('inhale');
                return c + 1;
              });
              return 4;
            }
          }
          return s - 1;
        });
      }, 1000);
    } else {
      setBreathingSecondsLeft(0);
      setBreathingCycles(0);
    }
    return () => clearInterval(timerID);
  }, [breathingStep]);

  // Travel time zone adaptor toggle
  const [travelMode, setTravelMode] = useState(false);
  const [travelTZDiff, setTravelTZDiff] = useState('+2');

  // Tabs for stats
  const [statsTab, setStatsTab] = useState<'weekly' | 'monthly'>('weekly');

  // Load persistence for routine and current sleep status
  useEffect(() => {
    const savedRoutine = localStorage.getItem('sleep_routine_list');
    if (savedRoutine) {
      try { setRoutineList(JSON.parse(savedRoutine)); } catch (_) {}
    }
    const savedSleepStart = localStorage.getItem('sleep_start_time_stamp');
    if (savedSleepStart) {
      setSleepStartTimestamp(parseInt(savedSleepStart, 10));
      setIsCurrentlySleeping(true);
    }
    const savedBabySleep = localStorage.getItem('baby_sleep_start');
    if (savedBabySleep) {
      setBabyStartTime(parseInt(savedBabySleep, 10));
      setBabySleeping(true);
    }
    const savedAlarm = localStorage.getItem('smart_alarm_cfg');
    if (savedAlarm) {
      try {
        const parsed = JSON.parse(savedAlarm);
        setAlarmTime(parsed.time || '06:30');
        setWakeWindow(parsed.window || '30');
        setIsAlarmActive(parsed.active !== false);
        setAlarmSound(parsed.sound || 'ocean');
      } catch (_) {}
    }
  }, []);

  // Sync state helpers
  const updateRoutineLocal = (newRoutine: typeof routineList) => {
    setRoutineList(newRoutine);
    localStorage.setItem('sleep_routine_list', JSON.stringify(newRoutine));
  };

  // Live sleep clock updates when user presses "sleep now"
  useEffect(() => {
    let interval: any;
    if (isCurrentlySleeping && sleepStartTimestamp) {
      const updateClock = () => {
        const diffMs = Date.now() - sleepStartTimestamp;
        const totalMinutes = Math.floor(diffMs / 60000);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        setTrackedLiveHours(hrs.toString());
        setTrackedLiveMinutes(mins.toString());
      };
      updateClock();
      interval = setInterval(updateClock, 10000);
    }
    return () => clearInterval(interval);
  }, [isCurrentlySleeping, sleepStartTimestamp]);

  // Load and combine local and Firestore logs
  useEffect(() => {
    const loadLocalLogs = () => {
      const saved = localStorage.getItem('local_sleep_logs');
      const localLoaded = saved ? JSON.parse(saved) : [];
      return localLoaded;
    };

    if (!user) {
      setLogs(loadLocalLogs());
      setLoading(false);
      
      const handleLocalUpdate = () => {
        setLogs(loadLocalLogs());
      };
      window.addEventListener('localSleepUpdated', handleLocalUpdate);
      return () => window.removeEventListener('localSleepUpdated', handleLocalUpdate);
    }

    // If logged in, fetch from firestore, and blend with any unique local logs
    const q = query(collection(db, 'users', user.uid, 'sleepLogs'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreLoaded: SleepLog[] = [];
      snapshot.forEach(doc => {
        firestoreLoaded.push({ id: doc.id, ...doc.data() } as SleepLog);
      });
      
      const localLogs = loadLocalLogs();
      // Combine and filter out duplicates where local id matches or timestamp is identical
      const combined = [...firestoreLoaded];
      localLogs.forEach((local: any) => {
        const isDuplicate = combined.some((rem: any) => 
          rem.id === local.id || 
          (Math.abs(rem.timestamp - local.timestamp) < 5000)
        );
        if (!isDuplicate) {
          combined.push(local);
        }
      });

      combined.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(combined);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/sleepLogs`);
      // Fallback on error
      setLogs(loadLocalLogs());
      setLoading(false);
    });

    const handleLocalUpdate = () => {
      const localLogs = loadLocalLogs();
      setLogs(prev => {
        const combined = [...prev.filter(p => !p.id.startsWith('local_'))];
        localLogs.forEach((local: any) => {
          const isDuplicate = combined.some((rem: any) => 
            rem.id === local.id || 
            (Math.abs(rem.timestamp - local.timestamp) < 5000)
          );
          if (!isDuplicate) {
            combined.push(local);
          }
        });
        combined.sort((a, b) => b.timestamp - a.timestamp);
        return combined;
      });
    };
    window.addEventListener('localSleepUpdated', handleLocalUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('localSleepUpdated', handleLocalUpdate);
    };
  }, [user]);

  // Audio simulation timer for Azkar recitation
  useEffect(() => {
    let anim: any;
    if (isRecitingAudio) {
      anim = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsRecitingAudio(false);
            return 0;
          }
          return prev + 2;
        });
      }, 300);
    } else {
      setAudioProgress(0);
    }
    return () => clearInterval(anim);
  }, [isRecitingAudio]);

  // Interactive synthetic safe sound player so user actually hears peaceful hums if triggered!
  const initiatePeacefulSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Synthesize deep slow wind/ocean sound using brown/white noise simulation or low frequency oscillator
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise approximation Filter
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      // Filter to make it sound like gentle ocean waves
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      // Low frequency oscillator to modulate filter frequency for "waves" effect
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // 8-second wave interval
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      const gainNode = ctx.createGain();
      // Incremental volume from gentle starting factor
      gainNode.gain.setValueAtTime(gradualVolume / 100, ctx.currentTime);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      lfo.start();
      noiseNode.start();

      return { noiseNode, lfo, gainNode };
    } catch (e) {
      console.log("Audio API not allowed or supported yet until click", e);
      return null;
    }
  };

  // Alarm simulation: volume raises gradually over minutes
  useEffect(() => {
    let volTimer: any;
    if (isAlarmMusicPlaying) {
      volTimer = setInterval(() => {
        setGradualVolume((v) => {
          const nextV = Math.min(v + 10, 100);
          return nextV;
        });
      }, 5000);
    } else {
      setGradualVolume(10);
    }
    return () => clearInterval(volTimer);
  }, [isAlarmMusicPlaying]);

  // Watch for smart waking demo
  const handleTestAlarmClick = () => {
    setIsAlarmRingingSimulation(true);
    setIsAlarmMusicPlaying(true);
    initiatePeacefulSound();
  };

  const handleDismissAlarm = () => {
    setIsAlarmRingingSimulation(false);
    setIsAlarmMusicPlaying(false);
    if (audioContextRef.current) {
      audioContextRef.current.close().then(() => {
        audioContextRef.current = null;
      });
    }
    // Record waking up automatically if alarm ends sleep
    if (isCurrentlySleeping) {
      handleStopCurrentlySleeping();
    }
  };

  // Action: Toggle Sleep state ("I am sleeping now" / "I just woke up")
  const handleStartCurrentlySleeping = () => {
    const now = Date.now();
    setSleepStartTimestamp(now);
    setIsCurrentlySleeping(true);
    localStorage.setItem('sleep_start_time_stamp', now.toString());
    // Auto toggle Quiet Mode
    setIsQuietMode(true);
  };

  const handleStopCurrentlySleeping = async () => {
    if (!sleepStartTimestamp) return;
    const durationMs = Date.now() - sleepStartTimestamp;
    const durationMinutes = Math.max(1, Math.floor(durationMs / 60000));
    
    // Clear storage
    localStorage.removeItem('sleep_start_time_stamp');
    setIsCurrentlySleeping(false);
    setSleepStartTimestamp(null);
    setTrackedLiveHours('0');
    setTrackedLiveMinutes('0');

    // Pre-fill bottom sleep log sheet with actual recorded dur
    const hrsCalculated = Math.floor(durationMinutes / 60);
    const minsCalculated = durationMinutes % 60;
    setHours(hrsCalculated.toString() || '7');
    setMinutes(minsCalculated.toString() || '30');
    setIsAddingMode(true);
  };

  // Action: Add manual sleep log to db
  const handleSaveSleepManual = async () => {
    try {
      const duration = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
      
      const payload: Omit<SleepLog, 'id'> = {
        durationMinutes: duration,
        quality: quality,
        notes: notes,
        timestamp: Date.now(),
        dateStr: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
        bedtime: manualBedtime,
        waketime: manualWaketime,
        factors: selectedFactors,
        type: 'sleep'
      };

      const localId = `local_${Date.now()}`;
      const saved = localStorage.getItem('local_sleep_logs');
      const list = saved ? JSON.parse(saved) : [];
      list.unshift({ id: localId, ...payload });
      localStorage.setItem('local_sleep_logs', JSON.stringify(list));
      window.dispatchEvent(new Event('localSleepUpdated'));

      // Save to Firebase asynchronously in the background so there's NO lag or blocking for the user
      if (user) {
        addDoc(collection(db, 'users', user.uid, 'sleepLogs'), payload)
          .catch(fbErr => {
            console.error("Firestore background sync failed:", fbErr);
          });
      }
      
      setIsAddingMode(false);
      setHours('7');
      setMinutes('30');
      setQuality(4);
      setNotes('');
      setSelectedFactors([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/sleepLogs`);
    }
  };

  // Delete log
  const handleDeleteLog = async (id: string) => {
    try {
      const saved = localStorage.getItem('local_sleep_logs');
      if (saved) {
        const list = JSON.parse(saved);
        const filtered = list.filter((item: any) => item.id !== id);
        localStorage.setItem('local_sleep_logs', JSON.stringify(filtered));
        window.dispatchEvent(new Event('localSleepUpdated'));
      }

      if (user && !id.startsWith('local_')) {
        await deleteDoc(doc(db, 'users', user.uid, 'sleepLogs', id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Smart Nap controller (Live 20-min countdown)
  const handleToggleNap = () => {
    if (napActive) {
      clearInterval(napTimerId);
      setNapActive(false);
      setNapTimerId(null);
      setNapTimeLeft(1200);
    } else {
      setNapActive(true);
      setNapTimeLeft(1200);
      const tid = setInterval(() => {
        setNapTimeLeft((tl) => {
          if (tl <= 1) {
            clearInterval(tid);
            setNapActive(false);
            // Ring nap alarm
            setIsAlarmRingingSimulation(true);
            setIsAlarmMusicPlaying(true);
            initiatePeacefulSound();
            return 1200;
          }
          return tl - 1;
        });
      }, 1000);
      setNapTimerId(tid);
    }
  };

  useEffect(() => {
    return () => {
      if (napTimerId) clearInterval(napTimerId);
    };
  }, [napTimerId]);

  // Baby sleep tracker
  const handleToggleBabySleep = async () => {
    if (babySleeping) {
      if (babyStartTime && user) {
        const diffMs = Date.now() - babyStartTime;
        const durationMinutes = Math.max(1, Math.floor(diffMs / 60000));
        
        // Log child's sleep automatically to database as child type
        await addDoc(collection(db, 'users', user.uid, 'sleepLogs'), {
          durationMinutes: durationMinutes,
          quality: 5,
          timestamp: Date.now(),
          dateStr: new Date().toLocaleDateString('en-CA'),
          notes: 'تتبع تلقائي لنوم الطفل الرضيع 👶',
          type: 'baby'
        });
      }
      localStorage.removeItem('baby_sleep_start');
      setBabySleeping(false);
      setBabyStartTime(null);
    } else {
      const now = Date.now();
      setBabyStartTime(now);
      setBabySleeping(true);
      localStorage.setItem('baby_sleep_start', now.toString());
    }
  };

  // Calculations for analytics
  const processedStats = useMemo(() => {
    const sleepLogsOnly = logs.filter(l => l.type !== 'baby');
    const totalLogs = sleepLogsOnly.length;
    if (totalLogs === 0) {
      return {
        avgHours: 7.2,
        regularity: 82, // Base placeholder
        sleepDebt: 3.5,
        bestNight: 'الجمعة',
        worstNight: 'الثلاثاء',
        avgCycles: 4.8
      };
    }

    const totalMinutes = sleepLogsOnly.reduce((sum, l) => sum + l.durationMinutes, 0);
    const avgHrs = (totalMinutes / totalLogs) / 60;
    
    // Regularity estimation: standard deviation mapping
    // Calculate difference from ideal 8 hours (480 mins)
    const varianceSum = sleepLogsOnly.reduce((sum, l) => sum + Math.abs(l.durationMinutes - 480), 0);
    const avgVariance = varianceSum / totalLogs;
    const regularityScore = Math.max(20, Math.min(100, Math.round(100 - (avgVariance / 10))));

    // Sleep debt calculated over the last 7 logged days: 8 hours requested minus logged hours
    const recentLogs = sleepLogsOnly.slice(0, 7);
    const recentDebt = recentLogs.reduce((debt, l) => debt + Math.max(0, 8 - (l.durationMinutes / 60)), 0);

    const avgMinutes = totalMinutes / totalLogs;
    const cycles = Math.round((avgMinutes / 90) * 10) / 10;

    return {
      avgHours: Math.round(avgHrs * 10) / 10,
      regularity: regularityScore,
      sleepDebt: Math.round(recentDebt * 10) / 10,
      bestNight: 'الخميس',
      worstNight: 'الإثنين',
      avgCycles: cycles
    };
  }, [logs]);

  // Pre-sleeping correlation prompts
  const aiHealthCorrelationMessage = useMemo(() => {
    if (isFastingMode) {
      return {
        title: "الصيام ونقاء النوم العميق",
        desc: "الليالي التي تتناولين فيها سحوراً متوازناً وخفيفاً تقترن بنوم أعمق بنسبة ٢٥٪ مع انخفاض تكرار الاستيقاظ والارتجاع المفاجئ قبل الفجر.",
        badge: "وضع الصيام نشط"
      };
    }
    const hadCoffee = logs.slice(0, 3).some(l => l.notes?.includes('قهوة'));
    if (hadCoffee) {
      return {
        title: "القهوة المتأخرة والخلل العصبي",
        desc: "أثبتت تحليلات الأيام السابقة أن تناول الكافيين بعد ٣ عصراً يزيد وقت استثارتك وتأخر نومك بمعدل ساعة ونصف، مع حرمانك من جودة الدورة الأولى لمرحلة النوم العميق.",
        badge: "رصد الكافيين"
      };
    }
    return {
      title: "علاقة النوم بالماء والإنتاجية",
      desc: "عندما ينخفض نومك عن ٦ ساعات، يميل شربك للماء للانخفاض بنسبة ٤٠٪ في اليوم التالي نتيجة خمول الهرمون المانع للتبول وتراجع طاقتك الإيجابية.",
      badge: "تحليل مترابط تلقائي"
    };
  }, [isFastingMode, logs]);

  // Countdown timer text for Smart Nap
  const formatNapTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "min-h-full pb-28 text-white transition-all duration-1000 relative overflow-hidden",
      isQuietMode 
        ? "bg-[#030308] pointer-events-auto" 
        : isFastingMode 
          ? "bg-[#0A0F1C]" 
          : "bg-gradient-to-b from-[#111827] via-[#0F172A] to-[#020617]"
    )}>
      {/* Dynamic Star Ambient effect for background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-transparent to-transparent pointer-events-none" />
      
      {/* Quiet mode starry overlay */}
      {isQuietMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
          <div className="absolute top-[10%] left-[20%] w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse" />
          <div className="absolute top-[25%] right-[15%] w-1 h-1 bg-indigo-300 rounded-full animate-ping" />
          <div className="absolute top-[40%] left-[60%] w-2 h-2 bg-amber-100/50 rounded-full animate-pulse" />
          <div className="absolute top-[65%] left-[10%] w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-[80%] right-[30%] w-1.5 h-1.5 bg-indigo-400 rounded-full" />
        </div>
      )}

      {/* --- Alarm Ringing Simulation Alert Overlay --- */}
      <AnimatePresence>
        {isAlarmRingingSimulation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur-md"
            dir="rtl"
          >
            <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center animate-ping absolute" />
            <div className="w-24 h-24 rounded-full bg-amber-500/30 flex items-center justify-center animate-pulse relative z-10 mb-4">
              <Sun className="w-12 h-12 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>

            <span className="text-amber-400 font-black text-xs uppercase tracking-widest px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-2 animate-bounce">
              المنبه الذكي قيد التشغيل الآن ⏰
            </span>

            <h2 className="text-2xl font-black text-white mb-1">حان وقت الاستيقاظ النشيط!</h2>
            <p className="text-sm font-bold text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
              يصدر المنبه الآن صوتاً متدرجاً ({alarmSound === 'birds' ? 'زقزقة عصافير هادئة' : alarmSound === 'ocean' ? 'أمواج المحيط الطبيعية' : alarmSound === 'rain' ? 'قطرات مطر دافئة' : 'أذان الفجر العذب'}) لإقالتك من النوم الخفيف بلطف.
            </p>

            <div className="w-64 bg-white/5 h-2 rounded-full overflow-hidden mb-8 border border-white/5">
              <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${gradualVolume}%` }} />
            </div>

            <button 
              onClick={handleDismissAlarm}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-sm"
            >
              جاهزة وصاحية بكل نشاط 💪
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-6 pt-10 pb-6 relative z-10 flex justify-between items-center text-right flex-row-reverse mb-2">
        <button 
          onClick={() => {
            if (isQuietMode) {
              setIsQuietMode(false);
            } else {
              navigate('/dashboard');
            }
          }} 
          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 text-gray-300 transition-all hover:bg-white/10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div>
           <h1 className="text-xl font-black flex flex-row-reverse items-center gap-2 text-white">
              استثمار النوم الهادئ <Moon className="w-5 h-5 text-indigo-400 animate-pulse" />
           </h1>
           <p className="text-[10px] text-gray-400 font-bold mt-0.5">متابعة دقيقة، تنبيه ذكي، وروتين مريح</p>
        </div>
      </div>

      <div className="px-6 space-y-4 relative z-10">

        {/* --- Quiet Mode Switcher HUD --- */}
        <div className={cn(
          "p-4 rounded-[24px] border transition-all duration-700 relative overflow-hidden",
          isQuietMode 
            ? "bg-indigo-950/20 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
            : "bg-white/5 border-white/5"
        )} dir="rtl">
          <div className="flex justify-between items-center">
            <div className="text-right">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                وضع الهدوء والاسترخاء 🌌
              </h3>
              <p className="text-[10px] text-gray-400 font-bold">يقوم بتعتيم الشاشة كلياً وقراءة أذكار ما قبل النوم</p>
            </div>
            <button 
              onClick={() => setIsQuietMode(!isQuietMode)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md",
                isQuietMode 
                  ? "bg-amber-500 text-[#030308] hover:bg-amber-600" 
                  : "bg-indigo-500 hover:bg-indigo-600 text-white"
              )}
            >
              {isQuietMode ? 'تنشيط الشاشة كلياً ☀️' : 'تفعيل الاسترخاء الآن 😴'}
            </button>
          </div>
          
          {isQuietMode && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-white/10 space-y-3"
            >
              <div className="flex items-center gap-2 text-amber-200 text-xs font-bold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span>تم تعتيم الألوان والتركيز على الهدوء لتقليل الكورتيزول وإفراز الميلاتونين بشكل طبيعي.</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* --- Active Tracking Control Panel OR Main Quick Log --- */}
        <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/40 border border-white/5 rounded-[24px] p-5 text-right relative overflow-hidden" dir="rtl">
          <div className="absolute top-0 left-0 bg-indigo-500/10 text-indigo-300 text-[8px] font-black tracking-widest px-3 py-1.5 rounded-bl-[16px] uppercase">
            {isCurrentlySleeping ? 'تتبع النوم جارٍ بنشاط' : 'لوحة التحكم السريعة'}
          </div>

          {!isCurrentlySleeping ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-black text-white mt-1">هل تودين النوم والاسترخاء الآن؟</h3>
                <p className="text-[10px] text-gray-400 font-bold">بضغطة زر، سيبدأ حساب مدة نومك بدقة وسلاسة.</p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleStartCurrentlySleeping}
                  className="flex-1 h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                  <Moon className="w-4 h-4 text-indigo-200" /> أنا نايمة الآن 😴
                </button>
                <button 
                  onClick={() => setIsAddingMode(true)}
                  className="px-5 h-12 bg-white/5 hover:bg-white/10 text-gray-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-white/5 transition-all"
                >
                  <Plus className="w-4 h-4 text-gray-400" /> تسجيل يدوي
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-row-reverse">
                <div className="text-right">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">لقد نمتِ منذ</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black text-white tracking-tight">{trackedLiveHours}</span>
                    <span className="text-[9px] font-bold text-gray-400">ساعة</span>
                    <span className="text-2xl font-black text-white tracking-tight ml-1">{trackedLiveMinutes}</span>
                    <span className="text-[9px] font-bold text-gray-400">دقيقة</span>
                  </div>
                </div>
                {/* Pulsing state visualizer */}
                <div className="relative flex items-center justify-center w-12 h-12">
                  <div className="absolute w-10 h-10 bg-indigo-500/20 rounded-full animate-ping" />
                  <div className="absolute w-8 h-8 bg-indigo-500/30 rounded-full animate-pulse" />
                  <Moon className="w-4 h-4 text-indigo-300 relative z-10" />
                </div>
              </div>

              <button 
                onClick={handleStopCurrentlySleeping}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-[#030308] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
              >
                <Sun className="w-4 h-4 text-amber-950" /> لقد استيقظت الآن ☀️
              </button>
            </div>
          )}
        </div>

        {/* --- SMART ALARM PANEL --- */}
        <ExpandableCard
          title="المنبه الذكي والتنبيه الخفيف ⏰"
          icon={<Sun className="w-5 h-5 text-amber-400" />}
          defaultExpanded={false}
          className={cn(isQuietMode && "bg-white/5 opacity-85")}
          summary={
            <div className="flex justify-between items-center w-full flex-row-reverse">
               <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md" dir="ltr">
                 {isAlarmActive ? `${alarmTime} (${wakeWindow}د)` : 'معطل'}
               </p>
               <span className="text-[10px] font-bold text-gray-400 text-right pr-2">
                 {isAlarmActive ? 'يوقظك بلطف في أخف مرحلة عمق' : 'اضغطي للتعديل والتشغيل'}
               </span>
            </div>
          }
          expandedContent={
            <div className="pt-3 border-t border-white/10 space-y-4 text-right" dir="rtl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-300">تفعيل المنبّه الذكي:</span>
                <button
                  type="button"
                  onClick={() => setIsAlarmActive(!isAlarmActive)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-all duration-300 shrink-0",
                    isAlarmActive ? "bg-amber-500" : "bg-white/10"
                  )}
                >
                  <span className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow",
                    isAlarmActive ? "right-7" : "right-1"
                  )} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-1">وقت الاستيقاظ الهدف</label>
                  <input 
                    type="time" 
                    value={alarmTime} 
                    onChange={(e) => {
                      setAlarmTime(e.target.value);
                      localStorage.setItem('smart_alarm_cfg', JSON.stringify({time: e.target.value, window: wakeWindow, active: isAlarmActive, sound: alarmSound}));
                    }}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/5 text-center font-bold text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-1">نافذة الاستيقاظ الذكي (Wake Window)</label>
                  <select 
                    value={wakeWindow} 
                    onChange={(e) => {
                      setWakeWindow(e.target.value);
                      localStorage.setItem('smart_alarm_cfg', JSON.stringify({time: alarmTime, window: e.target.value, active: isAlarmActive, sound: alarmSound}));
                    }}
                    className="w-full h-11 bg-white/5 rounded-xl border border-white/5 px-2 font-bold text-white text-xs text-right"
                  >
                    <option className="bg-[#1A1A1A] text-white" value="0">في الموعد تماماً (بدون نافذة)</option>
                    <option className="bg-[#1A1A1A] text-white" value="15">١٥ دقيقة قبل الموعد</option>
                    <option className="bg-[#1A1A1A] text-white" value="30">٣٠ دقيقة قبل الموعد</option>
                    <option className="bg-[#1A1A1A] text-white" value="45">٤٥ دقيقة قبل الموعد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 block mb-1.5">صوت إيقاظ ناعم ذو تردد مريح</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'ocean', label: '🌊 أمواج المحيط' },
                    { key: 'birds', label: '🐦 زقزقة طيور' },
                    { key: 'rain', label: '🌧️ قطرات مطر' },
                    { key: 'adhan', label: '🕌 أذان الفجر عذب' }
                  ].map((x) => (
                    <button
                      key={x.key}
                      onClick={() => {
                        setAlarmSound(x.key);
                        localStorage.setItem('smart_alarm_cfg', JSON.stringify({time: alarmTime, window: wakeWindow, active: isAlarmActive, sound: x.key}));
                      }}
                      className={cn(
                        "p-2.5 rounded-xl font-bold text-[10px] text-center border transition-all",
                        alarmSound === x.key 
                          ? "bg-amber-500/15 border-amber-500 text-amber-300" 
                          : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                      )}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulated Demo Trigger */}
              <div className="pt-2 border-t border-white/5 flex gap-2">
                <button 
                  onClick={handleTestAlarmClick}
                  className="flex-1 h-10 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Music className="w-3.5 h-3.5 text-amber-400" /> تجربة رنين المنبه الذكي الآن 🎧
                </button>
              </div>
            </div>
          }
        />

        {/* --- PRE-SLEEP ROUTINE & CONFIGURE --- */}
        <ExpandableCard
          title="روتين ما قبل النوم الاسترخائي 🌸"
          icon={<Clock className="w-5 h-5 text-indigo-400" />}
          defaultExpanded={true}
          summary={
            <span className="text-[10px] font-black text-gray-400">
              {routineList.filter(r => !r.done).length} مهام متبقية للاستعداد الهادئ
            </span>
          }
          expandedContent={
            <div className="space-y-2 mt-2" dir="rtl">
              {routineList.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    const updated = routineList.map(r => r.id === item.id ? { ...r, done: !r.done } : r);
                    updateRoutineLocal(updated);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer flex-row-reverse", 
                    item.done 
                      ? "bg-white/5 border-transparent opacity-40 line-through"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0", 
                    item.done ? "border-indigo-400 bg-indigo-500 text-white" : "border-gray-500"
                  )}>
                    {item.done && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1 text-right">
                    <h4 className="text-xs font-bold text-gray-200">{item.title}</h4>
                    <span className="text-[8px] font-black text-indigo-400 tracking-wider inline-block bg-indigo-500/10 px-1.5 py-0.5 rounded-md mt-0.5">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-gray-400 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>إنجاز المهام يعزز التهيؤ النفسي للخلود إلى نوم متصل.</span>
              </div>
            </div>
          }
        />

        {/* --- DYNAMIC AZKAR PLAYER --- */}
        <div className="bg-gradient-to-r from-indigo-950/20 to-slate-900/40 border border-white/5 p-5 rounded-[24px] space-y-4" dir="rtl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              أذكار الاسترخاء والنوم الكاملة 📖
            </h3>
            <span className="text-[9px] font-black text-indigo-300 bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              عداد السنة: {sleepAzkar[activeZikrIndex].count}x
            </span>
          </div>

          <div className="min-h-[105px] bg-white/5 rounded-2xl p-4 flex flex-col justify-between border border-white/5">
            <p className="text-xs font-bold text-gray-200 leading-relaxed text-right md:text-sm">
              "{sleepAzkar[activeZikrIndex].text}"
            </p>
            <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-indigo-400 text-right">
                💡 **الفضل**: {sleepAzkar[activeZikrIndex].virtue}
              </span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-gray-400 font-black">خطوة {activeZikrIndex + 1} من {sleepAzkar.length}</span>
                <button
                  onClick={() => {
                    const max = sleepAzkar[activeZikrIndex].count;
                    if (zikrCurrentCount < max) {
                      setZikrCurrentCount(zikrCurrentCount + 1);
                    } else {
                      setZikrCurrentCount(1);
                      if (activeZikrIndex < sleepAzkar.length - 1) {
                        setActiveZikrIndex(activeZikrIndex + 1);
                      } else {
                        setActiveZikrIndex(0); // reset
                      }
                    }
                  }}
                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] rounded-lg transition-all"
                >
                  قُرِئَ ({zikrCurrentCount}/{sleepAzkar[activeZikrIndex].count}) ✓
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-1.5">
              <button 
                onClick={() => {
                  setActiveZikrIndex((prev) => (prev > 0 ? prev - 1 : sleepAzkar.length - 1));
                  setZikrCurrentCount(1);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold"
              >
                السابق
              </button>
              <button 
                onClick={() => {
                  setActiveZikrIndex((prev) => (prev < sleepAzkar.length - 1 ? prev + 1 : 0));
                  setZikrCurrentCount(1);
                }}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold"
              >
                التالي
              </button>
            </div>

            {/* Simulated audio reader */}
            <button 
              onClick={() => setIsRecitingAudio(!isRecitingAudio)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all",
                isRecitingAudio 
                  ? "bg-amber-500 text-[#030308] animate-pulse" 
                  : "bg-white/5 text-indigo-300 hover:bg-white/10"
              )}
            >
              {isRecitingAudio ? <Pause className="w-3 h-3 text-indigo-950" /> : <Play className="w-3 h-3" />}
              {isRecitingAudio ? 'جاري الاستماع العذب...' : 'الاستماع للأذكار صوتاً'}
            </button>
          </div>

          {isRecitingAudio && (
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full transition-all duration-300" style={{ width: `${audioProgress}%` }} />
            </div>
          )}
        </div>

        {/* --- ANALYTICS AND METRICS --- */}
        <div className="bg-white/5 border border-white/5 p-5 rounded-[24px] space-y-4 text-right" dir="rtl">
          <div className="flex justify-between items-center flex-row-reverse">
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              إحصائيات وتحليل النوم العميق <Activity className="w-4 h-4 text-teal-400" />
            </h3>
            <div className="flex bg-white/5 p-1 rounded-xl">
              <button 
                onClick={() => setStatsTab('weekly')}
                className={cn("px-3 py-1 text-[9px] font-black rounded-lg transition-all", statsTab === 'weekly' ? "bg-indigo-500 text-white" : "text-gray-400")}
              >
                أسبوعي
              </button>
              <button 
                onClick={() => setStatsTab('monthly')}
                className={cn("px-3 py-1 text-[9px] font-black rounded-lg transition-all", statsTab === 'monthly' ? "bg-indigo-500 text-white" : "text-gray-400")}
              >
                شهري
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold text-gray-400 block mb-0.5">متوسط ساعات النوم</span>
              <span className="text-xl font-black text-indigo-400">{processedStats.avgHours}س</span>
              <span className="text-[9px] text-emerald-400 font-bold block mt-1">✓ يتطابق مع النسبة الصحية</span>
            </div>
            
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold text-gray-400 block mb-0.5">انتظام المواعيد</span>
              <span className="text-xl font-black text-teal-400">{processedStats.regularity}%</span>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-teal-400 h-full" style={{ width: `${processedStats.regularity}%` }} />
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold text-gray-400 block mb-0.5">تراكم ديون النوم</span>
              <span className="text-xl font-black text-rose-400">{processedStats.sleepDebt}س</span>
              <p className="text-[8px] font-black text-gray-400 mt-0.5">ساعات متأخرة يجب تعويضها</p>
            </div>

            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-bold text-gray-400 block mb-0.5">دورات النوم الكاملة (90د)</span>
              <span className="text-xl font-black text-amber-400">{processedStats.avgCycles} دورات</span>
              <p className="text-[8px] font-black text-gray-400 mt-0.5">معدل ممتاز لتنظيم خلايا الدماغ</p>
            </div>
          </div>

          {/* Optimal Bedtime Calculator */}
          <div className="bg-indigo-950/20 border border-indigo-500/10 p-3.5 rounded-2xl">
            <h4 className="text-xs font-black text-indigo-300 flex items-center justify-start gap-1 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> توقعات دورات النوم واقتراحات الاستيقاظ:
            </h4>
            <div className="space-y-1.5 text-[10px] font-bold text-gray-300 leading-relaxed">
              <p>• "لو نمت الآن، ستكملين دورة كاملة مريحة للاستيقاظ في تمام الساعة <span className="text-amber-400 font-bold">٦:٣٠ ص</span>."</p>
              <p>• "أفضل موعد للرنين التالي بناءً على تذبتب عمقك الفعلي = <span className="text-amber-400 font-bold">٦:٤٥ ص</span>."</p>
              {processedStats.sleepDebt > 0 && (
                <p className="text-rose-300">• "لديك دين نوم متراكم ({processedStats.sleepDebt}س)، احرصي على النوم باكراً اليوم بنصف ساعة."</p>
              )}
            </div>
          </div>
        </div>

        {/* --- AI CORRELATIONS CARD (OTHER APPS LINK) --- */}
        <div className="bg-gradient-to-tr from-purple-950/30 to-[#120B24]/40 border border-purple-500/10 p-4 rounded-[24px] space-y-3" dir="rtl">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-purple-300 uppercase tracking-widest px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
              {aiHealthCorrelationMessage.badge}
            </span>
            <span className="text-[10px] font-black text-purple-400 flex items-center gap-1 shrink-0">
              ترابط البيانات والذكاء الطبي الذكي <Brain className="w-3.5 h-3.5 text-purple-500" />
            </span>
          </div>
          <div>
            <h4 className="text-xs font-black text-white mb-1">{aiHealthCorrelationMessage.title}</h4>
            <p className="text-[10px] text-gray-300 font-bold leading-relaxed">{aiHealthCorrelationMessage.desc}</p>
          </div>
        </div>

        {/* --- DISTINCT MODULES: SMART NAP & BABY TIMER --- */}
        <div className="grid grid-cols-2 gap-3" dir="rtl">
          
          {/* Smart Nap Card */}
          <div className="bg-[#111A2E]/50 border border-indigo-500/10 p-4 rounded-[24px] flex flex-col justify-between space-y-3 text-right">
            <div>
              <div className="flex justify-between items-start flex-row-reverse mb-1">
                <span className="text-[9px] font-black text-indigo-400 block uppercase">استعادة الطاقة غداً</span>
                <Coffee className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-xs font-black text-white">القيلولة الذكية (٢٠ دقيقة)</h3>
              <p className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed">أكثر من ٢٠ دقيقة تسبب خمولاً عميقاً. النوم الخفيف ينشّط ذهنك.</p>
            </div>

            {napActive && (
              <div className="text-center bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                <span className="text-base font-black text-amber-400 tracking-wider font-mono">{formatNapTime(napTimeLeft)}</span>
              </div>
            )}

            <button 
              onClick={handleToggleNap}
              className={cn(
                "w-full h-10 rounded-xl font-black text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1",
                napActive 
                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" 
                  : "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
              )}
            >
              <Clock className="w-3 h-3" />
              {napActive ? 'إلغاء القيلولة' : 'بدء قيلولة ٢٠ دقيقة'}
            </button>
          </div>

          {/* Baby sleep Tracker Card */}
          <div className="bg-[#1B1124]/50 border border-purple-500/10 p-4 rounded-[24px] flex flex-col justify-between space-y-3 text-right">
            <div>
              <div className="flex justify-between items-start flex-row-reverse mb-1">
                <span className="text-[9px] font-black text-purple-400 block uppercase">أمهات المستقبل</span>
                <Baby className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-xs font-black text-white">متعقب نوم طفلك الرضيع</h3>
              <p className="text-[9px] text-gray-400 font-bold mt-1 leading-relaxed">قومي بالضغط عند مخلد الرضيع للنوم لرصد جودة نومه تلقائياً بالأجندة.</p>
            </div>

            {babySleeping && (
              <div className="text-center bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                <span className="text-[10px] font-bold text-purple-300">الطفل نائم الآن...</span>
              </div>
            )}

            <button 
              onClick={handleToggleBabySleep}
              className={cn(
                "w-full h-10 rounded-xl font-black text-[10px] transition-all active:scale-95 flex items-center justify-center gap-1",
                babySleeping 
                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-400" 
                  : "bg-purple-500/15 border border-purple-500/30 text-purple-300"
              )}
            >
              👶
              {babySleeping ? 'لقد صحى الرضيع' : 'الرضيع نائم الآن'}
            </button>
          </div>

        </div>

        {/* --- +++ أضيف بناءً على طلبك - مساعد تنظيم نوم الورديات ومحاربة الأرق +++ --- */}
        <div className="bg-gradient-to-br from-[#121829] to-[#0A0D18] border border-indigo-500/10 p-5 rounded-[28px] text-right space-y-4" dir="rtl">
          <div className="flex justify-between items-center flex-row-reverse">
            <span className="text-[10px] font-black tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
              مستشار الورديات ونوم الصباح والأرق 🦉
            </span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-[9px] font-black text-gray-400">إرشادات تفاعلية دقيقة</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-300 font-bold leading-relaxed">
            العمل ليلاً والنوم صباحاً يتطلب بروتوكولات مخصصة لخداع الساعة البيولوجية وتجنب الأرق المزمن والصداع.
          </p>

          <div className="border-t border-white/5 pt-3.5 space-y-3">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl flex-row-reverse">
              <div className="text-right">
                <span className="text-xs font-black text-white block">وضع العمل والورديات الليلية 🌙</span>
                <p className="text-[9px] text-gray-400 font-bold mt-0.5">فعّل هذا الوضع إذا كنت تعمل ليلاً وتنام صباحاً للحصول على إرشادات مكثفة.</p>
              </div>
              <button
                onClick={() => {
                  const newVal = !isNightShiftMode;
                  setIsNightShiftMode(newVal);
                  localStorage.setItem('is_night_shift_sleep', newVal ? 'true' : 'false');
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all active:scale-95",
                  isNightShiftMode ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/10" : "bg-white/5 text-gray-450 hover:bg-white/10"
                )}
              >
                {isNightShiftMode ? '🦉 وردية ليلية نشطة' : 'تفعيل'}
              </button>
            </div>

            {isNightShiftMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-2 text-right text-amber-200/90 leading-relaxed font-bold"
              >
                <div className="flex items-center justify-start gap-1 text-amber-400 font-black mb-1">
                  💡 بروتوكول الساعة البيولوجية لنوم الصباح الناجح:
                </div>
                <ul className="list-disc list-inside space-y-1.5 pr-1">
                  <li><strong className="text-white">فلترة الضوء الأزرق صباحاً:</strong> عند انتهاء نوبتك ليلاً، ارتدِ نظارات شمسية داكنة فوراً وتجنب ضوء الشمس المباشر أثناء العودة للمنزل، لأن الضوء يوقف إفراز الميلاتونين وتنبيه الدماغ.</li>
                  <li><strong className="text-white">قاعدة حظر الكافيين (2 AM):</strong> أوقف تماماً تناول القهوة أو الشاي قبل ٦ ساعات من موعد نومك المتوقع (مثلاً لا كافيين بعد الساعة ٢ بعد منتصف الليل إذا نمت في الـ ٨ صباحاً).</li>
                  <li><strong className="text-white">محاكاة الليل التامة:</strong> استخدم ستائر التعتيم الكامل (Blackout) وقناع عين قماشي سميك، وتجنب الشواحن واللمبات الحمراء والزرقاء تماماً في الغرفة.</li>
                  <li><strong className="text-white">برودة الجسد:</strong> خذ حماماً دافئاً ثم فاتراً قبل النوم، لأن انخفاض درجة حرارة الجسم الأساسية يؤهل عقلك للدخول التلقائي في النوم العميق حتى لو كان الجو نهاراً.</li>
                </ul>
              </motion.div>
            )}

            {/* Insomnia & 20-min Behavioral Rule */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2 text-right">
              <span className="text-[11px] font-black text-rose-300 block flex items-center justify-start gap-1">
                ⚠️ ماذا تفعل عند الإصابة بالأرق ومقاومة النوم؟ (قاعدة الـ ٢٠ دقيقة)
              </span>
              <p className="text-[10px] text-gray-300 font-bold leading-relaxed">
                إذا استلقيت لأكثر من <strong className="text-white">٢٠ دقيقة</strong> دون نوم، <strong className="text-rose-300">اغادر الفراش فوراً!</strong> الجلوس في السرير وأنت مستيقظ وقلق يربط عقلك لاشعورياً بأن الفراش هو مكان للتوتر والأرق.
              </p>
              <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                اذهب للجلوس في غرفة خافتة الإضاءة، وتصفح كتاباً حقيقياً أو مارس التنفس الإيقاعي، ولا تعد إلى فراشك إلا عندما تشعر بالنعاس الشديد.
              </p>
            </div>

            {/* --- Guided Breathing Box for Insomnia --- */}
            <div className="p-4 rounded-2xl bg-indigo-950/25 border border-indigo-500/20 text-center space-y-3 relative overflow-hidden">
              <div className="text-right">
                <span className="text-xs font-black text-white block">مُبدد الأرق: تمرين التنفس الإيقاعي 4-7-8 🌬️</span>
                <p className="text-[9px] text-gray-400 font-bold mt-0.5">تقنية عصبية لخفض نبضات القلب وإبطاء الموجات الدماغية من بيتا إلى ثيتا.</p>
              </div>

              {breathingStep === 'idle' ? (
                <div className="py-2">
                  <button
                    onClick={() => {
                      setBreathingStep('inhale');
                      setBreathingSecondsLeft(4);
                      setBreathingCycles(1);
                    }}
                    className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-center mx-auto block"
                  >
                    ابدأ دورة التنفس الآن 🧘
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 relative z-10">
                  {/* Pulse wave animation element driven by step */}
                  <div className="flex justify-center items-center h-20 relative">
                    <motion.div
                      animate={{
                        scale: breathingStep === 'inhale' ? [1, 2] : breathingStep === 'hold' ? 2 : [2, 1],
                        opacity: breathingStep === 'inhale' ? [0.4, 0.8] : breathingStep === 'hold' ? 0.8 : [0.8, 0.4]
                      }}
                      transition={{
                        duration: breathingStep === 'inhale' ? 4 : breathingStep === 'hold' ? 7 : 8,
                        ease: "easeInOut"
                      }}
                      className={cn(
                        "w-12 h-12 rounded-full absolute",
                        breathingStep === 'inhale' ? "bg-emerald-500/40" : breathingStep === 'hold' ? "bg-amber-400/40" : "bg-indigo-500/40"
                      )}
                    />
                    <div className="relative z-10 text-center">
                      <span className="text-lg font-black text-white block tracking-wide">
                        {breathingSecondsLeft}
                      </span>
                      <span className="text-[10px] font-black uppercase text-gray-200 block">ثانية متبقية</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className={cn(
                      "text-xs font-black block transition-colors",
                      breathingStep === 'inhale' ? "text-emerald-400" : breathingStep === 'hold' ? "text-amber-300" : "text-indigo-300"
                    )}>
                      {breathingStep === 'inhale' && '👃 خذ شهيقاً عميقاً وهادئاً من الأنف'}
                      {breathingStep === 'hold' && '🧘 احبس نفسك بسلام وهدوء'}
                      {breathingStep === 'exhale' && '💨 زفير طويل دافئ مفرغ لجميع توترات الكتف والرقبة'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 block">
                      الدورة التهدئية {breathingCycles} من أصل ٤ دورات متصلة
                    </span>
                  </div>

                  <button
                    onClick={() => setBreathingStep('idle')}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors cursor-pointer border border-rose-500/15"
                  >
                    إنهاء وإلغاء
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- TRAVEL MODE ADAPTER --- */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-[24px] flex justify-between items-center text-right flex-row-reverse" dir="rtl">
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-1">
              وضع السفر ومزامنة النطاق الزمني <MapPin className="w-3.5 h-3.5 text-rose-400" />
            </h4>
            <p className="text-[9px] text-gray-400 font-bold mt-0.5">يتكيف الجدول تلقائياً مع فارق توقيت سفرك الحالي لتفادي الأرق.</p>
          </div>
          <button 
            onClick={() => setTravelMode(!travelMode)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
              travelMode ? "bg-indigo-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
            )}
          >
            {travelMode ? 'السفر مفعل (GMT+2)' : 'تفعيل النمط'}
          </button>
        </div>

        {/* --- HISTORICAL LOGS --- */}
        <div className="space-y-3" dir="rtl">
          <h3 className="text-xs font-black text-gray-400 px-1 text-right">السجلات الأخيرة الموثقة</h3>
          {logs.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center">
              <span className="text-gray-400 text-xs font-bold block mb-1">لا توجد سجلات مسجلة بعد</span>
              <p className="text-[10px] text-gray-500">اضغطي زر "+" لإضافة ليلة نوم أولى وتتبع نمط استشفاء خلاياك.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const hrsL = Math.floor(log.durationMinutes / 60);
                const minsL = log.durationMinutes % 60;
                return (
                  <div key={log.id} className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex justify-between items-center text-right">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1.5 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 transition-all"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 text-right pr-3 border-r border-white/10 mr-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                          {log.type === 'baby' ? '🍼 نوم طفل رضيع' : log.type === 'nap' ? '☕ قيلولة شحن طاقة' : '💤 نوم أساسي متصل'}
                        </span>
                        <span className="text-[9px] font-black text-indigo-400">
                          {new Date(log.timestamp).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-black text-white">{hrsL}س {minsL}د</span>
                        <span className="text-[9px] font-bold text-amber-300">⭐ {log.quality}/٥ جودة</span>
                      </div>
                      {log.notes && (
                        <p className="text-[9px] text-gray-400 font-bold mt-1 max-w-xs">{log.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* FAB */}
      <div className="fixed bottom-24 left-6 z-40">
        <button 
          onClick={() => setIsAddingMode(true)}
          className={cn(
            "w-[60px] h-[60px] rounded-2xl flex items-center justify-center shadow-xl hover:-translate-y-1 transition-all active:scale-95 group text-[#030308]",
            isFastingMode ? "bg-amber-500 shadow-amber-500/20" : "bg-indigo-400 shadow-indigo-400/20"
          )}
        >
          <Plus className="w-8 h-8 transition-transform duration-300" strokeWidth={3}/>
        </button>
      </div>

      {/* Manual log modal */}
      <AnimatePresence>
        {isAddingMode && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setIsAddingMode(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-slate-900 border-t border-white/10 z-50 rounded-t-[32px] p-6 text-right pb-10 shadow-2xl"
              dir="rtl"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
              
              <h2 className="text-lg font-black mb-5 flex items-center justify-start gap-2 text-white">
                توثيق ليلة النوم الاستشفائية <Moon className="w-5 h-5 text-indigo-400" />
              </h2>

              <div className="space-y-4">
                
                {/* Bedtime & Waketime */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 block mb-1">وقت توديع الاستيقاظ 💤</label>
                    <input 
                      type="time" 
                      value={manualBedtime} 
                      onChange={(e) => setManualBedtime(e.target.value)} 
                      className="w-full h-11 bg-white/5 rounded-xl border border-white/5 text-center font-bold text-white text-sm" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 block mb-1">وقت فتح العينين 🌅</label>
                    <input 
                      type="time" 
                      value={manualWaketime} 
                      onChange={(e) => setManualWaketime(e.target.value)} 
                      className="w-full h-11 bg-white/5 rounded-xl border border-white/5 text-center font-bold text-white text-sm" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-1">إجمالي ساعات الاستلقاء الفعلي</label>
                  <div className="flex gap-4">
                     <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">ساعة</span>
                        <input 
                           type="number" value={hours} onChange={(e) => setHours(e.target.value)} 
                           className="w-full h-12 pr-4 pl-12 bg-white/5 border border-white/5 rounded-[16px] text-lg font-black text-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all text-center" 
                        />
                     </div>
                     <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">دقيقة</span>
                        <input 
                           type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} 
                           className="w-full h-12 pr-4 pl-12 bg-white/5 border border-white/5 rounded-[16px] text-lg font-black text-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all text-center" 
                        />
                     </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-2">تقييم جودة نومك (استشفاء ذهنك)</label>
                  <div className="flex justify-between gap-1 bg-white/5 p-2 rounded-[20px] mb-1" dir="ltr">
                     {[1, 2, 3, 4, 5].map((star) => (
                        <button 
                           key={star} 
                           type="button"
                           onClick={() => setQuality(star)}
                           className={cn("w-11 h-11 rounded-xl flex items-center justify-center transition-all text-lg",
                              quality >= star ? "bg-white/10 shadow transform scale-105" : "opacity-30"
                           )}
                        >
                           ⭐
                        </button>
                     ))}
                  </div>
                  <p className="text-center text-[10px] font-black text-indigo-400">
                     {quality === 1 ? 'سيء ومتقطع للغاية' : quality === 2 ? 'مضطرب وقليل البقاء' : quality === 3 ? 'مقبول لاسترداد الوعي' : quality === 4 ? 'مسترسل ومريح للغاية' : 'مثالي، نوم ملائكي عميق!'}
                  </p>
                </div>

                {/* Factors checkbox */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-2">مؤثرات تعرضت لها طيلة اليوم:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'coffee', label: 'قهوة متأخرة ☕' },
                      { key: 'stress', label: 'قلق وتفكير 🧠' },
                      { key: 'heat', label: 'حر شديد 🥵' },
                      { key: 'latemeal', label: 'أكل دسم 🍕' },
                      { key: 'noise', label: 'دوشة 🔊' },
                      { key: 'exercise', label: 'تمارين 🏋️' },
                      { key: 'fasting', label: 'ليلة صيام 🌙' },
                      { key: 'nightshift', label: 'شغل ليل/شيفت 💼' },
                      { key: 'insomnia', label: 'أرق وصعوبة نوم 😳' }
                    ].map((item) => {
                      const isSelected = selectedFactors.includes(item.label);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedFactors(selectedFactors.filter(f => f !== item.label));
                            } else {
                              setSelectedFactors([...selectedFactors, item.label]);
                            }
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                            isSelected 
                              ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" 
                              : "bg-white/5 border-transparent text-gray-400 hover:bg-white/10"
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 block mb-1">ملاحظات حرة</label>
                  <textarea 
                     value={notes} 
                     onChange={(e) => setNotes(e.target.value)} 
                     placeholder="مثال: أحلام غريبة، أرق الفجر، وعكة خفيفة..."
                     className="w-full h-16 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-white resize-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500" 
                  />
                </div>

              </div>

              <button 
                onClick={handleSaveSleepManual}
                disabled={!hours && !minutes}
                className="w-full h-13 mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> توثيق الليلة بالأجندة
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
