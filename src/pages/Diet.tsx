import { COMMON_FOODS } from '../data/foods';
import { Flame, Target, Plus, Search, ChevronRight, Check, Utensils, Coffee, Sandwich, Pizza, Moon, Bell, Activity, ArrowDown, ArrowUp, MoveRight, X, Camera, Sparkles, Send, Scale, ChevronDown, BookOpen, Lightbulb, Zap, Award, Droplet, Brain, ChefHat, Trash2, Save, FolderHeart, ShoppingCart, Archive, Printer, Calendar, Dumbbell, AlertTriangle, Salad, Layers, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import DietBuilderModal from '../components/DietBuilderModal';
import { customTrackerStore } from '../lib/custom-tracker-store';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts';

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: number;
  category: string;
}

interface InBodyLog {
  id: string;
  weight: number;
  muscleMass?: number;
  fatMass?: number;
  fatPercentage?: number;
  waterPercentage?: number;
  bmr?: number;
  timestamp: number;
}

interface DrinkAddon {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  category: 'sweetener' | 'milk' | 'flavour';
}

interface DrinkPreset {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  addonsIds: string[];
}

const DRINK_ADDONS: DrinkAddon[] = [
  { id: 'sugar_1', name: 'ملعقة سكر أبيض 🥄', calories: 20, protein: 0, carbs: 5, fats: 0, category: 'sweetener' },
  { id: 'stevia', name: 'سكر ستيفيا دايت ✨', calories: 0, protein: 0, carbs: 0, fats: 0, category: 'sweetener' },
  { id: 'honey_1', name: 'ملعقة عسل نحل طبيعي 🍯', calories: 25, protein: 0, carbs: 6, fats: 0, category: 'sweetener' },
  { id: 'milk_whole', name: 'رشة حليب كامل الدسم 🥛', calories: 30, protein: 1.5, carbs: 3, fats: 1.5, category: 'milk' },
  { id: 'milk_skim', name: 'حليب خالي الدسم 🥛', calories: 15, protein: 1.5, carbs: 2, fats: 0.1, category: 'milk' },
  { id: 'milk_almond', name: 'حليب لوز دايت 🥛', calories: 10, protein: 0.2, carbs: 1, fats: 0.8, category: 'milk' },
  { id: 'espresso_shot', name: 'شوت اسبريسو إضافي ☕️', calories: 5, protein: 0.2, carbs: 0.5, fats: 0, category: 'flavour' },
  { id: 'cocoa_powder', name: 'رشة قرفة / كاكاو فريش 🍫', calories: 4, protein: 0.1, carbs: 0.8, fats: 0.1, category: 'flavour' },
  { id: 'caramel_syrup', name: 'صوص كراميل لايت / بندق 🍯', calories: 15, protein: 0, carbs: 4.0, fats: 0, category: 'flavour' }
];

const DRINK_PRESETS: DrinkPreset[] = [
  {
    name: 'شاي بلبن ميزو وسكر دافيء ☕️🥛',
    calories: 110,
    protein: 3,
    carbs: 13,
    fats: 5,
    addonsIds: ['milk_whole', 'sugar_1']
  },
  {
    name: 'قهوة لاتيه دبل شوت بندق 🥜☕️',
    calories: 140,
    protein: 4,
    carbs: 15,
    fats: 6,
    addonsIds: ['milk_whole', 'espresso_shot', 'caramel_syrup']
  },
  {
    name: 'قهوة فرنساوى دايت 🇫🇷☕️',
    calories: 45,
    protein: 3,
    carbs: 5,
    fats: 1.5,
    addonsIds: ['milk_skim', 'stevia']
  },
  {
    name: 'شاي أحمر دايت بالنعناع 🌿🍵',
    calories: 2,
    protein: 0,
    carbs: 0.1,
    fats: 0,
    addonsIds: ['stevia']
  }
];



export const DIET_DRINK_PRESETS = [
  { name: 'قهوة تركي سادة ☕', calories: 2, protein: 0, carbs: 0, fats: 0, factor: 0.85, ml: 150 },
  { name: 'شاي أحمر دايت 🍵', calories: 1, protein: 0, carbs: 0, fats: 0, factor: 0.85, ml: 250 },
  { name: 'ماء نقي بارد 🥛', calories: 0, protein: 0, carbs: 0, fats: 0, factor: 1.0, ml: 250 },
  { name: 'لاتيه قهوة بحليب خالي دسم 🥛☕', calories: 65, protein: 6, carbs: 9, fats: 0.5, factor: 0.85, ml: 250 },
  { name: 'نسكافيه بلاك دايت ☕', calories: 4, protein: 0, carbs: 0.5, fats: 0, factor: 0.85, ml: 250 },
  { name: 'شاي أزرق هادئ 🍵', calories: 2, protein: 0, carbs: 0, fats: 0, factor: 0.9, ml: 200 },
  { name: 'ينسون دافئ مهدئ 🌿', calories: 2, protein: 0, carbs: 0.5, fats: 0, factor: 0.95, ml: 250 },
  { name: 'نعناع بالليمون دايت 🍋', calories: 15, protein: 0, carbs: 3, fats: 0, factor: 0.95, ml: 250 },
  { name: 'كركديه بارد منعش 🍹', calories: 20, protein: 0, carbs: 5, fats: 0, factor: 0.95, ml: 250 },
  { name: 'سحلب بالمكسرات دايت 🥛', calories: 130, protein: 4, carbs: 22, fats: 2.5, factor: 0.7, ml: 250 },
  { name: 'جنزبيل بالليمون 🍋', calories: 10, protein: 0, carbs: 2.2, fats: 0, factor: 0.95, ml: 200 },
  { name: 'تمر هندي طبيعي دايت 🧉', calories: 45, protein: 0.5, carbs: 11, fats: 0, factor: 0.9, ml: 250 },
  { name: 'سوبيا لايت بلمسة حليب 🥛', calories: 75, protein: 3, carbs: 15, fats: 1, factor: 0.8, ml: 250 },
  { name: 'خروب طبيعي بدون سكر 🤎', calories: 15, protein: 0.2, carbs: 3.5, fats: 0, factor: 0.9, ml: 250 },
  { name: 'قرفة باللبن خالي الدسم 🥛', calories: 95, protein: 7, carbs: 12, fats: 0.5, factor: 0.85, ml: 200 },
  { name: 'شاي كرك بالحليب لايت ☕', calories: 50, protein: 3, carbs: 7, fats: 0.4, factor: 0.8, ml: 150 },
  { name: 'عصير برتقال فريش 🍊', calories: 90, protein: 1.5, carbs: 21, fats: 0.2, factor: 0.9, ml: 250 },
  { name: 'عصير مانجو فريش 🥭', calories: 120, protein: 1, carbs: 29, fats: 0.3, factor: 0.9, ml: 250 },
  { name: 'عصير رمان طبيعي 🥤', calories: 100, protein: 1, carbs: 24, fats: 0.2, factor: 0.9, ml: 250 },
  { name: 'بلاك كوفي ☕', calories: 3, protein: 0.2, carbs: 0, fats: 0, factor: 0.85, ml: 200 },
  { name: 'ماتشا لاتيه 🍵', calories: 95, protein: 5, carbs: 14, fats: 1.5, factor: 0.85, ml: 250 },
  { name: 'آيس كوفي دايت 🧊', calories: 35, protein: 2.5, carbs: 6, fats: 0.1, factor: 0.8, ml: 250 },
  { name: 'سبرايت دايت 🥤', calories: 0, protein: 0, carbs: 0.1, fats: 0, factor: 0.0, ml: 330 },
  { name: 'مياه فوارة بالليمون 🍋', calories: 0, protein: 0, carbs: 0, fats: 0, factor: 1.0, ml: 330 }
];

