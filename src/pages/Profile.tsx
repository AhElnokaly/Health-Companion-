import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Activity, CheckCircle2, ChevronRight, Calendar, Ruler, Weight, Percent, Crown, BadgeCheck, Target, Moon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { profile, setProfile, isFastingMode } = useAppContext();
  const [name, setName] = useState(profile.name || '');
  // --- +++ أضيفت لتخصيص اسم الدلع والحالة الاجتماعية بناءً على طلبك +++ ---
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [maritalStatus, setMaritalStatus] = useState<'married' | 'single' | 'none'>(profile.maritalStatus || 'none');
  // ----------------------------------------------------
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender || 'male');
  const [dob, setDob] = useState(profile.dob || '');
  const [height, setHeight] = useState(profile.height?.toString() || '');
  const [weight, setWeight] = useState(profile.weight?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(profile.targetWeight?.toString() || '');
  const [targetSleep, setTargetSleep] = useState(profile.targetSleep?.toString() || '');
  const [bodyFat, setBodyFat] = useState(profile.bodyFatPercentage?.toString() || '');
  const [goals, setGoals] = useState<string[]>(profile.goals || []);
  const [showUpgrade, setShowUpgrade] = useState(!profile.isPro);
  
  const navigate = useNavigate();

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const calcAge = () => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const getMetrics = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const bf = parseFloat(bodyFat);
    const age = calcAge();
    
    let bmi = null;
    let bmr = null;
    let leanMass = null;

    if (h > 0 && w > 0) {
      bmi = (w / Math.pow(h / 100, 2)).toFixed(1);
    }
    if (w > 0 && h > 0 && age) {
      if (gender === 'male') {
        bmr = (10 * w + 6.25 * h - 5 * age + 5).toFixed(0);
      } else {
        bmr = (10 * w + 6.25 * h - 5 * age - 161).toFixed(0);
      }
    }
    if (w > 0 && bf > 0) {
      leanMass = (w * (1 - bf / 100)).toFixed(1);
    }
    
    return { bmi, bmr, leanMass };
  };

  const { bmi, bmr, leanMass } = getMetrics();

  const handleSave = () => {
    setProfile({ 
      ...profile,
      name, 
      // --- +++ أضيفت لتخزين اسم الدلع والحالة الاجتماعية بناءً على طلبك +++ ---
      nickname,
      maritalStatus,
      // --------------------------------------------------------
      gender,
      dob,
      height: height ? parseFloat(height) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
      targetSleep: targetSleep ? parseFloat(targetSleep) : undefined,
      bodyFatPercentage: bodyFat ? parseFloat(bodyFat) : undefined,
      goals
    });
    navigate(-1);
  };

  const upgradeToPro = () => {
     setProfile({ ...profile, isPro: true });
     setShowUpgrade(false);
  };

  // Helper to determine active border classes for unfinished fields
  const getFieldBorder = (val: any) => {
    if (!val) {
      return "border-2 border-rose-500/80 ring-4 ring-rose-500/10 focus:ring-rose-500";
    }
    return isFastingMode ? "border-white/5" : "border-[#F0EBE1] dark:border-white/5";
  };

  return (
    <div className={cn("min-h-[100dvh] p-6 pt-10 pb-28 text-right overflow-hidden transition-colors duration-1000",
       isFastingMode ? "text-amber-50 bg-[#1A1A1A]" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white"
    )}>
      <div className="flex justify-between items-center mb-8 flex-row-reverse">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white dark:bg-white/5 shadow-sm rounded-2xl flex items-center justify-center border border-[#F0EBE1] dark:border-white/5 active:scale-95 transition-all">
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-xl font-black">إعدادات الحساب</h1>
        {profile.isPro && (
           <div className="bg-amber-500/10 text-amber-500 font-bold text-[10px] px-3 py-1 rounded-full flex items-center gap-1 border border-amber-500/20">
              برو <BadgeCheck className="w-3 h-3" />
           </div>
        )}
      </div>

      {/* Warning Alert if Profile Is Incomplete */}
      {(!name || !dob || !height || !weight || !targetWeight || !targetSleep) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-950/40 text-right"
        >
          <span className="text-xs font-black text-rose-700 dark:text-rose-400 block mb-1">🚨 بيانات ناقصة ومميزة بالإطار الأحمر</span>
          <p className="text-[10px] text-rose-600 dark:text-rose-400/80 leading-relaxed">
            يرجى تعبئة الحقول التي تحتوي على إطار أحمر لمساعدة الـ AI على تقديم أدق استشارات صحية وحساب دايت مثالي لك.
          </p>
        </motion.div>
      )}

      <AnimatePresence>
         {showUpgrade && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-6 overflow-hidden">
               <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-500/20 border border-amber-300 relative">
                  <Crown className="absolute -left-4 -bottom-4 w-32 h-32 opacity-10" />
                  <div className="relative z-10 text-right">
                     <h3 className="font-black text-xl mb-2 flex items-center gap-2 justify-end">Life Companion Pro <Crown className="w-5 h-5" /></h3>
                     <p className="text-xs font-medium text-amber-50 leading-relaxed mb-4">اكتشف الإمكانيات الكاملة للمساعد الذكي! عائلات بلا حدود، تقارير PDF مفصلة، وقوائم غير محدودة للأدوية.</p>
                     <ul className="text-[10px] font-bold space-y-2 mb-6" dir="rtl">
                        <li className="flex items-center gap-2">✨ ذكاء اصطناعي طبي متقدم (بلا حدود)</li>
                        <li className="flex items-center gap-2">👨‍👩‍👧‍👦 مشاركة عائلية مفتوحة (الأساسي ٣ أفراد فقط)</li>
                        <li className="flex items-center gap-2">📄 تصدير تقارير صحية كاملة للطبيب (PDF)</li>
                     </ul>
                     <button onClick={upgradeToPro} className="w-full bg-white text-amber-600 font-black py-4 rounded-2xl shadow-md active:scale-95 transition-transform text-sm">
                        ترقية الحساب الآن مجاناً (تجريبي)
                     </button>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Personal Info Box */}
      <div className={cn("p-6 rounded-3xl shadow-sm border mb-6 space-y-6", 
         isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5"
      )}>
        <div>
           <h2 className="text-lg font-bold text-right text-gray-900 dark:text-white">المعلومات الشخصية</h2>
        </div>
        
        <div>
          <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">الاسم</label>
          <div className="relative text-right">
             <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
             <input 
               type="text" 
               value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="أدخل بريدك أو اسمك المفضل"
               className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                  isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white",
                  getFieldBorder(name)
               )}
               dir="rtl"
             />
          </div>
        </div>

        {/* --- +++ أضيفت خانة اسم الدلع بناءً على طلبك +++ --- */}
        <div>
          <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">
            اسم الدلع <span className="text-gray-400 font-normal">(اختياري - لمزيد من الترابط المشرق ومناداة دافئة)</span>
          </label>
          <div className="relative text-right">
             <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400/80" />
             <input 
               type="text" 
               value={nickname}
               onChange={(e) => setNickname(e.target.value)}
               placeholder="مثال: عزيزي، بوب، أميرتي"
               className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                  isFastingMode ? "bg-white/5 text-white border-white/5" : "bg-[#F3F6F9] dark:bg-white/5 border-[#F0EBE1] dark:border-white/5 text-gray-900 dark:text-white"
               )}
               dir="rtl"
             />
          </div>
        </div>
        {/* ---------------------------------------------------- */}

        <div>
          <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">تاريخ الميلاد</label>
          <div className="relative text-right">
             <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
             <input 
               type="date" 
               value={dob}
               onChange={(e) => setDob(e.target.value)}
               className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                  isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white",
                  getFieldBorder(dob)
               )}
               dir="rtl"
             />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">الجنس</label>
          <div className="grid grid-cols-2 gap-4 text-center">
              <button 
                 onClick={() => setGender('male')}
                 className={cn("h-16 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all",
                    gender === 'male' 
                      ? (isFastingMode ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-primary/10 border-primary text-primary")
                      : (isFastingMode ? "bg-white/5 border-transparent text-gray-400" : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500")
                 )}
              >
                 {gender === 'male' && <CheckCircle2 className="w-4 h-4" />}
                 ذكر
              </button>
              <button 
                 onClick={() => setGender('female')}
                 className={cn("h-16 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all",
                    gender === 'female' 
                      ? (isFastingMode ? "bg-rose-500/20 border-rose-500 text-rose-500" : "bg-rose-500/10 border-rose-500 text-rose-500")
                      : (isFastingMode ? "bg-white/5 border-transparent text-gray-400" : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500")
                 )}
              >
                 {gender === 'female' && <CheckCircle2 className="w-4 h-4" />}
                 أنثى
              </button>
          </div>
        </div>

        {/* --- +++ أضيفت خانة الحالة الاجتماعية بناءً على طلبك +++ --- */}
        <div>
          <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">
            الحالة الاجتماعية <span className="text-gray-400 font-normal">(اختياري)</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5 text-center" dir="rtl">
            <button
              type="button"
              onClick={() => setMaritalStatus('none')}
              className={cn("py-3 px-2 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1",
                maritalStatus === 'none'
                  ? (isFastingMode ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-primary/10 border-primary text-primary")
                  : (isFastingMode ? "bg-white/5 border-transparent text-gray-400" : "bg-[#F3F6F9] dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400")
              )}
            >
              <span>--</span>
            </button>
            <button
              type="button"
              onClick={() => setMaritalStatus('married')}
              className={cn("py-3 px-2 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1",
                maritalStatus === 'married'
                  ? (isFastingMode ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-[#1A4D42]/10 border-[#1A4D42] text-[#1A4D42] dark:text-[#38bdf8] dark:border-[#38bdf8]")
                  : (isFastingMode ? "bg-white/5 border-transparent text-gray-400" : "bg-[#F3F6F9] dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400")
              )}
            >
              <span>{gender === 'male' ? 'متزوج 💍' : 'متزوجة 💍'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMaritalStatus('single')}
              className={cn("py-3 px-2 rounded-2xl font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1",
                maritalStatus === 'single'
                  ? (isFastingMode ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400")
                  : (isFastingMode ? "bg-white/5 border-transparent text-gray-400" : "bg-[#F3F6F9] dark:bg-white/5 border-transparent text-gray-500 dark:text-gray-400")
              )}
            >
              <span>{gender === 'male' ? 'غير متزوج 👤' : 'غير متزوجة 👤'}</span>
            </button>
          </div>
        </div>
        {/* ---------------------------------------------------- */}

        {/* --- +++ أضيفت لتسهيل الوصول لمزامنة شريك الحياة بناءً على طلبك +++ --- */}
        {maritalStatus === 'married' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-4 rounded-2xl border text-right mt-3 flex items-center justify-between flex-row-reverse",
              isFastingMode ? "bg-amber-500/10 border-amber-500/20 text-white" : "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100/40 dark:border-white/5"
            )}
          >
            <div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block mb-1">💍 لوحة ربط شريك الحياة ومزامنة الأثير</span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">شارك الاسم وتاريخ الميلاد والبيانات الدورية عبر QR أو كاميرا المزامنة الفورية.</p>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/partner-sync')}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap ml-3"
            >
              افتح الربط الأوفلاين
            </button>
          </motion.div>
        )}
        {/* ------------------------------------------------------------------------ */}

        {/* --- +++ أضيفت لتسهيل الوصول لإعدادات التنبيهات الفائقة والعمل في الخلفية بناءً على طلبك +++ --- */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className={cn("p-4 rounded-2xl border text-right mt-3 flex items-center justify-between flex-row-reverse",
            isFastingMode ? "bg-stone-900 border-stone-800 text-white" : "bg-[#FAF5EE] dark:bg-stone-900/40 border-[#F5ECE0] dark:border-white/5"
          )}
        >
          <div>
            <span className="text-xs font-black text-[#E07A5F] block mb-1">🔔 مركز التنبيهات الفائقة والعمل بالخلفية</span>
            <p className="text-[10px] text-gray-505 dark:text-gray-400">تحكم وفعّل تذكيرات الدواء والمياه والأذكار التي تعمل بدون فتح التطبيق.</p>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/notifications-setup')}
            className="py-2.5 px-4 bg-[#E07A5F] hover:bg-[#c96d55] text-white font-extrabold text-[11px] rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap ml-3"
          >
            عِدّ التنبيهات الفائقة
          </button>
        </motion.div>
        {/* ------------------------------------------------------------------------------------ */}
      </div>

      {/* Corporal Measurements Box */}
      <div className={cn("p-6 rounded-3xl shadow-sm border mb-6", 
         isFastingMode ? "bg-[#1E2638] border-white/5" : "bg-white dark:bg-[#0c0c0c] border-[#F0EBE1] dark:border-white/5"
      )}>
        <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">القياسات الجسمانية</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">الطول (سم)</label>
            <div className="relative text-right">
               <Ruler className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
               <input 
                 type="number" 
                 value={height}
                 onChange={(e) => setHeight(e.target.value)}
                 placeholder="مثال: 172"
                 className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                    isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white",
                    getFieldBorder(height)
                 )}
                 dir="rtl"
               />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">الوزن (كجم)</label>
              <div className="relative text-right">
                 <Weight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                   type="number" 
                   value={weight}
                   onChange={(e) => setWeight(e.target.value)}
                   placeholder="مثال: 78"
                   className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                      isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white",
                      getFieldBorder(weight)
                   )}
                   dir="rtl"
                 />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">نسبة الدهون (%) - اختياري</label>
              <div className="relative text-right">
                 <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                   type="number" 
                   value={bodyFat}
                   onChange={(e) => setBodyFat(e.target.value)}
                   placeholder="مثال: 18"
                   className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                      isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white"
                   )}
                   dir="rtl"
                 />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">الوزن المرغوب (كجم)</label>
              <div className="relative text-right">
                 <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                   type="number" 
                   value={targetWeight}
                   onChange={(e) => setTargetWeight(e.target.value)}
                   placeholder="مثال: 70"
                   className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                      isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white",
                      getFieldBorder(targetWeight)
                   )}
                   dir="rtl"
                 />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 text-gray-500 dark:text-gray-400 text-right">ساعات النوم (متوسط)</label>
              <div className="relative text-right">
                 <Moon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                 <input 
                   type="number" 
                   value={targetSleep}
                   onChange={(e) => setTargetSleep(e.target.value)}
                   placeholder="مثال: 8"
                   className={cn("w-full h-14 pr-12 pl-4 rounded-2xl border focus:ring-2 focus:ring-primary transition-all font-bold text-sm text-right",
                      isFastingMode ? "bg-white/5 text-white" : "bg-[#F3F6F9] dark:bg-white/5 text-gray-900 dark:text-white",
                      getFieldBorder(targetSleep)
                   )}
                   dir="rtl"
                 />
              </div>
            </div>
          </div>
        </div>

        {(bmi || bmr || leanMass) && (
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10 grid grid-cols-3 gap-3">
            {bmi && (
              <div className="text-center">
                <span className="block text-[10px] text-gray-400 mb-1">BMI (المؤشر)</span>
                <span className="font-black text-sm block">{bmi}</span>
              </div>
            )}
            {leanMass && (
              <div className="text-center">
                <span className="block text-[10px] text-gray-400 mb-1">الكتلة اللادهنية</span>
                <span className="font-black text-sm block">{leanMass} كجم</span>
              </div>
            )}
            {bmr && (
              <div className="text-center">
                <span className="block text-[10px] text-gray-400 mb-1">معدل الحرق BMR</span>
                <span className="font-black text-sm block text-emerald-500">{bmr} کل</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Health goals */}
      <div className={cn("p-6 rounded-3xl shadow-sm border mb-6", 
         isFastingMode ? "bg-[#1E2638] border-white/5" : "bg-white dark:bg-[#0c0c0c] border-gray-100 dark:border-white/5"
      )}>
        <h2 className="text-lg font-bold mb-4 text-right">أهدافك الصحية</h2>
        <div className="grid grid-cols-2 gap-3" dir="rtl">
           {[
             { id: 'lose_weight', label: 'خسارة الوزن' },
             { id: 'better_sleep', label: 'تحسين جودة النوم' },
             { id: 'drink_water', label: 'شرب ماء أكثر' },
             { id: 'eat_healthy', label: 'أكل صحي' },
             { id: 'track_meds', label: 'متابعة الأدوية' },
             { id: 'family_health', label: 'صحة العائلة' },
           ].map((goalOption) => {
              const isSelected = goals.includes(goalOption.id);
              return (
                 <button 
                    key={goalOption.id}
                    onClick={() => toggleGoal(goalOption.id)}
                    className={cn("p-3 rounded-2xl border text-sm font-bold transition-all text-center",
                      isSelected 
                        ? (isFastingMode ? "bg-amber-500/20 border-amber-500 text-amber-500" : "bg-primary/10 border-primary text-primary")
                        : (isFastingMode ? "bg-white/5 border-transparent text-gray-400" : "bg-gray-50 dark:bg-white/5 border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700")
                    )}
                 >
                    {goalOption.label}
                 </button>
              )
           })}
        </div>
      </div>

      <div className={cn("p-6 rounded-3xl shadow-sm border mb-6 text-center", 
         isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5"
      )}>
        <h2 className="text-lg font-bold mb-2 text-right">اكتشفت عطل أو عندك اقتراح؟</h2>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed text-right">يهمنا جداً نسمع رأيك عشان نطور التطبيق ليناسبك أكتر ونصلح أي مشاكل.</p>
        <div className="flex flex-col gap-3">
           <a 
              href="https://wa.me/201009969653?text=السلام%20عليكم%20،%20عندي%20اقتراح%20بخصوص%20تطبيق%20صحتي" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full py-4 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-600 flex flex-row-reverse items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/15"
           >
              <span className="text-sm">تواصل عبر الواتساب (01009969653) 💬</span>
           </a>
           <a 
              href="mailto:Ah.Elnokaly@gmail.com?subject=اقتراح/مشكلة في التطبيق" 
              className={cn("w-full py-4 rounded-2xl font-bold flex flex-row-reverse items-center justify-center gap-2 transition-all active:scale-95", isFastingMode ? "bg-white/10 text-white" : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-200")}
           >
              <span className="text-sm">إرسال اقتراح عبر الإيميل ✉️</span>
           </a>
        </div>
      </div>

      <button 
         onClick={handleSave}
         className={cn("w-full h-16 rounded-2xl font-black text-sm text-white shadow-xl flex items-center justify-center transition-all active:scale-95",
            isFastingMode ? "bg-amber-500 shadow-amber-500/20" : "bg-[#1A4D42] shadow-[#1A4D42]/20"
         )}>
         حفظ البيانات
      </button>

      <p className="text-center text-xs text-gray-400 font-bold mt-8 px-4 leading-relaxed">
        المساعد الذكي هيتفاعل معاك بشكل مخصص بناءً على المعلومات دي، وهيقدر يحسب احتياجاتك بدقة.
      </p>

    </div>
  );
}
