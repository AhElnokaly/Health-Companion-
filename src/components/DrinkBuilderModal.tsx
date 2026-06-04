import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Coffee, GlassWater, Sparkles, Scale, Info, Star } from 'lucide-react';
import { customTrackerStore, BeverageOption, SugarOption, DrinkAdditionOption } from '../lib/custom-tracker-store';
import { motion, AnimatePresence } from 'motion/react';

interface DrinkBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogDrink: (amount: number, name: string, factor: number, calories: number, carbs: number, protein: number, fats: number) => Promise<void>;
  initialPreset?: any; // +++ أضيف لدعم الكشف عن المشروب المعدل وتعبئة البيانات تلقائياً +++
}

export default function DrinkBuilderModal({ isOpen, onClose, onLogDrink, initialPreset }: DrinkBuilderModalProps) {
  // Pool states
  const [beverages, setBeverages] = useState<BeverageOption[]>([]);
  const [sugars, setSugars] = useState<SugarOption[]>([]);
  const [additions, setAdditions] = useState<DrinkAdditionOption[]>([]);

  // Selection states
  const [selectedBev, setSelectedBev] = useState<BeverageOption | null>(null);
  const [selectedMl, setSelectedMl] = useState<number>(250);
  const [customMlInput, setCustomMlInput] = useState<string>('');
  const [selectedSugar, setSelectedSugar] = useState<SugarOption | null>(null);
  const [sugarSpoons, setSugarSpoons] = useState<number>(1);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]); // names list

  // Quick action pin alert
  const [pinSuccess, setPinSuccess] = useState(false);

  // Dynamic creation forms visibility
  const [showAddBevForm, setShowAddBevForm] = useState(false);
  const [showAddSugarForm, setShowAddSugarForm] = useState(false);
  const [showAddAdditionForm, setShowAddAdditionForm] = useState(false);

  // Dynamic creation inputs
  const [newBevName, setNewBevName] = useState('');
  const [newBevFactor, setNewBevFactor] = useState(0.85);
  const [newBevCalories, setNewBevCalories] = useState('0');
  
  const [newSugarName, setNewSugarName] = useState('');
  const [newSugarCals, setNewSugarCals] = useState('20');
  const [newSugarCarbs, setNewSugarCarbs] = useState('5');

  const [newAdditionName, setNewAdditionName] = useState('');
  const [newAdditionCals, setNewAdditionCals] = useState('15');
  const [newAdditionProtein, setNewAdditionProtein] = useState('1');
  const [newAdditionCarbs, setNewAdditionCarbs] = useState('2');
  const [newAdditionFats, setNewAdditionFats] = useState('0');

  // Load pools
  useEffect(() => {
    if (isOpen) {
      const bevPool = customTrackerStore.getBeveragesPool();
      const sugarPool = customTrackerStore.getSugarsPool();
      const additionsPool = customTrackerStore.getDrinkAdditionsPool();

      setBeverages(bevPool);
      setSugars(sugarPool);
      setAdditions(additionsPool);
      
      if (initialPreset) {
        // We are editing an existing preset
        const matchedBev = bevPool.find(b => b.name === initialPreset.beverageName) || bevPool[0];
        setSelectedBev(matchedBev || null);
        setSelectedMl(initialPreset.ml);
        const matchedSugar = sugarPool.find(s => s.name === initialPreset.sugarTypeName) || sugarPool[0];
        setSelectedSugar(matchedSugar || null);
        setSugarSpoons(initialPreset.sugarSpoons);
        setSelectedAdditions(initialPreset.additionsNames || []);
      } else {
        // Default selections
        if (bevPool.length > 0) {
          setSelectedBev(bevPool[0]);
          setSelectedMl(bevPool[0].ml);
        }
        if (sugarPool.length > 0) {
          setSelectedSugar(sugarPool[0]);
          setSugarSpoons(1);
        }
        setSelectedAdditions([]);
      }
    }
  }, [isOpen, initialPreset]);

  // Compute stats in real-time
  const computedMetrics = React.useMemo(() => {
    if (!selectedBev) return { calories: 0, protein: 0, carbs: 0, fats: 0, hydration: 0 };

    const ratio = selectedMl / selectedBev.ml;
    
    // Scale base drink macros by ml ratio
    let baseCals = selectedBev.calories * ratio;
    let baseProtein = selectedBev.protein * ratio;
    let baseCarbs = selectedBev.carbs * ratio;
    let baseFats = selectedBev.fats * ratio;

    // Add sugar calories (by spoon count)
    if (selectedSugar && sugarSpoons > 0) {
      baseCals += (selectedSugar.caloriesPerSpoon * sugarSpoons);
      baseCarbs += (selectedSugar.carbsPerSpoon * sugarSpoons);
    }

    // Add selected additions macros
    additions.forEach(addon => {
      if (selectedAdditions.includes(addon.name)) {
        baseCals += addon.calories;
        baseProtein += addon.protein;
        baseCarbs += addon.carbs;
        baseFats += addon.fats;
      }
    });

    const hydrationEffective = Math.round(selectedMl * selectedBev.factor);

    return {
      calories: Math.round(baseCals),
      protein: Math.round(baseProtein * 10) / 10,
      carbs: Math.round(baseCarbs * 10) / 10,
      fats: Math.round(baseFats * 10) / 10,
      hydration: hydrationEffective
    };
  }, [selectedBev, selectedMl, selectedSugar, sugarSpoons, selectedAdditions, additions]);

  const builtDisplayName = React.useMemo(() => {
    if (!selectedBev) return '';
    let name = `${selectedBev.name.replace(/☕|🍵|🥛|🌿|🧊|🍹|🍋|🥤|🍓/g, '').trim()} [${selectedMl}مل]`;
    const addOnList: string[] = [];
    if (selectedSugar && sugarSpoons > 0) {
      addOnList.push(`${sugarSpoons} م.${selectedSugar.name.replace(/🥄|🟫|✨|🍯|❌/g, '').trim()}`);
    }
    selectedAdditions.forEach(add => {
      addOnList.push(add.replace(/🥛|🌿|🍋|📿|🌾|🍫/g, '').trim());
    });
    if (addOnList.length > 0) {
      name += ` + (${addOnList.join(' و')})`;
    }
    return name;
  }, [selectedBev, selectedMl, selectedSugar, sugarSpoons, selectedAdditions]);

  const handleAddNewBeverage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBevName.trim()) return;
    const newBev: BeverageOption = {
      name: newBevName.trim(),
      factor: newBevFactor,
      ml: 250,
      calories: Number(newBevCalories) || 0,
      protein: 0,
      carbs: 0,
      fats: 0
    };
    const updated = customTrackerStore.addBeverage(newBev);
    setBeverages(updated);
    setSelectedBev(newBev);
    setSelectedMl(250);
    setNewBevName('');
    setShowAddBevForm(false);
  };

  const handleAddNewSugar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSugarName.trim()) return;
    const newSug: SugarOption = {
      name: newSugarName.trim(),
      caloriesPerSpoon: Number(newSugarCals) || 0,
      carbsPerSpoon: Number(newSugarCarbs) || 0
    };
    const updated = customTrackerStore.addSugar(newSug);
    setSugars(updated);
    setSelectedSugar(newSug);
    setNewSugarName('');
    setShowAddSugarForm(false);
  };

  const handleAddNewAddition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdditionName.trim()) return;
    const newAdd: DrinkAdditionOption = {
      name: newAdditionName.trim(),
      calories: Number(newAdditionCals) || 0,
      protein: Number(newAdditionProtein) || 0,
      carbs: Number(newAdditionCarbs) || 0,
      fats: Number(newAdditionFats) || 0
    };
    const updated = customTrackerStore.addDrinkAddition(newAdd);
    setAdditions(updated);
    setSelectedAdditions(prev => [...prev, newAdd.name]);
    setNewAdditionName('');
    setShowAddAdditionForm(false);
  };

  const toggleAddition = (name: string) => {
    setSelectedAdditions(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handlePinAsQuickAction = () => {
    if (!selectedBev) return;
    
    // If we are editing an existing preset and changed its name, delete the old name from store first
    if (initialPreset && initialPreset.displayName !== builtDisplayName) {
      customTrackerStore.unpinWater(initialPreset.displayName);
    }

    customTrackerStore.pinWater({
      beverageName: selectedBev.name,
      ml: selectedMl,
      sugarTypeName: selectedSugar ? selectedSugar.name : 'بدون سكر ❌',
      sugarSpoons: sugarSpoons,
      additionsNames: selectedAdditions,
      totalCalories: computedMetrics.calories,
      effectiveHydration: computedMetrics.hydration,
      displayName: builtDisplayName
    });
    setPinSuccess(true);
    // dispatch event
    window.dispatchEvent(new Event('waterQuickPinnedChanged'));
    setTimeout(() => setPinSuccess(false), 2000);
  };

  const handleLog = async () => {
    if (!selectedBev) return;
    await onLogDrink(
      selectedMl,
      builtDisplayName,
      selectedBev.factor,
      computedMetrics.calories,
      computedMetrics.carbs,
      computedMetrics.protein,
      computedMetrics.fats
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overscroll-none" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-[#121415] w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-white/5"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#E07A5F]/10 flex items-center justify-center text-[#E07A5F]">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-gray-800 dark:text-gray-150">خلاط ومصمم المشروبات الذكي ومحاكي الارتواء</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">اصنع وصفتك المخصصة بدقة وسجل سعراتها وترطيبها</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-right custom-scrollbar">

          {/* Preset Display Box */}
          <div className="p-3 bg-gray-50/70 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1.5">
            <span className="text-[9px] font-black text-gray-400 block">وصف المشروب الحالي الجاري تركيبه:</span>
            <div className="font-extrabold text-xs text-[#E07A5F] break-words">
              {builtDisplayName || 'يرجى اختيار مكونات المشروب المفضل...'}
            </div>
          </div>

          {/* Section 1: Beverage selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-gray-600 dark:text-gray-400">١. اختر نوع المشروب:</label>
              <button 
                type="button"
                onClick={() => setShowAddBevForm(!showAddBevForm)}
                className="text-[9.5px] font-extrabold text-[#E07A5F] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                {showAddBevForm ? "الرجوع للقائمة ✕" : "➕ إضافة مشروب جديد لم تره"}
              </button>
            </div>

            {showAddBevForm ? (
              <form onSubmit={handleAddNewBeverage} className="p-3 bg-[#E07A5F]/5 rounded-2xl border border-[#E07A5F]/10 space-y-3">
                <span className="text-[9.5px] font-bold text-gray-505 block">مشروب غير مسجل؟ أضفه ليتم حفظه دائماً:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    required
                    placeholder="اسم المشروب (مثال: قهوة بندق 🌰)"
                    value={newBevName}
                    onChange={(e) => setNewBevName(e.target.value)}
                    className="col-span-2 text-xs px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-right outline-none dark:text-white"
                  />
                  <div className="space-y-1">
                    <span className="text-[8px] text-gray-400 font-bold block">نسبة الترطيب:</span>
                    <select
                      value={newBevFactor}
                      onChange={(e) => setNewBevFactor(Number(e.target.value))}
                      className="w-full text-[10px] px-2 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl"
                    >
                      <option value="1.0">ماء فوار / يرطب تماماً 🥛 (100%)</option>
                      <option value="0.95">شاي / أعشاب مرطبة 🌿 (95%)</option>
                      <option value="0.85">قهوة / منبهات خفيفة ☕ (85%)</option>
                      <option value="0.5">منبه قوي / إسبريسو ⚡ (50%)</option>
                      <option value="0.0">مشروب غازي / مدر 🥤 (0%)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-gray-400 font-bold block">السعرات لـ 250 مل:</span>
                    <input 
                      type="number"
                      placeholder="السعرات"
                      value={newBevCalories}
                      onChange={(e) => setNewBevCalories(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-center outline-none dark:text-white"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-1.5 bg-[#E07A5F] text-white hover:bg-[#c96c53] font-bold text-xs rounded-xl cursor-pointer"
                >
                  حفظ المشروب وإضافته للقائمة 💾
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-150/40 dark:border-white/5 rounded-2xl scrollbar-hide">
                {beverages.map((bev) => (
                  <button
                    key={bev.name}
                    type="button"
                    onClick={() => {
                      setSelectedBev(bev);
                      setSelectedMl(bev.ml);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-right transition-all cursor-pointer text-xs ${
                      selectedBev?.name === bev.name 
                        ? 'bg-[#E07A5F]/15 text-[#E07A5F] border border-[#E07A5F]/30 font-black' 
                        : 'bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100/70'
                    }`}
                  >
                    <span className="truncate flex-1 font-bold">{bev.name}</span>
                    {selectedBev?.name === bev.name && <Check className="w-3.5 h-3.5 mr-1 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Volume / Size Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-600 dark:text-gray-400">٢. حجم التقديم / الكوب:</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {[100, 150, 200, 250, 350, 500].map((sz) => (
                <button
                  type="button"
                  key={sz}
                  onClick={() => {
                    setSelectedMl(sz);
                    setCustomMlInput('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] whitespace-nowrap font-black shrink-0 transition-all cursor-pointer ${
                    selectedMl === sz && !customMlInput
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {sz} مل ({sz === 100 ? 'فنجان' : sz === 150 ? 'صغير' : sz === 250 ? 'وسط' : sz === 350 ? 'مج كبير' : 'زجاجة'})
                </button>
              ))}
              <div className="flex items-center gap-2 shrink-0">
                <input 
                  type="number"
                  placeholder="مل مخصص"
                  value={customMlInput}
                  onChange={(e) => {
                    setCustomMlInput(e.target.value);
                    setSelectedMl(Number(e.target.value) || 250);
                  }}
                  className="w-16 text-[9.5px] px-2 py-1 bg-gray-50 dark:bg-[#1D1D1D] border border-gray-150/40 rounded-lg text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Sugar Selection */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-gray-600 dark:text-gray-400 font-extrabold">٣. نوع ومستوى التحلية:</label>
              <button 
                type="button"
                onClick={() => setShowAddSugarForm(!showAddSugarForm)}
                className="text-[9.5px] font-extrabold text-[#E07A5F] hover:underline cursor-pointer"
              >
                {showAddSugarForm ? "الرجوع للقائمة ✕" : "➕ إضافة محلي مخصص"}
              </button>
            </div>

            {showAddSugarForm ? (
              <form onSubmit={handleAddNewSugar} className="p-3 bg-amber-550/5 rounded-2xl border border-amber-500/10 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    required
                    placeholder="اسم المحلّي (مثال: سكر ستيفيا ذهبي ✨)"
                    value={newSugarName}
                    onChange={(e) => setNewSugarName(e.target.value)}
                    className="col-span-3 text-xs px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-right dark:text-white"
                  />
                  <input 
                    type="number" 
                    placeholder="سعرة/ملعقة" 
                    value={newSugarCals}
                    onChange={(e) => setNewSugarCals(e.target.value)}
                    className="text-xs px-2 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 rounded-xl text-center"
                  />
                  <input 
                    type="number" 
                    placeholder="نشويات/ملعقة" 
                    value={newSugarCarbs}
                    onChange={(e) => setNewSugarCarbs(e.target.value)}
                    className="text-xs px-2 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 rounded-xl text-center col-span-2"
                  />
                </div>
                <button type="submit" className="w-full py-1.5 bg-sky-505 dark:bg-sky-900/60 bg-[#E07A5F] hover:bg-[#c96c53] font-bold text-xs rounded-xl text-white">
                  حفظ المحلّي الجديد 💾
                </button>
              </form>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 items-center flex-wrap">
                  {sugars.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => setSelectedSugar(sug)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer ${
                        selectedSugar?.name === sug.name
                          ? 'bg-[#E07A5F]/15 text-[#E07A5F] border border-[#E07A5F]/30 font-extrabold'
                          : 'bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {sug.name} ({sug.caloriesPerSpoon} سعرة)
                    </button>
                  ))}
                </div>

                {selectedSugar && selectedSugar.name !== 'بدون سكر ❌' && (
                  <div className="flex items-center gap-2 flex-row-reverse mt-2">
                    <span className="text-[10px] text-gray-500 font-black">الكمية:</span>
                    <div className="flex gap-1">
                      {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setSugarSpoons(cnt)}
                          className={`w-10 h-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer ${
                            sugarSpoons === cnt
                              ? 'bg-amber-500 text-white'
                              : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {cnt} ملعقة
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Additions selection */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-gray-600 dark:text-gray-400 font-extrabold">٤. الإضافات والمحسنات:</label>
              <button 
                type="button"
                onClick={() => setShowAddAdditionForm(!showAddAdditionForm)}
                className="text-[9.5px] font-extrabold text-[#E07A5F] hover:underline cursor-pointer"
              >
                {showAddAdditionForm ? "الرجوع للقائمة ✕" : "➕ إضافة إضافة مخصصة"}
              </button>
            </div>

            {showAddAdditionForm ? (
              <form onSubmit={handleAddNewAddition} className="p-3 bg-emerald-550/5 rounded-2xl border border-emerald-500/10 space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="اسم الإضافة (مثال: رغوة حليب فوم 🥛)"
                  value={newAdditionName}
                  onChange={(e) => setNewAdditionName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 rounded-xl text-right dark:text-white"
                />
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] text-gray-400 font-bold block text-center">سعرات:</span>
                    <input type="number" value={newAdditionCals} onChange={(e) => setNewAdditionCals(e.target.value)} className="w-[100%] text-xs px-1.5 py-1 bg-white border border-gray-200 rounded-lg text-center" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] text-gray-400 font-bold block text-center">بروتين:</span>
                    <input type="number" value={newAdditionProtein} onChange={(e) => setNewAdditionProtein(e.target.value)} className="w-[100%] text-xs px-1.5 py-1 bg-white border border-gray-200 rounded-lg text-center" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] text-gray-400 font-bold block text-center">كاربس:</span>
                    <input type="number" value={newAdditionCarbs} onChange={(e) => setNewAdditionCarbs(e.target.value)} className="w-[100%] text-xs px-1.5 py-1 bg-white border border-gray-200 rounded-lg text-center" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] text-gray-400 font-bold block text-center">دهون:</span>
                    <input type="number" value={newAdditionFats} onChange={(e) => setNewAdditionFats(e.target.value)} className="w-[100%] text-xs px-1.5 py-1 bg-white border border-gray-200 rounded-lg text-center" />
                  </div>
                </div>
                <button type="submit" className="w-full py-1.5 bg-[#E07A5F] hover:bg-[#c96c53] font-bold text-xs rounded-xl text-white">
                  حفظ الإضافة 💾
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {additions.map((addon) => {
                  const isSelected = selectedAdditions.includes(addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddition(addon.name)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-center transition-all flex items-center gap-1 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#E07A5F]/10 text-[#E07A5F] border-[#E07A5F]/20 font-black'
                          : 'bg-gray-50/40 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <Check className={`w-3 h-3 text-[#E07A5F] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                      <span>{addon.name} ({addon.calories} ك)</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Real-time calculated dashboard & Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/25 shrink-0 space-y-3.5">
          {/* Calculated values summary */}
          <div className="flex justify-between items-center text-center flex-row-reverse" dir="rtl">
            <div className="bg-white dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
              <span className="text-[8px] text-gray-400 font-black block">صافي الترطيب المائي</span>
              <span className="text-sky-505 dark:text-sky-400 font-black text-xs">{computedMetrics.hydration} مل 🥛</span>
            </div>
            <div className="bg-white dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
              <span className="text-[8px] text-gray-400 font-black block">السعرات الكلية</span>
              <span className="text-orange-505 dark:text-orange-400 font-black text-xs text-orange-500">{computedMetrics.calories} سعرة 📈</span>
            </div>
            <div className="bg-white dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5">
              <span className="text-[8px] text-gray-400 font-black block">بروتين / نشويات</span>
              <span className="text-emerald-505 dark:text-emerald-400 font-black text-[10px] text-emerald-500">{computedMetrics.protein}g / {computedMetrics.carbs}g</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePinAsQuickAction}
              className={`px-3 py-3 border border-[#E07A5F]/20 text-[#E07A5F] bg-[#E07A5F]/5 font-black text-xs rounded-2xl active:scale-95 transition-all text-center flex items-center justify-center gap-1 shrink-0 select-none cursor-pointer hover:bg-[#E07A5F]/10`}
            >
              <Star className={`w-3.5 h-3.5 ${pinSuccess ? 'stroke-amber-500 fill-amber-300' : ''}`} />
              <span>{pinSuccess ? 'تم التثبيت بنجاح!' : 'تثبيت كزر سريع 📌'}</span>
            </button>

            <button
              type="button"
              onClick={handleLog}
              className="flex-1 py-3 bg-[#E07A5F] hover:bg-[#c96c53] font-black text-xs rounded-2xl text-center active:scale-95 transition-all text-white flex items-center justify-center gap-1.5 select-none cursor-pointer shadow-md shadow-[#E07A5F]/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>سجل المشروب في الكلي والألياف 🚀</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