export default function Diet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, setProfile, isFastingMode } = useAppContext();
  const isFemale = profile.gender === 'female';
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isDietCreatorOpen, setIsDietCreatorOpen] = useState(false);

  const [pinnedWaterConfig, setPinnedWaterConfig] = useState(() => customTrackerStore.getPinnedWater());
  const [pinnedDietConfig, setPinnedDietConfig] = useState(() => customTrackerStore.getPinnedDiet());

  useEffect(() => {
    const handleWaterPinChange = () => {
      setPinnedWaterConfig(customTrackerStore.getPinnedWater());
    };
    const handleDietPinChange = () => {
      setPinnedDietConfig(customTrackerStore.getPinnedDiet());
    };
    window.addEventListener('waterQuickPinnedChanged', handleWaterPinChange);
    window.addEventListener('dietQuickPinnedChanged', handleDietPinChange);
    return () => {
      window.removeEventListener('waterQuickPinnedChanged', handleWaterPinChange);
      window.removeEventListener('dietQuickPinnedChanged', handleDietPinChange);
    };
  }, []);

  const handleLogMealFromModal = async (
    name,
    category,
    calories,
    carbs,
    protein,
    fats
  ) => {
    if (!user) return;
    const newMeal = {
      name: name || 'وجبة مخصصة',
      category: category || 'فطور',
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fats: Math.round(fats * 10) / 10,
      timestamp: Date.now()
    };

    if (user.uid === 'local_guest_user') {
      try {
        const savedMeals = localStorage.getItem('local_diet_logs');
        const list = savedMeals ? JSON.parse(savedMeals) : [];
        list.unshift({ id: `local_${Date.now()}_diet`, ...newMeal });
        localStorage.setItem('local_diet_logs', JSON.stringify(list));
        window.dispatchEvent(new Event('localDietUpdated'));
      } catch (e) {
        console.error("Local meal error mapping builder:", e);
      }
    } else {
      try {
        await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
      } catch (e) {
        console.error("Cloud meal mapping builder error:", e);
      }
    }
  };
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [inBodyLogs, setInBodyLogs] = useState<InBodyLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Expandable Card state (null | 'diet' | 'inbody' | 'tips' | 'fasting' | 'ideas')
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // +++ أضيفت لدعم كروت القسم الذكي للمطبخ بناءً على طلبك +++
  const [isDietSysExpanded, setIsDietSysExpanded] = useState(true);
  const [isMaterialsExpanded, setIsMaterialsExpanded] = useState(false);
  const [isEatExpanded, setIsEatExpanded] = useState(false);
  const [isMissingExpanded, setIsMissingExpanded] = useState(false);
  const [isCookSuggestionsExpanded, setIsCookSuggestionsExpanded] = useState(true);

  // AI Meal Nutrition Estimator state
  const [isEstimating, setIsEstimating] = useState(false);

  // InBody Logs input states
  const [isInBodyModalOpen, setIsInBodyModalOpen] = useState(false);
  const [ibWeight, setIbWeight] = useState('');
  const [ibMuscle, setIbMuscle] = useState('');
  const [ibFatMass, setIbFatMass] = useState('');
  const [ibFatPercentage, setIbFatPercentage] = useState('');
  const [ibWater, setIbWater] = useState('');
  const [ibBmr, setIbBmr] = useState('');
  const [isInBodySaving, setIsInBodySaving] = useState(false);

  // View States
  const [activeDateTab, setActiveDateTab] = useState('⚖️ الوزن والسعرات');
  const [weightGoal, setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');

  // +++ أضيفت لدعم تتبع مقاسات الجسم بشكل حقيقي ومحلي ومحمي +++
  const [bodyMeasurements, setBodyMeasurements] = useState<any[]>(() => {
    const saved = localStorage.getItem('local_body_measurements');
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '٢٠٢٦/٠٥/١٥', chest: 102, waist: 88, hips: 98, arms: 37, thighs: 56 },
      { id: '2', date: '٢٠٢٦/٠٥/٢٩', chest: 99, waist: 84, hips: 96, arms: 36, thighs: 55 }
    ];
  });
  const [measChest, setMeasChest] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [measHips, setMeasHips] = useState('');
  const [measArms, setMeasArms] = useState('');
  const [measThighs, setMeasThighs] = useState('');
  const [isMeasModalOpen, setIsMeasModalOpen] = useState(false);

  // +++ تذكيرات لطيفة وجدول مواقيت القياسات الذكي +++
  const [measurementReminderDay, setMeasurementReminderDay] = useState(() => {
    return localStorage.getItem('measurement_reminder_day') || 'السبت';
  });
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);

  // +++ تقرير دايت الطبيب المعتمد للطباعة والتحميل +++
  const [isDoctorReportOpen, setIsDoctorReportOpen] = useState(false);
  const [drNotes, setDrNotes] = useState('الالتزام بالمؤشرات العامة والماكروز في الحدود المطلوبة. يوصى بمراقبة نسبة العضلات وزيادة شرب الماء.');

  // +++ إضافة تمرين رياضي لزيادة ميزانية السعرات اليومية تلقائياً +++
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [workoutCalories, setWorkoutCalories] = useState('');
  const [workoutType, setWorkoutType] = useState('مقاومة حديد 💪');
  const [exerciseBurned, setExerciseBurned] = useState<number>(() => {
    const saved = localStorage.getItem('local_exercise_burned_today');
    return saved ? Number(saved) : 0;
  });

  // Add Meal State
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('فطار');
  const [mealName, setMealName] = useState('');
  const [searchFood, setSearchFood] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  // +++ أضيفت لدعم إضافة مشروبات مخصصة بالاسم والكلوري بناءً على طلبك +++
  const [customDietDrinkName, setCustomDietDrinkName] = useState('');
  const [customDietDrinkCalories, setCustomDietDrinkCalories] = useState('');
  const [selectedDietPresetIndex, setSelectedDietPresetIndex] = useState(0);
  const [showDietCustomInputs, setShowDietCustomInputs] = useState(false);

  // +++ أضيف بناءً على طلبك - إدارة إضافات وتعديل وتوليد المشروبات الذكية +++
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showDrinkMixer, setShowDrinkMixer] = useState(false);

  const isProbablyDrink = useMemo(() => {
     const drinkKeywords = ['شاي', 'قهوة', 'نسكافيه', 'مشروب', 'حليب', 'لبن', 'لاتيه', 'عصير', 'سفن', 'كولا', 'مياه', 'ماء', 'زهورات', 'ينسون', 'نعناع', 'كركديه', 'كابتشينو', 'موكا', 'beverage', 'tea', 'coffee', 'latte', 'juice'];
     return drinkKeywords.some(kw => mealName.toLowerCase().includes(kw));
  }, [mealName]);

  useEffect(() => {
     if (isProbablyDrink || selectedCategory === 'مشروبات') {
        setShowDrinkMixer(true);
     }
  }, [isProbablyDrink, selectedCategory]);

  useEffect(() => {
    if (!isAddingMode) {
      setSelectedAddons([]);
      setShowDrinkMixer(false);
    }
  }, [isAddingMode]);

  const handleToggleAddon = (addon: DrinkAddon) => {
    setSelectedBaseFood(null);
    const isSelected = selectedAddons.includes(addon.id);
    const cleanAddonName = addon.name.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F30B}-\u{1F320}\u{1F330}-\u{1F35A}\u{1F35C}-\u{1F393}\u{1F3A0}-\u{1F3C4}\u{1F3C6}-\u{1F3CA}\u{1F3E0}-\u{1F3F0}]/gu, '').trim();
    const addonText = ` + ${cleanAddonName}`;
    
    if (isSelected) {
      setSelectedAddons(prev => prev.filter(id => id !== addon.id));
      setCalories(prev => {
         const currentVal = Math.max(0, (parseFloat(prev) || 0) - addon.calories);
         return currentVal === 0 ? '' : Math.round(currentVal).toString();
      });
      setProtein(prev => {
         const currentVal = Math.max(0, (parseFloat(prev) || 0) - addon.protein);
         return currentVal === 0 ? '' : (Math.round(currentVal * 10) / 10).toString();
      });
      setCarbs(prev => {
         const currentVal = Math.max(0, (parseFloat(prev) || 0) - addon.carbs);
         return currentVal === 0 ? '' : (Math.round(currentVal * 10) / 10).toString();
      });
      setFats(prev => {
         const currentVal = Math.max(0, (parseFloat(prev) || 0) - addon.fats);
         return currentVal === 0 ? '' : (Math.round(currentVal * 10) / 10).toString();
      });
      setMealName(prev => {
         return prev.replace(addonText, '').replace(addonText.trim(), '').trim();
      });
    } else {
      setSelectedAddons(prev => [...prev, addon.id]);
      setCalories(prev => {
         const currentVal = (parseFloat(prev) || 0) + addon.calories;
         return Math.round(currentVal).toString();
      });
      setProtein(prev => {
         const currentVal = (parseFloat(prev) || 0) + addon.protein;
         return (Math.round(currentVal * 10) / 10).toString();
      });
      setCarbs(prev => {
         const currentVal = (parseFloat(prev) || 0) + addon.carbs;
         return (Math.round(currentVal * 10) / 10).toString();
      });
      setFats(prev => {
         const currentVal = (parseFloat(prev) || 0) + addon.fats;
         return (Math.round(currentVal * 10) / 10).toString();
      });
      setMealName(prev => {
         const base = prev.trim();
         if (!base) {
           return cleanAddonName;
         }
         return base + addonText;
      });
    }
  };

  const handleSelectDrinkPreset = (preset: DrinkPreset) => {
     setSelectedBaseFood(null);
     setMealName(preset.name);
     setCalories(preset.calories.toString());
     setProtein(preset.protein.toString());
     setCarbs(preset.carbs.toString());
     setFats(preset.fats.toString());
     setSelectedAddons(preset.addonsIds);
     setSelectedCategory('مشروبات');
  };

  // +++ أضيف بناءً على طلبك - تخزين مشروبات العميل المفضلة والسابقة لإعادة الاستخدام السريع +++
  const [customDrinkPresets, setCustomDrinkPresets] = useState<DrinkPreset[]>(() => {
    try {
      const saved = localStorage.getItem('local_custom_drink_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentDrinks, setRecentDrinks] = useState<DrinkPreset[]>(() => {
    try {
      const saved = localStorage.getItem('local_recent_drinks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSaveCurrentDrinkAsPreset = () => {
    if (!mealName.trim()) return;
    const cleanName = mealName.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F30B}-\u{1F320}\u{1F330}-\u{1F35A}\u{1F35C}-\u{1F393}\u{1F3A0}-\u{1F3C4}\u{1F3C6}-\u{1F3CA}\u{1F3E0}-\u{1F3F0}]/gu, '').trim();
    const withIcon = `🥤 ${cleanName}`;
    const newPreset: DrinkPreset = {
      name: withIcon,
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      addonsIds: [...selectedAddons]
    };
    const updated = [newPreset, ...customDrinkPresets.filter(p => p.name !== newPreset.name)].slice(0, 15);
    setCustomDrinkPresets(updated);
    localStorage.setItem('local_custom_drink_presets', JSON.stringify(updated));
  };

  const handleDeleteCustomDrinkPreset = (nameToDelete: string, type: 'fav' | 'recent') => {
    if (type === 'fav') {
      const updated = customDrinkPresets.filter(p => !p.name.includes(nameToDelete) && p.name !== nameToDelete);
      setCustomDrinkPresets(updated);
      localStorage.setItem('local_custom_drink_presets', JSON.stringify(updated));
    } else {
      const updated = recentDrinks.filter(p => p.name !== nameToDelete);
      setRecentDrinks(updated);
      localStorage.setItem('local_recent_drinks', JSON.stringify(updated));
    }
  };

  // +++ أضيف بناءً على طلبك - حالات تصنيف الغذاء والمشروبات +++
  const [activeFoodClassification, setActiveFoodClassification] = useState<'all' | 'fruit' | 'vegetable' | 'meal' | 'drink' | 'bread'>('all');

  // +++ أضيف بناءً على طلبك لتسجيل الحصص والمقادير ومطبخ دايت ذكي متكامل +++
  const [portionQty, setPortionQty] = useState('1');
  const [portionUnit, setPortionUnit] = useState('piece');
  const [selectedBaseFood, setSelectedBaseFood] = useState<any | null>(null);

  const [isKitchenOpen, setIsKitchenOpen] = useState(false);
  const [kitchenIngredients, setKitchenIngredients] = useState<any[]>([]);
  const [kitchenSearch, setKitchenSearch] = useState('');
  const [kitchenSearchClassification, setKitchenSearchClassification] = useState<'all' | 'fruit' | 'vegetable' | 'meal'>('all');
  const [kitchenMealName, setKitchenMealName] = useState('طبخة دايت منزلية 🥘');
  const [kitchenServings, setKitchenServings] = useState('1');
  const [kitchenSelectedCategory, setKitchenSelectedCategory] = useState('غداء');

  const [kiQty, setKiQty] = useState('1');
  const [kiUnit, setKiUnit] = useState('piece');
  const [kiPredefinedFood, setKiPredefinedFood] = useState<any | null>(null);

  // +++ أضيف بناءً على طلبك - إدارة الوصفات والطبخات المحفوظة وتعديل كمياتها +++
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);

  // +++ حالات ثلاجة المنزل ومحرك الاقتراحات والمشتريات والمطبخ - أضيفت بناءً على طلبك +++
  const [fridgeItems, setFridgeItems] = useState<any[]>([]);
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [newFridgeName, setNewFridgeName] = useState('');
  const [newFridgeCategory, setNewFridgeCategory] = useState('بروتينات');
  const [newShoppingName, setNewShoppingName] = useState('');
  const [newShoppingCategory, setNewShoppingCategory] = useState('بروتينات');

  useEffect(() => {
    try {
      const savedFridge = localStorage.getItem('local_fridge_inventory');
      if (savedFridge) {
        setFridgeItems(JSON.parse(savedFridge));
      } else {
        const defaultFridge = [
          { id: 'f_1', name: 'بيض بلدي', category: 'بروتينات', status: 'available' },
          { id: 'f_2', name: 'لبن كامل الدسم', category: 'ألبان', status: 'available' },
          { id: 'f_3', name: 'جبنة قريش', category: 'ألبان', status: 'available' },
          { id: 'f_4', name: 'صدر دجاج', category: 'بروتينات', status: 'available' },
          { id: 'f_5', name: 'طماطم طازجة', category: 'خضراوات', status: 'available' },
          { id: 'f_6', name: 'خيار أخضر', category: 'خضراوات', status: 'available' },
          { id: 'f_7', name: 'تفاح أحمر', category: 'فواكه', status: 'available' },
          { id: 'f_8', name: 'موز بلدي', category: 'فواكه', status: 'available' },
          { id: 'f_9', name: 'شوفان كامل الحبة', category: 'نشويات', status: 'available' },
          { id: 'f_10', name: 'شاي ورق', category: 'أخرى', status: 'available' }
        ];
        setFridgeItems(defaultFridge);
        localStorage.setItem('local_fridge_inventory', JSON.stringify(defaultFridge));
      }

      const savedShopping = localStorage.getItem('local_shopping_list');
      if (savedShopping) {
        setShoppingList(JSON.parse(savedShopping));
      } else {
        const defaultShopping = [
          { id: 's_1', name: 'قهوة اسبريسو', category: 'أخرى' },
          { id: 's_2', name: 'زيت زيتون بكر', category: 'أخرى' }
        ];
        setShoppingList(defaultShopping);
        localStorage.setItem('local_shopping_list', JSON.stringify(defaultShopping));
      }
    } catch (e) {
      console.error("Error loading fridge / shopping data:", e);
    }
  }, []);

  const handleAddFridgeItem = (name: string, category: string) => {
    if (!name.trim()) return;
    const newItem = {
      id: `f_${Date.now()}`,
      name: name.trim(),
      category,
      status: 'available'
    };
    const updated = [...fridgeItems, newItem];
    setFridgeItems(updated);
    localStorage.setItem('local_fridge_inventory', JSON.stringify(updated));
    setNewFridgeName('');
  };

  const handleFinishFridgeItem = (id: string) => {
    const itemToFinish = fridgeItems.find(i => i.id === id);
    if (!itemToFinish) return;

    // Remove from fridge
    const updatedFridge = fridgeItems.filter(i => i.id !== id);
    setFridgeItems(updatedFridge);
    localStorage.setItem('local_fridge_inventory', JSON.stringify(updatedFridge));

    // Add to shopping list automatically
    const newShopItem = {
      id: `s_${Date.now()}`,
      name: itemToFinish.name,
      category: itemToFinish.category
    };
    const updatedShop = [...shoppingList, newShopItem];
    setShoppingList(updatedShop);
    localStorage.setItem('local_shopping_list', JSON.stringify(updatedShop));
  };

  const handleDeleteFridgeItem = (id: string) => {
    const updated = fridgeItems.filter(i => i.id !== id);
    setFridgeItems(updated);
    localStorage.setItem('local_fridge_inventory', JSON.stringify(updated));
  };

  const handleAddShoppingItem = (name: string, category: string) => {
    if (!name.trim()) return;
    const newItem = {
      id: `s_${Date.now()}`,
      name: name.trim(),
      category
    };
    const updated = [...shoppingList, newItem];
    setShoppingList(updated);
    localStorage.setItem('local_shopping_list', JSON.stringify(updated));
    setNewShoppingName('');
  };

  const handleBuyShoppingItem = (id: string) => {
    const itemToBuy = shoppingList.find(i => i.id === id);
    if (!itemToBuy) return;

    // Remove from shopping list
    const updatedShop = shoppingList.filter(i => i.id !== id);
    setShoppingList(updatedShop);
    localStorage.setItem('local_shopping_list', JSON.stringify(updatedShop));

    // Return to fridge inventory automatically
    const newFridgeItem = {
      id: `f_${Date.now()}`,
      name: itemToBuy.name,
      category: itemToBuy.category,
      status: 'available'
    };
    const updatedFridge = [...fridgeItems, newFridgeItem];
    setFridgeItems(updatedFridge);
    localStorage.setItem('local_fridge_inventory', JSON.stringify(updatedFridge));
  };

  const handleDeleteShoppingItem = (id: string) => {
    const updated = shoppingList.filter(i => i.id !== id);
    setShoppingList(updated);
    localStorage.setItem('local_shopping_list', JSON.stringify(updated));
  };

  const findBaseFoodMatch = (name: string) => {
    const normalizedQuery = name.trim().toLowerCase();
    const match = COMMON_FOODS.find(f => 
      f.name.toLowerCase().includes(normalizedQuery) || 
      normalizedQuery.includes(f.name.toLowerCase())
    );
    if (match) return match;
    const words = normalizedQuery.split(/\s+/);
    for (const word of words) {
      if (word.length > 2) {
        const partialMatch = COMMON_FOODS.find(f => f.name.toLowerCase().includes(word));
        if (partialMatch) return partialMatch;
      }
    }
    return {
      name: name,
      calories: 60,
      protein: 2,
      carbs: 10,
      fats: 1,
      type: 'meal' as const
    };
  };

  const handleAddFridgeItemToKitchen = (itemName: string) => {
    const matched = findBaseFoodMatch(itemName);
    let defaultUnit = 'piece';
    let defaultQty = 1;
    let unitLabel = 'حبة';

    if (itemName.includes('لبن') || itemName.includes('حليب') || itemName.includes('زبادي')) {
      defaultUnit = 'cup';
      unitLabel = 'كوب';
    } else if (itemName.includes('دجاج') || itemName.includes('لحم') || itemName.includes('سمك') || itemName.includes('تونة')) {
      defaultUnit = 'gram';
      defaultQty = 150;
      unitLabel = 'جم';
    } else if (itemName.includes('شوفان') || itemName.includes('أرز') || itemName.includes('فول')) {
      defaultUnit = 'spoon';
      defaultQty = 5;
      unitLabel = 'ملعقة';
    }

    let multiplier = 1.0;
    if (defaultUnit === 'plate') multiplier = 2.5 * defaultQty;
    else if (defaultUnit === 'spoon') multiplier = 0.12 * defaultQty;
    else if (defaultUnit === 'cup') multiplier = 1.0 * defaultQty;
    else if (defaultUnit === 'gram') multiplier = defaultQty / 100;
    else multiplier = 1.0 * defaultQty;

    const scaledCalories = Math.round(matched.calories * multiplier);
    const scaledProtein = Math.round(matched.protein * multiplier * 10) / 10;
    const scaledCarbs = Math.round(matched.carbs * multiplier * 10) / 10;
    const scaledFats = Math.round(matched.fats * multiplier * 10) / 10;

    const newIngredient = {
      id: `ki_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: itemName,
      qty: defaultQty,
      unit: defaultUnit,
      unitLabel: unitLabel,
      scaledCalories,
      scaledProtein,
      scaledCarbs,
      scaledFats,
      baseFood: matched
    };

    setKitchenIngredients(prev => [...prev, newIngredient]);
  };

  const handleLogExternalMeal = async (name: string, category: string, cals: number, prot: number, carbsVal: number, fatsVal: number) => {
    if (!user) return;
    try {
      const newMeal = {
        name,
        category,
        calories: Math.round(cals),
        protein: Math.round(prot * 10) / 10,
        carbs: Math.round(carbsVal * 10) / 10,
        fats: Math.round(fatsVal * 10) / 10,
        timestamp: Date.now()
      };

      if (user.uid === 'local_guest_user') {
        const savedMeals = localStorage.getItem('local_diet_logs');
        const list = savedMeals ? JSON.parse(savedMeals) : [];
        const finalMeal = { id: `local_${Date.now()}`, ...newMeal };
        list.unshift(finalMeal);
        localStorage.setItem('local_diet_logs', JSON.stringify(list));
        setMeals(list.filter((m: any) => m.timestamp >= (new Date().setHours(0,0,0,0))));
      } else {
        await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
      }
    } catch (e) {
      console.error("Error logging meal:", e);
    }
  };

  const PREDEFINED_RECIPES = [
    {
      name: 'شكشوكة بالخضار والبيض البلدي 🍳',
      category: 'فطور',
      required: ['بيض', 'طماطم'],
      allIngredients: 'بيضتين (بلدي)، حبة طماطم مقطعة، فلفل أخضر، بصل صغير، قليل من الملح والفلفل الأسود الأسمر وصحي بالكامل.',
      calories: 210,
      protein: 14,
      carbs: 6,
      fats: 13
    },
    {
      name: 'سلطة جبنة قريش بالطماطم وزيت زيتون 🧀',
      category: 'فطور',
      required: ['جبنة', 'طماطم'],
      allIngredients: 'جبنة قريش دايت (150 جم)، حجر طماطم صغير مقطع، شرائح خيار طازجة، ملعقة صغيرة زيت زيتون.',
      calories: 185,
      protein: 18,
      carbs: 5,
      fats: 10
    },
    {
      name: 'سلطة جبنة قريش بالخيار والنعناع 🥒',
      category: 'عشاء',
      required: ['جبنة', 'خيار'],
      allIngredients: 'جبنة قريش دايت (150 جم)، خيار طازج مفروم، نعناع يابس أو طازج، ورشة كمون خفيفة مهدئة للمعدة.',
      calories: 145,
      protein: 17,
      carbs: 4,
      fats: 6
    },
    {
      name: 'شوفان بالحليب والموز اللذيذ 🍌🥛',
      category: 'فطور',
      required: ['شوفان', 'لبن', 'موز'],
      allIngredients: '4 ملاعق شوفان كامل، كوب حليب دافئ خالي الدسم، نصف موز مقطع حلقات، ورشة قرفة دافئة.',
      calories: 285,
      protein: 13,
      carbs: 48,
      fats: 5
    },
    {
      name: 'شوفان دافئ بالحليب والتفاح 🍎🥛',
      category: 'فطور',
      required: ['شوفان', 'لبن', 'تفاح'],
      allIngredients: '4 ملاعق شوفان كامل، كوب حليب حار منزوع الدسم، نصف تفاحة مقطعة مكعبات صغيرة مع رشة شيا وقرفة.',
      calories: 275,
      protein: 12,
      carbs: 46,
      fats: 5
    },
    {
      name: 'صدور دجاج متبلة مشوية على الجريل 🍗',
      category: 'غداء',
      required: ['دجاج'],
      allIngredients: 'صدر دجاج (150 جم) متبل بثوم مبشور، ليمون، بهارات دجاج مشوية، بابريكا، وقليل من الملح البحري صحي.',
      calories: 240,
      protein: 34,
      carbs: 2,
      fats: 8
    },
    {
      name: 'طبق سلطة دجاج بالخيار والجرجير 🥗',
      category: 'غداء',
      required: ['دجاج', 'خيار'],
      allIngredients: 'صدر دجاج مشوي مقطع، شرائح خيار مفرومة، أوراق جرجير طازجة، ملعقة خل تفاح وعصير ليمونة حامضة.',
      calories: 260,
      protein: 35,
      carbs: 4,
      fats: 9
    },
    {
      name: 'سلطة تونة صحية بالفلفل والطماطم 🐟',
      category: 'عشاء',
      required: ['تونة', 'طماطم'],
      allIngredients: 'علبة تونة مصفاة من الزيت بشكل تام، حجر طماطم مقطع، بصل أخضر مفروم، فلفل رومي حلو، رشة ليمون وكمون.',
      calories: 215,
      protein: 26,
      carbs: 4,
      fats: 9
    },
    {
      name: 'سلطة فواكه التفاح والموز الصحية 🍓🍏',
      category: 'سناكس',
      required: ['تفاح', 'موز'],
      allIngredients: 'نصف حبة تفاح مقشرة مقطعة، نصف حبة موز طيب، حبات فراولة مغسولة مقطعة مع عصير برتقال طبيعي.',
      calories: 120,
      protein: 1.5,
      carbs: 28,
      fats: 0.5
    },
    {
      name: 'عصير كوكتيل الموز باللبن الطازج 🍌🥛',
      category: 'مشروبات',
      required: ['لبن', 'موز'],
      allIngredients: 'حبة موز ناضجة، كوب حليب بارد خالي أو قليل الدسم، رشة فانيليا أو حبة تمر صغيرة للتحلية عند الرغبة.',
      calories: 195,
      protein: 8,
      carbs: 34,
      fats: 3
    },
    {
      name: 'شاي أخضر نقي بالنعناع البلدي الفواح 🍵',
      category: 'مشروبات',
      required: ['شاي'],
      allIngredients: 'ظرف أو ملعقة شاي أخضر مفيد، أوراق نعناع أخضر طازج، ماء مغلي نقي بدون سكر للاسترخاء وزيادة الحرق.',
      calories: 4,
      protein: 0,
      carbs: 1,
      fats: 0
    },
    {
      name: 'زبادي صحي بالتفاح ورشة بذور الشيا 🍨',
      category: 'سناكس',
      required: ['تفاح', 'زبادي'],
      allIngredients: 'علبة زبادي طبيعي دايت (110 جم)، ربع تفاحة مبشورة ناعم، رشة شيا أو بذور كتان مطحونة مغذية.',
      calories: 110,
      protein: 6,
      carbs: 14,
      fats: 2
    },
    {
      name: 'فول بالزيت الحار والطماطم المفرومة 🧆',
      category: 'فطور',
      required: ['فول', 'طماطم'],
      allIngredients: '6 ملاعق فول مدمس بيتي، نصف طماطم مقطعة مكعبات، ربع بصلة مفرومة، نصف ملعقة زيت زيتون أو زيت حار، ليمون وكمون.',
      calories: 190,
      protein: 10,
      carbs: 24,
      fats: 6
    },
    {
      name: 'بيضتين مسلوقة دايت مع الخيار المقرمش 🥚🥒',
      category: 'عشاء',
      required: ['بيض', 'خيار'],
      allIngredients: 'بيضتين بلدي مسلوقتين جيداً، حبة خيار مقطعة شرائح طولية، ملح خفيف ورشة كمون صحي لمكافحة الانتفاخ.',
      calories: 165,
      protein: 13,
      carbs: 3,
      fats: 11
    }
  ];

  const suggestedRecipesMatched = useMemo(() => {
    return PREDEFINED_RECIPES.map(recipe => {
      const matchedIngredients = recipe.required.filter(reqName => {
        return fridgeItems.some(item => 
          item.status !== 'finished' && 
          (item.name.toLowerCase().includes(reqName.toLowerCase()) || 
           reqName.toLowerCase().includes(item.name.toLowerCase()))
        );
      });

      const isMatch = matchedIngredients.length > 0;
      const isFullyAvailable = matchedIngredients.length === recipe.required.length;

      return {
        ...recipe,
        isMatch,
        isFullyAvailable,
        matchedCount: matchedIngredients.length,
        totalRequired: recipe.required.length,
        matchedNames: matchedIngredients
      };
    }).filter(recipe => recipe.isMatch).sort((a,b) => {
      if (a.isFullyAvailable && !b.isFullyAvailable) return -1;
      if (!a.isFullyAvailable && b.isFullyAvailable) return 1;
      return b.matchedCount - a.matchedCount;
    });
  }, [fridgeItems]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('local_kitchen_recipes');
      if (saved) {
        setSavedRecipes(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // تأثير لحساب السعرات والماكروز فوراً عند تغيير الحصة أو الكمية المدخلة
  useEffect(() => {
    if (!selectedBaseFood) return;
    const qty = parseFloat(portionQty) || 1;
    let multiplier = 1.0;
    
    if (portionUnit === 'plate') multiplier = 2.5 * qty;
    else if (portionUnit === 'spoon') multiplier = 0.12 * qty;
    else if (portionUnit === 'cup') multiplier = 1.0 * qty;
    else if (portionUnit === 'gram') multiplier = qty / 100;
    else multiplier = 1.0 * qty; // piece
    
    setCalories(Math.round(selectedBaseFood.calories * multiplier).toString());
    setProtein((Math.round(selectedBaseFood.protein * multiplier * 10) / 10).toString());
    setCarbs((Math.round(selectedBaseFood.carbs * multiplier * 10) / 10).toString());
    setFats((Math.round(selectedBaseFood.fats * multiplier * 10) / 10).toString());
  }, [portionQty, portionUnit, selectedBaseFood]);
  const [includeBeverage, setIncludeBeverage] = useState(false);
  const [beverageType, setBeverageType] = useState('ماء عادي');
  const [beverageAmount, setBeverageAmount] = useState('250');
  const [beverageFactor, setBeverageFactor] = useState(1.0);

  // AI Diet Coach States
  const [coachInput, setCoachInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: isFemale 
        ? `أهلاً بكِ يا ${profile.name || 'بطلة'}! أنا كوتش التغذية وصديقتكِ الصحية. هنا علشان أساعدكِ تفهمي أكلكِ من غير حرمان، أو لوم أو ترويع. قولي، عكيتِ في الوجبات النهاردة ونصلحها سوا؟ ولا حابة نقترح بديل مصري صحي ولذيذ؟ 🥦✨`
        : `أهلاً بك يا ${profile.name || 'بطل'}! أنا كوتش التغذية وصديقك الصحي. هنا علشان أساعدك تفهم أكلك من غير حرمان، أو لوم أو ترويع. قولي، عكيت في الوجبات النهاردة ونصلحها سوا؟ ولا حابب نقترح بديل مصري صحي ولذيذ؟ 🥦✨`
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendCoachMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;
    
    const userMsg = textToSend.trim();
    setCoachInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const resp = await fetch('/api/diet-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory.slice(-6),
          profile
        })
      });

      if (!resp.ok) throw new Error();
      const data = await resp.json();
      setChatHistory(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'عذراً صديقي، حدث خطأ في الاتصال بالمدرب الذكي. حاول مجدداً.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEstimateCalories = async () => {
    if (!mealName.trim() || isEstimating) return;
    setIsEstimating(true);
    try {
      const resp = await fetch('/api/estimate-meal-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealName })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.name) setMealName(data.name);
        if (data.calories !== undefined) setCalories(data.calories.toString());
        if (data.protein !== undefined) setProtein(data.protein.toString());
        if (data.carbs !== undefined) setCarbs(data.carbs.toString());
        if (data.fats !== undefined) setFats(data.fats.toString());
      }
    } catch (e) {
      console.error("AI Estimation failed: ", e);
    } finally {
      setIsEstimating(false);
    }
  };

  const calcAge = () => {
    if (!profile.dob) return 30; // default
    const birthDate = new Date(profile.dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : 30;
  };

  const calculateTargetCalories = () => {
    const w = profile.weight || 70;
    const h = profile.height || 170;
    const age = calcAge();
    let bmr = 0;
    
    if (profile.gender === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * age + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age - 161;
    }
    
    let tdee = bmr * 1.55; 
    
    if (weightGoal === 'lose') tdee -= 500;
    else if (weightGoal === 'gain') tdee += 500;

    return Math.round(tdee);
  };

  const targetCals = calculateTargetCalories();

  const currentDietType = profile.dietType || 'balanced';

  const getDietLabel = (type: string) => {
    switch (type) {
      case 'keto': return 'كيتو دايت 🥩';
      case 'low_carb': return 'لو كارب 🍳';
      case 'high_protein': return 'عالي البروتين 💪';
      case 'balanced':
      default: return 'متوازن صحي 🥑';
    }
  };

  // Custom ratios based on diet type
  let carbRatio = 0.50;
  let proteinRatio = 0.25;
  let fatRatio = 0.25;

  if (currentDietType === 'keto') {
    carbRatio = 0.05;
    proteinRatio = 0.25;
    fatRatio = 0.70;
  } else if (currentDietType === 'low_carb') {
    carbRatio = 0.20;
    proteinRatio = 0.40;
    fatRatio = 0.40;
  } else if (currentDietType === 'high_protein') {
    carbRatio = 0.35;
    proteinRatio = 0.40;
    fatRatio = 0.25;
  }

  const GOALS = {
    calories: targetCals,
    protein: Math.round((targetCals * proteinRatio) / 4),
    carbs: Math.round((targetCals * carbRatio) / 4),
    fats: Math.round((targetCals * fatRatio) / 9)
  };

  // BMI CALCULATION
  const bmi = profile.weight && profile.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : null;
  let bmiDesc = "";
  if (bmi) {
      if (Number(bmi) < 18.5) bmiDesc = "نحافة";
      else if (Number(bmi) < 25) bmiDesc = "وزن مثالي";
      else if (Number(bmi) < 30) bmiDesc = "وزن زائد";
      else bmiDesc = "سمنة";
  }

  // Get weight & trend data for our Interactive Recharts AreaChart
  const rechartsData = useMemo(() => {
    if (inBodyLogs.length === 0) {
      // Premium initial fake trendlines so user has immediate delightful visuals
      return [
        { date: '٠٥/١٠', 'الوزن الحالي': 78, 'الوزن المستهدف': profile.targetWeight || 70, 'الكتلة العضلية': 30, 'الدهون %': 24 },
        { date: '٠٥/١٥', 'الوزن الحالي': 77.2, 'الوزن المستهدف': profile.targetWeight || 70, 'الكتلة العضلية': 30.5, 'الدهون %': 23.1 },
        { date: '٠٥/٢٠', 'الوزن الحالي': 76.5, 'الوزن المستهدف': profile.targetWeight || 70, 'الكتلة العضلية': 31, 'الدهون %': 22 },
        { date: '٠٥/٢٥', 'الوزن الحالي': 75.8, 'الوزن المستهدف': profile.targetWeight || 70, 'الكتلة العضلية': 31.2, 'الدهون %': 21.5 },
        { date: '٠٥/٢٩', 'الوزن الحالي': profile.weight || 75, 'الوزن المستهدف': profile.targetWeight || 70, 'الكتلة العضلية': 31.5, 'الدهون %': 21 }
      ];
    }
    // Sort oldest first for progression chart
    return [...inBodyLogs].reverse().map((log, index) => {
      const dateStr = log.timestamp 
        ? new Date(log.timestamp).toLocaleDateString('ar-EG', { month: '2-digit', day: '2-digit' }) 
        : `قياس ${index + 1}`;
      return {
        date: dateStr,
        'الوزن الحالي': log.weight,
        'الوزن المستهدف': profile.targetWeight || 70,
        'الكتلة العضلية': log.muscleMass || undefined,
        'الدهون %': log.fatPercentage || undefined
      };
    });
  }, [inBodyLogs, profile]);

  // Dynamic InBody comparison between current (index 0) and previous (index 1) records
  const inBodyProgress = useMemo(() => {
    if (inBodyLogs.length < 2) return null;
    const current = inBodyLogs[0];
    const prev = inBodyLogs[1];
    
    const weightDiff = current.weight - prev.weight;
    const muscleDiff = (current.muscleMass !== null && current.muscleMass !== undefined && prev.muscleMass !== null && prev.muscleMass !== undefined) ? (current.muscleMass - prev.muscleMass) : null;
    const fatDiff = (current.fatPercentage !== null && current.fatPercentage !== undefined && prev.fatPercentage !== null && prev.fatPercentage !== undefined) ? (current.fatPercentage - prev.fatPercentage) : null;
    
    return {
      weightDiff,
      muscleDiff,
      fatDiff
    };
  }, [inBodyLogs]);

  useEffect(() => {
    if (!user) return;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    if (user.uid === 'local_guest_user') {
      const saved = localStorage.getItem('local_diet_logs');
      if (saved) {
        try {
          const list = JSON.parse(saved) as Meal[];
          const filtered = list.filter((m: any) => m.timestamp >= startOfToday.getTime());
          const normalized = filtered.map((m: any, idx: number) => ({
            ...m,
            id: m.id || `local_diet_${m.timestamp}_${idx}`
          }));
          setMeals(normalized);
        } catch (e) {}
      } else {
        setMeals([]);
      }
      setLoading(false);
      return;
    }
    
    const q = query(collection(db, 'users', user.uid, 'dietLogs'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: Meal[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp >= startOfToday.getTime()) {
           loaded.push({ id: doc.id, ...data } as Meal);
        }
      });
      loaded.sort((a, b) => b.timestamp - a.timestamp);
      setMeals(loaded);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/dietLogs`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Loading Today's Water/Beverage logs
  useEffect(() => {
    if (!user) return;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    if (user.uid === 'local_guest_user') {
      const loadH2O = () => {
        const saved = localStorage.getItem('local_water_logs');
        if (saved) {
          try {
            const list = JSON.parse(saved);
            setWaterLogs(list.filter((m: any) => m.timestamp >= startOfToday.getTime()));
          } catch (e) {}
        } else {
          setWaterLogs([]);
        }
      };
      loadH2O();
      window.addEventListener('localWaterUpdated', loadH2O);
      return () => window.removeEventListener('localWaterUpdated', loadH2O);
    }
    
    const q = query(collection(db, 'users', user.uid, 'waterLogs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp >= startOfToday.getTime()) {
          loaded.push({ id: doc.id, ...data });
        }
      });
      setWaterLogs(loaded);
    }, (error) => {
      console.error("Failed to load water logs on diet page: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Loading InBody Logs
  useEffect(() => {
    if (!user) return;
    
    if (user.uid === 'local_guest_user') {
      const saved = localStorage.getItem('local_inbody_logs');
      if (saved) {
        try {
          const list = JSON.parse(saved) as InBodyLog[];
          setInBodyLogs(list);
        } catch (e) {}
      } else {
        setInBodyLogs([]);
      }
      return;
    }
    
    const q = query(collection(db, 'users', user.uid, 'inbodyLogs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: InBodyLog[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loaded.push({ id: doc.id, ...data } as InBodyLog);
      });
      loaded.sort((a, b) => b.timestamp - a.timestamp);
      setInBodyLogs(loaded);
    }, (error) => {
      console.error("Failed to list inbody logs: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveInBody = async () => {
    if (!user || !ibWeight) return;
    setIsInBodySaving(true);
    try {
      const weightNum = Number(ibWeight);
      const newLog = {
        weight: weightNum,
        muscleMass: ibMuscle ? Number(ibMuscle) : null,
        fatMass: ibFatMass ? Number(ibFatMass) : null,
        fatPercentage: ibFatPercentage ? Number(ibFatPercentage) : null,
        waterPercentage: ibWater ? Number(ibWater) : null,
        bmr: ibBmr ? Number(ibBmr) : null,
        timestamp: Date.now()
      };

      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_inbody_logs');
        const list = saved ? JSON.parse(saved) : [];
        const finalLog = { id: `local_${Date.now()}`, ...newLog };
        list.unshift(finalLog);
        localStorage.setItem('local_inbody_logs', JSON.stringify(list));
        setInBodyLogs(list);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'inbodyLogs'), newLog);
      }

      // Automatically sync current weight inside context profile
      setProfile({
        ...profile,
        weight: weightNum
      });

      // Clear states
      setIbWeight('');
      setIbMuscle('');
      setIbFatMass('');
      setIbFatPercentage('');
      setIbWater('');
      setIbBmr('');
      setIsInBodyModalOpen(false);
    } catch (error) {
       console.error("Failed to add InBody record: ", error);
    } finally {
       setIsInBodySaving(false);
    }
  };

  const deleteInBodyLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_inbody_logs');
        let list = saved ? JSON.parse(saved) : [];
        list = list.filter((log: any) => log.id !== id);
        localStorage.setItem('local_inbody_logs', JSON.stringify(list));
        setInBodyLogs(list);
      } else {
        await deleteDoc(doc(db, 'users', user.uid, 'inbodyLogs', id));
      }
    } catch (e) {
      console.error("Failed to delete InBody record: ", e);
    }
  };

  // +++ الدوال المضافة بناءً على طلبك والربط الذكي للتمرين والمقاسات +++
  const handleSaveBodyMeasurements = () => {
    const list = [...bodyMeasurements];
    const newMeas = {
      id: `m_${Date.now()}`,
      date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      chest: Number(measChest) || 0,
      waist: Number(measWaist) || 0,
      hips: Number(measHips) || 0,
      arms: Number(measArms) || 0,
      thighs: Number(measThighs) || 0,
    };
    list.unshift(newMeas);
    setBodyMeasurements(list);
    localStorage.setItem('local_body_measurements', JSON.stringify(list));
    // Clear inputs
    setMeasChest('');
    setMeasWaist('');
    setMeasHips('');
    setMeasArms('');
    setMeasThighs('');
    setIsMeasModalOpen(false);
  };

  const handleDeleteBodyMeasurement = (id: string) => {
    const list = bodyMeasurements.filter(m => m.id !== id);
    setBodyMeasurements(list);
    localStorage.setItem('local_body_measurements', JSON.stringify(list));
  };

  const handleSaveReminderDay = (day: string) => {
    setMeasurementReminderDay(day);
    localStorage.setItem('measurement_reminder_day', day);
    setIsReminderSettingsOpen(false);
  };

  const handleSaveWorkout = () => {
    if (!workoutCalories) return;
    const burn = Number(workoutCalories) || 0;
    const newBurned = exerciseBurned + burn;
    setExerciseBurned(newBurned);
    localStorage.setItem('local_exercise_burned_today', newBurned.toString());
    setWorkoutCalories('');
    setIsWorkoutModalOpen(false);
  };

  const handleResetWorkout = () => {
    setExerciseBurned(0);
    localStorage.setItem('local_exercise_burned_today', '0');
  };

  const handleSmartDeductFromFridge = (foodName: string) => {
    let updated = false;
    const nextFridge = fridgeItems.map(item => {
      if (
        foodName.toLowerCase().includes(item.name.toLowerCase()) ||
        item.name.toLowerCase().includes(foodName.toLowerCase())
      ) {
        updated = true;
        return { ...item, status: 'finished' as const };
      }
      return item;
    });
    if (updated) {
      localStorage.setItem('local_fridge_items', JSON.stringify(nextFridge));
      setFridgeItems(nextFridge);
    }
  };

  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fats: acc.fats + meal.fats,
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  // +++ أضيف بناءً على طلبك - كاشف العك واللخبطة التلقائي للأكل والمشروبات +++
  const cheatAnalysis = useMemo(() => {
    const cheatKeywords = [
      'بشاميل', 'بسبوسة', 'كنافة', 'بيتزا', 'برجر', 'سجق', 'حواوشي', 
      'رنجة', 'فسيخ', 'ممبار', 'كشري', 'محشي', 'بيبسي', 'كوكاكولا', 
      'حلويات', 'شوكولاتة', 'مقلي', 'بطاطس محمرة', 'سحلب', 'بيتيفور',
      'كحك', 'أم علي', 'سوبيا', 'عصير قصب', 'مشبك', 'بفتيك', 'بانيه',
      'رقاق', 'شيبسي', 'إندومي', 'نودلز جاهز', 'غريبة', 'زلابية',
      'صوابع زينب', 'بلح الشام', 'عاشورة', 'قطايف', 'وايت صوص', 'بينك صوص',
      'دوناتس', 'تورتة', 'كابلري', 'كولا', 'شويبس', 'فانتا', 'سبرايت', 'سفن',
      'ريدبول', 'ريد بول', 'طاقة', 'عصير معلب', 'شاي باللبن كامل'
    ];

    const loggedCheatFoods = meals.filter(m => 
      cheatKeywords.some(keyword => m.name.toLowerCase().includes(keyword))
    );

    // Scan water/beverages logs as well for cheating drinks!
    const loggedCheatDrinks = waterLogs.filter(w => {
      const type = w.beverageType || '';
      return (
        type === 'مشروبات غازية' || 
        type === 'شاي (بسكر)' || 
        type.includes('غازية') || 
        type.includes('سكر') || 
        type.includes('عصير') ||
        (w.context && cheatKeywords.some(keyword => w.context.toLowerCase().includes(keyword)))
      );
    });

    // Combine them for visual listing and counting
    const loggedCheats = [
      ...loggedCheatFoods.map(c => ({ name: c.name, type: 'food' })),
      ...loggedCheatDrinks.map(c => ({ name: `${c.beverageType} (${c.amount}مل)`, type: 'drink' }))
    ];

    let score = 0;
    
    // Each heavy food item adds 25 points, each cheat drink adds 15 points, capped at 65 points from food/drink variety
    score += Math.min((loggedCheatFoods.length * 25) + (loggedCheatDrinks.length * 15), 65);

    // If total calories exceed target, add 40 points
    if (totals.calories > GOALS.calories) {
      score += 40;
    } else if (totals.calories > GOALS.calories * 0.85) {
      score += 20;
    }

    // High carb ratio over diet goals adds another 10 points
    if (totals.carbs > GOALS.carbs * 1.1) {
      score += 10;
    }
    
    // High fat ratio over diet goals adds another 10 points
    if (totals.fats > GOALS.fats * 1.1) {
      score += 10;
    }

    score = Math.min(score, 100);

    let status = "ملتزم وممتاز";
    let statusColor = "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/40";
    let statusText = "مؤشر اللخبطة: أنت في السليم التام! 😇";
    let advice = isFemale 
      ? `ما شاء الله عليكِ يا ${profile?.name || 'بطلة'}! ملتزمة جداً النهاردة وأكلكِ ومشروباتكِ متوازنة وفيه صحة ونشاط. مفيش أي لغوصة أو مشروبات سكرية مفرطة مسجلة لحد دلوقتي. كملي بنفس الحماس وشرب مية كتير! 💪🌱`
      : `ما شاء الله عليك يا ${profile?.name || 'بطل'}! ملتزم جداً النهاردة وأكلك ومشروباتك متوازنة وفيه صحة ونشاط. مفيش أي لغوصة أو مشروبات سكرية مفرطة مسجلة لحد دلوقتي. كمل بنفس الحماس وشرب مية كتير! 💪🌱`;

    if (score > 15 && score <= 45) {
      status = "لغوصة خفيفة";
      statusColor = "text-amber-700 bg-amber-50 dark:bg-amber-955/20 border-amber-150 dark:border-amber-900/40";
      statusText = "مؤشر اللخبطة: لغوصة خفيفة على الماشي 🤫";
      const cheatNames = loggedCheats.map(c => c.name);
      let listDetails = cheatNames.length > 0 ? ` (زي ${cheatNames.join(' أو ')})` : '';
      advice = isFemale
        ? `بصي يا ${profile?.name || 'بطلة'}، إحنا لغوصنا حاجة بسيطة النهاردة${listDetails}. الموضوع بسيط جداً وملحوق! شرب ٢ كوب مية فوراً علشان تحركي الهضم وتسحبي الصوديوم والسكر، والوجبة الجاية خلّيها بروتين صافي مع شوية خضار وسلطة خضراء. كدة هتفضلي في الأمان ومبوظناش حاجة! 💧🥗`
        : `بص يا ${profile?.name || 'بطل'}، إحنا لغوصنا حاجة بسيطة النهاردة${listDetails}. الموضوع بسيط جداً وملحوق! شرب ٢ كوب مية فوراً علشان تحرك الهضم وتسحب الصوديوم والسكر، والوجبة الجاية خلّيها بروتين صافي مع شوية خضار وسلطة خضراء. كدة هتفضل في الأمان ومبوظناش حاجة! 💧🥗`;
    } else if (score > 45) {
      status = "عك جامد";
      statusColor = "text-rose-700 bg-rose-50 dark:bg-rose-950/20 border-rose-150 dark:border-rose-900/40";
      statusText = "مؤشر اللخبطة: عك ليفل الوحش! 🚨🔥";
      
      let foodListText = loggedCheats.length > 0 ? ` (سجلتِ: ${loggedCheats.map(c => c.name).slice(0, 3).join(' و ')})` : "";
      advice = isFemale
        ? `يا نهار لغوصة يا ${profile?.name || 'بطلة'}! شكلكِ رحتِ في داهية النهاردة ولميتِ الشارع كله معاكِ في الأكل والمشروبات${foodListText} ودخلنا في عك جامد وسعرات! 😂 بصي.. أهم قاعدة في الكوكب: "لا جلد للذات ولا لوم" خالص! ده طبيعي وبيحصل لأجدع طبيبات ورياضيات الألعاب البدنية. هنعمل إيه دلوقتي؟ أولاً: اقفلي بقكِ فوراً عن أي دهون، نشويات أو سكريات بقية اليوم. ثانياً: انزلي اتمشي نص ساعة فوراً أو اعملي تمارين كارديو خفيفة بالمنزل لتنشيط حرق الجليكوجين وتفادي تخزين الدهون كشحوم. ثالثاً: بكرة رتبي معايا نعمل "صيام متقطع" من ١٦ لـ ١٨ ساعة، وهنظبط بيه حساسية الإنسولين وهترجعي أقوى! 🥑🏋️‍♀️`
        : `يا نهار لغوصة يا ${profile?.name || 'بطل'}! شكلك رحت في داهية النهاردة ولميت الشارع كله معاك في الأكل والمشروبات${foodListText} ودخلنا في عك جامد وسعرات! 😂 بص.. أهم قاعدة في الكوكب: "لا جلد للذات ولا لوم" خالص! ده طبيعي وبيحصل لأجدع دكاترة ورياضيين. نعمل إيه دلوقتي؟ أولاً: اقفل بقك فوراً عن أي دهون، نشويات أو سكريات بقية اليوم. ثانياً: انزل اتمشى نص ساعة فوراً أو اعمل تمارين كارديو خفيفة بالمنزل لتنشيط حرق الجليكوجين وتفادي تخزين الدهون كشحوم. ثالثاً: بكرة رتب معايا نعمل "صيام متقطع" من ١٦ لـ ١٨ ساعة، وهنظبط بيه حساسية الإنسولين وهترجع أقوى! 🥑🏋️‍♂️`;
    }

    return {
      score,
      status,
      statusColor,
      statusText,
      advice,
      loggedCheats
    };
  }, [meals, waterLogs, totals, GOALS, profile]);

  // +++ أضيف بناءً على طلبك - محلل حالة الإنسولين ومستوى حرق الدهون التلقائي الهرموني +++
  const insulinStatus = useMemo(() => {
    if (totals.calories === 0) {
      return {
        title: "صيام وحرق دهون نشط تلقائي",
        desc: "الجسم يعتمد كلياً على مخازن الدهون الداخلية للحصول على طاقته الأساسية الآن.",
        level: "منخفض جداً (حرق دهون أقصى) 🔥🧬",
        color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10 dark:border-emerald-500/25"
      };
    }
    if (totals.carbs < 60 && cheatAnalysis.score < 15) {
      return {
        title: "حالة كيتوزية / حرق دهون متسارع",
        desc: "مستويات السكر مستقرة ومستقيمة تماماً في الدم مع تخفيض كامل للإنسولين.",
        level: "ممتاز (حرق دهون عميق) ⚡🌱",
        color: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10 dark:border-emerald-500/25"
      };
    }
    if (totals.carbs < 140 && cheatAnalysis.score < 35) {
      return {
        title: "حساسية إنسولين منضبطة",
        desc: "وجباتك ومشروباتك متوازنة دون إجهاد البنكرياس. الحرق نشط وقائم.",
        level: "مستقر (حرق متوازن وصحي) 🟢📈",
        color: "text-green-600 dark:text-green-400 bg-green-500/5 dark:bg-green-500/10 border-green-500/10 dark:border-green-500/20"
      };
    }
    if (totals.carbs >= 170 || cheatAnalysis.score >= 45) {
      return {
        title: "قمة إنسولين مرتفعة (مقاومة مؤقتة)",
        desc: "الوجبات الغنية بالكربوهيدرات أو السكر المشرذم تحفز تخزين الطاقة كشحوم. اتمشى ١٠ دقائق فوراً!",
        level: "مرتفع (تخزين دهون وخمول مؤقت) ⚠️📉",
        color: "text-rose-600 dark:text-rose-450 bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/10 dark:border-rose-500/20"
      };
    }
    return {
      title: "الحرق هرمونياً نشط نسبيّاً",
      desc: "حرق طاقة معتدل. تناول الألياف والبروتين بجانب القهوة الدايت اللاحقة لمنع تصرفات مقاومة الخلايا.",
      level: "نشط معتدل 🟡⚖️",
      color: "text-amber-700 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/10 dark:border-amber-500/20"
    };
  }, [totals.carbs, totals.calories, cheatAnalysis.score]);

  const standardCategories = [
    { name: 'فطار', icon: Coffee, color: 'text-[#E07A5F]', bg: 'bg-[#FAEDDF] dark:bg-[#E07A5F]/20 border border-[#F0EBE1] dark:border-[#E07A5F]/20' },
    { name: 'غداء', icon: Utensils, color: 'text-[#1A4D42]', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30' },
    { name: 'عشاء', icon: Sandwich, color: 'text-[#3D405B]', bg: 'bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-white/10' },
    { name: 'سناكس', icon: Pizza, color: 'text-[#D4A373]', bg: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30' },
    { name: 'مشروبات', icon: Droplet, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/30' },
  ];

  const fastingCategories = [
    { name: 'إفطار', icon: Utensils, color: 'text-[#1A4D42]', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30' },
    { name: 'سحور', icon: Moon, color: 'text-[#3D405B]', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30' },
    { name: 'سناكس', icon: Pizza, color: 'text-[#D4A373]', bg: 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30' },
    { name: 'مشروبات', icon: Droplet, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/30' },
  ];

  const categories = isFastingMode ? fastingCategories : standardCategories;

  const handleAddMeal = async () => {
    if (!user || !mealName || !calories) return;
    try {
      const newMeal = {
        name: mealName,
        category: selectedCategory,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fats: Number(fats) || 0,
        timestamp: Date.now()
      };

      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_diet_logs');
        const list = saved ? JSON.parse(saved) : [];
        const finalMeal = { id: `local_${Date.now()}`, ...newMeal };
        list.unshift(finalMeal);
        localStorage.setItem('local_diet_logs', JSON.stringify(list));
        setMeals(list.filter((m: any) => m.timestamp >= (new Date().setHours(0,0,0,0))));
      } else {
        await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
      }

      // +++ إضافة مشروب بجانب الأكل إذا كان الخيار مفعلاً وتخزينه في waterLogs +++
      if (includeBeverage) {
        const beverageAmountNum = Number(beverageAmount) || 250;
        const beverageFactorNum = beverageFactor || 1.0;
        const bevLog = {
          amount: beverageAmountNum,
          effectiveAmount: Math.round(beverageAmountNum * beverageFactorNum),
          beverageType: beverageType,
          context: `مرفق مع الوجبة (${mealName})`,
          timestamp: Date.now()
        };

        if (user.uid === 'local_guest_user') {
          const savedH2O = localStorage.getItem('local_water_logs');
          const h2oList = savedH2O ? JSON.parse(savedH2O) : [];
          h2oList.unshift({ id: `local_water_${Date.now()}`, ...bevLog });
          localStorage.setItem('local_water_logs', JSON.stringify(h2oList));
          window.dispatchEvent(new Event('localWaterUpdated'));
        } else {
          await addDoc(collection(db, 'users', user.uid, 'waterLogs'), bevLog);
        }
      }

      // +++ الربط الذكي: خصم الغرض من الثلاجة تلقائيا +++
      handleSmartDeductFromFridge(mealName);

      // +++ تلقائياً: تسجيل المشروبات المسجلة لتكون متاحة لإعادة الاستخدام السريع +++
      if (selectedCategory === 'مشروبات' || isProbablyDrink) {
        const loggedDrinkPreset: DrinkPreset = {
          name: mealName,
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          carbs: Number(carbs) || 0,
          fats: Number(fats) || 0,
          addonsIds: [...selectedAddons]
        };
        const updated = [loggedDrinkPreset, ...recentDrinks.filter(p => p.name !== loggedDrinkPreset.name)].slice(0, 10);
        setRecentDrinks(updated);
        localStorage.setItem('local_recent_drinks', JSON.stringify(updated));
      }

      setIsAddingMode(false);
      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFats('');
      setIncludeBeverage(false);
      setBeverageType('ماء عادي');
      setBeverageAmount('250');
      setBeverageFactor(1.0);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/dietLogs`);
    }
  };

  // +++ أضيف بناءً على طلبك - تسجيل سريع للمشروبات بنقرة واحدة وتحديث سجل الترطيب والمغذيات +++
  const handleQuickAddDrink = async (bev: any) => {
    if (!user) return;
    try {
      const newMeal = {
        name: bev.name,
        category: 'مشروبات',
        calories: Number(bev.calories) || 0,
        protein: Number(bev.protein) || 0,
        carbs: Number(bev.carbs) || 0,
        fats: Number(bev.fats) || 0,
        timestamp: Date.now()
      };

      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_diet_logs');
        const list = saved ? JSON.parse(saved) : [];
        const finalMeal = { id: `local_${Date.now()}`, ...newMeal };
        list.unshift(finalMeal);
        localStorage.setItem('local_diet_logs', JSON.stringify(list));
        setMeals(list.filter((m: any) => m.timestamp >= (new Date().setHours(0,0,0,0))));
      } else {
        await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
      }

      // Log hydration as well (default to 250ml)
      const hydrationFactor = bev.name.includes('ماء') ? 1.0 : 0.85;
      const amount = 250;
      const bevLog = {
        amount,
        effectiveAmount: Math.round(amount * hydrationFactor),
        beverageType: bev.name.includes('ماء') ? 'ماء عادي 🥛' : 'قهوة أو شاي ☕',
        context: `تسجيل سريع بنقرة واحدة (${bev.name})`,
        timestamp: Date.now()
      };

      if (user.uid === 'local_guest_user') {
        const savedH2O = localStorage.getItem('local_water_logs');
        const h2oList = savedH2O ? JSON.parse(savedH2O) : [];
        h2oList.unshift({ id: `local_water_${Date.now()}`, ...bevLog });
        localStorage.setItem('local_water_logs', JSON.stringify(h2oList));
        window.dispatchEvent(new Event('localWaterUpdated'));
      } else {
        await addDoc(collection(db, 'users', user.uid, 'waterLogs'), bevLog);
      }

      // Register to recent drinks
      const loggedDrinkPreset = {
        name: bev.name,
        calories: Number(bev.calories) || 0,
        protein: Number(bev.protein) || 0,
        carbs: Number(bev.carbs) || 0,
        fats: Number(bev.fats) || 0,
        addonsIds: []
      };
      const updated = [loggedDrinkPreset, ...recentDrinks.filter(p => p.name !== loggedDrinkPreset.name)].slice(0, 10);
      setRecentDrinks(updated);
      localStorage.setItem('local_recent_drinks', JSON.stringify(updated));

      alert(`تم تسجيل "${bev.name}" وحساب ترطيبه وسعراته تلقائياً بنجاح! ☕️⚡️`);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMeal = async (id: string) => {
    if (!user) return;
    try {
      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_diet_logs');
        let list = saved ? JSON.parse(saved) : [];
        list = list.filter((m: any, idx: number) => (m.id || `local_diet_${m.timestamp}_${idx}`) !== id);
        localStorage.setItem('local_diet_logs', JSON.stringify(list));
        setMeals(list.filter((m: any) => m.timestamp >= (new Date().setHours(0,0,0,0))));
      } else {
        await deleteDoc(doc(db, 'users', user.uid, 'dietLogs', id));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/dietLogs`);
    }
  };

  // +++ أضيف بناءً على طلبك - إدارة عمليات مطبخ الدايت وتركيب الأكلات والطبخات +++
  const handleAddIngredientToKitchen = () => {
    if (!kiPredefinedFood) return;
    const qty = parseFloat(kiQty) || 1;
    let multiplier = 1.0;
    
    if (kiUnit === 'plate') multiplier = 2.5 * qty;
    else if (kiUnit === 'spoon') multiplier = 0.12 * qty;
    else if (kiUnit === 'cup') multiplier = 1.0 * qty;
    else if (kiUnit === 'gram') multiplier = qty / 100;
    else multiplier = 1.0 * qty; // piece
    
    const scaledCalories = Math.round(kiPredefinedFood.calories * multiplier);
    const scaledProtein = Math.round(kiPredefinedFood.protein * multiplier * 10) / 10;
    const scaledCarbs = Math.round(kiPredefinedFood.carbs * multiplier * 10) / 10;
    const scaledFats = Math.round(kiPredefinedFood.fats * multiplier * 10) / 10;
    
    const unitLabelAr = kiUnit === 'piece' ? 'قطعة/سلايس' : kiUnit === 'plate' ? 'طبق' : kiUnit === 'spoon' ? 'معلفة كبيرة' : kiUnit === 'cup' ? 'كوب' : 'جرام';

    const newIngredient = {
      id: `ki_${Date.now()}`,
      name: kiPredefinedFood.name,
      qty,
      unit: kiUnit,
      unitLabel: unitLabelAr,
      scaledCalories,
      scaledProtein,
      scaledCarbs,
      scaledFats,
      baseFood: kiPredefinedFood
    };
    
    setKitchenIngredients(prev => [...prev, newIngredient]);
    setKiPredefinedFood(null);
    setKitchenSearch('');
    setKiQty('1');
    setKiUnit('piece');
  };

  const handleUpdateIngredientQty = (id: string, isIncrement: boolean) => {
    setKitchenIngredients(prev => prev.map(ing => {
      if (ing.id !== id) return ing;
      
      let step = 1;
      if (ing.unit === 'gram') step = 50;
      else if (ing.unit === 'spoon') step = 1;
      else if (ing.unit === 'cup') step = 0.5;
      else if (ing.unit === 'piece') step = 1;
      else if (ing.unit === 'plate') step = 0.5;
      
      const newQty = isIncrement ? ing.qty + step : Math.max(step, ing.qty - step);
      
      let multiplier = 1.0;
      if (ing.unit === 'plate') multiplier = 2.5 * newQty;
      else if (ing.unit === 'spoon') multiplier = 0.12 * newQty;
      else if (ing.unit === 'cup') multiplier = 1.0 * newQty;
      else if (ing.unit === 'gram') multiplier = newQty / 100;
      else multiplier = 1.0 * newQty; // piece
      
      const baseFood = ing.baseFood || { calories: ing.scaledCalories / (multiplier || 1), protein: ing.scaledProtein / (multiplier || 1), carbs: ing.scaledCarbs / (multiplier || 1), fats: ing.scaledFats / (multiplier || 1) };
      
      return {
        ...ing,
        qty: newQty,
        scaledCalories: Math.round(baseFood.calories * multiplier),
        scaledProtein: Math.round(baseFood.protein * multiplier * 10) / 10,
        scaledCarbs: Math.round(baseFood.carbs * multiplier * 10) / 10,
        scaledFats: Math.round(baseFood.fats * multiplier * 10) / 10
      };
    }));
  };

  const handleSaveCurrentRecipe = () => {
    if (kitchenIngredients.length === 0 || !kitchenMealName) return;
    const newRecipe = {
      id: `rec_${Date.now()}`,
      name: kitchenMealName,
      ingredients: kitchenIngredients,
      servings: kitchenServings,
      category: kitchenSelectedCategory
    };
    const updated = [newRecipe, ...savedRecipes];
    setSavedRecipes(updated);
    localStorage.setItem('local_kitchen_recipes', JSON.stringify(updated));
  };

  const handleDeleteSavedRecipe = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedRecipes.filter(r => r.id !== id);
    setSavedRecipes(updated);
    localStorage.setItem('local_kitchen_recipes', JSON.stringify(updated));
  };

  const handleLoadRecipe = (recipe: any) => {
    setKitchenMealName(recipe.name);
    setKitchenIngredients(recipe.ingredients);
    setKitchenServings(recipe.servings || '1');
    setKitchenSelectedCategory(recipe.category || 'غداء');
  };

  const getRecipeHealthReview = () => {
    let hasGheeOrButter = false;
    let totalFat = 0;
    let totalProt = 0;
    kitchenIngredients.forEach(i => {
      const lowerName = i.name.toString().toLowerCase();
      if (lowerName.includes('سمن') || lowerName.includes('زبدة') || lowerName.includes('زيت عباد') || lowerName.includes('سمنة')) {
         if (i.qty > 5) hasGheeOrButter = true;
      }
      totalFat += i.scaledFats;
      totalProt += i.scaledProtein;
    });
    if (kitchenIngredients.length === 0) return { text: "المطبخ فارغ، أضف المكونات للتألق! 🍳", color: "text-gray-400", bg: "bg-gray-100 dark:bg-white/5" };
    
    if (hasGheeOrButter && totalFat > 25) {
      return {
        text: "طبخة بلدية دسمة وعك مسبح فخم! 🔴 (دسمة بس تعدي لو هتقسمها صح!)",
        color: "text-rose-650 dark:text-rose-400",
        bg: "bg-rose-500/5 border border-rose-500/10"
      };
    }
    if (totalProt > totalFat * 1.5) {
      return {
        text: "طبخة رياضية خارقة ونموذجية! بروتين رائع ودهون ذكية 🟢 (مثالية لبناء العضلات والدايت الصارم!)",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/5 border border-emerald-500/10"
      };
    }
    return {
      text: "طبخة بيتية متوازنة وصحية ولائقة بالدايت! 🟡 (عليك بالعافية والبركة!)",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/5 border border-amber-500/10"
    };
  };

  const handleAddKitchenRecipeToToday = async () => {
    if (!user || !kitchenMealName || kitchenIngredients.length === 0) return;
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    
    kitchenIngredients.forEach(ing => {
      totalCalories += ing.scaledCalories;
      totalProtein += ing.scaledProtein;
      totalCarbs += ing.scaledCarbs;
      totalFats += ing.scaledFats;
    });
    
    const servings = parseFloat(kitchenServings) || 1;
    
    const finalCals = Math.round(totalCalories / servings);
    const finalProtein = Math.round((totalProtein / servings) * 10) / 10;
    const finalCarbs = Math.round((totalCarbs / servings) * 10) / 10;
    const finalFats = Math.round((totalFats / servings) * 10) / 10;
    
    const recipeMealName = `${kitchenMealName} (حصّة طبق من أصل ${servings})`;
    
    try {
      const newMeal = {
        name: recipeMealName,
        category: kitchenSelectedCategory,
        calories: finalCals,
        protein: finalProtein,
        carbs: finalCarbs,
        fats: finalFats,
        timestamp: Date.now()
      };
      
      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_diet_logs');
        const list = saved ? JSON.parse(saved) : [];
        const finalMeal = { id: `local_${Date.now()}`, ...newMeal };
        list.unshift(finalMeal);
        localStorage.setItem('local_diet_logs', JSON.stringify(list));
        setMeals(list.filter((m: any) => m.timestamp >= (new Date().setHours(0,0,0,0))));
      } else {
        await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
      }
      
      // +++ الربط الذكي: خصم المكونات المستخدمة من الثلاجة تلقائيا +++
      kitchenIngredients.forEach(ing => {
        handleSmartDeductFromFridge(ing.name);
      });

      // Reset kitchen states
      setIsKitchenOpen(false);
      setKitchenIngredients([]);
      setKitchenMealName('طبخة دايت منزلية 🥘');
      setKitchenServings('1');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/dietLogs`);
    }
  };

  const selectPredefinedFood = (food: typeof COMMON_FOODS[0]) => {
     setSelectedBaseFood(food);
     setPortionQty('1');
     setPortionUnit('piece');
     
     setMealName(food.name);
     setCalories(food.calories.toString());
     setProtein(food.protein.toString());
     setCarbs(food.carbs.toString());
     setFats(food.fats.toString());
  };

  return (
    <div className={cn("min-h-full pb-32 relative transition-colors duration-500", isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#1A1A1A] text-gray-900 dark:text-white")}>
      {/* Header Area */}
      <div className={cn("px-6 pt-10 pb-6 rounded-b-[40px] shadow-sm mb-6", isFastingMode ? "bg-[#2D2824] shadow-black/20" : "bg-white dark:bg-[#121415] border-b border-[#F0EBE1] dark:border-white/5")}>
        <div className="flex justify-between items-center flex-row-reverse text-right">
           <button onClick={() => navigate(-1)} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
              isFastingMode ? "bg-black/20 text-gray-300" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-white/5 text-gray-500"
           )}>
              <ChevronRight className="w-5 h-5" />
           </button>
           <h1 className="text-xl font-bold flex flex-row-reverse items-center gap-2">
               الغذاء والوزن <Utensils className="w-5 h-5 text-[#E07A5F]" />
           </h1>
        </div>

        {/* Date Tabs */}
        <div className={cn("flex justify-center gap-1.5 mt-8 mb-4 flex-row-reverse flex-wrap p-1 rounded-full max-w-md mx-auto", 
          isFastingMode ? "bg-[#1E1916]" : "bg-gray-50 dark:bg-white/5"
        )}>
           {['⚖️ الوزن والسعرات', '⚖️ الوزن والجسم', '👨‍🍳 المطبخ الذكي'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveDateTab(tab)}
                className={cn("px-4 py-2 rounded-full font-bold text-[11px] sm:text-xs transition-all duration-300 whitespace-nowrap cursor-pointer flex-1 text-center justify-center flex",
                  activeDateTab === tab 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                    : (isFastingMode ? "bg-transparent text-gray-300 hover:text-white" : "bg-transparent text-gray-550 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white")
                )}
              >
                 {tab}
              </button>
           ))}
        </div>
      </div>

      <div className="px-6 space-y-6">
                {activeDateTab === '👨‍🍳 المطبخ الذكي' ? (
            <motion.div 
               initial={{ opacity: 0, y: 15 }} 
               animate={{ opacity: 1, y: 0 }} 
               className="space-y-6 mb-24 text-right"
               dir="rtl"
            >
               {/* +++ أضيفت لدعم كروت القسم الذكي للمطبخ بناءً على طلبك +++ */}
               {/* 1. Diet System Choice & Cheat Emergency Recovery Card */}
               <div className={cn("rounded-3xl p-5 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5")}>
                  <button 
                     type="button" 
                     onClick={() => setIsDietSysExpanded(!isDietSysExpanded)} 
                     className="w-full flex justify-between items-center text-right flex-row-reverse focus:outline-none cursor-pointer text-gray-900 dark:text-white"
                  >
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-550 flex items-center justify-center rounded-xl shrink-0">
                           <Brain className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                           <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">نظام الدايت المختار ونصائح طوارئ العك 🧠</h3>
                           <p className="text-[10px] text-gray-400 font-bold block">اضبط نظامك وشاهد نصائح تعديل المسار فور حصول عك في الأكل</p>
                        </div>
                     </div>
                     <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isDietSysExpanded ? "transform rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                     {isDietSysExpanded && (
                        <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden mt-5 border-t border-gray-100 dark:border-white/5 pt-4 space-y-4"
                        >
                           {/* Choice row */}
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 block pr-1 leading-none text-right">اختر نظامك المعتمد لتعديل الماكروز والسعرات:</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                 {['balanced', 'keto', 'low_carb', 'high_protein'].map(type => {
                                    const active = currentDietType === type;
                                    let label = 'متوازن صحي';
                                    let sub = 'نسب متزنة 🥑';
                                    if (type === 'keto') { label = 'كيتو دايت'; sub = 'عالي الدهون 🥩'; }
                                    else if (type === 'low_carb') { label = 'لو كارب'; sub = 'قليل الكربوهيدرات 🍳'; }
                                    else if (type === 'high_protein') { label = 'عالي البروتين'; sub = 'بناء العضلات 💪'; }

                                    return (
                                       <button
                                          key={type}
                                          type="button"
                                          onClick={() => setProfile({ ...profile, dietType: type })}
                                          className={cn("p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-center items-center gap-0.5",
                                             active 
                                                ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-300 font-black shadow-sm"
                                                : "bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-550 hover:bg-gray-50 hover:border-gray-200 dark:text-gray-300"
                                          )}
                                       >
                                          <span className="text-[11px] font-black">{label}</span>
                                          <span className="text-[9px] opacity-80">{sub}</span>
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>

                           {/* Custom tips */}
                           <div className="bg-amber-500/5 dark:bg-amber-955/10 border border-amber-500/10 rounded-2xl p-4 text-xs space-y-1 text-right" dir="rtl">
                              <h4 className="font-extrabold text-[#E07A5F] dark:text-amber-400 text-right">💡 نصائح وإرشادات نظام ({getDietLabel(currentDietType)}) المميزة:</h4>
                              <p className="text-gray-655 dark:text-gray-300 leading-relaxed font-semibold text-right">
                                 {currentDietType === 'keto' && isFemale 
                                    ? "إن نظام الكيتو دايت يعتمد على الحث الحيوي لإنتاج مستودعات الطاقة البديلة (الكيتونات) من الدهون. تأكدي من شرب الماء بغزارة لتعويض الأملاح المفقودة، وزيدي الخضراوات الورقية لضمان الألياف الكافية."
                                    : "إن نظام الكيتو دايت يعتمد على الحث الحيوي لإنتاج مستودعات الطاقة البديلة (الكيتونات) من الدهون. تأكد من شرب الماء بغزارة لتعويض الأملاح المفقودة، وزد الخضراوات الورقية لضمان الألياف الكافية."}
                                 {currentDietType === 'low_carb' && isFemale
                                    ? "يرتكز اللو كارب على التحكم السليم في هرمون الإنسولين لتقليل تخزين الشحوم. احرصي على انتقاء الكربوهيدرات الذكية الصعبة مثل الكينوا والبرغل والخضار الطازج، وتجنبي السكر المضاف."
                                    : "يرتكز اللو كارب على التحكم السليم في هرمون الإنسولين لتقليل تخزين الشحوم. احرص على انتقاء الكربوهيدرات الذكية الصعبة مثل الكينوا والبرغل والخضار الطازج، وتجنب السكر المضاف."}
                                 {currentDietType === 'high_protein' && isFemale
                                    ? "سياستنا في النظام عالي البروتين هي تغذية وإعمار خلايا عضلاتكِ لرفع معدل الحرق البازلي الإجمالي للشحوم. حافظي على وجبات من بياض البيض والصدور الصافية لتعزيز الكتلة البنائية."
                                    : "سياستنا في النظام عالي البروتين هي تغذية وإعمار خلايا عضلاتكَ لرفع معدل الحرق البازلي الإجمالي للشحوم. حافظ على وجبات من بياض البيض والصدور الصافية لتعزيز الكتلة البنائية."}
                                 {currentDietType === 'balanced' && "تحيا الموازنة السليمة للقمة العيش! نقسم الطبق لثلاثة محاور: خضار غني بالألياف لثلثي المساحة، بروتين خفيف للربع، ونشويات مفيدة كالقمح الكامل للربع الآخر لتعلو الصحة والرشاقة."}
                              </p>
                           </div>

                           {/* "ازاي تصلح عك اليوم" (Emergency fixing steps) */}
                           <div className="border-t border-gray-100 dark:border-white/5 pt-4 space-y-3">
                              <h4 className="font-extrabold text-xs text-[#E07A5F] flex items-center gap-1.5 flex-row-reverse text-right">
                                 <AlertTriangle className="w-4 h-4 text-[#E07A5F]" />
                                 كيف تصلح لخبطة أو عك اليوم حالاً؟ 🚨
                              </h4>
                              
                              {cheatAnalysis.score === 0 ? (
                                 <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 text-right">
                                    isFemale 
                                       ? "أداؤكِ مذهل اليوم يا بطلة! لم نسجل أي عكوك أو أغذية دهنية زائدة أو مشروبات سكرية مسببة لخلل الإنسولين. استمري في الانضباط! 🟢✨"
                                       : "أداؤكَ مذهل اليوم يا بطل! لم نسجل أي عكوك أو أغذية دهنية زائدة أو مشروبات سكرية مسببة لخلل الإنسولين. استمر في الانضباط! 🟢✨"
                                 </div>
                              ) : (
                                 <div className="space-y-2">
                                    <div className="bg-rose-500/5 dark:bg-rose-955/10 border border-rose-500/10 rounded-2xl p-4 text-xs space-y-2 text-right">
                                       <div className="flex justify-between items-center text-[10px] text-rose-600 dark:text-rose-400 font-extrabold flex-row-reverse">
                                          <span>مؤشر اللخبطة الحالي: {cheatAnalysis.score}%</span>
                                          <span>حالتك: {cheatAnalysis.status}</span>
                                       </div>
                                       <p className="text-gray-655 dark:text-gray-300 leading-relaxed font-semibold">
                                          {cheatAnalysis.advice}
                                       </p>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                       <button 
                                          type="button"
                                          onClick={() => {
                                             const msg = "أنا نظامي المختار هو (" + getDietLabel(currentDietType) + ") ولخبطت الدايت النهاردة وسجلت في أكل ومشروبات اليوم: " + cheatAnalysis.loggedCheats.map(c => c.name).join(' و ') + ". إزاي أصلح عك اليوم حالاً وأتعدل؟";
                                             handleSendCoachMessage(msg);
                                             setActiveDateTab('⚖️ الوزن والسعرات');
                                          }}
                                          className="px-4 py-2.5 bg-[#E07A5F] hover:bg-[#c96c53] active:scale-95 transition-transform text-white text-xs font-black rounded-xl flex items-center gap-1 cursor-pointer"
                                       >
                                          <Sparkles className="w-3.5 h-3.5" />
                                          <span>أرسل خطتي لمدرب الـ AI للحل الفوري 💬</span>
                                       </button>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               {/* 2. Cooking Suggestions matches based on available resources */}
               <div className={cn("rounded-3xl p-5 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5")}>
                  <button 
                     type="button" 
                     onClick={() => setIsCookSuggestionsExpanded(!isCookSuggestionsExpanded)} 
                     className="w-full flex justify-between items-center text-right flex-row-reverse focus:outline-none cursor-pointer"
                  >
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center rounded-xl shrink-0">
                           <Lightbulb className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-right">
                           <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">اقتراحات طبخ ممتازة حسب مكوناتك 💡</h3>
                           <p className="text-[10px] text-gray-400 font-bold block">شاهد أطباق متوفرة تماماً بالبيت أو شبه جاهزة مع بدايلها الذكية</p>
                        </div>
                     </div>
                     <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isCookSuggestionsExpanded ? "transform rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                     {isCookSuggestionsExpanded && (
                        <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden mt-5 border-t border-gray-100 dark:border-white/5 pt-4 space-y-4"
                        >
                           {suggestedRecipesMatched.length === 0 ? (
                              <div className="text-center py-6 text-gray-400 text-xs font-bold space-y-1">
                                 <p>💡 لا توجد اقتراحات مباشرة مطابقة للعناصر الحالية بالثلاجة.</p>
                                 <p className="text-[10px] font-semibold text-gray-450 text-center">أضف بعض المكونات مثل "بيض" أو "جبنة قريش" أو "شوفان" أو "دجاج" في (خامات المطبخ) لعرض أفكار فورية!</p>
                              </div>
                           ) : (
                              <div className="space-y-4">
                                 {['فطور', 'غداء', 'عشاء', 'سناكس', 'مشروبات'].map(catGroup => {
                                    const catRecipes = suggestedRecipesMatched.filter(r => r.category === catGroup);
                                    if (catRecipes.length === 0) return null;

                                    return (
                                       <div key={catGroup} className="space-y-2.5 border-b border-gray-150/40 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                                          <h4 className="font-black text-xs text-[#E07A5F] mb-1 flex items-center justify-end gap-1 flex-row-reverse pr-1 text-right">
                                             <span>وجبات ومقترحات: {catGroup}</span>
                                          </h4>
                                          <div className="space-y-3">
                                             {catRecipes.map((r, idx) => {
                                                const missingNames = r.required.filter(reqName => {
                                                   return !fridgeItems.some(item => 
                                                      item.status !== 'finished' && 
                                                      (item.name.toLowerCase().includes(reqName.toLowerCase()) || 
                                                       reqName.toLowerCase().includes(item.name.toLowerCase()))
                                                   );
                                                });
                                                const getSubstitute = (name: string) => {
                                                   if (name.includes('بيض')) return 'بدائل: جبن قريش، زبادي يوناني، بياض بيض مبشور.';
                                                   if (name.includes('دجاج') || name.includes('لحم')) return 'بدائل: تونة مصفاة، سلمون، صدر ديك رومي مدخن دايت، بيض كبديل بروتيني.';
                                                   if (name.includes('طماطم') || name.includes('خضار') || name.includes('خيار')) return 'بدائل: فلفل رومي، جرجير، خيار، خس طازج، أو بقدونس.';
                                                   if (name.includes('شوفان')) return 'بدائل: كينوا، قمح مسلوق دايت، أو شريحة توست بني مقطعة.';
                                                   if (name.includes('لبن') || name.includes('حليب')) return 'بدائل: زبادي قليل الدسم، لبن رايب، حليب لوز أو حليب جوز هند دايت.';
                                                   if (name.includes('زعتر') || name.includes('توابل')) return 'بدائل: ريحان مجفف، نعناع، شبت أو بقدونس مفروم.';
                                                   if (name.includes('جبن') || name.includes('جبنة')) return 'بدائل: لبنة لايت، زبادي صلب، جبنة موزاريلا قليلة الدسم.';
                                                   return 'بدائل: أي مكون خضار أو بروتين مشابه متوفر لديك بالثلاجة حالياً.';
                                                };

                                                return (
                                                   <div key={idx} className="bg-gray-50/55 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3 text-right" dir="rtl">
                                                      <div className="flex justify-between items-start flex-row-reverse text-right">
                                                         <div>
                                                            <h5 className="font-bold text-xs text-gray-800 dark:text-gray-100 text-right">{r.name}</h5>
                                                            <p className="text-[10px] text-gray-550 font-bold mt-1 text-right">تتطلب: {r.required.join(' + ')}</p>
                                                         </div>
                                                         <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full shrink-0", 
                                                            r.isFullyAvailable ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-955/20 dark:text-amber-300"
                                                         )}>
                                                            {r.isFullyAvailable ? "متوفر بالكامل 🟢" : `جاهز جزئياً ⚠️ (${r.matchedCount}/${r.totalRequired})`}
                                                         </span>
                                                      </div>

                                                      {/* Show missing ingredients & substitutes */}
                                                      {missingNames.length > 0 && (
                                                         <div className="bg-orange-500/5 dark:bg-orange-955/10 border border-orange-500/10 rounded-xl p-2.5 text-[10px] space-y-1 text-right">
                                                            <p className="font-extrabold text-amber-600 dark:text-amber-400 text-right">⚠️ مكونات ناقصة بالبيت وبدائلها الصحية الفورية:</p>
                                                            <div className="space-y-1">
                                                               {missingNames.map(miss => (
                                                                  <div key={miss} className="flex flex-col gap-0.5 pr-2 border-r-2 border-amber-400 text-right">
                                                                     <span className="font-black text-gray-600 dark:text-gray-300 text-right">- {miss} غير متوفر</span>
                                                                     <span className="text-[10px] text-gray-450 text-right">{getSubstitute(miss)}</span>
                                                                  </div>
                                                               ))}
                                                            </div>
                                                         </div>
                                                      )}

                                                      <p className="text-[11px] text-gray-550 dark:text-gray-350 border-t border-gray-150/40 dark:border-white/5 pt-2 leading-relaxed text-right" dir="rtl">
                                                         📋 <strong>المكونات وطريقة التقديم:</strong> {r.allIngredients}
                                                      </p>

                                                      <div className="flex justify-between items-center text-[10px] pt-1 flex-row-reverse">
                                                         <div className="flex gap-2 text-gray-400 font-bold whitespace-nowrap" dir="ltr">
                                                            <span>F: {r.fats}g</span>
                                                            <span>•</span>
                                                            <span>C: {r.carbs}g</span>
                                                            <span>•</span>
                                                            <span>P: {r.protein}g</span>
                                                            <span>•</span>
                                                            <span className="text-emerald-500 font-black">{r.calories} kcal</span>
                                                         </div>
                                                         <button 
                                                            type="button"
                                                            onClick={() => {
                                                               handleLogExternalMeal(r.name, r.category, r.calories, r.protein, r.carbs, r.fats);
                                                               alert(`تم طبخ وتسجيل وجبة "${r.name}" في سجل يومك بنجاح! 🍳🎉`);
                                                            }}
                                                            className="py-1.5 px-3 bg-[#E07A5F] hover:bg-[#c96c53] active:scale-95 text-white text-[10px] font-extrabold rounded-lg transition-transform flex items-center gap-1 cursor-pointer"
                                                         >
                                                            <Check className="w-3 h-3" />
                                                            <span>طهي وتسجيل كوجبة اليوم 🍳</span>
                                                         </button>
                                                      </div>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               {/* 3. Materials and Kitchen Stock Refrigerator management */}
               <div className={cn("rounded-3xl p-5 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5")}>
                  <button 
                     type="button" 
                     onClick={() => setIsMaterialsExpanded(!isMaterialsExpanded)} 
                     className="w-full flex justify-between items-center text-right flex-row-reverse focus:outline-none cursor-pointer"
                  >
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-550 flex items-center justify-center rounded-xl shrink-0">
                           <Archive className="w-5 h-5 shrink-0" />
                        </div>
                        <div className="text-right">
                           <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">المواد الخام والمكونات في مطبخك (الثلاجة) ❄️</h3>
                           <p className="text-[10px] text-gray-400 font-bold block">أضف خامات بيتك، حدّث كمياتها، أو احذفها لبناء التوصيات الذكية</p>
                        </div>
                     </div>
                     <span className="text-xs font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-md hidden sm:inline-block shrink-0">
                        {fridgeItems.length} مكون متوفر
                     </span>
                     <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isMaterialsExpanded ? "transform rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                     {isMaterialsExpanded && (
                        <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden mt-5 border-t border-gray-100 dark:border-white/5 pt-4 space-y-4"
                        >
                           {/* Add item form */}
                           <div className="bg-gray-50/55 dark:bg-white/5 p-4 rounded-2xl border border-gray-150/40 dark:border-white/5 flex gap-2 flex-col sm:flex-row-reverse sm:items-end text-right" dir="rtl">
                              <div className="flex-1 space-y-1.5 text-right w-full">
                                 <label className="text-[10px] font-bold text-gray-455 block text-right">اسم الغرض / المكون في البيت</label>
                                 <input 
                                    type="text"
                                    value={newFridgeName}
                                    onChange={(e) => setNewFridgeName(e.target.value)}
                                    placeholder="مثال: بيض بلدي، صدور دجاج، جبنة، شوفان..."
                                    className="w-full h-11 px-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 text-right"
                                 />
                              </div>
                              <div className="w-full sm:w-44 space-y-1.5 text-right">
                                 <label className="text-[10px] font-bold text-gray-455 block text-right">التصنيف</label>
                                 <select 
                                    value={newFridgeCategory}
                                    onChange={(e) => setNewFridgeCategory(e.target.value)}
                                    className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 text-right"
                                 >
                                    {['بروتينات', 'ألبان', 'خضراوات', 'فواكه', 'نشويات', 'أخرى'].map(cat => (
                                       <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                 </select>
                              </div>
                              <button 
                                 type="button"
                                 onClick={() => {
                                    if(!newFridgeName.trim()) return;
                                    handleAddFridgeItem(newFridgeName, newFridgeCategory);
                                 }}
                                 className="h-11 px-5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mt-2 sm:mt-0 whitespace-nowrap shrink-0"
                              >
                                 <Plus className="w-4 h-4" />
                                 <span>إضافة للثلاجة</span>
                              </button>
                           </div>

                           {/* Fridge list */}
                           {fridgeItems.length === 0 ? (
                              <div className="text-center py-8 text-gray-400 text-xs font-bold space-y-1 rounded-2xl border-2 border-dashed border-gray-150 dark:border-white/5">
                                 <p>🍲 ثلاجتك فارغة حالياً!</p>
                                 <p className="text-[10px] font-semibold text-gray-455 text-center">أدخل خامات بيتك بالأعلى مثل "بيض" أو "جبنة قريش" لتستخرج الوصفات.</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                                 {fridgeItems.map(item => {
                                    let badgeBg = "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300";
                                    if (item.category === 'بروتينات') badgeBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300";
                                    else if (item.category === 'ألبان') badgeBg = "bg-sky-55 text-sky-700 dark:bg-sky-900/35 dark:text-sky-300";
                                    else if (item.category === 'خضراوات') badgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
                                    else if (item.category === 'فواكه') badgeBg = "bg-amber-55 text-amber-700 dark:bg-amber-955/20 dark:text-amber-300";
                                    else if (item.category === 'نشويات') badgeBg = "bg-orange-55 text-orange-700 dark:bg-orange-955/20 dark:text-orange-300";

                                    return (
                                       <div key={item.id} className="flex justify-between items-center bg-gray-55/75 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 text-xs flex-row-reverse text-right">
                                          <div className="flex items-center gap-2 flex-row-reverse">
                                             <span className={cn("px-2 py-0.5 rounded-[8px] text-[9px] font-black shrink-0", badgeBg)}>
                                                {item.category}
                                             </span>
                                             <span className="font-extrabold text-gray-800 dark:text-gray-200 text-right">{item.name}</span>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                             <button 
                                                type="button"
                                                onClick={() => {
                                                   handleAddFridgeItemToKitchen(item.name);
                                                   alert(`تمت إضافة "${item.name}" إلى وعاء تحضير المطبخ بالأسفل بنجاح! 🥣`);
                                                }}
                                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-105 text-emerald-700 dark:bg-emerald-955/25 dark:text-emerald-300 font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                                                title="أضف إلى المطبخ الذكي للطبخ الفوري"
                                             >
                                                + وعاء 🍲
                                             </button>
                                             <button 
                                                type="button"
                                                onClick={() => {
                                                   handleFinishFridgeItem(item.id);
                                                   alert(`تم تحديد "${item.name}" كمنتهي ونقله بنجاح إلى قائمة المشتريات للتذكير بشراءه! 🛒`);
                                                }}
                                                className="px-2 py-1 bg-red-50 hover:bg-red-105 text-red-600 dark:bg-red-955/20 dark:text-red-400 font-extrabold text-[9px] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                                                title="تغيير كمنتهي ونقله للمشتريات"
                                             >
                                                خلص ❌
                                             </button>
                                             <button 
                                                type="button"
                                                onClick={() => handleDeleteFridgeItem(item.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                                             >
                                                <Trash2 className="w-3.5 h-3.5" />
                                             </button>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               {/* 4. What did you eat quick logging card */}
               <div className={cn("rounded-3xl p-5 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5")}>
                  <button 
                     type="button" 
                     onClick={() => setIsEatExpanded(!isEatExpanded)} 
                     className="w-full flex justify-between items-center text-right flex-row-reverse focus:outline-none cursor-pointer"
                  >
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-10 h-10 bg-[#E07A5F]/15 text-[#E07A5F] flex items-center justify-center rounded-xl shrink-0">
                           <Utensils className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                           <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">أكلت إيه؟ (تسجيل طعام ذكي وتصفح سريع) 🍽️</h3>
                           <p className="text-[10px] text-gray-400 font-bold block">سجل غذاء اليوم من وصفات جاهزة أو ابحث بين المكونات لتسجيل عشاء أو فطور سريع</p>
                        </div>
                     </div>
                     <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isEatExpanded ? "transform rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                     {isEatExpanded && (
                        <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden mt-5 border-t border-gray-100 dark:border-white/5 pt-4 space-y-4"
                        >
                           {/* Quick composer bowl layout */}
                           <div className="bg-gray-55/55 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 space-y-3 text-right">
                              <h4 className="font-black text-xs text-emerald-600 dark:text-emerald-400 text-right">🥣 وعاء تركيب وتحضير طبخة مبتكرة في مطبخك:</h4>
                              
                              <div className="flex flex-col gap-3">
                                 <div className="space-y-1 w-full text-right">
                                    <label className="text-[10px] font-black text-gray-400 block pr-1 text-right">اسم طبختك المبتكرة</label>
                                    <input 
                                       type="text" 
                                       value={kitchenMealName}
                                       onChange={(e) => setKitchenMealName(e.target.value)}
                                       placeholder="مثال: غدوة متكاملة بالخضار وصدر دجاج 🍲"
                                       className="w-full h-11 px-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-right font-semibold" 
                                    />
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 text-right">
                                       <label className="text-[10px] font-black text-gray-400 block pr-1 text-right">عدد الحصص (الأشخاص)</label>
                                       <input 
                                          type="number" 
                                          min="1"
                                          value={kitchenServings}
                                          onChange={(e) => setKitchenServings(e.target.value)}
                                          className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-[#F0EBE1] dark:border-white/5 rounded-xl text-xs font-bold text-center" 
                                       />
                                    </div>
                                    <div className="space-y-1 text-right">
                                       <label className="text-[10px] font-black text-gray-400 block pr-1 text-right">تصنيف الوجبة</label>
                                       <select 
                                          value={kitchenSelectedCategory}
                                          onChange={(e) => setKitchenSelectedCategory(e.target.value)}
                                          className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-[#F0EBE1] dark:border-white/5 rounded-xl text-xs font-bold text-right font-semibold" 
                                       >
                                          {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                       </select>
                                    </div>
                                 </div>
                              </div>

                              {/* Interactive Added kitchenIngredients inside bowl */}
                              <div className="border-t border-gray-200 dark:border-white/5 pt-3 mt-1 space-y-1 text-right">
                                 <span className="text-[10px] font-black text-gray-400 block mb-2 text-right">مكونات وعاء المطبخ الحالي:</span>
                                 {kitchenIngredients.length === 0 ? (
                                    <p className="text-[10px] text-gray-405 py-4 font-semibold text-center border-2 border-dashed border-gray-250/35 rounded-xl bg-white dark:bg-black/10">🍲 وعاء المزيج فارغ. أضف مكونات من ثلاجتك عبر الضغط على (+ وعاء 🍲) بالأعلى أو استخدم البحث في قاعدة الأغذية الشائعة أدناه.</p>
                                 ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                       {kitchenIngredients.map((ing) => (
                                          <div key={ing.id} className="flex justify-between items-center text-[10px] sm:text-[11px] flex-row-reverse text-right bg-white dark:bg-[#121415] border border-gray-100 dark:border-white/5 p-2 rounded-xl shadow-sm">
                                             <div className="flex items-center gap-2 flex-row-reverse">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                <div className="text-right">
                                                   <span className="font-extrabold text-gray-800 dark:text-gray-200 block text-right">{ing.name}</span>
                                                   <span className="text-[10px] text-gray-400 block text-right">({ing.qty} {ing.unitLabel})</span>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-extrabold ml-1">{ing.scaledCalories} kcal</span>
                                                <button 
                                                   type="button" 
                                                   onClick={() => handleUpdateIngredientQty(ing.id, true)}
                                                   className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-650 dark:bg-white/10 dark:text-gray-300 rounded flex items-center justify-center font-bold"
                                                >
                                                   +
                                                </button>
                                                <button 
                                                   type="button" 
                                                   onClick={() => handleUpdateIngredientQty(ing.id, false)}
                                                   className="w-5 h-5 bg-gray-100 hover:bg-gray-200 text-gray-650 dark:bg-white/10 dark:text-gray-300 rounded flex items-center justify-center font-bold"
                                                >
                                                   -
                                                </button>
                                                <button 
                                                   type="button" 
                                                   onClick={() => setKitchenIngredients(prev => prev.filter(p => p.id !== ing.id))}
                                                   className="text-red-400 hover:text-red-650 p-1"
                                                >
                                                   🗑️
                                                </button>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>

                              {/* Nutrients Calculator breakdown for kitchenIngredients */}
                              {kitchenIngredients.length > 0 && (
                                 (() => {
                                    let totalCals = 0;
                                    let totalP = 0;
                                    let totalC = 0;
                                    let totalF = 0;
                                    kitchenIngredients.forEach(i => {
                                       totalCals += i.scaledCalories;
                                       totalP += i.scaledProtein;
                                       totalC += i.scaledCarbs;
                                       totalF += i.scaledFats;
                                    });
                                    const sQty = parseFloat(kitchenServings) || 1;
                                    return (
                                       <div className="mt-3 p-3 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-xl border border-emerald-500/10 space-y-1.5 font-bold text-right" dir="rtl">
                                          <div className="flex justify-between items-center flex-row-reverse font-black text-[11px] text-emerald-800 dark:text-emerald-300">
                                             <span>إجمالي قيمة الطبخة (لكل حصّة طبق):</span>
                                             <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold">{Math.round(totalCals/sQty)} kcal</span>
                                          </div>
                                          <div className="flex justify-between text-[10px] text-gray-550 font-bold flex-row-reverse pt-1 border-t border-emerald-500/10" dir="rtl">
                                             <span>بروتين: {Math.round((totalP/sQty)*10)/10}g</span>
                                             <span>كارب: {Math.round((totalC/sQty)*10)/10}g</span>
                                             <span>دهون: {Math.round((totalF/sQty)*10)/10}g</span>
                                          </div>
                                          <button 
                                             type="button"
                                             onClick={() => {
                                                handleAddKitchenRecipeToToday();
                                                alert("تم طهي وتسجيل وصفتك المخصصة بنجاح في سجل اليوم! 🥘😋");
                                             }}
                                             className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer mt-2"
                                          >
                                             <Check className="w-4 h-4" /> صب المزيج كوجبة دايت لليوم 🥘
                                          </button>
                                       </div>
                                    );
                                 })()
                              )}
                           </div>

                           {/* Predefined food items quick search in kitchen */}
                           <div className="border border-gray-150/40 dark:border-white/5 rounded-2xl p-4 bg-gray-50/75 dark:bg-[#121415] space-y-2 text-right">
                              <span className="text-[10px] font-black text-gray-450 block text-right mb-1">تصفح وإضافة غذاء من قاعدة الأغذية الشائعة 🔍</span>
                              <div className="relative">
                                 <input 
                                    type="text" 
                                    value={kitchenSearch}
                                    onChange={(e) => setKitchenSearch(e.target.value)}
                                    placeholder="ابحث بالاسم: أرز، لحم، تونة، جرجير..."
                                    className="w-full h-10 pr-9 pl-4 bg-white dark:bg-[#1A1A1A] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold text-right"
                                    dir="rtl"
                                 />
                                 <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                              </div>

                              {kitchenSearch.trim().length > 1 && (
                                 <div className="bg-white dark:bg-[#1A1A1A] p-2 rounded-xl max-h-44 overflow-y-auto space-y-1 border border-gray-150/40 dark:border-white/5">
                                    {COMMON_FOODS.filter(f => f.name.toLowerCase().includes(kitchenSearch.toLowerCase())).map((food, i) => (
                                       <button
                                          key={i}
                                          type="button"
                                          onClick={() => {
                                             const matchedUnit = food.name.includes('لبن') || food.name.includes('حليب') ? 'cup' : food.name.includes('تفاح') || food.name.includes('موز') || food.name.includes('بيض') ? 'piece' : 'gram';
                                             const matchedLabel = matchedUnit === 'cup' ? 'كوب' : matchedUnit === 'piece' ? 'حبة' : 'جم';
                                             const matchedQty = matchedUnit === 'gram' ? 100 : 1;

                                             const addedIng = {
                                                id: `ki_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                                name: food.name,
                                                qty: matchedQty,
                                                unit: matchedUnit,
                                                unitLabel: matchedLabel,
                                                scaledCalories: food.calories,
                                                scaledProtein: food.protein,
                                                scaledCarbs: food.carbs,
                                                scaledFats: food.fats,
                                                baseFood: food
                                             };
                                             setKitchenIngredients(prev => [...prev, addedIng]);
                                             setKitchenSearch('');
                                             alert(`تمت إضافة المكوّن "${food.name}" لوعاء تركيب المطبخ! 🥣`);
                                          }}
                                          className="w-full text-right p-1.5 text-xs font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg flex justify-between items-center flex-row-reverse"
                                       >
                                          <span>{food.name}</span>
                                          <span className="text-[10px] text-emerald-500 shrink-0">{food.calories} kcal / حصّة واحدة</span>
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               {/* 5. What's missing shopping list card */}
               <div className={cn("rounded-3xl p-5 shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5")}>
                  <button 
                     type="button" 
                     onClick={() => setIsMissingExpanded(!isMissingExpanded)} 
                     className="w-full flex justify-between items-center text-right flex-row-reverse focus:outline-none cursor-pointer"
                  >
                     <div className="flex items-center gap-3 flex-row-reverse">
                        <div className="w-10 h-10 bg-[#E07A5F]/15 text-[#E07A5F] flex items-center justify-center rounded-xl shrink-0">
                           <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                           <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">إيه اللي ناقصك؟ (قائمة النواقص ومشتريات المطبخ) 🛒</h3>
                           <p className="text-[10px] text-gray-400 font-bold block">الأغراض المنتهية أو المطلوبة للشراء لإكمال طبخاتك دايت الصعبة</p>
                        </div>
                     </div>
                     <span className="text-xs font-black bg-[#E07A5F]/15 text-[#E07A5F] px-2.5 py-1 rounded-md hidden sm:inline-block shrink-0">
                        {shoppingList.length} نواقص ومشتريات
                     </span>
                     <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isMissingExpanded ? "transform rotate-180" : "")} />
                  </button>

                  <AnimatePresence>
                     {isMissingExpanded && (
                        <motion.div 
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: 'auto' }}
                           exit={{ opacity: 0, height: 0 }}
                           className="overflow-hidden mt-5 border-t border-gray-100 dark:border-white/5 pt-4 space-y-4"
                        >
                           {/* Add item to Shopping List Form */}
                           <div className="bg-gray-50/55 dark:bg-white/5 p-4 rounded-2xl border border-gray-150/40 dark:border-white/5 flex gap-2 flex-col sm:flex-row-reverse sm:items-end text-right" dir="rtl">
                              <div className="flex-1 space-y-1.5 text-right w-full">
                                 <label className="text-[10px] font-bold text-gray-450 block text-right">اسم الغرض المطلوب شراؤه</label>
                                 <input 
                                    type="text"
                                    value={newShoppingName}
                                    onChange={(e) => setNewShoppingName(e.target.value)}
                                    placeholder="مثال: زيت زيتون، دجاج، أرز، جرجير..."
                                    className="w-full h-11 px-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#E07A5F] text-right"
                                    dir="rtl"
                                 />
                              </div>
                              <div className="w-full sm:w-44 space-y-1.5 text-right">
                                 <label className="text-[10px] font-bold text-gray-455 block text-right">تصنيف النقص</label>
                                 <select 
                                    value={newShoppingCategory}
                                    onChange={(e) => setNewShoppingCategory(e.target.value)}
                                    className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#E07A5F] text-right"
                                 >
                                    {['بروتينات', 'ألبان', 'خضراوات', 'فواكه', 'نشويات', 'أخرى'].map(cat => (
                                       <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                 </select>
                              </div>
                              <button 
                                 type="button"
                                 onClick={() => {
                                    if(!newShoppingName.trim()) return;
                                    handleAddShoppingItem(newShoppingName, newShoppingCategory);
                                 }}
                                 className="h-11 px-5 bg-[#E07A5F] hover:bg-[#c96c53] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer mt-2 sm:mt-0 whitespace-nowrap shrink-0"
                              >
                                 <Plus className="w-4 h-4" />
                                 <span>أضف للطلبات</span>
                              </button>
                           </div>

                           {/* Shopping List Content */}
                           {shoppingList.length === 0 ? (
                              <div className="text-center py-8 text-gray-400 text-xs font-bold space-y-1 border-2 border-dashed border-gray-150 rounded-2xl dark:border-white/5">
                                 <p>🛒 قائمة مشترياتك فارغة بالكامل!</p>
                                 <p className="text-[10px] font-semibold text-gray-450">كل احتياجات بيتك متوفرة بالثلاجة تماماً وعمار بالخير!</p>
                              </div>
                           ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                 {shoppingList.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-gray-50/75 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 text-xs flex-row-reverse text-right">
                                       <div className="flex items-center gap-2 flex-row-reverse font-semibold text-right">
                                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                          <span className="font-extrabold text-gray-800 dark:text-gray-200 text-right">{item.name}</span>
                                          <span className="text-[10px] text-gray-455 pr-1 shrink-0">(${item.category})</span>
                                       </div>
                                       <div className="flex items-center gap-1 shrink-0">
                                          <button 
                                             type="button"
                                             onClick={() => {
                                                handleBuyShoppingItem(item.id);
                                                alert(`تم شراء "${item.name}" وإعادته تلقائياً لقائمة المكونات المتوفرة في ثلاجتك لتستفيد منه في التوصيات الفورية! 🎉`);
                                             }}
                                             className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[10px] rounded-lg transition-transform active:scale-95 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                             title="تم الشراء وإرجاعه للثلاجة"
                                          >
                                             تم الشراء ✅
                                          </button>
                                          <button 
                                             type="button"
                                             onClick={() => handleDeleteShoppingItem(item.id)}
                                             className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                                          >
                                             <Trash2 className="w-4 h-4" />
                                          </button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </motion.div>
         ) : activeDateTab === '⚖️ الوزن والجسم' ? ( 
           <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="space-y-6 mb-24 text-right"
              dir="rtl"
           >
              {/* 📊 Interactive Recharts Weight & Goal Trend Chart */}
              <div className="rounded-3xl p-6 shadow-sm border text-right overflow-hidden relative bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                 <div className="flex justify-between items-center mb-4 flex-row-reverse">
                    <div className="flex items-center gap-2 flex-row-reverse">
                       <span className="w-10 h-10 bg-sky-50 dark:bg-sky-900/20 text-sky-500 flex items-center justify-center rounded-xl">
                          <Activity className="w-5 h-5" />
                       </span>
                       <div>
                          <h3 className="font-bold text-sm">مخطط الوزن وتطور الجسم 📈</h3>
                          <p className="text-[10px] text-gray-400">مقارنة الوزن الحالي والمستهدف مع منحنى القياسات التاريخية</p>
                       </div>
                    </div>
                    {profile.targetWeight && (
                       <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md">
                          الهدف الأول: {profile.targetWeight} كجم 🎯
                       </span>
                    )}
                 </div>

                 {/* Recharts Graphical Display */}
                 <div className="w-full h-52 mt-6" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={rechartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                             <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                             </linearGradient>
                             <linearGradient id="muscleGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.08)" />
                          <XAxis 
                             dataKey="date" 
                             stroke="#888888" 
                             fontSize={9} 
                             tickLine={false} 
                             axisLine={false} 
                             tickMargin={8}
                          />
                          <YAxis 
                             domain={['dataMin - 3', 'dataMax + 3']} 
                             stroke="#888888" 
                             fontSize={9} 
                             tickLine={false} 
                             axisLine={false} 
                             tickMargin={8} 
                             orientation="right"
                          />
                          <Tooltip 
                             contentStyle={{ 
                                background: 'rgba(30, 30, 30, 0.95)', 
                                border: '1px solid rgba(128,128,128,0.15)', 
                                borderRadius: '12px', 
                                color: '#fff', 
                                fontSize: '11px', 
                                textAlign: 'right' 
                             }} 
                          />
                          <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                          <Area 
                             type="monotone" 
                             dataKey="الوزن الحالي" 
                             stroke="#0ea5e9" 
                             strokeWidth={2.5} 
                             fillOpacity={1} 
                             fill="url(#weightGrad)" 
                             activeDot={{ r: 6 }}
                          />
                          {inBodyLogs.some(l => l.muscleMass) && (
                             <Area 
                                type="monotone" 
                                dataKey="الكتلة العضلية" 
                                stroke="#10b981" 
                                strokeWidth={1.5} 
                                fillOpacity={1} 
                                fill="url(#muscleGrad)" 
                             />
                          )}
                          {profile.targetWeight && (
                             <ReferenceLine 
                                y={profile.targetWeight} 
                                stroke="#EF4444" 
                                strokeDasharray="4 4" 
                                label={{ value: 'الوزن المستهدف', fill: '#EF4444', fontSize: 8, position: 'bottom' }} 
                             />
                          )}
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              {/* 📌 BMI Classification & Health Indicators Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-row-reverse" dir="rtl">
                 <div className="rounded-2xl p-4 shadow-sm border bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                    <span className="text-[10px] text-gray-400 block mb-0.5">مؤشر كتلة الجسم (BMI)</span>
                    <span className="text-lg font-black text-sky-500 block">{bmi || '--'}</span>
                    <span className="text-[10px] text-gray-400 bg-sky-50 dark:bg-sky-950/20 px-1.5 py-0.5 rounded font-black mt-1 inline-block">{bmiDesc || '--'}</span>
                 </div>

                 <div className="rounded-2xl p-4 shadow-sm border bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                    <span className="text-[10px] text-gray-400 block mb-0.5">معدل الأيض الأساسي (BMR)</span>
                    <span className="text-lg font-black text-rose-500 block">
                       {inBodyLogs[0]?.bmr || Math.round(10 * (profile.weight || 70) + 6.25 * (profile.height || 170) - 5 * 25 + (profile.gender === 'male' ? 5 : -161))}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-1 block">السعرات اللازمة لوظائف الأعضاء</span>
                 </div>

                 <div className="rounded-2xl p-4 shadow-sm border bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                    <span className="text-[10px] text-gray-400 block mb-0.5">نسبة دهون الجسم 🏷️</span>
                    <span className="text-lg font-black text-orange-500 block">{inBodyLogs[0]?.fatPercentage ? `${inBodyLogs[0].fatPercentage}%` : '--'}</span>
                    <span className="text-[9px] text-gray-400 mt-1 block">مستوى اللياقة والتخسيس المجهري</span>
                 </div>

                 <div className="rounded-2xl p-4 shadow-sm border bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                    <span className="text-[10px] text-gray-400 block mb-0.5">نسبة الماء الحيوية 💧</span>
                    <span className="text-lg font-black text-blue-500 block">{inBodyLogs[0]?.waterPercentage ? `${inBodyLogs[0].waterPercentage}%` : '٥٥%'}</span>
                    <span className="text-[9px] text-gray-400 mt-1 block">ترطيب الخلايا وصحة الكلى</span>
                 </div>
              </div>

              {/* ⚖️ InBody Details Card */}
              <div className="rounded-3xl p-5 shadow-sm border text-right bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                 <div className="flex justify-between items-center flex-row-reverse mb-4">
                    <div className="flex items-center gap-2 flex-row-reverse">
                       <span className="w-10 h-10 bg-[#E07A5F]/10 text-[#E07A5F] flex items-center justify-center rounded-xl">
                          <Scale className="w-5 h-5" />
                       </span>
                       <div>
                          <h3 className="font-bold text-sm">مستندات الـ InBody التفصيلية 📐</h3>
                          <p className="text-[10px] text-gray-400 font-bold block">مراقبة دقيقة لنسب الدهون والعضلات وحرق الجسم المجهري</p>
                       </div>
                    </div>
                    <button 
                       type="button"
                       onClick={() => setIsInBodyModalOpen(true)}
                       className="px-4 py-2 bg-[#E07A5F] hover:bg-[#c96c53] text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    >
                       <Plus className="w-3.5 h-3.5" />
                       تسجيل قياس InBody
                    </button>
                 </div>

                 {inBodyLogs.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-4 font-bold">لم تقم بتسجيل أي قياسات InBody بعد. ابدأ اليوم للوقوف على مستوى تقدمك مجهرياً!</p>
                 ) : (
                    <div className="space-y-3 font-semibold text-xs text-right">
                       {/* Current most recent log */}
                       <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center flex-row-reverse">
                          <div>
                             <span className="text-[10px] text-gray-400 block mb-1">نسبة الدهون</span>
                             <span className="text-sm font-black text-rose-500">{inBodyLogs[0].fatPercentage ?? '--'} %</span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-400 block mb-1">الكتلة العضلية</span>
                             <span className="text-sm font-black text-emerald-500">{inBodyLogs[0].muscleMass ?? '--'} كجم</span>
                          </div>
                          <div>
                             <span className="text-[10px] text-gray-400 block mb-1 font-mono">الوزن المسجل</span>
                             <span className="text-sm font-black text-sky-500">{inBodyLogs[0].weight} كجم</span>
                          </div>
                       </div>

                       {inBodyProgress && (
                          <div className="bg-[#FAF3E0] dark:bg-[#2D2824] p-4 rounded-2xl border border-amber-200/30 dark:border-amber-900/40 text-right space-y-2 mb-2">
                             <h4 className="font-bold text-xs text-amber-800 dark:text-amber-500 flex items-center justify-end gap-1.5 flex-row-reverse">
                                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                                تحليل التطور مقارنةً بالقياس السابق 📈
                             </h4>
                             <div className="grid grid-cols-3 gap-2 text-center" dir="rtl">
                                <div className="bg-white/40 dark:bg-black/20 p-2 rounded-xl border border-amber-200/10">
                                   <span className="text-[10px] text-gray-400 block mb-0.5">الوزن الكلي</span>
                                   <span className={cn("text-xs font-black block", inBodyProgress.weightDiff <= 0 ? "text-emerald-500" : "text-rose-505")}>
                                      {inBodyProgress.weightDiff <= 0 ? `${Math.abs(inBodyProgress.weightDiff).toFixed(1)} كجم 📉` : `+${inBodyProgress.weightDiff.toFixed(1)} كجم 📈`}
                                   </span>
                                </div>
                                <div className="bg-white/40 dark:bg-black/20 p-2 rounded-xl border border-amber-200/10">
                                   <span className="text-[10px] text-gray-400 block mb-0.5">الكتلة العضلية</span>
                                   <span className={cn("text-xs font-black block", inBodyProgress.muscleDiff !== null ? (inBodyProgress.muscleDiff >= 0 ? "text-emerald-500" : "text-rose-550") : "text-gray-400")}>
                                      {inBodyProgress.muscleDiff !== null ? (inBodyProgress.muscleDiff >= 0 ? `+${inBodyProgress.muscleDiff.toFixed(1)} كجم 💪` : `${inBodyProgress.muscleDiff.toFixed(1)} كجم ⚠️`) : '--'}
                                   </span>
                                </div>
                                <div className="bg-white/40 dark:bg-black/20 p-2 rounded-xl border border-amber-200/10">
                                   <span className="text-[10px] text-gray-400 block mb-0.5">نسبة الدهون</span>
                                   <span className={cn("text-xs font-black block", inBodyProgress.fatDiff !== null ? (inBodyProgress.fatDiff <= 0 ? "text-emerald-500 block" : "text-rose-500 block") : "text-gray-400")}>
                                      {inBodyProgress.fatDiff !== null ? (inBodyProgress.fatDiff <= 0 ? `${Math.abs(inBodyProgress.fatDiff).toFixed(1)}% 🔥` : `+${inBodyProgress.fatDiff.toFixed(1)}% 📈`) : '--'}
                                   </span>
                                </div>
                             </div>
                          </div>
                       )}

                       {/* Collapsible history list */}
                       {inBodyLogs.length > 1 && (
                          <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                             <button 
                                onClick={() => setExpandedCard(expandedCard === 'inbody' ? null : 'inbody')}
                                className="w-full flex justify-between items-center text-gray-500 hover:text-gray-950 dark:hover:text-white cursor-pointer"
                             >
                                <ChevronDown className={cn("w-4 h-4 transition-transform", expandedCard === 'inbody' ? "transform rotate-180" : "")} />
                                <span className="font-bold text-[11px]">عرض السجلات السابقة ({inBodyLogs.length - 1})</span>
                             </button>

                             <AnimatePresence>
                                {expandedCard === 'inbody' && (
                                   <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden space-y-2 mt-2"
                                   >
                                      {inBodyLogs.slice(1).map(log => (
                                         <div key={log.id} className="flex justify-between items-center p-2.5 bg-[#FDFBF7] dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                            <button onClick={(e) => deleteInBodyLog(log.id, e)} className="text-rose-450 hover:text-rose-600 font-bold text-[10px] cursor-pointer">حذف</button>
                                            <div className="flex gap-4 items-center flex-row-reverse" dir="rtl">
                                               <span className="text-[11px] text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleDateString('ar-EG', {month: 'short', day: 'numeric'}) : ''}</span>
                                               <span className="font-bold text-gray-700 dark:text-gray-300">{log.weight} كجم</span>
                                               <span className="text-[10px] text-gray-400">دهون: {log.fatPercentage ?? '--'}% | عضل: {log.muscleMass ?? '--'}كجم</span>
                                            </div>
                                         </div>
                                      ))}
                                   </motion.div>
                                )}
                             </AnimatePresence>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* 📏 Body Measurements Card (مقاسات الجسم) */}
              <div className="rounded-3xl p-5 shadow-sm border text-right bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                 <div className="flex justify-between items-center flex-row-reverse mb-4">
                    <div className="flex items-center gap-2 flex-row-reverse">
                       <span className="w-10 h-10 bg-amber-50 dark:bg-amber-955/25 text-amber-500 flex items-center justify-center rounded-xl">
                          <Salad className="w-5 h-5" />
                       </span>
                       <div>
                          <h3 className="font-bold text-sm">مقاسات الجسم بالسنتيمتر 📏</h3>
                          <p className="text-[10px] text-gray-400 font-bold block">متابعة دقيقة لمحيط الصدر والخصر والأرداف لتأكيد النحت العضلي</p>
                       </div>
                    </div>
                    <button 
                       type="button"
                       onClick={() => setIsMeasModalOpen(true)}
                       className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    >
                       <Plus className="w-3.5 h-3.5" />
                       تحديث المقاسات
                    </button>
                 </div>

                 {bodyMeasurements.length === 0 ? (
                    <p className="text-xs text-center text-gray-400 py-4 font-bold">لم تقم بتسجيل أي مقاسات للجسم بعد. ابدأ اليوم لملاحظة التغير الإيجابي في شكل الملابس!</p>
                 ) : (
                    <div className="space-y-4">
                       {/* Current Measurements details */}
                       <div className="grid grid-cols-5 gap-2 text-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl flex-row-reverse text-xs font-black">
                          <div>
                             <span className="text-[9px] text-gray-400 block mb-1">الصدر</span>
                             <span className="text-amber-600">{bodyMeasurements[0].chest || '--'} سم</span>
                          </div>
                          <div>
                             <span className="text-[9px] text-gray-400 block mb-1">الخصر</span>
                             <span className="text-rose-550">{bodyMeasurements[0].waist || '--'} سم</span>
                          </div>
                          <div>
                             <span className="text-[9px] text-gray-400 block mb-1">الأرداف</span>
                             <span className="text-violet-500">{bodyMeasurements[0].hips || '--'} سم</span>
                          </div>
                          <div>
                             <span className="text-[9px] text-gray-400 block mb-1">الذراع</span>
                             <span className="text-sky-500">{bodyMeasurements[0].arms || '--'} سم</span>
                          </div>
                          <div>
                             <span className="text-[9px] text-gray-400 block mb-1">الفخذ</span>
                             <span className="text-emerald-500">{bodyMeasurements[0].thighs || '--'} سم</span>
                          </div>
                       </div>

                       {bodyMeasurements.length > 1 && (
                          <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                             <button 
                                onClick={() => setExpandedCard(expandedCard === 'measurements_hist' ? null : 'measurements_hist')}
                                className="w-full flex justify-between items-center text-gray-500 hover:text-gray-950 dark:hover:text-white cursor-pointer"
                             >
                                <ChevronDown className={cn("w-4 h-4 transition-transform", expandedCard === 'measurements_hist' ? "transform rotate-180" : "")} />
                                <span className="font-bold text-[11px]">سجل المقاسات المسبقة ({bodyMeasurements.length - 1})</span>
                             </button>

                             <AnimatePresence>
                                {expandedCard === 'measurements_hist' && (
                                   <motion.div 
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden space-y-2 mt-2"
                                   >
                                      {bodyMeasurements.slice(1).map(m => (
                                         <div key={m.id} className="flex justify-between items-center p-2.5 bg-[#FAF9F6] dark:bg-white/5 rounded-xl border border-gray-100">
                                            <button onClick={() => handleDeleteBodyMeasurement(m.id)} className="text-rose-500 hover:text-rose-700 text-[10px] cursor-pointer">حذف</button>
                                            <div className="text-[10px] space-x-2 space-x-reverse flex flex-row-reverse text-gray-500 dark:text-gray-400">
                                               <span className="font-bold text-gray-600 dark:text-gray-300 pl-2">{m.date}</span>
                                               <span>خصر: {m.waist}سم</span>
                                               <span>صدر: {m.chest}سم</span>
                                               <span>ردف: {m.hips}سم</span>
                                            </div>
                                         </div>
                                      ))}
                                   </motion.div>
                                )}
                             </AnimatePresence>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* 🩺 Dr. Report - تقرير الطبيب المعتمد للدكتور أو الأخصائي */}
              <div className="rounded-3xl p-5 shadow-sm border text-right relative overflow-hidden bg-[#1A4D42]/5 border-emerald-100 dark:bg-emerald-950/15 dark:border-emerald-900/30">
                 <div className="flex justify-between items-center flex-row-reverse mb-4 relative z-10">
                    <div className="flex items-center gap-2 flex-row-reverse">
                       <span className="w-10 h-10 bg-emerald-500/10 text-emerald-600 flex items-center justify-center rounded-xl">
                          <Activity className="w-5 h-5 text-emerald-500" />
                       </span>
                       <div>
                          <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-400">إصدار تقرير الطبيب المنسق 🩺</h3>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold block">ملخص طبي وعيادي جاهز للطباعة والتحميل لمشاركته مع مدربك أو طبيبك الخاص</p>
                       </div>
                    </div>
                    <button 
                       type="button"
                       onClick={() => setIsDoctorReportOpen(true)}
                       className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                    >
                       <Printer className="w-3.5 h-3.5" />
                       عرض التقرير العيادي الجاهز بالطابعة
                    </button>
                 </div>
                 <div className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-emerald-100/30 text-xs text-gray-650 dark:text-gray-300 leading-relaxed">
                    <p className="font-extrabold text-emerald-800 dark:text-emerald-400 mb-1">ملخص المؤشرات الحالية للأخصائي:</p>
                    <p>المشترك: {profile.name || 'بطل'} | مؤشر كتلة الجسم الحالى: <strong className="text-sky-500">{bmi || '--'}</strong> | الوزن المسجل الأخير: <strong>{profile.weight || '--'} كجم</strong>.</p>
                    {inBodyLogs.length > 0 && (
                       <p className="mt-1">آخر قراءة للجسم: دهون الغلاف {inBodyLogs[0].fatPercentage ?? '--'}% | كتلة عضلية صافية: {inBodyLogs[0].muscleMass ?? '--'} كجم | معدل الحرق اليومي بالمركبات: {inBodyLogs[0].bmr ?? '--'} سعرة.</p>
                    )}
                 </div>
              </div>

              {/* ⏰ Smart Measurement Reminders & Protips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                 <div className="rounded-3xl p-5 shadow-sm border text-right bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                    <div className="flex justify-between items-center mb-4 flex-row-reverse">
                       <h4 className="font-bold text-xs flex items-center gap-1.5 flex-row-reverse">
                          <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
                          مواعيد وتذكيرات قياس الوزن ⏰
                       </h4>
                       <button 
                          onClick={() => setIsReminderSettingsOpen(!isReminderSettingsOpen)}
                          className="text-[#E07A5F] hover:underline font-bold text-[10px] cursor-pointer"
                       >
                          تعديل اليوم
                       </button>
                    </div>
                    <p className="text-xs text-gray-550 dark:text-gray-300 leading-relaxed mb-3">
                       تذكيرك مبرمج حالياً ليوم <span className="font-black text-amber-600 bg-amber-50 dark:bg-amber-955/40 px-2 py-0.5 rounded">{measurementReminderDay}</span> صباحاً قبل تناول أي إفطار أو قهوة.
                    </p>
                    
                    {isReminderSettingsOpen && (
                       <div className="flex gap-1.5 flex-wrap justify-end p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-black" dir="rtl">
                          {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(day => (
                             <button
                                key={day}
                                onClick={() => handleSaveReminderDay(day)}
                                className={cn("px-2 py-1 rounded transition-all cursor-pointer", measurementReminderDay === day ? "bg-amber-500 text-white" : "bg-white dark:bg-black/30 border border-gray-100 hover:bg-gray-100")}
                             >
                                {day}
                             </button>
                          ))}
                       </div>
                    )}
                    <span className="text-[10px] block mt-1 text-gray-400">⏰ تنبيه: يتم مواءمة مواعيد القياس تلقائياً بالمنبه الهاتفي صباح القياس لضمان الصيام العيادي! </span>
                 </div>

                 <div className="rounded-3xl p-5 shadow-sm border text-right bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5">
                    <h4 className="font-bold text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 flex-row-reverse mb-3">
                       <Lightbulb className="w-4 h-4 text-indigo-500" />
                       نصيحة المنحنى الطبي وعلم الهرمونات 🔬
                    </h4>
                    <p className="text-xs text-gray-550 dark:text-gray-300 leading-relaxed">
                       خسارة نصف كيلو دهون بالأسبوع هو الإنجاز المضمون طبيعياً لحماية العضلات لمنع عودة الوزن (الـ Yo-Yo Effect). لا تجعل الميزان اليومي يحبطك بسبب احتباس الماء وتقلبات الأملاح! صمم على التقدم الثابت.
                    </p>
                 </div>
              </div>
           </motion.div>

         ) : (
            <motion.div 
               initial={{ opacity: 0, y: 15 }} 
               animate={{ opacity: 1, y: 0 }} 
               className="space-y-6 mb-24 text-right"
               dir="rtl"
            >
               {/* Nutritional Warning/Tip */}
               {totals.calories > 0 && GOALS.calories > 0 && totals.protein < GOALS.protein * 0.5 && totals.calories > GOALS.calories * 0.5 && (
                  <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 flex items-center gap-3 flex-row-reverse text-right shadow-sm">
                      <Activity className="w-5 h-5 text-rose-500 shrink-0" />
                      <div>
                         <p className="font-bold text-sm text-rose-800 dark:text-rose-400">بروتين اليوم قليل جداً</p>
                         <p className="text-xs text-rose-600 dark:text-rose-500 mt-1">حاول تضيف بيض، دجاج، أو لحم لوجبتك الجاية للحفاظ على العضلات والشبع.</p>
                      </div>
                  </div>
               )}

               {/* Main Calories & Macros Card */}
               <div className={cn("rounded-[24px] p-5 text-white shadow-md text-right border relative overflow-hidden mt-4",
                  isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-[#1A4D42] dark:bg-emerald-950 border-[#1A4D42]/20"
               )}>
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                  <div className="flex justify-between items-center mb-5 flex-row-reverse relative z-10">
                     <div>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">السعرات المستهلكة</p>
                        <div className="flex items-baseline gap-1 flex-row-reverse">
                           <span className="text-3xl font-black tracking-tighter">{totals.calories}</span>
                           <span className="text-xs font-bold text-white/80">/ {GOALS.calories}</span>
                        </div>
                     </div>
                     <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                           <circle cx="50" cy="50" r="45" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                           <circle 
                             cx="50" cy="50" r="45" stroke="#E07A5F" strokeWidth="8" fill="none" 
                             strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - Math.min(totals.calories/GOALS.calories, 1))} 
                             strokeLinecap="round" className="transition-all duration-1000" 
                           />
                        </svg>
                        <span className="absolute text-sm font-black leading-none">{Math.round((totals.calories/GOALS.calories)*100)}%</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 relative z-10 flex-row-reverse text-center">
                     <div>
                        <p className="text-[10px] font-bold text-white/70 mb-2">بروتين</p>
                        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                           <div className="h-full bg-[#E07A5F] rounded-full" style={{ width: `${Math.min((totals.protein/GOALS.protein)*100, 100)}%` }} />
                        </div>
                        <p className="text-xs font-black mt-2">{totals.protein} / {GOALS.protein}g</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-white/70 mb-2">كارب</p>
                        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                           <div className="h-full bg-[#D4A373] rounded-full" style={{ width: `${Math.min((totals.carbs/GOALS.carbs)*100, 100)}%` }} />
                        </div>
                        <p className="text-xs font-black mt-2">{totals.carbs} / {GOALS.carbs}g</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-white/70 mb-2">دهون</p>
                        <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                           <div className="h-full bg-white rounded-full" style={{ width: `${Math.min((totals.fats/GOALS.fats)*100, 100)}%` }} />
                        </div>
                        <p className="text-xs font-black mt-2">{totals.fats} / {GOALS.fats}g</p>
                     </div>
                  </div>
               </div>

              {/* +++ أضيف بناءً على طلبك - بار المشروبات السريعة بلمسة واحدة +++ */}
               <div className="bg-white dark:bg-[#121415] rounded-[24px] p-5 border border-[#F0EBE1] dark:border-white/5 shadow-sm text-right">
                  <div className="flex items-center justify-between flex-row-reverse mb-3">
                     <div className="flex items-center gap-1.5 flex-row-reverse">
                        <Coffee className="w-4 h-4 text-[#E07A5F]" />
                        <h4 className="font-extrabold text-xs text-gray-700 dark:text-gray-200">مشروب بلمسة واحدة ⚡️</h4>
                     </div>
                     <button
                        type="button"
                        onClick={() => setShowDietCustomInputs(!showDietCustomInputs)}
                        className="text-[9px] font-black text-[#E07A5F] bg-[#E07A5F]/10 px-2.5 py-1 rounded-lg hover:bg-[#E07A5F]/15 border border-[#E07A5F]/10 transition-all cursor-pointer"
                     >
                        {showDietCustomInputs ? "الرجوع للقائمة ✕" : "كتابة اسم مخصص ✍️"}
                     </button>
                  </div>
                  
                  {!showDietCustomInputs ? (
                     <div className="flex gap-2 items-center justify-between flex-row-reverse">
                        <select
                           value={selectedDietPresetIndex}
                           onChange={(e) => {
                              const idx = Number(e.target.value);
                              setSelectedDietPresetIndex(idx);
                              setCustomDietDrinkName(DIET_DRINK_PRESETS[idx].name);
                              setCustomDietDrinkCalories(String(DIET_DRINK_PRESETS[idx].calories));
                           }}
                           className="flex-1 text-[11px] px-3 py-2 bg-gray-50 dark:bg-[#1D1D1D] border border-gray-150/55 dark:border-white/5 rounded-xl text-right text-gray-800 dark:text-white outline-none focus:border-[#E07A5F] font-extrabold cursor-pointer"
                        >
                           {DIET_DRINK_PRESETS.map((preset, idx) => (
                              <option key={idx} value={idx}>
                                 {preset.name} - {preset.calories} سعرة
                              </option>
                           ))}
                        </select>

                        <button
                          type="button"
                          onClick={async () => {
                             const preset = DIET_DRINK_PRESETS[selectedDietPresetIndex];
                             await handleQuickAddDrink({
                                name: preset.name,
                                calories: preset.calories,
                                protein: preset.protein,
                                carbs: preset.carbs,
                                fats: preset.fats
                             });
                          }}
                          className="px-3.5 py-2 bg-[#E07A5F] hover:bg-[#c96c53] text-white font-black text-xs rounded-xl active:scale-95 transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                           <Plus className="w-3.5 h-3.5" />
                           <span>أضف الآن</span>
                        </button>
                     </div>
                  ) : (
                     <div className="flex gap-2 flex-col">
                        <input 
                          type="text" 
                          placeholder="اسم مشروبك الخاص (مثال: قهوة بندق، عصير مانجو، قرفة بالحليب)"
                          value={customDietDrinkName}
                          onChange={(e) => setCustomDietDrinkName(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-gray-50 dark:bg-[#1D1D1D] border border-gray-150/50 dark:border-white/5 rounded-xl outline-none focus:border-[#E07A5F] text-right text-gray-800 dark:text-white font-bold"
                        />
                        <div className="flex gap-2 flex-row-reverse">
                           <input 
                             type="number" 
                             placeholder="السعرات" 
                             value={customDietDrinkCalories}
                             onChange={(e) => setCustomDietDrinkCalories(e.target.value)}
                             className="w-24 text-xs px-2 py-2 bg-gray-50 dark:bg-[#1D1D1D] border border-gray-150/50 dark:border-white/5 rounded-xl outline-none focus:border-[#E07A5F] text-center text-gray-800 dark:text-white font-black"
                           />
                           <button
                             type="button"
                             disabled={!customDietDrinkName.trim()}
                             onClick={async () => {
                                await handleQuickAddDrink({
                                   name: customDietDrinkName.trim() + " ☕",
                                   calories: Number(customDietDrinkCalories) || 0,
                                   protein: 0,
                                   carbs: 0,
                                   fats: 0
                                });
                                setCustomDietDrinkName('');
                                setCustomDietDrinkCalories('');
                             }}
                             className="px-4 py-2 bg-[#E07A5F] hover:bg-[#c96c53] disabled:opacity-50 text-white text-xs font-black rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1 flex-1 cursor-pointer"
                           >
                              <Plus className="w-3.5 h-3.5" />
                              <span>أضف المشروب الخاص</span>
                           </button>
                        </div>
                     </div>
                  )}

                  {/* Quick caloric multiplier / size override for diet tracker */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-row-reverse mt-1.5 text-right w-full" dir="rtl">
                     <span className="text-[9px] text-[#A5A5A5] font-black shrink-0">أو غيّر حجم التقديم وسجل السعرات:</span>
                     {[
                       { name: 'فنجان ☕', multiplier: 0.5 },
                       { name: 'كوب وسط 🍵', multiplier: 1.0 },
                       { name: 'مج كبير 🥤', multiplier: 1.5 },
                       { name: 'زجاجة عائلية 🫙', multiplier: 2.0 }
                     ].map((sz) => (
                        <button
                          type="button"
                          key={sz.name}
                          onClick={async () => {
                             let drinkName = showDietCustomInputs ? (customDietDrinkName.trim() || 'مشروب مخصص') : DIET_DRINK_PRESETS[selectedDietPresetIndex].name;
                             let rawCalories = showDietCustomInputs ? Number(customDietDrinkCalories) : DIET_DRINK_PRESETS[selectedDietPresetIndex].calories;
                             let computedCals = Math.round(rawCalories * sz.multiplier);
                             
                             let p = showDietCustomInputs ? 0 : DIET_DRINK_PRESETS[selectedDietPresetIndex].protein;
                             let c = showDietCustomInputs ? 0 : DIET_DRINK_PRESETS[selectedDietPresetIndex].carbs;
                             let f = showDietCustomInputs ? 0 : DIET_DRINK_PRESETS[selectedDietPresetIndex].fats;

                             await handleQuickAddDrink({
                                name: `${drinkName} (${sz.name})`,
                                calories: computedCals,
                                protein: Math.round(p * sz.multiplier * 10) / 10,
                                carbs: Math.round(c * sz.multiplier * 10) / 10,
                                fats: Math.round(f * sz.multiplier * 10) / 10
                             });
                          }}
                          className="px-2.5 py-1 bg-gray-50 hover:bg-[#E07A5F]/10 dark:bg-white/5 dark:hover:bg-white/10 active:scale-95 border border-transparent hover:border-[#E07A5F]/20 text-gray-700 dark:text-gray-300 rounded-lg text-[9px] font-black transition-all shrink-0 cursor-pointer"
                        >
                           {sz.name} (x{sz.multiplier})
                        </button>
                     ))}
                  </div>
               </div>

               {/* +++ أضيف بناءً على طلبك - محلل حالة الإنسولين والغدد ومعدل حرق الدهون +++ */}
               <div className={cn("rounded-[24px] p-5 border text-right shadow-sm", insulinStatus.color)}>
                  <div className="flex items-center gap-2 flex-row-reverse mb-2">
                     <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                     <h4 className="font-extrabold text-xs text-gray-800 dark:text-white font-sans">مؤشر الإنسولين ومسار حرق الدهون 🧬🧪</h4>
                  </div>
                  <div className="flex justify-between items-center flex-row-reverse mb-3">
                     <span className="text-xs font-black">{insulinStatus.level}</span>
                     <span className="text-[9px] font-bold text-gray-400">تحليل هرموني استرشادي دقيق</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-bold font-sans">
                     {insulinStatus.title}: <span className="font-normal text-gray-500 dark:text-gray-400">{insulinStatus.desc}</span>
                  </p>
                  
                  {/* Visual insulin slider gauge */}
                  <div className="mt-3.5 h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden relative">
                     <div 
                        className={cn("h-full rounded-full transition-all duration-1000", 
                           totals.carbs >= 170 ? "bg-rose-500" : totals.carbs < 60 ? "bg-emerald-500" : "bg-green-500"
                        )} 
                        style={{ width: `${Math.min((totals.carbs / 220) * 100, 100)}%` }} 
                     />
                  </div>
                  <div className="flex justify-between px-1 mt-1 text-[9px] text-gray-400 flex-row-reverse">
                     <span>إنسولين نشط (تخزين دهون)</span>
                     <span>توازن صحي (حرق معتدل)</span>
                     <span>صيام كيتوني (حرق أقصى)</span>
                  </div>
               </div>

               {/* Meal Categories & Logs */}
               <div className="space-y-4">
                  {categories.map((cat) => {
                     const catMeals = meals.filter(m => m.category === cat.name);
                     const catCals = catMeals.reduce((s, m) => s + m.calories, 0);

                     if (catMeals.length === 0) return null;

                     return (
                       <div key={cat.name} className={cn("rounded-[24px] p-4 shadow-sm transition-all border",
                          isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5"
                       )}>
                          <div className="flex justify-between items-center flex-row-reverse text-right pb-2">
                              <div className="flex items-center gap-3 flex-row-reverse">
                                 <div className={cn("w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0", cat.bg, cat.color)}>
                                    <cat.icon className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <h4 className="font-bold text-sm mb-0.5">{cat.name}</h4>
                                    <p className="text-[10px] font-bold text-gray-500">{catCals} كالوري</p>
                                 </div>
                              </div>
                          </div>
                          
                          <div className="space-y-2 pt-2 border-t border-[#F0EBE1] dark:border-white/5">
                             {catMeals.map(m => (
                               <div key={`${m.id}-${m.timestamp}`} className="flex justify-between items-center text-xs flex-row-reverse text-right bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                                  <div className="flex items-center gap-3 flex-row-reverse">
                                     <div className="w-10 h-10 bg-gray-200 dark:bg-white/10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-gray-400">
                                        <Utensils className="w-4 h-4" />
                                     </div>
                                     <div>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 block mb-1">{m.name}</span>
                                        <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">P:{m.protein} • C:{m.carbs} • F:{m.fats}</span>
                                     </div>
                                  </div>
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{m.calories} kcal</span>
                                    <button onClick={() => deleteMeal(m.id)} className="text-[10px] font-bold text-rose-400 hover:text-rose-600 cursor-pointer">حذف</button>
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                     );
                  })}
               </div>

               {/* AI Diet Coach Widget */}
               <div className={cn("p-5 rounded-3xl border text-right transition-all my-2",
                  isFastingMode ? "bg-[#25201C] border-[#3D3834]" : "bg-white dark:bg-[#121415] border-[#F0EBE1] dark:border-white/5"
               )}>
                  <div className="flex items-center gap-3 flex-row-reverse mb-3">
                     <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/15">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                     </div>
                     <div className="flex-1">
                        <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 flex-row-reverse">
                           <span>صديقك وصانع دايت الـ AI 💬</span>
                        </h3>
                        <span className="text-[10px] text-gray-400 font-bold block">مستشار الغذاء والوزن - بدون لوم أو ضغط</span>
                     </div>
                  </div>

                  {/* Conversation log display */}
                  <div className="h-56 overflow-y-auto bg-[#FBF9F5] dark:bg-black/15 rounded-2xl p-4 mb-4 space-y-3 shrink-0 scrollbar-none flex flex-col gap-2">
                     {chatHistory.map((h, i) => (
                        <div key={i} className={cn("max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-semibold self-end text-right",
                          h.role === 'user' 
                            ? (isFastingMode ? "bg-amber-500/20 text-amber-200 self-start text-left ml-auto mr-0 rounded-tr-none" : "bg-primary/10 text-primary-dark self-start text-left ml-auto mr-0 rounded-tr-none")
                            : "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 shadow-sm mr-auto ml-0 rounded-tl-none"
                        )}>
                           {h.text}
                        </div>
                     ))}
                     {isTyping && (
                        <div className="bg-white dark:bg-white/5 rounded-2xl p-3 text-xs text-gray-450 mr-auto ml-0 rounded-tl-none flex items-center gap-1 font-bold">
                           <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                           <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                           <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                           <span>الكوتش يفكر...</span>
                        </div>
                     )}
                  </div>

                  {/* Predefined prompt suggestion chips */}
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none flex-row-reverse">
                     {[
                        "عكيت في البشاميل، أتصرف إزاي؟ 🍝",
                        "بديل صحي للكشري المصري؟ 🍲",
                        "ازاي أمنع الجوع بالليل؟ 🌙",
                        "عايز أكلة خفيفة ترفع الحرق 🔥"
                     ].map((sug, idx) => (
                        <button 
                           key={idx}
                           type="button"
                           onClick={() => handleSendCoachMessage(sug)}
                           className="shrink-0 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 text-[10px] font-bold border border-transparent hover:border-gray-200 dark:hover:border-white/10 cursor-pointer"
                           dir="rtl"
                        >
                           {sug}
                        </button>
                     ))}
                  </div>

                  {/* Input bar */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSendCoachMessage(coachInput); }} className="relative flex items-center">
                     <input 
                        type="text"
                        value={coachInput}
                        onChange={(e) => setCoachInput(e.target.value)}
                        placeholder="اسأل الكوتش عن أكله، بديل صحي، أو نصيحة..."
                        className="w-full h-12 pr-4 pl-12 bg-[#F3F6F9] dark:bg-white/5 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary text-right animate-none"
                        dir="rtl"
                     />
                     <button 
                        type="submit"
                        disabled={!coachInput.trim() || isTyping}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-[#1A4D42] dark:bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md active:scale-95 disabled:scale-100 disabled:opacity-40 transition-all cursor-pointer"
                     >
                        <Send className="w-4 h-4 transform rotate-180 text-white" />
                     </button>
                  </form>
               </div>

               {/* +++ كاشف العك واللخبطة التلقائي للأكل والمشروبات +++ */}
               {(meals.length > 0 || waterLogs.length > 0) && (
                  <div className={cn("p-5 rounded-3xl border text-right transition-all my-4 shadow-sm relative overflow-hidden", cheatAnalysis.statusColor)}>
                     <div className="flex items-center justify-between flex-row-reverse mb-3">
                        <div className="flex items-center gap-2 flex-row-reverse">
                           <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-black text-sm shrink-0">
                              {cheatAnalysis.score}%
                           </div>
                           <div>
                              <h4 className="font-extrabold text-xs text-gray-900 dark:text-white">كاشف اللخبطة واللغوصة التلقائي 🚨</h4>
                              <span className="text-[9px] text-gray-400 font-bold block">ذكاء اصطناعي يحلل وجباتك ومشروباتك فوراً</span>
                           </div>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/20 shadow-sm">{cheatAnalysis.status}</span>
                     </div>
                     
                     {/* Progress bar */}
                     <div className="w-full h-1.5 bg-gray-200/50 dark:bg-black/30 rounded-full overflow-hidden mb-3">
                        <div 
                           className={cn("h-full rounded-full transition-all duration-500", 
                              cheatAnalysis.score < 20 ? "bg-emerald-500" : cheatAnalysis.score < 60 ? "bg-amber-500" : "bg-rose-500"
                           )}
                           style={{ width: `${cheatAnalysis.score}%` }}
                        />
                     </div>
                     
                     <p className="text-xs font-semibold leading-relaxed text-gray-800 dark:text-gray-100">
                        {cheatAnalysis.advice}
                     </p>

                     {/* Action Trigger inside advice widget */}
                     <div className="mt-3 flex gap-2 justify-between items-center">
                        <button 
                           type="button"
                           onClick={() => handleSendCoachMessage(`أنا أكلت ولخبطت الدايت وعايز خطة طوارئ وتعديل مسار`)}
                           className="px-3 py-1.5 rounded-xl bg-[#1A4D42] hover:bg-[#1A4D42]/90 dark:bg-[#10B981] dark:hover:bg-[#10B981]/90 text-white text-[10px] font-black transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                           خطة الطوارئ وتعديل المسار 🎯
                        </button>
                        {cheatAnalysis.loggedCheats.length > 0 && (
                           <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold">
                              أصناف ملخبطة مسببة: {cheatAnalysis.loggedCheats.length} 🍽️
                           </span>
                        )}
                     </div>
                  </div>
               )}
            </motion.div>
         )}
      </div>

      {/* Main Floating Action Button for Adding Meal */}
      <div className="fixed bottom-28 left-0 right-0 flex justify-center gap-2 px-4 z-40 pointer-events-none">
          <button 
             onClick={() => setIsKitchenOpen(true)}
             className={cn("pointer-events-auto h-16 px-5 rounded-full shadow-2xl active:scale-95 transition-all text-white font-black flex items-center gap-1.5 border-4 outline outline-4 outline-transparent cursor-pointer",
                isFastingMode ? "bg-amber-600 shadow-amber-950/30 border-[#1A1A1A]" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30 border-[#FDFBF7] dark:border-[#1A1A1A]"
             )}
          >
             <ChefHat className="w-4 h-4 text-white" />
             <span className="text-xs">المطبخ الذكي 🍳</span>
          </button>
          <button 
             onClick={() => { setSelectedCategory(categories[0].name); setIsAddingMode(true); }}
             className={cn("pointer-events-auto h-16 px-8 rounded-full shadow-2xl active:scale-95 transition-all text-white font-bold flex items-center gap-3 border-4 outline outline-4 outline-transparent",
                isFastingMode ? "bg-[#D4A373] shadow-amber-900/30 border-[#1A1A1A]" : "bg-[#E07A5F] hover:bg-[#c96c53] shadow-orange-500/30 border-[#FDFBF7] dark:border-[#1A1A1A]"
             )}
          >
             <Plus className="w-6 h-6" strokeWidth={3} />
             <span>أضف وجبة</span>
             <Camera className="w-5 h-5 ml-2 opacity-70" />
          </button>
      </div>

      {/* Add Meal Bottom Sheet */}
      <AnimatePresence>
        {isAddingMode && (
           <>
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                onClick={() => setIsAddingMode(false)}
             />
             <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] z-50 rounded-t-[32px] p-6 text-right pb-10 shadow-2xl"
                dir="rtl"
             >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
                
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold">تسجيل وجبة جديدة</h2>
                   <button className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                   </button>
                </div>

                {/* +++ أضيفت بناءً على طلبك - إتاحة اختيار الوجبات والمشروبات المثبتة كأزرار سريعة داخل الشيت +++ */}
                {(pinnedDietConfig || pinnedWaterConfig) && (
                   <div className="mb-6 p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300/30 rounded-3xl text-right">
                      <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 mb-2.5 flex items-center justify-between flex-row-reverse">
                         <span className="flex items-center gap-1 flex-row-reverse border-b border-amber-500/10 pb-0.5">⭐ أزرارك السريعة المثبتة:</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                         {pinnedDietConfig && (
                            <button
                               type="button"
                               onClick={async () => {
                                  await handleLogMealFromModal(
                                     pinnedDietConfig.displayName,
                                     selectedCategory || 'وجبة خفيفة',
                                     pinnedDietConfig.totalCalories,
                                     pinnedDietConfig.totalCarbs,
                                     pinnedDietConfig.totalProtein,
                                     pinnedDietConfig.totalFats
                                  );
                                  setIsAddingMode(false);
                               }}
                               className="w-full min-h-12 bg-gradient-to-r from-amber-500 to-emerald-500 text-white rounded-2xl p-3 flex items-center justify-between gap-2 active:scale-95 transition-all text-right shadow-sm border border-amber-200/20 cursor-pointer text-right flex-row-reverse"
                            >
                               <div className="flex items-center gap-2 flex-row-reverse">
                                  <Utensils className="w-4 h-4 text-amber-100 shrink-0" />
                                  <div className="text-right">
                                     <p className="text-[9px] font-black text-amber-100/90 leading-none mb-0.5">وجبة سريعة مثبتة 📌</p>
                                     <p className="text-xs font-black leading-tight truncate max-w-[140px] text-right">{pinnedDietConfig.beverageName}</p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg shrink-0">
                                   +{pinnedDietConfig.totalCalories} سعرة
                                </span>
                            </button>
                         )}
                         {pinnedWaterConfig && (
                            <button
                               type="button"
                               onClick={async () => {
                                  await handleLogMealFromModal(
                                     pinnedWaterConfig.displayName,
                                     'مشروبات',
                                     pinnedWaterConfig.totalCalories,
                                     0, // carbs placeholder
                                     0, // protein placeholder
                                     0  // fats placeholder
                                  );
                                  
                                  // Also log to local water storage so it is captured in water tracker
                                  if (user && user.uid === 'local_guest_user') {
                                     const savedWater = localStorage.getItem('local_water_logs');
                                     const waterList = savedWater ? JSON.parse(savedWater) : [];
                                     waterList.push({
                                       id: `local_water_${Date.now()}`,
                                       amount: pinnedWaterConfig.ml,
                                       effectiveAmount: pinnedWaterConfig.effectiveHydration,
                                       context: 'سر سريع مثبت للارتواء',
                                       beverageType: pinnedWaterConfig.beverageName,
                                       timestamp: Date.now()
                                     });
                                     localStorage.setItem('local_water_logs', JSON.stringify(waterList));
                                     window.dispatchEvent(new Event('localWaterUpdated'));
                                  } else if (user) {
                                     await addDoc(collection(db, 'users', user.uid, 'waterLogs'), {
                                       amount: pinnedWaterConfig.ml,
                                       effectiveAmount: pinnedWaterConfig.effectiveHydration,
                                       context: 'سر سريع مثبت للارتواء',
                                       beverageType: pinnedWaterConfig.beverageName,
                                       timestamp: Date.now()
                                     });
                                  }
                                  
                                  setIsAddingMode(false);
                               }}
                               className="w-full min-h-12 bg-gradient-to-r from-sky-500 to-amber-550 text-white rounded-2xl p-3 flex items-center justify-between gap-2 active:scale-95 transition-all text-right shadow-sm border border-sky-200/20 cursor-pointer text-right flex-row-reverse"
                            >
                               <div className="flex items-center gap-2 flex-row-reverse">
                                  <Coffee className="w-4 h-4 text-sky-100 shrink-0" />
                                  <div className="text-right">
                                     <p className="text-[9px] font-black text-sky-100/90 leading-none mb-0.5">مشروب سريع مثبت 📌</p>
                                     <p className="text-xs font-black leading-tight truncate max-w-[140px] text-right">{pinnedWaterConfig.beverageName}</p>
                                  </div>
                               </div>
                               <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg shrink-0">
                                  +{pinnedWaterConfig.ml} مل
                                </span>
                            </button>
                         )}
                      </div>
                   </div>
                )}

                <div className="mb-6">
                   <label className="text-xs font-bold text-gray-500 block mb-2">نوع الوجبة</label>
                   <div className="flex gap-2">
                       {categories.map(c => (
                          <button key={c.name} onClick={() => setSelectedCategory(c.name)} className={cn("px-4 py-2 text-xs font-bold rounded-xl transition-colors border flex-1",
                             selectedCategory === c.name ? "bg-emerald-500 text-white border-emerald-500" : "bg-gray-50 border-gray-100 text-gray-500 dark:bg-white/5 dark:border-white/10"
                          )}>
                             {c.name}
                          </button>
                       ))}
                   </div>
                </div>

                {/* +++ أضيف بناءً على طلبك - البحث المصنف والفلترة بالحروف لتسهيل جلب الأطعمة +++ */}
                <div className="mb-6 bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5">
                   <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center justify-between flex-row-reverse">
                      <span>ابحث في الأصناف المصنفة 🔍</span>
                      <span className="text-[10px] text-emerald-500 font-extrabold">سهولة الفلترة والاختيار</span>
                   </h3>

                   {/* أزرار الفلترة حسب التصنيف */}
                   <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide flex-row-reverse" dir="rtl">
                      {[
                         { id: 'all', label: 'الكل 🍽️' },
                         { id: 'drink', label: 'مشروبات ☕️🥛' },
                         { id: 'bread', label: 'الخبز والنشويات 🍞' },
                         { id: 'fruit', label: 'فواكه 🍏' },
                         { id: 'vegetable', label: 'خضروات 🥦' },
                         { id: 'meal', label: 'وجبات وأغذية 🍲' }
                      ].map(tab => (
                         <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                               setActiveFoodClassification(tab.id as any);
                               if (tab.id === 'drink') {
                                  setSelectedCategory('مشروبات');
                               }
                            }}
                            className={cn("px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all shrink-0 border whitespace-nowrap",
                               activeFoodClassification === tab.id 
                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10" 
                                  : "bg-white dark:bg-[#121415] border-gray-150/40 dark:border-white/5 text-gray-400 dark:text-gray-305 hover:bg-gray-100"
                            )}
                         >
                            {tab.label}
                         </button>
                      ))}
                   </div>

                   <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                         type="text"
                         value={searchFood}
                         onChange={(e) => setSearchFood(e.target.value)}
                         placeholder="مثال: تفاح، خس، أومليت، عيش بلدي..."
                         className="w-full text-right h-12 pr-10 pl-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                      />
                   </div>
                   
                   {/* القائمة الطويلة المفلترة آلياً حسب الحروف والتصنيف لسهولة الفلترة والاختيار */}
                   <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                      {activeFoodClassification === 'drink' ? (
                         (() => {
                            const combinedDrinks = [
                               ...customDrinkPresets.map(d => ({ ...d, isCustom: true, isRecent: false, isStandard: false })),
                               ...recentDrinks.map(d => ({ ...d, isCustom: false, isRecent: true, isStandard: false })),
                               ...DRINK_PRESETS.map(d => ({ ...d, isCustom: false, isRecent: false, isStandard: true }))
                            ];
                            const uniqueDrinks: any[] = [];
                            const namesSeen = new Set();
                            for (const d of combinedDrinks) {
                               if (!namesSeen.has(d.name)) {
                                  namesSeen.add(d.name);
                                  uniqueDrinks.push(d);
                               }
                            }
                            const filteredDrinks = uniqueDrinks.filter(d => 
                               !searchFood || d.name.includes(searchFood) || d.name.toLowerCase().includes(searchFood.toLowerCase())
                            );

                            if (filteredDrinks.length === 0) {
                               return <p className="text-gray-400 text-[10px] text-center py-4">لا توجد مشروبات مطابقة لبحثك الحالي.</p>;
                            }

                            return filteredDrinks.map((p, idx) => (
                               <div key={p.name + idx} className="relative group">
                                  <button 
                                     type="button"
                                     onClick={() => handleSelectDrinkPreset(p)}
                                     className="w-full text-right px-3 py-2.5 bg-[#E07A5F]/5 hover:bg-[#E07A5F]/15 dark:bg-[#E07A5F]/10 dark:hover:bg-[#E07A5F]/20 text-gray-755 dark:text-gray-200 rounded-2xl text-xs font-bold border border-[#E07A5F]/10 dark:border-[#E07A5F]/20 flex items-center justify-between transition-all active:scale-98 pr-16"
                                  >
                                     <span className="text-[10px] text-gray-400 font-medium">بروتين: {p.protein}ج • كارب: {p.carbs}ج • دهون: {p.fats}ج</span>
                                     <div className="flex items-center gap-2 flex-row-reverse text-right truncate">
                                        <span className="text-xs truncate block max-w-[150px]">{p.name}</span>
                                        <span className="text-[10px] font-extrabold bg-[#E07A5F]/20 text-[#E07A5F] px-2 py-0.5 rounded-lg shrink-0">{p.calories} سعرة</span>
                                     </div>
                                  </button>
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                     {p.isCustom ? (
                                        <span className="text-[8px] text-[#E07A5F] font-black bg-white dark:bg-[#121415] px-1.5 py-0.5 rounded border border-[#E07A5F]/20">⭐ مفضل</span>
                                     ) : p.isRecent ? (
                                        <span className="text-[8px] text-blue-500 font-black bg-white dark:bg-[#121415] px-1.5 py-0.5 rounded border border-blue-100">🕒 سابق</span>
                                     ) : (
                                        <span className="text-[8px] text-gray-400 font-black bg-white dark:bg-[#121415] px-1.5 py-0.5 rounded border border-gray-150">💡 أساسي</span>
                                     )}
                                  </div>
                               </div>
                            ));
                         })()
                      ) : (
                         COMMON_FOODS.filter(f => {
                            const matchesSearch = searchFood ? f.name.includes(searchFood) || f.name.toLowerCase().includes(searchFood.toLowerCase()) : true;
                            const matchesTab = activeFoodClassification === 'all' 
                               ? true 
                               : activeFoodClassification === 'bread'
                                  ? (f.name.includes('خبز') || f.name.includes('عيش') || f.name.includes('توست') || f.name.includes('رغيف') || f.name.includes('فينو') || f.name.includes('كيزر') || f.name.includes('صاج') || f.name.includes('شامي') || f.name.includes('سوري'))
                                  : f.type === activeFoodClassification;
                            return matchesSearch && matchesTab;
                         }).length === 0 ? (
                            <p className="text-gray-400 text-[10px] text-center py-4">لا توجد نتائج مطابقة لتصنيفك أو لبحثك الحالي.</p>
                         ) : (
                            COMMON_FOODS.filter(f => {
                               const matchesSearch = searchFood ? f.name.includes(searchFood) || f.name.toLowerCase().includes(searchFood.toLowerCase()) : true;
                               const matchesTab = activeFoodClassification === 'all' 
                                  ? true 
                                  : activeFoodClassification === 'bread'
                                     ? (f.name.includes('خبز') || f.name.includes('عيش') || f.name.includes('توست') || f.name.includes('رغيف') || f.name.includes('فينو') || f.name.includes('كيزر') || f.name.includes('صاج') || f.name.includes('شامي') || f.name.includes('سوري'))
                                     : f.type === activeFoodClassification;
                               return matchesSearch && matchesTab;
                            }).map(food => (
                               <button 
                                  key={food.name}
                                  type="button"
                                  onClick={() => selectPredefinedFood(food)}
                                  className="w-full text-right px-3 py-2.5 bg-white hover:bg-emerald-50/50 dark:bg-[#121415] dark:hover:bg-emerald-950/20 text-gray-755 dark:text-gray-200 rounded-2xl text-xs font-bold border border-gray-150/40 dark:border-white/5 flex items-center justify-between transition-all active:scale-98"
                               >
                                  <span className="text-[10px] text-gray-400 font-medium">بروتين: {food.protein}ج • كارب: {food.carbs}ج • دهون: {food.fats}ج</span>
                                  <div className="flex items-center gap-2 flex-row-reverse text-right">
                                     <span className="text-xs">{food.name}</span>
                                     <span className="text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg shrink-0">{food.calories} سعرة</span>
                                  </div>
                               </button>
                            ))
                         )
                      )}
                   </div>
                </div>

                <div className="space-y-4">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-2">
                       {selectedBaseFood && (
                          <motion.div 
                             initial={{ opacity: 0, y: -10 }}
                             animate={{ opacity: 1, y: 0 }}
                             className="my-3 p-4 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 text-right"
                          >
                             <div className="flex justify-between items-center flex-row-reverse mb-3">
                                <h4 className="font-extrabold text-xs text-emerald-800 dark:text-emerald-400">ضبط حجم والكمية للحصة الغذائية ⚖️</h4>
                                <button 
                                   type="button" 
                                   onClick={() => {
                                      setSelectedBaseFood(null);
                                      setPortionQty('1');
                                      setPortionUnit('piece');
                                   }}
                                   className="text-[10px] font-bold text-gray-400 hover:text-gray-650 dark:hover:text-white"
                                >
                                   مسح التحديد ❌
                                </button>
                             </div>
                             
                             <div className="flex gap-3 flex-row-reverse">
                                <div className="flex-1">
                                   <label className="text-[10px] text-gray-400 block mb-1">وحدة القياس / المعيار</label>
                                   <select 
                                      value={portionUnit} 
                                      onChange={(e) => setPortionUnit(e.target.value)}
                                      className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold text-gray-800 dark:text-white text-right"
                                   >
                                      <option value="piece">قطعة / حبة / رغيف / سلايس 🍕</option>
                                      <option value="plate">طبق كامل (٢.٥ الحصة) 🍲</option>
                                      <option value="spoon">معلقة كبيرة (٠.١٢ الحصة) 🥄</option>
                                      <option value="cup">كوب / مج المشروبات 🥛</option>
                                      <option value="gram">جرامات (نسبة لـ ١٠٠ جرام) ⚖️</option>
                                   </select>
                                </div>
                                <div className="w-24">
                                   <label className="text-[10px] text-gray-400 block mb-1">الكمية</label>
                                   <input 
                                      type="number" 
                                      step="any"
                                      value={portionQty} 
                                      onChange={(e) => setPortionQty(e.target.value)}
                                      placeholder="مثال: ١.٥"
                                      className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold text-center text-gray-800 dark:text-white"
                                   />
                                </div>
                             </div>

                             <div className="mt-3 text-[10px] text-gray-400 font-bold flex justify-between items-center flex-row-reverse">
                                <span>ضربنا الحسابات تلقائياً بالنسبة لـ {portionQty} {portionUnit === 'piece' ? 'قطعة' : portionUnit === 'plate' ? 'طبق' : portionUnit === 'spoon' ? 'معلقة' : portionUnit === 'cup' ? 'كوب' : 'جرام'}.</span>
                                <span className="text-emerald-600 dark:text-emerald-400 underline">لتسجيل مخصص، عدّل الخانات بالأسفل مباشرة</span>
                             </div>
                          </motion.div>
                       )}
                       الاسم السريع أو الوصف</label>
                      <div className="flex gap-2">
                          <input 
                             type="text" 
                             value={mealName} 
                             onChange={(e) => setMealName(e.target.value)} 
                             placeholder="مثال: دجاج مشوي وأرز بني"
                             className="flex-1 h-12 px-3 bg-gray-55 dark:bg-white/10 border-none rounded-[16px] text-[11px] md:text-sm font-bold text-right" 
                          />
                          <button 
                             type="button"
                             onClick={() => setIsDietCreatorOpen(true)}
                             className="px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs rounded-2xl flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                          >
                             <span>صانع وجبات المطبخ 🍳</span>
                          </button>
                          <button 
                             type="button"
                             onClick={handleEstimateCalories}
                             disabled={isEstimating || !mealName.trim()}
                             className="px-4 bg-[#E07A5F]/15 hover:bg-[#E07A5F]/25 text-[#E07A5F] font-black text-xs rounded-2xl flex items-center gap-1 transition-all disabled:opacity-45 shrink-0 cursor-pointer"
                          >
                             <Sparkles className="w-3.5 h-3.5 text-[#E07A5F]" />
                             {isEstimating ? "جاري التقدير..." : "تقدير بالـ AI ✨"}
                          </button>
                       </div>
                   </div>

                    {/* +++ أضيف بناءً على طلبك - خلاط وتعديل وإضافات المشروبات الساخنة والباردة والتحلية لسهولة التسجيل التلقائي الدقيق +++ */}
                    <div className="mt-2 mb-4">
                       <div 
                          onClick={() => setShowDrinkMixer(!showDrinkMixer)}
                          className={cn(
                             "flex items-center justify-between flex-row-reverse p-3.5 rounded-2xl cursor-pointer transition-all border",
                             isProbablyDrink 
                                ? "bg-amber-550/10 dark:bg-amber-955/20 border-amber-300 dark:border-amber-900/40 text-amber-900 dark:text-amber-300" 
                                : "bg-gray-55/65 dark:bg-white/5 border-transparent hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                       >
                          <div className="flex items-center gap-3 flex-row-reverse text-right">
                             <span className="text-xl shrink-0">☕️🥛</span>
                             <div>
                                <span className="font-extrabold text-[11px] block">خلاط وإضافات المشروبات والتحلية الذكية 🪄</span>
                                <span className="text-[9px] text-gray-450 dark:text-gray-400 font-medium block">اضبط الحليب والقهوة والشاي بإضافات دقيقة محسوبة غرامياً وسعرياً تلقائياً!</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                             {isProbablyDrink && (
                                <span className="animate-pulse bg-emerald-500 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full shrink-0">مشروب مكتشف 🥤</span>
                             )}
                             <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform shrink-0", showDrinkMixer && "rotate-180")} />
                          </div>
                       </div>

                       <AnimatePresence>
                          {showDrinkMixer && (
                             <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden mt-3 space-y-4"
                             >
                                {/* تركيبات ومشروبات جاهزة وسريعة */}
                                <div className="bg-emerald-500/5 dark:bg-emerald-950/10 p-3.5 rounded-2xl border border-emerald-500/10 space-y-2">
                                   <h4 className="text-[10px] font-black text-emerald-650 dark:text-emerald-400 text-right">🚀 سريعة وتلقائية: اختر تركيبة مشروب جاهز بلمسة واحدة</h4>
                                   <div className="grid grid-cols-2 gap-2 flex-row-reverse" dir="rtl">
                                      {DRINK_PRESETS.map((p) => {
                                         const isSelectedCombo = mealName.includes(p.name.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F30B}-\u{1F320}\u{1F330}-\u{1F35A}\u{1F35C}-\u{1F393}\u{1F3A0}-\u{1F3C4}\u{1F3C6}-\u{1F3CA}\u{1F3E0}-\u{1F3F0}]/gu, '').trim());
                                         return (
                                            <button
                                               key={p.name}
                                               type="button"
                                               onClick={() => handleSelectDrinkPreset(p)}
                                               className={cn(
                                                  "text-right p-2.5 rounded-xl border text-[10px] font-bold flex flex-col gap-0.5 transition-all text-gray-755 dark:text-gray-300",
                                                  isSelectedCombo 
                                                     ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" 
                                                     : "bg-white dark:bg-[#121415] border-gray-150/40 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                                               )}
                                            >
                                               <span className="truncate">{p.name}</span>
                                               <span className={cn("text-[9px] font-mono", isSelectedCombo ? "text-emerald-100" : "text-emerald-500 dark:text-emerald-450")}>{p.calories} سعرة</span>
                                            </button>
                                         );
                                      })}
                                   </div>
                                </div>

                                {/* مشروبات مفضلة ومخصصة للعميل */}
                                {(customDrinkPresets.length > 0 || recentDrinks.length > 0) && (
                                   <div className="bg-[#E07A5F]/5 p-3.5 rounded-2xl border border-[#E07A5F]/10 space-y-3">
                                      {customDrinkPresets.length > 0 && (
                                         <div className="space-y-1.5">
                                            <h4 className="text-[10px] font-black text-[#E07A5F] text-right">⭐ مشروباتي المحفوظة والمفضلة</h4>
                                            <div className="grid grid-cols-2 gap-2 flex-row-reverse" dir="rtl">
                                               {customDrinkPresets.map((p) => {
                                                  const isSelectedCombo = mealName.includes(p.name.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F30B}-\u{1F320}\u{1F330}-\u{1F35A}\u{1F35C}-\u{1F393}\u{1F3A0}-\u{1F3C4}\u{1F3C6}-\u{1F3CA}\u{1F3E0}-\u{1F3F0}]/gu, '').trim());
                                                  return (
                                                     <div key={p.name} className="relative group">
                                                        <button
                                                           type="button"
                                                           onClick={() => handleSelectDrinkPreset(p)}
                                                           className={cn(
                                                              "w-full text-right p-2.5 rounded-xl border text-[10px] font-bold flex flex-col gap-0.5 transition-all text-gray-755 dark:text-gray-300 pr-5 truncate",
                                                              isSelectedCombo 
                                                                 ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-sm" 
                                                                 : "bg-white dark:bg-[#121415] border-gray-150/40 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                                                           )}
                                                        >
                                                           <span className="truncate block pr-2">{p.name}</span>
                                                           <span className={cn("text-[8px] font-mono", isSelectedCombo ? "text-orange-100" : "text-gray-450")}>{p.calories} سعرة | ك:{p.carbs} ب:{p.protein} د:{p.fats}</span>
                                                        </button>
                                                        <button
                                                           type="button"
                                                           onClick={(e) => { e.stopPropagation(); handleDeleteCustomDrinkPreset(p.name, 'fav'); }}
                                                           className="absolute left-1.5 top-1.5 p-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded text-[8px] text-rose-500 transition-all opacity-70 hover:opacity-100 cursor-pointer z-10"
                                                           title="حذف من المفضلة"
                                                        >
                                                           ✕
                                                        </button>
                                                     </div>
                                                  );
                                               })}
                                            </div>
                                         </div>
                                      )}

                                      {recentDrinks.length > 0 && (
                                         <div className="space-y-1.5">
                                            <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 text-right">🕒 مشروبات شربتها وسجلتها مؤخراً</h4>
                                            <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none flex-row-reverse" dir="rtl">
                                               {recentDrinks.map((p, idx) => {
                                                  const isSelectedCombo = mealName === p.name;
                                                  return (
                                                     <div key={p.name + idx} className="relative shrink-0">
                                                        <button
                                                           type="button"
                                                           onClick={() => handleSelectDrinkPreset(p)}
                                                           className={cn(
                                                              "px-3 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 transition-all text-gray-755 dark:text-gray-300",
                                                              isSelectedCombo 
                                                                 ? "bg-blue-500 text-white border-blue-500 shadow-sm" 
                                                                 : "bg-white dark:bg-[#121415] border-gray-150/40 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                                                           )}
                                                        >
                                                           <span className="truncate max-w-[120px]">{p.name}</span>
                                                           <span className="text-[8px] font-mono bg-blue-500/10 text-blue-500 px-1 rounded">{p.calories}س</span>
                                                        </button>
                                                     </div>
                                                  );
                                               })}
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                )}

                                {/* زر حفظ المزيج الحالي كمشروب مفضل */}
                                {mealName.trim() && (isProbablyDrink || selectedAddons.length > 0) && (
                                   <div className="flex justify-end pt-1">
                                      <button
                                         type="button"
                                         onClick={handleSaveCurrentDrinkAsPreset}
                                         className="px-3.5 py-1.5 bg-[#E07A5F]/10 hover:bg-[#E07A5F]/20 text-[#E07A5F] hover:text-[#E07A5F] font-black text-[10px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border border-[#E07A5F]/25"
                                      >
                                         <span>⭐ حفظ المزيج الحالي لـ "مشروباتي المفضلة"</span>
                                      </button>
                                   </div>
                                )}

                                {/* إضافات خلاط المشروبات */}
                                <div className="space-y-4 pr-1">
                                   <div>
                                      <h4 className="text-[10px] font-extrabold text-gray-500 mb-1.5 text-right">🍬 التحلية السكرية والدايت (مضافة للمغلف/الملعقة)</h4>
                                      <div className="flex gap-1.5 flex-wrap flex-row-reverse justify-start">
                                         {DRINK_ADDONS.filter(a => a.category === 'sweetener').map(a => {
                                            const isSelected = selectedAddons.includes(a.id);
                                            return (
                                               <button
                                                  key={a.id}
                                                  type="button"
                                                  onClick={() => handleToggleAddon(a)}
                                                  className={cn(
                                                     "px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex items-center gap-1.5 flex-row-reverse text-right shrink-0",
                                                     isSelected 
                                                        ? "bg-[#E07A5F] text-white border-[#E07A5F] shadow-md shadow-[#E07A5F]/20" 
                                                        : "bg-white dark:bg-[#121415] border-gray-150/30 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                                                  )}
                                               >
                                                  <span>{a.name}</span>
                                                  {a.calories > 0 && <span className={cn("text-[9px] font-mono font-bold", isSelected ? "text-amber-100" : "text-rose-500 dark:text-rose-450")}>+{a.calories}س</span>}
                                               </button>
                                            );
                                         })}
                                      </div>
                                   </div>

                                   <div>
                                      <h4 className="text-[10px] font-extrabold text-gray-500 mb-1.5 text-right">🥛 الألبان والحليب المضاف (كامل / خفيف / دايت)</h4>
                                      <div className="flex gap-1.5 flex-wrap flex-row-reverse justify-start">
                                         {DRINK_ADDONS.filter(a => a.category === 'milk').map(a => {
                                            const isSelected = selectedAddons.includes(a.id);
                                            return (
                                               <button
                                                  key={a.id}
                                                  type="button"
                                                  onClick={() => handleToggleAddon(a)}
                                                  className={cn(
                                                     "px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex items-center gap-1.5 flex-row-reverse text-right shrink-0",
                                                     isSelected 
                                                        ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20" 
                                                        : "bg-white dark:bg-[#121415] border-gray-150/30 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                                                  )}
                                               >
                                                  <span>{a.name}</span>
                                                  <span className={cn("text-[9px] font-mono font-bold", isSelected ? "text-sky-100" : "text-sky-500 dark:text-sky-450")}>+{a.calories}س</span>
                                               </button>
                                            );
                                         })}
                                      </div>
                                   </div>

                                   <div>
                                      <h4 className="text-[10px] font-extrabold text-gray-500 mb-1.5 text-right">🍫 النكهات المعززة والمشّهيات الإضافية</h4>
                                      <div className="flex gap-1.5 flex-wrap flex-row-reverse justify-start">
                                         {DRINK_ADDONS.filter(a => a.category === 'flavour').map(a => {
                                            const isSelected = selectedAddons.includes(a.id);
                                            return (
                                               <button
                                                  key={a.id}
                                                  type="button"
                                                  onClick={() => handleToggleAddon(a)}
                                                  className={cn(
                                                     "px-3 py-2 text-[10px] font-bold rounded-xl border transition-all flex items-center gap-1.5 flex-row-reverse text-right shrink-0",
                                                     isSelected 
                                                        ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20" 
                                                        : "bg-white dark:bg-[#121415] border-gray-150/30 dark:border-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-50"
                                                  )}
                                               >
                                                  <span>{a.name}</span>
                                                  <span className={cn("text-[9px] font-mono font-bold", isSelected ? "text-amber-100" : "text-amber-600 dark:text-amber-400")}>+{a.calories}س</span>
                                               </button>
                                            );
                                         })}
                                      </div>
                                   </div>
                                </div>
                                
                                {selectedAddons.length > 0 && (
                                   <div className="bg-amber-500/5 dark:bg-amber-950/10 p-2.5 rounded-xl text-center text-[10px] text-amber-600 dark:text-amber-400 font-extrabold border border-amber-500/10">
                                      ⭐ مدمج حالياً: {selectedAddons.length} إضافات تحتسب تلقائياً من الماكروز الإجمالية واسم الوجبة.
                                   </div>
                                )}
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">السعرات (كالوري)</label>
                         <input type="number" value={calories} onChange={(e) => { setSelectedBaseFood(null); setCalories(e.target.value); }} className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-emerald-600" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">بروتين (جم)</label>
                         <input type="number" value={protein} onChange={(e) => { setSelectedBaseFood(null); setProtein(e.target.value); }} className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-[#E07A5F]" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">كاربوهيدرات (جم)</label>
                         <input type="number" value={carbs} onChange={(e) => { setSelectedBaseFood(null); setCarbs(e.target.value); }} className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-[#D4A373]" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">دهون (جم)</label>
                         <input type="number" value={fats} onChange={(e) => { setSelectedBaseFood(null); setFats(e.target.value); }} className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold" />
                      </div>
                   </div>
                </div>

                {/* +++ أضيف بناءً على طلبك - إضافة مشروب مرافق للوجبة ليحتسب من السوائل اليومية +++ */}
                <div className="mt-6 border-t border-gray-150/40 dark:border-white/5 pt-4">
                   <div className="flex items-center justify-between flex-row-reverse mb-3 bg-sky-50/50 dark:bg-sky-950/20 p-3.5 rounded-2xl border border-sky-100 dark:border-sky-950/30">
                      <div className="flex items-center gap-2 flex-row-reverse text-right">
                         <Droplet className={cn("w-5 h-5 text-sky-500", includeBeverage && "animate-bounce")} />
                         <div>
                            <h4 className="font-bold text-xs">إضافة مشروب مرافق للوجبة 🥤</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">سيُحتسب تلقائياً من مشروباتك وسوائل اليوم لتتبع ترطيب جسمك</p>
                         </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                         <input 
                            type="checkbox" 
                            checked={includeBeverage} 
                            onChange={(e) => setIncludeBeverage(e.target.checked)}
                            className="sr-only peer" 
                         />
                         <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-650 peer-checked:bg-emerald-500"></div>
                      </label>
                   </div>

                   <AnimatePresence>
                      {includeBeverage && (
                         <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5"
                         >
                            <div>
                               <label className="text-[10px] font-extrabold text-[#1A4D42] dark:text-emerald-400 block mb-2 text-right">اختر نوع المشروب المرافق</label>
                               <div className="grid grid-cols-3 gap-1.5 flex-row-reverse" dir="rtl">
                                  {[
                                     { name: 'ماء عادي', factor: 1.0 },
                                     { name: 'عصير طبيعي', factor: 0.8 },
                                     { name: 'شاي (بدون سكر)', factor: 0.9 },
                                     { name: 'شاي (بسكر)', factor: 0.7 },
                                     { name: 'قهوة', factor: 0.5 },
                                     { name: 'مشروبات غازية', factor: 0.0 }
                                  ].map(bev => (
                                     <button
                                        key={bev.name}
                                        type="button"
                                        onClick={() => {
                                           setBeverageType(bev.name);
                                           setBeverageFactor(bev.factor);
                                        }}
                                        className={cn("px-2 py-2 text-[10px] font-extrabold rounded-xl border transition-all truncate",
                                           beverageType === bev.name 
                                              ? "bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/10" 
                                              : "bg-white dark:bg-[#121415] border-gray-150/40 dark:border-white/5 text-gray-400 dark:text-gray-300"
                                        )}
                                     >
                                        {bev.name}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div className="flex flex-col justify-end">
                                  <div className="flex gap-1.5 flex-wrap justify-end">
                                     {['150', '250', '350', '500'].map(vol => (
                                        <button
                                           key={vol}
                                           type="button"
                                           onClick={() => setBeverageAmount(vol)}
                                           className={cn("px-2.5 py-1.5 text-[10px] font-mono rounded-lg border",
                                              beverageAmount === vol 
                                                 ? "bg-sky-50/50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 border-sky-300" 
                                                 : "bg-white dark:bg-[#121415] border-gray-150/40 dark:border-white/5 text-gray-500 dark:text-gray-300"
                                           )}
                                        >
                                           {vol} مل
                                        </button>
                                     ))}
                                  </div>
                               </div>
                               <div>
                                  <label className="text-[10px] font-extrabold text-[#1A4D42] dark:text-emerald-400 block mb-2 text-right">الكمية المستهلكة (مل)</label>
                                  <input 
                                     type="number" 
                                     value={beverageAmount} 
                                     onChange={(e) => setBeverageAmount(e.target.value)} 
                                     placeholder="مثال: 250"
                                     className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold text-sky-500 text-center focus:ring-1 focus:ring-sky-500 font-mono"
                                  />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-relaxed text-right border-t border-gray-150/30 dark:border-white/5 pt-2">
                               ℹ️ سيحسب العداد للترطيب <span className="text-sky-500 font-extrabold">{Math.round((Number(beverageAmount) || 250) * beverageFactor)} ml</span> كترطيب حقيقي للجسم بناءً على معامل {beverageType}.
                            </p>
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>

                <button 
                   type="button"
                   onClick={handleAddMeal}
                   disabled={!mealName || !calories}
                   className="w-full h-14 bg-emerald-500 text-white font-bold text-sm rounded-[20px] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 cursor-pointer"
                >
                   <Check className="w-5 h-5" /> حفظ الوجبة
                </button>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      {/* InBody Input Modal */}
      <AnimatePresence>
        {isInBodyModalOpen && (
           <>
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                onClick={() => setIsInBodyModalOpen(false)}
             />
             <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] z-50 rounded-t-[32px] p-6 text-right pb-10 shadow-2xl"
                dir="rtl"
             >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
                
                <div className="flex justify-between items-center mb-6 flex-row-reverse border-b border-gray-100 dark:border-white/5 pb-4">
                   <h2 className="text-xl font-bold flex items-center gap-2">
                      <Scale className="w-5 h-5 text-[#E07A5F]" /> تسجيل قياسات InBody جديدة
                   </h2>
                   <button onClick={() => setIsInBodyModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center cursor-pointer">
                      <X className="w-4 h-4" />
                   </button>
                </div>

                <div className="space-y-4 text-right">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-2">الوزن الحالي (كجم) *</label>
                      <input 
                         type="number" 
                         value={ibWeight} 
                         onChange={(e) => setIbWeight(e.target.value)} 
                         placeholder="مثال: 78.5"
                         className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-sky-500 focus:ring-2 focus:ring-sky-500 text-right" 
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">الكتلة العضلية (كجم)</label>
                         <input 
                            type="number" 
                            value={ibMuscle} 
                            onChange={(e) => setIbMuscle(e.target.value)} 
                            placeholder="اختياري"
                            className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-emerald-500 focus:ring-2 focus:ring-emerald-500 text-right" 
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">كتلة الدهون (كجم)</label>
                         <input 
                            type="number" 
                            value={ibFatMass} 
                            onChange={(e) => setIbFatMass(e.target.value)} 
                            placeholder="اختياري"
                            className="w-full h-12 px-4 bg-[#FDFBF7] dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-rose-500 focus:ring-2 focus:ring-rose-500 text-right" 
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">نسبة الدهون (٪)</label>
                         <input 
                            type="number" 
                            value={ibFatPercentage} 
                            onChange={(e) => setIbFatPercentage(e.target.value)} 
                            placeholder="اختياري"
                            className="w-full h-12 px-4 bg-[#FDFBF7] dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-rose-500 focus:ring-2 focus:ring-rose-500 text-right" 
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2 font-mono">نسبة الماء (٪)</label>
                         <input 
                            type="number" 
                            value={ibWater} 
                            onChange={(e) => setIbWater(e.target.value)} 
                            placeholder="اختياري"
                            className="w-full h-12 px-4 bg-[#FDFBF7] dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-sky-500 focus:ring-2 focus:ring-sky-500 text-right" 
                         />
                      </div>
                   </div>

                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-2 font-mono">معدل الحرق الأساسي BMR (سعرة)</label>
                      <input 
                         type="number" 
                         value={ibBmr} 
                         onChange={(e) => setIbBmr(e.target.value)} 
                         placeholder="اختياري"
                         className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-[#E07A5F] focus:ring-2 focus:ring-[#E07A5F] text-right" 
                      />
                   </div>
                </div>

                <div className="flex gap-3 mt-8">
                   <button 
                      type="button"
                      onClick={() => setIsInBodyModalOpen(false)}
                      className="flex-1 h-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold text-sm rounded-[20px] active:scale-95 transition-all cursor-pointer"
                   >
                      إلغاء
                   </button>
                   <button 
                      type="button"
                      onClick={handleSaveInBody}
                      disabled={!ibWeight || isInBodySaving}
                      className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-[20px] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 cursor-pointer"
                   >
                      <Check className="w-5 h-5" /> 
                      {isInBodySaving ? "جاري الحفظ..." : "حفظ القياسات"}
                   </button>
                </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      {/* Body Measurements Modal */}
      <AnimatePresence>
        {isMeasModalOpen && (
           <>
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                onClick={() => setIsMeasModalOpen(false)}
             />
             <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] z-50 rounded-t-[32px] p-6 text-right pb-10 shadow-2xl"
                dir="rtl"
             >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
                
                <div className="flex justify-between items-center mb-6 flex-row-reverse border-b border-gray-100 dark:border-white/5 pb-4">
                   <h2 className="text-xl font-bold flex items-center gap-2">
                      <Scale className="w-5 h-5 text-amber-500" /> تحديث مقاسات محيطات الجسم
                   </h2>
                   <button onClick={() => setIsMeasModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center cursor-pointer">
                      <X className="w-4 h-4" />
                   </button>
                </div>

                <div className="space-y-4 text-right">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">محيط الخصر (سم)</label>
                         <input 
                            type="number" 
                            value={measWaist} 
                            onChange={(e) => setMeasWaist(e.target.value)} 
                            placeholder="مثال: 82"
                            className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-rose-500 focus:ring-2 focus:ring-rose-500 text-right" 
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">محيط الصدر (سم)</label>
                         <input 
                            type="number" 
                            value={measChest} 
                            onChange={(e) => setMeasChest(e.target.value)} 
                            placeholder="مثال: 98"
                            className="w-full h-12 px-4 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-sm font-bold text-sky-500 focus:ring-2 focus:ring-sky-500 text-right" 
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-2">
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-2">الأرداف (سم)</label>
                         <input 
                            type="number" 
                            value={measHips} 
                            onChange={(e) => setMeasHips(e.target.value)} 
                            placeholder="مثال: 104"
                            className="w-full h-12 px-2 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-xs font-bold text-violet-500 focus:ring-2 focus:ring-violet-500 text-right" 
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-2">الذراع (سم)</label>
                         <input 
                            type="number" 
                            value={measArms} 
                            onChange={(e) => setMeasArms(e.target.value)} 
                            placeholder="مثال: 34"
                            className="w-full h-12 px-2 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-xs font-bold text-amber-500 focus:ring-2 focus:ring-amber-500 text-right" 
                         />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-400 block mb-2">الفخذ (سم)</label>
                         <input 
                            type="number" 
                            value={measThighs} 
                            onChange={(e) => setMeasThighs(e.target.value)} 
                            placeholder="مثال: 56"
                            className="w-full h-12 px-2 bg-gray-50 dark:bg-white/5 border-none rounded-[16px] text-xs font-bold text-emerald-500 focus:ring-2 focus:ring-emerald-500 text-right" 
                         />
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 mt-8">
                   <button 
                      type="button"
                      onClick={() => setIsMeasModalOpen(false)}
                      className="flex-1 h-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold text-sm rounded-[20px] active:scale-95 transition-all cursor-pointer"
                   >
                      إلغاء
                   </button>
                   <button 
                      type="button"
                      onClick={handleSaveBodyMeasurements}
                      className="flex-1 h-14 bg-amber-650 hover:bg-amber-700 text-white font-bold text-sm rounded-[20px] shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                   >
                      <Check className="w-5 h-5" /> 
                      حفظ المقاسات
                   </button>
                </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      {/* Clinician/Doctor Report Modal */}
      <AnimatePresence>
        {isDoctorReportOpen && (
           <>
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
                onClick={() => setIsDoctorReportOpen(false)}
             />
             <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="fixed inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 bottom-10 top-10 md:w-[680px] bg-white dark:bg-[#1A1A1A] z-50 rounded-3xl p-6 text-right overflow-y-auto pb-10 shadow-2xl flex flex-col justify-between"
                dir="rtl"
             >
                <div>
                   <div className="flex justify-between items-center mb-6 flex-row-reverse border-b border-gray-100 dark:border-white/5 pb-4">
                      <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                         <Activity className="w-5 h-5 text-emerald-500" /> تقرير المؤشرات الحيوية والتطور الطبي
                      </h2>
                      <button onClick={() => setIsDoctorReportOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center cursor-pointer">
                         <X className="w-4 h-4" />
                      </button>
                   </div>

                   {/* Clinic layout for Print */}
                   <div id="clinician-print-area" className="bg-white dark:bg-[#121415] border border-gray-200 dark:border-white/5 rounded-2xl p-6 space-y-6 text-black dark:text-white relative">
                      {/* Clinic Header decoration */}
                      <div className="flex justify-between items-center flex-row-reverse border-b-2 border-emerald-500 pb-4">
                         <div className="text-right">
                            <h3 className="font-extrabold text-base text-emerald-850">مركز التغذية والصحة العلاجية والمنعكسات</h3>
                            <p className="text-[9px] text-gray-400">تقرير المتابعة العيادي والإلكتروني المنسق</p>
                         </div>
                         <div className="text-left font-mono text-[9px] text-gray-400">
                            <p>تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
                            <p>المستند الرقمي: #DOC-{(profile.name || 'HERO').substring(0,3).toUpperCase()}-{Math.floor(Math.random()*9000+1000)}</p>
                         </div>
                      </div>

                      {/* Bio Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold bg-gray-50 dark:bg-white/5 p-3 rounded-xl text-center flex-row-reverse" dir="rtl">
                         <div>
                            <span className="text-[9px] text-gray-400 block mb-0.5">الاسم / الرمز</span>
                            <span className="font-bold text-gray-900 dark:text-white">{profile.name || 'بطل دايت وصحة'}</span>
                         </div>
                         <div>
                            <span className="text-[9px] text-gray-400 block mb-0.5">الطول</span>
                            <span>{profile.height || '--'} سم</span>
                         </div>
                         <div>
                            <span className="text-[9px] text-gray-400 block mb-0.5">الوزن الحالي</span>
                            <span className="text-emerald-600 font-bold">{profile.weight || '--'} كجم</span>
                         </div>
                         <div>
                            <span className="text-[9px] text-gray-400 block mb-0.5">مؤشر الـ BMI</span>
                            <span className="text-blue-500 font-bold">{bmi || '--'}</span>
                         </div>
                      </div>

                      {/* Vital Indicator Progress Table */}
                      <div className="space-y-3">
                         <h4 className="font-black text-xs text-emerald-800 border-r-4 border-emerald-500 pr-2 block">التحليل التفصيلي وتركيب الجسم المجهري:</h4>
                         <div className="overflow-x-auto">
                            <table className="w-full text-center text-[11px] border-collapse" dir="rtl">
                               <thead>
                                  <tr className="bg-gray-100 dark:bg-white/5 font-bold">
                                     <th className="p-2 border border-gray-200 dark:border-white/5">المعيار العيادي</th>
                                     <th className="p-2 border border-gray-200 dark:border-white/5">القيمة</th>
                                     <th className="p-2 border border-gray-200 dark:border-white/5">النطاق والتعليق العلمي</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  <tr className="border-b border-gray-200 dark:border-white/5">
                                     <td className="p-2 font-bold border border-gray-200 dark:border-white/5">المنشأ ومعدل BMR</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-rose-500 font-bold">
                                        {inBodyLogs[0]?.bmr || Math.round(10 * (profile.weight || 70) + 6.25 * (profile.height || 170) - 5 * 25 + (profile.gender === 'male' ? 5 : -161))} سعرة
                                     </td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-gray-500">معدل الاحتياج الأساسي اليومي لضمان الحياة الخلوية</td>
                                  </tr>
                                  <tr className="border-b border-gray-200 dark:border-white/5">
                                     <td className="p-2 font-bold border border-gray-200 dark:border-white/5">نسبة الدهون الإجمالية</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-orange-500 font-bold">{inBodyLogs[0]?.fatPercentage ? `${inBodyLogs[0].fatPercentage}%` : '--'}</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-gray-500">{bmiDesc || 'تحت التقييم ومتابعة الميزان'}</td>
                                  </tr>
                                  <tr className="border-b border-gray-200 dark:border-white/5">
                                     <td className="p-2 font-bold border border-gray-200 dark:border-white/5">الكتلة العضلية النظيفة</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-emerald-500 font-bold">{inBodyLogs[0]?.muscleMass ? `${inBodyLogs[0].muscleMass} كجم` : '--'}</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-gray-500">حجم الألياف الداعمة والتحمل الهيكلي للأطراف</td>
                                  </tr>
                                  <tr className="border-b border-gray-200 dark:border-white/5">
                                     <td className="p-2 font-bold border border-gray-200 dark:border-white/5">نسبة هيدرات وترطيب الماء</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-sky-500 font-bold">{inBodyLogs[0]?.waterPercentage ? `${inBodyLogs[0].waterPercentage}%` : '٥٥%'}</td>
                                     <td className="p-2 border border-gray-200 dark:border-white/5 text-gray-500">أمان ترطيب العضلات والمفاصل</td>
                                  </tr>
                               </tbody>
                            </table>
                         </div>
                      </div>

                      {/* Measurements Profile */}
                      {bodyMeasurements.length > 0 && (
                         <div className="space-y-2 pt-2 text-xs">
                            <h4 className="font-black text-xs text-emerald-800 border-r-4 border-emerald-500 pr-2 block">آخر قراءات محيطات الجسم المقاسة:</h4>
                            <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                               محيط الصدر: <b>{bodyMeasurements[0].chest || '--'}سم</b> | محيط الخصر: <b>{bodyMeasurements[0].waist || '--'}سم</b> | محيط الأرداف: <b>{bodyMeasurements[0].hips || '--'}سم</b> | فخذ/ذراع: <b>{bodyMeasurements[0].thighs || '--'}/{bodyMeasurements[0].arms || '--'}سم</b>.
                            </p>
                         </div>
                      )}

                      {/* Clinician Stamp Placeholder */}
                      <div className="flex justify-between items-end flex-row-reverse pt-4 border-t border-dashed border-gray-200">
                         <div className="text-center font-semibold text-[10px] text-gray-400">
                            <p>توقيع وختم الأخصائي المسؤول</p>
                            <div className="w-24 h-12 border border-gray-200/50 rounded-lg mx-auto mt-2 flex items-center justify-center border-dashed font-mono uppercase text-[8px]">
                               Approved Stamp
                            </div>
                         </div>
                         <div className="text-right text-[10px] text-gray-500 leading-relaxed font-bold">
                            <p>📌 التوصية العلاجية العامة:</p>
                            <p className="text-emerald-700">الالتزام التام بحد السعرات والمحافظة على النشاط البدني الصباحي.</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 mt-8 z-10 relative">
                   <button 
                      type="button"
                      onClick={() => setIsDoctorReportOpen(false)}
                      className="flex-1 h-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold text-sm rounded-[20px] active:scale-95 transition-all cursor-pointer"
                   >
                      إغلاق
                   </button>
                   <button 
                      type="button"
                      onClick={() => {
                         // Print utility
                         const printContents = document.getElementById('clinician-print-area')?.innerHTML;
                         if (printContents) {
                            const originalContents = document.body.innerHTML;
                            document.body.innerHTML = `<div style="direction: rtl; padding: 40px; font-family: sans-serif;">${printContents}</div>`;
                            window.print();
                            window.location.reload(); // Refresh to restore clean state safely!
                         }
                      }}
                      className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-[20px] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                   >
                      <Printer className="w-5 h-5" /> 
                      طباعة التقرير العيادي 🖨️
                   </button>
                </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>


      {/* +++ أضيف بناءً على طلبك - واجهة مطبخ دايت عك الذكي متكامل لتركيب الطبخات بالكميات +++ */}
      <AnimatePresence>
        {isKitchenOpen && (
           <>
             <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm animate-none"
                onClick={() => setIsKitchenOpen(false)}
             />
             <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A1A1A] z-50 rounded-t-[32px] p-6 text-right pb-10 shadow-2xl"
                dir="rtl"
             >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
                
                <div className="flex justify-between items-center mb-6 flex-row-reverse border-b border-gray-100 dark:border-white/5 pb-4">
                   <h2 className="text-xl font-black flex items-center gap-2">
                      <ChefHat className="w-6 h-6 text-emerald-600 animate-pulse" /> مطبخ دايت عك الذكي 🍳
                   </h2>
                   <button onClick={() => setIsKitchenOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center cursor-pointer">
                      <X className="w-4 h-4" />
                   </button>
                </div>

                <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold mb-6 text-right leading-relaxed bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                   مرحباً بك في مطبخك الصحي! هنا تقدر تجمع مكونات طبختك المنزلية (مثال: صينية بطاطس بالفراخ، كبسة دايت، شوربة شوفان) والتطبيق هيحسب السعرات الكلية للطبخة والماكروز بدقة بالغة، مع إمكانية تقسيمها على عدد الأطباق/الحصص وسكبها وجبة في يومك! 🍲✨
                </p>

                <div className="space-y-6">
                   {/* Recipe General Details */}
                   <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-4">
                      <h3 className="font-extrabold text-sm border-b border-gray-200 dark:border-white/5 pb-2">تفاصيل وعنوان الطبخة 📝</h3>

                      {/* +++ أضيف بناءً على طلبك - الطبخات والوصفات المحفوظة مسبقاً وبأزرار استدعاء سريعة +++ */}
                      {savedRecipes.length > 0 && (
                         <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-4 rounded-2xl border border-emerald-500/10 space-y-3 mb-2" dir="rtl">
                            <h4 className="font-extrabold text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 flex-row-reverse text-right">
                               <span>🍳 طبخاتك السريعة المحفوظة:</span>
                            </h4>
                            <div className="flex flex-wrap gap-2 flex-row-reverse text-right">
                               {savedRecipes.map(recipe => (
                                  <div 
                                     key={recipe.id}
                                     onClick={() => handleLoadRecipe(recipe)}
                                     className="flex items-center gap-2 bg-white dark:bg-[#121415] px-3 py-1.5 rounded-xl border border-gray-150/40 dark:border-white/5 text-[11px] font-bold text-gray-700 dark:text-gray-300 hover:border-emerald-500 cursor-pointer transition-all shadow-sm"
                                  >
                                     <span>{recipe.name} (أطباق: {recipe.servings || 1})</span>
                                     <button 
                                        type="button"
                                        onClick={(e) => handleDeleteSavedRecipe(recipe.id, e)}
                                        className="text-rose-450 hover:text-rose-600 p-0.5 cursor-pointer"
                                        title="حذف الوصفة"
                                     >
                                        <X className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                               ))}
                            </div>
                         </div>
                      )}
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-2">اسم الطبخة المنزلية</label>
                         <div className="flex gap-2 items-center flex-row-reverse">
                            <input 
                               type="text" 
                               value={kitchenMealName}
                               onChange={(e) => setKitchenMealName(e.target.value)}
                               placeholder="مثال: صينية بطاطس صحية بالدجاج 🥘"
                               className="flex-1 h-12 px-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-emerald-500 text-right" 
                            />
                            <button
                               type="button"
                               onClick={handleSaveCurrentRecipe}
                               disabled={kitchenIngredients.length === 0 || !kitchenMealName}
                               className="h-12 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-500/10 cursor-pointer shrink-0"
                               title="حفظ الطبخة في طبخاتك المفضلة"
                            >
                               <Save className="w-4 h-4" />
                               <span>حفظ الوصفة 💾</span>
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2">عدد الحصص والسرْفيس (أطباق)</label>
                            <input 
                               type="number" 
                               min="1"
                               value={kitchenServings}
                               onChange={(e) => setKitchenServings(e.target.value)}
                               className="w-full h-12 px-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-center" 
                            />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-gray-500 block mb-2">تسجيل في وجبة</label>
                            <select 
                               value={kitchenSelectedCategory}
                               onChange={(e) => setKitchenSelectedCategory(e.target.value)}
                               className="w-full h-12 px-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-right"
                            >
                               {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                         </div>
                      </div>
                   </div>

                   {/* Active Recipe Ingredients List */}
                   <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/5">
                      <h3 className="font-extrabold text-sm border-b border-gray-200 dark:border-white/5 pb-2 mb-3">مكونات طبختك الحالية 🥣</h3>
                      
                      {kitchenIngredients.length === 0 ? (
                         <div className="text-center py-6 text-gray-400 text-xs font-bold space-y-2">
                            <p>🍳 مطبخك فارغ الآن!</p>
                            <p className="text-[10px] font-medium text-gray-400">ابحث عن المكونات بالأسفل وحدد الكميات لإضافتها للخلطة الذكية.</p>
                         </div>
                      ) : (
                         <div className="space-y-2">
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                               {kitchenIngredients.map((ing) => (
                                  <div key={ing.id} className="flex justify-between items-center text-xs flex-row-reverse text-right bg-white dark:bg-[#121415] border border-gray-100 dark:border-white/5 p-3 rounded-2xl shadow-sm">
                                     <div className="flex items-center gap-2 flex-row-reverse">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <div>
                                           <span className="font-bold text-gray-800 dark:text-gray-200 block mb-1">{ing.name}</span>
                                           <div className="flex items-center gap-2 flex-row-reverse text-[10px] text-gray-400 font-bold mt-1">
                                              <span>المقدار: {ing.qty} {ing.unitLabel}</span>
                                              <div className="flex items-center gap-1">
                                                 <button
                                                    type="button"
                                                    onClick={() => handleUpdateIngredientQty(ing.id, true)}
                                                    className="w-5 h-5 rounded bg-gray-100 dark:bg-white/10 text-gray-750 dark:text-gray-200 flex items-center justify-center font-black text-xs hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                                                 >
                                                    +
                                                 </button>
                                                 <button
                                                    type="button"
                                                    onClick={() => handleUpdateIngredientQty(ing.id, false)}
                                                    className="w-5 h-5 rounded bg-gray-100 dark:bg-white/10 text-gray-750 dark:text-gray-200 flex items-center justify-center font-black text-xs hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                                                 >
                                                    -
                                                 </button>
                                              </div>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <div className="text-left">
                                           <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block">{ing.scaledCalories} سعرة</span>
                                           <span className="text-[9px] text-gray-400 block font-semibold">ب: {ing.scaledProtein}ج • ك: {ing.scaledCarbs}ج</span>
                                        </div>
                                        <button 
                                           type="button"
                                           onClick={() => setKitchenIngredients(prev => prev.filter(p => p.id !== ing.id))}
                                           className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-rose-500 rounded-lg hover:text-rose-700 cursor-pointer"
                                        >
                                           <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </div>
                                  </div>
                               ))}
                            </div>

                            {/* Aggregated Recipe Totals Card */}
                            {(() => {
                               let totalCals = 0;
                               let totalP = 0;
                               let totalC = 0;
                               let totalF = 0;
                               kitchenIngredients.forEach(i => {
                                  totalCals += i.scaledCalories;
                                  totalP += i.scaledProtein;
                                  totalC += i.scaledCarbs;
                                  totalF += i.scaledFats;
                               });
                               const sQty = parseFloat(kitchenServings) || 1;
                               return (
                                  <div className="mt-4 p-4 bg-emerald-500/10 dark:bg-emerald-950/30 rounded-2xl border border-emerald-500/10 space-y-2">
                                     <div className="flex justify-between items-center flex-row-reverse font-extrabold text-xs text-emerald-800 dark:text-emerald-355 text-right">
                                        <span>إجمالي قيم الطبخة الكلي:</span>
                                        <span>{totalCals} سعرة (ب: {Math.round(totalP)}ج • ك: {Math.round(totalC)}ج • د: {Math.round(totalF)}ج)</span>
                                     </div>
                                     {sQty > 1 && (
                                        <div className="flex justify-between items-center flex-row-reverse font-bold text-[11px] text-indigo-700 dark:text-indigo-350 border-t border-emerald-500/15 pt-2 border-dashed text-right">
                                           <span>لكل وجبة/طبق (حصة واحدة من أصل {sQty}):</span>
                                           <span className="font-extrabold">{Math.round(totalCals / sQty)} سعرة (ب: {Math.round((totalP / sQty) * 10) / 10}ج • ك: {Math.round((totalC / sQty) * 10) / 10}ج)</span>
                                        </div>
                                     )}
                                     {/* +++ أضيف بناءً على طلبك - تقييم جودة وصحية الطبخة المنزلية +++ */}
                                     {(() => {
                                        const review = getRecipeHealthReview();
                                        return (
                                           <div className={`mt-2 p-3 rounded-xl text-[10px] font-bold text-center leading-relaxed ${review.bg} ${review.color}`}>
                                              {review.text}
                                           </div>
                                        );
                                     })()}
                                  </div>
                               );
                            })()}
                         </div>
                      )}
                   </div>

                   {/* Add Predefined Ingredients to list Builder */}
                   <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-4">
                      <h3 className="font-extrabold text-sm border-b border-gray-200 dark:border-white/5 pb-2">البحث وإضافة مكونات جديدة 🔍</h3>
                      
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-row-reverse border-b border-gray-200/50 dark:border-white/5">
                         {[
                            { id: 'all', label: 'الكل 🍽️' },
                            { id: 'fruit', label: 'فواكه 🍎' },
                            { id: 'vegetable', label: 'خضروات 🥦' },
                            { id: 'meal', label: 'وجبات وأغذية 🍲' }
                         ].map(tab => (
                            <button
                               key={tab.id}
                               type="button"
                               onClick={() => setKitchenSearchClassification(tab.id as any)}
                               className={cn("px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all shrink-0 border whitespace-nowrap cursor-pointer",
                                  kitchenSearchClassification === tab.id 
                                     ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" 
                                     : "bg-white dark:bg-[#121415] border-gray-200 dark:border-white/5 text-gray-400"
                               )}
                            >
                               {tab.label}
                            </button>
                         ))}
                      </div>

                      <div className="relative">
                         <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                         <input 
                            type="text"
                            value={kitchenSearch}
                            onChange={(e) => setKitchenSearch(e.target.value)}
                            placeholder="ابحث عن المكون (لحم، بصل، طماطم، صلصة، أرز، زيت...)"
                            className="w-full text-right h-12 pr-10 pl-4 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                         />
                      </div>

                      <div className="max-h-44 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                         {COMMON_FOODS.filter(f => {
                            const matchesSearch = kitchenSearch ? f.name.includes(kitchenSearch) || f.name.toLowerCase().includes(kitchenSearch.toLowerCase()) : true;
                            const matchesTab = kitchenSearchClassification === 'all' ? true : f.type === kitchenSearchClassification;
                            return matchesSearch && matchesTab;
                         }).map(food => (
                            <button 
                               key={food.name}
                               type="button"
                               onClick={() => {
                                  setKiPredefinedFood(food);
                                  setKiQty('100');
                                  setKiUnit('gram');
                               }}
                               className={cn("w-full text-right px-3 py-2 bg-white dark:bg-[#121415] rounded-2xl text-xs font-bold border flex items-center justify-between transition-all cursor-pointer",
                                  kiPredefinedFood?.name === food.name ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 shadow-sm" : "border-gray-150/40 dark:border-white/5 text-gray-755 dark:text-gray-200"
                               )}
                            >
                               <span className="text-[10px] text-gray-400 font-medium font-mono">P: {food.protein}ج • C: {food.carbs}ج</span>
                               <div className="flex items-center gap-2 flex-row-reverse text-right">
                                  <span>{food.name}</span>
                                  <span className="text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg shrink-0">{food.calories} سعرة</span>
                                </div>
                            </button>
                         ))}
                      </div>

                      {/* Config portion builder values for selected ingredient */}
                      {kiPredefinedFood && (
                         <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="p-4 bg-amber-500/5 rounded-3xl border border-amber-500/10 space-y-3"
                         >
                            <div className="flex justify-between items-center flex-row-reverse">
                               <h4 className="font-extrabold text-xs text-amber-800 dark:text-amber-400">تحديد مقدار المكون للطبخة ⚖️</h4>
                               <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">{kiPredefinedFood.name}</span>
                            </div>

                            <div className="flex gap-3 flex-row-reverse">
                               <div className="flex-1">
                                  <label className="text-[10px] text-gray-400 block mb-1">المعيار (طبق، ملعقة، كوب، جرام)</label>
                                  <select 
                                     value={kiUnit}
                                     onChange={(e) => setKiUnit(e.target.value)}
                                     className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold text-gray-850 dark:text-white text-right"
                                  >
                                     <option value="gram">جرامات ⚖️</option>
                                     <option value="piece">قطعة / كيس / حبة / رغيف 🍕</option>
                                     <option value="spoon">معلقة كبيرة (مثال: زيت، أرز) 🥄</option>
                                     <option value="cup">كوب / مج المشروبات 🥛</option>
                                     <option value="plate">طبق كامل (٢.٥ الحصة) 🍲</option>
                                  </select>
                               </div>
                               <div className="w-24">
                                  <label className="text-[10px] text-gray-400 block mb-1 font-mono">الكمية</label>
                                  <input 
                                     type="number"
                                     step="any"
                                     value={kiQty}
                                     onChange={(e) => setKiQty(e.target.value)}
                                     className="w-full h-11 px-3 bg-white dark:bg-[#121415] border border-gray-150/40 dark:border-white/5 rounded-xl text-xs font-bold text-center text-gray-850 dark:text-white" 
                                  />
                               </div>
                            </div>

                            <button 
                               type="button"
                               onClick={handleAddIngredientToKitchen}
                               className="w-full h-11 bg-[#1A4D42] dark:bg-emerald-600 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                               <Plus className="w-4 h-4 text-white" /> أضف المكون للطبخة 🥣
                            </button>
                         </motion.div>
                      )}
                   </div>
                </div>

                {/* Confirm additions controls */}
                <div className="flex gap-3 mt-8">
                   <button 
                      type="button"
                      onClick={() => setIsKitchenOpen(false)}
                      className="flex-1 h-14 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 font-bold text-sm rounded-[20px] active:scale-95 transition-all cursor-pointer"
                   >
                      إلغاء المطبخ
                   </button>
                   <button 
                      type="button"
                      onClick={handleAddKitchenRecipeToToday}
                      disabled={kitchenIngredients.length === 0}
                      className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-[20px] shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 cursor-pointer"
                   >
                      <Check className="w-5 h-5" /> صب الطبخة كوجبة اليوم 🥘
                   </button>
                </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      <DietBuilderModal
         isOpen={isDietCreatorOpen}
         onClose={() => setIsDietCreatorOpen(false)}
         onLogMeal={handleLogMealFromModal}
      />
    </div>
  );
}
