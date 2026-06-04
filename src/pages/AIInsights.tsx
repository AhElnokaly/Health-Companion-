import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Bot, Loader2, ShieldCheck, Activity, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { generateOfflineSmarts } from '../lib/offlineSmarts';

import { cn } from '../lib/utils';

export default function AIInsights() {
  const { user } = useAuth();
  const { profile } = useAppContext();
  const isFemale = profile?.gender === 'female';
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [offlineInsights, setOfflineInsights] = useState<any[]>([]);

  useEffect(() => {
    // Generate offline smarts on load
    setOfflineInsights(generateOfflineSmarts(profile, new Date()));
  }, [profile]);

  const predefinedPrompts = [
    { title: 'تحليل شامل', desc: 'تحليل عاداتي الصحية وبناء خطة للتحسين', icon: ShieldCheck, color: 'text-rose-500' },
    { title: 'نصائح للنوم', desc: 'كيف يمكنني تحسين جودة نومي بناءً على بياناتي؟', icon: Activity, color: 'text-blue-500' },
  ];

  const handleAsk = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setResponse(null);
    setPrompt(text);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setResponse('مفتاح API غير متوفر في بيئة التشغيل. يرجى إضافته لتمكين التحليل المتقدم للذكاء الاصطناعي.');
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const promptContext = isFemale ? `
أنتِ "صديقتك الذكية" (AI Friend Companion).
تتحدثين كصديقة مقربة، لطيفة، محبة، وداعمة للمستخدمة وصيغة الكلام تكون للمؤنث.
تساعدينها في فهم صحتها النسائية، الهرمونات، التغذية، والمشاعر بطريقة متعاطفة وعلمية ومخصصة لها.

بيانات صديقتك الحالية (متوفرة محلياً):
الاسم: ${profile.name}
الوزن: ${profile.weight || 'غير محدد'}
الهدف المفضل: ${profile.goals?.join(', ')}

صديقتك تسأل:
${text}
      ` : `
أنت مستشار صحي ذكي (Health Companion AI). اسمك "المستشار الذكي"
ترد بأسلوب لطيف، محفز، ومختصر باللغة العربية.
أنت تساعد المستخدم في تحليل عاداته (نوم، ماء، تغذية، أدوية) وتقدم نصائح ذكية.

بيانات المستخدم الحالية (متوفرة محلياً):
الاسم: ${profile.name}
الوزن: ${profile.weight || 'غير محدد'}
الهدف المفضل: ${profile.goals?.join(', ')}

مستخدمك يسأل:
${text}
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptContext,
      });

      setResponse(result.text || 'حدث خطأ غير معروف');
    } catch (e: any) {
      console.error(e);
      setResponse('عذراً، حدث خطأ أثناء الاتصال بالمستشار الذكي: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 pt-10 min-h-full pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shadow-sm", isFemale ? "bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400" : "bg-primary/10 text-primary")}>
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="text-right flex-1">
          <h1 className={cn("text-2xl font-bold", isFemale ? "text-rose-600 dark:text-rose-400" : "text-gray-800 dark:text-white")}>{isFemale ? "صديقتك الذكية" : "المستشار الذكي"}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{isFemale ? "رفيقتك في مشوار الصحة والوعي" : "نصائح ومتابعة على مدار الساعة"}</p>
        </div>
      </div>

      {offlineInsights.length > 0 && (
        <div className="mb-8">
           <h2 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
             <Zap className="w-4 h-4 text-amber-500" />
             لمحات فورية (بدون اتصال)
           </h2>
           <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar snap-x rtl" dir="rtl">
             {offlineInsights.map((insight) => (
               <div key={insight.id} className="min-w-[240px] bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 snap-start shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{insight.icon}</span>
                    <h3 className="font-bold text-sm text-gray-800 dark:text-white">{insight.type === 'warning' ? 'تنبيه' : 'نصيحة'}</h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{insight.message}</p>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-8">
        {predefinedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(p.desc)}
            className="bg-white dark:bg-[#1A1A1A] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4 text-right transition-transform active:scale-95"
          >
            <div className={`w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 ${p.color}`}>
              <p.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-sm">{p.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/5 min-h-[250px] flex flex-col relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-800 dark:text-white animate-pulse">جاري التحليل السحابي...</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
          {!response && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-10">
              <Bot className="w-16 h-16 text-gray-400 mb-4" />
              <p className="font-medium text-gray-500">اسألني أي شيء عن صحتك وعاداتك</p>
            </div>
          )}
          {response && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
              <div className="flex gap-3 mb-2">
                <Bot className="w-6 h-6 text-primary shrink-0" />
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-2 whitespace-pre-wrap">
                  {response}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="relative mt-auto">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk(prompt)}
            placeholder="اسأل المستشار الذكي..."
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full py-4 px-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:text-white"
          />
          <button
            onClick={() => handleAsk(prompt)}
            disabled={!prompt.trim() || loading}
            className="absolute right-2 top-2 bottom-2 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md disabled:opacity-50"
          >
            <Send className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </div>
  );
}
