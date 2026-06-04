import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChevronLeft, ChevronRight, Activity, Plus, CheckCircle, Target, Users, Droplet, Moon, Utensils } from 'lucide-react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, setProfile } = useAppContext();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [goals, setGoals] = useState<string[]>([]);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  
  const GOALS = [
     { id: 'lose_weight', label: 'خسارة الوزن', icon: Activity },
     { id: 'better_sleep', label: 'تحسين جودة النوم', icon: Moon },
     { id: 'drink_water', label: 'شرب ماء أكثر', icon: Droplet },
     { id: 'eat_healthy', label: 'أكل صحي', icon: Utensils },
     { id: 'track_meds', label: 'متابعة الأدوية', icon: CheckCircle },
     { id: 'family_health', label: 'صحة العائلة', icon: Users },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleComplete = async () => {
     if (!user) return;
     
     setProfile({ ...profile, 
        onboardingCompleted: true, 
        gender: gender || 'male',
        weight: weight ? parseFloat(weight) : undefined,
        height: height ? parseFloat(height) : undefined
     });
     navigate('/');

     try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const updates = {
           onboardingCompleted: true,
           gender: gender || 'male',
           age: age ? parseInt(age) : null,
           weight: weight ? parseFloat(weight) : null,
           height: height ? parseFloat(height) : null,
           goals: goals,
           updatedAt: Date.now()
        };
        
        if (!userDoc.exists()) {
           await setDoc(userRef, { ...updates, createdAt: Date.now() });
        } else {
           await setDoc(userRef, updates, { merge: true });
        }
     } catch (e) {
        console.error("Failed to save onboarding:", e);
     }
  };

  const handleSkip = () => {
     setProfile({ ...profile, onboardingCompleted: true });
     navigate('/');
  };

  const isFemale = gender === 'female';

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1A1A1A] flex flex-col justify-between text-gray-900 dark:text-white" dir="rtl">
      
      {/* Top Header */}
      <div className="p-8 pt-16 relative">
          <button 
             onClick={handleSkip}
             className="absolute top-16 left-8 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
             تخطي
          </button>
          <div className="flex gap-2 mb-8 justify-center">
             {[1,2,3].map(s => (
                <div key={s} className={cn("h-1.5 rounded-full transition-all duration-500", 
                   s === step ? "w-8 bg-emerald-500" : "w-1.5 bg-gray-200 dark:bg-gray-800"
                )} />
             ))}
          </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-8">
         <AnimatePresence mode="wait">
            {step === 1 && (
               <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <h1 className="text-3xl font-black mb-2">أهلاً بك في Health Companion 👋</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">عشان نقدم لك أفضل تجربة مخصصة ليك، محتاجين نعرف شوية تفاصيل صغيرة.</p>
                  
                  <div className="pt-6">
                     <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-3">الجنس</label>
                     <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setGender('male')} className={cn("py-4 rounded-2xl border-2 font-bold transition-all", gender === 'male' ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "border-gray-100 dark:border-gray-800 text-gray-500")}>
                           👨 ذكر
                        </button>
                        <button onClick={() => setGender('female')} className={cn("py-4 rounded-2xl border-2 font-bold transition-all", gender === 'female' ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "border-gray-100 dark:border-gray-800 text-gray-500")}>
                           👩 أنثى
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}

            {step === 2 && (
               <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <h1 className="text-3xl font-black mb-2">{isFemale ? 'معلوماتك الأساسية' : 'معلوماتك الأساسية'}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{isFemale ? 'هتساعدنا نحسب السعرات والماء بدقة ليكي.' : 'هتساعدنا نحسب السعرات والماء بدقة ليك.'}</p>
                  
                  <div className="space-y-4 pt-4 text-right">
                     <div>
                        <label className="text-xs font-bold text-gray-500 block mb-2">العمر</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="مثال: 30" className="w-full h-14 bg-white dark:bg-[#121415] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 font-bold text-left" dir="ltr" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-bold text-gray-500 block mb-2">الوزن (كجم)</label>
                           <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="مثال: 75" className="w-full h-14 bg-white dark:bg-[#121415] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 font-bold text-left" dir="ltr" />
                        </div>
                        <div>
                           <label className="text-xs font-bold text-gray-500 block mb-2">الطول (سم)</label>
                           <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="مثال: 175" className="w-full h-14 bg-white dark:bg-[#121415] border border-gray-100 dark:border-gray-800 rounded-2xl px-4 font-bold text-left" dir="ltr" />
                        </div>
                     </div>
                  </div>
               </motion.div>
            )}

            {step === 3 && (
               <motion.div key="step3" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <h1 className="text-3xl font-black mb-2">{isFemale ? 'أهدافك إيه؟' : 'أهدافك إيه؟'}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">اختار أهدافك عشان الذكاء الاصطناعي يركز عليها.</p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-4">
                     {GOALS.map(goal => (
                        <button 
                           key={goal.id} 
                           onClick={() => {
                              if (goals.includes(goal.id)) setGoals(goals.filter(g => g !== goal.id));
                              else setGoals([...goals, goal.id]);
                           }}
                           className={cn("p-4 rounded-2xl border-2 flex flex-col justify-center items-center gap-2 transition-all active:scale-95 text-center",
                              goals.includes(goal.id) ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "border-gray-100 dark:border-gray-800 text-gray-500 bg-white dark:bg-[#121415]"
                           )}
                        >
                           <goal.icon className="w-6 h-6 mb-1 opacity-80" />
                           <span className="text-xs font-bold">{goal.label}</span>
                        </button>
                     ))}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="p-8 pb-12 flex justify-between">
         <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handlePrev} 
            disabled={step === 1} 
            className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", step === 1 ? "opacity-0" : "bg-white dark:bg-white/5 shadow-sm text-gray-500")}
         >
            <ChevronRight className="w-6 h-6" />
         </motion.button>

         <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={step === 3 ? handleComplete : handleNext} 
            disabled={(step === 1 && !gender) || (step === 2 && (!weight || !height || !age)) || (step === 3 && goals.length === 0)}
            className="h-14 px-8 rounded-full bg-emerald-500 text-white font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:shadow-none bg-emerald-500"
         >
            {step === 3 ? 'ابدأ الآن' : 'التالي'}
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
         </motion.button>
      </div>

    </div>
  );
}
