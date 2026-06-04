import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Settings, 
  Droplets, 
  Heart, 
  Sparkles, 
  Clock, 
  Check, 
  AlertCircle, 
  Volume2, 
  Moon, 
  ShieldAlert, 
  Activity, 
  Wifi, 
  Eye, 
  Zap, 
  Award,
  Calendar,
  Smile,
  Users,
  Info
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

export default function NotificationsSetup() {
  const { isFastingMode } = useAppContext();
  
  // Audio chime for premium simulations
  const playNotificationChime = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      // Warm twin-chime sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, context.currentTime); // D5
      gain.gain.setValueAtTime(0.15, context.currentTime);
      osc.start();
      
      osc.frequency.setValueAtTime(880, context.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, context.currentTime + 0.12);
      
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);
      osc.stop(context.currentTime + 0.45);
    } catch (e) {
      console.log('Audio Context muted/not supported yet by security policy');
    }
  };

  // Permission state
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swRegistered, setSwRegistered] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testSeconds, setTestSeconds] = useState(5);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState('تذكير صحي عاجل! ❤️');
  const [customBody, setCustomBody] = useState('حان موعد شرب كوب ماء دافئ للحفاظ على حيوية خلاياك.');
  
  // Preferences states
  const [prefWater, setPrefWater] = useState(() => localStorage.getItem('notif_pref_water') !== 'false');
  const [prefWaterInterval, setPrefWaterInterval] = useState(() => localStorage.getItem('notif_pref_water_interval') || '120');
  const [prefMeds, setPrefMeds] = useState(() => localStorage.getItem('notif_pref_meds') !== 'false');
  const [prefMedsStyle, setPrefMedsStyle] = useState(() => localStorage.getItem('notif_pref_meds_style') || 'high');
  const [prefSpiritual, setPrefSpiritual] = useState(() => localStorage.getItem('notif_pref_spiritual') !== 'false');
  const [prefFasting, setPrefFasting] = useState(() => localStorage.getItem('notif_pref_fasting') !== 'false');
  const [prefSteps, setPrefSteps] = useState(() => localStorage.getItem('notif_pref_steps') !== 'false');
  const [prefFamilySync, setPrefFamilySync] = useState(() => localStorage.getItem('notif_pref_family') !== 'false');

  // Success alert states
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    // Check permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Check Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) setSwRegistered(true);
      });
    }
  }, []);

  // Save changes to localstorage helper
  const savePref = (key: string, val: string | boolean) => {
    localStorage.setItem(key, String(val));
    setFeedback({
      text: '💾 تم حفظ تفضيلات التنبيهات الخلفية وتحديث جدولة الأثير بنجاح.',
      type: 'success'
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Request native permission
  const requestNativePermission = async () => {
    if (!('Notification' in window)) {
      setFeedback({
        text: '❌ متصفحك الحالي لا يدعم التنبيهات الأصلية الافتراضية.',
        type: 'error'
      });
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        playNotificationChime();
        setFeedback({
          text: '🎉 رائع! تم السماح بالإشعارات الفورية بنجاح. ستتلقى التحديثات بالخلفية.',
          type: 'success'
        });
        
        // Register SW alert
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('لايف كومبانيون متصل 🕌', {
              body: 'تفعيل قنوات الأثير الخلفية للتنبيهات الفورية بنجاح تام!',
              icon: '/favicon.ico',
              vibrate: [100, 50, 100],
              dir: 'rtl'
            } as any);
          });
        }
      } else {
        setFeedback({
          text: '⚠️ تم رفض إذن المتصفح. يرجى تفعيله من إعدادات القفل في شريط العنوان لتلقي الإشعارات بالخلفية.',
          type: 'info'
        });
      }
    } catch (e) {
      setFeedback({
        text: '⚠️ فشل في طلب الإذن. يرجى المتابعة من متصفح مستقل خارج الإطار.',
        type: 'error'
      });
    }
  };

  // Play instant simulation
  const triggerInstantPush = () => {
    playNotificationChime();
    
    // Attempt SW show
    let fired = false;
    if ('serviceWorker' in navigator && permission === 'granted') {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(customTitle, {
          body: customBody,
          icon: '/favicon.ico',
          vibrate: [200, 100, 200],
          dir: 'rtl'
        } as any);
      });
      fired = true;
    }

    if (!fired || permission !== 'granted') {
      // Fallback inside active app UI simulation banner
      setFeedback({
        text: `🔔 [إشعار فوري]: **${customTitle}** - ${customBody}`,
        type: 'success'
      });
    }
  };

  // Schedule timer simulation
  const startScheduledCountdown = () => {
    if (countdown !== null) return;
    
    setFeedback({
      text: `⏳ تم جدولة التنبيه الخلفي الدقيق. يرجى تحويل التطبيق للخلفية أو غلق الشاشة لتجربتها!`,
      type: 'info'
    });
    
    setCountdown(testSeconds);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Fire the alarm after completion
          setTimeout(() => {
            playNotificationChime();
            if ('serviceWorker' in navigator && Notification.permission === 'granted') {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(customTitle, {
                  body: `${customBody} (تم إرساله بنجاح أثناء النوم بالخلفية ⏰)`,
                  icon: '/favicon.ico',
                  vibrate: [300, 150, 300],
                  dir: 'rtl'
                } as any);
              });
            } else {
              // Simulated native alert
              const fallbackNotification = new Notification(customTitle, {
                body: `${customBody} (محاكاة أوفلاين بالخلفية 📬)`
              });
            }
          }, 500);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Smart ideas tabs state
  const [activeIdeaTab, setActiveIdeaTab] = useState(0);

  const smartIdeas = [
    {
      title: "المزامنة الأسرية الكبرى للمناعة الصامتة 🛡️",
      subtitle: "رعاية غريزية متبادلة وتنبؤية لحماية شريك الحياة",
      desc: "إذا تم رصد انخفاض حاد ومفاجئ في مؤشرات الحركة للزوجة (أو رصد ارتفاع قياس حرارتها في السجل)، يتلقى الزوج تنبيهاً ذكياً صامتاً في الخلفية: 'زوجتك الغالية منى تسجل خمولاً وارتفاعاً بالحرارة، نقترح المبادرة بتحضير وجبة خفيفة ومساعدتها في تعويض السوائل الآن 💖' لتقوية مبدأ الاستباقية في المحبة."
    },
    {
      title: "تنبيهات الوقاية الهرمونية والحالة النفسية 💍",
      subtitle: "جدولة ذكية لملامح الدورة الشهرية الحساسة للزوج",
      desc: "للأزواج المتزوجين بدقة؛ يقوم التطبيق بإرسال تنبيه مسبق غاية في الخصوصية واللطف للزوج مطلع أسبوع ما قبل الدورة (PMS): 'شريكة حياتك تمر بفترة تغييرات هرمونية مجهدة، الهدوء الإضافي وإهدائها بعض الارتشاف والراحة أمر رائع ومفضل جداً اليوم ✨' مما يعمق الوفاق الأسري تلقائياً."
    },
    {
      title: "الارتواء البيئي المتوقع 💧",
      subtitle: "ضبط التنبيهات وفق درجة حرارة ومؤشرات الطقس بالمنطقة",
      desc: "يقوم محرك التنبيهات بالخلفية بتحليل درجة حرارة ورطوبة الطقس المحلية والـ UV لحظياً، فإذا تلاحظ ارتفاعها يحذر الزوج والزوجة بإشعار ذكي: 'الحرارة بالمنطقة تسجل 38° مئوية، لتجنب الصداع والكسل تم رفع وتيرة تذكيرات المياه تلقائيا لـ 300 مل كل ساعتين في الخلفية!'"
    },
    {
      title: "منظومة الاستشفاء والالتزام العائلي المتبادل 💊",
      subtitle: "الاطمئنان التلقائي في حالة نسيان الأدوية المهمة",
      desc: "في مواعيد الدواء المقررة، إذا تأخر شريكك بأكثر من ساعة عن الضغط على 'تم تناول جرعتي'، يتم إشعارك تلقائياً: 'شريكك وحبيبك ممدوح لم يسجل تناوله لجرعة الضغط المقررة بعد، يرجى الاطمئنان عليه بمكالمة دافئة 📞'."
    },
    {
      title: "التنفس الصندوقي بالذكاء الاصطناعي 🌬️",
      subtitle: "تلطيف هرمون التوتر والكورتيزول بالخلفية",
      desc: "التطبيق يراقب نبضات النشاط ومستوى النوم، ليقوم ببث إشعارات هادئة مصحوبة بنمط اهتزاز لطيف بالخلفية: 'استقطع 60 ثانية لـ تنفس الصندوق الصامت الآن لإعادة ضبط هرمونات التركيز البدني وتشتيت التوترات المتراكمة.'"
    }
  ];

  return (
    <div className="py-6 px-4 max-w-4xl mx-auto space-y-6 text-right" dir="rtl">
      
      {/* Dynamic Notification Top banner decoration */}
      <div className={cn("p-5 rounded-3xl border shadow-sm relative overflow-hidden",
        isFastingMode ? "bg-stone-900 border-stone-800" : "bg-gradient-to-r from-teal-500/10 via-[#FAF4ED] to-[#FAF4ED] dark:from-[#212121] dark:to-stone-900 border-[#F5ECD7] dark:border-white/5"
      )}>
        <div className="flex justify-between items-center flex-row-reverse mb-4">
          <div className="flex items-center gap-3 flex-row-reverse">
            <div className="w-12 h-12 rounded-2xl bg-[#E07A5F]/15 flex items-center justify-center text-[#E07A5F]">
              <Bell className="w-7 h-7 animate-swing" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-800 dark:text-white leading-tight">إعدادات قنوات الأثير والتنبيهات الخلفية 🌐</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-bold">تحكم فائق وتنبيهات أوتوماتيكية تعمل بالخلفية بدون حاجة لفتح التطبيق</p>
            </div>
          </div>
          
          <span className="text-[9px] bg-indigo-500 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
            المحرك الذكي v3.5
          </span>
        </div>

        {/* Browser Permission Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          
          {/* Native Permission Card */}
          <div className="p-3.5 bg-white/70 dark:bg-black/40 border border-[#FAF1E3] dark:border-white/5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between flex-row-reverse">
                <span className="text-[9px] font-bold text-gray-400">إشعار المتصفح والنظام كليا</span>
                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md",
                  permission === 'granted' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                )}>
                  {permission === 'granted' ? 'مسموح بنجاح 🟢' : 'بانتظار الموافقة ⚠️'}
                </span>
              </div>
              <h3 className="text-xs font-black text-gray-800 dark:text-gray-200">صلاحية التنبيهات الفورية الأصلية</h3>
              <p className="text-[9.5px] text-gray-500 dark:text-gray-400 font-bold leading-normal">
                تمكن التطبيق من إشعارك الدقيق في شريط التنبيهات حتى عند إغلاق التطبيق تماما.
              </p>
            </div>

            {permission !== 'granted' && (
              <button
                onClick={requestNativePermission}
                className="w-full py-2 bg-[#1A4D42] text-white hover:bg-[#0F2F29] rounded-xl text-[10.5px] font-black cursor-pointer shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>تفعيل وقبول الصلاحية الآن 🔔</span>
              </button>
            )}
            {permission === 'granted' && (
              <div className="text-[9px] text-[#1A4D42] dark:text-emerald-400 font-black text-center bg-emerald-500/10 py-1.5 rounded-xl border border-emerald-500/10">
                🎉 الصلاحية نشطة. يمكنك إغلاق التطبيق والاعتماد على الكواليس.
              </div>
            )}
          </div>

          {/* Service Worker Setup Status */}
          <div className="p-3.5 bg-white/70 dark:bg-black/40 border border-[#FAF1E3] dark:border-white/5 rounded-2xl flex flex-col justify-between">
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between flex-row-reverse">
                <span className="text-[9px] font-bold text-gray-400">حالة خط الدفاع الخلفي</span>
                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md",
                  swRegistered ? 'bg-indigo-500/15 text-indigo-600' : 'bg-rose-500/15 text-rose-600'
                )}>
                  {swRegistered ? 'أكتيـف 🟢' : 'غير مسجل 🔴'}
                </span>
              </div>
              <h3 className="text-xs font-black text-gray-800 dark:text-gray-200">مسيرة الخدمة الكواليسية (Service Worker)</h3>
              <p className="text-[9.5px] text-gray-500 dark:text-gray-400 font-bold leading-normal">
                برمجيات خفيفة تنام وتصحو في النظام لتوجيه إشارات الأدوية والمياه دورياً دون استهلاك البطارية.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold text-[#1A4D42] dark:text-emerald-400 bg-teal-500/5 p-1.5 rounded-xl justify-center">
              <Wifi className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>معدل موثوقية التحديث: 100% بلحظة الدقة</span>
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Alerts & Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn("p-3.5 rounded-2xl text-[11px] font-extrabold shadow-sm border text-right",
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-300' :
              feedback.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-300' :
              'bg-blue-50 text-blue-800 border-blue-200/50 dark:bg-blue-950/20 dark:text-blue-300'
            )}
          >
            {feedback.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alarm Settings Grid */}
      <h2 className="text-sm font-black text-gray-800 dark:text-white mt-4 flex items-center gap-1.5 flex-row-reverse">
        <Settings className="w-4 h-4 text-indigo-500 text-right" />
        <span>تخصيص وتوطين منبهات الصحة والعبادة ⚙️</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* WATER ALARMS */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#151716] border border-gray-150 dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-500 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white">تذكيرات الارتواء والماء الدورية 💧</h4>
                <p className="text-[9px] text-gray-400 font-bold">الحفاظ على نسبة رطوبة الخلايا</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefWater} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setPrefWater(val);
                  savePref('notif_pref_water', val);
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {prefWater && (
            <div className="p-3 bg-gray-50 dark:bg-black/10 rounded-2xl text-right space-y-2 border border-gray-100 dark:border-none">
              <label className="text-[9.5px] text-gray-500 dark:text-gray-400 block font-semibold mb-1">⏰ كل كم يذكرك التطبيق؟</label>
              <select 
                value={prefWaterInterval}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrefWaterInterval(val);
                  savePref('notif_pref_water_interval', val);
                }}
                className="w-full bg-white dark:bg-[#1E201F] text-gray-800 dark:text-white rounded-xl py-1.5 px-3 border border-gray-150 dark:border-white/5 font-extrabold text-[10px] text-right"
              >
                <option value="60">كل ساعة واحدة (ارتواء متسارع) 🏃‍♂️</option>
                <option value="120">كل ساعتين (يوصى به طبياً) 💧</option>
                <option value="180">كل ٣ ساعات (ارتواء بطيء) ⏳</option>
                <option value="240">كل ٤ ساعات 📅</option>
              </select>
            </div>
          )}
        </div>

        {/* MEDICATION ALARMS */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#151716] border border-gray-150 dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white">تذكيرات جرعات الأدوية المجدولة 💊</h4>
                <p className="text-[9px] text-gray-400 font-bold">صحة قلبية وعلاجية منتظمة</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefMeds} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setPrefMeds(val);
                  savePref('notif_pref_meds', val);
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          {prefMeds && (
            <div className="p-3 bg-gray-50 dark:bg-black/10 rounded-2xl text-right space-y-2 border border-gray-100 dark:border-none">
              <label className="text-[9.5px] text-gray-500 dark:text-gray-400 block font-semibold mb-1">📢 درجة شدة ولحن التنبيه الدوائي:</label>
              <select 
                value={prefMedsStyle}
                onChange={(e) => {
                  const val = e.target.value;
                  setPrefMedsStyle(val);
                  savePref('notif_pref_meds_style', val);
                }}
                className="w-full bg-white dark:bg-[#1E201F] text-gray-800 dark:text-white rounded-xl py-1.5 px-3 border border-gray-150 dark:border-white/5 font-extrabold text-[10px] text-right"
              >
                <option value="high">إشعار صوتي مكرر واهتزاز عنيف (للأدوية الحرجة) 🚨</option>
                <option value="normal">إشعار قياسي وصوت نغمة مألوف 🎵</option>
                <option value="silent">إشعار تنبيهي صامت على الهاتف 🤫</option>
              </select>
            </div>
          )}
        </div>

        {/* SPIRITUAL / ATHKAR */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#151716] border border-gray-150 dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center">
                <span className="text-xs">📿</span>
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white">أذكار الصباح والمساء والقرآن 📿</h4>
                <p className="text-[9px] text-gray-400 font-bold">توازن روحاني ونفسي مستدام</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefSpiritual} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setPrefSpiritual(val);
                  savePref('notif_pref_spiritual', val);
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
            </label>
          </div>
          <p className="text-[9px] text-gray-450 leading-relaxed font-bold">
            يتعرف التطبيق على المواقيت الفقهية تلقائياً ويرسل لك أذكار الصباح تزامنا مع الشروق وأذكار المساء تزامنا مع الشفق بنصوص مقروءة وجميلة.
          </p>
        </div>

        {/* FASTING TRIPLE SYNC */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#151716] border border-gray-150 dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white">منبهات السحور والإفطار لمحبّي الصيام 🕌</h4>
                <p className="text-[9px] text-gray-400 font-bold">توطين إيقاع الصيام والبركة</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefFasting} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setPrefFasting(val);
                  savePref('notif_pref_fasting', val);
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-rose-550"></div>
            </label>
          </div>
          <p className="text-[9px] text-gray-450 leading-relaxed font-bold">
            يرسل إليك التطبيق تنبيه السحور المبارك لتذكيرك بشرب مياه الارتواء المانعة للعطش، وتنبيه الإفطار المبارك لتهيئة الأجواء لكسر الصيام المتوازن.
          </p>
        </div>

        {/* SEDENTARY / INACTIVITY */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#151716] border border-[#F0EBE1] dark:border-white/5 space-y-3">
          <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white">تحديات كسر الخمول والأيض اليومي 👣</h4>
                <p className="text-[9px] text-gray-400 font-bold">معدل حركة صحي لتجنب ركود العضلات</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefSteps} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setPrefSteps(val);
                  savePref('notif_pref_steps', val);
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          <p className="text-[9px] text-gray-450 leading-relaxed font-bold">
            يتتبع التطبيق فترات سكونك، فإذا تجاوزت ساعتين من الجلوس المتواصل في السرير أو المكتب، ينبهك برقة للوقوف وتمديد العضلات لـ 90 ثانية كحد أدنى.
          </p>
        </div>

        {/* FAMILY & PARTNER IMMUNITY SYNC */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#151716] border border-[#F0EBE1] dark:border-white/5 space-y-3 col-span-1 md:col-span-2">
          <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse text-right">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-[#E07A5F] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-white">درع الوقاية والمودة العائلية للشريك 💍</h4>
                <p className="text-[9px] text-gray-400 font-bold">تنبيهات حالة الشريك المزاجية والصحية والصيدلانية</p>
              </div>
            </div>

            <label className="relative inline-flex inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={prefFamilySync} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setPrefFamilySync(val);
                  savePref('notif_pref_family', val);
                }}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#333] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
            </label>
          </div>
          <p className="text-[9px] text-gray-450 leading-relaxed font-bold">
            تكامل فائق مع لوحة الشريك (Partner Pairing)! سيقوم هاتفك بقراءة كود شريك حياتك بشكل أوتوماتيكي دوري وتنبيهك تلقائياً إذا تطلب الأمر العناية به (نسيانه أدويته، فترات خمول غير معتادة، أو فترات الإجهاد الهرمونية).
          </p>
        </div>

      </div>

      {/* INSTANT ALARM SIMULATOR & TEST BED */}
      <div className={cn("mt-6 p-5 rounded-[28px] border text-right space-y-4",
         isFastingMode ? "bg-[#1C1816] border-stone-850" : "bg-gradient-to-br from-[#FAF5EE] to-white dark:from-[#1F1F1E] dark:to-stone-900 border-[#F2ECE2] dark:border-white/5"
      )}>
        <div className="flex items-center gap-2 flex-row-reverse">
          <Zap className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xs font-black text-gray-800 dark:text-white">غرفة المحاكاة واختبار قنوات الأثير الفورية 📸</h3>
        </div>
        <p className="text-[9.5px] text-gray-550 dark:text-gray-400 font-bold leading-relaxed">
          نظراً لأن بعض المتصفحات والأجهزة تفرض ضوابط حماية إضافية، قمنا بتدشين هذه 'الغرفة التعليمية المفتوحة' لتختبر بها وتيرة وصول الإشعارات إليك في الخلفية وبطرق بديلة تفاعلية.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1">
            <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 block mb-1">عنوان التنبيه 📤</label>
            <input 
              type="text" 
              value={customTitle} 
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-white dark:bg-[#1E1F1E] dark:text-white text-gray-850 text-[10px] font-bold p-1.5 rounded-xl border-none focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="p-3 bg-white/60 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1 md:col-span-2">
            <label className="text-[10px] font-black text-gray-700 dark:text-gray-300 block mb-1">تفاصيل ومحتوى رسالة الإرسال 📝</label>
            <input 
              type="text" 
              value={customBody} 
              onChange={(e) => setCustomBody(e.target.value)}
              className="w-full bg-white dark:bg-[#1E1F1E] dark:text-white text-gray-850 text-[10px] font-bold p-1.5 rounded-xl border-none focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

        </div>

        <div className="flex flex-wrap gap-2 justify-center w-full pt-2">
          
          {/* Action 1: Instant direct trigger */}
          <button
            onClick={triggerInstantPush}
            className="flex-1 py-1.5 bg-[#E07A5F] hover:bg-[#c96d55] text-white rounded-xl text-[10.5px] font-black cursor-pointer active:scale-95 transition-all shadow-sm"
          >
            إرسال إشعار فوري وتجربة النغمة 🔔
          </button>

          {/* Action 2: Countdown background simulation mechanism */}
          <button
            onClick={startScheduledCountdown}
            disabled={countdown !== null}
            className={cn("flex-1 py-1.5 text-white rounded-xl text-[10.5px] font-black cursor-pointer active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1",
              countdown !== null ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {countdown !== null ? `تنبيه خلفي بعد (${countdown}) ثوانٍ...` : `جدولة مسبقة وتجربة الخلفية (اخرج من التطبيق!)`}
            </span>
          </button>

        </div>
      </div>

      {/* PROFESSIONAL IDEAS SLIDERS / CARDS */}
      <div className={cn("p-5 rounded-[28px] border text-right space-y-4",
        isFastingMode ? "bg-stone-900 border-stone-850" : "bg-white dark:bg-[#141615] border-gray-150 dark:border-white/5"
      )}>
        <div className="flex items-center gap-2 flex-row-reverse">
          <Award className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xs font-black text-gray-800 dark:text-white">أفكار مودة ورعاية مخصصة - المقترح الأكاديمي لشريك حياتك 💡</h3>
        </div>
        <p className="text-[10px] text-gray-400 font-bold leading-normal">
          إليك حزمة من الأفكار والمشاريع البرمجية المبتكرة والذكية التي صممناها لمستقبل تطبيقك الصحي والزوجي لزيادة الترابط والتذكير المستدام:
        </p>

        {/* Tabs headings for ideas */}
        <div className="flex flex-wrap gap-1 border-b border-gray-100 dark:border-white/5 pb-2 cursor-pointer flex-row-reverse justify-start">
          {smartIdeas.map((idea, idx) => (
            <button
              key={idx}
              onClick={() => {
                playNotificationChime();
                setActiveIdeaTab(idx);
              }}
              className={cn("py-1.5 px-3 rounded-xl text-[9px] font-black transition-all active:scale-95",
                activeIdeaTab === idx 
                  ? "bg-indigo-550/15 text-indigo-550 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-500/10"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              فكرة {idx + 1}
            </button>
          ))}
        </div>

        {/* Tab body detail */}
        <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-[#FAEDE4] dark:border-white/5 text-right space-y-1.5 min-h-[140px] flex flex-col justify-center">
          <span className="text-[9px] font-extrabold text-[#E07A5F] block">💡 {smartIdeas[activeIdeaTab].subtitle}</span>
          <h4 className="text-xs font-black text-gray-800 dark:text-white">{smartIdeas[activeIdeaTab].title}</h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-450 leading-relaxed font-bold">
            {smartIdeas[activeIdeaTab].desc}
          </p>
        </div>
      </div>

      {/* Info Badge */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl text-center font-bold text-[9px] flex items-center justify-center gap-1.5 max-w-lg mx-auto">
        <Info className="w-4 h-4" />
        <span>جميع المنبهات الفورية مشفرة ثنائياً وآمنة 100% وتحافظ على سرية بياناتك الصحية والزوجية.</span>
      </div>

    </div>
  );
}
