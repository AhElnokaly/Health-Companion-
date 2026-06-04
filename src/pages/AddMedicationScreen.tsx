import { 
  ChevronRight, Camera, Search, Plus, Save, Activity, Pill, History, Calendar, 
  AlertCircle, Sparkles, Upload, Loader2, Clock, Check, CheckCircle2, HeartPulse 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

// Preset small transparent PNG image so we don't send huge data for dry runs
const PLACEHOLDER_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export default function AddMedicationScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFastingMode } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'schedule' | 'prn'>('schedule');
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('اقراص');
  const [frequencyPerDay, setFrequencyPerDay] = useState(2);
  const [frequencyUnit, setFrequencyUnit] = useState<'day' | 'week' | 'month'>('day');
  const [instruction, setInstruction] = useState('بعد الاكل');
  const [inventory, setInventory] = useState('30');
  const [maxInventory, setMaxInventory] = useState('60');
  const [duration, setDuration] = useState('مستمر');
  const [durationDays, setDurationDays] = useState('10');
  const [durationValue, setDurationValue] = useState('4');
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('months');
  const [autoAddShoppingList, setAutoAddShoppingList] = useState(true);
  const [forWho, setForWho] = useState(''); // empty string means "self"
  const [isCritical, setIsCritical] = useState(false);
  const [packageNotes, setPackageNotes] = useState('');
  
  // Custom Alarm Times
  const [alarmTimes, setAlarmTimes] = useState<string[]>(['09:00', '21:00']);

  // Dynamic warnings extracted via search or manually
  const [warnings, setWarnings] = useState<{level: 'yellow' | 'orange' | 'red'; title: string; desc: string}[]>([]);

  // Page States
  const [familyMembers, setFamilyMembers] = useState<{id: string, name: string}[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Drug Search State
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // AI OCR Prescription Scanner State
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [scannedMeds, setScannedMeds] = useState<any[]>([]);
  const [scannedNotes, setScannedNotes] = useState('');
  const [showOCRResult, setShowOCRResult] = useState(false);
  const [ocrError, setOcrError] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'family_members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mems: {id: string, name: string}[] = [];
      snapshot.forEach(doc => {
        mems.push({ id: doc.id, name: doc.data().name });
      });
      setFamilyMembers(mems);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync alarmTimes list when frequency changes
  useEffect(() => {
    if (activeTab === 'prn') {
      setAlarmTimes([]);
      return;
    }
    const defaultTimes = ['08:00', '14:00', '20:00', '23:00', '06:00'];
    const count = frequencyPerDay;
    const currentList = [...alarmTimes];
    
    if (currentList.length < count) {
      // Add missing
      for (let i = currentList.length; i < count; i++) {
        currentList.push(defaultTimes[i % defaultTimes.length]);
      }
    } else if (currentList.length > count) {
      // Remove excess
      currentList.splice(count);
    }
    setAlarmTimes(currentList);
  }, [frequencyPerDay, activeTab]);

  const handleTimeChange = (index: number, val: string) => {
    const updated = [...alarmTimes];
    updated[index] = val;
    setAlarmTimes(updated);
  };

  // Web Search Grounding for Medication
  const handleAISearch = async () => {
    const term = name || scientificName;
    if (!term.trim()) return;
    setIsSearchingAI(true);
    setAiSearchResult(null);
    setShowSearchModal(true);

    try {
      const res = await fetch("/api/medication-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: term })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Parse warning level and text
      let level: 'yellow' | 'orange' | 'red' = 'yellow';
      if (data.text.includes("🔴") || data.text.includes("خطر")) {
        level = 'red';
      } else if (data.text.includes("🟠") || data.text.includes("مهم")) {
        level = 'orange';
      }

      setAiSearchResult({
        rawHTML: data.text,
        level,
        urls: data.urls || []
      });
    } catch (err) {
      console.error(err);
      setAiSearchResult({
        error: true,
        text: "تعذر الحصول على بيانات موثوقة حالياً، يرجى المحاولة لاحقاً."
      });
    } finally {
      setIsSearchingAI(false);
    }
  };

  // Apply AI search outputs to the form
  const applyAISearchDetails = () => {
    if (!aiSearchResult) return;
    setScientificName(name); // trade as name, search as scientific placeholder
    
    // Add warning
    const newWarning = {
      level: aiSearchResult.level,
      title: "تعارضات وإرشادات هامة (بأبحاث أونلاين)",
      desc: aiSearchResult.rawHTML.replace(/<[^>]*>/g, '').substring(0, 180) + "..."
    };
    setWarnings([newWarning]);
    setShowSearchModal(false);
  };

  // Upload or select prescription scanned via camera
  const handlePrescriptionScan = async (fileBase64: string, presetName?: string) => {
    setIsScanningOCR(true);
    setOcrError('');
    setScannedMeds([]);
    setShowOCRResult(true);

    try {
      const res = await fetch("/api/scan-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          base64: fileBase64,
          mimeType: "image/png"
        })
      });
      const data = await res.json();
      
      if (data.medications && data.medications.length > 0) {
        setScannedMeds(data.medications);
        setScannedNotes(data.patientDetails?.notes || '');
      } else {
        throw new Error("لم يتم العثور على أدوية واضحة بالروشتة.");
      }
    } catch (err) {
      console.error(err);
      setOcrError("فشل الفحص التلقائي. يرجى إدخال البيانات يدوياً أو تكرار المحاولة بصورة أوضح.");
    } finally {
      setIsScanningOCR(false);
    }
  };

  // Trigger scanning with customized files or presets
  const triggerPresetScan = (preset: 'cardio' | 'antibiotic') => {
    // Send standard transparent pixel base64, but pass instructions to OCR or simulate instantly to look extremely fast
    if (preset === 'cardio') {
      handlePrescriptionScan(PLACEHOLDER_PNG, "روشتة ضغط وقلب تجريبية");
    } else {
      handlePrescriptionScan(PLACEHOLDER_PNG, "روشتة مسكن ومضاد حيوي تجريبية");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = (reader.result as string).split(',')[1];
      handlePrescriptionScan(b64, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Save multiple medicines extracted from prescription
  const handleAddAllScannedMeds = async () => {
    if (!user || scannedMeds.length === 0) return;
    setIsSaving(true);
    try {
      const now = Date.now();
      for (const m of scannedMeds) {
        await addDoc(collection(db, 'users', user.uid, 'medications'), {
          name: m.name,
          type: m.frequencyPerDay ? 'schedule' : 'prn',
          dosage: m.dosage ? Number(m.dosage) : null,
          form: m.form || 'اقراص',
          frequencyPerDay: m.frequencyPerDay ? Number(m.frequencyPerDay) : null,
          instruction: m.instruction || 'بعد الاكل',
          inventory: 30, // default starting inventory
          maxInventory: 60,
          duration: m.duration || 'مستمر',
          durationDays: m.durationDays ? Number(m.durationDays) : null,
          autoAddShoppingList: true,
          forWho,
          isCritical: m.name.toLowerCase().includes('concor') || m.name.toLowerCase().includes('capoten'),
          alarmTimes: m.frequencyPerDay ? ['09:00', '21:00'].slice(0, Number(m.frequencyPerDay)) : [],
          createdAt: now,
          updatedAt: now
        });
      }
      setShowOCRResult(false);
      navigate(-1);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/medications`);
    } finally {
       setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user || !name) return;
    setIsSaving(true);
    try {
      const now = Date.now();
      const calculatedDays = duration === 'ايام محددة' ? (
        durationUnit === 'days' ? Number(durationValue) :
        durationUnit === 'weeks' ? Number(durationValue) * 7 :
        Number(durationValue) * 30
      ) : null;

      await addDoc(collection(db, 'users', user.uid, 'medications'), {
        name,
        scientificName,
        type: activeTab,
        dosage: dosage ? Number(dosage) : null,
        form,
        frequencyPerDay: activeTab === 'schedule' ? frequencyPerDay : null,
        frequencyUnit: activeTab === 'schedule' ? frequencyUnit : 'day',
        instruction,
        inventory: inventory ? Number(inventory) : null,
        maxInventory: maxInventory ? Number(maxInventory) : null,
        duration,
        durationValue: duration === 'ايام محددة' ? Number(durationValue) : null,
        durationUnit: duration === 'ايام محددة' ? durationUnit : 'days',
        durationDays: calculatedDays,
        autoAddShoppingList,
        forWho,
        isCritical,
        alarmTimes: activeTab === 'schedule' ? alarmTimes : [],
        warnings,
        packageNotes,
        createdAt: now,
        updatedAt: now
      });
      navigate(-1);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/medications`);
       setIsSaving(false);
    }
  };

  return (
    <div className={cn("min-h-full pb-32 transition-colors duration-1000",
       isFastingMode ? "bg-[#1A1A1A]" : "bg-[#F8F9FB] dark:bg-[#121415]"
    )}>
      {/* Header */}
      <div className={cn("px-6 pt-10 pb-6 rounded-b-[40px] shadow-sm mb-6",
         isFastingMode ? "bg-[#2D2824] shadow-black/20" : "bg-white dark:bg-[#1A1A1A] border-b border-[#F0EBE1] dark:border-white/5"
      )}>
        <div className="flex justify-between items-center mb-6 flex-row-reverse">
          <button onClick={() => navigate(-1)} className={cn("w-12 h-12 flex items-center justify-center rounded-2xl transition-all",
             isFastingMode ? "bg-black/20 text-gray-300" : "bg-[#FDFBF7] dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
          )}>
             <ChevronRight className="w-6 h-6" />
          </button>
          <h1 className={cn("text-xl font-bold tracking-tight text-right", isFastingMode ? "text-[#FDFBF7]" : "text-[#1A4D42] dark:text-white")}>إضافة دواء جديد</h1>
        </div>

        {/* 📁 AI Prescription Upload & Scanner Widget */}
        <div className="bg-[#1A4D42] dark:bg-emerald-950/40 text-white rounded-[24px] p-5 shadow-sm text-right relative overflow-hidden mb-4">
           <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
           <div className="flex flex-row-reverse justify-between items-start relative z-10 gap-3">
              <div className="flex-1">
                 <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5 justify-end"><Sparkles className="w-4 h-4 text-[#D4A373] animate-pulse" /> مسح الروشتة الذكي</h3>
                 <p className="text-[10px] text-gray-300 leading-relaxed">صور الروشيتة أو ارفعها، وهيتم استخراج جميع الأدوية وجدولتها بالذكاء الاصطناعي أوفلاين/أونلاين.</p>
              </div>
           </div>

           <div className="mt-4 grid grid-cols-2 gap-3 relative z-10" dir="rtl">
              <label className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/25 border border-white/20 text-xs font-bold cursor-pointer transition-all">
                 <Upload className="w-3.5 h-3.5 text-cyan-300" /> ارفع روشتة
                 <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <div className="relative group">
                 <select 
                   onChange={(e) => e.target.value && triggerPresetScan(e.target.value as any)}
                   className="w-full text-center py-2.5 rounded-xl bg-[#D4A373] text-gray-900 border-none text-xs font-bold appearance-none cursor-pointer placeholder-gray-500 focus:outline-none"
                   defaultValue=""
                 >
                    <option value="" disabled>جرب روشتة ديمو ✨</option>
                    <option value="cardio">🩺 روشتة ضغط سكر</option>
                    <option value="antibiotic">💊 روشتة مسكن ومضاد</option>
                 </select>
              </div>
           </div>
        </div>

        {/* Active manual entry elements */}
        <div className="space-y-4">
           <div className="relative text-right">
              <button 
                onClick={handleAISearch} 
                disabled={!name.trim()}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 px-3 flex items-center justify-center bg-[#D4A373]/20 hover:bg-[#D4A373]/30 disabled:opacity-45 rounded-xl text-[#0D2923] font-bold text-[10px] transition-colors gap-1"
                dir="rtl"
              >
                 <Sparkles className="w-3.5 h-3.5 text-yellow-600 animate-spin" style={{ animationDuration: isSearchingAI ? '2s' : '0s' }} /> ابحث طبيّاً
              </button>
              <input 
                type="text" 
                placeholder="ابحث باسم الدواء أو اكتب الاسم يدوياً..." 
                className={cn("w-full h-14 pl-24 pr-4 rounded-2xl border-none focus:ring-2 focus:ring-[#1A4D42] transition-all font-bold text-sm text-right",
                   isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] border border-[#F0EBE1] dark:bg-white/5 dark:text-white text-gray-900"
                )}
                value={name}
                onChange={(e) => setName(e.target.value)}
                dir="rtl"
              />
           </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Core Info Section */}
        <div className={cn("rounded-[32px] p-6 shadow-sm border",
           isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
        )}>
            <div className="mb-4 text-right">
               <label className="text-xs font-bold text-gray-400 mb-2 block">الدواء لمين؟</label>
               <select 
                 className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 appearance-none text-right mb-4",
                   isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                 )}
                 value={forWho}
                 onChange={(e) => setForWho(e.target.value)}
                 dir="rtl"
               >
                   <option value="">لنفسي (أنا)</option>
                   {familyMembers.map(m => (
                       <option key={m.id} value={m.id}>{m.name}</option>
                   ))}
               </select>
            </div>
            
            <div className="mb-4 text-right">
               <label className="text-xs font-bold text-gray-400 mb-2 block">الاسم العلمي (اختياري)</label>
               <input 
                 type="text" 
                 placeholder="مثال: Paracetamol" 
                 className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 text-right",
                   isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                 )}
                 value={scientificName}
                 onChange={(e) => setScientificName(e.target.value)}
                 dir="rtl"
               />
            </div>

            <div className="grid grid-cols-2 gap-4 text-right">
               <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block">الشكل الدوائي</label>
                  <select 
                     className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 appearance-none text-right",
                        isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                     )}
                     value={form}
                     onChange={(e) => setForm(e.target.value)}
                     dir="rtl"
                  >
                     <option>قرص</option>
                     <option>كبسولة</option>
                     <option>شراب</option>
                     <option>حقن</option>
                     <option>كريم</option>
                     <option>بخاخ</option>
                     <option>قطرة</option>
                  </select>
               </div>
               <div>
                  <label className="text-xs font-bold text-gray-400 mb-2 block">الجرعة</label>
                  <div className="relative">
                     <input 
                       type="text" 
                       placeholder="500" 
                       className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 text-right",
                         isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                       )}
                       value={dosage}
                       onChange={(e) => setDosage(e.target.value)}
                       dir="rtl"
                     />
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">مجم/مل</span>
                  </div>
               </div>
            </div>

            {/* Critical Medication Toggle */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between flex-row-reverse text-right">
               <div>
                  <h4 className="font-bold text-xs text-rose-500 flex items-center gap-1"><HeartPulse className="w-4 h-4" /> علاج لحالة حرجة؟</h4>
                  <p className="text-[9px] text-gray-400 font-bold mt-1">تنبيهات إضافية متتالية (قلب، ضغط، سكر) تجنباً للنسيان الكلي.</p>
               </div>
               <button 
                 onClick={() => setIsCritical(!isCritical)}
                 className={cn("w-12 h-6 rounded-full transition-colors relative", isCritical ? "bg-rose-500" : "bg-gray-200 dark:bg-white/10")}
               >
                 <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform", isCritical ? "right-6" : "right-0.5")} />
               </button>
            </div>
        </div>

        {/* Frequency & Schedule */}
        <div className={cn("rounded-[32px] p-6 shadow-sm border",
           isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
        )}>
           <label className="text-xs font-bold text-gray-400 mb-4 block text-right">نظام العلاج</label>
           <div className={cn("flex p-1.5 rounded-2xl mb-6 flex-row-reverse",
              isFastingMode ? "bg-black/20" : "bg-[#FDFBF7] dark:bg-white/5"
           )}>
              <button 
                onClick={() => setActiveTab('schedule')}
                className={cn("flex-1 py-3 text-xs font-bold rounded-xl transition-all", 
                   activeTab === 'schedule' 
                      ? (isFastingMode ? "bg-[#D4A373] text-white" : "bg-white dark:bg-white/10 text-[#1A4D42] dark:text-white shadow-sm border border-[#F0EBE1] dark:border-none") 
                      : "text-gray-400"
                )}
              >
                 مواعيد ثابتة
              </button>
              <button 
                onClick={() => setActiveTab('prn')}
                className={cn("flex-1 py-3 text-xs font-bold rounded-xl transition-all", 
                   activeTab === 'prn' 
                      ? (isFastingMode ? "bg-[#D4A373] text-white" : "bg-white dark:bg-white/10 text-[#1A4D42] dark:text-white shadow-sm border border-[#F0EBE1] dark:border-none") 
                      : "text-gray-400"
                )}
              >
                 عند اللزوم
              </button>
           </div>

           {activeTab === 'schedule' && (
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-3 flex-row-reverse">
                       <label className="text-xs font-bold text-gray-400 block text-right">معدل التكرار (التردد)</label>
                       <div className="flex gap-1.5 bg-gray-100 dark:bg-black/30 p-1 rounded-xl text-[10px] font-bold" dir="rtl">
                          <button 
                            type="button"
                            onClick={() => setFrequencyUnit('day')}
                            className={cn("px-2.5 py-1.5 rounded-lg transition-all", frequencyUnit === 'day' ? "bg-[#1A4D42] text-white shadow-sm" : "text-gray-400")}
                          >
                             يومي
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFrequencyUnit('week')}
                            className={cn("px-2.5 py-1.5 rounded-lg transition-all", frequencyUnit === 'week' ? "bg-[#1A4D42] text-[#D4A373] shadow-sm" : "text-gray-400")}
                          >
                             أسبوعي
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFrequencyUnit('month')}
                            className={cn("px-2.5 py-1.5 rounded-lg transition-all", frequencyUnit === 'month' ? "bg-[#1A4D42] text-white shadow-sm" : "text-gray-400")}
                          >
                             شهري
                          </button>
                       </div>
                    </div>
                    <div className={cn("flex items-center justify-between rounded-2xl py-2 px-3 flex-row-reverse",
                       isFastingMode ? "bg-black/20" : "bg-[#FDFBF7] dark:bg-white/5"
                    )}>
                       <button onClick={() => setFrequencyPerDay(Math.min(5, frequencyPerDay + 1))} className={cn("w-10 h-10 rounded-xl shadow-sm font-black text-xl",
                          isFastingMode ? "bg-[#D4A373] text-white" : "bg-white dark:bg-black text-[#1A4D42] dark:text-white border border-[#F0EBE1] dark:border-white/10"
                       )}>+</button>
                       <span className="font-bold text-base text-[#1A2E35] dark:text-white">
                          {frequencyPerDay} {frequencyUnit === 'day' ? 'مرات في اليوم' : frequencyUnit === 'week' ? 'مرات في الأسبوع' : 'مرات في الشهر'}
                       </span>
                       <button onClick={() => setFrequencyPerDay(Math.max(1, frequencyPerDay - 1))} className={cn("w-10 h-10 rounded-xl shadow-sm font-black text-xl",
                          isFastingMode ? "bg-[#2D2824] text-white border border-[#3D3834]" : "bg-white dark:bg-black text-[#1A4D42] dark:text-white border border-[#F0EBE1] dark:border-white/10"
                       )}>-</button>
                    </div>
                 </div>

                 {/* Custom Alarms Picker Section */}
                 <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <label className="text-xs font-bold text-[#1A4D42] dark:text-[#D4A373] mb-3 block text-right flex items-center gap-1 justify-end">
                       <Clock className="w-3.5 h-3.5" /> ضبط ساعات التنبيه اليومية بكل دقة
                    </label>
                    <div className="space-y-2">
                       {alarmTimes.map((time, idx) => (
                          <div key={idx} className="flex items-center justify-between flex-row-reverse">
                             <span className="text-xs text-gray-500 font-bold">جرعة {idx+1}</span>
                             <input 
                               type="time" 
                               value={time} 
                               onChange={(e) => handleTimeChange(idx, e.target.value)}
                               className="h-10 border border-gray-200 dark:border-white/15 rounded-xl px-3 font-bold text-xs text-center bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none" 
                             />
                          </div>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-xs font-bold text-gray-400 mb-3 block text-right">خطة التناول مع الطعام</label>
                    <div className="grid grid-cols-2 gap-3" dir="rtl">
                       {['بعد الاكل', 'قبل الاكل', 'على ع الريق', 'قبل النوم'].map(inst => (
                          <button 
                            key={inst}
                            type="button"
                            onClick={() => setInstruction(inst)}
                            className={cn(
                               "py-3 rounded-[14px] text-xs font-bold transition-all border",
                               instruction === inst 
                                  ? (isFastingMode ? "border-[#D4A373] bg-[#D4A373] text-white" : "border-[#1A4D42] bg-[#1A4D42] text-white") 
                                  : (isFastingMode ? "border-[#3D3834] bg-black/20 text-gray-400" : "border-[#F0EBE1] dark:border-white/5 bg-[#FDFBF7] dark:bg-white/5 text-gray-500 hover:bg-white")
                            )}
                          >
                             {inst}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           <div className="mt-6 pt-6 border-t border-[#F0EBE1] dark:border-white/5">
               <label className="text-xs font-bold text-gray-400 mb-3 block text-right">مدة العلاج</label>
               <div className={cn("flex p-1.5 rounded-2xl mb-4 flex-row-reverse",
                   isFastingMode ? "bg-black/20" : "bg-[#FDFBF7] dark:bg-white/5"
               )}>
                   <button 
                       type="button"
                       onClick={() => setDuration('مستمر')}
                       className={cn("flex-1 py-3 text-xs font-bold rounded-xl transition-all", 
                           duration === 'مستمر' 
                               ? (isFastingMode ? "bg-[#D4A373] text-white" : "bg-white dark:bg-white/10 text-[#1A4D42] dark:text-white shadow-sm border border-[#F0EBE1] dark:border-none") 
                               : "text-gray-400"
                       )}
                   >
                       مستمر (مزمن)
                   </button>
                   <button 
                       type="button"
                       onClick={() => setDuration('ايام محددة')}
                       className={cn("flex-1 py-3 text-xs font-bold rounded-xl transition-all", 
                           duration === 'ايام محددة' 
                               ? (isFastingMode ? "bg-[#D4A373] text-white" : "bg-white dark:bg-white/10 text-[#1A4D42] dark:text-white shadow-sm border border-[#F0EBE1] dark:border-none") 
                               : "text-gray-400"
                       )}
                   >
                       مدة محددة
                   </button>
               </div>
               {duration === 'ايام محددة' && (
                    <div className="grid grid-cols-5 gap-3 text-right" dir="rtl">
                        <div className="col-span-2 relative">
                            <input 
                                type="number" 
                                className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 text-center focus:ring-2 focus:ring-[#1A4D42] transition-all",
                                    isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                                )}
                                value={durationValue}
                                onChange={(e) => setDurationValue(e.target.value)}
                            />
                        </div>
                        <div className="col-span-3 relative">
                            <select
                                className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 appearance-none text-right pr-4 focus:ring-2 focus:ring-[#1A4D42] transition-all",
                                    isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                                )}
                                value={durationUnit}
                                onChange={(e) => setDurationUnit(e.target.value as any)}
                            >
                                <option value="days">يوم/أيام</option>
                                <option value="weeks">أسبوع/أسابيع</option>
                                <option value="months">شهر/شهور</option>
                            </select>
                        </div>
                    </div>
                )}
           </div>
        </div>

        {/* Stock Management */}
        <div className={cn("rounded-[32px] p-6 shadow-sm border",
           isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
        )}>
           <div className="flex justify-start items-center gap-3 mb-6 flex-row-reverse text-right">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                 isFastingMode ? "bg-[#D4A373]/20 text-[#D4A373]" : "bg-[#FAEDDF] dark:bg-orange-500/10 text-[#E07A5F]"
              )}>
                 <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[#1A2E35] dark:text-white text-base tracking-tight">إدارة المخزون والتنبيه بالشراء</h3>
           </div>
           
           <div className="grid grid-cols-2 gap-4 text-right">
              <div>
                 <label className="text-xs font-bold text-gray-400 mb-3 block">كامل سعة العلبة حبات</label>
                 <input 
                    type="number" 
                    value={maxInventory} 
                    onChange={(e) => setMaxInventory(e.target.value)} 
                    className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 text-right",
                       isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 text-[#1A4D42] dark:text-white border border-[#F0EBE1] dark:border-none"
                    )}
                 />
              </div>
              <div>
                 <label className="text-xs font-bold text-gray-400 mb-3 block">المخزون المتوفر الآن</label>
                 <input 
                    type="number" 
                    value={inventory} 
                    onChange={(e) => setInventory(e.target.value)} 
                    className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 text-right",
                       isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 text-[#1A4D42] dark:text-white border border-[#F0EBE1] dark:border-none"
                    )}
                 />
              </div>
           </div>

           <div className="mt-6 pt-5 border-t border-[#F0EBE1] dark:border-white/5 flex items-center justify-between flex-row-reverse text-right">
              <div className="flex-1">
                 <h4 className="font-bold text-xs text-[#1A2E35] dark:text-white">إضافة إلى قائمة المشتريات تلقائياً؟</h4>
                 <p className="text-[10px] text-gray-400 font-bold mt-1">عندما تنخفض الكمية وتكفي لـ 5 أيام فقط، سيتم وضعه في قائمة التسوق.</p>
              </div>
               <button 
                 onClick={() => setAutoAddShoppingList(!autoAddShoppingList)}
                 className={cn("w-12 h-6 rounded-full transition-colors relative shrink-0", autoAddShoppingList ? (isFastingMode ? "bg-[#D4A373]" : "bg-[#1A4D42]") : "bg-gray-200 dark:bg-white/10")}
               >
                 <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform", autoAddShoppingList ? "right-6" : "right-0.5")} />
               </button>
           </div>

           <div className="mt-4 text-right">
              <label className="text-xs font-bold text-gray-400 mb-2 block">صورة العلبة أو ملاحظات إضافية</label>
              <input 
                type="text" 
                placeholder="مثال: علبة زرقاء بغلاف كرتون"
                value={packageNotes}
                onChange={(e) => setPackageNotes(e.target.value)}
                className={cn("w-full h-12 rounded-xl border-none text-xs px-3 text-right bg-gray-50 dark:bg-white/5 border border-[#F0EBE1]",
                  isFastingMode ? "text-white" : "text-gray-900"
                )}
                dir="rtl"
              />
           </div>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className={cn("fixed bottom-0 left-0 right-0 p-6 z-40 text-center flex justify-center pb-8",
         isFastingMode ? "bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A] to-transparent" : "bg-gradient-to-t from-[#F8F9FB] dark:from-[#121415] via-[#F8F9FB] dark:via-[#121415] to-transparent"
      )}>
         <motion.button 
           whileTap={{ scale: 0.95 }}
           onClick={handleSave}
           disabled={isSaving || !name}
           className={cn("w-full max-w-md h-16 text-white rounded-[24px] font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50",
              isFastingMode ? "bg-[#D4A373] shadow-amber-900/30" : "bg-[#1A4D42] shadow-[#1A4D42]/20 hover:bg-[#0D2923]"
           )}
         >
            {isSaving ? (
               <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
               <>
                 <Save className="w-5 h-5" />
                 <span>حفظ الدواء وجدولته</span>
               </>
            )}
         </motion.button>
      </div>

      {/* 🔮 Online AI Drug-Search Info Modal */}
      {showSearchModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className={cn("w-full max-w-lg rounded-[32px] p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto text-right",
               isFastingMode ? "bg-[#2D2824] text-white" : "bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
            )}>
                <div className="flex items-center gap-3 flex-row-reverse mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#D4A373]/20 text-[#D4A373] flex items-center justify-center">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base leading-snug">الطبيب الصيدلي الذكي (أونلاين)</h2>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">البحث بالمرجع الدوائي وتحذيرات التعارض</p>
                    </div>
                </div>

                {isSearchingAI ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                       <Loader2 className="w-8 h-8 text-[#D4A373] animate-spin" />
                       <p className="text-xs text-gray-500 font-bold">بندور في قواعد البينات الدوائية عن معلومات {name || scientificName}...</p>
                    </div>
                ) : aiSearchResult?.error ? (
                    <div className="p-4 bg-rose-50 text-rose-500 text-xs font-bold rounded-xl mb-4 text-center">
                       {aiSearchResult.text}
                    </div>
                ) : (
                    <div className="space-y-4 mb-6">
                        <div 
                          className="text-xs leading-relaxed space-y-2 prose prose-sm dark:prose-invert" 
                          dangerouslySetInnerHTML={{ __html: aiSearchResult?.rawHTML || '' }}
                        />
                        
                        {aiSearchResult?.urls && aiSearchResult.urls.length > 0 && (
                            <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                               <p className="text-[9px] text-[#D4A373] font-bold mb-1">المراجع والمصادر الصيدلانية:</p>
                               <div className="flex flex-col gap-1">
                                  {aiSearchResult.urls.map((u: any, i: number) => (
                                     <a key={i} href={u.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-600 dark:text-cyan-400 underline truncate">{u.title}</a>
                                  ))}
                               </div>
                            </div>
                        )}

                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 p-3 rounded-xl flex items-start gap-2 flex-row-reverse">
                           <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                           <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-normal">
                              يرجى مراجعة الطبيب بخصوص أي أعراض جانبية، المعلومات ناتجة عن بحث ذكاء اصطناعي ولا تغني عن نصيحة طبيبك الخاص.
                           </p>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 justify-end mt-4">
                    <button 
                      onClick={() => setShowSearchModal(false)}
                      className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold text-xs"
                    >
                        إغلاق
                    </button>
                    {!isSearchingAI && !aiSearchResult?.error && (
                        <button 
                          onClick={applyAISearchDetails}
                          className="flex-[2] py-3.5 rounded-2xl bg-[#1A4D42] text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                            <Check className="w-4 h-4" /> تطبيق البيانات والتحذيرات الذكية
                        </button>
                    )}
                </div>
            </div>
         </div>
      )}

      {/* 🔮 AI Prescription Scanned Result Checklist Modal */}
      {showOCRResult && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className={cn("w-full max-w-lg rounded-[32px] p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto text-right",
               isFastingMode ? "bg-[#2D2824] text-white" : "bg-white dark:bg-[#1A1A1A] text-gray-900 dark:text-white"
            )}>
                <div className="flex items-center gap-3 flex-row-reverse mb-6">
                    <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 flex items-center justify-center">
                        <Camera className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base">نتائج استخراج الروشتة الذكية</h2>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">تحليل صور الروشتات وبناء الجداول أوتوماتيك</p>
                    </div>
                </div>

                {isScanningOCR ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-4">
                       <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                       <p className="text-xs text-gray-500 font-bold">يقوم الذكاء الاصطناعي الآن بقراءة وتحليل صورة الروشتة بدقة...</p>
                       <div className="w-3/4 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <motion.div initial={{width: 0}} animate={{width: "100%"}} transition={{duration: 5, ease: "easeOut"}} className="bg-cyan-500 h-full rounded-full" />
                       </div>
                    </div>
                ) : ocrError ? (
                    <div className="p-4 bg-rose-50 text-rose-500 text-xs font-bold rounded-xl mb-4 text-center">
                       {ocrError}
                    </div>
                ) : (
                    <div className="space-y-4 mb-6">
                        <p className="text-xs text-[#1A4D42] dark:text-cyan-400 font-bold">الأدوية المستخرجة لبناء الجداول:</p>
                        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                           {scannedMeds.map((m, i) => (
                              <div key={i} className="p-3 rounded-2xl border border-cyan-100 dark:border-white/10 flex items-center gap-3 flex-row-reverse bg-cyan-50/15 justify-between">
                                 <div className="flex items-center gap-2 flex-row-reverse">
                                    <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                                    <div>
                                       <p className="font-bold text-xs text-gray-800 dark:text-white">{m.name} {m.dosage ? `(${m.dosage}مجم)` : ''}</p>
                                       <p className="text-[9px] text-gray-500 font-bold">{m.form} • {m.frequencyPerDay ? `${m.frequencyPerDay} مرات يومياً` : 'عند اللزوم'} • {m.instruction}</p>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>

                        {scannedNotes && (
                           <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 text-right">
                              <p className="text-[10px] text-gray-400 font-bold mb-1">ملاحظات الطبيب المرفقة بالروشتة:</p>
                              <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300 font-bold">{scannedNotes}</p>
                           </div>
                        )}
                        
                        <p className="text-[10px] text-[#D4A373] text-center font-bold">هل تود جدولة وإضافة هذه الأدوية لملف المريض دفعة واحدة؟</p>
                    </div>
                )}

                <div className="flex gap-3 justify-end mt-4">
                    <button 
                      onClick={() => setShowOCRResult(false)}
                      className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold text-xs"
                    >
                        إلغاء
                    </button>
                    {!isScanningOCR && !ocrError && (
                        <button 
                          onClick={handleAddAllScannedMeds}
                          className="flex-[2] py-3.5 rounded-2xl bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                            <Check className="w-4 h-4" /> إضافة جميع الأدوية بنجاح!
                        </button>
                    )}
                </div>
            </div>
         </div>
      )}

    </div>
  );
}
