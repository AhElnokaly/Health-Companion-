import { Settings, Bell, Globe, Moon, Clock, ArrowRight, ArrowLeft, Coffee, TreePalm, Calendar, Home, History, Zap, Trophy, Heart, Droplets, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function WorkLog() {
  const navigate = useNavigate();
  const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {day: 'numeric', month: 'long'}).format(new Date());
  
  // Real-time live digital clock
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  // State managers with localStorage persistence
  const [checkInTime, setCheckInTime] = useState<string | null>(() => localStorage.getItem('work_check_in_time'));
  const [checkOutTime, setCheckOutTime] = useState<string | null>(() => localStorage.getItem('work_check_out_time'));
  const [isWorking, setIsWorking] = useState<boolean>(() => localStorage.getItem('work_is_working') === 'true');
  const [elapsedHours, setElapsedHours] = useState<string>('0.0');
  const [tipCategory, setTipCategory] = useState<'water' | 'food' | 'stretch' | 'posture'>('water');

  // Load and calculate elapsed hours
  useEffect(() => {
    let interval: any;
    const calculateElapsed = () => {
      if (isWorking) {
        const startTimestamp = localStorage.getItem('work_check_in_timestamp');
        if (startTimestamp) {
          const elapsedMs = Date.now() - Number(startTimestamp);
          const hrs = elapsedMs / (1000 * 60 * 60);
          setElapsedHours(hrs.toFixed(1));
        }
      } else {
        const startTimestamp = localStorage.getItem('work_check_in_timestamp');
        const endTimestamp = localStorage.getItem('work_check_out_timestamp');
        if (startTimestamp && endTimestamp) {
          const elapsedMs = Number(endTimestamp) - Number(startTimestamp);
          const hrs = elapsedMs / (1000 * 60 * 60);
          setElapsedHours(hrs.toFixed(1));
        } else {
          setElapsedHours('0.0');
        }
      }
    };

    calculateElapsed();
    if (isWorking) {
      interval = setInterval(calculateElapsed, 10000); // Update every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isWorking]);

  const handleCheckIn = () => {
    const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    localStorage.setItem('work_check_in_time', nowStr);
    localStorage.setItem('work_check_in_timestamp', Date.now().toString());
    localStorage.setItem('work_is_working', 'true');
    localStorage.removeItem('work_check_out_time');
    localStorage.removeItem('work_check_out_timestamp');
    
    setCheckInTime(nowStr);
    setCheckOutTime(null);
    setIsWorking(true);
    
    // Save to global notifications/alerts list if any exists
    const localLogs = localStorage.getItem('local_work_history_logs');
    const parsedLogs = localLogs ? JSON.parse(localLogs) : [];
    const newLogStatus = {
      id: `w_${Date.now()}`,
      date: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }),
      checkIn: nowStr,
      checkOut: '--:--',
      hours: '0.0',
      tag: 'عمل اعتيادي',
      timestamp: Date.now()
    };
    parsedLogs.unshift(newLogStatus);
    localStorage.setItem('local_work_history_logs', JSON.stringify(parsedLogs));
  };

  const handleCheckOut = () => {
    if (!isWorking) return;
    const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    localStorage.setItem('work_check_out_time', nowStr);
    localStorage.setItem('work_check_out_timestamp', Date.now().toString());
    localStorage.setItem('work_is_working', 'false');
    
    setCheckOutTime(nowStr);
    setIsWorking(false);

    // Update the last work log in history
    const localLogs = localStorage.getItem('local_work_history_logs');
    if (localLogs) {
      const parsedLogs = JSON.parse(localLogs);
      if (parsedLogs.length > 0 && parsedLogs[0].checkOut === '--:--') {
        const startTimestamp = localStorage.getItem('work_check_in_timestamp');
        let calculatedHrs = '0.0';
        if (startTimestamp) {
          const elapsedMs = Date.now() - Number(startTimestamp);
          calculatedHrs = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
        }
        parsedLogs[0].checkOut = nowStr;
        parsedLogs[0].hours = calculatedHrs;
        localStorage.setItem('local_work_history_logs', JSON.stringify(parsedLogs));
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#121212] overflow-hidden text-right font-sans relative pb-32">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 bg-white dark:bg-[#121212] relative z-10 shadow-sm border-b border-gray-100 dark:border-white/5">
        <div className="flex gap-4 items-center">
            <button onClick={() => navigate(-1)} className="w-10 h-10 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-600">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-start bg-[#e2f1f4] dark:bg-[#1e2e33] px-3 py-1.5 rounded-xl text-[#0d5966] font-bold">
               <span className="text-sm border-b border-[#0d5966]/20 pb-0.5">رفيق الدوام الصحة 💼</span>
               <span className="text-[10px] tracking-widest uppercase">سجل العمل الصحي</span>
            </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500">
           <div className="relative">
              <Bell className="w-5 h-5 text-gray-450 hover:text-gray-700" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full"></span>
           </div>
           <History className="w-5 h-5 cursor-pointer text-gray-405 hover:text-indigo-500" onClick={() => navigate('/work-history')} />
           <Moon className="w-5 h-5 text-amber-500" />
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        
        {/* Main Gradient Card */}
        <motion.div initial={{scale: 0.95, opacity: 0}} animate={{scale: 1, opacity: 1}} className="rounded-[28px] p-5 text-white relative overflow-hidden bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E3A8A] shadow-xl border border-blue-500/10">
            {/* Decors */}
             <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             
             <div className="relative z-10 flex flex-col items-center text-center w-full mt-2">
                <div className="flex items-center justify-center gap-1.5 mb-1.5 opacity-95 text-blue-300">
                   {isWorking ? (
                     <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>أنت مسجل دخول للعمل حالياً</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full text-[10px] font-black">
                        <Moon className="w-3.5 h-3.5" />
                        <span>خارج أوقات العمل المسجلة</span>
                     </div>
                   )}
                </div>
                
                <h4 className="text-xs text-slate-400 font-bold mb-2">الساعة الحالية (تحديث حي)</h4>
                <div className="text-4xl leading-none font-black tracking-widest drop-shadow-md mb-4 text-[#F8FAFC]" dir="ltr">
                    {formatTime(liveTime)}
                </div>

                <div className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-3.5 flex justify-between items-center border border-white/10">
                   <div className="flex flex-col items-center justify-center pr-2 pl-3 border-l border-white/10 shrink-0">
                       <span className="text-lg font-black text-amber-400">{hijriDate.split(' ')[0]}</span>
                       <span className="text-[8px] font-bold opacity-95 text-slate-300">{hijriDate.split(' ').slice(1).join(' ')}</span>
                   </div>
                   <div className="flex-1 text-right text-[11px] font-bold leading-relaxed pr-3 text-slate-100">
                      {isWorking 
                        ? "نظام الحماية ومستشار العافية نشط الآن ويعطيك إشعارات بالماء والمشي والراحة لخدمتك وتخفيف الإجهاد المكتبي."
                        : "سجل حضورك للعمل الآن ليبدأ التطبيق بنصحك وإرشادك بجدول شرب المياه والوجبات الخفيفة والوقوف لتفادي الإجهاد!"}
                   </div>
                   <div className="px-1.5 text-blue-300 shrink-0">
                       <Zap className="w-5 h-5 animate-bounce" />
                   </div>
                </div>
             </div>
        </motion.div>

        {/* Small Tags */}
        <div className="flex justify-center gap-2">
            <div className="border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-full px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 flex-row-reverse shadow-xs">
                <Trophy className="w-3.5 h-3.5" />
                <span>برنامج الرعاية المكتبية نشط تلقائياً</span>
            </div>
            <div className="border border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 rounded-full px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5 flex-row-reverse shadow-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>ساعات مستهدفة: ٨ ساعات صحية</span>
            </div>
        </div>

        {/* Today's Details Card */}
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} transition={{delay: 0.1}} className="bg-white dark:bg-[#1A1A1A] rounded-[24px] p-5 shadow-xs border border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-white/5 pb-2 flex-row-reverse">
                <h3 className="font-bold text-xs flex items-center gap-1.5 flex-row-reverse text-gray-800 dark:text-white">
                   <Clock className="w-4 h-4 text-gray-500" />
                   سجل ساعات اليوم الموثقة
                </h3>
                <span className="text-[10px] text-gray-400 font-extrabold">الدوام المكتبي الفعلي</span>
            </div>
            
            <div className="flex justify-between items-center flex-row-reverse text-center divide-x divide-gray-100 dark:divide-white/5 divide-x-reverse">
                <div className="flex-1">
                   <div className="text-[9px] font-bold text-gray-400 mb-1.5">تسجيل دخول</div>
                   <div className="font-black text-sm tracking-wide text-indigo-500 dark:text-indigo-400">
                      {checkInTime || '--:--'}
                   </div>
                </div>
                <div className="flex-1">
                   <div className="text-[9px] font-bold text-gray-450 mb-1.5">تسجيل خروج</div>
                   <div className="font-black text-sm tracking-wide text-amber-550 dark:text-amber-400">
                      {checkOutTime || '--:--'}
                   </div>
                </div>
                <div className="flex-1">
                   <div className="text-[9px] font-bold text-gray-400 mb-1.5">الإجمالي الـيوم</div>
                   <div className="font-black text-base text-gray-800 dark:text-white">
                      <span className="text-emerald-500 font-black">{elapsedHours}</span>
                      <span className="text-[9px] mr-1 text-gray-400">س</span>
                   </div>
                </div>
                <div className="flex-1">
                   <div className="text-[9px] font-bold text-gray-400 mb-1.5">حالة الرطوبة</div>
                   <div className="font-black text-xs text-sky-500 flex items-center justify-center gap-0.5">
                      <Droplets className="w-3 h-3 animate-pulse" />
                      <span>{isWorking ? 'رعاية مستمرة' : 'خامل'}</span>
                   </div>
                </div>
            </div>
        </motion.div>

        {/* --- +++ أضيف بناءً على طلبك - قسم النصائح الصحية والغذائية الفورية التفاعلية لدعم العمل والتركيز +++ --- */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-[#FAF9F6] to-[#F1ECE4] dark:from-[#1E2024] dark:to-[#17191C] rounded-[28px] p-5 shadow-sm border border-amber-500/10 text-right space-y-4"
          dir="rtl"
        >
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                   <Sparkles className="w-4 h-4 text-amber-500" />
                </span>
                <div>
                   <h3 className="font-black text-sm text-gray-900 dark:text-white">رعايتك الصحية أثناء عملك حالياً 🧠🥤</h3>
                   <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">بناءً على طلبك - نصائح فورية دقيقة للترطيب والوقاية من الخمول المكتبي</p>
                </div>
             </div>
             {isWorking && (
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse">نظام النصائح نشط 🔥</span>
             )}
          </div>

          {/* Tips Navigation Tab Bar */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-gray-200/50 dark:bg-black/30 rounded-full text-center">
             <button 
               onClick={() => setTipCategory('water')}
               className={cn("py-1.5 rounded-full text-[10px] font-black transition-all", tipCategory === 'water' ? "bg-amber-500 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
             >
                الماء
             </button>
             <button 
               onClick={() => setTipCategory('food')}
               className={cn("py-1.5 rounded-full text-[10px] font-black transition-all", tipCategory === 'food' ? "bg-amber-500 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
             >
                الأكل
             </button>
             <button 
               onClick={() => setTipCategory('stretch')}
               className={cn("py-1.5 rounded-full text-[10px] font-black transition-all", tipCategory === 'stretch' ? "bg-amber-500 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
             >
                الحركة
             </button>
             <button 
               onClick={() => setTipCategory('posture')}
               className={cn("py-1.5 rounded-full text-[10px] font-black transition-all", tipCategory === 'posture' ? "bg-amber-500 text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
             >
                العينين
             </button>
          </div>

          <AnimatePresence mode="wait">
             {tipCategory === 'water' && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-sky-50 dark:bg-sky-950/20 p-4 rounded-2xl border border-sky-100 dark:border-sky-900/30 text-xs space-y-2 leading-relaxed"
                >
                   <p className="font-extrabold text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-sky-500 animate-bounce" />
                      ترطيب الدماغ ومكافحة الجفاف والصداع في العمل 💧
                   </p>
                   <p className="text-gray-650 dark:text-gray-300">
                      هل شربت ماء في الساعة الأخيرة؟ احتفظ دائماً بزجاجة ماء سعة لتر على مكتبك. 
                      الدراسات تبين أن الجفاف البسيط يقلل من التركيز والانتباه بنسبة <strong>٢٠٪</strong> ويسبب الصداع والخمول المؤقت.
                   </p>
                   <div className="p-2 bg-white/60 dark:bg-white/5 rounded-xl text-[10px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                      <span>💡 نصيحة مخصصة:</span>
                      <span>كلما أكملت ساعة عمل، اشرب كوب ماء لترطيب الكليتين وتحفيز الدورة الدموية.</span>
                   </div>
                </motion.div>
             )}

             {tipCategory === 'food' && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs space-y-2 leading-relaxed"
                >
                   <p className="font-extrabold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-emerald-500" />
                      الوجبات الخفيفة الذكية وتجنب خمول بعد الغداء (Food Coma) 🍎🥣
                   </p>
                   <p className="text-gray-650 dark:text-gray-300">
                      احرص على ألا تملأ بطنك بوجبة غداء ثقيلة ومكبوسة مسببة لمقاومة مؤقتة للإنسولين وهرمونات الخمول. 
                      استبدلها بسناك ذكي مثل <strong>علبة زبادي بلدي طبيعي</strong> أو <strong>زبادي يوناني سادة</strong> دايت مع رشة بذور كتان، أو موزة مع تفاحة لتغذية الدماغ واستقرار إنتاج السيروتونين والتركيز المستدام.
                   </p>
                   <div className="p-2 bg-white/60 dark:bg-white/5 rounded-xl text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <span>💡 وجبة عمل مقترحة:</span>
                      <span>سجل في مفكرة الأكل زبادي لايت وخيار أو تفاحة لتجنب عك الكربوهيدرات والكسر المفاجئ لطاقتك.</span>
                   </div>
                </motion.div>
             )}

             {tipCategory === 'stretch' && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-amber-50 dark:bg-amber-955/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-xs space-y-2 leading-relaxed"
                >
                   <p className="font-extrabold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                      <TreePalm className="w-4 h-4 text-amber-500" />
                      تنشيط الدورة الدموية ومقاومة التصلب العضلي 🧘‍♂️🏃‍♂️
                   </p>
                   <p className="text-gray-650 dark:text-gray-300">
                      الجلوس الطويل لأكثر من ساعة متواصلة يضع ضغطاً شديداً على فقرات الظهر السفلية والحوض ويحبط تدفق الدم. 
                      قف الآن لمدة دقيقة واحدة، لف كتفيك للخلف ٥ مرات، وقم بثني حوضك للأسفل لإعادة تمدد العضلات وتحفيز مستشعرات النشاط في شرايين الفخذين.
                   </p>
                   <div className="p-2 bg-white/60 dark:bg-white/5 rounded-xl text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <span>💡 تمرين مكتبي سريع:</span>
                      <span>احرص على الوقوف والحديث في التليفون بدلاً من الحديث وأنت جالس بالمقعد لزيادة معدل حرق السعرات اليومي.</span>
                   </div>
                </motion.div>
             )}

             {tipCategory === 'posture' && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-150 dark:border-indigo-900/30 text-xs space-y-2 leading-relaxed"
                >
                   <p className="font-extrabold text-indigo-800 dark:text-indigo-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-indigo-500 animate-bounce" />
                      حماية العينين من الأشعة الزرقاء وقاعدة 20-20-20 👁️💻
                   </p>
                   <p className="text-gray-650 dark:text-gray-300">
                      جفاف قرنية العين يزداد بسبب التحديق المستمر في شاشات الحواسيب المكتبيّة دون رمش كافٍ.
                      استخدم قاعدة <strong>٢٠-٢٠-٢٠</strong>: كل ٢٠ دقيقة انظر لشيء بعيد يبعد ٢٠ قدماً (٦ أمتار) لمدة ٢٠ ثانية لإراحة محاور الإبصار وتجنب الصداع والتشتت وضعف التركيز.
                   </p>
                   <div className="p-2 bg-white/60 dark:bg-white/5 rounded-xl text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <span>💡 نصيحة النظر والوهج:</span>
                      <span>تأكد من ضبط مستوى سطوع شاشتك بحيث لا يكون أسطع من الغرفة المحيطة بك لتجنب إجهاد العين.</span>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>
        </motion.div>

        {/* Action Grid for Check-In / Check-Out */}
        <div className="grid grid-cols-2 gap-3 pb-4">
             <button 
                onClick={handleCheckIn}
                disabled={isWorking}
                className={cn(
                  "border rounded-[20px] p-4 shadow-xs flex items-center justify-between flex-row-reverse active:scale-95 transition-all group",
                  isWorking 
                    ? "bg-gray-100 dark:bg-zinc-805/40 border-gray-100 opacity-60 cursor-not-allowed" 
                    : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/10"
                )}
             >
                <span className="font-black text-xs text-gray-800 dark:text-white">تسجيل دخول</span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm",
                  isWorking ? "bg-zinc-200 text-zinc-400" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white"
                )}>
                   <ArrowRight className="w-4 h-4" />
                </div>
             </button>

             <button 
                onClick={handleCheckOut}
                disabled={!isWorking}
                className={cn(
                  "border rounded-[20px] p-4 shadow-xs flex items-center justify-between flex-row-reverse active:scale-95 transition-all group",
                  !isWorking 
                    ? "bg-gray-100 dark:bg-zinc-805/40 border-gray-100 opacity-60 cursor-not-allowed" 
                    : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/10"
                )}
             >
                <span className="font-black text-xs text-gray-800 dark:text-white">تسجيل خروج</span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm",
                  !isWorking ? "bg-zinc-200 text-zinc-400" : "bg-orange-50 dark:bg-orange-550/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white"
                )}>
                   <ArrowLeft className="w-4 h-4" />
                </div>
             </button>

             <button className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-[20px] p-4 shadow-xs flex items-center justify-between flex-row-reverse active:scale-95 transition-transform group">
                <span className="font-black text-xs text-gray-800 dark:text-white">إذن/نصف يوم</span>
                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                   <Clock className="w-4 h-4" />
                </div>
             </button>
             <button className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-[20px] p-4 shadow-xs flex items-center justify-between flex-row-reverse active:scale-95 transition-transform group">
                <span className="font-black text-xs text-gray-800 dark:text-white">تسجيل إجازة</span>
                <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                   <TreePalm className="w-4 h-4" />
                </div>
             </button>
        </div>
      </div>

      {/* Floating Bottom Navigation */}
      <nav className="absolute mb-6 mx-5 bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-2xl border border-gray-100 dark:border-white/5 py-4 px-6 shadow-xl shadow-gray-200/40 dark:shadow-none rounded-full z-40">
          <div className="flex justify-between items-center h-8">
              <button onClick={() => navigate('/spiritual')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <span className="text-[9px] font-bold">العبادات</span>
              </button>
              <button onClick={() => navigate('/timetable')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <Calendar className="w-5 h-5" />
                  <span className="text-[9px] font-bold">التقويم</span>
              </button>
              <button onClick={() => navigate(-1)} className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 scale-110 drop-shadow-md">
                  <Home className="w-6 h-6" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold">الرئيسية</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => navigate('/work-history')}>
                  <History className="w-5 h-5" />
                  <span className="text-[9px] font-bold">السجل</span>
              </button>
          </div>
      </nav>
    </div>
  );
}
