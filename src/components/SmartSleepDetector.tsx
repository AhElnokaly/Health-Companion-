import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Moon, X, Check, Briefcase, Clock, Sparkles, Smile, ArrowRight, BrainCircuit, Heart, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export function SmartSleepDetector({ isFastingMode }: { isFastingMode: boolean }) {
   const [showPopup, setShowPopup] = useState(false);
   const [sleepHoursDetected, setSleepHoursDetected] = useState(0);
   const [step, setStep] = useState<'question' | 'sleep_quality' | 'custom_sleep' | 'success'>('question');
   
   // --- أضيف بناءً على طلبك: حالات لحفظ واحتساب جودة وقيم النوم والعمل ---
   const [sleepQuality, setSleepQuality] = useState<string>('جيد');
   const [sleepQualityEmoji, setSleepQualityEmoji] = useState<string>('🙂');

   // أوقات مخصصة للنوم والاستيقاظ
   const [customBedtime, setCustomBedtime] = useState<string>('23:00');
   const [customWaketime, setCustomWaketime] = useState<string>('07:00');

   // تفاصيل شاشة النجاح والنصيحة الذكية
   const [successType, setSuccessType] = useState<'sleep' | 'work' | 'busy' | 'custom_sleep'>('sleep');
   const [summaryText, setSummaryText] = useState<string>('');
   const [adviceText, setAdviceText] = useState<string>('');
   const [displayHours, setDisplayHours] = useState<number>(0);

   const navigate = useNavigate();

   const triggerDemo = () => {
       // Mock للتجربة والفحص المباشر
       setSleepHoursDetected(7.5);
       setStep('question');
       setShowPopup(true);
   };

   // حساب التوقيت المناسب الافتراضي عند كشف النوم المخصص
   useEffect(() => {
      const now = new Date();
      const currentHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setCustomWaketime(currentHHMM);

      // وقت النوم الافتراضي = الحالي مطروح منه ساعات السكون المكتشفة
      const detectedMs = sleepHoursDetected * 60 * 60 * 1000;
      const bedtimeDate = new Date(now.getTime() - detectedMs);
      const bedtimeHHMM = `${bedtimeDate.getHours().toString().padStart(2, '0')}:${bedtimeDate.getMinutes().toString().padStart(2, '0')}`;
      setCustomBedtime(bedtimeHHMM);
   }, [sleepHoursDetected]);

   useEffect(() => {
      // إتاحة الدالة للتجربة المباشرة في الكونسول لتسهيل الاختبار والتعميق
      (window as any).triggerSleepPopup = triggerDemo;
      
      const checkIdleTime = () => {
         const lastActive = localStorage.getItem('last_active_time');
         const now = Date.now();
         if (lastActive) {
            const diffMs = now - parseInt(lastActive, 10);
            const diffHours = diffMs / (1000 * 60 * 60);

            // إذا غاب المستخدم ما بين 4 إلى 16 ساعة فإنه يتم تفعيل كاشف السكون
            if (diffHours >= 4 && diffHours < 16) {
               setSleepHoursDetected(Math.round(diffHours * 10) / 10);
               setStep('question');
               setShowPopup(true);
            }
         }
         localStorage.setItem('last_active_time', now.toString());
      };

      const handleVisibilityChange = () => {
         if (document.visibilityState === 'visible') {
            checkIdleTime();
         } else {
            localStorage.setItem('last_active_time', Date.now().toString());
         }
      };

      // الدورة المبدئية للتحقق
      checkIdleTime();

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
         document.removeEventListener('visibilitychange', handleVisibilityChange);
         delete (window as any).triggerSleepPopup;
      };
   }, []);

   // --- أضيف بناءً على طلبك: حساب الفارق الزمني بدقة متناهية ويتعامل مع منتصف الليل ---
   const calculateSleepDuration = (bedTimeStr: string, wakeTimeStr: string) => {
      if (!bedTimeStr || !wakeTimeStr) return 0;
      const [bHrs, bMins] = bedTimeStr.split(':').map(Number);
      const [wHrs, wMins] = wakeTimeStr.split(':').map(Number);
      
      let bMinTotal = bHrs * 60 + bMins;
      let wMinTotal = wHrs * 60 + wMins;
      
      if (wMinTotal <= bMinTotal) {
         // إذا كان الاستيقاظ مساوٍ أو أقل من وقت النوم فإنه يعني أنه يعبر منتصف الليل للبيات الصباحي
         wMinTotal += 24 * 60;
      }
      
      return wMinTotal - bMinTotal; // بالدقائق
   };

   // احتساب الساعات والدقائق للمخرجات الحية
   const customMinutesTotal = calculateSleepDuration(customBedtime, customWaketime);
   const customHoursVal = Math.floor(customMinutesTotal / 60);
   const customMinsVal = customMinutesTotal % 60;

   // --- أضيف بناءً على طلبك: دالة تسجيل ساعات النوم الفعلية (تلقائي أو مخصص) ---
   const handleSaveSleep = async (hoursToRecord: number, isCustom: boolean) => {
      try {
         const durationMins = isCustom ? customMinutesTotal : Math.round(hoursToRecord * 60);
         const now = Date.now();
         
         // إعداد التوقيتات للبادئة
         let startHHMM = '';
         let endHHMM = '';

         if (isCustom) {
            startHHMM = customBedtime;
            endHHMM = customWaketime;
         } else {
            const wakeDate = new Date();
            const bedDate = new Date(wakeDate.getTime() - (durationMins * 60 * 1000));
            
            const pad = (n: number) => n.toString().padStart(2, '0');
            startHHMM = `${pad(bedDate.getHours())}:${pad(bedDate.getMinutes())}`;
            endHHMM = `${pad(wakeDate.getHours())}:${pad(wakeDate.getMinutes())}`;
         }

         const payload = {
            durationMinutes: durationMins,
            quality: sleepQuality,
            notes: isCustom ? 'تم تعديله وتوثيقه يدوياً عبر منبه السكون الذكي 🛌' : 'تم اكتشافه وحفظه تلقائياً بواسطة كاشف سكون الهاتف الذكي 🌙',
            timestamp: now,
            dateStr: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
            bedtime: startHHMM,
            waketime: endHHMM,
            factors: ['هدوء', 'استرخاء'],
            type: 'sleep'
         };

         // حفظ محلي لسرعة الأداء والموثوقية الفائقة
         const localId = `local_${Date.now()}`;
         const saved = localStorage.getItem('local_sleep_logs');
         const list = saved ? JSON.parse(saved) : [];
         list.unshift({ id: localId, ...payload });
         localStorage.setItem('local_sleep_logs', JSON.stringify(list));
         
         // إرسال الإشعار لـ React لتحديث الرسوم البيانية والعدادات فوراً
         window.dispatchEvent(new Event('localSleepUpdated'));

         // حفظ سحابي في الخلفية بدون حجب واجهة المستخدم
         const user = auth.currentUser;
         if (user) {
            addDoc(collection(db, 'users', user.uid, 'sleepLogs'), payload).catch(e => {
               console.error("Firestore sync sleep background failed:", e);
            });
         }

         // جلب هدف النوم لحساب النصائح المفيدة
         const savedProfile = localStorage.getItem('user_profile');
         const parsedProfile = savedProfile ? JSON.parse(savedProfile) : {};
         const targetSleep = parsedProfile.targetSleep || 8;
         const finalHours = durationMins / 60;

         setDisplayHours(parseFloat(finalHours.toFixed(1)));
         setSuccessType(isCustom ? 'custom_sleep' : 'sleep');
         setSummaryText(`تم بنجاح تسجيل نحو ${finalHours.toFixed(1)} ساعة نوم مريحة.`);

         if (finalHours >= targetSleep) {
            setAdviceText(`رائع جداً! لقد نلتِ قسطاً كافياً ومثالياً من الاستشفاء والراحة اليوم. عقلك وجسمك الآن في حالة استعداد تام للإبداع وحرق السعرات بشكل طبيعي وصحي 🌸🚀.`);
         } else {
            const debt = (targetSleep - finalHours).toFixed(1);
            setAdviceText(`لقد نمتِ اليوم أقل من هدفكِ السلوكي بمقدار ${debt} ساعة. جربي أخذ قيلولة لا تزيد عن 20 دقيقة ظهراً، واحرصي على الخلود للنوم مبكراً الليلة لتجنب تشتت الذهن 😴💧.`);
         }

         setStep('success');
      } catch (err) {
         console.error("Error saving sleep log from popup:", err);
      }
   };

   // --- أضيف بناءً على طلبك: دالة تسجيل ساعات العمل (كنت في العمل) ---
   const handleSaveWork = () => {
      try {
         const checkoutStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
         const checkinDate = new Date(Date.now() - sleepHoursDetected * 60 * 60 * 1000);
         const checkinStr = checkinDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
         
         const newLogStatus = {
            id: `w_${Date.now()}`,
            date: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }),
            checkIn: checkinStr,
            checkOut: checkoutStr,
            hours: sleepHoursDetected.toFixed(1),
            tag: 'توثيق ذكي للاسترخاء 💼',
            timestamp: Date.now()
         };

         const localLogs = localStorage.getItem('local_work_history_logs');
         const parsedLogs = localLogs ? JSON.parse(localLogs) : [];
         parsedLogs.unshift(newLogStatus);
         localStorage.setItem('local_work_history_logs', JSON.stringify(parsedLogs));

         setDisplayHours(sleepHoursDetected);
         setSuccessType('work');
         setSummaryText(`تم بنجاح تسجيل ${sleepHoursDetected.toFixed(1)} ساعة عمل في الجزء المخصص للعمل بالرفيق الوظيفي.`);
         setAdviceText(`عمل دؤوب وممتاز! تذكري أن الجلوس الطويل يبطئ حركة الدوران الصغرى؛ ننصحكِ بشرب كوب من الماء البارد الآن والوقوف لعمل تمدد خفيف للظهر والكتفين لمدة دقيقة واحدة 💧🚶‍♀️.`);
         setStep('success');
      } catch (err) {
         console.error("Error saving work details from detector:", err);
      }
   };

   // --- أضيف بناءً على طلبك: دالة معالجة حالة الانشغال ---
   const handleSaveBusy = () => {
      setSuccessType('busy');
      setSummaryText('مرحبًا بعودتك الحافلة بالإنتاجية والصحة! 🌸');
      setAdviceText('لقد قمنا بتجاوز هذه الساعات دون تسجيل أي شيء. تذكري دائماً أن رفاهيتك وتبني العادات الصحية البسيطة هي الخطوة الحقيقية والأولى نحو السعادة والهدوء الداخلي ✨.');
      setStep('success');
   };

   if (!showPopup) return null;

   return (
      <AnimatePresence>
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 30 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 30 }}
               className={cn("w-full max-w-md rounded-[32px] p-6 shadow-2xl relative border overflow-hidden",
                  isFastingMode ? "bg-[#1A1A1A] text-white border-white/10" : "bg-white text-gray-900 border-gray-100"
               )}
               dir="rtl"
            >
               {/* زر الإغلاق المباشر */}
               <button 
                  onClick={() => setShowPopup(false)}
                  className="absolute top-4 left-4 p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
               >
                  <X className="w-4 h-4" />
               </button>

               {/* الشاشة الأولى: اختيار النشاط الرئيسي */}
               {step === 'question' && (
                  <div>
                     <div className="flex justify-center mb-4 mt-2">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-550 animate-pulse">
                           <Moon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                        </div>
                     </div>

                     <h2 className="text-xl font-black text-center mb-1">هل كنت نائماً؟ 🌙</h2>
                     <p className="text-xs text-center text-gray-500 dark:text-gray-450 mb-5 leading-relaxed">
                        لاحظنا هدوء استخدام هاتفك لقرابة <span className="font-extrabold text-indigo-500">{sleepHoursDetected} ساعة</span>.
                        كيف تقضي هذه الفترة لنوثقها بما يفيدك؟
                     </p>

                     <div className="flex flex-col gap-3">
                        {/* 1. كنت نائماً */}
                        <button 
                           onClick={() => {
                              setStep('sleep_quality');
                           }}
                           className="w-full p-3 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-[20px] font-bold text-sm flex items-center justify-between transition-all shadow-md shadow-indigo-500/20"
                        >
                           <div className="flex items-center gap-2.5">
                              <span className="text-xl">🌙</span>
                              <div className="flex flex-col items-start leading-tight">
                                 <span className="font-black text-xs text-right">نعم، كنت نائماً</span>
                                 <span className="text-[10px] opacity-80 font-medium">سجل {sleepHoursDetected} ساعة كاستشفاء ونوم</span>
                              </div>
                           </div>
                           <Check className="w-4 h-4 opacity-70" />
                        </button>

                        {/* 2. كنت في العمل */}
                        <button 
                           onClick={handleSaveWork}
                           className={cn("w-full p-3 rounded-[20px] font-bold text-sm flex items-center justify-between transition-all border active:scale-95",
                              isFastingMode ? "bg-[#2D2A2A] hover:bg-[#3D3A3A] border-white/5 text-slate-100" : "bg-teal-50/50 hover:bg-teal-50 border-teal-100/50 text-teal-800"
                           )}
                        >
                           <div className="flex items-center gap-2.5">
                              <span className="text-xl">💼</span>
                              <div className="flex flex-col items-start leading-tight">
                                 <span className="font-black text-xs text-right">كنت في العمل</span>
                                 <span className={cn("text-[10px] font-medium", isFastingMode ? "text-gray-400" : "text-teal-650/80")}>إضافتها لقسم الدوام والإنتاجية الصحي</span>
                              </div>
                           </div>
                           <Briefcase className={cn("w-4 h-4", isFastingMode ? "text-gray-400" : "text-teal-600")} />
                        </button>

                        {/* 3. كنت نائحاً لبعض الوقت */}
                        <button 
                           onClick={() => setStep('custom_sleep')}
                           className={cn("w-full p-3 rounded-[20px] font-bold text-sm flex items-center justify-between transition-all border active:scale-95",
                              isFastingMode ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-slate-50 hover:bg-slate-100 border-slate-150 text-gray-700"
                           )}
                        >
                           <div className="flex items-center gap-2.5">
                              <span className="text-xl">🛌</span>
                              <div className="flex flex-col items-start leading-tight">
                                 <span className="font-black text-xs text-right">نمت لبعض الوقت فقط</span>
                                 <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">تحديد الساعات بدقة (تعديل وقت النوم والاستيقاظ)</span>
                              </div>
                           </div>
                           <Clock className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* 4. كنت مشغولاً */}
                        <button 
                           onClick={handleSaveBusy}
                           className={cn("w-full p-2.5 rounded-[16px] font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-gray-500 dark:text-gray-400 hover:underline active:scale-95 bg-transparent border-0")}
                        >
                           <Sparkles className="w-3.5 h-3.5" />
                           كنت مشغولاً بالخارج (تجاوز الساعات)
                        </button>
                     </div>
                  </div>
               )}

               {/* الشاشة الثانية: اختيار جودة النوم لتعميق التحليل المكتسب */}
               {step === 'sleep_quality' && (
                  <div>
                     <div className="flex justify-center mb-4 mt-2">
                        <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-500">
                           <Smile className="w-7 h-7" />
                        </div>
                     </div>

                     <h2 className="text-lg font-black text-center mb-1">كيف تقيّمين جودة نومكِ؟ 🛌</h2>
                     <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-5">
                        جودة النوم تؤثر مباشرة على حيوية بشرتكِ وقدرة استقلاب الجسم.
                     </p>

                     <div className="grid grid-cols-1 gap-2.5 mb-5">
                        {[
                           { name: 'عميق وممتاز', label: 'ممتاز', emoji: '😃', desc: 'نمت بعمق واستيقظت بقمة النشاط' },
                           { name: 'طبيعي ومريح', label: 'جيد', emoji: '🙂', desc: 'جودة معتدلة ومستعدة لبدء اليوم' },
                           { name: 'متقطع ومتعب', label: 'متعب', emoji: '😫', desc: 'استيقاظ متكرر مع شعور ببعض الإرهاق' }
                        ].map((q) => (
                           <button
                              key={q.label}
                              onClick={async () => {
                                 setSleepQuality(q.label);
                                 setSleepQualityEmoji(q.emoji);
                                 // حفظ النوم مباشرة باستخدام هذا التقييم
                                 await handleSaveSleep(sleepHoursDetected, false);
                              }}
                              className={cn("flex items-center gap-3 p-3 rounded-[20px] border text-right transition-all hover:scale-[1.01] active:scale-95",
                                 isFastingMode ? "bg-[#252525] hover:bg-[#303030] border-white/10" : "bg-gray-50 hover:bg-gray-100 border-gray-150"
                              )}
                           >
                              <span className="text-2xl">{q.emoji}</span>
                              <div className="flex flex-col">
                                 <span className="font-black text-xs">{q.name}</span>
                                 <span className="text-[10px] text-gray-400">{q.desc}</span>
                              </div>
                           </button>
                        ))}
                     </div>

                     <div className="flex gap-2">
                        <button
                           onClick={() => setStep('question')}
                           className="flex-1 py-2.5 bg-gray-100 dark:bg-white/5 rounded-xl font-bold text-xs text-gray-500 dark:text-gray-450 hover:bg-gray-200 dark:hover:bg-white/10 border-0"
                        >
                           الرجوع للاختيارات
                        </button>
                     </div>
                  </div>
               )}

               {/* الشاشة الثالثة: مخصص لبعض الوقت - تحديد التوقيت لغايات الحساب */}
               {step === 'custom_sleep' && (
                  <div>
                     <div className="flex justify-center mb-3 mt-1">
                        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
                           <Clock className="w-6 h-6" />
                        </div>
                     </div>

                     <h2 className="text-lg font-black text-center mb-1">تحديد ساعات النوم بدقة 🩺</h2>
                     <p className="text-xs text-center text-gray-400 dark:text-gray-450 mb-4 leading-relaxed">
                        يرجى تدوين توقيت النوم والاستيقاظ الفعليين وسيقوم الرفيق بحساب المدة وصنع التقرير تلقائياً.
                     </p>

                     {/* مدخلات الوقت */}
                     <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-3.5 mb-4 border border-gray-150/50 dark:border-white/5">
                        <div className="flex justify-between items-center bg-white dark:bg-[#202020] p-2.5 rounded-xl">
                           <label className="text-xs font-black text-gray-500 dark:text-gray-400">وقت الخلود للنوم:</label>
                           <input 
                              type="time" 
                              value={customBedtime}
                              onChange={(e) => setCustomBedtime(e.target.value)}
                              className="bg-transparent text-sm font-bold text-right border-0 focus:outline-none text-indigo-500 focus:ring-0"
                           />
                        </div>

                        <div className="flex justify-between items-center bg-white dark:bg-[#202020] p-2.5 rounded-xl">
                           <label className="text-xs font-black text-gray-500 dark:text-gray-400">وقت الاستيقاظ:</label>
                           <input 
                              type="time" 
                              value={customWaketime}
                              onChange={(e) => setCustomWaketime(e.target.value)}
                              className="bg-transparent text-sm font-bold text-right border-0 focus:outline-none text-indigo-500 focus:ring-0"
                           />
                        </div>

                        {/* مؤشر الحسبة بدقة متناهية */}
                        <div className="text-center p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                           المدة المحسوبة: {customHoursVal} ساعة {customMinsVal > 0 ? `و ${customMinsVal} دقيقة` : ''} ⏳
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        <button
                           onClick={async () => {
                              // حفظ ساعات النوم المخصصة والذهاب مباشرة للنجاح
                              await handleSaveSleep(customMinutesTotal / 60, true);
                           }}
                           className="w-full py-3 bg-indigo-500 text-white hover:bg-indigo-600 rounded-[16px] font-black text-xs transition-colors shadow-md shadow-indigo-500/15 border-0"
                        >
                           توثيق النوم المخصص بنجاح ✓
                        </button>
                        <button
                           onClick={() => setStep('question')}
                           className="w-full py-2 bg-transparent text-gray-450 hover:text-gray-650 rounded-xl font-bold text-xs border-0"
                        >
                           تراجع
                        </button>
                     </div>
                  </div>
               )}

               {/* الشاشة الرابعة: الاحتفال بالنجاح والنصائح الصحية (التسجيل الذكي / العمل) */}
               {step === 'success' && (
                  <div className="text-center">
                     <div className="flex justify-center mb-4 mt-2">
                        {successType === 'sleep' || successType === 'custom_sleep' ? (
                           <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-bounce">
                              <Moon className="w-8 h-8 text-emerald-500 dark:text-emerald-450" />
                           </div>
                        ) : successType === 'work' ? (
                           <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-500">
                              <Briefcase className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                           </div>
                        ) : (
                           <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-500">
                              <Heart className="w-8 h-8 text-rose-500 dark:text-rose-450" />
                           </div>
                        )}
                     </div>

                     <h2 className="text-xl font-black mb-1.5">
                        {successType === 'sleep' || successType === 'custom_sleep' ? 'عافية وهناء! 🌙💤' : 
                         successType === 'work' ? 'طاقة وتركيز! 💻✨' : 'يوم مبارك ومنتج! 🌸'}
                     </h2>
                     <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed px-2 mb-4">
                        {summaryText}
                     </p>

                     {/* علبة التوجيهات الطبية والبدنية الصغرى */}
                     <div className={cn("rounded-2xl p-4 text-xs text-right font-medium leading-relaxed mb-6 border",
                        isFastingMode ? "bg-[#2A2A2A] border-white/5 text-gray-300" : "bg-slate-50 border-gray-150 text-gray-650"
                     )}>
                        <div className="flex gap-1.5 items-start mb-1 text-indigo-500 dark:text-indigo-400 font-black">
                           <BrainCircuit className="w-4 h-4 mt-0.5" />
                           <span>توجيه الرفيق الصحي الذكي:</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                           {adviceText}
                        </p>
                     </div>

                     <button 
                        onClick={() => {
                           setShowPopup(false);
                           setStep('question');
                        }}
                        className="w-full py-3 bg-[#C2185B] label-white hover:bg-[#A2154B] text-white rounded-[20px] font-black text-sm transition-colors shadow-lg shadow-[#C2185B]/20 border-0 cursor-pointer"
                     >
                        حسناً، متابعة يومي الممتاز 👍
                     </button>
                  </div>
               )}
            </motion.div>
         </div>
      </AnimatePresence>
   );
}
