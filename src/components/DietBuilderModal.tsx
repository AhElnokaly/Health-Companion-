import React, { useState, useEffect } from 'react';
import { X, Plus, Check, Utensils, Sparkles, Scale, Info, Star } from 'lucide-react';
import { customTrackerStore, FoodBaseOption, FoodAdditionOption, CustomDietPreset } from '../lib/custom-tracker-store';
import { motion, AnimatePresence } from 'motion/react';

interface DietBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMeal: (name: string, category: string, calories: number, carbs: number, protein: number, fats: number) => Promise<void>;
  initialPreset?: CustomDietPreset | null;
}

export default function DietBuilderModal({ isOpen, onClose, onLogMeal, initialPreset }: DietBuilderModalProps) {
  // Pool states
  const [foodBases, setFoodBases] = useState<FoodBaseOption[]>([]);
  const [foodAdditions, setFoodAdditions] = useState<FoodAdditionOption[]>([]);

  // Selection states
  const [selectedCategory, setSelectedCategory] = useState<string>('فطور');
  const [selectedBase, setSelectedBase] = useState<FoodBaseOption | null>(null);
  const [qty, setQty] = useState<number>(2);
  const [customQtyInput, setCustomQtyInput] = useState<string>('');
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]); // names list

  // Quick action pin alert
  const [pinSuccess, setPinSuccess] = useState(false);

  // Dynamic creation forms visibility
  const [showAddBaseForm, setShowAddBaseForm] = useState(false);
  const [showAddAdditionForm, setShowAddAdditionForm] = useState(false);

  // Dynamic creation inputs
  const [newBaseName, setNewBaseName] = useState('');
  const [newBaseCals, setNewBaseCals] = useState('70');
  const [newBaseProtein, setNewBaseProtein] = useState('6');
  const [newBaseCarbs, setNewBaseCarbs] = useState('1');
  const [newBaseFats, setNewBaseFats] = useState('5');
  const [newBaseUnitLabel, setNewBaseUnitLabel] = useState('حبة');

  const [newAdditionName, setNewAdditionName] = useState('');
  const [newAdditionCals, setNewAdditionCals] = useState('45');
  const [newAdditionProtein, setNewAdditionProtein] = useState('4');
  const [newAdditionCarbs, setNewAdditionCarbs] = useState('1');
  const [newAdditionFats, setNewAdditionFats] = useState('3');

  // Load pools
  useEffect(() => {
    if (isOpen) {
      const bases = customTrackerStore.getFoodBasesPool();
      const additions = customTrackerStore.getFoodAdditionsPool();
      setFoodBases(bases);
      setFoodAdditions(additions);
      
      if (initialPreset) {
        const matchedBase = bases.find(b => b.name === initialPreset.foodBaseName);
        if (matchedBase) {
          setSelectedBase(matchedBase);
        } else {
          const tempBase: FoodBaseOption = {
            name: initialPreset.foodBaseName,
            calories: Math.round(initialPreset.totalCalories / (initialPreset.qty || 1)),
            protein: initialPreset.totalProtein / (initialPreset.qty || 1),
            carbs: initialPreset.totalCarbs / (initialPreset.qty || 1),
            fats: initialPreset.totalFats / (initialPreset.qty || 1),
            defaultQty: initialPreset.qty,
            unitLabel: initialPreset.foodBaseName.includes('جرام') ? 'جرام' : 'حبة'
          };
          setSelectedBase(tempBase);
        }
        setQty(initialPreset.qty);
        setSelectedAdditions(initialPreset.additionsNames || []);
      } else {
        if (bases.length > 0) {
          setSelectedBase(bases[0]);
          setQty(bases[0].defaultQty);
        }
        setSelectedAdditions([]);
      }
    }
  }, [isOpen, initialPreset]);

  // Compute stats in real-time
  const computedMetrics = React.useMemo(() => {
    if (!selectedBase) return { calories: 0, protein: 0, carbs: 0, fats: 0 };

    let ratio = qty;
    // If the base contains "جرام" in its unit or option, we typically count per 100g.
    // Let's check unit label.
    if (selectedBase.unitLabel === 'جرام') {
      ratio = qty / 100;
    }

    // Scale base food macros by ratio
    let baseCals = selectedBase.calories * ratio;
    let baseProtein = selectedBase.protein * ratio;
    let baseCarbs = selectedBase.carbs * ratio;
    let baseFats = selectedBase.fats * ratio;

    // Add selected additions macros
    foodAdditions.forEach(addon => {
      if (selectedAdditions.includes(addon.name)) {
        baseCals += addon.calories;
        baseProtein += addon.protein;
        baseCarbs += addon.carbs;
        baseFats += addon.fats;
      }
    });

    return {
      calories: Math.round(baseCals),
      protein: Math.round(baseProtein * 10) / 10,
      carbs: Math.round(baseCarbs * 10) / 10,
      fats: Math.round(baseFats * 10) / 10
    };
  }, [selectedBase, qty, selectedAdditions, foodAdditions]);

  const builtDisplayName = React.useMemo(() => {
    if (!selectedBase) return '';
    let name = `${qty} ${selectedBase.unitLabel} ${selectedBase.name.replace(/🥚|🍳|🍗|🥩|🐟|🧀|🥛|🌾|🫘/g, '').trim()}`;
    const addOnList: string[] = [];
    selectedAdditions.forEach(add => {
      addOnList.push(add.replace(/🧀|🌿|🫒|🍅|🫑|🧈|🥒|🍞/g, '').trim());
    });
    if (addOnList.length > 0) {
      name += ` + ومضاف له (${addOnList.join(' و')})`;
    }
    return name;
  }, [selectedBase, qty, selectedAdditions]);

  const handleAddNewFoodBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaseName.trim()) return;
    const newFood: FoodBaseOption = {
      name: newBaseName.trim(),
      calories: Number(newBaseCals) || 0,
      protein: Number(newBaseProtein) || 0,
      carbs: Number(newBaseCarbs) || 0,
      fats: Number(newBaseFats) || 0,
      defaultQty: newBaseUnitLabel === 'جرام' ? 150 : 2,
      unitLabel: newBaseUnitLabel.trim() || 'حبة'
    };
    const updated = customTrackerStore.addFoodBase(newFood);
    setFoodBases(updated);
    setSelectedBase(newFood);
    setQty(newFood.defaultQty);
    setNewBaseName('');
    setShowAddBaseForm(false);
  };

  const handleAddNewAddition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdditionName.trim()) return;
    const newAdd: FoodAdditionOption = {
      name: newAdditionName.trim(),
      calories: Number(newAdditionCals) || 0,
      protein: Number(newAdditionProtein) || 0,
      carbs: Number(newAdditionCarbs) || 0,
      fats: Number(newAdditionFats) || 0
    };
    const updated = customTrackerStore.addFoodAddition(newAdd);
    setFoodAdditions(updated);
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
    if (!selectedBase) return;

    // If we are editing an existing preset and changed its name, delete the old name from store first
    if (initialPreset && initialPreset.displayName !== builtDisplayName) {
      customTrackerStore.unpinDiet(initialPreset.displayName);
    }

    customTrackerStore.pinDiet({
      foodBaseName: selectedBase.name,
      qty: qty,
      additionsNames: selectedAdditions,
      totalCalories: computedMetrics.calories,
      totalProtein: computedMetrics.protein,
      totalCarbs: computedMetrics.carbs,
      totalFats: computedMetrics.fats,
      displayName: builtDisplayName
    });
    setPinSuccess(true);
    // dispatch event
    window.dispatchEvent(new Event('dietQuickPinnedChanged'));
    setTimeout(() => setPinSuccess(false), 2000);
  };

  const handleLog = async () => {
    if (!selectedBase) return;
    await onLogMeal(
      builtDisplayName,
      selectedCategory,
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
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-gray-800 dark:text-gray-150">خلاط ومصمم وجبات المطبخ الذكي للدايت 🍽️</h2>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">اصنع الوجبة، حدد حجم الحصة ومكوناتها الإضافية لحساب السعرات</p>
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
            <span className="text-[9px] font-black text-gray-400 block">تفصيل طبق الطعام الحالي:</span>
            <div className="font-extrabold text-xs text-emerald-600 break-words">
              {builtDisplayName || 'يرجى تجميع مكونات وجبتك ومقاديرها...'}
            </div>
          </div>

          {/* Section 0: Meal Category Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-600 dark:text-gray-400 block">فئة الوجبة:</label>
            <div className="flex gap-2">
              {['فطور', 'غداء', 'عشاء', 'سناك'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 py-2 font-bold text-xs rounded-xl active:scale-95 transition-all text-center cursor-pointer border ${
                    selectedCategory === cat
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-transparent'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Food Base selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-gray-600 dark:text-gray-400">١. اختر المكون الأساسي (البروتين/الدقيق):</label>
              <button 
                type="button"
                onClick={() => setShowAddBaseForm(!showAddBaseForm)}
                className="text-[9.5px] font-extrabold text-emerald-600 hover:underline cursor-pointer flex items-center gap-0.5"
              >
                {showAddBaseForm ? "الرجوع للقائمة ✕" : "➕ إضافة طعام جديد للقائمة"}
              </button>
            </div>

            {showAddBaseForm ? (
              <form onSubmit={handleAddNewFoodBase} className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-3">
                <span className="text-[9.5px] font-bold text-emerald-600 block">مكون طعام لم تجده؟ تسوقه وأضفه للثلاجة هنا:</span>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text" 
                    required
                    placeholder="اسم المكون (مثال: صدور بط فريش 🦆)"
                    value={newBaseName}
                    onChange={(e) => setNewBaseName(e.target.value)}
                    className="col-span-2 text-xs px-3 py-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-right outline-none dark:text-white"
                  />
                  <div className="space-y-1">
                    <span className="text-[8px] text-gray-400 font-bold block">وحدة القياس ووحدتها:</span>
                    <input 
                      type="text" 
                      placeholder="بيضة، جرام، علبة، ثمرة"
                      value={newBaseUnitLabel}
                      onChange={(e) => setNewBaseUnitLabel(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 rounded-xl text-right outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-gray-400 font-bold block">السعرات لكل حصة:</span>
                    <input 
                      type="number"
                      placeholder="السعرات لـ 100 جرام / حصة"
                      value={newBaseCals}
                      onChange={(e) => setNewBaseCals(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 rounded-xl text-center outline-none"
                    />
                  </div>
                  <div className="col-span-2 grid grid-cols-3 gap-1 shadow-xs p-1.5 bg-white dark:bg-black/10 rounded-xl">
                    <div>
                      <span className="text-[7px] text-gray-400 block text-center">البروتين (ج)</span>
                      <input type="number" value={newBaseProtein} onChange={(e) => setNewBaseProtein(e.target.value)} className="w-[100%] text-xs py-0.5 border-none text-center bg-transparent" />
                    </div>
                    <div>
                      <span className="text-[7px] text-gray-400 block text-center">النشويات (ج)</span>
                      <input type="number" value={newBaseCarbs} onChange={(e) => setNewBaseCarbs(e.target.value)} className="w-[100%] text-xs py-0.5 border-none text-center bg-transparent" />
                    </div>
                    <div>
                      <span className="text-[7px] text-gray-400 block text-center">الدهون (ج)</span>
                      <input type="number" value={newBaseFats} onChange={(e) => setNewBaseFats(e.target.value)} className="w-[100%] text-xs py-0.5 border-none text-center bg-transparent" />
                    </div>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  حفظ في الثلاجة والدخول لمطبخك 💾
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-150/40 dark:border-white/5 rounded-2xl scrollbar-hide">
                {foodBases.map((base) => (
                  <button
                    key={base.name}
                    type="button"
                    onClick={() => {
                      setSelectedBase(base);
                      setQty(base.defaultQty);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl text-right transition-all cursor-pointer text-xs ${
                      selectedBase?.name === base.name 
                        ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 font-black' 
                        : 'bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-100/70'
                    }`}
                  >
                    <span className="truncate flex-1 font-bold">{base.name}</span>
                    {selectedBase?.name === base.name && <Check className="w-3.5 h-3.5 mr-1 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Quantity Selection */}
          {selectedBase && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-600 dark:text-gray-400">٢. مقدار أو وزن الحصة ({selectedBase.unitLabel}):</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {(selectedBase.unitLabel === 'جرام' 
                  ? [50, 100, 150, 200, 250, 300] 
                  : [0.5, 1, 1.5, 2, 2.5, 3, 4]
                ).map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => {
                      setQty(val);
                      setCustomQtyInput('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                      qty === val && !customQtyInput
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {val} {selectedBase.unitLabel}
                  </button>
                ))}
                <div className="flex items-center gap-2 shrink-0">
                  <input 
                    type="number"
                    placeholder="مخصص"
                    value={customQtyInput}
                    onChange={(e) => {
                      setCustomQtyInput(e.target.value);
                      setQty(Number(e.target.value) || selectedBase.defaultQty);
                    }}
                    className="w-16 text-[9.5px] px-2 py-1 bg-gray-50 dark:bg-[#1D1D1D] border border-gray-150/40 rounded-lg text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Additions selection */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-gray-600 dark:text-gray-400 font-extrabold">٣. إضافات، محسنات وطبقة طعم كيتونية (أجبان/زعتر):</label>
              <button 
                type="button"
                onClick={() => setShowAddAdditionForm(!showAddAdditionForm)}
                className="text-[9.5px] font-extrabold text-emerald-600 hover:underline cursor-pointer"
              >
                {showAddAdditionForm ? "الرجوع للقائمة ✕" : "➕ إضافة إضافة طعام جديدة"}
              </button>
            </div>

            {showAddAdditionForm ? (
              <form onSubmit={handleAddNewAddition} className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="اسم طبقة الإضافة (مثال: جبن ريكوتا دايت 🧀)"
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
                <button type="submit" className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs rounded-xl text-white">
                  حفظ الإضافة الجانبية 💾
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {foodAdditions.map((addon) => {
                  const isSelected = selectedAdditions.includes(addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddition(addon.name)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-center transition-all flex items-center gap-1 cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black'
                          : 'bg-gray-50/40 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <Check className={`w-3 h-3 text-emerald-500 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                      <span>{addon.name} (+{addon.calories} ك)</span>
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
          <div className="grid grid-cols-4 gap-2 text-center" dir="rtl">
            <div className="bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-100">
              <span className="text-[8px] text-gray-400 font-black block">السعرات الكلية</span>
              <span className="text-[#E07A5F] font-black text-xs">{computedMetrics.calories} سعرة 🔥</span>
            </div>
            <div className="bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-100">
              <span className="text-[8px] text-gray-400 font-black block">البروتين</span>
              <span className="text-emerald-500 font-black text-xs">{computedMetrics.protein} جرام 💪</span>
            </div>
            <div className="bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-100">
              <span className="text-[8px] text-gray-400 font-black block">النشويات</span>
              <span className="text-sky-500 font-black text-xs">{computedMetrics.carbs} جرام 🌾</span>
            </div>
            <div className="bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-100">
              <span className="text-[8px] text-gray-400 font-black block">الدهون الصحية</span>
              <span className="text-amber-500 font-black text-xs">{computedMetrics.fats} جرام 🧈</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePinAsQuickAction}
              className={`px-3 py-3 border border-emerald-500/20 text-emerald-650 bg-emerald-500/5 font-black text-xs rounded-2xl active:scale-95 transition-all text-center flex items-center justify-center gap-1 shrink-0 select-none cursor-pointer hover:bg-emerald-500/10`}
            >
              <Star className={`w-3.5 h-3.5 ${pinSuccess ? 'stroke-amber-500 fill-amber-300' : ''}`} />
              <span>{pinSuccess ? 'تم التثبيت بنجاح!' : 'تثبيت كزر سريع للدايت 📌'}</span>
            </button>

            <button
              type="button"
              onClick={handleLog}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 font-black text-xs rounded-2xl text-center active:scale-95 transition-all text-white flex items-center justify-center gap-1.5 select-none cursor-pointer shadow-md shadow-emerald-500/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>سجل الوجبة في جدول الدايت اليوم 🚀</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
