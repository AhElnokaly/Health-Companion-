import { useState, useEffect } from 'react';
import { Pill, Search, ShieldCheck, ChevronRight, Activity, Plus, ScanLine, Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

interface PharmacyItem {
  id: string;
  name: string;
  count: number;
  expiryDate: string;
  forSymptoms: string; // e.g. "headache, fever"
}

export default function HomePharmacy() {
  const navigate = useNavigate();
  const { isFastingMode } = useAppContext();
  const { user } = useAuth();
  
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'homePharmacy'));
    const un = onSnapshot(q, (snapshot) => {
      const parsed: PharmacyItem[] = [];
      snapshot.forEach(d => parsed.push({ id: d.id, ...d.data() } as PharmacyItem));
      setItems(parsed);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/homePharmacy`);
    });
    return () => un();
  }, [user]);

  const handleAskAI = async () => {
    if (!symptomInput.trim() || items.length === 0) return;
    setLoadingAI(true);
    setAiResponse(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      const inventory = items.map(i => `- ${i.name} (لأعراض: ${i.forSymptoms})`).join('\n');
      
      const prompt = `
أنت صيدلي خبير ومرشد طبي.
المريض يعاني من: "${symptomInput}"
الأدوية الموجودة في صيدلته المنزلية حالياً هي:
${inventory}

المطلوب إجابة JSON بالتنسيق التالي بدقة وبدون أي نص إضافي:
{
  "recommendation": "اسم أقرب دواء ممكن من الصيدلية المنزلية، أو 'لا يوجد'",
  "reason": "سبب اختيار الدواء وكيف يعالج العرض",
  "warning": "أي موانع أو تحذيرات لاستخدام الدواء، أو ماذا تفعل إذا لم يكن الدواء متاحاً"
}
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = result.text?.replace(/```json/g, '').replace(/```/g, '') || '{}';
      try {
        const parsed = JSON.parse(responseText);
        setAiResponse(parsed);
      } catch (e) {
        setAiResponse({ error: true, text: result.text });
      }
    } catch (error) {
       console.error(error);
       setAiResponse({ error: true, text: 'تعذر الاتصال بالمساعد.' });
    }
    setLoadingAI(false);
  };

  return (
    <div className={cn("min-h-[100dvh] pb-28 transition-colors duration-500", isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#F5F9F9] dark:bg-black text-gray-800 dark:text-gray-100")}>
      {/* Header */}
      <div className={cn("px-6 pt-10 pb-4 sticky top-0 z-30", isFastingMode ? "bg-[#1A1A1A] border-b border-[#3D3834]" : "bg-[#F5F9F9] dark:bg-black border-b border-[#E2E8E8] dark:border-white/5")}>
        <div className="flex items-center gap-4 flex-row-reverse">
          <button onClick={() => navigate(-1)} className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-colors active:scale-95", 
            isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 text-gray-500"
          )}>
             <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold flex-1 text-right flex items-center gap-2 justify-end">
            <Pill className="w-5 h-5 text-indigo-500" /> صيدلية المنزل
          </h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
         {/* Feature Explanation */}
         <div className={cn("rounded-[24px] p-5 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400")}>
            <h2 className="font-black text-lg mb-2">الصيدلي الذكي</h2>
            <p className="text-xs leading-relaxed opacity-90 mb-4">اكتب الأعراض اللي حاسس بيها، وهشوف في صيدليتك المنزلية الدوا المناسب لحالتك وأنبهك لو فيه تعارض.</p>
            
            <div className="relative">
               <input 
                 type="text" 
                 value={symptomInput}
                 onChange={(e) => setSymptomInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                 placeholder="مثال: عندي صداع وزكام جامد..."
                 className="w-full h-14 bg-black/20 border border-white/20 rounded-2xl px-4 pl-14 text-sm text-right placeholder-white/50 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                 dir="rtl"
               />
               <button 
                 onClick={handleAskAI}
                 disabled={loadingAI || !symptomInput || items.length === 0}
                 className="absolute left-2 top-2 bottom-2 bg-white text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg disabled:opacity-50 transition-all active:scale-95"
               >
                  {loadingAI ? <Activity className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
               </button>
            </div>
            
            {items.length === 0 && (
               <p className="text-[10px] text-amber-200 mt-3 flex items-center gap-1 justify-end">
                 <AlertTriangle className="w-3 h-3" /> مفيش أدوية مسجلة في صيدليتك لسه.
               </p>
            )}
         </div>

         {/* AI Results */}
         <AnimatePresence>
            {aiResponse && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-[24px] p-5 border shadow-soft flex flex-col text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5")}>
                 {aiResponse.error ? (
                    <p className="text-sm text-rose-500 font-bold">{aiResponse.text}</p>
                 ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4 justify-end">
                         <span className={cn("font-bold text-sm", aiResponse.recommendation === 'لا يوجد' ? "text-rose-500" : "text-emerald-500")}>نتيجـة الفحـص</span>
                         <ShieldCheck className={cn("w-5 h-5", aiResponse.recommendation === 'لا يوجد' ? "text-rose-500" : "text-emerald-500")} />
                      </div>
                      
                      <div className="space-y-4">
                         <div className={cn("p-4 rounded-2xl border", isFastingMode ? "bg-black/20 border-white/5" : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10")}>
                            <p className="text-[10px] text-gray-500 font-bold mb-1">الترشيح من المنزل</p>
                            <h3 className={cn("font-black text-lg", aiResponse.recommendation === 'لا يوجد' ? "text-rose-500" : "")}>{aiResponse.recommendation}</h3>
                         </div>
                         <div>
                            <p className="text-[10px] text-gray-500 font-bold mb-1">السبب / طريقة العمل</p>
                            <p className="text-sm font-medium leading-relaxed">{aiResponse.reason}</p>
                         </div>
                         <div>
                            <p className="text-[10px] text-rose-500 font-bold mb-1">تنبيهـات هامة</p>
                            <p className="text-xs bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 leading-relaxed font-bold">{aiResponse.warning}</p>
                         </div>
                      </div>
                    </>
                 )}
               </motion.div>
            )}
         </AnimatePresence>

         {/* Inventory List */}
         <div>
            <div className="flex justify-between items-center mb-4 flex-row-reverse text-right">
               <h3 className="font-bold text-sm">محتويات الصيدلية</h3>
               <button onClick={() => navigate('/add-medication')} className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full flex gap-1 items-center">
                  إضافة دواء <Plus className="w-4 h-4" />
               </button>
            </div>
            
            <div className="space-y-3 relative">
               {items.map(item => (
                 <div key={item.id} className={cn("flex justify-between items-center p-4 rounded-2xl border flex-row-reverse text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/5")}>
                    <div>
                       <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">{item.name}</h4>
                       <p className="text-[10px] font-bold text-gray-400">یعالج: {item.forSymptoms}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-black/20 p-2 rounded-xl text-center min-w-[60px] border border-gray-100 dark:border-white/5">
                        <span className="block text-xl font-black text-indigo-600 dark:text-indigo-400">{item.count}</span>
                        <span className="block text-[8px] text-gray-500 font-bold">قرص/عبوة</span>
                    </div>
                 </div>
               ))}
               {items.length === 0 && (
                 <div className="text-center py-10 bg-white dark:bg-[#1A1A1A] rounded-[24px] border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center">
                    <ScanLine className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm font-bold text-gray-400 mb-4">صيدليتك فاضية</p>
                    <button onClick={() => {
                        // Demo data
                        if (user) {
                           addDoc(collection(db, 'users', user.uid, 'homePharmacy'), { name: "بنادول إكسترا", count: 12, expiryDate: "2025-01-01", forSymptoms: "صداع، ألم، حرارة" });
                           addDoc(collection(db, 'users', user.uid, 'homePharmacy'), { name: "أنتينال", count: 8, expiryDate: "2026-03-01", forSymptoms: "إسهال، مطهر معوي" });
                           addDoc(collection(db, 'users', user.uid, 'homePharmacy'), { name: "جافيسكون", count: 1, expiryDate: "2025-12-01", forSymptoms: "حموضة، حرقان" });
                        }
                    }} className="text-xs font-bold text-indigo-500 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full active:scale-95 transition-transform">
                       أضف أدوية افتراضية (تجربة)
                    </button>
                 </div>
               )}
            </div>
         </div>
         
      </div>
    </div>
  );
}
