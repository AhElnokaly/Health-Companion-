import { Activity, Plus, Sparkles, Droplets, Moon, User, HeartPulse, Battery, Frown, Coffee, Trophy, Pill, Utensils, Sun, Clock, Calendar, Wallet, Briefcase, Users, MessageCircle, Bell, ChevronRight, Check, CheckSquare, Info, BookOpen, Footprints, Download, Smartphone, TrendingUp, Heart, Settings, ArrowUp, ArrowDown, Eye, EyeOff, Maximize2, Minimize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useAppContext } from '../context/AppContext';
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExpandableCard } from '../components/ExpandableCard';
import { cn } from '../lib/utils';
import { useWeather } from '../hooks/useWeather';
import { generateOfflineSmarts } from '../lib/offlineSmarts';
import { AnimatedWeather } from '../components/AnimatedWeather';
import { getTimeTheme } from '../lib/timeTheme';
import { Star, Edit3, Trash2 } from 'lucide-react';
import DrinkBuilderModal from '../components/DrinkBuilderModal';
import DietBuilderModal from '../components/DietBuilderModal';
import { customTrackerStore } from '../lib/custom-tracker-store';
import NotificationsModal from '../components/NotificationsModal';
import ApkDownloadModal from '../components/ApkDownloadModal';

// +++ أضيفت لدعم اختيار مشروبك المفضل من قائمة واسعة مسبقة ومقاسة بناءً على طلبك +++
export const POPULAR_PRESETS = [
  { name: 'ماء نقي بارد 🥛', ml: 250, factor: 1.0, calories: 0, category: 'مياه' },
  { name: 'قهوة تركي سادة ☕', ml: 150, factor: 0.85, calories: 2, category: 'منبهات' },
  { name: 'شاي أحمر دايت 🍵', ml: 250, factor: 0.85, calories: 1, category: 'منبهات' },
  { name: 'نسكافيه بلاك دايت ☕', ml: 250, factor: 0.85, calories: 4, category: 'منبهات' },
  { name: 'شاي أخضر بالياسمين 🍵', ml: 200, factor: 0.9, calories: 2, category: 'منبهات' },
  { name: 'ينسون دافئ مهدئ 🌿', ml: 250, factor: 0.95, calories: 2, category: 'أعشاب' },
  { name: 'نعناع بالليمون دايت 🍋', ml: 250, factor: 0.95, calories: 15, category: 'أعشاب' },
  { name: 'كركديه بارد منعش 🍹', ml: 250, factor: 0.95, calories: 20, category: 'سواقط' },
  { name: 'سحلب بالمكسرات دايت 🥛', ml: 250, factor: 0.7, calories: 130, category: 'أخرى' },
  { name: 'جنزبيل بالليمون 🍋', ml: 200, factor: 0.95, calories: 10, category: 'أعشاب' },
  { name: 'تمر هندي طبيعي دايت 🧉', ml: 250, factor: 0.9, calories: 45, category: 'سواقط' },
  { name: 'سوبيا لايت بلمسة حليب 🥛', ml: 250, factor: 0.8, calories: 75, category: 'أخرى' },
  { name: 'خروب طبيعي بدون سكر 🤎', ml: 250, factor: 0.9, calories: 15, category: 'سواقط' },
  { name: 'قرفة باللبن خالي الدسم 🥛', ml: 200, factor: 0.85, calories: 95, category: 'أعشاب' },
  { name: 'شاي كرك بالحليب لايت ☕', ml: 150, factor: 0.8, calories: 50, category: 'منبهات' },
  { name: 'عصير برتقال فريش 🍊', ml: 250, factor: 0.9, calories: 90, category: 'عصائر' },
  { name: 'عصير مانجو فريش 🥭', ml: 250, factor: 0.9, calories: 120, category: 'عصائر' },
  { name: 'عصير رمان طبيعي 🥤', ml: 250, factor: 0.9, calories: 100, category: 'عصائر' },
  { name: 'بلاك كوفي ☕', ml: 200, factor: 0.85, calories: 3, category: 'منبهات' },
  { name: 'ماتشا لاتيه 🍵', ml: 250, factor: 0.85, calories: 95, category: 'أعشاب' },
  { name: 'آيس كوفي دايت 🧊', ml: 250, factor: 0.8, calories: 35, category: 'منبهات' },
  { name: 'سبرايت دايت 🥤', ml: 330, factor: 0.0, calories: 0, category: 'غازيات' },
  { name: 'مياه فوارة بالليمون 🍋', ml: 330, factor: 1.0, calories: 0, category: 'مياه' }
];

export default function Dashboard() {
  const { user } = useAuth();
  const { 
    isFastingMode, 
    toggleFastingMode, 
    setIsFastingMode, 
    fastingChoice, 
    setFastingChoiceToday, 
    profile,
    fastingThemeMode,
    setFastingThemeMode
  } = useAppContext();
  const { theme } = useUI();
  
  const todayStr = new Date().toISOString().split('T')[0];

  const handleSetFastingStateToday = (isFasting: boolean) => {
    setFastingChoiceToday(isFasting ? 'fasting' : 'not_fasting');
  };

  const { temperature, aqi, uvIndex, sunrise, loading: loadingWeather } = useWeather();
  const navigate = useNavigate();
  const [waterCount, setWaterCount] = useState(0);
  const [mood, setMood] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState(0);
  const [waterAdding, setWaterAdding] = useState(false);
  const [isWaterCardExpanded, setIsWaterCardExpanded] = useState(false);
  const [selectedBevIndex, setSelectedBevIndex] = useState(0);
  const [cycleLogs, setCycleLogs] = useState<any[]>([]);

  // +++ أضيفت لدعم إضافة مشروبات مخصصة بالاسم والحجم بناءً على طلبك +++
  const [customBevName, setCustomBevName] = useState('');
  const [customBevMl, setCustomBevMl] = useState('250');
  const [customBevFactor, setCustomBevFactor] = useState('0.85');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  // +++ أضيفت لتوسيع الكروت وإدخال البيانات المباشر بناءً على طلبك +++
  const [isDietCardExpanded, setIsDietCardExpanded] = useState(false);
  const [isMedsCardExpanded, setIsMedsCardExpanded] = useState(false);
  const [isSleepCardExpanded, setIsSleepCardExpanded] = useState(false);
  const [isWomenCardExpanded, setIsWomenCardExpanded] = useState(false);

  // +++ أضيفت لدعم مستشار الزواج والخصائص التفاعلية بناءً على طلبك +++
  const [budgetTier, setBudgetTier] = useState<'budget' | 'medium' | 'liberal'>(() => {
     return (localStorage.getItem('user_budget_tier') as any) || 'medium';
  });
  const [marriageStreak, setMarriageStreak] = useState<number>(() => {
     return parseInt(localStorage.getItem('user_marriage_streak') || '0', 10);
  });

  // +++ أضيفت لدعم عداد الخطوات النشط وتنزيل الـ APK بناءً على طلبك +++
  const [stepCount, setStepCount] = useState(0);
  const [stepLogs, setStepLogs] = useState<any[]>([]);
  const [stepAdding, setStepAdding] = useState(false);
  const [quickStepsDuration, setQuickStepsDuration] = useState('30');
  const [isStepsCardExpanded, setIsStepsCardExpanded] = useState(false);
  const [isApkCardExpanded, setIsApkCardExpanded] = useState(false);
  const [activeCardHighlight, setActiveCardHighlight] = useState<string | null>(null);

  // +++ أضيفت لتخصيص الشاشة الرئيسية وترتيب البطاقات واختيار أحجامها بناءً على طلبك +++
  const [cardCustomizerOpen, setCardCustomizerOpen] = useState(false);
  
  // +++ أضيفت لدعم الكروت المطوية الذكية لمستشار السعادة الزوجية بناءً على طلبك +++
  const [isSpousePsychologyExpanded, setIsSpousePsychologyExpanded] = useState(false);
  const [isSpouseBudgetExpanded, setIsSpouseBudgetExpanded] = useState(false);
  const [isSpouseStreakExpanded, setIsSpouseStreakExpanded] = useState(false);
  const [isApkCardHidden, setIsApkCardHidden] = useState(() => localStorage.getItem('hide_apk_download') === 'true');
  const [cardSettings, setCardSettings] = useState(() => {
    const saved = localStorage.getItem('dashboard_card_settings_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.order && parsed.visible && parsed.sizes) {
          return parsed;
        }
      } catch (e) {}
    }
    return {
      order: ['water', 'diet', 'meds', 'steps', 'sleep', 'spouse_advice'],
      visible: {
        water: true,
        diet: true,
        meds: true,
        steps: true,
        sleep: true,
        spouse_advice: true
      },
      sizes: {
        water: 'md',
        diet: 'md',
        meds: 'md',
        steps: 'md',
        sleep: 'md',
        spouse_advice: 'md'
      }
    };
  });

  const updateCardSettings = (newSettings: any) => {
    setCardSettings(newSettings);
    localStorage.setItem('dashboard_card_settings_v3', JSON.stringify(newSettings));
  };

  // --- +++ أضيفت لتشغيل الحساس ومستشعر الحركة التلقائي بالهاتف لقراءة حركتك وتحديدها والـ PWA +++ ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPhoneSensorActive, setIsPhoneSensorActive] = useState(false);
  const [motionFeedback, setMotionFeedback] = useState<string>("اضغط لبدء مستشعر الحركة 📱");
  const [motionType, setMotionType] = useState<'stationary' | 'walking' | 'running' | 'unknown'>('stationary');
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [xyzForces, setXyzForces] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // الاستماع لحدث تثبيت الـ PWA فورياً على الجوال
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // الاستماع لمستشعر الحركة والتسارع بالهاتف المحمول للخطوات
  useEffect(() => {
    if (!isPhoneSensorActive) return;

    let lastStepTime = 0;
    const stepThreshold = 11.6; // تسارع غلاف الجاذبية الأرضية (~9.8) + شدة خطوة كافية للمشية الطبيعية
    const stepMinInterval = 350; // ميلي ثانية لتجنب الرجرجة المضاعفة لليد
    const linearThreshold = 1.9; // بدون جاذبية

    const handleMotion = (event: DeviceMotionEvent) => {
      let x = 0, y = 0, z = 0;
      let magnitude = 0;
      let hasGravity = true;

      if (event.accelerationIncludingGravity) {
        x = event.accelerationIncludingGravity.x || 0;
        y = event.accelerationIncludingGravity.y || 0;
        z = event.accelerationIncludingGravity.z || 0;
        magnitude = Math.sqrt(x * x + y * y + z * z);
      } else if (event.acceleration) {
        x = event.acceleration.x || 0;
        y = event.acceleration.y || 0;
        z = event.acceleration.z || 0;
        magnitude = Math.sqrt(x * x + y * y + z * z);
        hasGravity = false;
      }

      // حفظ القوى اللحظية
      setXyzForces({ x, y, z });

      const now = Date.now();
      const diff = now - lastStepTime;

      // تقدير الحركة وحجم نشاط المستخدم للتعرف عليها "يتعرف عليها"
      const baseline = hasGravity ? 9.8 : 0;
      const deviation = Math.abs(magnitude - baseline);

      if (deviation < 0.6) {
        setMotionType('stationary');
        setMotionFeedback("وضع السكون التام 🧍‍♂️");
      } else if (deviation > 3.8) {
        setMotionType('running');
        setMotionFeedback("تم التعرف على جري وهرولة بنشاط عالي! 🏃‍♂️⚡");
      } else {
        setMotionType('walking');
        setMotionFeedback("تم التعرف على مشي معتدل مستقر 🚶‍♂️✨");
      }

      // تصفية الخطوة وقرار الإضافة
      const triggerThreshold = hasGravity ? stepThreshold : linearThreshold;
      if (magnitude > triggerThreshold && diff > stepMinInterval) {
        lastStepTime = now;
        
        // تسجيل الخطوة بمصداقية
        const movementTypeLabel = deviation > 3.8 ? 'جري حركي' : 'مشي مستشعر';
        handleAddSteps(1, `حساس الهاتف الذكي (${movementTypeLabel})`);

        // رجّاج الهاتف للتأكيد
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    };

    const activateSensors = async () => {
      const DeviceMotionEventClass = (window as any).DeviceMotionEvent;
      if (DeviceMotionEventClass && typeof DeviceMotionEventClass.requestPermission === 'function') {
        try {
          const permissionState = await DeviceMotionEventClass.requestPermission();
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            setSensorError(null);
          } else {
            setSensorError("تم رفض صلاحية تتبع الحركة من مستشعر الهاتف.");
            setIsPhoneSensorActive(false);
          }
        } catch (err) {
          setSensorError("يرجى تفعيل إذن حساسات الحركة بالمتصفح يدوياً.");
          setIsPhoneSensorActive(false);
        }
      } else {
        window.addEventListener('devicemotion', handleMotion);
        setSensorError(null);
      }
    };

    activateSensors();

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isPhoneSensorActive]);

  const [dietLogs, setDietLogs] = useState<any[]>([]);
  const [medList, setMedList] = useState<any[]>([]);
  const [medLogs, setMedLogs] = useState<any[]>([]);

  // Diet Logging fields
  const [quickMealName, setQuickMealName] = useState('');
  const [quickMealCalories, setQuickMealCalories] = useState('');
  const [dietAdding, setDietAdding] = useState(false);
  const [activeDietTab, setActiveDietTab] = useState('');

  // Sleep Logging field
  const [quickSleepDuration, setQuickSleepDuration] = useState('8');
  const [sleepAdding, setSleepAdding] = useState(false);

  // Med logging loading state tracker
  const [medsLoggingId, setMedsLoggingId] = useState<string | null>(null);

  // +++ أضيفت لدعم صانع تركيبات المشروبات والوجبات الدقيق والزر السريع الثابت +++
  const [isDrinkCreatorOpen, setIsDrinkCreatorOpen] = useState(false);
  const [isDietCreatorOpen, setIsDietCreatorOpen] = useState(false);
  const [pinnedWaterConfig, setPinnedWaterConfig] = useState(() => customTrackerStore.getPinnedWater());
  const [pinnedDietConfig, setPinnedDietConfig] = useState(() => customTrackerStore.getPinnedDiet());
  const [pinnedWaterList, setPinnedWaterList] = useState(() => customTrackerStore.getPinnedWaterList());
  const [pinnedDietList, setPinnedDietList] = useState(() => customTrackerStore.getPinnedDietList());
  const [selectedPresetForEdit, setSelectedPresetForEdit] = useState<any>(null);
  const [selectedDietPresetForEdit, setSelectedDietPresetForEdit] = useState<any>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isApkDialogOpen, setIsApkDialogOpen] = useState(false);

  useEffect(() => {
    const handleWaterPinChange = () => {
      setPinnedWaterConfig(customTrackerStore.getPinnedWater());
      setPinnedWaterList(customTrackerStore.getPinnedWaterList());
    };
    const handleDietPinChange = () => {
      setPinnedDietConfig(customTrackerStore.getPinnedDiet());
      setPinnedDietList(customTrackerStore.getPinnedDietList());
    };
    const handleOpenCard = (e: Event) => {
      const card = (e as CustomEvent).detail?.card;
      if (card === 'water') {
        setIsWaterCardExpanded(true);
        setIsDietCardExpanded(false);
        setIsSleepCardExpanded(false);
        setIsMedsCardExpanded(false);
        setIsStepsCardExpanded(false);
      } else if (card === 'diet') {
        setIsWaterCardExpanded(false);
        setIsDietCardExpanded(true);
        setIsSleepCardExpanded(false);
        setIsMedsCardExpanded(false);
        setIsStepsCardExpanded(false);
      } else if (card === 'sleep') {
        setIsWaterCardExpanded(false);
        setIsDietCardExpanded(false);
        setIsSleepCardExpanded(true);
        setIsMedsCardExpanded(false);
        setIsStepsCardExpanded(false);
      } else if (card === 'meds') {
        setIsWaterCardExpanded(false);
        setIsDietCardExpanded(false);
        setIsSleepCardExpanded(false);
        setIsMedsCardExpanded(true);
        setIsStepsCardExpanded(false);
      } else if (card === 'steps') {
        setIsWaterCardExpanded(false);
        setIsDietCardExpanded(false);
        setIsSleepCardExpanded(false);
        setIsMedsCardExpanded(false);
        setIsStepsCardExpanded(true);
      }
      
      if (card) {
        setActiveCardHighlight(card);
        setTimeout(() => {
          const el = document.getElementById(`dashboard-${card}-card`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        setTimeout(() => {
          setActiveCardHighlight(null);
        }, 4000);
      }
    };
    window.addEventListener('waterQuickPinnedChanged', handleWaterPinChange);
    window.addEventListener('dietQuickPinnedChanged', handleDietPinChange);
    window.addEventListener('open-dashboard-card', handleOpenCard);
    return () => {
      window.removeEventListener('waterQuickPinnedChanged', handleWaterPinChange);
      window.removeEventListener('dietQuickPinnedChanged', handleDietPinChange);
      window.removeEventListener('open-dashboard-card', handleOpenCard);
    };
  }, []);

  const currentDietType = profile.dietType || 'balanced';

  const getDietTabs = () => {
    if (isFastingMode) {
      return [
        { id: 'suhoor', label: 'سحور 🌙', icon: '🍲' },
        { id: 'snacks', label: 'سناكس 🥜', icon: '🍿' },
        { id: 'iftar', label: 'إفطار 🍲', icon: '🍛' }
      ];
    }
    switch (currentDietType) {
      case 'keto':
        return [
          { id: 'breakfast', label: 'فطور دهني 🍳', icon: '🍳' },
          { id: 'lunch', label: 'غداء بروتيني 🥩', icon: '🥩' },
          { id: 'dinner', label: 'عشاء غني 🥑', icon: '🥑' },
          { id: 'snacks', label: 'سناكس كيتو 🥜', icon: '🥜' }
        ];
      case 'low_carb':
        return [
          { id: 'breakfast', label: 'فطور بروتيني 🥚', icon: '🥚' },
          { id: 'lunch', label: 'غداء قليل النشويات 🐟', icon: '🐟' },
          { id: 'dinner', label: 'عشاء خفيف 🧀', icon: '🧀' },
          { id: 'snacks', label: 'سناكس لو كارب 🍓', icon: '🍓' }
        ];
      case 'high_protein':
        return [
          { id: 'breakfast', label: 'فطور رياضي 💪', icon: '💪' },
          { id: 'lunch', label: 'غداء تضخيم 🍗', icon: '🍗' },
          { id: 'dinner', label: 'عشاء استشفاء 🥛', icon: '🥛' },
          { id: 'snacks', label: 'سناك بروتين 🥜', icon: '🥜' }
        ];
      case 'balanced':
      default:
        return [
          { id: 'breakfast', label: 'فطور متوازن 🥞', icon: '🥞' },
          { id: 'lunch', label: 'غداء متكامل 🍛', icon: '🍛' },
          { id: 'dinner', label: 'عشاء خفيف 🥗', icon: '🥗' },
          { id: 'snacks', label: 'سناكس صحية 🍎', icon: '🍎' }
        ];
    }
  };

  const getFoodItemsForTab = (tabId: string) => {
    if (isFastingMode) {
      switch (tabId) {
        case 'suhoor':
          return [
            { name: 'بيضتان مسلوقتان', cal: 140, icon: '🥚' },
            { name: 'فول بالزيت الحار وعيش سن', cal: 230, icon: '🫘' },
            { name: 'علبة زبادي بلدي طبيعي', cal: 80, icon: '🥛' },
            { name: 'جبنة قريش بالخيار', cal: 110, icon: '🧀' }
          ];
        case 'snacks':
          return [
            { name: 'تمر (٣ حبات)', cal: 60, icon: '🌴' },
            { name: 'مكسرات نية مشكلة', cal: 150, icon: '🥜' },
            { name: 'كوب حليب دافئ', cal: 120, icon: '🥛' },
            { name: 'موزة متوسطة مشبعة', cal: 105, icon: '🍌' }
          ];
        case 'iftar':
        default:
          return [
            { name: 'شوربة دافئة ومشروب تمر', cal: 110, icon: '🥣' },
            { name: 'صدر دجاج ورز بسمتي', cal: 380, icon: '🍗' },
            { name: 'طبق لحم مشوي وسلطة', cal: 350, icon: '🥩' },
            { name: 'سمك بلطي مشوي مع رز', cal: 320, icon: '🐟' }
          ];
      }
    }

    switch (currentDietType) {
      case 'keto':
        switch (tabId) {
          case 'breakfast':
            return [
              { name: 'أومليت بالزبدة والجبن', cal: 250, icon: '🍳' },
              { name: 'بيض بالبسطرمة والسمن', cal: 220, icon: '🥩' },
              { name: 'جبنة شيدر وزيتون أسود', cal: 180, icon: '🧀' }
            ];
          case 'lunch':
            return [
              { name: 'كفتة مشوية دهنية بالبقدونس', cal: 380, icon: '🍢' },
              { name: 'صدر دجاج محمر بالزبدة', cal: 240, icon: '🍗' },
              { name: 'لحم مفروم بالبصل والسمن', cal: 310, icon: '🥩' }
            ];
          case 'dinner':
            return [
              { name: 'نصف حبة أفوكادو بملح', cal: 160, icon: '🥑' },
              { name: 'علبة تونة كاملة بالزيت', cal: 190, icon: '🐟' },
              { name: 'سلطة خضراء بجبن الماعز', cal: 140, icon: '🥗' }
            ];
          case 'snacks':
          default:
            return [
              { name: 'مكسرات البقان واللوز نية', cal: 200, icon: '🥜' },
              { name: 'رول صدور الدجاج والجبن', cal: 120, icon: '🌯' },
              { name: 'مكعب زبدة الشوكولاتة الكيتو', cal: 110, icon: '🍫' }
            ];
        }

      case 'low_carb':
        switch (tabId) {
          case 'breakfast':
            return [
              { name: 'بيضتان مسلوقتان وطماطم', cal: 155, icon: '🥚' },
              { name: 'جبنة قريش بالزعتر بكر ممتاز', cal: 125, icon: '🧀' },
              { name: 'أومليت خضار بدون زيت', cal: 120, icon: '🍳' }
            ];
          case 'lunch':
            return [
              { name: 'علبة تونة دايت بالليمون', cal: 130, icon: '🐟' },
              { name: 'صدر دجاج مشوي متبل سادة', cal: 165, icon: '🍗' },
              { name: 'شريحة كبدة مشوية بالتوابل', cal: 180, icon: '🥩' }
            ];
          case 'dinner':
            return [
              { name: 'علبة زبادي يوناني لايت نص', cal: 110, icon: '🥛' },
              { name: 'جبنة بيضاء خفيفة دايت ملح', cal: 100, icon: '🧀' },
              { name: 'طبق خيار وجرجير طازج', cal: 40, icon: '🥒' }
            ];
          case 'snacks':
          default:
            return [
              { name: 'فراولة طازجة (١٠ حبات)', cal: 50, icon: '🍓' },
              { name: 'ترمس مسلوق بالليمون والكمون', cal: 110, icon: '🌽' },
              { name: 'فنجان قهوة بحليب لوز دايت', cal: 45, icon: '☕' }
            ];
        }

      case 'high_protein':
        switch (tabId) {
          case 'breakfast':
            return [
              { name: 'شوفان بالبروتين وحليب خفيف', cal: 280, icon: '🌾' },
              { name: '٤ بياض بيض مع صفار أومليت', cal: 160, icon: '🍳' },
              { name: 'جبنة قريش بالطماطم والنعناع', cal: 150, icon: '🧀' }
            ];
          case 'lunch':
            return [
              { name: 'صدر دجاج كبير ورز بسمتي', cal: 450, icon: '🍗' },
              { name: 'علبة تونة مع توست سن نخالة', cal: 290, icon: '🐟' },
              { name: 'شريحة لحم ستيك بقري مشوي', cal: 320, icon: '🥩' }
            ];
          case 'dinner':
            return [
              { name: 'كوب مخفوق بروتين مصل اللبن', cal: 140, icon: '🥛' },
              { name: 'علبة زبادي يوناني بنكهة فانيليا', cal: 130, icon: '🥛' },
              { name: 'بيضتان مسلوقتان وسلطة خضراء', cal: 180, icon: '🥚' }
            ];
          case 'snacks':
          default:
            return [
              { name: 'مكسرات مشكلة نيئة غير مملحة', cal: 160, icon: '🥜' },
              { name: 'ترمس بلدي مسلوق غني', cal: 130, icon: '🌽' },
              { name: 'سناء بروتين بار مخصص للرياضة', cal: 190, icon: '🍫' }
            ];
        }

      case 'balanced':
      default:
        switch (tabId) {
          case 'breakfast':
            return [
              { name: 'جبنة بيضاء وعيش بلدي وطماطم', cal: 190, icon: '🧀' },
              { name: 'فول بزيت زيتون وعيش سن', cal: 240, icon: '🫘' },
              { name: 'بيض مسلوق وتوست حبوب كاملة', cal: 210, icon: '🥚' }
            ];
          case 'lunch':
            return [
              { name: 'مكرونة مسلوقة وصدور دجاج', cal: 380, icon: '🍝' },
              { name: 'رز صيادية وسمك بلطي سلطة', cal: 330, icon: '🍛' },
              { name: 'لحم بقري مشوي وطبق خضار', cal: 350, icon: '🥩' }
            ];
          case 'dinner':
            return [
              { name: 'بيضة مسلوقة وكوب زبادي بلدي', cal: 140, icon: '🥚' },
              { name: 'جبنة قريش بالزيتون والخيار', cal: 130, icon: '🧀' },
              { name: 'طبق شوربة خضار دافئة', cal: 105, icon: '🥣' }
            ];
          case 'snacks':
          default:
            return [
              { name: 'تفاحة خضراء قرمشة منعشة', cal: 80, icon: '🍎' },
              { name: 'موزة متوسطة ممتلئة طاقة', cal: 105, icon: '🍌' },
              { name: 'تمر لولو طبيعي (حبة واحدة)', cal: 20, icon: '🌴' }
            ];
        }
    }
  };

  const widgetBeverages = [
    { name: 'ماء عادي', factor: 1, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/40', icon: '💧' },
    { name: 'عصير طبيعي', factor: 0.8, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40', icon: '🍊' },
    { name: 'شاي', factor: 0.8, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/40', icon: '🍵' },
    { name: 'قهوة', factor: 0.5, color: 'text-stone-700', bg: 'bg-stone-100 dark:bg-stone-900/30', icon: '☕' },
    { name: 'مشروب غازي', factor: 0, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40', icon: '🥤' }
  ];

  const widgetSizes = [
    { name: 'كوب صغير', ml: 200, label: '٢٠٠ مل' },
    { name: 'كوب عادي', ml: 250, label: '٢٥٠ مل' },
    { name: 'كوب كبير', ml: 350, label: '٣٥٠ مل' },
    { name: 'زجاجة صغيرة', ml: 500, label: '٥٠٠ مل' },
    { name: 'ترمس لتر', ml: 1000, label: '١ لتر' }
  ];

  const handleAddWater = async () => {
     if (!user) return;
     setWaterAdding(true);
     if (user.uid === 'local_guest_user') {
       try {
         const savedWater = localStorage.getItem('local_water_logs');
         const waterList = savedWater ? JSON.parse(savedWater) : [];
         waterList.push({
           amount: 250,
           effectiveAmount: 250,
           beverageType: 'ماء عادي',
           context: 'إضافة سريعة من الواجهة الرئيسية',
           timestamp: Date.now()
         });
         localStorage.setItem('local_water_logs', JSON.stringify(waterList));
         window.dispatchEvent(new Event('localWaterUpdated'));
       } catch (e) {
         console.error("Local water error:", e);
       }
     } else {
       try {
         await addDoc(collection(db, 'users', user.uid, 'waterLogs'), { 
           amount: 250, 
           effectiveAmount: 250, 
           beverageType: 'ماء عادي', 
           context: 'إضافة سريعة من الواجهة الرئيسية', 
           timestamp: Date.now() 
         });
       } catch (e) {
         console.error("Error adding water:", e);
       }
     }
     setTimeout(() => setWaterAdding(false), 400);
  };

  const handleAddWaterCustom = async (amount: number, beverageName: string, factor: number) => {
     if (!user) return;
     setWaterAdding(true);
     if (user.uid === 'local_guest_user') {
       try {
         const savedWater = localStorage.getItem('local_water_logs');
         const waterList = savedWater ? JSON.parse(savedWater) : [];
         waterList.push({
           amount: amount,
           effectiveAmount: Math.round(amount * factor),
           beverageType: beverageName,
           context: 'إضافة سريعة مخصصة من الشاشة الرئيسية',
           timestamp: Date.now()
         });
         localStorage.setItem('local_water_logs', JSON.stringify(waterList));
         window.dispatchEvent(new Event('localWaterUpdated'));
       } catch (e) {
         console.error("Local water custom error:", e);
       }
     } else {
       try {
         await addDoc(collection(db, 'users', user.uid, 'waterLogs'), { 
           amount: amount, 
           effectiveAmount: Math.round(amount * factor), 
           beverageType: beverageName, 
           context: 'إضافة سريعة مخصصة من الشاشة الرئيسية', 
           timestamp: Date.now() 
         });
       } catch (e) {
         console.error("Error adding custom water:", e);
       }
     }
     setTimeout(() => setWaterAdding(false), 400);
  };
  
  // +++ أضيفت بناءً على طلبك - إضافة الخطوات ومزامنتها +++
  const handleAddSteps = async (amount: number, context: string = 'تسجيل سريع للخطوات') => {
    if (!user) return;
    setStepAdding(true);
    if (user.uid === 'local_guest_user') {
      try {
        const savedSteps = localStorage.getItem('local_step_logs');
        const stepsList = savedSteps ? JSON.parse(savedSteps) : [];
        stepsList.push({
          steps: amount,
          context: context,
          timestamp: Date.now()
        });
        localStorage.setItem('local_step_logs', JSON.stringify(stepsList));
        window.dispatchEvent(new Event('localStepsUpdated'));
      } catch (e) {
        console.error("Local steps error:", e);
      }
    } else {
      try {
        await addDoc(collection(db, 'users', user.uid, 'stepLogs'), { 
          steps: amount, 
          context: context, 
          timestamp: Date.now() 
        });
      } catch (e) {
        console.error("Error adding steps:", e);
      }
    }
    setTimeout(() => setStepAdding(false), 400);
  };

  const isFemale = profile.gender === 'female';

  // +++ أضيفت لدعم تنبيهات صيام النوافل والامتثال والاقتراحات بناءً على طلبك +++
  const [isFastingCardExpanded, setIsFastingCardExpanded] = useState(false);
  const [fastingAlertsEnabled, setFastingAlertsEnabled] = useState(() => {
    return localStorage.getItem('fasting_alerts_enabled') !== 'false';
  });

  const [fastingHistoryLog, setFastingHistoryLog] = useState<string[]>(() => {
    const saved = localStorage.getItem('fasting_history_log');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // أيام صيام افتراضية مسبقة لإعطاء مظهر متفاعل
    return ["2026-05-18", "2026-05-21"]; 
  });

  const [activeTabSuggestion, setActiveTabSuggestion] = useState<'suhoor' | 'iftar' | 'water' | 'women'>('suhoor');
  
  const toggleFastingAlerts = () => {
    setFastingAlertsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('fasting_alerts_enabled', next ? 'true' : 'false');
      return next;
    });
  };

  const handleLogFastingDayDirect = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === todayStr;

    if (fastingHistoryLog.includes(dateStr)) {
      const nextLog = fastingHistoryLog.filter(d => d !== dateStr);
      setFastingHistoryLog(nextLog);
      localStorage.setItem('fasting_history_log', JSON.stringify(nextLog));
      if (isToday) {
        handleSetFastingStateToday(false);
      }
    } else {
      const nextLog = [...fastingHistoryLog, dateStr];
      setFastingHistoryLog(nextLog);
      localStorage.setItem('fasting_history_log', JSON.stringify(nextLog));
      if (isToday) {
        handleSetFastingStateToday(true);
      }
    }
  };

  // مزامنة حالة التطبيق لليوم الحالي مع قائمة السجلات السابقة والقرار المركزي
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (isFastingMode) {
      if (!fastingHistoryLog.includes(todayStr)) {
        setFastingHistoryLog(prev => {
          const next = [...prev, todayStr];
          localStorage.setItem('fasting_history_log', JSON.stringify(next));
          return next;
        });
      }
    } else {
      if (fastingHistoryLog.includes(todayStr)) {
        setFastingHistoryLog(prev => {
          const next = prev.filter(d => d !== todayStr);
          localStorage.setItem('fasting_history_log', JSON.stringify(next));
          return next;
        });
      }
    }
  }, [isFastingMode]);

  // التحقق الحركي إذا كان اليوم هو يوم صيام مستحب (لأجل الإشعارات البصرية التلقائية)
  const todayFastingType = useMemo(() => {
    const today = new Date();
    const isMay26_2026 = today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 26;
    if (isMay26_2026) return '🕋 يوم عرفة (أعظم أيام السنة الهجرية)';
    
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 1) return '🕌 صيام الإثنين (سنّة نبوية مؤكدة)';
    if (dayOfWeek === 4) return '🕌 صيام الخميس (سنّة نبوية مؤكدة)';
    
    // الأيام البيض لشهر ذو الحجة في سنة 2026 (13، 14، 15 ذو الحجة المقابل لـ 30 مايو، 31 مايو، 1 يونيو 2026)
    const year = today.getFullYear();
    const month = today.getMonth(); 
    const day = today.getDate();
    if (year === 2026 && month === 4) { // مايو
      if (day === 30) return '🌕 الأيام البيض (١٣ ذو الحجة)';
      if (day === 31) return '🌕 الأيام البيض (١٤ ذو الحجة)';
    }
    if (year === 2026 && month === 5) { // يونيو
      if (day === 1) return '🌕 الأيام البيض (١٥ ذو الحجة)';
    }
    return null;
  }, []);

  const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', {day: 'numeric', month: 'long', year : 'numeric'}).format(new Date());

   const generateInsight = () => {
    let insight = isFemale 
      ? "نومكِ كان أفضل هذا الأسبوع بنسبة ١٨٪ بفضل تقليلكِ للكافيين ليلاً. استمري على نفس الروتين!"
      : "نومكَ كان أفضل هذا الأسبوع بنسبة ١٨٪ بفضل تقليلكَ للكافيين ليلاً. استمر على نفس الروتين!";
    
    if (isFastingMode) {
      insight = isFemale ? "يوم صيام مبارك، ظبطتلك مواعيد الأدوية على الفطار والسحور، وخليت هدف الماية كله بالليل عشان مت عطشيش بالنهار." : "يوم صيام مبارك، ظبطتلك مواعيد الأدوية على الفطار والسحور، وخليت هدف شرب الماية بالليل عشان مت عطش بالنهار.";
    } else {
       if (temperature && temperature < 15) {
          insight = isFemale ? "الجو برد النهاردة.. متنسيـش تلبسي حاجة تقيلة وتشربي حاجات دافية." : "الجو برد النهاردة.. متنساش تلبس حاجة تقيلة وتشرب حاجات دافية.";
       } else if (temperature && temperature > 35) {
          insight = isFemale ? "الجو حر جداً النهاردة.. كثري من شرب الماية ومتحاوليش تخرجي وقت الظهر." : "الجو حر جداً النهاردة.. كثر من شرب الماية ومتحاولش تخرج وقت الظهر.";
       } else if (mood === 'pain') {
          insight = isFemale ? "عارفة إنك موجوعة شوية.. بطلي مجهود تقيل النهاردة وخليكي في السرير أرتاحي." : "عارف إنك موجوع وتعبان شوية.. حاول تريح ومتبذلش مجهود كبير النهاردة.";
       }
    }
    return insight;
  };

  // +++ استماع حقيقي لجميع البيانات لدعم الكروت المطورة والمستخدم الزائر ومزامنتها +++
  useEffect(() => {
    if (!user) return;

    const isToday = (timestamp: number) => {
      const d = new Date(timestamp);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    if (user.uid === 'local_guest_user') {
      const loadAllLocalData = () => {
         // Water
         const savedWater = localStorage.getItem('local_water_logs');
         const waterList = savedWater ? JSON.parse(savedWater) : [];
         let wSum = 0;
         waterList.forEach((data: any) => {
            if (isToday(data.timestamp)) {
               wSum += (data.effectiveAmount !== undefined ? data.effectiveAmount : (data.amount || 0));
            }
         });
         setWaterCount(wSum);

         // Sleep
         const savedSleep = localStorage.getItem('local_sleep_logs');
         const sleepList = savedSleep ? JSON.parse(savedSleep) : [];
         let latestDuration = 0;
         if (sleepList.length > 0) {
            const todaySleep = sleepList.filter((s: any) => isToday(s.timestamp));
            if (todaySleep.length > 0) {
               latestDuration = todaySleep[0].durationMinutes || 0;
            } else {
               latestDuration = sleepList[0].durationMinutes || 0;
            }
         }
         setSleepHours(latestDuration / 60);

         // Cycle
         const savedCycle = localStorage.getItem('local_cycle_logs') || '[]';
         try {
            const cycleList = JSON.parse(savedCycle);
            cycleList.sort((a: any, b: any) => b.startDate - a.startDate);
            setCycleLogs(cycleList);
         } catch (e){}

         // Diet / Calories
         const savedDiet = localStorage.getItem('local_diet_logs');
         const dietList = savedDiet ? JSON.parse(savedDiet) : [];
         setDietLogs(dietList);

         // Meds
         const savedMeds = localStorage.getItem('local_medications');
         let medsList = savedMeds ? JSON.parse(savedMeds) : [];
         if (medsList.length === 0) {
            medsList = [
              { id: 'm1', name: 'Warfarin', scientificName: 'Warfarin Sodium', dosage: 5, form: 'قرص', instruction: 'مساءً', inventory: 15, type: 'other', maxInventory: 30, frequencyPerDay: 1, isCritical: true, alarmTimes: ['20:00'] },
              { id: 'm2', name: 'Aspirin Cardio', scientificName: 'Acetylsalicylic acid', dosage: 81, form: 'قرص', instruction: 'بعد الغداء', inventory: 8, type: 'other', maxInventory: 28, frequencyPerDay: 1, isCritical: true, alarmTimes: ['14:00'] },
              { id: 'm3', name: 'Panadol Extra', dosage: 500, form: 'قرص', instruction: 'عند اللزوم', inventory: 60, type: 'painkiller', maxInventory: 60, frequencyPerDay: null }
            ];
         }
         setMedList(medsList);

         // Med Logs
         const savedMedLogs = localStorage.getItem('local_medication_logs');
         const medLogsList = savedMedLogs ? JSON.parse(savedMedLogs) : [];
         setMedLogs(medLogsList);

         // Steps
         const savedSteps = localStorage.getItem('local_step_logs');
         const stepsList = savedSteps ? JSON.parse(savedSteps) : [];
         let sSum = 0;
         stepsList.forEach((data: any) => {
            if (isToday(data.timestamp)) {
               sSum += (data.steps || 0);
            }
         });
         setStepCount(sSum);
         setStepLogs(stepsList);
      };

      loadAllLocalData();

      // Listeners for custom local changes
      window.addEventListener('localWaterUpdated', loadAllLocalData);
      window.addEventListener('localSleepUpdated', loadAllLocalData);
      window.addEventListener('localCycleUpdated', loadAllLocalData);
      window.addEventListener('localDietUpdated', loadAllLocalData);
      window.addEventListener('localMedsUpdated', loadAllLocalData);
      window.addEventListener('localStepsUpdated', loadAllLocalData);

      return () => {
         window.removeEventListener('localWaterUpdated', loadAllLocalData);
         window.removeEventListener('localSleepUpdated', loadAllLocalData);
         window.removeEventListener('localCycleUpdated', loadAllLocalData);
         window.removeEventListener('localDietUpdated', loadAllLocalData);
         window.removeEventListener('localMedsUpdated', loadAllLocalData);
         window.removeEventListener('localStepsUpdated', loadAllLocalData);
      };
    }

    // Cloud Database listeners
    // 1. Water
    const waterQ = query(collection(db, 'users', user.uid, 'waterLogs'));
    const unWater = onSnapshot(waterQ, (snapshot) => {
      let sum = 0;
      snapshot.forEach(doc => { 
        const data = doc.data();
        if (isToday(data.timestamp)) {
          sum += (data.effectiveAmount !== undefined ? data.effectiveAmount : (data.amount || 0)); 
        }
      });
      setWaterCount(sum);
    });

    // 2. Sleep
    const sleepQ = query(collection(db, 'users', user.uid, 'sleepLogs'));
    const unSleep = onSnapshot(sleepQ, (snapshot) => {
      let latestDuration = 0;
      snapshot.forEach(doc => { 
        latestDuration = doc.data().durationMinutes || 0;
      });
      setSleepHours(latestDuration / 60);
    });

    // 3. Cycle
    const cycleQ = query(collection(db, 'users', user.uid, 'cycleLogs'));
    const unCycle = onSnapshot(cycleQ, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() });
      });
      loaded.sort((a, b) => b.startDate - a.startDate);
      setCycleLogs(loaded);
    });

    // 4. Diet Logs (Meals)
    const dietQ = query(collection(db, 'users', user.uid, 'dietLogs'));
    const unDiet = onSnapshot(dietQ, (snapshot) => {
      const loaded: any[] = [];
      snapshot.forEach(doc => {
         loaded.push({ id: doc.id, ...doc.data() });
      });
      setDietLogs(loaded);
    });

    // 5. Medications
    const medsQ = query(collection(db, 'users', user.uid, 'medications'));
    const unMeds = onSnapshot(medsQ, (snapshot) => {
       const loaded: any[] = [];
       snapshot.forEach(doc => {
         loaded.push({ id: doc.id, ...doc.data() });
       });
       setMedList(loaded);
    });

    // 6. Medication Take Logs
    const medLogsQ = query(collection(db, 'users', user.uid, 'medication_logs'));
    const unMedLogs = onSnapshot(medLogsQ, (snapshot) => {
       const loaded: any[] = [];
       snapshot.forEach(doc => {
         loaded.push({ id: doc.id, ...doc.data() });
       });
       setMedLogs(loaded);
    });

    // 7. Steps Logs
    const stepsQ = query(collection(db, 'users', user.uid, 'stepLogs'));
    const unSteps = onSnapshot(stepsQ, (snapshot) => {
       const loaded: any[] = [];
       let sum = 0;
       snapshot.forEach(doc => {
         const data = doc.data();
         loaded.push({ id: doc.id, ...data });
         if (isToday(data.timestamp)) {
           sum += (data.steps || 0);
         }
       });
       setStepCount(sum);
       setStepLogs(loaded);
    });

    return () => { 
      unWater(); 
      unSleep(); 
      unCycle(); 
      unDiet(); 
      unMeds(); 
      unMedLogs(); 
      unSteps();
    };
  }, [user]);

  useEffect(() => {
    const savedMood = localStorage.getItem('user_mood');
    if (savedMood) setMood(savedMood);
  }, []);

  const handleMoodSelect = (selectedMood: string) => {
    setMood(selectedMood);
    localStorage.setItem('user_mood', selectedMood);
    
    if (selectedMood === 'pain') {
       setTimeout(() => {
          navigate('/symptoms');
       }, 300);
    }
  };

  const baseWaterGoal = profile.weight ? Math.round(profile.weight * 35) : 2800;
  const dailyWaterGoal = isFastingMode ? Math.round(baseWaterGoal * 0.8) : baseWaterGoal;
  
  // +++ حساب السعرات والامتثال للأدوية وتفاصيل الصحة حركياً بالكامل بناءً على طلبك +++
  const loggedCalories = useMemo(() => {
    const isToday = (timestamp: number) => {
      const d = new Date(timestamp);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };
    return dietLogs
      .filter(m => isToday(m.timestamp))
      .reduce((sum, item) => sum + (item.calories || 0), 0);
  }, [dietLogs]);

  const medsStatus = useMemo(() => {
    const isToday = (timestamp: number) => {
      const d = new Date(timestamp);
      const today = new Date();
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };
    
    // Fallback to offline mock meds if none registered
    const activeMeds = medList.length > 0 ? medList : [
      { id: 'm1', name: 'Warfarin', scientificName: 'Warfarin Sodium', dosage: 5, form: 'قرص', instruction: 'مساءً', inventory: 15, type: 'other', maxInventory: 30, frequencyPerDay: 1, isCritical: true, alarmTimes: ['20:00'] },
      { id: 'm2', name: 'Aspirin Cardio', scientificName: 'Acetylsalicylic acid', dosage: 81, form: 'قرص', instruction: 'بعد الغداء', inventory: 8, type: 'other', maxInventory: 28, frequencyPerDay: 1, isCritical: true, alarmTimes: ['14:00'] },
      { id: 'm3', name: 'Panadol Extra', dosage: 500, form: 'قرص', instruction: 'عند اللزوم', inventory: 60, type: 'painkiller', maxInventory: 60, frequencyPerDay: null }
    ];

    const todayTakenLogs = medLogs.filter(log => isToday(log.takenAt));
    const totalScheduled = activeMeds.filter(m => m.frequencyPerDay !== null).length || 3;
    const takenCount = activeMeds.filter(m => todayTakenLogs.some(l => l.medicationId === m.id)).length;
    const percent = Math.min(100, Math.round((takenCount / Math.max(1, totalScheduled)) * 100));

    return {
      activeMeds,
      totalScheduled,
      takenCount,
      percent
    };
  }, [medList, medLogs]);

  const handleAddMealCustom = async (name: string, cal: number, carbs = 0, fats = 0, protein = 0) => {
     if (!user) return;
     setDietAdding(true);
     const newMeal = {
       name,
       category: 'وجبة خفيفة',
       calories: cal,
       carbs,
       fats,
       protein,
       timestamp: Date.now()
     };
     try {
       if (user.uid === 'local_guest_user') {
         const saved = localStorage.getItem('local_diet_logs');
         const list = saved ? JSON.parse(saved) : [];
         list.unshift({ id: `local_${Date.now()}`, ...newMeal });
         localStorage.setItem('local_diet_logs', JSON.stringify(list));
         window.dispatchEvent(new Event('localDietUpdated'));
       } else {
         await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
       }
       setQuickMealName('');
       setQuickMealCalories('');
     } catch (e) {
       console.error("Error adding quick meal:", e);
     }
     setDietAdding(false);
  };

  // +++ أضيفت لدعم صانع تركيبات المشروبات والوجبات الدقيق والزر السريع الثابت +++
  const handleLogDrinkFromModal = async (
    amount: number,
    name: string,
    factor: number,
    calories: number,
    carbs: number,
    protein: number,
    fats: number
  ) => {
    if (!user) return;
    setWaterAdding(true);
    const timestamp = Date.now();
    const cleanName = name || 'مشروب مخصص';

    if (user.uid === 'local_guest_user') {
      try {
        const savedWater = localStorage.getItem('local_water_logs');
        const waterList = savedWater ? JSON.parse(savedWater) : [];
        waterList.push({
          id: Math.random().toString(),
          amount,
          effectiveAmount: Math.round(amount * factor),
          context: 'مصمم المشروبات الذكي',
          beverageType: cleanName,
          timestamp
        });
        localStorage.setItem('local_water_logs', JSON.stringify(waterList));
        window.dispatchEvent(new Event('localWaterUpdated'));
      } catch (e) {
        console.error("Local water custom log error:", e);
      }
    } else {
      try {
        await addDoc(collection(db, 'users', user.uid, 'waterLogs'), {
          amount,
          effectiveAmount: Math.round(amount * factor),
          context: 'مصمم المشروبات الذكي',
          beverageType: cleanName,
          timestamp
        });
      } catch (e) {
        console.error("Cloud water custom log error:", e);
      }
    }

    if (calories > 0) {
      const newMeal = {
        name: cleanName,
        category: 'مشروبات',
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fats: Math.round(fats * 10) / 10,
        timestamp
      };

      if (user.uid === 'local_guest_user') {
        try {
          const savedMeals = localStorage.getItem('local_diet_logs');
          const list = savedMeals ? JSON.parse(savedMeals) : [];
          list.unshift({ id: `local_${Date.now()}_diet`, ...newMeal });
          localStorage.setItem('local_diet_logs', JSON.stringify(list));
          window.dispatchEvent(new Event('localDietUpdated'));
        } catch (e) {
          console.error("Local meal error mapping custom beverage:", e);
        }
      } else {
        try {
          await addDoc(collection(db, 'users', user.uid, 'dietLogs'), newMeal);
        } catch (e) {
          console.error("Cloud meal mapping custom beverage error:", e);
        }
      }
    }
    setTimeout(() => setWaterAdding(false), 450);
  };

  const handleLogMealFromModal = async (
    name: string,
    category: string,
    calories: number,
    carbs: number,
    protein: number,
    fats: number
  ) => {
    if (!user) return;
    setDietAdding(true);
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
    setDietAdding(false);
  };

  const handleAddSleepCustom = async (hours: number) => {
     if (!user) return;
     setSleepAdding(true);
     const newSleep = {
       durationMinutes: hours * 60,
       quality: hours >= 8 ? 95 : 75,
       timestamp: Date.now()
     };
     try {
       if (user.uid === 'local_guest_user') {
         const saved = localStorage.getItem('local_sleep_logs');
         const list = saved ? JSON.parse(saved) : [];
         list.unshift({ id: `local_${Date.now()}`, ...newSleep });
         localStorage.setItem('local_sleep_logs', JSON.stringify(list));
         window.dispatchEvent(new Event('localSleepUpdated'));
       } else {
         await addDoc(collection(db, 'users', user.uid, 'sleepLogs'), newSleep);
       }
     } catch (e) {
       console.error("Error adding sleep log:", e);
     }
     setSleepAdding(false);
  };

  const handleTakeMedicationQuick = async (med: any) => {
     if (!user) return;
     setMedsLoggingId(med.id);
     const logBody = {
       medicationId: med.id,
       medicationName: med.name,
       takenAt: Date.now(),
       status: 'on_time',
       delayMinutes: 0,
       notes: 'تم الأخذ من الشاشة الرئيسية ✅',
       forWho: med.forWho || ''
     };
     try {
       if (user.uid === 'local_guest_user') {
         const savedLogs = localStorage.getItem('local_medication_logs');
         const logsList = savedLogs ? JSON.parse(savedLogs) : [];
         logsList.unshift({ id: `local_${Date.now()}`, ...logBody });
         localStorage.setItem('local_medication_logs', JSON.stringify(logsList));

         const savedMeds = localStorage.getItem('local_medications');
         if (savedMeds) {
            let medsList = JSON.parse(savedMeds);
            medsList = medsList.map((m: any) => {
              if (m.id === med.id && m.inventory !== null && m.inventory !== undefined) {
                 return { ...m, inventory: Math.max(0, m.inventory - 1) };
              }
              return m;
            });
            localStorage.setItem('local_medications', JSON.stringify(medsList));
         }
         window.dispatchEvent(new Event('localMedsUpdated'));
       } else {
         await addDoc(collection(db, 'users', user.uid, 'medication_logs'), logBody);
         if (!med.id.startsWith('m')) {
           await updateDoc(doc(db, 'users', user.uid, 'medications', med.id), {
             inventory: med.inventory !== null && med.inventory !== undefined ? Math.max(0, med.inventory - 1) : null
           });
         }
       }
     } catch (e) {
       console.error("Error logging medication intake:", e);
     }
     setMedsLoggingId(null);
  };

  const waterScore = Math.min((waterCount / dailyWaterGoal) * 100, 100) || 0;
  const sleepScore = sleepHours >= (profile.targetSleep || 7) ? 100 : (sleepHours / (profile.targetSleep || 7)) * 100 || 0;
  const dietScore = Math.min((loggedCalories / 2000) * 100, 100) || 0;
  const medsScore = medsStatus.percent;
  const overallScore = Math.round((waterScore + sleepScore + medsScore + (dietScore > 0 ? dietScore : 85)) / 4) || 87;

  const getAgeFromDob = (dobStr?: string) => {
    if (!dobStr) return null;
    const birthDate = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  const profileAge = getAgeFromDob(profile.dob) || profile.age;

  const isProfileIncomplete = !profile.weight || !profile.height || !profileAge || !profile.targetWeight || !profile.targetSleep;

  // Real-time Cycle Tracking calculations to avoid widget data desync with page
  const cycleStats = useMemo(() => {
    const periodLogs = [...cycleLogs].filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate);
    if (periodLogs.length < 2) return { averageCycle: 28 };
    
    let totalCycleLen = 0, cycleCount = 0;
    
    for (let i = 0; i < periodLogs.length - 1; i++) {
        const current = periodLogs[i];
        const prev = periodLogs[i + 1];
        const days = Math.floor((current.startDate - prev.startDate) / 86400000);
        if (days >= 20 && days <= 45) { // valid cycle range
            totalCycleLen += days;
            cycleCount++;
        }
    }
    
    return { 
       averageCycle: cycleCount > 0 ? Math.round(totalCycleLen / cycleCount) : 28 
    };
  }, [cycleLogs]);

  // +++ أضيف بناءً على طلبك - حساب متوسط عدد أيام الدورة أو الحد الأقصى الافتراضي لتجنب الأحمر اللانهائي +++
  const periodDurationStats = useMemo(() => {
    const historicalPeriods = cycleLogs.filter(l => l.status === 'period' && l.endDate);
    if (historicalPeriods.length === 0) {
      return 7; // الحد الأقصى لأيام الدورة إذا لم تكن هناك بيانات سابقة
    }
    let totalDays = 0;
    historicalPeriods.forEach(p => {
       const days = Math.floor((p.endDate! - p.startDate) / 86400000) + 1;
       totalDays += days;
    });
    const avg = Math.round(totalDays / historicalPeriods.length);
    return Math.min(10, Math.max(3, avg));
  }, [cycleLogs]);

  const cycleStatus = useMemo(() => {
    if (!cycleLogs.length) return { phase: 'follicular', cycleDay: 1, text: 'الطور الجريبي 🌱', percent: 25, label: 'يوم ١' };

    const activePregnancy = cycleLogs.find(l => l.status === 'pregnancy' && !l.endDate);
    if (activePregnancy) {
       const days = Math.floor((Date.now() - activePregnancy.startDate) / 86400000);
       const weeks = Math.floor(days / 7) + 1;
       return { 
         phase: 'pregnancy', 
         cycleDay: null, 
         text: 'مرحلة الحمل المبارك 🤰🏻', 
         percent: Math.min(100, (days / 280) * 100), 
         label: `الأسبوع ${weeks}` 
       };
    }

    const activePostpartum = cycleLogs.find(l => l.status === 'postpartum' && !l.endDate);
    if (activePostpartum) {
       const days = Math.floor((Date.now() - activePostpartum.startDate) / 86400000);
       return { 
         phase: 'postpartum', 
         cycleDay: null, 
         text: 'مرحلة النفاس والاستشفاء🤱🏻', 
         percent: Math.min(100, (days / 40) * 100), 
         label: `يوم ${days + 1}` 
       };
    }

    // +++ تعديل لكي لا تكون الدورة نشطة ومحسوبة كحيض إلى ما لا نهاية +++
    const activePeriod = cycleLogs.find(l => {
       if (l.status !== 'period' || l.endDate) return false;
       const today = new Date().setHours(0,0,0,0);
       const start = new Date(l.startDate).setHours(0,0,0,0);
       const absDaysSince = Math.floor((today - start) / 86400000) + 1;
       // نعتبر الدورة نشطة طالما لم يتم إدخال تاريخ انتهاء، وضمن الحد الأقصى المنطقي (10 أيام أو متوسط أيام دورتها أيهما أكبر) لتفادي الانحراف التحليلي
       return absDaysSince <= Math.max(10, periodDurationStats);
    });
    const pastPeriods = cycleLogs.filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate);
    const lastPeriod = pastPeriods[0];

    if (lastPeriod) {
       const today = new Date().setHours(0,0,0,0);
       const start = new Date(lastPeriod.startDate).setHours(0,0,0,0);
       const absDaysSince = Math.floor((today - start) / 86400000) + 1;
       
       if (activePeriod) {
          const p = Math.min(100, (absDaysSince / Math.max(10, periodDurationStats)) * 100);
          return { 
            phase: 'menstrual', 
            cycleDay: absDaysSince, 
            text: 'فترة الحيض 🩸', 
            percent: p, 
            label: `يوم ${absDaysSince} من الدورة`,
            activePeriodLog: activePeriod
          };
       }

       const cycleLength = cycleStats.averageCycle;
       const late = absDaysSince > cycleLength + 2;

       let calculatedPhase = 'luteal';
       let phaseName = 'الطور الأصفري 🪵';
       let p = 75;

       if (late) {
          calculatedPhase = 'luteal';
          phaseName = 'تأخر الدورة الطبيعي ⏱️';
          p = 95;
       } else {
          const estimatedOvulation = Math.max(14, cycleLength - 14);
          if (absDaysSince < estimatedOvulation - 4) {
             calculatedPhase = 'follicular';
             phaseName = 'الطور الجريبي 🌱';
             p = Math.min(100, (absDaysSince / (estimatedOvulation - 4)) * 30 + 10);
          } else if (absDaysSince >= estimatedOvulation - 4 && absDaysSince <= estimatedOvulation + 1) {
             calculatedPhase = 'ovulation';
             phaseName = 'فترة التبويض 🌟';
             p = 50;
          } else {
             calculatedPhase = 'luteal';
             phaseName = 'الطور الأصفري 🪵';
             p = Math.min(100, ((absDaysSince - estimatedOvulation) / 14) * 45 + 50);
          }
       }

       return { 
         phase: calculatedPhase, 
         cycleDay: absDaysSince, 
         text: phaseName, 
         percent: p, 
         label: `يوم ${absDaysSince} من ${cycleLength}` 
       };
    }

    return { phase: 'follicular', cycleDay: 1, text: 'الطور الجريبي 🌱', percent: 25, label: 'يوم ١' };
  }, [cycleLogs, cycleStats.averageCycle, periodDurationStats]);

  const missingFields = React.useMemo(() => {
    const list = [];
    if (!profile.weight) list.push("الوزن الحالي");
    if (!profile.height) list.push("الطول");
    if (!profileAge) list.push("تاريخ الميلاد (السن)");
    if (!profile.targetWeight) list.push("الوزن المستهدف");
    if (!profile.targetSleep) list.push("هدف النوم اليومي");
    return list;
  }, [profile, profileAge]);

  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const timeTheme = getTimeTheme(currentHour);

  // +++ تم الإضافة لتنفيذ طلبك: إخفاء كارت الماء والمشروبات أثناء وقت الصيام حتى المغرب +++
  const isBeforeMaghrib = currentHour < 18 || (currentHour === 18 && currentMinute < 10);
  const shouldHideWaterCard = isFastingMode && isBeforeMaghrib;

  // +++ تم الإضافة لتنفيذ طلبك: تحديد الأيام المحرّم صيامها وإخفاء كارت الصيام فيها +++
  const isFastingForbiddenToday = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      const hDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
      const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
      
      // شهر ١٠ (شوال) يوم ١: عيد الفطر
      if (hMonth === 10 && hDay === 1) return true;
      // شهر ١٢ (ذو الحجة) أيام ١٠، ١١، ١٢، ١٣: عيد الأضحى وأيام التشريق الثلاثة
      if (hMonth === 12 && (hDay === 10 || hDay === 11 || hDay === 12 || hDay === 13)) return true;
    } catch (e) {
      console.error("Error in Hijri conversion:", e);
    }
    return false;
  }, []);

  const forbiddenFastingDayName = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      const hDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
      const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
      
      if (hMonth === 10 && hDay === 1) {
        return "عيد الفطر السعيد 🎉 (يحرم الصيام في العيدين)";
      }
      if (hMonth === 12) {
        if (hDay === 10) return "عيد الأضحى المبارك 🐑 (يوم النحر)";
        if (hDay === 11) return "أول أيام التشريق (ثاني أيام عيد الأضحى)";
        if (hDay === 12) return "ثاني أيام التشريق (ثالث أيام عيد الأضحى)";
        if (hDay === 13) return "ثالث أيام التشريق (رابع أيام عيد الأضحى)";
      }
    } catch (e) {}
    return null;
  }, []);

  const getGreetingText = () => {
     if (currentHour < 12) return 'صباح الخير';
     if (currentHour < 18) return 'مساء الخير';
     return 'طاب مساؤك';
  };

  const weatherCondition = React.useMemo(() => {
     // simple mock based on time/randomness or could be real
     // For demo, making it clear-day or clear-night based on time, with slight chance of cloudy
     if (currentHour >= 18 || currentHour < 5) return 'clear-night';
     return 'clear-day';
  }, [currentHour]);

  const currentTimeFormatted = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  const [timeValue, timeAmPm] = currentTimeFormatted.split(' ');
  const dateFormatGregorian = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const dateFormatHijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const isDayOfArafah = useMemo(() => {
    const today = new Date();
    const isMay26_2026 = today.getFullYear() === 2026 && today.getMonth() === 4 && today.getDate() === 26;
    try {
      const hijriStr = new Intl.DateTimeFormat('en-US-u-ca-islamic', { day: 'numeric', month: 'numeric' }).format(today);
      return isMay26_2026 || hijriStr.startsWith('9/12') || hijriStr.includes('/9/12') || hijriStr.startsWith('09/12');
    } catch (e) {
      return isMay26_2026;
    }
  }, []);

  const religiousHolidayDetail = useMemo(() => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', {
        day: 'numeric',
        month: 'numeric'
      });
      const parts = formatter.formatToParts(new Date());
      const hDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
      const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);

      if (hMonth === 9) {
        return {
          name: "شهر رمضان المبارك 🌙",
          greeting: "كل عام وأنتم بخير بمناسبة حلول شهر رمضان المبارك! أعاده الله علينا وعليكم بالخير والبركات وجعلنا فيه من عتقائه من النار. 🤲✨",
          canFast: true,
          bgClasses: "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-[#F3FAF6] border-[#0C2D22]/60"
        };
      }
      if (hMonth === 10 && hDay === 1) {
        return {
          name: "عيد الفطر السعيد 🎉",
          greeting: "تقبل الله منا ومنكم صالح الأعمال، وعيدكم مبارك سعيد! كل عام وأنتم وعائلتكم بألف خير وعافية! 🍬🌸",
          canFast: false,
          bgClasses: "bg-gradient-to-br from-[#FFF8E7] via-[#FFF0C2] to-[#FFF8E7] text-[#5C3005] border-[#F2C994]/40 dark:from-[#331C04] dark:via-[#211102] dark:to-[#170C01] dark:text-[#FFE3A8] dark:border-[#522E0A]/45"
        };
      }
      if (hMonth === 10 && (hDay === 2 || hDay === 3)) {
        return {
          name: "أيام عيد الفطر السعيد 🎈",
          greeting: "أيام بهجة وسرور! تمنياتنا لكم بأوقات ملؤها السعادة والمحبة مع الأهل والأحباب. تقبل الله طاعاتكم! 😊🌸",
          canFast: false,
          bgClasses: "bg-gradient-to-br from-[#FFF8E7] via-[#FFF0C2] to-[#FFF8E7] text-[#5C3005] border-[#F2C994]/40 dark:from-[#331C04] dark:via-[#211102] dark:to-[#170C01] dark:text-[#FFE3A8] dark:border-[#522E0A]/45"
        };
      }
      if (hMonth === 12 && hDay === 9) {
        return {
          name: "يوم عرفة المبارك 🕋",
          greeting: "أفضل أيام السنة! لبيك اللهم لبيك. تقبل الله دعاءكم وصيامكم وصالح طاعاتكم في هذا اليوم العظيم. 🤲✨",
          canFast: true,
          bgClasses: "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-[#F3FAF6] border-[#0C2D22]/60"
        };
      }
      if (hMonth === 12 && hDay === 10) {
        return {
          name: "عيد الأضحى المبارك 🐑 (يوم النحر)",
          greeting: "تقبل الله ضحاياكم وطاعاتكم، وعيدكم مبارك سعيد! أدام الله عليكم البهجة والسرور والبركات! 🕋🎉",
          canFast: false,
          bgClasses: "bg-gradient-to-br from-[#FAEDDF] via-[#F5EFE6] to-[#EFEBE0] text-[#0F2D1D] border-[#E0D5C3]/40 dark:from-[#132B1C] dark:via-[#0E2015] dark:to-[#08130B] dark:text-[#E2F5E9] dark:border-emerald-800/40"
        };
      }
      if (hMonth === 12 && (hDay === 11 || hDay === 12 || hDay === 13)) {
        return {
          name: "أيام التشريق المباركة 🐏",
          greeting: "أيام أكل وشرب وذكر لله تعالى. عيدكم مبارك وتقبل الله منكم العبادات ونسأل الله لكم وافر الصحة! 🌸🍬",
          canFast: false,
          bgClasses: "bg-gradient-to-br from-[#FAEDDF] via-[#F5EFE6] to-[#EFEBE0] text-[#0F2D1D] border-[#E0D5C3]/40 dark:from-[#132B1C] dark:via-[#0E2015] dark:to-[#08130B] dark:text-[#E2F5E9] dark:border-emerald-800/40"
        };
      }
      if (hMonth === 1 && hDay === 1) {
        return {
          name: "رأس السنة الهجرية الجديدة 🌙",
          greeting: "عام هجري جديد مبارك! نسأل الله أن يجعله عام خير وبركة وسلام وصحة وعافية ونجاح لكم ولأحبائكم. 🤲✨",
          canFast: true,
          bgClasses: "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-[#F3FAF6] border-[#0C2D22]/60"
        };
      }
      if (hMonth === 1 && hDay === 10) {
        return {
          name: "يوم عاشوراء المبارك ✨",
          greeting: "ذكرى نجاة موسى وقومه. يسن صيامه لابتغاء مغفرة السنة الماضية. تقبل الله طاعاتكم! 🤲",
          canFast: true,
          bgClasses: "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-[#F3FAF6] border-[#0C2D22]/60"
        };
      }
      if (hMonth === 3 && hDay === 12) {
        return {
          name: "المولد النبوي الشريف 🌸",
          greeting: "صلوا على جميل الوجه وبدر التمام، شفيعنا يوم الزحام محمد ﷺ. كل عام وأنتم بخير بمناسبة المولد النبوي الشريف! 💚",
          canFast: true,
          bgClasses: "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-[#F3FAF6] border-[#0C2D22]/60"
        };
      }
    } catch (e) {
      console.error("Error formatting Hijri holidays:", e);
    }
    return null;
  }, []);

  const isSpiritualActive = isFastingMode || (religiousHolidayDetail !== null);

  useEffect(() => {
    // Auto set opposite for high contrast as default on theme shift
    if (theme === 'light') {
      setFastingThemeMode('dark');
    } else {
      setFastingThemeMode('light');
    }
  }, [theme]);

  const fastingStyles = useMemo(() => {
    const isFastingDark = fastingThemeMode === 'dark';
    if (isFastingDark) {
      return {
        mode: 'dark',
        headerBg: "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-white",
        cardBg: "bg-[#091D17] border-emerald-950/45 hover:bg-[#0c2a21]/50 text-white",
        cardClasses: "bg-white/20 border-white/20",
        pillBg: "bg-white/10 text-white",
        textGold: "text-[#D4A373]",
        textPrimary: "text-white",
        textSecondary: "text-emerald-300",
        starPatternColor: "#D4A373",
        starOpacity: "opacity-[0.10]",
        btnBg: "bg-emerald-500 hover:bg-emerald-600 text-white",
        innerCardBg: "bg-[#0c2a21]/55 border-emerald-950/30",
        subProgressRingBg: "stroke-emerald-950/20"
      };
    } else {
      return {
        mode: 'light',
        headerBg: "bg-gradient-to-br from-[#FAEDDF] via-[#F6F4EB] to-[#FCFBF4] text-emerald-950 border border-amber-200/50",
        cardBg: "bg-[#FCFBF4] border-amber-300/60 hover:bg-[#FAF6EC] text-emerald-950 shadow-md",
        cardClasses: "bg-amber-100/50 border-amber-250 text-amber-900",
        pillBg: "bg-amber-100 text-amber-900",
        textGold: "text-amber-800",
        textPrimary: "text-emerald-980",
        textSecondary: "text-emerald-800",
        starPatternColor: "#1A4D42",
        starOpacity: "opacity-[0.06]",
        btnBg: "bg-[#1A4D42] hover:bg-[#113830] text-white",
        innerCardBg: "bg-amber-50/70 border-amber-200/55",
        subProgressRingBg: "stroke-emerald-100"
      };
    }
  }, [fastingThemeMode]);

  const generalStyles = useMemo(() => {
    if (theme === 'sky') {
      return {
        headerBg: "bg-gradient-to-br from-[#0A1D37] via-[#091524] to-[#040C16] text-white border border-sky-950/30",
        cardBg: "bg-[#0F223B] border-sky-500/15 hover:bg-[#122744] text-sky-100",
        cardClasses: "bg-sky-950/40 border-sky-500/10 text-sky-200",
        pillBg: "bg-sky-500/10 text-sky-400",
        textGold: "text-sky-300",
        textPrimary: "text-sky-50",
        textSecondary: "text-sky-300",
        btnBg: "bg-sky-600 hover:bg-sky-700 text-white",
        innerCardBg: "bg-sky-950/20 border-sky-500/10",
        subProgressRingBg: "stroke-sky-950"
      };
    } else if (theme === 'dark') {
      return {
        headerBg: `bg-gradient-to-br ${timeTheme.bgGradient} ${timeTheme.textPrimary}`,
        cardBg: "bg-[#1A1A1A] border-white/5 hover:bg-[#222] text-white",
        cardClasses: timeTheme.cardClasses,
        pillBg: "bg-white/5 text-white/75",
        textGold: "text-amber-500",
        textPrimary: "text-white",
        textSecondary: "text-gray-400",
        btnBg: "bg-[#C2185B] text-white",
        innerCardBg: "bg-black/10 border-white/5",
        subProgressRingBg: "stroke-white/5"
      };
    } else {
      return {
        headerBg: `bg-gradient-to-br ${timeTheme.bgGradient} ${timeTheme.textPrimary}`,
        cardBg: "bg-white border-gray-100 hover:bg-gray-50/50 text-gray-900",
        cardClasses: timeTheme.cardClasses,
        pillBg: "bg-gray-100 text-gray-600",
        textGold: "text-[#C2185B]",
        textPrimary: "text-gray-950",
        textSecondary: "text-gray-500",
        btnBg: "bg-primary text-white",
        innerCardBg: "bg-gray-50 border-gray-100",
        subProgressRingBg: "stroke-gray-100"
      };
    }
  }, [theme, timeTheme]);

  const styles = isSpiritualActive ? fastingStyles : generalStyles;

  // +++ تم الإضافة لتنفيذ طلبك: كاشف التفاعلات العكسية للأدوية والأطعمة +++
  const medicineSymptomsConflicts = useMemo(() => {
    try {
      const savedWater = localStorage.getItem('local_water_logs') || '[]';
      const waterList = JSON.parse(savedWater);
      const todayWater = waterList.filter((w: any) => {
         const d = new Date(w.timestamp);
         const today = new Date();
         return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });
      
      const containsCaffeine = todayWater.some((w: any) => {
         const type = (w.beverageType || '').toLowerCase();
         return type.includes('قهوة') || type.includes('شاي') || type.includes('coffee') || type.includes('tea') || type.includes('كولا') || type.includes('بيبسي') || type.includes('coke') || type.includes('cola') || type.includes('كافيين') || type.includes('نسكافيه');
      });

      const savedSymptoms = localStorage.getItem('local_symptoms') || '[]';
      const symptomList = JSON.parse(savedSymptoms);
      const todaySymptoms = symptomList.filter((s: any) => {
         const d = new Date(s.timestamp);
         const today = new Date();
         return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      });
      
      const hasCrampsOrSpasms = todaySymptoms.some((s: any) => {
         const notes = (s.notes || '').toLowerCase();
         const syms = (s.symptoms || []).join(' ').toLowerCase();
         return notes.includes('مغص') || notes.includes('تشنج') || notes.includes('ألم') || notes.includes('وجع') ||
                syms.includes('مغص') || syms.includes('تشنج') || syms.includes('ألم') || syms.includes('وجع') ||
                syms.includes('cramp') || syms.includes('pain') || syms.includes('epigastric') || syms.includes('pelvis');
      });

      const hasPainkillerOrSpasmMed = medList.some((m: any) => {
         const name = (m.name || '').toLowerCase();
         return name.includes('panadol') || name.includes('aspirin') || name.includes('advil') || name.includes('buscopan') || name.includes('profen') || name.includes('مسكن') || name.includes('مغص') || name.includes('بندول');
      });

      if (containsCaffeine && (hasCrampsOrSpasms || hasPainkillerOrSpasmMed)) {
         const isFemaleUser = profile.gender === 'female';
         return {
            title: "كاشف التفاعلات العكسية النشط ⚠️",
            message: isFemaleUser
               ? "عزيزتي، لقد سجلتِ تناول الكافيين (قهوة/شاي) اليوم مع وجود أعراض مغص أو دواء مسكن نشط في صيدليتكِ. نود تنبيهكِ بأن الكافيين يضيق الأوعية الدموية وقد يعاكس أو يلغي تماماً مفعول مركبات مسكنات الألم ومضادات التقلص، مما يثبط جودة الاستشفاء ويزيد الآلام. جربي الشرب البديل الدافئ مثل البابونج أو النعناع لدعم فاعلية علاجكِ المبارك! ☕🌸"
               : "عزيزي، لقد سجلتَ تناول الكافيين (قهوة/شاي) اليوم مع وجود أعراض تشنج أو دواء مسكن نشط في صيدليتكَ. نود تنبيهكَ بأن الكافيين يضيق الأوعية الدموية وقد يعاكس أو يلغي تماماً مفعول مركبات مسكنات الألم ومضادات التقلص، مما يثبط جودة الاستشفاء ويزيد الآلام. جرب الشرب البديل الدافئ مثل البابونج أو النعناع لدعم فاعلية علاجكَ المبارك! ☕🌸",
            type: "warning"
         };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, [medList, waterCount]);
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // --- +++ أضيفت لتخصيص حجم وترتيب وظهور الكروت ديناميكياً بناءً على إعداداتك الفائقة +++ ---
  const renderWaterExpandedSection = () => {
     return (
       <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Quick Increments */}
          <div>
             <span className="text-[10px] font-black text-gray-400 block mb-2 text-right">اختر كمية المياه لإضافتها:</span>
             <div className="grid grid-cols-4 gap-2">
                {[100, 250, 400, 750].map((ml) => (
                   <button
                     type="button"
                     key={ml}
                     disabled={waterAdding}
                     onClick={async () => {
                        await handleLogDrinkFromModal(
                           ml,
                           ml === 100 ? 'رشفة ماء' : ml === 250 ? 'كوب ماء عادي' : ml === 400 ? 'كوب كبير مروٍ' : 'زجاجة عائلية كاملة',
                           1,
                           0, 0, 0, 0
                        );
                     }}
                     className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-transparent hover:border-sky-300 dark:hover:border-sky-900/50 text-center transition-all active:scale-95 cursor-pointer"
                   >
                      <p className="text-xs font-black text-sky-650 dark:text-sky-450">+{ml}</p>
                      <p className="text-[8px] text-gray-400 mt-1 leading-none font-sans">مل</p>
                   </button>
                ))}
             </div>
          </div>

          {/* Pinned custom drinks */}
          <div className="space-y-2 border-t border-gray-150/40 dark:border-white/5 pt-3 text-right">
             <span className="text-[10px] font-black text-gray-400 block pb-1">مشروباتك المثبتة وسريعة الإضافة:</span>
             {pinnedWaterList.length === 0 ? (
                <p className="text-[9px] text-gray-400 font-bold dark:text-gray-400 leading-relaxed font-sans">لم تقم بتثبيت أي مشروبات مخصصة بعد. افتح خلاط المشروبات دون إنترنت لتثبيت مشروب فريد!</p>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {pinnedWaterList.map((preset: any) => (
                      <div key={preset.displayName} className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-sky-100/30 dark:border-white/5 flex items-center justify-between gap-1.5 flex-row-reverse text-right">
                         <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => customTrackerStore.unpinWater(preset.displayName)}
                              className="w-7 h-7 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-rose-500/10 shrink-0"
                            >
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                         </div>
                         <button
                           type="button"
                           disabled={waterAdding}
                           onClick={async () => {
                              await handleLogDrinkFromModal(
                                 preset.ml,
                                 preset.displayName,
                                 preset.effectiveHydration / preset.ml,
                                 preset.totalCalories,
                                 0, 0, 0
                              );
                           }}
                           className="flex-1 flex items-center justify-between gap-1 text-right bg-transparent border-0 outline-none select-none cursor-pointer active:scale-95 transition-all flex-row-reverse overflow-hidden"
                         >
                            <div className="text-right overflow-hidden">
                               <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 leading-tight truncate font-sans">{preset.beverageName}</p>
                               <p className="text-[8.5px] text-gray-400 font-bold mt-1 leading-none font-mono">{preset.ml}مل | {preset.totalCalories} سعرة</p>
                            </div>
                            <span className="text-[9.5px] font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 px-2.5 py-1 rounded-xl shrink-0 font-mono">
                               +{preset.ml}مل
                            </span>
                         </button>
                      </div>
                   ))}
                </div>
             )}
          </div>

          {/* Beverage blender button */}
          <div className="pt-2">
             <button
               type="button"
               onClick={() => {
                  setSelectedPresetForEdit(null);
                  setIsDrinkCreatorOpen(true);
               }}
               className="w-full py-2.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 hover:from-sky-600 hover:to-amber-600 text-white font-black text-xs rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer border-0"
             >
                <Sparkles className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
                <span>🧪 فتح خلاط ومصمم تركيبات المشروبات الذكي</span>
             </button>
          </div>
       </div>
     );
  };

  const renderDietExpandedSection = () => {
     return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
           {/* Form quick add */}
           <div className="space-y-2">
              <span className="text-[10px] font-black text-gray-400 block text-right">١. تسجيل وجبة وسعرات مخصصة:</span>
              <div className="flex gap-2 text-right">
                 <input 
                    type="text" 
                    placeholder="اسم الوجبة (مثال: تفاحة)" 
                    value={quickMealName}
                    onChange={(e) => setQuickMealName(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-gray-50/70 dark:bg-[#1E1E1E] border border-gray-150 dark:border-white/5 rounded-xl outline-none focus:border-emerald-300 dark:focus:border-emerald-800 text-right text-gray-800 dark:text-white"
                 />
                 <input 
                    type="number" 
                    placeholder="السعرات" 
                    value={quickMealCalories}
                    onChange={(e) => setQuickMealCalories(e.target.value)}
                    className="w-20 text-xs px-3 py-2 bg-gray-50/70 dark:bg-[#1E1E1E] border border-gray-150 dark:border-white/5 rounded-xl outline-none focus:border-emerald-300 dark:focus:border-emerald-800 text-center text-gray-800 dark:text-white font-sans"
                 />
                 <button
                    type="button"
                    disabled={dietAdding || !quickMealName || !quickMealCalories}
                    onClick={() => {
                       handleAddMealCustom(quickMealName, Number(quickMealCalories));
                       setQuickMealName('');
                       setQuickMealCalories('');
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 transition-all text-white text-xs font-black rounded-xl active:scale-95 shadow-sm shrink-0 cursor-pointer"
                 >
                    تسجيل
                 </button>
              </div>
           </div>

           {/* Interactive Diet selector tab */}
           <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black text-gray-400 block text-right">
                    ٢. أطعمة سريعة حميتك المفرزة اليوم:
                 </span>
              </div>

              {/* Tabs list */}
              <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-hide flex-row-reverse text-right" dir="rtl">
                 {getDietTabs().map((tab) => {
                    const isActive = (activeDietTab || getDietTabs()[0].id) === tab.id;
                    return (
                       <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDietTab(tab.id)}
                          className={cn(
                             "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all shrink-0 border cursor-pointer flex items-center gap-1 font-sans",
                             isActive 
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                                : "bg-gray-50 dark:bg-[#1C1F20]/50 text-gray-650 dark:text-gray-350 border-gray-100/50 dark:border-white/5 hover:border-emerald-500/30"
                          )}
                       >
                          <span>{tab.icon}</span>
                          <span>{tab.label}</span>
                       </button>
                    );
                 })}
              </div>

              {/* Tab options item list */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-row-reverse text-right" dir="rtl">
                 {getFoodItemsForTab(activeDietTab || getDietTabs()[0].id).map((item) => (
                    <button
                       type="button"
                       key={item.name}
                       disabled={dietAdding}
                       onClick={() => handleAddMealCustom(item.name, item.cal)}
                       className="px-3 py-2 bg-emerald-500/5 hover:bg-emerald-500/15 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-500/10 dark:border-emerald-500/20 rounded-xl text-[10px] font-black text-gray-800 dark:text-gray-200 flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                       <Plus className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                       <span>{item.icon}</span> 
                       <span>{item.name} (+{item.cal} س)</span>
                    </button>
                 ))}
              </div>
           </div>

           {/* Favorites / pinned dict list */}
           <div className="space-y-2 border-t border-gray-100/40 dark:border-white/5 pt-3">
              <span className="text-[10px] font-black text-gray-400 block text-right">٣. وجباتي وأكلاتي الذكية المثبتة (📌):</span>
              {pinnedDietList.length === 0 ? (
                 <div className="text-[10px] text-gray-400 dark:text-gray-500 italic p-3 border border-dashed border-gray-150 dark:border-white/5 rounded-2xl text-center">
                    لا توجد وجبات مثبتة حالياً. استخدم صانع الوجبات الذكي لتثبيت أكلاتك المفضلة!
                 </div>
              ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="rtl">
                    {pinnedDietList.map((preset: any) => (
                       <div 
                          key={preset.displayName}
                          onClick={() => handleAddMealCustom(preset.displayName, preset.totalCalories, preset.totalCarbs, preset.totalFats, preset.totalProtein)}
                          className="p-2 w-full rounded-xl border border-emerald-500/15 bg-white/45 dark:bg-[#161917]/70 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 transition-all cursor-pointer flex justify-between items-center text-right group/diet-item shadow-xs"
                       >
                          <div className="flex items-center gap-2 flex-row text-right" dir="rtl">
                             <div className="w-7 h-7 rounded-lg bg-emerald-550/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                             </div>
                             <div>
                                <h5 className="text-[10px] font-black text-gray-800 dark:text-gray-200 leading-tight">
                                   {preset.displayName}
                                </h5>
                                <div className="flex gap-1.5 text-[9px] text-gray-450 dark:text-gray-440 font-bold mt-0.5" dir="rtl">
                                   <span className="text-emerald-600 font-extrabold">{preset.totalCalories} س</span>
                                   <span>•</span>
                                   <span>ب: {preset.totalProtein || 0}ج</span>
                                   <span>•</span>
                                   <span>ك: {preset.totalCarbs || 0}ج</span>
                                   <span>•</span>
                                   <span>د: {preset.totalFats || 0}ج</span>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                             <button
                                type="button"
                                title="تعديل الوجبة"
                                onClick={() => {
                                   setSelectedDietPresetForEdit(preset);
                                   setIsDietCreatorOpen(true);
                                }}
                                className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10 active:scale-90 transition-all cursor-pointer"
                             >
                                <Edit3 className="w-3.5 h-3.5" />
                             </button>
                             <button
                                type="button"
                                title="حذف من المثبتات"
                                onClick={() => {
                                   customTrackerStore.unpinDiet(preset.displayName);
                                   window.dispatchEvent(new Event('dietQuickPinnedChanged'));
                                }}
                                className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-all cursor-pointer"
                             >
                                <Trash2 className="w-3.5 h-3.5" />
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>

           {/* Diet coach blender selector */}
           <div className="pt-2">
              <button
                 type="button"
                 onClick={() => {
                    setSelectedDietPresetForEdit(null);
                    setIsDietCreatorOpen(true);
                 }}
                 className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all shrink-0 cursor-pointer"
              >
                 <Sparkles className="w-3.5 h-3.5 fill-white" />
                 <span>افتح خلاط كوتش دايت الذكي لتصميم وجبة مثبتة مخصصة 🧪</span>
              </button>
           </div>
        </div>
     );
  };

  const renderMedsExpandedSection = () => {
     return (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
           <span className="text-[10px] font-black text-gray-400 block text-right">قائمة جدول الجرعات لليوم:</span>
           <div className="space-y-2">
              {medsStatus.activeMeds.map((med) => {
                 const today = new Date();
                 const isTakenToday = medLogs.some(log => {
                   const d = new Date(log.takenAt);
                   return log.medicationId === med.id &&
                          d.getDate() === today.getDate() &&
                          d.getMonth() === today.getMonth() &&
                          d.getFullYear() === today.getFullYear();
                 });

                 return (
                    <div 
                      key={med.id}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 flex items-center justify-between gap-2"
                    >
                       <div className="text-right">
                          <h5 className="text-xs font-black text-gray-800 dark:text-white leading-none flex items-center gap-1 flex-row-reverse">
                             <span>{med.name}</span>
                             {med.isCritical && (
                                <span className="text-[8px] bg-red-150 text-red-650 dark:bg-red-500/10 px-1 rounded font-sans">حرج</span>
                             )}
                          </h5>
                          <p className="text-[9px] text-gray-400 font-bold mt-1.5 leading-none font-sans">
                             الجرعة: {med.dosage || '--'} {med.form} • {med.instruction}
                          </p>
                       </div>

                       {isTakenToday ? (
                          <span className="text-[9px] font-black text-emerald-600 bg-emerald-550/10 dark:bg-emerald-950/40 border border-emerald-200/50 px-2 py-1 rounded-lg">
                             ✓ تم الأخذ
                          </span>
                       ) : (
                          <button
                            type="button"
                            disabled={medsLoggingId === med.id}
                            onClick={() => handleTakeMedicationQuick(med)}
                            className="px-2.5 py-1 text-[9px] font-black bg-indigo-500 hover:bg-indigo-600 transition-colors text-white rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 border-0"
                          >
                             {medsLoggingId === med.id ? "تسجيل..." : "أخذ جرعة 💊"}
                          </button>
                       )}
                    </div>
                 );
              })}
           </div>
        </div>
     );
  };

  const renderStepsExpandedSection = () => {
     return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center justify-between pb-1 flex-row-reverse">
              <span className="text-[10px] font-black text-gray-400 block text-right">تسجيل حركة سريعة اليوم:</span>
              <button
                type="button"
                onClick={() => navigate('/steps')}
                className="text-[9px] font-black text-emerald-650 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full hover:underline border-0 cursor-pointer font-sans"
              >
                التفاصيل والرسوم الحركية ←
              </button>
           </div>
           
           {/* Preset increments */}
           <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map((inc) => (
                 <button
                   type="button"
                   key={inc}
                   onClick={() => handleAddSteps(inc, 'إضافة سريعة')}
                   className="p-2.5 rounded-xl bg-white dark:bg-black/25 border border-emerald-100 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-700/30 text-center transition-all cursor-pointer active:scale-95"
                 >
                    <p className="text-xs font-black text-emerald-650 dark:text-emerald-400">+{inc.toLocaleString('ar-EG')}</p>
                    <p className="text-[8px] text-gray-400 mt-1">خطوة</p>
                 </button>
              ))}
           </div>

           {/* Manual entry row */}
           <div className="bg-white dark:bg-black/10 p-3 rounded-2xl border border-emerald-100/30 dark:border-white/5">
              <span className="text-[9.5px] font-black text-gray-500 block mb-2 text-right">📝 إدخال قيمة خطوات محددة:</span>
              <div className="flex gap-2">
                 <input 
                   id="custom_steps_field_side"
                   type="number"
                   placeholder="مثال: 3500 خطوة"
                   className="flex-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 text-[11px] font-bold text-gray-800 dark:text-white h-9 text-right font-sans"
                 />
                 <button
                   type="button"
                   onClick={() => {
                      const input = document.getElementById('custom_steps_field_side') as HTMLInputElement;
                      if (input) {
                         const val = parseInt(input.value);
                         if (val > 0) {
                            handleAddSteps(val, 'إدخال مخصص');
                            input.value = '';
                         }
                      }
                   }}
                   className="bg-emerald-500 text-white rounded-xl px-3.5 py-1.5 hover:bg-emerald-600 transition-colors text-[10px] font-black h-9 cursor-pointer border-0"
                 >
                    سجل الآن
                 </button>
              </div>
           </div>

           {/* Sessions logged history today */}
           <div>
              <span className="text-[10px] font-black text-gray-400 block mb-1.5 text-right">📋 جلسات الحركة المسجلة اليوم:</span>
              {stepLogs.filter((log: any) => {
                 const d = new Date(log.timestamp);
                 const t = new Date();
                 return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
              }).length === 0 ? (
                 <div className="text-center py-2 text-gray-450 text-[9px] font-bold">لم تسجل أي حركة اليوم بعد. ابدأ بالحركة ليكون ممشاك واعداً! 🚶‍♂️🌟</div>
              ) : (
                 <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                    {stepLogs.filter((log: any) => {
                       const d = new Date(log.timestamp);
                       const t = new Date();
                       return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
                    }).map((log: any, idx: number) => (
                       <div key={log.id || idx} className="bg-white dark:bg-[#1A1A1A] p-2 rounded-xl flex items-center justify-between flex-row-reverse text-right text-[10px] border border-gray-100/50 dark:border-white/5">
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                             <span className="text-emerald-500">👟</span>
                             <span className="font-extrabold text-gray-800 dark:text-gray-200">{(log.steps || 0).toLocaleString('ar-EG')} خطوة</span>
                             <span className="text-gray-400 text-[9px] font-sans">({log.context || 'إضافة سريعة'})</span>
                          </div>
                          <span className="text-gray-400 text-[8.5px] font-sans">
                             {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
     );
  };

  const renderSleepExpandedSection = () => {
     return (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
           <div className="flex items-center justify-between pb-1 flex-row-reverse">
              <span className="text-[10px] font-black text-gray-400 block text-right font-sans">تسجيل وإدارة النوم اليومي:</span>
              <button
                type="button"
                onClick={() => navigate('/sleep')}
                className="text-[9px] font-black text-indigo-655 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-full hover:underline border-0 cursor-pointer font-sans"
              >
                التفاصيل والتقارير النفسية ←
              </button>
           </div>

           <div>
              <span className="text-[10px] font-black text-gray-400 block mb-2 text-right">اختر مدة النوم لتسجيلها لليوم:</span>
              <div className="grid grid-cols-4 gap-2">
                 {[6, 7, 8, 9].map((hours) => (
                    <button
                      type="button"
                      key={hours}
                      disabled={sleepAdding}
                      onClick={() => handleAddSleepCustom(hours)}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-300 dark:hover:border-purple-850 text-center transition-all active:scale-95 font-sans"
                    >
                       <p className="text-xs font-black text-purple-650 dark:text-purple-400 leading-none font-mono">{hours}</p>
                       <p className="text-[8px] text-gray-400 mt-1 leading-none">ساعات</p>
                    </button>
                 ))}
              </div>
           </div>

           {/* Quick state select */}
           <div className="space-y-2 border-t border-gray-150/40 dark:border-white/5 pt-3">
              <span className="text-[10px] font-black text-gray-550 block mb-2 text-right">كيف تصف حالتك المزاجية والنفسية الآن؟</span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                 {[
                    { key: 'refreshed', text: '🔋 نشط ومسترخٍ', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' },
                    { key: 'good', text: '😊 مزاج ممتاز وطبيعي', cls: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600' },
                    { key: 'tired', text: '🥱 متعب كأثير الكسل', cls: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' },
                    { key: 'stressed', text: '🤯 تحت الضغط والقلق', cls: 'bg-rose-50 dark:bg-[#1C1113] text-rose-600' }
                 ].map((md) => (
                    <button
                      type="button"
                      key={md.key}
                      onClick={() => {
                         localStorage.setItem('user_mood', md.key);
                         setMood(md.key);
                      }}
                      className={cn("px-2 py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer font-sans active:scale-95",
                         mood === md.key ? `${md.cls} border-current` : 'bg-white dark:bg-white/5 text-gray-505 border-transparent'
                      )}
                    >
                       {md.text}
                    </button>
                 ))}
              </div>
           </div>
        </div>
     );
  };

  const renderCardByKey = (cardKey: string) => {
    const isVisible = cardSettings.visible[cardKey];
    if (!isVisible) return null;

    const size = cardSettings.sizes[cardKey] || 'md';

    switch (cardKey) {
      case 'water': {
        if (shouldHideWaterCard) {
          return (
            <div key="water" className="rounded-[24px] p-4 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 mb-2 flex flex-row-reverse items-center justify-between text-right shadow-xs">
               <div className="flex items-center gap-2 flex-row-reverse">
                  <span className="text-lg">🌙</span>
                  <div className="text-right">
                     <h4 className="text-[10.5px] font-black text-amber-900 dark:text-amber-400">تم إخفاء كارت شرب الماء ومستكشف الارتواء</h4>
                     <p className="text-[8.5px] text-amber-800/80 dark:text-amber-300/80 font-bold mt-1">تطبيقاً لوضع الصيام الفعّال لليوم 🌅 تقبل الله صيامكم!</p>
                  </div>
               </div>
            </div>
          );
        }
        const isSm = size === 'sm';
        const isLg = size === 'lg';
        return (
          <div 
             key="water"
             id="dashboard-water-card"
             onClick={() => setIsWaterCardExpanded(!isWaterCardExpanded)}
             className={cn(
               "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
               activeCardHighlight === 'water' ? "ring-4 ring-offset-2 ring-sky-400 dark:ring-sky-550 shadow-2xl scale-[1.01] z-20" : "",
               isFastingMode ? "bg-[#091724]" : "bg-gradient-to-br from-sky-50/20 to-white dark:from-[#112430] dark:to-[#1A1A1A] border-sky-100/50 dark:border-sky-950/20 hover:border-sky-250"
             )}
          >
             {isSm ? (
                <div className="flex justify-between items-center flex-row-reverse w-full gap-2 relative z-10">
                   <div className="flex items-center gap-1.5 flex-row-reverse text-sky-650 dark:text-sky-455">
                      <Droplets className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                      <span className="font-black text-xs leading-none">مستكشف الارتواء 💧</span>
                   </div>
                   <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold font-mono leading-none">
                         {(waterCount/1000).toFixed(1)} / {(dailyWaterGoal/1000).toFixed(1)} لتر
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           handleAddWater();
                        }}
                        disabled={waterAdding}
                        className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[9px] font-black cursor-pointer border-0 active:scale-95 transition-all shrink-0"
                      >
                         رشفة (+٢٥٠مل)
                      </button>
                   </div>
                </div>
             ) : (
                <>
                   <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
                      <div className="flex items-center gap-2 flex-row-reverse text-sky-650 dark:text-sky-400">
                         <Droplets className="w-4 h-4 text-sky-500" />
                         <span className="font-black text-xs leading-none">مستكشف الارتواء الذكي 💧</span>
                      </div>
                      <div className="flex gap-1.5 flex-row-reverse">
                         <span className="text-[9px] text-[#A27B5C] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 dark:text-[#E2C799]">
                            {isFastingMode ? "وقت الإفطار نشط" : "أوفلاين بالكامل 📡"}
                         </span>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             navigate('/water');
                           }}
                           className="text-[9px] font-black text-sky-600 dark:text-sky-450 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 rounded-full hover:bg-sky-100 transition-colors border-0 cursor-pointer"
                         >
                            التفاصيل والتأثير ←
                         </button>
                      </div>
                   </div>

                   <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                      <div className="relative w-11 h-11 rounded-full border border-sky-100 dark:border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-sm bg-white/40 dark:bg-black/10">
                         <div 
                           className="absolute bottom-0 left-0 right-0 bg-sky-400/30 dark:bg-sky-500/25 transition-all duration-700"
                           style={{ height: `${Math.min(100, (waterCount / dailyWaterGoal) * 100)}%` }}
                         />
                         <div className="relative z-10 text-[10px] font-black text-sky-600 dark:text-sky-400 font-mono">
                            {Math.round((waterCount / dailyWaterGoal) * 100)}%
                         </div>
                      </div>

                      <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                         <div>
                            <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                               الارتواء اليومي المخطط له لجسدك
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                               استهلكت <span className="text-sky-605 font-extrabold">{waterCount} مل</span> من هدفك المفرغ <span className="font-extrabold">({dailyWaterGoal} مل)</span>
                            </p>
                         </div>
                         <div className="w-full mt-2.5">
                            <div className="w-full h-1.5 bg-sky-100 dark:bg-sky-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                               <div className="bg-sky-500 h-full transition-all" style={{ width: `${(waterCount / dailyWaterGoal) * 100}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {isLg && (
                      <div className="mt-3 pt-2.5 border-t border-sky-100/30 dark:border-white/5 text-right relative z-10" dir="rtl">
                         <span className="text-[8.5px] text-sky-650 dark:text-sky-450 font-bold block leading-relaxed">
                            💡 هل تعلم؟ الحفاظ على شرب الماء يعزز كفاءة عملية حرق السعرات الحرارية اليومية بنسبة تزيد على ٢٠٪ ويصقل أداء مفاصلك!
                         </span>
                      </div>
                   )}

                   <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                      {isWaterCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لفتح خلاط المشروبات وتثبيت تركيبتك المفضلة ▼"}
                   </div>
                </>
             )}

             <AnimatePresence>
                {isWaterCardExpanded && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0, marginTop: 0 }}
                     animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                     exit={{ opacity: 0, height: 0, marginTop: 0 }}
                     className="pt-4 border-t border-sky-100/40 dark:border-white/5 relative z-10 space-y-4 overflow-hidden text-right bg-sky-500/[0.02] p-3 rounded-2xl"
                     dir="rtl"
                   >
                      {renderWaterExpandedSection()}
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        );
      }
      case 'diet': {
        const isSm = size === 'sm';
        const isLg = size === 'lg';
        return (
          <div 
            key="diet"
            id="dashboard-diet-card"
            onClick={() => setIsDietCardExpanded(!isDietCardExpanded)}
            className={cn(
              "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
              activeCardHighlight === 'diet' ? "ring-4 ring-offset-2 ring-emerald-400 dark:ring-emerald-500 shadow-2xl scale-[1.01] z-20" : "",
              isFastingMode ? "bg-[#091D17] border-emerald-955/45 hover:bg-[#0c2a21]" : "bg-gradient-to-br from-emerald-50/20 to-white dark:from-[#1B241F] dark:to-[#1A1A1A] border-emerald-100/50 dark:border-emerald-950/20 hover:border-emerald-250"
            )}
          >
             {isSm ? (
                <div className="flex justify-between items-center flex-row-reverse w-full gap-2 relative z-10">
                   <div className="flex items-center gap-1.5 flex-row-reverse text-emerald-600 dark:text-emerald-400">
                      <Utensils className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                      <span className="font-black text-xs leading-none">تغذيتي وسعراتي 🍏</span>
                   </div>
                   <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold font-mono leading-none">
                         {loggedCalories} / ٢,٠٠٠ سعرة
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           navigate('/diet');
                        }}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black cursor-pointer border-0 active:scale-95 transition-all shrink-0"
                      >
                         الوجبات ←
                      </button>
                   </div>
                </div>
             ) : (
                <>
                   <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
                      <div className="flex items-center gap-2 flex-row-reverse text-emerald-600 dark:text-emerald-400">
                         <Utensils className="w-4 h-4 text-emerald-500" />
                         <span className="font-black text-xs leading-none">تغذيتي وسعراتي اليومية 🍏</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/diet');
                        }}
                        className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-990/20 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors border-0 cursor-pointer"
                      >
                         التفاصيل والوجبات ←
                      </button>
                   </div>

                   <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs shrink-0">
                         {Math.round(dietScore)}%
                      </div>

                      <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                         <div>
                            <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                               تسجيل واستهلاك السعرات الحرارية
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                               تم تسجيل <span className="text-emerald-600 font-extrabold">{loggedCalories} سعرة</span> من الحد اليومي الموصى به <span className="font-extrabold">(2000 سعرة)</span>
                            </p>
                         </div>
                         <div className="w-full mt-2.5">
                            <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                               <div className="bg-emerald-500 h-full transition-all" style={{ width: `${dietScore}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {isLg && (
                      <div className="mt-3.5 pt-2.5 border-t border-emerald-100/30 dark:border-white/5 flex flex-col gap-1.5 text-right relative z-10" dir="rtl">
                         <div className="flex justify-between items-center text-[8.5px] font-extrabold text-[#115E59] dark:text-[#A7F3D0]">
                             <span>كربوهيدرات: ٣٢٪</span>
                             <span>بروتين: ٤٥٪</span>
                             <span>دهون: ٢٣٪</span>
                         </div>
                         <div className="w-full h-1.5 bg-emerald-150/30 dark:bg-emerald-950/20 rounded-full flex overflow-hidden">
                             <div className="bg-emerald-400 h-full" style={{ width: '32%' }}></div>
                             <div className="bg-emerald-600 h-full" style={{ width: '45%' }}></div>
                             <div className="bg-amber-400 h-full" style={{ width: '23%' }}></div>
                         </div>
                      </div>
                   )}

                   <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                      {isDietCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتسجيل وجبة جديدة فوراً ▼"}
                   </div>
                </>
             )}

             <AnimatePresence>
                {isDietCardExpanded && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0, marginTop: 0 }}
                     animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                     exit={{ opacity: 0, height: 0, marginTop: 0 }}
                     className="pt-4 border-t border-emerald-100 dark:border-emerald-950/20 relative z-10 space-y-4 overflow-hidden text-right bg-emerald-500/[0.01]"
                     dir="rtl"
                     onClick={(e) => e.stopPropagation()}
                   >
                      {renderDietExpandedSection()}
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        );
      }
      case 'meds': {
        const isSm = size === 'sm';
        const isLg = size === 'lg';
        return (
          <div 
            key="meds"
            id="dashboard-meds-card"
            onClick={() => setIsMedsCardExpanded(!isMedsCardExpanded)}
            className={cn(
              "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
              activeCardHighlight === 'meds' ? "ring-4 ring-offset-2 ring-indigo-400 dark:ring-indigo-500 shadow-2xl scale-[1.01] z-20" : "",
              isFastingMode ? "bg-[#091D17] border-emerald-955/45 hover:bg-[#0c2a21]" : "bg-gradient-to-br from-indigo-50/20 to-white dark:from-[#1B1E29] dark:to-[#1A1A1A] border-indigo-100/50 dark:border-indigo-950/20 hover:border-indigo-250"
            )}
          >
             {isSm ? (
                <div className="flex justify-between items-center flex-row-reverse w-full gap-2 relative z-10">
                   <div className="flex items-center gap-1.5 flex-row-reverse text-indigo-650 dark:text-indigo-400">
                      <Pill className="w-4.5 h-4.5 text-indigo-550 shrink-0" />
                      <span className="font-black text-xs leading-none">الأدوية والمكملات 💊</span>
                   </div>
                   <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold font-mono leading-none">
                         {medsStatus.takenCount} / {medsStatus.totalScheduled} جرعة
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           navigate('/medications');
                        }}
                        className="px-2.5 py-1 bg-indigo-500 text-white rounded-lg text-[9px] font-black cursor-pointer border-0 active:scale-95 transition-all shrink-0"
                      >
                         الجدول ←
                      </button>
                   </div>
                </div>
             ) : (
                <>
                   <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
                      <div className="flex items-center gap-2 flex-row-reverse text-indigo-655 dark:text-indigo-400">
                         <Pill className="w-4 h-4 text-indigo-500" />
                         <span className="font-black text-xs leading-none">أدويتي ومكملاتي اليومية 💊</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/medications');
                        }}
                        className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-995/20 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors border-0 cursor-pointer"
                      >
                         التفاصيل والجدول ←
                      </button>
                   </div>

                   <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs shrink-0">
                         {medsStatus.percent}%
                      </div>

                      <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                         <div>
                            <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                               جدول الالتزام بجرعات أدوية اليوم
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                               تم أخذ <span className="text-indigo-600 font-extrabold">{medsStatus.takenCount} جرعة</span> من إجمالي <span className="font-extrabold">{medsStatus.totalScheduled} جرعات مجدولة</span> اليوم
                            </p>
                         </div>
                         <div className="w-full mt-2.5">
                            <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                               <div className="bg-indigo-500 h-full transition-all" style={{ width: `${medsStatus.percent}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {isLg && (
                      <div className="mt-3.5 pt-2.5 border-t border-indigo-100/30 dark:border-white/5 text-right relative z-10" dir="rtl">
                         <span className="text-[8.5px] text-rose-600 dark:text-rose-450 font-extrabold flex items-center gap-1 flex-row-reverse">
                             <span>💊 تنبيه جرعة حرجة: يرجى تنظيم مخزون أدويتك؛ تبدو بعض الأدوية قاب قوسين من النفاد (أقل من ٥ قرص)!</span>
                         </span>
                      </div>
                   )}

                   <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                      {isMedsCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتعليم جرعة دواء كـ مأخوذة فوراً ▼"}
                   </div>
                </>
             )}

             <AnimatePresence>
                {isMedsCardExpanded && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0, marginTop: 0 }}
                     animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                     exit={{ opacity: 0, height: 0, marginTop: 0 }}
                     className="pt-4 border-t border-indigo-100 dark:border-indigo-950/20 relative z-10 space-y-2.5 overflow-hidden text-right"
                     dir="rtl"
                     onClick={(e) => e.stopPropagation()}
                   >
                      {renderMedsExpandedSection()}
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        );
      }
      case 'steps': {
        const isSm = size === 'sm';
        const isLg = size === 'lg';
        return (
          <div 
            key="steps"
            id="dashboard-steps-card"
            onClick={() => setIsStepsCardExpanded(!isStepsCardExpanded)}
            className={cn(
              "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
              activeCardHighlight === 'steps' ? "ring-4 ring-offset-2 ring-emerald-400 dark:ring-emerald-500 shadow-2xl scale-[1.01] z-20" : "",
              isFastingMode ? "bg-[#0B1528] border-blue-955/44 hover:bg-[#0e213b]" : "bg-gradient-to-br from-emerald-50/10 to-white dark:from-[#0f1d17] dark:to-[#121c17] border-emerald-150/30 dark:border-emerald-950/20 hover:border-emerald-250"
            )}
          >
             {isSm ? (
                <div className="flex justify-between items-center flex-row-reverse w-full gap-2 relative z-10">
                   <div className="flex items-center gap-1.5 flex-row-reverse text-emerald-600 dark:text-emerald-400">
                      <Footprints className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                      <span className="font-black text-xs leading-none">الممشى والمجهود 👟</span>
                   </div>
                   <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold font-mono leading-none">
                         {stepCount.toLocaleString('ar-EG')} / ١٠,٠٠٠
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           handleAddSteps(1000, 'إضافة سريعة');
                        }}
                        className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black cursor-pointer border-0 active:scale-95 transition-all shrink-0"
                      >
                         خطوات (+١,٠٠٠)
                      </button>
                   </div>
                </div>
             ) : (
                <>
                   <div className="flex justify-between items-start flex-row-reverse w-full relative z-10 mb-3">
                      <div className="flex items-center gap-2 flex-row-reverse text-emerald-605 dark:text-emerald-400">
                         <Footprints className="w-4.5 h-4.5 text-emerald-500 shrink-0 animate-pulse" />
                         <span className="font-black text-xs leading-none">عداد الممشى والخطوات 👟</span>
                      </div>
                      <span className="text-[8.5px] font-black bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-mono">
                         {Math.round((stepCount / 10000) * 100)}%
                      </span>
                   </div>

                   <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs shrink-0">
                         {Math.round((stepCount / 10000) * 100)}%
                      </div>

                      <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                         <div>
                            <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                               مستوى النشاط والحرق اليومي للحركة
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                               سجلت <span className="text-emerald-600 font-extrabold">{stepCount.toLocaleString('ar-EG')} خطوة</span> من هدفك المفرغ <span className="font-extrabold">(١٠,٠٠٠ خطوة)</span>
                            </p>
                         </div>
                         <div className="w-full mt-2.5">
                            <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                               <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min(100, (stepCount / 10000) * 100)}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {isLg && (
                      <div className="mt-3.5 pt-2.5 border-t border-emerald-100/30 dark:border-white/5 text-right relative z-10" dir="rtl">
                         <span className="text-[8.5px] text-emerald-700 dark:text-emerald-405 font-bold block leading-relaxed">
                            💡 مجهود رائع! مشيك المنتظم يحرق السعرات الحرارية، ويقوي عضلة قلبك، ويرسخ صفاء ذهنك. واصل النشاط!
                         </span>
                      </div>
                   )}

                   <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                      {isStepsCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتسجيل وحساب النشاط فوراً ▼"}
                   </div>
                </>
             )}

             <AnimatePresence>
                {isStepsCardExpanded && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0, marginTop: 0 }}
                     animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                     exit={{ opacity: 0, height: 0, marginTop: 0 }}
                     className="pt-4 border-t border-emerald-100 dark:border-emerald-950/20 relative z-10 space-y-4 overflow-hidden text-right p-3 rounded-2xl bg-emerald-500/[0.02]"
                     dir="rtl"
                     onClick={(e) => e.stopPropagation()}
                   >
                      {renderStepsExpandedSection()}
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        );
      }
      case 'sleep': {
        const isSm = size === 'sm';
        const isLg = size === 'lg';
        return (
          <div 
            key="sleep"
            id="dashboard-sleep-card"
            onClick={() => setIsSleepCardExpanded(!isSleepCardExpanded)}
            className={cn(
              "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
              activeCardHighlight === 'sleep' ? "ring-4 ring-offset-2 ring-indigo-400 dark:ring-indigo-600 shadow-2xl scale-[1.01] z-20" : "",
              isFastingMode ? "bg-[#0F1026] border-indigo-950/45 hover:bg-[#151736]" : "bg-gradient-to-br from-[#EEF2FF] to-white dark:from-[#110f24] dark:to-[#0D0B18] border-indigo-150/30 dark:border-indigo-950/20 hover:border-indigo-250"
            )}
          >
             {isSm ? (
                <div className="flex justify-between items-center flex-row-reverse w-full gap-2 relative z-10">
                   <div className="flex items-center gap-1.5 flex-row-reverse text-indigo-600 dark:text-indigo-455">
                      <Moon className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                      <span className="font-black text-xs leading-none">النوم والراحة 😴</span>
                   </div>
                   <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold font-mono leading-none">
                         {sleepHours.toFixed(1)} س | {mood === 'refreshed' ? '🔋 نشط' : mood === 'good' ? '😊 جيد' : '✨ مستقر'}
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           navigate('/sleep');
                        }}
                        className="px-2.5 py-1 bg-indigo-500 text-white rounded-lg text-[9px] font-black cursor-pointer border-0 active:scale-95 transition-all shrink-0"
                      >
                         النوم ←
                      </button>
                   </div>
                </div>
             ) : (
                <>
                   <div className="flex justify-between items-start flex-row-reverse w-full relative z-10 mb-3">
                      <div className="flex items-center gap-2 flex-row-reverse text-indigo-605 dark:text-indigo-400">
                         <Moon className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                         <span className="font-black text-xs leading-none">جودة النوم والراحة اليومية 😴</span>
                      </div>
                      <span className="text-[8.5px] font-black bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-mono">
                         {sleepHours >= (profile.targetSleep || 8) ? "كافٍ" : "قليل"}
                      </span>
                   </div>

                   <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs shrink-0">
                         {Math.round(sleepScore)}%
                      </div>

                      <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                         <div>
                            <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                               ساعات النوم المريحة ومزاجك اليومي
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                               لقد نمت <span className="text-indigo-605 font-extrabold">{(sleepHours).toFixed(1)} ساعة</span> من هدفك المفرغ <span className="font-extrabold">({profile.targetSleep || 8} ساعات)</span>
                            </p>
                         </div>
                         <div className="w-full mt-2.5">
                            <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                               <div className="bg-indigo-500 h-full transition-all" style={{ width: `${sleepScore}%` }}></div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {isLg && (
                      <div className="mt-3.5 pt-2.5 border-t border-indigo-100/30 dark:border-white/5 text-right relative z-10" dir="rtl">
                         <span className="text-[8.5px] text-indigo-700 dark:text-indigo-405 font-bold block leading-relaxed">
                            💡 نصيحة النوم: الابتعاد عن الشاشات والضوء الأزرق ٤٥ دقيقة قبل النوم يحفز إفراز الميلاتونين الطبيعي ويزيد النوم العميق بنسبة ٥٠٪!
                         </span>
                      </div>
                   )}

                   <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                      {isSleepCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتسجيل جودة النوم والراحة فوراً ▼"}
                   </div>
                </>
             )}

             <AnimatePresence>
                {isSleepCardExpanded && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0, marginTop: 0 }}
                     animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                     exit={{ opacity: 0, height: 0, marginTop: 0 }}
                     className="pt-4 border-t border-indigo-100 dark:border-indigo-950/20 relative z-10 space-y-4 overflow-hidden text-right p-3 rounded-2xl bg-indigo-500/[0.02]"
                     dir="rtl"
                     onClick={(e) => e.stopPropagation()}
                   >
                      {renderSleepExpandedSection()}
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        );
      }
      case 'spouse_advice': {
        if (profile?.maritalStatus !== 'married') return null;
        const isSm = size === 'sm';
        const isLg = size === 'lg';
        return (
          <div 
             key="spouse_advice"
             id="dashboard-spouse-card"
             onClick={() => setIsSpousePsychologyExpanded(!isSpousePsychologyExpanded)}
             className={cn(
                "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
                activeCardHighlight === 'spouse_advice' ? "ring-4 ring-offset-2 ring-rose-450 dark:ring-rose-550 shadow-2xl scale-[1.01] z-20" : "",
                isFastingMode ? "bg-[#181119] border-rose-955/45 hover:bg-[#251b27]" : "bg-gradient-to-br from-[#FFF5F7] to-white dark:from-[#211116] dark:to-[#0D0B0C] border-rose-150/30 dark:border-rose-950/20 hover:border-rose-250"
             )}
          >
             {isSm ? (
                <div className="flex justify-between items-center flex-row-reverse w-full gap-2 relative z-10">
                   <div className="flex items-center gap-1.5 flex-row-reverse text-rose-600 dark:text-rose-405">
                      <Heart className="w-4.5 h-4.5 text-rose-500 shrink-0 fill-rose-500 animate-pulse" />
                      <span className="font-black text-xs leading-none">مستشار السعادة 💍</span>
                   </div>
                   <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-extrabold leading-none">
                         {marriageStreak} أيام مودة
                      </span>
                      <button 
                        type="button"
                        onClick={(e) => {
                           e.stopPropagation();
                           const n = marriageStreak + 1;
                           setMarriageStreak(n);
                           localStorage.setItem('user_marriage_streak', n.toString());
                        }}
                        className="px-2.5 py-1 bg-gradient-to-r from-rose-500 to-indigo-500 text-white rounded-lg text-[9px] font-black cursor-pointer border-0 active:scale-95 transition-all shrink-0 animate-none"
                      >
                         مودة+
                      </button>
                   </div>
                </div>
             ) : (
                <>
                   <div className="flex justify-between items-start flex-row-reverse w-full relative z-10 mb-3">
                      <div className="flex items-center gap-2 flex-row-reverse text-rose-600 dark:text-rose-400">
                         <Heart className="w-4.5 h-4.5 text-rose-555 shrink-0 fill-rose-500" />
                         <span className="font-black text-xs leading-none">مستشار السعادة وعمود البيت الزوجي 💍</span>
                      </div>
                      <span className="text-[8.5px] font-black bg-rose-500/10 dark:bg-rose-550/20 text-rose-600 dark:text-rose-300 px-2.5 py-1 rounded-full font-sans">
                         المودة والرحمة
                      </span>
                   </div>

                   <div className="relative z-10 text-right space-y-3" dir="rtl">
                      <div className="p-3.5 border border-rose-100/10 bg-white/40 dark:bg-black/20 text-right overflow-hidden font-sans rounded-2xl">
                         <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-bold">
                            {profile?.gender === 'female' ? (
                               <>
                                  {cycleStatus.phase === 'menstrual' && "أنتِ الآن في مرحلة الحيض؛ الهرمونات منخفضة وقد تشعرين بالتعب وتقلب المزاج. ننصحكِ بمشاركة زوجكِ بلطف أنكِ تحتاجين لبعض الهدوء والدعم، واطلبي منه كوباً دافئاً؛ فتفهمُكما المتبادل يقوي العلاقة في أصعب الأوقات."}
                                  {cycleStatus.phase === 'postpartum' && "أنتِ في مرحلة الاستشفاء الحساسة بعد الولادة (🤱 النفاس). شاركي مشاعركِ واحتياجكِ الجسدي والهدوء ليمر تعافي جسدك بسلام ومودة متبادلة."}
                                  {cycleStatus.phase === 'pregnancy' && "أنتِ في رحلة الحمل المباركة 🤰🏻. ننصحكِ بالتواصل المستمر مع زوجكِ; شاركيه تطور نمو الجنين، وعبّري عن محبتكِ وتقديركِ لدعمه ومساندته النفسية الرائعة لكِ."}
                                  {cycleStatus.phase !== 'menstrual' && cycleStatus.phase !== 'postpartum' && cycleStatus.phase !== 'pregnancy' && (
                                     mood === 'stressed' 
                                       ? "تبدين متوترة ومثقلة اليوم نتيجة لضغوط اليوم وتغير الهرمونات. تذكري أن تبتسمي لزوجك واطلبي منه التدليل أو الحوار الهادئ لتقليل هرمونات التوتر (الكورتيزول) وزيادة هرمون الأوكسيتوسين."
                                       : mood === 'tired'
                                         ? "تشعرين بالتعب والمجهود اليوم. ننصحك بنيل قسط وافر من الراحة، ومشاركة زوجك حديثاً هادئاً حول تفاصيل يومكما لتذوب الضغوط."
                                         : "مستوى هرموناتك ونفسيتكِ مستقر اليوم (🔋 متزنة)! الكلمة الطيبة والابتسامة المشرقة هي المفتاح الأروع لقلب شريك حياتك اليوم؛ أظهري له تقديرك لجهوده وسيبادلكِ أضعافاً."
                                  )}
                               </>
                            ) : (
                               <>
                                  {mood === 'stressed' && "أنت تمر بفترة ضغط ومجهود (🤯 متوتر). ننصحك ألا تنقل ضغوط العمل للمنزل. خذ نفساً عميقاً وعانق زوجتك بلطف بكلمة طيبة مثل 'شكراً لوجودك في حياتي'؛ فالكلمة الصالحة بغير تكلفة تبني الطمأنينة."}
                                  {mood === 'tired' && "تبدو متعباً (🥱 مجهد) اليوم. ننصحك بتعزير محبتك وتقديرك لجهود زوجتك بالجلوس سوياً 5 دقائق للحديث الهادئ ومشاركتها مشروباً دافئاً مع إغلاق الهواتف لتنالا السكينة."}
                                  {mood === 'refreshed' || mood === 'relaxed'
                                    ? "بما أنك بحالة نفسية متميزة وطاقة عالية اليوم (🔋 هادئ ونشط)، استغل هذه الطاقة الإيجابية الرائعة! فاجئها بتقديم لفتة دافئة، أو اصطحبها في نزهة مشي قصيرة لتبادل الضحكات والأحاديث الطيبة."
                                    : "العلاقة الزوجية الناجحة تبدأ من تقدير التفاصيل الصغيرة والكلمة الطيبة. كن لطيفاً ومستمعاً جيداً لزوجتك اليوم؛ فالسماع باهتمام يمتص كل التعب."
                                  }
                               </>
                            )}
                         </p>
                      </div>

                      {isLg && (
                         <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="border border-indigo-100/40 dark:border-indigo-505/10 rounded-2xl overflow-hidden bg-indigo-500/5">
                               <div 
                                 onClick={() => setIsSpouseBudgetExpanded(!isSpouseBudgetExpanded)}
                                 className="p-3 bg-indigo-50/25 dark:bg-indigo-500/10 flex justify-between items-center flex-row-reverse cursor-pointer select-none transition-all hover:bg-indigo-50/50"
                               >
                                  <span className="text-[11px] font-black text-indigo-950 dark:text-indigo-400 flex items-center gap-1.5 flex-row-reverse font-sans">
                                     <Wallet className="w-4 h-4 text-amber-500" />
                                     النصح والإرشاد المادي لليوم 💰
                                  </span>
                                  <span className="text-[9px] font-black text-indigo-555 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                     {isSpouseBudgetExpanded ? "طي الميزانية ▲" : "تحديد وتخصيص المادية ▼"}
                                  </span>
                                </div>
                                <AnimatePresence>
                                   {isSpouseBudgetExpanded && (
                                      <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-3.5 border-t border-indigo-100/15 bg-white/40 dark:bg-black/20 text-all overflow-hidden"
                                      >
                                         <div className="bg-[#FAF5FF]/60 dark:bg-white/5 border border-purple-100 dark:border-white/5 p-2.5 rounded-xl mb-3 font-sans">
                                            <span className="text-[9px] text-gray-400 font-bold block mb-2 text-right font-sans">اختر ميزانيتك لنوع المبادرات لليوم:</span>
                                            <div className="grid grid-cols-3 gap-1.5 font-sans">
                                               {['budget', 'medium', 'liberal'].map((tier) => (
                                                  <button
                                                    key={tier}
                                                    type="button"
                                                    onClick={(e) => {
                                                       e.stopPropagation();
                                                       setBudgetTier(tier);
                                                       localStorage.setItem('user_budget_tier', tier);
                                                    }}
                                                    className={cn("py-1.5 px-2 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer",
                                                       budgetTier === tier 
                                                         ? "bg-indigo-500/10 border-indigo-300 dark:border-[#818CF8] text-indigo-600 dark:text-indigo-300 font-black" 
                                                         : "bg-white dark:bg-white/5 text-gray-500 border-transparent hover:bg-[#F3E8FF]"
                                                    )}
                                                  >
                                                     {tier === 'budget' ? 'اقتصادية 🌙' : tier === 'medium' ? 'متوسطة ⚖️' : 'ميسرة 💰'}
                                                  </button>
                                               ))}
                                            </div>
                                         </div>

                                         <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-semibold text-right font-sans">
                                            {profile?.gender === 'female' ? (
                                               <>
                                                  {budgetTier === 'budget' && "ميزانية اقتصادية: الحب الحقيقي يزدهر بالبساطة. كوبان من شاي النعناع الدافئ في شرفة المنزل مع تشغيل بعض الصوت الهادئ، يحققان تلاقياً عاطفياً جميلاً بدون أي نفقات."}
                                                  {budgetTier === 'medium' && "ميزانية متوازنة: شاركيه في إعداد عشاء منزلي أو حجز حلوى بسيطة اليوم والجلوس سوياً لتبادل المشاعر ومناقشة طموحات المستقبل بتوازن."}
                                                  {budgetTier === 'liberal' && "ميزانية ميسرة: خططي مسبقاً لعشاء رومانسي في الخارج أو هدية لطيفة لتجديد القلوب والنشاط. الاستثمار المالي في إسعاد شريك حياتك هو بناء لسلام المنزل."}
                                               </>
                                            ) : (
                                               <>
                                                  {budgetTier === 'budget' && "ميزانية اقتصادية: الأثر الحقيقي للحب لا يحتاج ميزانيات ضخمة. رسالة خطية بخط يدك تعبّر لها فيها عن شكرك لتعبها، أو مساعدتها في ترتيب المطبخ، يغني عن أغلى الهدايا."}
                                                  {budgetTier === 'medium' && "ميزانية متوازنة: اشترِ لها مفاجأة بسيطة كباقة ورد أو شكولاتة تحبها أثناء عودتك. اللفتات المفاجئة تظهر لزوجتك أنك تذكرها حتى في تفاصيل يومك المزدحم."}
                                                  {budgetTier === 'liberal' && "ميزانية ميسرة: ما رأيك بحجز وجبة عشاء مميزة في مكان هادئ، أو تقديم هدية قيمة كانت تتمناها منذ فترة؟ السخاء على الزوجة يعمر البيوت بالبركة والسرور والانسجام الفائق."}
                                               </>
                                            )}
                                         </p>
                                      </motion.div>
                                   )}
                                </AnimatePresence>
                             </div>

                             <div className="bg-gradient-to-r from-rose-500/10 to-indigo-500/10 dark:from-rose-500/5 dark:to-indigo-500/5 border border-rose-100/10 p-3 rounded-2xl flex flex-col gap-3 font-sans">
                                <div className="flex justify-between items-center flex-row-reverse w-full">
                                   <div className="text-right">
                                      <span className="text-[9px] text-gray-400 font-bold block">عداد مودة البيت اليوم:</span>
                                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1 flex-row-reverse">
                                         <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                                         {marriageStreak} {marriageStreak === 1 ? "يوم مودة" : marriageStreak === 2 ? "يومان مودة" : "أيام مودة متواصلة"}
                                      </span>
                                   </div>
                                   <span className="text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 px-2 rounded-full shrink-0">
                                      {marriageStreak >= 5 ? "علاقة وثيقة ومزدهرة 🔥" : "ابنوا جسور الرحمة اليوم 🌱"}
                                   </span>
                                </div>

                                <div className="flex gap-2 w-full flex-row-reverse">
                                   <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        const n = marriageStreak + 1;
                                        setMarriageStreak(n);
                                        localStorage.setItem('user_marriage_streak', n.toString());
                                     }}
                                     className="flex-1 py-1.5 px-2 bg-gradient-to-r from-rose-500 to-indigo-500 hover:from-rose-600 hover:to-indigo-600 text-white rounded-xl text-[10px] font-black shadow-sm flex items-center justify-center gap-1 flex-row-reverse cursor-pointer transition-all active:scale-95 border-0"
                                   >
                                      <Sparkles className="w-3" />
                                      تسجيل لفتة طيبة اليوم (+١ مودة)
                                   </button>
                                   <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("هل تود تصفير عداد أيام المودة لبدء عهد جديد؟")) {
                                           setMarriageStreak(0);
                                           localStorage.setItem('user_marriage_streak', '0');
                                        }
                                     }}
                                     className="py-1.5 px-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-400 hover:text-[#C2185B] rounded-xl text-[10px] font-bold cursor-pointer"
                                   >
                                      تصفير 🔄
                                   </button>
                                </div>
                             </div>

                             <div className="mt-2 pt-2 border-t border-dashed border-indigo-100/30 dark:border-white/5 flex justify-between items-center flex-row-reverse text-right">
                                <div className="flex items-center gap-1 flex-row-reverse">
                                   <span className="text-[10px] text-gray-500 font-extrabold block">مزامنة البيانات دون إنترنت:</span>
                                   <span className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded-md font-sans">📡 أوفلاين</span>
                                </div>
                                <button 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     navigate('/partner-sync');
                                  }}
                                  className="py-1 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl text-[10px] font-black cursor-pointer shadow-xs border border-indigo-500/20 transition-all active:scale-95"
                                >
                                   افتح المزامنة ←
                                </button>
                             </div>
                         </div>
                      )}
                   </div>

                   <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                      {isSpousePsychologyExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لفتح المودة والميزانية والمزامنة دون إنترنت ▼"}
                   </div>
                </>
             )}

             <AnimatePresence>
                {isSpousePsychologyExpanded && !isLg && (
                   <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                     exit={{ opacity: 0, height: 0 }}
                     className="pt-3 border-t border-rose-100/10 relative z-10 space-y-3 overflow-hidden text-right leading-relaxed bg-rose-500/[0.01]"
                     dir="rtl"
                     onClick={(e) => e.stopPropagation()}
                   >
                       <div className="border border-indigo-100/40 dark:border-indigo-500/10 rounded-2xl overflow-hidden bg-indigo-500/5 p-3">
                          <span className="text-[10px] text-gray-400 font-bold block mb-2 text-right">ميزانيتك للمبادرات لليوم:</span>
                          <div className="grid grid-cols-3 gap-1.5 font-sans mb-3">
                             {['budget', 'medium', 'liberal'].map((tier) => (
                                <button
                                  key={tier}
                                  type="button"
                                  onClick={() => {
                                     setBudgetTier(tier);
                                     localStorage.setItem('user_budget_tier', tier);
                                  }}
                                  className={cn("py-1 px-2 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer",
                                     budgetTier === tier 
                                       ? "bg-[#C2185B]/10 border-indigo-300 text-[#C2185B] font-black" 
                                       : "bg-white dark:bg-white/5 text-gray-500 border-transparent hover:bg-gray-100"
                                  )}
                                >
                                   {tier === 'budget' ? 'اقتصادية 🌙' : tier === 'medium' ? 'متوسطة ⚖️' : 'ميسرة 💰'}
                                </button>
                             ))}
                          </div>
                          <p className="text-[10px] leading-relaxed text-gray-650 dark:text-gray-300 font-bold">
                             {profile?.gender === 'female' ? (
                                budgetTier === 'budget' ? "ميزانية اقتصادية: الحب المزدهر بالبساطة. كوبان من شاي النعناع الهادئ في شرفة المنزل يحققان تلاقياً دافئاً." :
                                budgetTier === 'medium' ? "ميزانية متوازنة: شاركي في إعداد عشاء منزلي أو حجز حلوى بسيطة وجلسا سوياً للحديث." : 
                                "ميزانية ميسرة: صممي عشاء متميزاً أو هدية لطيفة لتجديد القلوب والنشاط السعيد."
                             ) : (
                                budgetTier === 'budget' ? "ميزانية اقتصادية: الحب لا يحتاج ميزانيات ضخمة. رسالة خطية بخط يدك تعبر عن شكرك لتعبها، يسعدها جداً." :
                                budgetTier === 'medium' ? "ميزانية متوازنة: اشترِ لها مفاجئة بسيطة كباقة ورد أو شوكولاتة تحبها أثناء عودتك." : 
                                "ميزانية ميسرة: ما رأيك بحجز وجبة عشاء متميزة في مطلع عطلة نهاية الأسبوع لتجديد الشغف والدفء؟"
                             )}
                          </p>
                       </div>

                       <div className="bg-[#FAF5FF]/50 border border-rose-100/10 p-3 rounded-2xl flex justify-between items-center text-right flex-row-reverse">
                          <div>
                             <span className="text-[9px] text-gray-400 font-bold block">مؤشر أيام السعادة المتواصلة:</span>
                             <span className="text-xs font-black text-rose-600 flex items-center gap-1 flex-row-reverse leading-none mt-1">
                                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 pr-0.5" />
                                {marriageStreak} يوم
                             </span>
                          </div>
                          <button 
                            onClick={() => {
                               const n = marriageStreak + 1;
                               setMarriageStreak(n);
                               localStorage.setItem('user_marriage_streak', n.toString());
                            }}
                            className="py-1.5 px-3 bg-[#C2185B] text-white rounded-xl text-[9px] font-black active:scale-95 cursor-pointer border-0"
                          >
                             تسجيل مودة (+١)
                          </button>
                       </div>

                       <div className="flex justify-between items-center flex-row-reverse text-right bg-indigo-500/5 p-2 rounded-xl border border-indigo-100/20">
                          <span className="text-[9.5px] text-gray-500 font-bold">مزامنة أوفلاين دون إنترنت:</span>
                          <button 
                            onClick={() => navigate('/partner-sync')}
                            className="py-1 px-3 bg-indigo-500/10 text-indigo-600 rounded-lg text-[9px] font-black cursor-pointer border-0"
                          >
                             افتح المزامنة ←
                          </button>
                       </div>
                   </motion.div>
                )}
             </AnimatePresence>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="p-4 pt-2 pb-28 min-h-full transition-colors duration-1000 relative z-10 w-full overflow-hidden max-w-md mx-auto">
      
      {/* Top Header - Dynamic Native Aesthetic */}
      <div className={cn(
        "relative rounded-[24px] overflow-hidden p-4 mb-4 shadow-sm w-full flex flex-col items-center transition-all duration-300",
        styles.headerBg
      )}>
         {isSpiritualActive && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none mix-blend-overlay" style={{ opacity: styles.starOpacity }} viewBox="0 0 100 100" preserveAspectRatio="none">
               <pattern id="islamic-star-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 10.4 5.6 L 16 8 L 10.4 10.4 L 8 16 L 5.6 10.4 L 0 8 L 5.6 5.6 Z" fill={styles.starPatternColor} />
                  <circle cx="8" cy="8" r="1.5" fill="none" stroke={styles.starPatternColor} strokeWidth="0.5" />
               </pattern>
               <rect width="100%" height="100%" fill="url(#islamic-star-pattern)" />
            </svg>
         )}
         <AnimatedWeather condition={weatherCondition} className="opacity-40" />
         
         <div className="relative z-10 flex flex-col items-center text-center w-full mt-2">
             
             {/* Dynamic Header Actions: Notifications & APK Download */}
             <div className="w-full flex justify-between items-center mb-4 flex-row" dir="rtl">
                <div className="flex items-center gap-1.5 shrink-0">
                   <span className="text-[10px] font-black tracking-tight text-white bg-white/10 px-2.5 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1 border border-white/10 shadow-xs">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shrink-0" />
                      LifeCompanion ☀️
                   </span>
                </div>
                
                <div className="flex items-center gap-2">
                   {/* Notifications bell button */}
                   <button 
                      type="button"
                      onClick={(e) => {
                         e.stopPropagation();
                         setIsNotificationsOpen(true);
                      }}
                      className="relative w-8.5 h-8.5 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white backdrop-blur-md border border-white/10 cursor-pointer shadow-xs"
                      aria-label="تنبيهاتي وإشعاراتي اليدوية"
                   >
                      <Bell className="w-4 h-4 text-white" />
                      {(isProfileIncomplete || isDayOfArafah || isFastingForbiddenToday) && (
                         <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                      )}
                   </button>

                   {/* APK Download arrow button */}
                   <button 
                      type="button"
                      onClick={(e) => {
                         e.stopPropagation();
                         setIsApkDialogOpen(true);
                      }}
                      className="w-8.5 h-8.5 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white backdrop-blur-md border border-white/10 cursor-pointer shadow-xs"
                      aria-label="تنزيل ملف APK لتطبيق الهاتف المباشر"
                   >
                      <Download className="w-4 h-4 text-white animate-pulse" />
                   </button>
                </div>
             </div>

             <div className="flex flex-col items-center justify-center gap-1.5 mb-1 opacity-90 drop-shadow-md">
                <div className="flex items-center gap-1.5">
                   {currentHour < 18 ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                   <span className="text-xs font-medium">{getGreetingText()}</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1 flex flex-col gap-0.5">
                   <span>{dateFormatGregorian} م</span>
                   <span>{dateFormatHijri} هـ</span>
                </div>
             </div>
             
             <div className="text-4xl font-black leading-none tracking-tighter drop-shadow-md mb-4 mt-2 flex items-baseline justify-center" dir="ltr">
               {timeValue}<span className="text-base font-bold ml-1 opacity-90">{timeAmPm}</span>
             </div>

             <div className={cn("w-full backdrop-blur-md rounded-2xl p-3 flex justify-between items-center border", styles.cardClasses)}>
                <div className="flex flex-col items-center justify-center pr-2 pl-3 border-l border-white/20">
                   <div className="flex items-center gap-1">
                      <Sun className="w-4 h-4" />
                      <span className="text-xl font-black">{temperature ? `${Math.round(temperature)}°` : '24°'}</span>
                   </div>
                   <span className="text-[9px] font-bold tracking-wider opacity-90">الطقس</span>
                </div>
                <div className="flex-1 text-right text-[11px] font-bold leading-relaxed pr-3 flex items-center justify-end">
                   {generateInsight()}
                </div>
             </div>
         </div>
      </div>

       {/* 🌙 بطاقة التهنئة بالمناسبات والأعياد الدينية */}
       {religiousHolidayDetail && (
         <motion.div 
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className={cn(
             "rounded-[24px] p-4 border mb-4 relative overflow-hidden text-right shadow-md transition-all duration-300",
             religiousHolidayDetail.bgClasses || "bg-gradient-to-br from-[#0C2D22] via-[#071F17] to-[#040C16] text-[#F3FAF6] border-[#0C2D22]/60"
           )}
         >
            {/* Elegant Islamic pattern bg */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none select-none mix-blend-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
               <pattern id="holiday-star-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 8 0 L 10.4 5.6 L 16 8 L 10.4 10.4 L 8 16 L 5.6 10.4 L 0 8 L 5.6 5.6 Z" fill="#D4A373" />
               </pattern>
               <rect width="100%" height="100%" fill="url(#holiday-star-pattern)" />
            </svg>
            <div className="relative z-10 flex flex-col gap-1.5">
               <div className="flex items-center gap-2 flex-row-reverse">
                  <span className="text-sm">✨</span>
                  <h4 className="font-extrabold text-[13px] tracking-tight">تهنئة بمناسبة {religiousHolidayDetail.name}</h4>
               </div>
               <p className="text-[11px] font-bold leading-relaxed opacity-95 text-right" dir="rtl">
                  {religiousHolidayDetail.greeting}
               </p>
            </div>
         </motion.div>
       )}

      {/* +++ كاشف التفاعلات العكسية للأدوية والأطعمة (أضيف بناءً على طلبك) +++ */}
      {medicineSymptomsConflicts && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[24px] p-5 shadow-lg border border-amber-200 dark:border-amber-950/30 bg-gradient-to-br from-[#FFFDFC] to-[#FAF8F2] dark:from-amber-950/20 dark:to-black/35 mb-4 text-all text-right relative overflow-hidden"
        >
           <div className="absolute top-1 left-1 opacity-10 text-6xl select-none">💊</div>
           <div className="flex gap-3 items-start flex-row-reverse relative z-10" dir="rtl">
              <span className="text-xl mt-0.5 shrink-0 select-none animate-bounce">⚠️</span>
              <div className="flex-grow">
                 <h4 className="font-black text-[12px] text-amber-950 dark:text-amber-400 mb-1 flex items-center gap-1.5 justify-start">
                    {medicineSymptomsConflicts.title}
                 </h4>
                 <p className="text-[10.5px] font-bold leading-relaxed text-amber-900 dark:text-amber-200">
                    {medicineSymptomsConflicts.message}
                 </p>
              </div>
           </div>
        </motion.div>
      )}

      {/* 🏅 حلقات الإنجاز الدائري (Circular Achievement Rings) */}
      <div className={cn(
         "rounded-[24px] p-4 border mb-4 relative overflow-hidden text-right shadow-sm transition-all duration-300",
         styles.cardBg
      )}>
         <div className="flex justify-between items-center mb-4 flex-row-reverse">
            <span className={cn("font-black text-xs flex items-center gap-1.5 flex-row-reverse", styles.textPrimary)}>
               <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
               حلقات الإنجاز اليومي 🏆
            </span>
            <span className={cn("text-[9px] font-bold", styles.textSecondary)}>تابع تقدمك الفعلي</span>
         </div>

         <div className="flex justify-around items-center flex-row-reverse gap-2">
            {/* Ring 1: Water */}
            <div className="flex flex-col items-center">
               <div className="relative w-[56px] h-[56px] flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle
                        cx="28"
                        cy="28"
                        r="23"
                        className={styles.subProgressRingBg}
                        strokeWidth="4"
                        fill="transparent"
                     />
                     <motion.circle
                        cx="28"
                        cy="28"
                        r="23"
                        className="stroke-sky-500"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 23}
                        initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 23 - (Math.min(waterScore, 100) / 100) * (2 * Math.PI * 23) }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pb-0.5">
                     <Droplets className="w-3.5 h-3.5 text-sky-500 mb-0.5" />
                     <span className={cn("text-[9px] font-black leading-none", styles.textPrimary)}>{Math.round(waterScore)}%</span>
                  </div>
               </div>
               <span className="text-[9px] font-black opacity-80 mt-1.5">الارتواء</span>
            </div>

            {/* Ring 2: Sleep */}
            <div className="flex flex-col items-center">
               <div className="relative w-[56px] h-[56px] flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle
                        cx="28"
                        cy="28"
                        r="23"
                        className={styles.subProgressRingBg}
                        strokeWidth="4"
                        fill="transparent"
                     />
                     <motion.circle
                        cx="28"
                        cy="28"
                        r="23"
                        className="stroke-purple-500"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 23}
                        initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 23 - (Math.min(sleepScore, 100) / 100) * (2 * Math.PI * 23) }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pb-0.5">
                     <Moon className="w-3.5 h-3.5 text-purple-500 mb-0.5" />
                     <span className={cn("text-[9px] font-black leading-none", styles.textPrimary)}>{Math.round(sleepScore)}%</span>
                  </div>
               </div>
               <span className="text-[9px] font-black opacity-80 mt-1.5">النوم</span>
            </div>

            {/* Ring 3: Overall */}
            <div className="flex flex-col items-center">
               <div className="relative w-[56px] h-[56px] flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                     <circle
                        cx="28"
                        cy="28"
                        r="23"
                        className={styles.subProgressRingBg}
                        strokeWidth="4"
                        fill="transparent"
                     />
                     <motion.circle
                        cx="28"
                        cy="28"
                        r="23"
                        className="stroke-emerald-500"
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 23}
                        initial={{ strokeDashoffset: 2 * Math.PI * 23 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 23 - (Math.min(overallScore, 100) / 100) * (2 * Math.PI * 23) }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                     />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pb-0.5">
                     <HeartPulse className="w-3.5 h-3.5 text-emerald-500 mb-0.5" />
                     <span className={cn("text-[9px] font-black leading-none", styles.textPrimary)}>{Math.round(overallScore)}%</span>
                  </div>
               </div>
               <span className="text-[9px] font-black opacity-80 mt-1.5">الصحة العامة</span>
            </div>
         </div>
      </div>

      {/* 🧠 صديقتك الذكية - Offline Smart Insights Widget (Placed at top!) */}
      {(() => {
         const insights = generateOfflineSmarts(profile, new Date(), { sleepHours });
         const primaryInsight = insights.find((i: any) => i.id !== 'missing-data');

         if (!primaryInsight) return null;

         return (
            <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className={cn("rounded-[24px] p-4 shadow-md mb-4 relative overflow-hidden", isFemale ? "bg-gradient-to-br from-rose-50 to-[#FCF4F6] border border-rose-100 dark:from-pink-900/30 dark:to-[#1A1A1A] dark:border-pink-900/20" : "bg-gradient-to-br from-indigo-500 to-sky-600 text-white")}
            >
               {isFemale ? (
                  <div className="absolute top-0 right-0 opacity-40 pointer-events-none -translate-y-1/3 translate-x-1/3">
                      <svg width="150" height="150" viewBox="0 0 200 200" fill="none">
                          <circle cx="100" cy="100" r="80" stroke="#F43F5E" strokeOpacity="0.2" strokeWidth="20" />
                      </svg>
                  </div>
               ) : (
                  <div className="absolute top-0 right-0 opacity-10 pointer-events-none -translate-y-1/3 translate-x-1/3">
                      <svg width="150" height="150" viewBox="0 0 200 200" fill="none">
                          <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="20" />
                      </svg>
                  </div>
               )}
               
               <div className="flex justify-between items-start flex-row-reverse mb-3 relative z-10 w-full text-right">
                  <div className={cn("flex gap-2 items-center flex-row-reverse", isFemale ? "text-rose-900 dark:text-rose-400" : "text-white")}>
                     <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border", isFemale ? "bg-white border-rose-100 text-rose-500 dark:bg-[#1A1A1A] dark:border-rose-900/30" : "bg-white/20 border-white/10 text-white")}>
                        <Sparkles className="w-5 h-5" />
                     </div>
                     <div>
                        <span className={cn("font-black text-sm tracking-wide block", isFemale ? "text-rose-600 dark:text-rose-400" : "text-white")}>
                           {isFemale ? "صديقتكِ الذكية 🌸" : "صديقك الذكي ⚡"}
                        </span>
                        <span className={cn("text-[9px] font-bold opacity-80", isFemale ? "text-rose-400 dark:text-rose-500" : "text-sky-200")}>
                           {isFemale ? "ترافقكِ في يومكِ" : "يرافقكَ في يومكَ"}
                        </span>
                     </div>
                  </div>
               </div>
               
               <p className={cn("text-xs font-bold leading-relaxed mb-4 text-right z-10", isFemale ? "text-rose-900/80 dark:text-rose-200" : "text-white/90")}>
                  {isFemale 
                     ? `صباح الورد يا ${profile.nickname || profile.name || 'جميلة'} 🌸، بناءً على بياناتكِ المحدثة:` 
                     : `صباح الخير يا ${profile.nickname || profile.name || 'بطل'} ⚡، بناءً على بياناتكَ المحدثة:`
                   }
                  <br />
                  <span className={cn("font-medium opacity-90 block mt-1", isFemale ? "text-gray-700 dark:text-gray-300" : "text-white")}>{primaryInsight.message}</span>
               </p>
               
               <div className="clear-both" />

               {primaryInsight.actionRoute && primaryInsight.actionText && (
                  <div className={cn("flex justify-end gap-2 z-10 w-full border-t pt-3 mt-1", isFemale ? "border-rose-100 dark:border-rose-900/30" : "border-white/20")}>
                     <button
                       onClick={() => navigate('/ai-insights')}
                       className={cn("text-[10px] font-bold px-4 py-2 rounded-full flex gap-1.5 items-center flex-row-reverse transition-all shadow-sm active:scale-95 cursor-pointer", isFemale ? "bg-rose-100 hover:bg-rose-200 text-rose-600 dark:bg-rose-900/50 dark:hover:bg-rose-900/70 dark:text-rose-300" : "bg-white/20 hover:bg-white/30 text-white")}
                     >
                        <MessageCircle className="w-3 h-3" />
                        {isFemale ? "تحدثي معها" : "تحدث معه"}
                     </button>
                     <button
                       onClick={() => navigate(primaryInsight.actionRoute!)}
                       className={cn("text-[10px] font-bold px-4 py-2 rounded-full flex gap-1.5 items-center flex-row-reverse transition-all shadow-sm active:scale-95 cursor-pointer", isFemale ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-[#10B981] hover:bg-emerald-600 text-white")}
                     >
                        <Plus className="w-3 h-3" />
                        {primaryInsight.actionText}
                     </button>
                  </div>
               )}
            </motion.div>
         );
      })()}

      {/* Progress Cards Overview (Inline pending tasks check & stats shortcut) */}
      <div className="grid grid-cols-2 gap-3 mb-4" dir="rtl">
         {/* Simple Tasks Card */}
         <button onClick={() => navigate('/actions')} className={cn("p-4 rounded-[20px] shadow-sm border flex flex-col justify-between items-start text-right transition-transform active:scale-95 group w-full transition-all duration-300", styles.cardBg)}>
            <div className="flex items-center gap-2 mb-3 w-full justify-start flex-row-reverse">
               <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
               </div>
               <span className={cn("font-bold text-[11px]", styles.textPrimary)}>مهام اليوم</span>
            </div>
            <div className="w-full">
               <div className="text-[10px] font-bold text-indigo-500 mb-1 text-right">٢ قيد الانتظار</div>
               <div className="h-1.5 w-full bg-indigo-100 dark:bg-indigo-950/30 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width: '33%'}}></div>
               </div>
            </div>
         </button>
         
         {/* Stats analysis trigger */}
         <button onClick={() => navigate('/diet')} className={cn("p-4 rounded-[20px] shadow-sm border flex flex-col justify-between items-start text-right transition-transform active:scale-95 group w-full transition-all duration-300", styles.cardBg)}>
            <div className="flex items-center gap-2 mb-3 w-full justify-start flex-row-reverse">
               <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
               </div>
               <span className={cn("font-bold text-[11px]", styles.textPrimary)}>تفاصيل الصحة</span>
            </div>
            <div className="w-full">
               <div className="text-[10px] font-bold text-amber-500 mb-1 text-right">معدل الامتثال ممتاز</div>
               <div className="h-1.5 w-full bg-amber-100 dark:bg-amber-950/30 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{width: '85%'}}></div>
               </div>
            </div>
         </button>
      </div>

      {/* 🎨 منسق لوحة التحكم الذكي والتخصيص الفائق */}
      <div className={cn(
         "rounded-[24px] p-4 border mb-4 text-right shadow-sm select-none transition-all duration-300",
         styles.cardBg
      )} dir="rtl">
         <div className="flex justify-between items-center flex-row-reverse w-full cursor-pointer" onClick={() => setCardCustomizerOpen(!cardCustomizerOpen)}>
            <div className="flex items-center gap-2 flex-row-reverse text-[#E07A5F]">
               <Settings className="w-4 h-4 text-[#E07A5F] animate-spin-slow" />
               <span className="font-black text-xs leading-none">تخصيص وترتيب لوحة التحكم 🎨</span>
            </div>
            <span className="text-[10px] font-black bg-[#E07A5F]/10 text-[#E07A5F] px-2.5 py-1 rounded-full">
               {cardCustomizerOpen ? "إغلاق التخصيص ▲" : "اضغط لترتيب وتعديل الخلاصة ▼"}
            </span>
         </div>

         <AnimatePresence>
            {cardCustomizerOpen && (
               <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5 overflow-hidden"
               >
                  <p className="text-[10px] text-gray-400 font-bold leading-relaxed mb-2">
                     تحكم بظهور كروت المياه، التغذية، الدواء، الخطوات، النوم، والمستشار الزوجي. يمكنك كذلك تغيير ترتيبهم بلمسة واحدة وصوت نقرة ذكي!
                  </p>

                  <div className="space-y-2.5">
                     {cardSettings.order.map((cardKey: string, index: number) => {
                        const cardNames: any = {
                           water: { name: "مستكشف الارتواء الذكي 💧", color: "text-sky-500" },
                           diet: { name: "برنامج التغذية والحميات 🍽️", color: "text-amber-500" },
                           meds: { name: "متتبع الدواء والصيدلي 💊", color: "text-rose-500" },
                           steps: { name: "عداد النشاط والخطوات 🏃‍♂️", color: "text-emerald-500" },
                           sleep: { name: "جودة النوم ومثبط الأرق 😴", color: "text-purple-500" },
                           spouse_advice: { name: "مستشار السعادة الزوجية 💍", color: "text-indigo-500" }
                        };
                        const cardInfo = cardNames[cardKey];
                        if (!cardInfo) return null;

                        const isVisible = cardSettings.visible[cardKey];
                        const currentSize = cardSettings.sizes[cardKey] || 'md';

                        return (
                           <div key={cardKey} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200/40 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-right">
                              {/* Left: Move Controls + Sizing */}
                              <div className="flex items-center gap-1.5 justify-between sm:justify-start">
                                 {/* Size Control */}
                                 <div className="flex gap-1">
                                    {[
                                       { id: 'sm', label: "🔍 مدمج" },
                                       { id: 'md', label: "⚖️ قياسي" },
                                       { id: 'lg', label: "✨ تفاعلي" }
                                    ].map(sz => (
                                       <button
                                          key={sz.id}
                                          type="button"
                                          onClick={() => {
                                             const updated = { ...cardSettings };
                                             updated.sizes[cardKey] = sz.id;
                                             updateCardSettings(updated);
                                          }}
                                          className={cn("px-2 py-1 rounded-lg text-[9px] font-black border transition-all cursor-pointer",
                                             currentSize === sz.id 
                                                ? "bg-[#E07A5F] border-[#E07A5F] text-white" 
                                                : "bg-white dark:bg-white/5 text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-white/10"
                                          )}
                                       >
                                          {sz.label}
                                       </button>
                                    ))}
                                 </div>

                                 {/* Reorder Arrows */}
                                 <div className="flex gap-1 shrink-0">
                                    <button
                                       type="button"
                                       disabled={index === 0}
                                       onClick={() => {
                                          if (index === 0) return;
                                          const orderCopy = [...cardSettings.order];
                                          const temp = orderCopy[index];
                                          orderCopy[index] = orderCopy[index - 1];
                                          orderCopy[index - 1] = temp;
                                          updateCardSettings({ ...cardSettings, order: orderCopy });
                                       }}
                                       className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                       <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                       type="button"
                                       disabled={index === cardSettings.order.length - 1}
                                       onClick={() => {
                                          if (index === cardSettings.order.length - 1) return;
                                          const orderCopy = [...cardSettings.order];
                                          const temp = orderCopy[index];
                                          orderCopy[index] = orderCopy[index + 1];
                                          orderCopy[index + 1] = temp;
                                          updateCardSettings({ ...cardSettings, order: orderCopy });
                                       }}
                                       className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                       <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                 </div>
                              </div>

                              {/* Right: Card Info & Visible Toggle */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 flex-row-reverse w-full sm:w-auto">
                                 <div className="flex items-center gap-2 flex-row-reverse">
                                    <span className={cn("text-xs font-black", cardInfo.color)}>{cardInfo.name}</span>
                                 </div>

                                 <button
                                    type="button"
                                    onClick={() => {
                                       const updated = { ...cardSettings };
                                       updated.visible[cardKey] = !isVisible;
                                       updateCardSettings(updated);
                                    }}
                                    className={cn("px-2.5 py-1 text-[10px] font-black rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border",
                                       isVisible 
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-transparent" 
                                          : "bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-transparent"
                                    )}
                                 >
                                    {isVisible ? (
                                       <>
                                          <Eye className="w-3.5 h-3.5" />
                                          ظاهر
                                       </>
                                    ) : (
                                       <>
                                          <EyeOff className="w-3.5 h-3.5" />
                                          مخفي
                                       </>
                                    )}
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  <div className="bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10 text-center">
                     <p className="text-[9.5px] text-amber-900 dark:text-amber-400 font-bold leading-relaxed">
                        💡 تلميحة: البطاقة المصغرة <span className="font-extrabold">"Compact / مدمج"</span> سريعة الاستعراض وتخفي التحكمات الطويلة لتمنحك نقاءً بصرياً فائقاً!
                     </p>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* 🔔 الإشعارات والرسائل الذكية */}
      {false && (
      <div className={cn(
         "rounded-[24px] p-4 border mb-4 relative overflow-hidden text-right shadow-sm transition-all duration-300",
         styles.cardBg
      )}>
         <div className="flex justify-between items-center mb-3 flex-row-reverse w-full">
            <span className="font-black text-xs text-gray-800 dark:text-white flex items-center gap-1.5 flex-row-reverse">
               <Bell className="w-4 h-4 text-rose-500" />
               التنبيهات والإشعارات الذكية 🔔
            </span>
            <span className="text-[9px] font-bold text-gray-400">الحالة اللحظية</span>
         </div>

         <div className="space-y-2.5">
            {/* 1. Profile Completion Notification */}
            {isProfileIncomplete ? (
               <div 
                  onClick={() => navigate('/profile')}
                  className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 flex flex-row-reverse items-start justify-between cursor-pointer hover:bg-amber-100/40 transition-colors"
               >
                  <div className="text-right flex-1">
                     <h4 className="font-bold text-[11px] text-amber-900 dark:text-amber-500 mb-0.5 flex flex-row-reverse items-center justify-start gap-1">
                        🔑 استكمل بياناتك الصحية
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                     </h4>
                     <p className="text-[10px] text-amber-700 dark:text-amber-400/80 mb-2">يرجى ملء بيانات ملفك الشخصي بالكامل لحساب احتياجاتك بدقة متناهية</p>
                     
                     <div className="flex flex-wrap gap-1 justify-end flex-row-reverse">
                        <span className="text-[9px] font-bold text-[#E07A5F] bg-rose-50 dark:bg-rose-950/40 border border-[#E07A5F]/20 px-1.5 py-0.5 rounded">
                           البيانات المطلوبة:
                        </span>
                        {missingFields.map((field, i) => (
                           <span key={i} className="text-[9px] font-black text-rose-500 dark:text-rose-450 bg-rose-500/10 dark:bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/20">
                              ⚠️ {field}
                           </span>
                        ))}
                     </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 select-none mt-0.5" />
               </div>
            ) : (
               <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 flex flex-row-reverse items-center justify-between">
                  <div className="text-right">
                     <h4 className="font-bold text-[11px] text-emerald-800 dark:text-emerald-500 mb-0.5 flex flex-row-reverse items-center gap-1">
                        🔒 استكمال البيانات الصحية
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold font-mono text-[10px] bg-emerald-100 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded ml-1">done</span>
                     </h4>
                     <p className="text-[10px] text-emerald-600/85 dark:text-emerald-400/85 font-semibold">جميع بيانات ملفك الشخصي مكتملة ومحدثة بنجاح</p>
                  </div>
                  <span className="text-emerald-500 mr-1 shrink-0">✅</span>
               </div>
            )}

            {/* Day of Arafah Reminder & Fasting Logger */}
            {isDayOfArafah && (
               <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 dark:border-amber-500/30 flex flex-col gap-2.5 text-right relative overflow-hidden">
                  <div className="absolute top-0 left-0 translate-x-1 translate-y-1 text-slate-100 dark:text-[#1a1a1a] text-3xl font-bold font-mono select-none pointer-events-none opacity-25">🕋</div>
                  <div className="flex gap-2.5 items-start justify-between flex-row-reverse relative z-10">
                     <span className="text-xl shrink-0 select-none">🕋</span>
                     <div className="flex-1">
                        <h4 className="font-extrabold text-[11px] text-amber-900 dark:text-amber-400 mb-0.5 flex flex-row-reverse items-center justify-start gap-1">
                           <span>تنبيه خاص: اليوم هو يوم عرفة (٩ ذو الحجة)</span>
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        </h4>
                        <p className="text-[10px] text-amber-800/85 dark:text-amber-300/85 leading-relaxed font-semibold">
                           يُستحب صيام يوم عرفة؛ صوم هذا اليوم العظيم يكفّر ذنوب السنة الماضية والسنة القابلة (حديث شريف). تقبل الله طاعاتكم!
                        </p>
                     </div>
                  </div>
                  
                  {fastingChoice === null ? (
                     <div className="flex flex-col gap-2 border-t border-amber-500/10 pt-2 relative z-10 items-center">
                        <div className="text-[9.5px] font-extrabold text-[#92400E] dark:text-[#FBBF24] font-bold">
                           ❓ هل أنت صائم اليوم لتسجيل صيامك وتكييف أهداف ومواعيد اليوم؟
                        </div>
                        <div className="flex gap-2 w-full justify-center">
                           <button
                              onClick={() => handleSetFastingStateToday(true)}
                              className="py-1.5 px-4 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm bg-amber-500 text-white flex-1 hover:bg-amber-600"
                           >
                              نعم، أنا صائم اليوم! 🕌
                           </button>
                           <button
                              onClick={() => handleSetFastingStateToday(false)}
                              className="py-1.5 px-4 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 flex-1 hover:bg-gray-200"
                           >
                              لست صائماً اليوم ❌
                           </button>
                        </div>
                     </div>
                  ) : fastingChoice === 'fasting' ? (
                     <div className="flex flex-col gap-1 border-t border-amber-500/10 pt-2 relative z-10 items-center">
                        <div className="text-[10.5px] font-black text-[#D4A373]">
                           ✨ تقبل الله صيامك وطاعاتك في هذا اليوم العظيم يوم عرفة 🕋
                        </div>
                        <button
                           onClick={() => handleSetFastingStateToday(false)}
                           className="text-[9px] text-red-550 hover:text-red-650 dark:text-red-400 font-bold hover:underline transition-all mt-1"
                        >
                           تعديل الحالة (أفطرت لليوم / إلغاء الصيام)
                        </button>
                     </div>
                  ) : (
                     <div className="flex flex-col gap-1 border-t border-amber-500/10 pt-2 relative z-10 items-center">
                        <div className="text-[10.5px] font-bold text-gray-500 dark:text-gray-400">
                           ✨ يوم مبارك وطاعات مقبولة في يوم عرفة العظيم 🌸
                        </div>
                        <button
                           onClick={() => handleSetFastingStateToday(true)}
                           className="text-[9px] text-amber-600 dark:text-amber-400 font-bold hover:underline transition-all mt-1"
                        >
                           تغيير الحالة إلى: صائم اليوم 🕌
                        </button>
                     </div>
                  )}
               </div>
            )}
          </div>
       </div>
       )}

            {/* 🕋 كارت صيام النوافل والسنن الذكي القابل للتمدد - مدمج مع نظام الإشعارات والاقتراحات الصيامية */}
            {isFastingForbiddenToday ? (
               <div className="rounded-[24px] p-5 border bg-gradient-to-br from-[#FAF5EF] to-[#FFF9F2] dark:from-[#1E1A16] dark:to-[#171412] border-amber-200 dark:border-amber-900/40 mb-4 text-right shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 translate-x-1.5 translate-y-1.5 text-amber-500/10 dark:text-amber-500/5 text-5xl font-black font-sans pointer-events-none select-none">🎉</div>
                  <div className="flex gap-3 items-start flex-row-reverse mb-1 relative z-10">
                     <span className="text-2xl shrink-0">🎉</span>
                     <div className="flex-grow">
                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">تنبيه التقويم الإسلامي</span>
                        <h3 className="font-extrabold text-base text-amber-900 dark:text-amber-400 leading-tight mt-0.5">
                           اليوم هو {forbiddenFastingDayName}
                        </h3>
                        <p className="text-[10.5px] text-[#A27B5C] dark:text-[#E2C799] font-semibold leading-relaxed mt-2" dir="rtl">
                           يحرم الصوم في هذا اليوم المبارك شرعاً وصحياً (أيام العيد والتشريق). اغتنم الفرصة لتناول وجبات صحية ومشاركتها مع أحبابك وعائلتك! تقبل الله صالح طاعاتكم وعيدكم مبارك سعيد! 🍬🌸
                        </p>
                     </div>
                  </div>
               </div>
            ) : (
               <div className={cn(
               "rounded-[24px] p-4 border mb-4 relative overflow-hidden text-right shadow-sm transition-all duration-300",
               styles.cardBg
            )}>
               {/* ترويسة الكارت الفخمة للتوسيع والطي */}
               <div 
                  onClick={() => setIsFastingCardExpanded(!isFastingCardExpanded)}
                  className="flex justify-between items-center flex-row-reverse w-full cursor-pointer select-none pb-2"
               >
            <div className="flex items-center gap-2 flex-row-reverse text-right">
               <span className="text-base select-none animate-pulse">🌙</span>
               <div>
                  <h4 className="font-extrabold text-xs text-amber-750 dark:text-amber-400">
                     مساعد صيام النوافل والسنن {isFastingMode ? "🟢" : ""}
                  </h4>
                  <p className="text-[9px] text-gray-400 font-bold dark:text-gray-400">
                     {isFastingMode ? "أنت مسجل كصائم لليوم" : "سجل صيامك واعرض نصائح التغذية"}
                  </p>
               </div>
            </div>
            
            <div className="flex items-center gap-1.5 flex-row-reverse">
               <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {isFastingCardExpanded ? "طي التفاصيل ▲" : "عرض الاقتراحات ▼"}
               </span>
            </div>
         </div>

         {/* حالة سريعة مصغرة ومكثفة ومتاحة دائماً */}
         <div className="bg-black/5 dark:bg-white/5 p-2 rounded-xl mt-2 mb-1.5 flex justify-between items-center flex-row-reverse" dir="rtl">
            <span className="text-[10px] font-extrabold text-gray-700 dark:text-gray-300">
               {isFastingMode ? "🟢 صيامك مسجل لليوم" : "⚪ لست صائماً حالياً"}
            </span>
            <button
               onClick={(e) => {
                  e.stopPropagation();
                  const todayStr = new Date().toISOString().split('T')[0];
                  handleLogFastingDayDirect(todayStr);
               }}
               className={cn(
                  "text-[9px] font-black px-2.5 py-1.5 rounded-lg transition-all active:scale-95 shadow-xs",
                  isFastingMode 
                     ? "bg-rose-500 text-white" 
                     : "bg-amber-500 text-white"
               )}
            >
               {isFastingMode ? "إلغاء الصوم" : "اضغط لتسجيل صومك"}
            </button>
         </div>

         {/* محتويات التوسعة (تظهر فقط عند توسيع الكارت) */}
         {isFastingCardExpanded && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="mt-4 pt-3 border-t border-gray-150 dark:border-white/5 space-y-4"
            >
               {/* التحكم بالتذكير والمنبه */}
               <div className="flex justify-between items-center flex-row-reverse w-full bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                  <span className="text-[9.5px] font-black text-gray-600 dark:text-gray-300 flex items-center gap-1 flex-row-reverse">
                     <Bell className="w-3 h-3 text-amber-550 shrink-0" />
                     تنظيم تنبيهات السحر والنوافل
                  </span>
                  <button 
                     onClick={(e) => {
                        e.stopPropagation();
                        toggleFastingAlerts();
                     }}
                     className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border transition-all",
                        fastingAlertsEnabled 
                           ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
                           : "bg-gray-100 border-gray-200 dark:bg-white/5 dark:border-white/10 text-gray-550"
                     )}
                  >
                     {fastingAlertsEnabled ? "التنبيهات مفعّلة" : "التنبيهات معطّلة"}
                  </button>
               </div>

               {/* مظهر الصيام والتصميم الروحاني: فاتح/غامق */}
               <div className="flex justify-between items-center flex-row-reverse w-full bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                  <span className="text-[9.5px] font-black text-gray-600 dark:text-gray-300 flex items-center gap-1 flex-row-reverse">
                     ✨ مظهر الثيم والتصميم الروحاني
                  </span>
                  <div className="flex bg-gray-200 dark:bg-black/30 p-0.5 rounded-lg border border-gray-300 dark:border-white/5 relative z-10">
                     <button 
                        onClick={(e) => { e.stopPropagation(); setFastingThemeMode('light'); }}
                        className={cn("px-2.5 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer", fastingThemeMode === 'light' ? "bg-amber-600 text-white shadow-xs" : "text-gray-600 dark:text-gray-300")}
                     >
                        ☀️ فاتح
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setFastingThemeMode('dark'); }}
                        className={cn("px-2.5 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer", fastingThemeMode === 'dark' ? "bg-emerald-800 text-white shadow-xs" : "text-gray-600 dark:text-gray-300")}
                     >
                        🌙 غامق
                     </button>
                  </div>
               </div>

               {/* التنبيهات والرسائل اللحظية (Simulated Notifications style) */}
               {fastingAlertsEnabled && (
                  <div className="space-y-2">
                     {todayFastingType ? (
                        <div className="p-3 rounded-xl bg-gradient-to-l from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 dark:border-amber-500/30 flex flex-col gap-2 text-right">
                           <div className="flex justify-between items-start flex-row-reverse gap-2">
                              <span className="text-xs shrink-0 bg-amber-500/20 p-1 rounded-md">🔔</span>
                              <div className="flex-1">
                                 <h5 className="font-extrabold text-[10.5px] text-amber-900 dark:text-amber-300 mb-0.5 flex flex-row-reverse items-center justify-start gap-1">
                                    <span>تنبيه صيام مستحب اليوم!</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                 </h5>
                                 <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 font-bold leading-normal">
                                    اليوم هو <span className="text-amber-600 dark:text-[#D4A373] font-black">{todayFastingType}</span>. الصوم اليوم فرصة عظيمة لمضاعفة الطاعات والصحة الخلوية.
                                 </p>
                              </div>
                           </div>
                           
                           {fastingChoice === null ? (
                              <div className="flex flex-col gap-2 border-t border-amber-500/10 pt-2 relative z-10 items-center">
                                 <p className="text-[9px] text-[#92400E] dark:text-[#FBBF24] font-bold">
                                    هل أنت صائم اليوم لتسجيل نشاطك بنقرة واحدة وتكييف الأهداف والخدمات؟
                                 </p>
                                 <div className="flex gap-2 w-full justify-end flex-row-reverse">
                                    <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetFastingStateToday(true);
                                       }}
                                       className="bg-amber-500 hover:bg-amber-600 text-white text-[9.5px] font-black py-1.5 px-3.5 rounded-lg transition-all active:scale-95 shadow-xs flex-1"
                                     >
                                       🕌 نعم، حددني كصائم اليوم!
                                    </button>
                                    <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleSetFastingStateToday(false);
                                       }}
                                       className="bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-[9.5px] font-black py-1.5 px-3.5 rounded-lg transition-all active:scale-95 shadow-xs flex-1"
                                    >
                                       لست صائماً ❌
                                    </button>
                                 </div>
                              </div>
                           ) : fastingChoice === 'fasting' ? (
                              <div className="flex items-center gap-1.5 flex-row-reverse justify-between w-full border-t border-amber-500/10 pt-2 mt-1">
                                 <span className="text-[9.5px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    🟢 تم رصد وتفعيل وضع الصيام بنجاح
                                 </span>
                                 <button 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleSetFastingStateToday(false);
                                    }}
                                    className="text-[9px] text-red-500 dark:text-red-400 font-bold underline hover:text-red-650"
                                 >
                                    إلغاء لليوم
                                 </button>
                              </div>
                           ) : (
                              <div className="flex items-center gap-1.5 flex-row-reverse justify-between w-full border-t border-amber-500/10 pt-2 mt-1">
                                 <span className="text-[9.5px] font-bold text-gray-500 dark:text-gray-400">
                                    ⚪ مسجل لليوم: لست صائماً
                                 </span>
                                 <button 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleSetFastingStateToday(true);
                                    }}
                                    className="text-[9px] text-amber-600 dark:text-amber-400 font-bold underline hover:text-amber-550"
                                 >
                                    تغيير إلى صائم مفعّل 🕌
                                 </button>
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="p-2.5 rounded-xl bg-gray-50/50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 flex flex-row-reverse items-center justify-between text-right">
                           <div className="flex items-center gap-2 flex-row-reverse">
                              <span className="text-gray-400 select-none text-xs">🕊️</span>
                              <div>
                                 <h5 className="font-bold text-[10px] text-gray-700 dark:text-gray-300">لا توجد نوافل مؤكدة اليوم</h5>
                                 <p className="text-[9px] text-gray-500 font-semibold">التنبيه القادم سيكون صيام الخميس والأيام البيض لشهر ذو الحجة</p>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* اقتراحات ومقترحات الصيام الذكية (Smart Recommendations & Tips) */}
               <div>
                  <span className="text-[10px] font-black text-gray-800 dark:text-gray-250 flex items-center gap-1 border-b border-dashed border-gray-100 dark:border-white/5 pb-1.5 mb-2 flex-row-reverse">
                     <BookOpen className="w-3.5 h-3.5 text-amber-550" />
                     مقترحات وتوصيات الرعاية الصحية الذكية للسنن 🌿
                  </span>

                  {/* الألسنة للتوصيات والمقترحات */}
                  <div className="flex gap-1 mb-2.5 bg-black/10 dark:bg-white/5 p-1 rounded-xl" dir="rtl">
                     {[
                        { id: 'suhoor', label: '🥣 سحور', icon: '🥣' },
                        { id: 'iftar', label: '🥤 كسر آمن', icon: '🥤' },
                        { id: 'water', label: '💧 ري متدرج', icon: '💧' },
                        { id: 'women', label: '🤰 صحة حواء', icon: '🤰' }
                     ].map((tab, idx) => (
                        <button
                           key={idx}
                           onClick={(e) => {
                              e.stopPropagation();
                              setActiveTabSuggestion(tab.id as any);
                           }}
                           className={cn(
                              "flex-1 py-1 px-1 rounded-lg text-[8.5px] font-black transition-all text-center flex flex-col items-center justify-center gap-0.5",
                              activeTabSuggestion === tab.id 
                                 ? "bg-white dark:bg-gray-800 shadow-xs text-amber-600 dark:text-amber-400 font-black" 
                                 : "text-gray-405 dark:text-gray-400"
                           )}
                        >
                           <span>{tab.label}</span>
                        </button>
                     ))}
                  </div>

                  {/* محتوى الإرشاد المكتوب بالتبسيط */}
                  <div className="text-right p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 min-h-[85px] flex flex-col justify-between">
                     {activeTabSuggestion === 'suhoor' && (
                        <div>
                           <h5 className="text-[10px] font-extrabold text-amber-900 dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                              <span>سحور مكيّف لمنع العطش</span>
                           </h5>
                           <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                              تجنب الأغذية الغنية بالصوديوم أو المخللات والتوابل تماماً. ركّز على الألياف والمصادر الغنية بالبوتاسيوم مثل <span className="font-extrabold">الموز، التمر والزبادي</span>.
                           </p>
                        </div>
                     )}

                     {activeTabSuggestion === 'iftar' && (
                        <div>
                           <h5 className="text-[10px] font-extrabold text-amber-900 dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                              <span>كسر الصيام المتوازن والآمن</span>
                           </h5>
                           <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                              ابدأ بتناول <span className="font-extrabold">١-٣ تمرات مع كوب ماء دافئ</span>. تجنب السوائل عالية السكر فوراً لعدم إرباك البنكرياس وتنشيط الهضم بلطف.
                           </p>
                        </div>
                     )}

                     {activeTabSuggestion === 'water' && (
                        <div>
                           <h5 className="text-[10px] font-extrabold text-amber-900 dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                              <span>نهج الإرواء والترطيب التدريجي</span>
                           </h5>
                           <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                              تجنب شرب كميات هائلة دفعة واحدة! ننصح باستهلاك <span className="font-extrabold">كوب واحد من الماء (٢٥٠ مل) كل ٤٥ دقيقة</span> بانتظام طوال ساعات الإفطار.
                           </p>
                        </div>
                     )}

                     {activeTabSuggestion === 'women' && (
                        <div>
                           <h5 className="text-[10px] font-extrabold text-amber-900 dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                              <span>توجيه لصحة وسياق صيام المرأة</span>
                           </h5>
                           <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                              لله الحوامل أو المرضعات، احرصي على قياس نسبة السكر والنبض. عند المعاناة من <span className="font-extrabold">الوهن أو برودة الأطراف</span> يجب الإفطار فوراً رعاية بالصحة.
                           </p>
                        </div>
                     )}
                     
                     <div className="text-[8px] text-amber-600/70 dark:text-amber-400/75 mt-1.5 block font-extrabold text-left border-t border-amber-500/5 pt-1" dir="rtl">
                        💡 تلميحة صحية: صوم التطوع يُصلح البنية الخلوية ويعزز كفاءة الخلايا!
                     </div>
                  </div>
               </div>

               {/* زر الانتقال الميداني الكامل إلى مركز الصيام الذكي */}
               <button 
                  onClick={(e) => {
                     e.stopPropagation();
                     navigate('/fasting-hub');
                  }}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10.5px] transition-all text-center flex items-center justify-center gap-1.5 flex-row-reverse shadow-xs active:scale-95"
               >
                  <span>🪐 انتقل إلى مركز صيام السنن الكامل والرصيد التاريخي ←</span>
               </button>
            </motion.div>
         )}
      </div>
      )}
      {false && (
         <div className="hidden">
               {activeTabSuggestion === 'suhoor' && (
                  <div>
                     <h5 className="text-[10.5px] font-extrabold text-amber-900 dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                        <span>سحور مكيّف لمنع العطش والجفاف</span>
                        <span className="text-xs">🥣</span>
                     </h5>
                     <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                        تجنب الأغذية الغنية بالصوديوم أو المخللات والتوابل تماماً. ركّز على الألياف والمصادر الغنية بالبوتاسيوم مثل <span className="font-extrabold">الموز، التمر والزبادي</span>، لضمان بطء تحلل الكربوهيدرات والاحتفاظ بالمياه لأطول فترة.
                     </p>
                  </div>
               )}

               {activeTabSuggestion === 'iftar' && (
                  <div>
                     <h5 className="text-[10.5px] font-extrabold text-amber-900 dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                        <span>كسر الصيام المتوازن والآمن</span>
                        <span className="text-xs">🥤</span>
                     </h5>
                     <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                        ابدأ بتناول <span className="font-extrabold">١-٣ تمرات مع كوب ماء دافئ</span>. تجنب السوائل عالية السكر فوراً لعدم إرباك البنكرياس. هذه الوجبة الصغيرة تنشط غدد الهضم وتهيئ المعدة بلطف للوجبة الرئيسية بعد الصلاة.
                     </p>
                  </div>
               )}

               {activeTabSuggestion === 'water' && (
                  <div>
                     <h5 className="text-[10.5px] font-extrabold text-[#9F5A23] dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                        <span>نهج الإرواء والترطيب التدريجي</span>
                        <span className="text-xs">💧</span>
                     </h5>
                     <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                        شرب ٢ لتر فجأة يزيد العطش وإفراز البول لإجهاد الكلى! ننصح باستهلاك <span className="font-extrabold">كوب واحد من الماء (٢٥٠ مل) كل ٤٥ دقيقة</span> بانتظام طوال ساعات الإفطار، ليتمكن الجسم من تفعيل الترطيب الخلوي الحقيقي.
                     </p>
                  </div>
               )}

               {activeTabSuggestion === 'women' && (
                  <div>
                     <h5 className="text-[10.5px] font-extrabold text-[#9F5A23] dark:text-amber-400 mb-1 flex items-center justify-start gap-1 flex-row-reverse">
                        <span>توجيه لصحة وسياق صيام المرأة</span>
                        <span className="text-xs">🤰</span>
                     </h5>
                     <p className="text-[9.5px] text-amber-800/90 dark:text-amber-300/90 font-medium leading-relaxed">
                        للحوامل أو المرضعات، احرصي على قياس نسبة السكر والنبض بانتظام. عند المعاناة من <span className="font-extrabold">الوهن أو تباطؤ التركيز أو برودة الكفين</span> يجب الإفطار فوراً؛ فالرخصة الدينية والطبية رفيقة بالمرأة بامتياز.
                     </p>
                  </div>
               )}
               
               <div className="text-[8px] text-amber-600/70 dark:text-amber-400/75 mt-2 block font-extrabold text-left border-t border-amber-500/5 pt-1.5" dir="rtl">
                  💡 تلميحة صحية: صوم التطوع يُصلح البنية الخلوية ويعزز من كفاءة الالتهام الذاتي للسموم!
                </div>
             </div>
      )}

      {/* 💧 الشاشة الرئيسية - ويدجت كوب الماء البصري سريع الإضافة القابل للتمدد */}
      {false && (
      shouldHideWaterCard ? (
         <div className="rounded-[24px] p-4 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 mb-6 flex flex-row-reverse items-center justify-between text-right shadow-xs">
            <div className="flex items-center gap-2 flex-row-reverse">
               <span className="text-lg">🌙</span>
               <div className="text-right">
                  <h4 className="text-[10.5px] font-black text-amber-900 dark:text-amber-400">تم إخفاء كارت شرب الماء ومستكشف الارتواء</h4>
                  <p className="text-[8.5px] text-amber-800/80 dark:text-amber-300/80 font-bold mt-1">تطبيقاً لوضع الصيام الفعّال لليوم حتى صلاة المغرب 🌅 تقبل الله صيامكم!</p>
               </div>
            </div>
         </div>
      ) : (
         <div 
           onClick={() => setIsWaterCardExpanded(!isWaterCardExpanded)}
           className={cn(
             "rounded-[24px] p-4 border mb-6 relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
             styles.cardBg
           )}
         >
         <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10">
            <div className="flex items-center gap-1.5 flex-row-reverse text-sky-655 dark:text-sky-400">
               <Droplets className="w-4 h-4 text-sky-500 animate-pulse" />
               <span className="font-black text-xs leading-none">مستكشف الارتواء الذكي 💧</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/water');
              }}
              className="text-[9px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 rounded-full hover:bg-sky-100 transition-colors"
            >
              التفاصيل والتقارير ←
            </button>
         </div>

         <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
            {/* Visual Glass */}
            <div className="relative w-14 h-16 border-2 border-sky-150 dark:border-white/10 rounded-b-[16px] rounded-t-[4px] bg-white/30 dark:bg-white/5 overflow-hidden flex-shrink-0 flex items-end justify-center">
               <motion.div 
                 className={cn("absolute bottom-0 w-full rounded-b-[13px] bg-gradient-to-t",
                   isSpiritualActive ? "from-[#D4A373] to-[#D4A373]/60" : "from-sky-400 to-sky-300"
                 )}
                 initial={{ height: 0 }}
                 animate={{ height: `${Math.min((waterCount / dailyWaterGoal) * 100, 100)}%` }}
                 transition={{ type: 'spring', damping: 15 }}
               />
               <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-exclusion">
                  {Math.round(Math.min((waterCount / dailyWaterGoal) * 100, 100))}%
               </span>
            </div>

            {/* Metrics & Action */}
            <div className="flex-1 text-right flex flex-col justify-between h-16 py-0.5" dir="rtl">
               <div>
                  <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                     كوباية الارتواء اليومية
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-none">
                     لقد شربت <span className="text-sky-500 font-extrabold">{waterCount} مل</span> من هدفك المكيّف <span className="font-extrabold">({dailyWaterGoal} مل)</span>
                  </p>
               </div>
               
               {/* Quick Add Button or expand hint */}
               <div className="flex gap-2 justify-start items-center">
                  <button 
                     onClick={(e) => {
                        e.stopPropagation();
                        handleAddWater();
                     }}
                     disabled={waterAdding}
                     className={cn(
                       "text-[9px] font-black px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 shadow-sm text-white",
                       waterAdding ? "bg-sky-300 pointer-events-none" : "bg-sky-500 hover:bg-sky-600 shadow-sky-500/10"
                     )}
                  >
                    <Plus className={cn("w-3.5 h-3.5", waterAdding && "animate-spin")} />
                    {waterAdding ? "إضافة..." : "رشفة سريعة (+250 مل)"}
                  </button>
                  <span className="text-[9px] font-bold text-gray-400 select-none">
                    {isWaterCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط للمزيد من المشروبات ▼"}
                  </span>
               </div>
            </div>
         </div>

         {/* Expanding area inside with layout animation */}
         <AnimatePresence>
            {isWaterCardExpanded && (
               <motion.div 
                 initial={{ opacity: 0, height: 0, marginTop: 0 }}
                 animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                 exit={{ opacity: 0, height: 0, marginTop: 0 }}
                 className="pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 space-y-4 overflow-hidden text-right"
                 dir="rtl"
                 onClick={(e) => e.stopPropagation()}
               >
                  {/* ١. أحجام المية (Water Sizes) */}
                  <div className="space-y-2">
                     <div className="flex items-center gap-1 flex-row-reverse text-sky-600 dark:text-sky-400 font-black text-xs">
                        <Droplets className="w-4 h-4 text-sky-500 shrink-0" />
                        <span>أحجام المية والارتواء السريع 💧:</span>
                     </div>
                     <div className="grid grid-cols-5 gap-1.5" dir="rtl">
                        {[
                          { name: 'فنجان ☕', ml: 100 },
                          { name: 'كوب 🥛', ml: 150 },
                          { name: 'وسط 🍵', ml: 250 },
                          { name: 'كبير 🥤', ml: 350 },
                          { name: 'زجاجة 🫙', ml: 500 }
                        ].map((sz) => (
                           <button
                             type="button"
                             key={sz.ml}
                             disabled={waterAdding}
                             onClick={async () => {
                                await handleAddWaterCustom(sz.ml, 'ماء نقي بارد 🥛', 1.0);
                             }}
                             className="py-2.5 bg-sky-500/5 hover:bg-sky-500/15 border border-sky-500/10 text-gray-700 dark:text-gray-300 rounded-2xl text-[9px] font-black transition-all text-center flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
                           >
                             <span className="text-[10px]">{sz.name.split(' ')[0]}</span>
                             <span className="text-[8px] opacity-75 font-mono">{sz.ml}مل</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* ٢. المشروبات المثبتة مع إمكانية التعديل والحذف */}
                  <div className="space-y-2.5">
                     <div className="flex items-center justify-between flex-row-reverse text-xs font-black text-amber-600 dark:text-amber-400">
                        <div className="flex items-center gap-1 flex-row-reverse">
                           <Star className="w-4 h-4 text-amber-500 fill-amber-300 shrink-0" />
                           <span>مشروباتك المفضلة والمثبتة 📌:</span>
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold font-mono">({pinnedWaterList.length})</span>
                     </div>

                     {pinnedWaterList.length === 0 ? (
                        <div className="p-4 text-center bg-gray-500/5 border border-dashed border-gray-250/50 dark:border-white/5 rounded-2xl">
                           <p className="text-[10px] font-semibold text-gray-400">لا يوجد مشروبات مثبتة حالياً. استخدم خلاط المشروبات لتصميم وصفتك وتثبيتها!</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                           {pinnedWaterList.map((preset, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 bg-gray-100/50 dark:bg-white/5 border border-gray-150/40 dark:border-white/5 rounded-2xl flex items-center justify-between gap-2 text-right flex-row-reverse"
                              >
                                 <div className="flex gap-1 items-center shrink-0">
                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                         setSelectedPresetForEdit(preset);
                                         setIsDrinkCreatorOpen(true);
                                      }}
                                      title="تعديل المشروب"
                                      className="w-7 h-7 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-amber-500/10"
                                    >
                                       <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                         customTrackerStore.unpinWater(preset.displayName);
                                         window.dispatchEvent(new Event('waterQuickPinnedChanged'));
                                      }}
                                      title="حذف المشروب"
                                      className="w-7 h-7 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-rose-500/10"
                                    >
                                       <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                 </div>

                                 {/* Click to Log shortcut */}
                                 <button
                                   type="button"
                                   disabled={waterAdding}
                                   onClick={async () => {
                                      await handleLogDrinkFromModal(
                                         preset.ml,
                                         preset.displayName,
                                         preset.effectiveHydration / preset.ml,
                                         preset.totalCalories,
                                         0, // carbs
                                         0, // protein
                                         0  // fats
                                      );
                                   }}
                                   className="flex-1 flex items-center justify-between gap-1.5 text-right bg-transparent border-0 outline-none select-none cursor-pointer active:scale-95 transition-all flex-row-reverse overflow-hidden"
                                 >
                                    <div className="text-right overflow-hidden">
                                       <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 leading-tight truncate">{preset.beverageName}</p>
                                       <p className="text-[8.5px] text-gray-400 font-bold mt-1 leading-none font-mono">{preset.ml}مل | {preset.totalCalories} سعرة</p>
                                    </div>
                                    <span className="text-[9.5px] font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 px-2.5 py-1 rounded-xl shrink-0 font-mono">
                                       +{preset.ml}مل
                                    </span>
                                 </button>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* ٣. خلاط المشروبات ومصمم الارتواء */}
                  <div className="pt-2">
                     <button
                       type="button"
                       onClick={() => {
                          setSelectedPresetForEdit(null);
                          setIsDrinkCreatorOpen(true);
                       }}
                       className="w-full py-3 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 hover:from-sky-600 hover:to-amber-600 text-white font-black text-xs rounded-2xl active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-sky-500/10 cursor-pointer border-0"
                     >
                        <Sparkles className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
                        <span>🧪 فتح خلاط ومصمم تركيبات المشروبات الذكي</span>
                     </button>
                  </div>
               </motion.div>
             )}
          </AnimatePresence>
       </div>
       )
       )}

       {/* The Bento Summary: Today's Details Dashboard */}
       <div className={cn("rounded-[20px] p-3 shadow-xs border mb-6 relative overflow-hidden transition-all duration-300", styles.cardBg)}>
         <div className="flex justify-between flex-row-reverse items-center mb-4 relative z-10">
            <div className="flex items-center gap-1.5 flex-row-reverse text-gray-800 dark:text-white border-b-2 border-primary/20 pb-1">
               <Clock className="w-4 h-4 text-[#C2185B]" />
               <h3 className="font-bold text-xs tracking-wide">تفاصيل وإنجازات اليوم الحية</h3>
            </div>
         </div>
         <div className="flex justify-between items-center flex-row-reverse text-center divide-x divide-gray-100 dark:divide-white/10 divide-x-reverse relative z-10">
            <div className="flex-1 px-1">
               <div className="text-[9px] font-bold tracking-tight text-gray-500 mb-1.5">الماء</div>
               <div className="font-black text-xs sm:text-sm text-sky-500 leading-none">{(waterCount/1000).toFixed(1)} <span className="text-[7px] text-gray-400 font-bold ml-0.5">لتر</span></div>
            </div>
            <div className="flex-1 px-1">
               <div className="text-[9px] font-bold tracking-tight text-gray-500 mb-1.5">الخطوات</div>
               <div className="font-black text-xs sm:text-sm text-emerald-500 leading-none">{stepCount.toLocaleString('ar-EG')} <span className="text-[7px] text-gray-400 font-bold ml-0.5">خطوات</span></div>
            </div>
            <div className="flex-1 px-1">
               <div className="text-[9px] font-bold tracking-tight text-gray-500 mb-1.5">النوم</div>
               <div className="font-black text-xs sm:text-sm text-indigo-500 leading-none">{sleepHours.toFixed(1)} <span className="text-[7px] text-gray-400 font-bold ml-0.5">س</span></div>
            </div>
            <div className="flex-1 px-1">
               <div className="text-[9px] font-bold tracking-tight text-gray-500 mb-1.5">السعرات</div>
               <div className="font-black text-xs sm:text-sm text-orange-500 leading-none">{loggedCalories} <span className="text-[7px] text-gray-400 font-bold ml-0.5">سعرة</span></div>
            </div>
            <div className="flex-1 px-1">
               <div className="text-[9px] font-bold tracking-tight text-gray-500 mb-1.5">الأدوية</div>
               <div className="font-black text-xs sm:text-sm text-amber-500 leading-none">{medsStatus.takenCount}/{medsStatus.totalScheduled} <span className="text-[7px] text-gray-400 font-bold ml-0.5">جرع</span></div>
            </div>
         </div>
      </div>

      {/* Micro-Apps Architecture Cards List - Sleek, rectangular, expandable, direct data input */}
      <div className="mb-6 space-y-4 text-right" dir="rtl">
         <div className="flex justify-between items-center mb-1 flex-row-reverse">
             <h3 className="font-bold text-sm text-[#1A1A2E] dark:text-white">متابعة مؤشراتي اليومية الأساسية 🎯</h3>
             <span className="text-[10px] font-bold text-gray-400">تحديث فوري وتفاعلي</span>
         </div>

         {/* --- كروت الخلاصلة التفاعلية الذكية الموزعة ديناميكياً --- */}
         {cardSettings.order.map((cardKey: string) => renderCardByKey(cardKey))}

         {/* 💧 كارت شرب المية ومستكشف الارتواء الذكي - المستطيل الأساسي الأول */}
         {false && (shouldHideWaterCard ? (
            <div className="rounded-[24px] p-4 bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 mb-4 flex flex-row-reverse items-center justify-between text-right shadow-xs">
               <div className="flex items-center gap-2 flex-row-reverse">
                  <span className="text-lg">🌙</span>
                  <div className="text-right">
                     <h4 className="text-[10.5px] font-black text-amber-900 dark:text-amber-400">تم إخفاء كارت شرب الماء ومستكشف الارتواء</h4>
                     <p className="text-[8.5px] text-amber-800/80 dark:text-amber-300/80 font-bold mt-1">تطبيقاً لوضع الصيام الفعّال لليوم 🌅 تقبل الله صيامكم!</p>
                  </div>
               </div>
            </div>
         ) : (
            <div 
              id="dashboard-water-card"
              onClick={() => setIsWaterCardExpanded(!isWaterCardExpanded)}
              className={cn(
                "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
                activeCardHighlight === 'water' ? "ring-4 ring-offset-2 ring-sky-400 dark:ring-sky-500 shadow-2xl scale-[1.01] z-20" : "",
                styles.cardBg
              )}
            >
               <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10">
                  <div className="flex items-center gap-1.5 flex-row-reverse text-sky-655 dark:text-sky-400">
                     <Droplets className="w-4 h-4 text-sky-500 animate-pulse" />
                     <span className="font-black text-xs leading-none">مستكشف الارتواء الذكي 💧</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/water');
                    }}
                    className="text-[9px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1 rounded-full hover:bg-sky-100 transition-colors pointer-events-auto cursor-pointer"
                  >
                    التفاصيل والتقارير ←
                  </button>
               </div>

               <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                  {/* Visual Glass */}
                  <div className="relative w-14 h-15 border-2 border-sky-150 dark:border-white/10 rounded-b-[16px] rounded-t-[4px] bg-white/30 dark:bg-white/5 overflow-hidden flex-shrink-0 flex items-end justify-center">
                     <motion.div 
                       className={cn("absolute bottom-0 w-full rounded-b-[13px] bg-gradient-to-t",
                         isSpiritualActive ? "from-[#D4A373] to-[#D4A373]/60" : "from-sky-400 to-sky-300"
                       )}
                       initial={{ height: 0 }}
                       animate={{ height: `${Math.min((waterCount / dailyWaterGoal) * 100, 100)}%` }}
                       transition={{ type: 'spring', damping: 15 }}
                     />
                     <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white mix-blend-exclusion">
                        {Math.round(Math.min((waterCount / dailyWaterGoal) * 100, 100))}%
                     </span>
                  </div>

                  {/* Metrics & Action */}
                  <div className="flex-1 text-right flex flex-col justify-between h-15 py-0.5" dir="rtl">
                     <div>
                        <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                           كوباية الارتواء اليومية
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-1.5 leading-none">
                           لقد شربت <span className="text-sky-500 font-extrabold">{waterCount} مل</span> من هدفك المكيّف <span className="font-extrabold">({dailyWaterGoal} مل)</span>
                        </p>
                     </div>
                     <div className="w-full">
                        <div className="w-full h-1 bg-sky-100 dark:bg-sky-955/25 rounded-full overflow-hidden flex flex-row-reverse">
                           <div className="bg-sky-500 h-full transition-all" style={{ width: `${Math.min((waterCount / dailyWaterGoal) * 100, 100)}%` }}></div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Hint footer */}
               <div className="text-[9px] text-gray-400 mt-2 text-left select-none relative z-10">
                  {isWaterCardExpanded ? "اضغط لإغلاق التحكم والتحضير ▲" : "اضغط لفتح كوب الماء وحاسبة الجرعات السريعة ▼"}
               </div>

               {/* Expanded area */}
               <AnimatePresence>
                  {isWaterCardExpanded && (
                     <motion.div 
                       initial={{ opacity: 0, height: 0, marginTop: 0 }}
                       animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                       exit={{ opacity: 0, height: 0, marginTop: 0 }}
                       className="pt-4 border-t border-sky-100 dark:border-sky-955/20 relative z-10 space-y-4 overflow-hidden text-right"
                       dir="rtl"
                       onClick={(e) => e.stopPropagation()}
                     >
                        {/* Water direct input */}
                        <div className="flex flex-col gap-2.5">
                           <span className="text-[10px] font-black text-gray-400 block text-right">تسجيل سريع وإرواء فوري:</span>
                           <div className="grid grid-cols-4 gap-2">
                              {[100, 250, 500, 750].map((ml) => (
                                 <button
                                   type="button"
                                   key={ml}
                                   disabled={waterAdding}
                                   onClick={async () => {
                                      await handleLogDrinkFromModal(
                                         ml,
                                         `كوب ماء سريع (${ml} مل)`,
                                         1, // factor
                                         0, // cal
                                         0, // carbs
                                         0, // protein
                                         0  // fats
                                      );
                                   }}
                                   className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-sky-50 dark:hover:bg-sky-900/20 border border-transparent hover:border-sky-300 dark:hover:border-sky-850 text-center transition-all active:scale-95 cursor-pointer"
                                 >
                                    <p className="text-xs font-black text-sky-600 dark:text-sky-400 leading-none">+{ml}</p>
                                    <p className="text-[8px] text-gray-400 mt-1 leading-none">مل</p>
                                 </button>
                              ))}
                           </div>
                        </div>

                        {/* Quick pin shortcuts */}
                        <div className="space-y-2 border-t border-gray-100 dark:border-white/5 pt-3 text-right">
                           <span className="text-[10px] font-black text-gray-400 block pb-1">مشروباتك المثبتة وسريعة الإضافة:</span>
                           {pinnedWaterList.length === 0 ? (
                              <p className="text-[9px] text-gray-400 font-bold">لم تقم بتثبيت أي مشروبات مخصصة بعد. افتح خلاط المشروبات لتثبيت مشروب من السلسلة السريعة!</p>
                           ) : (
                              <div className="grid grid-cols-2 gap-2">
                                 {pinnedWaterList.map((preset: any) => (
                                    <div key={preset.displayName} className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-sky-100/30 dark:border-white/5 flex items-center justify-between gap-1.5 flex-row-reverse text-right">
                                       <div className="flex items-center gap-1.5">
                                          <button 
                                            onClick={() => customTrackerStore.unpinWater(preset.displayName)}
                                            className="w-7 h-7 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-rose-500/10 shrink-0"
                                          >
                                             <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                       </div>
                                       <button
                                         type="button"
                                         disabled={waterAdding}
                                         onClick={async () => {
                                            await handleLogDrinkFromModal(
                                               preset.ml,
                                               preset.displayName,
                                               preset.effectiveHydration / preset.ml,
                                               preset.totalCalories,
                                               0, 0, 0
                                            );
                                         }}
                                         className="flex-1 flex items-center justify-between gap-1 text-right bg-transparent border-0 outline-none select-none cursor-pointer active:scale-95 transition-all flex-row-reverse overflow-hidden"
                                       >
                                          <div className="text-right overflow-hidden">
                                             <p className="text-[11px] font-black text-gray-800 dark:text-gray-200 leading-tight truncate">{preset.beverageName}</p>
                                             <p className="text-[8.5px] text-gray-400 font-bold mt-1 leading-none font-mono">{preset.ml}مل | {preset.totalCalories} سعرة</p>
                                          </div>
                                          <span className="text-[9.5px] font-black bg-sky-500/15 text-sky-600 dark:text-sky-400 px-2.5 py-1 rounded-xl shrink-0 font-mono">
                                             +{preset.ml}مل
                                          </span>
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>

                        {/* خلاط المشروبات ومصمم الارتواء */}
                        <div className="pt-2">
                           <button
                             type="button"
                             onClick={() => {
                                setSelectedPresetForEdit(null);
                                setIsDrinkCreatorOpen(true);
                             }}
                             className="w-full py-3 bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 hover:from-sky-600 hover:to-amber-600 text-white font-black text-xs rounded-2xl active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-md shadow-sky-500/10 cursor-pointer border-0"
                           >
                              <Sparkles className="w-3.5 h-3.5 text-white animate-pulse shrink-0" />
                              <span>🧪 فتح خلاط ومصمم تركيبات المشروبات الذكي</span>
                           </button>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
         ))}

         {/* 👣 كارت الممشى وعداد الخطوات الذكي (Step Counter) - أضيف بناءً على طلبك */}
         {false && (
         <div 
           onClick={() => setIsStepsCardExpanded(!isStepsCardExpanded)}
           className={cn(
             "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
             isFastingMode ? "bg-[#0B1528] border-blue-955/45 hover:bg-[#0e213b]" : "bg-gradient-to-br from-emerald-50/10 to-white dark:from-[#0f1d17] dark:to-[#121c17] border-emerald-100/35 dark:border-emerald-950/30 hover:border-emerald-200"
           )}
         >
            <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
               <div className="flex items-center gap-1.5 flex-row-reverse text-emerald-655 dark:text-emerald-400">
                  <Footprints className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span className="font-black text-xs leading-none">ممشى الصحة وعداد الخطوات 👣</span>
               </div>
               <div className="flex items-center gap-1 flex-row">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black text-gray-400">الهدف: {(profile.dailyStepGoal || 10000).toLocaleString('ar-EG')}</span>
               </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
               {/* Visual Percentage Indicator */}
               <div className="w-10 h-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-300/20 dark:border-emerald-500/20 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] shrink-0">
                  🏃‍♂️
                  <span className="text-[8px] font-extrabold leading-none mt-0.5">
                     {Math.min(Math.round((stepCount / (profile.dailyStepGoal || 10000)) * 100), 100)}%
                  </span>
               </div>

               {/* Progress and status message */}
               <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                  <div>
                     <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                        خطواتك المحرزة اليوم
                     </h4>
                     <p className="text-[10px] text-gray-505 dark:text-gray-450 font-bold mt-1.5 leading-none">
                        خطوتك الحالية: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{stepCount.toLocaleString('ar-EG')}</span> من الهدف <span className="font-extrabold">{(profile.dailyStepGoal || 100).toLocaleString('ar-EG')}</span>.
                     </p>
                     <p className="text-[9px] text-[#C2185B] dark:text-rose-400 font-black mt-1 leading-none">
                        {stepCount === 0 && "مستعد للحركة؟ أضف خطواتك لتنشيط حرق السعرات اليوم الحيوية! 🔥"}
                        {stepCount > 0 && stepCount < 3000 && "بداية جيدة! خذ جولة مشي قصيرة لزيادة النشاط 🚶‍♂️"}
                        {stepCount >= 3000 && stepCount < 7000 && isFemale ? "مستوى نشاط ممتاز، اقتربتِ بنجاح! كملي بطلة الممشى 🌟" : "مستوى نشاط ممتاز، اقتربت بنجاح! كمل بطل الممشى 🌟"}
                        {stepCount >= 7000 && stepCount < 10000 && "رااااائع! نشاطك مميز جداً ومثالي للدايت والقلب 🟢"}
                        {stepCount >= 10000 && isFemale ? "أنتِ بطلة الممشى الذهبية اليوم! هدفكِ تحقق بنجاح تام 🏆🔥" : "أنت بطل الممشى الذهبي اليوم! هدفك تحقق بنجاح تام 🏆🔥"}
                     </p>
                  </div>
                  <div className="w-full mt-2">
                     <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-full overflow-hidden flex flex-row-reverse">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min((stepCount / (profile.dailyStepGoal || 10000)) * 100, 100)}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center relative z-10 flex-row-reverse">
               <span className="text-[8px] font-bold text-gray-400">
                  {isStepsCardExpanded ? "انقر لإغلاق التحكم السريع ▲" : "انقر لتسجيل الخطوات والتحكم السريع بنقرة واحدة ▼"}
               </span>
               <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400">
                  + إضافة خطوات وسجل الحركة
               </span>
            </div>

            {/* Expanded section for steps logging and history */}
            <AnimatePresence>
               {isStepsCardExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3 overflow-hidden relative z-10"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  >
                     <div className="bg-emerald-500/5 dark:bg-white/5 p-3 rounded-2xl border border-emerald-500/10 space-y-3">
                        <span className="text-[9.5px] font-black text-emerald-600 dark:text-emerald-450 block text-right">⚡ سجل خطواتك فوراً بنقرة واحدة:</span>
                        <div className="grid grid-cols-4 gap-1.5">
                           <button
                             type="button"
                             onClick={() => handleAddSteps(500, 'إضافة سريعة (+500)')}
                             className="py-1.5 bg-white dark:bg-white/5 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black rounded-lg border border-gray-100 dark:border-white/10 shadow-xs cursor-pointer"
                           >
                              +٥٠٠
                           </button>
                           <button
                             type="button"
                             onClick={() => handleAddSteps(1000, 'إضافة سريعة (+1000)')}
                             className="py-1.5 bg-white dark:bg-white/5 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black rounded-lg border border-gray-100 dark:border-white/10 shadow-xs cursor-pointer"
                           >
                              +١,٠٠٠
                           </button>
                           <button
                             type="button"
                             onClick={() => handleAddSteps(3000, 'رياضة المشي')}
                             className="py-1.5 bg-white dark:bg-white/5 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black rounded-lg border border-gray-100 dark:border-white/10 shadow-xs cursor-pointer"
                           >
                              +٣,٠٠٠
                           </button>
                           <button
                             type="button"
                             onClick={() => handleAddSteps(5000, 'هرولة وجري عالي الكثافة')}
                             className="py-1.5 bg-white dark:bg-white/5 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-black rounded-lg border border-gray-100 dark:border-white/10 shadow-xs cursor-pointer"
                           >
                              +٥,٠٠٠
                           </button>
                        </div>

                        {/* Custom Input */}
                        <div className="flex gap-2 items-end pt-1 flex-row-reverse">
                           <div className="flex-1 text-right">
                              <label className="text-[8.5px] font-black text-gray-400 block mb-1">تسجيل مخصص للخطوات:</label>
                              <input 
                                type="number"
                                id="customStepInput"
                                placeholder="مثال: 4500"
                                onKeyDown={(e) => {
                                   if (e.key === 'Enter') {
                                      const val = parseInt((e.target as HTMLInputElement).value);
                                      if (val > 0) {
                                         handleAddSteps(val, 'إدخال مخصص');
                                         (e.target as HTMLInputElement).value = '';
                                      }
                                   }
                                }}
                                className="w-full bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-right font-bold focus:outline-hidden focus:border-emerald-500"
                              />
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                                const input = document.getElementById('customStepInput') as HTMLInputElement;
                                if (input && input.value) {
                                   const val = parseInt(input.value);
                                   if (val > 0) {
                                      handleAddSteps(val, 'إدخال مخصص');
                                      input.value = '';
                                   }
                                }
                             }}
                             className="bg-emerald-500 text-white rounded-xl px-3.5 py-1.5 hover:bg-emerald-600 transition-colors text-[10px] font-black h-9"
                           >
                              سجل الآن
                           </button>
                        </div>
                     </div>

                     {/* --- +++ أضيفت لتشريح وتفعيل وحساب مستشعرات حركة الهاتف التلقائية بذكاء فائق بناءً على طلبك +++ --- */}
                     <div className="bg-gradient-to-br from-indigo-500/5 to-teal-500/5 dark:from-indigo-950/20 dark:to-teal-950/20 p-3.5 rounded-2xl border border-indigo-500/15 space-y-3">
                        <div className="flex items-center justify-between flex-row-reverse">
                           <div className="flex items-center gap-1.5 flex-row-reverse text-indigo-600 dark:text-indigo-400">
                              <Smartphone className="w-4 h-4 text-indigo-500 animate-pulse" />
                              <span className="font-black text-[10.5px]">تتبع خطواتك تلقائياً بحساس حركة الهاتف 📱🚶‍♂️</span>
                           </div>
                           <span className="text-[7.5px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-black px-1.5 py-0.5 rounded-md">مستشعر دقيق مباشر</span>
                        </div>
                        
                        <p className="text-[9.5px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed text-right">
                           احمل الهاتف بيدك وتحرك! يستشعر متصفحك حركة وتذبذبات الهاتف الذكي بمحاوره الثلاثية (X, Y, Z) ليتعرف تلقائياً على خطواتك الحقيقية ويصنف نوع حركتك (مشياً، جرياً، أو سكوناً) مع اهتزاز اهتزاز تأكيدي لطيف.
                        </p>

                        {/* Toggle Sensor Switch */}
                        <div className="flex items-center justify-between bg-white dark:bg-[#121212] p-2.5 rounded-xl border border-gray-150 dark:border-white/5 flex-row-reverse">
                           <span className="text-[9.5px] font-black text-gray-700 dark:text-gray-300">
                              {isPhoneSensorActive ? "العداد التلقائي نشط الآن ويستشعر اهتزاز خطواتك 🟢" : "تتبع خطواتك تلقائياً بحساس موبايلك الذكي ❌"}
                           </span>
                           <button
                             type="button"
                             onClick={() => setIsPhoneSensorActive(!isPhoneSensorActive)}
                             className={cn(
                               "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                               isPhoneSensorActive ? "bg-emerald-500" : "bg-gray-200 dark:bg-white/10"
                             )}
                           >
                             <span className="sr-only">تفعيل الحساس</span>
                             <span
                               className={cn(
                                 "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                 isPhoneSensorActive ? "translate-x-0" : "-translate-x-5"
                               )}
                             />
                           </button>
                        </div>

                        {sensorError && (
                           <div className="p-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-500/10 rounded-xl text-[8.5px] text-rose-500 text-right font-black">
                              ⚠️ {sensorError}
                           </div>
                        )}

                        {isPhoneSensorActive && (
                           <div className="space-y-2 text-right">
                              <div className="flex justify-between items-center bg-indigo-500/5 p-2 rounded-xl flex-row-reverse">
                                 <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400">النشاط الملتقط حالياً:</span>
                                 <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md", 
                                    motionType === 'running' ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse" :
                                    motionType === 'walking' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-gray-500/10 text-gray-450"
                                 )}>
                                    {motionType === 'running' ? "🏃‍♂️ هرولة وجري وجري سريع" : 
                                     motionType === 'walking' ? "🚶‍♂️ مشي رشيق نشط" : "🧍‍♂️ ثبات وبقاء ساكن"}
                                 </span>
                              </div>

                              {/* Dynamic Wave Oscilloscope with CSS */}
                              <div className="space-y-1.5 p-2 bg-black/5 dark:bg-black/35 rounded-xl border border-gray-150 dark:border-white/5">
                                 <div className="flex justify-between text-[8px] text-gray-400 font-bold flex-row-reverse mb-0.5">
                                    <span>رصد وتردد المحاور الحية لموجة التسارع بالهاتف:</span>
                                    <span className="font-mono text-emerald-500 animate-pulse">رصد مستمر Hz 60</span>
                                 </div>
                                 <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-0.5 text-right">
                                       <div className="flex justify-between text-[7px] font-bold text-rose-500 flex-row-reverse">
                                          <span>المحور X (الأفقي)</span>
                                          <span className="font-mono font-black">{xyzForces.x.toFixed(2)}</span>
                                       </div>
                                       <div className="w-full bg-gray-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden flex">
                                          <div className="bg-rose-500 h-full transition-all duration-75" style={{ width: `${Math.min(Math.abs(xyzForces.x) * 8, 100)}%` }}></div>
                                       </div>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                       <div className="flex justify-between text-[7px] font-bold text-emerald-500 flex-row-reverse">
                                          <span>المحور Y (الرأسي)</span>
                                          <span className="font-mono font-black">{xyzForces.y.toFixed(2)}</span>
                                       </div>
                                       <div className="w-full bg-gray-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden flex flex-row">
                                          <div className="bg-emerald-500 h-full transition-all duration-75" style={{ width: `${Math.min(Math.abs(xyzForces.y) * 8, 100)}%` }}></div>
                                       </div>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                       <div className="flex justify-between text-[7px] font-bold text-blue-500 flex-row-reverse">
                                          <span>المحور Z (العمق)</span>
                                          <span className="font-mono font-black">{xyzForces.z.toFixed(2)}</span>
                                       </div>
                                       <div className="w-full bg-gray-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden flex">
                                          <div className="bg-blue-500 h-full transition-all duration-75" style={{ width: `${Math.min(Math.abs(xyzForces.z) * 8, 100)}%` }}></div>
                                       </div>
                                    </div>
                                 </div>
                               </div>
                           </div>
                        )}
                     </div>

                     {/* Sessions logged history today */}
                     <div>
                        <span className="text-[9.5px] font-black text-gray-400 block mb-1.5 text-right">📋 جلسات الحركة المسجلة اليوم:</span>
                        {stepLogs.filter((log: any) => {
                           const d = new Date(log.timestamp);
                           const t = new Date();
                           return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
                        }).length === 0 ? (
                           <div className="text-center py-2 text-gray-450 text-[9px] font-bold">لم تسجل أي حركة اليوم بعد. ابدأ بالحركة ليكون ممشاك واعداً! 🚶‍♂️🌟</div>
                        ) : (
                           <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                              {stepLogs.filter((log: any) => {
                                 const d = new Date(log.timestamp);
                                 const t = new Date();
                                 return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
                              }).map((log: any, idx: number) => (
                                 <div key={log.id || idx} className="bg-gray-50 dark:bg-[#1A1A1A] p-2 rounded-xl flex items-center justify-between flex-row-reverse text-right text-[10px] border border-gray-100/50 dark:border-white/5">
                                    <div className="flex items-center gap-1.5 flex-row-reverse">
                                       <span className="text-emerald-500">👟</span>
                                       <span className="font-extrabold text-gray-800 dark:text-gray-200">{(log.steps || 0).toLocaleString('ar-EG')} خطوة</span>
                                       <span className="text-gray-400 text-[9px]">({log.context || 'إضافة سريعة'})</span>
                                    </div>
                                    <span className="text-gray-400 text-[8.5px]">
                                       {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
         )}

         {/* 📱 كارت تثبيت تطبيق الموبايل ودليل الـ PWA / APK الذكي - أضيف بناءً على طلبك */}
         {true && (
         <div 
           onClick={() => setIsApkCardExpanded(!isApkCardExpanded)}
           className="rounded-[24px] p-4 border border-blue-100/70 dark:border-blue-955/20 bg-gradient-to-br from-blue-50/15 to-white dark:from-[#0d162a] dark:to-[#090e1a] relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none"
         >
            <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
               <div className="flex items-center gap-1.5 flex-row-reverse text-blue-650 dark:text-blue-405">
                  <Smartphone className="w-4 h-4 text-blue-500 animate-bounce" />
                  <span className="font-black text-xs leading-none">تطبيق الموبايل ونسخة الـ APK الرسمية 📱</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <span className="text-[8.5px] font-black bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">النسخة المحمولة v1.2</span>
               </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
               <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/5 border border-blue-300/20 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-base shrink-0">
                  📥
               </div>

               <div className="flex-1 text-right" dir="rtl">
                  <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                     تثبيت التطبيق على هاتفك للدخول السريع
                  </h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-450 font-bold mt-1.5 leading-relaxed">
                     تصفح LifeCompanion بمرونة كاملة وسرعة فائقة بدون شريط المتصفحات الشائعة! حمل ملف الـ <span className="text-blue-600 font-extrabold">APK المباشر</span> للأندرويد، أو اتبع دليل التثبيت السريع للـ PWA بضغطة زر وتثبيته كأيقونة على شاشتك.
                  </p>
               </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center relative z-10 flex-row-reverse">
               <span className="text-[8px] font-bold text-gray-400">
                  {isApkCardExpanded ? "انقر لإغلاق دليل الموبايل السريع ▲" : "انقر لعرض دليل التثبيت لآبل وأندرويد وزر تحميل الـ APK المباشر ▼"}
               </span>
               <span className="text-[8px] font-black text-blue-600 dark:text-blue-400">
                  تحميل وتثبيت التطبيق ←
               </span>
            </div>

            {/* Expanded Content Section */}
            <AnimatePresence>
               {isApkCardExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3 overflow-hidden relative z-10"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  >
                     {/* Direct APK Download Portion */}
                     <div className="p-3 bg-blue-500/5 dark:bg-white/5 border border-blue-550/15 rounded-2xl text-center space-y-2">
                        <h5 className="text-[10.5px] font-black text-blue-650 dark:text-blue-400 text-right">🤖 هواتف الأندرويد - فك التثبيت المباشر للـ APK:</h5>
                        <p className="text-[9.5px] text-gray-450 font-bold text-right leading-relaxed">
                           اضغط على الزر أدناه لتنزيل ملف الـ APK المباشر لهواتف أندرويد لتثبيت التطبيق كأيقونة مخصصة مستقلة تماماً عن المتصفحات وتنزيل الملف وحفظه:
                        </p>
                        <a 
                          href="/api/download-apk"
                          download="health_companion.apk"
                          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black shadow-sm shadow-blue-600/25 transition-all active:scale-95 cursor-pointer mt-1"
                        >
                           <Download className="w-3.5 h-3.5" />
                           تنزيل ملف الـ APK وتثبيته فوراً كـ App أندرويد
                        </a>
                     </div>

                     {/* Progressive Web App (PWA) Options */}
                     <div className="space-y-2">
                        <h5 className="text-[10.5px] font-black text-indigo-600 dark:text-indigo-400 text-right font-sans">📱 التثبيت فوري بدون تحميل كـ Web App (سرعة فائقة وذكاء):</h5>
                        <p className="text-[9px] text-gray-440 font-bold text-right leading-relaxed">
                           يمكنك تثبيت التطبيق بنقرة واحدة عبر متصفح هاتفك الأصلي بدون استهلاك لمساحة تخزينية ولا انتظار:
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-right">
                           <div className="p-2.5 bg-gray-50 maroon-dark dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5 space-y-1">
                              <p className="text-[10px] font-black text-gray-800 dark:text-gray-200">🍏 هواتف آيفون (Safari):</p>
                              <ol className="text-[8.5px] text-gray-450 font-bold space-y-1 list-decimal pr-3 font-sans leading-relaxed">
                                 <li>افتح موقع التطبيق بمتصفح <span className="font-extrabold text-blue-500">Safari</span></li>
                                 <li>اضغط على زر مشاركة المتصفح <span className="font-extrabold text-blue-500">Share ⎋</span> بالأسفل</li>
                                 <li>اختر خيار <span className="font-extrabold text-[#1A1A2E] dark:text-white">"إضافة إلى الشاشة الرئيسية"</span>.</li>
                              </ol>
                           </div>
                           <div className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/5 space-y-1">
                              <p className="text-[10px] font-black text-gray-800 dark:text-gray-200">🤖 هواتف الأندرويد (Chrome):</p>
                              <ol className="text-[8.5px] text-gray-450 font-bold space-y-1 list-decimal pr-3 font-sans leading-relaxed">
                                 <li>انقر فوق النقاط الثلاث <span className="font-extrabold text-blue-500">⁝</span> بمتصفح كروم</li>
                                 <li>اختر خيار <span className="font-black text-[#1A1A2E] dark:text-white">"تثبيت التطبيق"</span> أو المكتوب عليه <span className="font-black text-[#1A1A2E] dark:text-white">"إضافة إلى الشاشة الرئيسية"</span>.</li>
                                 <li>ثبّت التطبيق وستجده بأيقونته الرائعة بهاتفك!</li>
                              </ol>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
         )}

         {/* 1. Women's Companion Card (only for females) */}
         {isFemale && (
            <div 
              onClick={() => setIsWomenCardExpanded(!isWomenCardExpanded)}
              className={cn(
                "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
                isFastingMode ? "bg-[#091D17] border-emerald-950/45 hover:bg-[#0c2a21]" : "bg-gradient-to-br from-pink-50/20 to-white dark:from-[#211B24] dark:to-[#1A1A1A] border-pink-100/55 dark:border-pink-900/10 hover:border-pink-200"
              )}
            >
               <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
                  <div className="flex items-center gap-2 flex-row-reverse text-[#C2185B]">
                     <HeartPulse className="w-4 h-4 text-pink-500 animate-pulse" />
                     <span className="font-black text-xs leading-none">رفيقة المرأة والحيض 🌸</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/womens-health');
                    }}
                    className="text-[9px] font-black text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 px-2.5 py-1 rounded-full hover:bg-pink-100 transition-colors"
                  >
                     التفاصيل والتنبؤ ←
                  </button>
               </div>

               <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
                  {/* Indicator graphic style */}
                  {/* // +++ تم التعديل لتلافي تداخل الكلام وجعل العرض رشيقاً وجميلاً +++ */}
                  <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/40 border border-pink-200/50 flex items-center justify-center text-pink-600 font-extrabold text-[11px] shrink-0">
                     ي {cycleStatus.cycleDay || 1}
                  </div>

                  {/* Summary progress bar */}
                  <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                     <div>
                        <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                           حالة الدورة والطور الحالي
                        </h4>
                        {/* // +++ تم التعديل هنا لتجنب تكرار (من ٢٨) ولتصحيح منطق العرض +++ */}
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                           {cycleStatus.text} • <span className="text-pink-600 font-extrabold">
                             {cycleStatus.phase === 'menstrual' 
                               ? `اليوم ${cycleStatus.cycleDay} من الحيض` 
                               : `اليوم ${cycleStatus.cycleDay} من دورة الـ ${cycleStats.averageCycle} يوماً`
                             }
                           </span>
                        </p>
                     </div>
                     <div className="w-full mt-2.5">
                        <div className="w-full h-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                           <div className="bg-[#C2185B] h-full transition-all" style={{ width: `${cycleStatus.percent}%` }}></div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Hint footer */}
               <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
                  {isWomenCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتسجيل الأعراض أو بدء الدورة الشهرية اليوم ▼"}
               </div>

               {/* Expanded area */}
               <AnimatePresence>
                  {isWomenCardExpanded && (
                     <motion.div 
                       initial={{ opacity: 0, height: 0, marginTop: 0 }}
                       animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                       exit={{ opacity: 0, height: 0, marginTop: 0 }}
                       className="pt-4 border-t border-pink-100 dark:border-pink-900/20 relative z-10 space-y-3 overflow-hidden"
                       dir="rtl"
                       onClick={(e) => e.stopPropagation()}
                     >
                        <span className="text-[10px] font-black text-gray-400 block text-right">تسجيل سريع للبيانات:</span>
                        <div className="flex flex-wrap gap-2 justify-start">
                           <button
                             type="button"
                             onClick={async () => {
                               if (!user) return;
                               const isMenstrualActive = cycleStatus.phase === 'menstrual' && (cycleStatus as any).activePeriodLog;
                               if (isMenstrualActive) {
                                  const activeLog = (cycleStatus as any).activePeriodLog;
                                  const ok = window.confirm("هل ترغبين في تسجيل انتهاء الدورة الشهرية (الحيض) اليوم؟ 🌸");
                                  if (!ok) return;
                                  try {
                                    if (user.uid === 'local_guest_user') {
                                       const saved = localStorage.getItem('local_cycle_logs') || '[]';
                                       const list = JSON.parse(saved);
                                       const updated = list.map((l: any) => {
                                          if (l.id === activeLog.id) {
                                             return { ...l, endDate: Date.now() };
                                          }
                                          return l;
                                       });
                                       localStorage.setItem('local_cycle_logs', JSON.stringify(updated));
                                       window.dispatchEvent(new Event('localCycleUpdated'));
                                    } else {
                                       await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', activeLog.id), {
                                          endDate: Date.now()
                                       });
                                       window.dispatchEvent(new Event('localCycleUpdated'));
                                    }
                                    alert("تم تسجيل انتهاء الدورة الشهرية بنجاح. نتمنى لكِ دوام العافية والنشاط! 🌸✨");
                                  } catch (e) {
                                    console.error("Failed to update ending of period log:", e);
                                  }
                                  return;
                               }

                               // Quick Period Log today
                               const newLog = {
                                 startDate: Date.now(),
                                 status: 'period',
                                 symptoms: ['مغص خفيف'],
                                 timestamp: Date.now()
                               };
                               try {
                                 if (user.uid === 'local_guest_user') {
                                    const saved = localStorage.getItem('local_cycle_logs') || '[]';
                                    const list = JSON.parse(saved);
                                    list.unshift({ id: `local_${Date.now()}`, ...newLog });
                                    localStorage.setItem('local_cycle_logs', JSON.stringify(list));
                                    window.dispatchEvent(new Event('localCycleUpdated'));
                                 } else {
                                    await addDoc(collection(db, 'users', user.uid, 'cycleLogs'), newLog);
                                 }
                                 alert("تم تسجيل بدء الدورة الشهرية اليوم بنجاح 🩸");
                               } catch (e) {
                                 console.error("Failed to add period log:", e);
                               }
                             }}
                             className={cn(
                                "px-3 py-2 rounded-xl text-[10px] font-black bg-pink-500 text-white hover:bg-pink-600 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm shadow-pink-500/10",
                                cycleStatus.phase === 'menstrual' && (cycleStatus as any).activePeriodLog && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
                              )}
                           >
                              {cycleStatus.phase === 'menstrual' && (cycleStatus as any).activePeriodLog
                                 ? "🌸 تسجيل انتهاء الحيض اليوم"
                                 : "🩸 تسجيل بدء بريود جديدة اليوم"}
                           </button>

                           <button
                             type="button"
                             onClick={() => {
                               setMood('pain');
                               localStorage.setItem('user_mood', 'pain');
                               navigate('/symptoms');
                             }}
                             className="px-3 py-2 rounded-xl text-[10px] font-bold bg-gray-50 dark:bg-white/5 border border-pink-100 dark:border-pink-900/10 text-[#C2185B] hover:bg-pink-50/50 transition-all active:scale-95"
                           >
                              ⚡️ تسجيل ألم أو مغص اليوم
                           </button>
                        </div>
                     </motion.div>
                  )}
               </AnimatePresence>
            </div>
         )}

          {/* +++ مستشار الحياة الزوجية التفاعلي المتقدم بناءً على تصميم المطور فائق الدقة +++ */}
          {false && profile?.maritalStatus === 'married' && (
             <div 
               className={cn(
                 "rounded-[24px] p-5 border relative overflow-hidden transition-all text-right shadow-sm select-none mb-4",
                 isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-gradient-to-br from-indigo-50/15 to-white dark:from-[#1b1c24] dark:to-[#1A1A1A] border-indigo-100/50 dark:border-indigo-950/20"
               )}
               dir="rtl"
             >
                {/* Header */}
                <div className="flex justify-between items-center mb-4 flex-row-reverse w-full relative z-10 font-sans">
                   <div className="flex items-center gap-2 flex-row-reverse text-indigo-600 dark:text-indigo-400">
                      <Heart className="w-4 h-4 text-rose-500 animate-pulse fill-rose-500" />
                      <span className="font-black text-xs leading-none">
                         {profile?.gender === 'female' ? "مستشارة السعادة الزوجية 🌸" : "مستشار السعادة الزوجية ⚡"}
                      </span>
                   </div>
                   <span className="text-[9px] font-black font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 rounded-full py-0.5">
                      مستشار العلاقة 💍
                   </span>
                </div>

                {/* Subtitle / Title */}
                <h3 className="text-xs font-black text-gray-800 dark:text-white mb-3 font-sans">
                   {profile?.gender === 'female' 
                     ? `دلّلي زوجكِ واغمريه بالحب اليوم يا ${profile.nickname || profile.name || 'عزيزتي'} ✨`
                     : `دلّل زوجتكَ وعِش في سلام اليوم يا ${profile.nickname || profile.name || 'عزيزي'} ✨`
                   }
                </h3>

                {/* 🧩 كروت مطوية ذكية للزوج والزوجة */}
                {cardSettings.sizes.spouse_advice === 'sm' ? (
                   /* Compact view (Size: sm) */
                   <div className="p-3 bg-indigo-50/25 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/20 text-right font-sans">
                      <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 mb-1 flex items-center gap-1 flex-row-reverse">
                         <Sparkles className="w-3 h-3 text-pink-500 animate-pulse" />
                         نصيحة المودة السريعة لليوم:
                      </p>
                      <p className="text-[10px] leading-relaxed text-gray-650 dark:text-gray-300 font-bold">
                         {profile?.gender === 'female'
                           ? "الكلمة الطيبة والابتسامة الدافئة هي المفتاح اليوم لقلب زوجكِ؛ أظهري له تقديرك لجهوده وتغلبي على مصاعب الضغوط والتوتر بمودة متكاملة."
                           : "الاستماع باهتمام وتقديم الكلمة الصالحة بغير تكلفة تذيب تعب شريكة حياتكِ تماماً وتثمر البركة والسكينة التامة بالمنزل."
                         }
                      </p>
                      <button 
                        onClick={() => navigate('/partner-sync')}
                        className="mt-2 text-[8.5px] font-black bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg block text-center w-full transition-all border-0 cursor-pointer"
                      >
                         مزامنة شريك الحياة دون إنترنت ←
                      </button>
                   </div>
                ) : (
                   /* Standard and Full sizes with interactive modular expandable sub-cards */
                   <div className="space-y-3 mb-4 font-sans">
                   {/* Psychological & Hormonal Advice */}
                   <div className="border border-rose-100/40 dark:border-[#FB7185]/10 rounded-2xl overflow-hidden bg-rose-500/5">
                      <div 
                        onClick={() => setIsSpousePsychologyExpanded(!isSpousePsychologyExpanded)}
                        className="p-3 bg-rose-50/25 dark:bg-rose-500/10 flex justify-between items-center flex-row-reverse cursor-pointer select-none transition-all hover:bg-rose-50/50"
                      >
                         <span className="text-[11px] font-black text-rose-950 dark:text-rose-400 flex items-center gap-1.5 flex-row-reverse">
                            <Sparkles className="w-4 h-4 text-rose-500" />
                            {profile?.gender === 'female' ? "الحالة العصبية والهرمونية اليوم 🧠" : "الحالة النفسية والعصبية اليوم 🧠"}
                         </span>
                         <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            {isSpousePsychologyExpanded ? "طيِّ الأخصائي ▲" : "عرض التدابير ▼"}
                         </span>
                      </div>
                      <AnimatePresence>
                         {isSpousePsychologyExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-3.5 border-t border-rose-100/10 bg-white/40 dark:bg-black/20 text-right overflow-hidden font-sans"
                            >
                               <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-bold">
                                  {profile?.gender === 'female' ? (
                                     <>
                                        {cycleStatus.phase === 'menstrual' && "أنتِ الآن في مرحلة الحيض؛ الهرمونات منخفضة وقد تشعرين بالتعب وتقلب المزاج. ننصحكِ بمشاركة زوجكِ بلطف أنكِ تحتاجين لبعض الهدوء والدعم، واطلبي منه كوباً دافئاً؛ فتفهمُكما المتبادل يقوي العلاقة في أصعب الأوقات."}
                                        {cycleStatus.phase === 'postpartum' && "أنتِ في مرحلة الاستشفاء الحساسة بعد الولادة (🤱 النفاس). شاركي مشاعركِ واحتياجكِ الجسدي والهدوء ليمر تعافي جسدك بسلام ومودة متبادلة."}
                                        {cycleStatus.phase === 'pregnancy' && "أنتِ في رحلة الحمل المباركة 🤰🏻. ننصحكِ بالتواصل المستمر مع زوجكِ؛ شاركيه تطور نمو الجنين، وعبّري عن محبتكِ وتقديركِ لدعمه ومساندته النفسية الرائعة لكِ."}
                                        {cycleStatus.phase !== 'menstrual' && cycleStatus.phase !== 'postpartum' && cycleStatus.phase !== 'pregnancy' && (
                                           mood === 'stressed' 
                                             ? "تبدين متوترة ومثقلة اليوم نتيجة لضغوط اليوم وتغير الهرمونات. تذكري أن تبتسمي لزوجك واطلبي منه التدليل أو الحوار الهادئ لتقليل هرمونات التوتر (الكورتيزول) وزيادة هرمون الأوكسيتوسين."
                                             : mood === 'tired'
                                               ? "تشعرين بالتعب والمجهود اليوم. ننصحك بنيل قسط وافر من الراحة، ومشاركة زوجك حديثاً هادئاً حول تفاصيل يومكما لتذوب الضغوط."
                                               : "مستوى هرموناتك ونفسيتكِ مستقر اليوم (🔋 متزنة)! الكلمة الطيبة والابتسامة المشرقة هي المفتاح الأروع لقلب شريك حياتك اليوم؛ أظهري له تقديرك لجهوده وسيبادلكِ أضعافاً."
                                        )}
                                     </>
                                  ) : (
                                     <>
                                        {mood === 'stressed' && "أنت تمر بفترة ضغط ومجهود (🤯 متوتر). ننصحك ألا تنقل ضغوط العمل للمنزل. خذ نفساً عميقاً وعانق زوجتك بلطف بكلمة طيبة مثل 'شكراً لوجودك في حياتي'؛ فالكلمة الصالحة بغير تكلفة تبني الطمأنينة."}
                                        {mood === 'tired' && "تبدو متعباً (🥱 مجهد) اليوم. ننصحك بتعزير محبتك وتقديرك لجهود زوجتك بالجلوس سوياً 5 دقائق للحديث الهادئ ومشاركتها مشروباً دافئاً مع إغلاق الهواتف لتنالا السكينة."}
                                        {mood === 'refreshed' || mood === 'relaxed'
                                          ? "بما أنك بحالة نفسية متميزة وطاقة عالية اليوم (🔋 هادئ ونشط)، استغل هذه الطاقة الإيجابية الرائعة! فاجئها بتقديم لفتة دافئة، أو اصطحبها في نزهة مشي قصيرة لتبادل الضحكات والأحاديث الطيبة."
                                          : "العلاقة الزوجية الناجحة تبدأ من تقدير التفاصيل الصغيرة والكلمة الطيبة. كن لطيفاً ومستمعاً جيداً لزوجتك اليوم؛ فالسماع باهتمام يمتص كل التعب."
                                        }
                                     </>
                                  )}
                               </p>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>

                   {/* Economic & Budget Advice */}
                   <div className="border border-indigo-100/40 dark:border-indigo-500/10 rounded-2xl overflow-hidden bg-indigo-500/5">
                      <div 
                        onClick={() => setIsSpouseBudgetExpanded(!isSpouseBudgetExpanded)}
                        className="p-3 bg-indigo-50/25 dark:bg-indigo-500/10 flex justify-between items-center flex-row-reverse cursor-pointer select-none transition-all hover:bg-indigo-50/50"
                      >
                         <span className="text-[11px] font-black text-indigo-950 dark:text-indigo-400 flex items-center gap-1.5 flex-row-reverse font-sans">
                            <Wallet className="w-4 h-4 text-amber-500" />
                            النصح والإرشاد المادي لليوم 💰
                         </span>
                         <span className="text-[9px] font-black text-indigo-505 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                            {isSpouseBudgetExpanded ? "طي الميزانية ▲" : "تحديد وتخصيص المادية ▼"}
                         </span>
                      </div>
                      <AnimatePresence>
                         {isSpouseBudgetExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-3.5 border-t border-indigo-100/15 bg-white/40 dark:bg-black/20 text-all overflow-hidden"
                            >
                               {/* Selectors section nested within the collapsible card */}
                               <div className="bg-[#FAF5FF]/60 dark:bg-white/5 border border-purple-100 dark:border-white/5 p-2.5 rounded-xl mb-3 font-sans" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[9px] text-gray-400 font-bold block mb-2 text-right">اختر ميزانيتك لنوع المبادرات لليوم:</span>
                                  <div className="grid grid-cols-3 gap-1.5">
                                     <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setBudgetTier('budget');
                                          localStorage.setItem('user_budget_tier', 'budget');
                                       }}
                                       className={cn(
                                          "py-1.5 px-2 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer",
                                          budgetTier === 'budget' 
                                            ? "bg-indigo-500/10 border-indigo-300 dark:border-[#818CF8] text-indigo-600 dark:text-indigo-300 font-black" 
                                            : "bg-white dark:bg-white/5 text-gray-500 border-transparent hover:bg-[#F3E8FF]"
                                       )}
                                     >
                                        اقتصادية 🌙
                                     </button>
                                     <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setBudgetTier('medium');
                                          localStorage.setItem('user_budget_tier', 'medium');
                                       }}
                                       className={cn(
                                          "py-1.5 px-2 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer",
                                          budgetTier === 'medium' 
                                            ? "bg-indigo-500/10 border-indigo-300 dark:border-[#818CF8] text-indigo-600 dark:text-indigo-300 font-black" 
                                            : "bg-white dark:bg-white/5 text-gray-500 border-transparent hover:bg-[#F3E8FF]"
                                       )}
                                     >
                                        متوسطة ⚖️
                                     </button>
                                     <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setBudgetTier('liberal');
                                          localStorage.setItem('user_budget_tier', 'liberal');
                                       }}
                                       className={cn(
                                          "py-1.5 px-2 rounded-lg text-[9px] font-bold border transition-all text-center cursor-pointer",
                                          budgetTier === 'liberal' 
                                            ? "bg-indigo-500/10 border-indigo-300 dark:border-[#818CF8] text-indigo-600 dark:text-indigo-300 font-black" 
                                            : "bg-white dark:bg-white/5 text-gray-500 border-transparent hover:bg-[#F3E8FF]"
                                       )}
                                     >
                                        ميسرة 💰
                                     </button>
                                  </div>
                                </div>

                                <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 font-semibold text-right font-sans">
                                   {profile?.gender === 'female' ? (
                                      <>
                                         {budgetTier === 'budget' && "ميزانية اقتصادية: الحب الحقيقي يزدهر بالبساطة. كوبان من شاي النعناع الدافئ في شرفة المنزل مع تشغيل بعض الصوت الهادئ، يحققان تلاقياً عاطفياً جميلاً بدون أي نفقات."}
                                         {budgetTier === 'medium' && "ميزانية متوازنة: شاركيه في إعداد عشاء منزلي أو حجز حلوى بسيطة اليوم والجلوس سوياً لتبادل المشاعر ومناقشة طموحات المستقبل بتوازن."}
                                         {budgetTier === 'liberal' && "ميزانية ميسرة: خططي مسبقاً لعشاء رومانسي في الخارج أو هدية لطيفة لتجديد القلوب والنشاط. الاستثمار المالي في إسعاد شريك حياتك هو بناء لسلام المنزل."}
                                      </>
                                   ) : (
                                      <>
                                         {budgetTier === 'budget' && "ميزانية اقتصادية: الأثر الحقيقي للحب لا يحتاج ميزانيات ضخمة. رسالة خطية بخط يدك تعبّر لها فيها عن شكرك لتعبها، أو مساعدتها في ترتيب المطبخ، يغني عن أغلى الهدايا."}
                                         {budgetTier === 'medium' && "ميزانية متوازنة: اشترِ لها مفاجأة بسيطة كباقة ورد أو شكولاتة تحبها أثناء عودتك. اللفتات المفاجئة تظهر لزوجتك أنك تذكرها حتى في تفاصيل يومك المزدحم."}
                                         {budgetTier === 'liberal' && "ميزانية ميسرة: ما رأيك بحجز وجبة عشاء مميزة في مكان هادئ، أو تقديم هدية قيمة كانت تتمناها منذ فترة؟ السخاء على الزوجة يعمر البيوت بالبركة والسرور والانسجام الفائق."}
                                      </>
                                   )}
                                </p>
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>

                {/* Compassion Streak counter (المودة والرحمة التفاعلية) */}
                <div className="bg-gradient-to-r from-rose-500/10 to-indigo-500/10 dark:from-rose-500/5 dark:to-indigo-500/5 border border-rose-100/10 p-3 rounded-2xl flex flex-col gap-3 font-sans">
                   <div className="flex justify-between items-center flex-row-reverse w-full">
                      <div className="text-right">
                         <span className="text-[9px] text-gray-400 font-bold block">عداد أيام المودة والانسجام المتواصل:</span>
                         <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1 flex-row-reverse">
                            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                            {marriageStreak} {marriageStreak === 1 ? "يوم مودة" : marriageStreak === 2 ? "يومان مودة" : "أيام مودة متواصلة"}
                         </span>
                      </div>
                      <span className="text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 px-2 rounded-full shrink-0">
                         {marriageStreak >= 5 ? "علاقة وثيقة ومزدهرة 🔥" : "ابنوا جسور الرحمة اليوم 🌱"}
                      </span>
                   </div>

                   <div className="flex gap-2 w-full flex-row-reverse">
                      <button 
                        onClick={() => {
                           const n = marriageStreak + 1;
                           setMarriageStreak(n);
                           localStorage.setItem('user_marriage_streak', n.toString());
                        }}
                        className="flex-1 py-1.5 px-2 bg-gradient-to-r from-rose-500 to-indigo-500 hover:from-rose-600 hover:to-indigo-600 text-white rounded-xl text-[10px] font-black shadow-sm flex items-center justify-center gap-1 flex-row-reverse cursor-pointer transition-all active:scale-95 border-0"
                      >
                         <Sparkles className="w-3 h-3" />
                         تسجيل لفتة طيبة اليوم (+١ مودة)
                      </button>
                      <button 
                        onClick={() => {
                           if (window.confirm("هل تود تصفير عداد أيام المودة لبدء عهد جديد؟")) {
                              setMarriageStreak(0);
                              localStorage.setItem('user_marriage_streak', '0');
                           }
                        }}
                        className="py-1.5 px-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-400 hover:text-rose-600 dark:hover:text-red-400 rounded-xl text-[10px] font-bold transition-all hover:bg-rose-50 hover:border-rose-100 cursor-pointer"
                      >
                         تصفير 🔄
                      </button>
                   </div>
                </div>

                {/* +++ رابط مزامنة شريك الحياة دون إنترنت بناءً على طلبك +++ */}
                <div className="mt-3 pt-3 border-t border-dashed border-indigo-100/30 dark:border-white/5 flex justify-between items-center flex-row-reverse text-right">
                   <div className="flex items-center gap-1.5 flex-row-reverse">
                      <span className="text-[10px] text-gray-500 font-extrabold block">مزامنة البيانات دون إنترنت (Wi-Fi / QR):</span>
                      <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">جديد أوفلاين 📡</span>
                   </div>
                   <button 
                     onClick={() => navigate('/partner-sync')}
                     className="py-1 px-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl text-[10px] font-black cursor-pointer shadow-sm transition-all active:scale-95 border border-indigo-500/20"
                   >
                      افتح لوحة المزامنة ←
                   </button>
                </div>
             </div>
               )}
            </div>
         )}

         {/* 2. Diet & Nutrition Expandable Card */} {false && (<>
         <div 
           id="dashboard-diet-card"
           onClick={() => setIsDietCardExpanded(!isDietCardExpanded)}
           className={cn(
             "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
             activeCardHighlight === 'diet' ? "ring-4 ring-offset-2 ring-emerald-400 dark:ring-emerald-500 shadow-2xl scale-[1.01] z-20" : "",
             isFastingMode ? "bg-[#091D17] border-emerald-950/45 hover:bg-[#0c2a21]" : "bg-gradient-to-br from-emerald-50/20 to-white dark:from-[#1B241F] dark:to-[#1A1A1A] border-emerald-100/50 dark:border-emerald-950/20 hover:border-emerald-250"
           )}
         >
            <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
               <div className="flex items-center gap-2 flex-row-reverse text-emerald-600 dark:text-emerald-400">
                  <Utensils className="w-4 h-4 text-emerald-500" />
                  <span className="font-black text-xs leading-none">تغذيتي وسعراتي اليومية 🍏</span>
               </div>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   navigate('/diet');
                 }}
                 className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition-colors"
               >
                  التفاصيل والوجبات ←
               </button>
            </div>

            <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
               <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs shrink-0">
                  {Math.round(dietScore)}%
               </div>

               <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                  <div>
                     <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                        تسجيل واستهلاك السعرات الحرارية
                     </h4>
                     <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                        تم تسجيل <span className="text-emerald-600 font-extrabold">{loggedCalories} سعرة</span> من الحد اليومي الموصى به <span className="font-extrabold">(2000 سعرة)</span>
                     </p>
                  </div>
                  <div className="w-full mt-2.5">
                     <div className="w-full h-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${dietScore}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Hint footer */}
            <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
               {isDietCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتسجيل وجبة جديدة فوراً ▼"}
            </div>

            {/* Expanded area */}
            <AnimatePresence>
               {isDietCardExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="pt-4 border-t border-emerald-100 dark:border-emerald-950/20 relative z-10 space-y-4 overflow-hidden text-right"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  >
                     {/* 1. Custom Quick Add Form */}
                     <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-400 block text-right">١. تسجيل وجبة وسعرات مخصصة:</span>
                        <div className="flex gap-2 text-right">
                           <input 
                              type="text" 
                              placeholder="اسم الوجبة (مثال: تفاحة)" 
                              value={quickMealName}
                              onChange={(e) => setQuickMealName(e.target.value)}
                              className="flex-1 text-xs px-3 py-2 bg-gray-50/70 dark:bg-[#1E1E1E] border border-gray-150 dark:border-white/5 rounded-xl outline-none focus:border-emerald-300 dark:focus:border-emerald-800 text-right text-gray-800 dark:text-white"
                           />
                           <input 
                              type="number" 
                              placeholder="السعرات" 
                              value={quickMealCalories}
                              onChange={(e) => setQuickMealCalories(e.target.value)}
                              className="w-20 text-xs px-3 py-2 bg-gray-50/70 dark:bg-[#1E1E1E] border border-gray-150 dark:border-white/5 rounded-xl outline-none focus:border-emerald-300 dark:focus:border-emerald-800 text-center text-gray-800 dark:text-white animate-none"
                           />
                           <button
                              type="button"
                              disabled={dietAdding || !quickMealName || !quickMealCalories}
                              onClick={() => {
                                 handleAddMealCustom(quickMealName, Number(quickMealCalories));
                                 setQuickMealName('');
                                 setQuickMealCalories('');
                              }}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 transition-all text-white text-xs font-black rounded-xl active:scale-95 shadow-sm shrink-0 cursor-pointer"
                           >
                              تسجيل
                           </button>
                        </div>
                     </div>

                     {/* 2. Interactive Section-Based Tab Selector (Idea 1) */}
                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-black text-gray-400 block text-right">
                              ٢. أطعمة سريعة حسب {isFastingMode ? "أقسام الصيام 🌙" : `حميتك المحددة 🥗`} ({isFastingMode ? "الصيام نشط" : currentDietType === 'keto' ? 'كيتو دايت' : currentDietType === 'low_carb' ? 'لو كارب' : currentDietType === 'high_protein' ? 'عالي البروتين' : 'متوازن صحي'}):
                           </span>
                        </div>

                        {/* Tabs scroll header */}
                        <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-hide flex-row-reverse text-right" dir="rtl">
                           {getDietTabs().map((tab) => {
                              const isActive = (activeDietTab || getDietTabs()[0].id) === tab.id;
                              return (
                                 <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveDietTab(tab.id)}
                                    className={cn(
                                       "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all shrink-0 border cursor-pointer flex items-center gap-1",
                                       isActive 
                                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
                                          : "bg-gray-50 dark:bg-[#1C1F20]/50 text-gray-650 dark:text-gray-350 border-gray-100/50 dark:border-white/5 hover:border-emerald-500/30"
                                    )}
                                 >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                 </button>
                              );
                           })}
                        </div>

                        {/* Quick options inside active tab */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-row-reverse text-right" dir="rtl">
                           {getFoodItemsForTab(activeDietTab || getDietTabs()[0].id).map((item) => (
                              <button
                                 type="button"
                                 key={item.name}
                                 disabled={dietAdding}
                                 onClick={() => handleAddMealCustom(item.name, item.cal)}
                                 className="px-3 py-2 bg-emerald-500/5 hover:bg-emerald-500/15 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border border-emerald-500/10 dark:border-emerald-500/20 rounded-xl text-[10px] font-black text-gray-800 dark:text-gray-200 flex items-center gap-1 shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs"
                              >
                                 <Plus className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                 <span>{item.icon}</span> 
                                 <span>{item.name} (+{item.cal} س)</span>
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* 3. Pinned custom diet list (Idea 2) */}
                     <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-400 block text-right">٣. وجباتي وأكلاتي الذكية المثبتة (📌):</span>
                        {pinnedDietList.length === 0 ? (
                           <div className="text-[10px] text-gray-400 dark:text-gray-500 italic p-3 border border-dashed border-gray-150 dark:border-white/5 rounded-2xl text-center">
                              لا توجد وجبات مثبتة حالياً. استخدم صانع الوجبات الذكي لتثبيت أكلاتك المفضلة!
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir="rtl">
                              {pinnedDietList.map((preset: any) => (
                                 <div 
                                    key={preset.displayName}
                                    onClick={() => handleAddMealCustom(preset.displayName, preset.totalCalories, preset.totalCarbs, preset.totalFats, preset.totalProtein)}
                                    className="p-2 w-full rounded-xl border border-emerald-500/15 bg-white/40 dark:bg-[#161917]/70 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/5 transition-all cursor-pointer flex justify-between items-center text-right group/diet-item shadow-xs"
                                 >
                                    <div className="flex items-center gap-2 flex-row text-right" dir="rtl">
                                       <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                          <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                                       </div>
                                       <div>
                                          <h5 className="text-[10px] font-black text-gray-800 dark:text-gray-200 leading-tight">
                                             {preset.displayName}
                                          </h5>
                                          <div className="flex gap-1.5 text-[9px] text-gray-450 dark:text-gray-440 font-bold mt-0.5" dir="rtl">
                                             <span className="text-emerald-600 font-extrabold">{preset.totalCalories} س</span>
                                             <span>•</span>
                                             <span>ب: {preset.totalProtein || 0}ج</span>
                                             <span>•</span>
                                             <span>ك: {preset.totalCarbs || 0}ج</span>
                                             <span>•</span>
                                             <span>د: {preset.totalFats || 0}ج</span>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Edit / Delete actions */}
                                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                       <button
                                          type="button"
                                          title="تعديل الوجبة"
                                          onClick={() => {
                                             setSelectedDietPresetForEdit(preset);
                                             setIsDietCreatorOpen(true);
                                          }}
                                          className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10 active:scale-90 transition-all cursor-pointer"
                                       >
                                          <Edit3 className="w-3.5 h-3.5" />
                                       </button>
                                       <button
                                          type="button"
                                          title="حذف من المثبتات"
                                          onClick={() => {
                                             customTrackerStore.unpinDiet(preset.displayName);
                                             window.dispatchEvent(new Event('dietQuickPinnedChanged'));
                                          }}
                                          className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-90 transition-all cursor-pointer"
                                       >
                                          <Trash2 className="w-3.5 h-3.5" />
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>

                     {/* 4. Chef Diet Builder Trigger */}
                     <div className="pt-2">
                        <button
                           type="button"
                           onClick={() => {
                              setSelectedDietPresetForEdit(null);
                              setIsDietCreatorOpen(true);
                           }}
                           className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-650 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all shrink-0 cursor-pointer"
                        >
                           <Sparkles className="w-3.5 h-3.5 fill-white" />
                           <span>افتح خلاط كوتش دايت الذكي لتصميم وجبة مثبتة مخصصة 🧪</span>
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>

         </>)} {/* 3. Medications & Schedule Expandable Card */} {false && (<>
         <div 
           id="dashboard-meds-card"
           onClick={() => setIsMedsCardExpanded(!isMedsCardExpanded)}
           className={cn(
             "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
             activeCardHighlight === 'meds' ? "ring-4 ring-offset-2 ring-indigo-400 dark:ring-indigo-500 shadow-2xl scale-[1.01] z-20" : "",
             isFastingMode ? "bg-[#091D17] border-emerald-950/45 hover:bg-[#0c2a21]" : "bg-gradient-to-br from-indigo-50/20 to-white dark:from-[#1B1E29] dark:to-[#1A1A1A] border-indigo-100/50 dark:border-indigo-950/20 hover:border-indigo-250"
           )}
         >
            <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
               <div className="flex items-center gap-2 flex-row-reverse text-indigo-650 dark:text-indigo-400">
                  <Pill className="w-4 h-4 text-indigo-500" />
                  <span className="font-black text-xs leading-none">أدويتي ومكملاتي اليومية 💊</span>
               </div>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   navigate('/medications');
                 }}
                 className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
               >
                  التفاصيل والجدول ←
               </button>
            </div>

            <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
               <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xs shrink-0">
                  {medsStatus.percent}%
               </div>

               <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                  <div>
                     <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                        جدول الالتزام بجرعات أدوية اليوم
                     </h4>
                     <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                        تم أخذ <span className="text-indigo-600 font-extrabold">{medsStatus.takenCount} جرعة</span> من إجمالي <span className="font-extrabold">{medsStatus.totalScheduled} جرعات مجدولة</span> اليوم
                     </p>
                  </div>
                  <div className="w-full mt-2.5">
                     <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                        <div className="bg-indigo-500 h-full transition-all" style={{ width: `${medsStatus.percent}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Hint footer */}
            <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
               {isMedsCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتعليم جرعة دواء كـ مأخوذة فوراً ▼"}
            </div>

            {/* Expanded area */}
            <AnimatePresence>
               {isMedsCardExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="pt-4 border-t border-indigo-100 dark:border-indigo-950/20 relative z-10 space-y-2.5 overflow-hidden text-right"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  >
                     <span className="text-[10px] font-black text-gray-400 block text-right">قائمة جدول الجرعات لليوم:</span>
                     <div className="space-y-2">
                        {medsStatus.activeMeds.map((med) => {
                           const today = new Date();
                           const isTakenToday = medLogs.some(log => {
                             const d = new Date(log.takenAt);
                             return log.medicationId === med.id &&
                                    d.getDate() === today.getDate() &&
                                    d.getMonth() === today.getMonth() &&
                                    d.getFullYear() === today.getFullYear();
                           });

                           return (
                              <div 
                                key={med.id}
                                className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5 flex items-center justify-between gap-2"
                              >
                                 <div className="text-right">
                                    <h5 className="text-xs font-black text-gray-800 dark:text-white leading-none flex items-center gap-1 flex-row-reverse">
                                       <span>{med.name}</span>
                                       {med.isCritical && (
                                          <span className="text-[8px] bg-red-150 text-red-600 dark:bg-red-500/10 px-1 rounded">حرج</span>
                                       )}
                                    </h5>
                                    <p className="text-[9px] text-gray-400 font-bold mt-1.5 leading-none">
                                       الجرعة: {med.dosage || '--'} {med.form} • {med.instruction}
                                    </p>
                                 </div>

                                 {isTakenToday ? (
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 px-2 py-1 rounded-lg">
                                       ✓ تم الأخذ
                                    </span>
                                 ) : (
                                    <button
                                      type="button"
                                      disabled={medsLoggingId === med.id}
                                      onClick={() => handleTakeMedicationQuick(med)}
                                      className="px-2.5 py-1 text-[9px] font-black bg-indigo-500 hover:bg-indigo-600 transition-colors text-white rounded-lg cursor-pointer flex items-center gap-1 active:scale-95"
                                    >
                                       {medsLoggingId === med.id ? "تسجيل..." : "أخذ جرعة 💊"}
                                    </button>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>

         </>)} {/* 👥 بنية النشاط والراحة: النوم والممشى - كروت مربعة متجاورة */} {false && (<>
         <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
            {/* 👣 كارت الممشى السريع المربع */}
            <div 
              id="dashboard-steps-card"
              onClick={() => {
                setIsStepsCardExpanded(!isStepsCardExpanded);
                setIsSleepCardExpanded(false);
              }}
              className={cn(
                "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none flex flex-col justify-between h-[135px]",
                activeCardHighlight === 'steps' ? "ring-4 ring-offset-2 ring-emerald-400 dark:ring-emerald-500 shadow-2xl scale-[1.01] z-20" : "",
                isFastingMode ? "bg-[#0B1528] border-blue-955/44 hover:bg-[#0e213b]" : "bg-gradient-to-br from-emerald-50/10 to-white dark:from-[#0f1d17] dark:to-[#121c17] border-emerald-150/30 dark:border-emerald-950/20 hover:border-emerald-250"
              )}
            >
               <div className="flex justify-between items-start flex-row-reverse w-full relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                     <Footprints className="w-4.5 h-4.5 text-emerald-555" />
                  </div>
                  <span className="text-[8.5px] font-black bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                     {Math.round((stepCount / 10000) * 100)}%
                  </span>
               </div>
               
               <div className="relative z-10 text-right" dir="rtl">
                  <span className="text-[9.5px] font-extrabold text-gray-400 block pb-1">الممشى والخطوات</span>
                  <p className="font-black text-base text-emerald-600 dark:text-emerald-400 leading-none">{stepCount.toLocaleString('ar-EG')}</p>
                  <p className="text-[8.5px] text-gray-400 font-bold mt-1.5 leading-none">من هدف {10000}</p>
               </div>
            </div>

            {/* 💤 كارت النوم والراحة المربع */}
            <div 
              id="dashboard-sleep-card"
              onClick={() => {
                setIsSleepCardExpanded(!isSleepCardExpanded);
                setIsStepsCardExpanded(false);
              }}
              className={cn(
                "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none flex flex-col justify-between h-[135px]",
                activeCardHighlight === 'sleep' ? "ring-4 ring-offset-2 ring-indigo-400 dark:ring-indigo-600 shadow-2xl scale-[1.01] z-20" : "",
                isFastingMode ? "bg-[#0F1026] border-indigo-950/45 hover:bg-[#151736]" : "bg-gradient-to-br from-[#EEF2FF] to-white dark:from-[#110f24] dark:to-[#0D0B18] border-indigo-150/30 dark:border-indigo-950/20 hover:border-indigo-250"
              )}
            >
               <div className="flex justify-between items-start flex-row-reverse w-full relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-505">
                     <Moon className="w-4.5 h-4.5 text-indigo-555 animate-pulse" />
                  </div>
                  <span className="text-[8.5px] font-black bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                     {sleepHours >= 7 ? "كافٍ" : "قليل"}
                  </span>
               </div>
               
               <div className="relative z-10 text-right" dir="rtl">
                  <span className="text-[9.5px] font-extrabold text-gray-400 block pb-1">ساعات النوم ومزاجك</span>
                  <p className="font-black text-base text-indigo-600 dark:text-indigo-400 leading-none">{sleepHours.toFixed(1)} <span className="text-[9px] text-gray-400">ساعة</span></p>
                  <p className="text-[8.5px] text-gray-400 font-bold mt-1.5 leading-none">مزاجك: {mood === 'refreshed' ? '🔋 نشط' : mood === 'good' ? '😊 جيد' : mood === 'tired' ? '🥱 متعب' : mood === 'stressed' ? '🤯 متوتر' : '✨ مستقر'}</p>
               </div>
            </div>
         </div>

         {/* Steps Expanded Panel */}
         <AnimatePresence>
            {isStepsCardExpanded && (
               <motion.div 
                 initial={{ opacity: 0, height: 0, marginTop: 0 }}
                 animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                 exit={{ opacity: 0, height: 0, marginTop: 0 }}
                 className="pt-4 border-t border-emerald-100 dark:border-emerald-950/20 relative z-10 space-y-4 overflow-hidden text-right shadow-xs p-4 rounded-3xl bg-emerald-500/5"
                 dir="rtl"
               >
                  <div className="flex items-center justify-between pb-1 flex-row-reverse">
                     <span className="text-[10px] font-black text-gray-400 block text-right">تسجيل حركة سريعة اليوم:</span>
                     <button
                       onClick={() => navigate('/steps')}
                       className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full hover:underline border-0 cursor-pointer"
                     >
                       التفاصيل والرسوم الحركية ←
                     </button>
                  </div>
                  
                  {/* Preset increments */}
                  <div className="grid grid-cols-4 gap-2">
                     {[500, 1000, 2000, 5000].map((inc) => (
                        <button
                          type="button"
                          key={inc}
                          onClick={() => handleAddSteps(inc, 'إضافة سريعة')}
                          className="p-2.5 rounded-xl bg-white dark:bg-black/25 border border-emerald-100 dark:border-white/5 hover:border-emerald-300 dark:hover:border-emerald-700/30 text-center transition-all cursor-pointer active:scale-95"
                        >
                           <p className="text-xs font-black text-emerald-650 dark:text-emerald-400">+{inc.toLocaleString('ar-EG')}</p>
                           <p className="text-[8px] text-gray-400 mt-1">خطوة</p>
                        </button>
                     ))}
                  </div>

                  {/* Manual entry row */}
                  <div className="bg-white dark:bg-black/10 p-3 rounded-2xl border border-emerald-100/30 dark:border-white/5">
                     <span className="text-[9.5px] font-black text-gray-500 block mb-2 text-right">📝 إدخال قيمة خطوات محددة:</span>
                     <div className="flex gap-2">
                        <input 
                          id="custom_steps_field_side"
                          type="number"
                          placeholder="مثال: 3500 خطوة"
                          className="flex-1 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 text-[11px] font-bold text-gray-800 dark:text-white h-9 text-right"
                        />
                        <button
                          type="button"
                          onClick={() => {
                             const input = document.getElementById('custom_steps_field_side') as HTMLInputElement;
                             if (input) {
                                const val = parseInt(input.value);
                                if (val > 0) {
                                   handleAddSteps(val, 'إدخال مخصص');
                                   input.value = '';
                                }
                             }
                          }}
                          className="bg-emerald-500 text-white rounded-xl px-3.5 py-1.5 hover:bg-emerald-600 transition-colors text-[10px] font-black h-9 cursor-pointer border-0"
                        >
                           سجل الآن
                        </button>
                     </div>
                  </div>

                  {/* Sessions logged history today */}
                  <div>
                     <span className="text-[10px] font-black text-gray-400 block mb-1.5 text-right">📋 جلسات الحركة المسجلة اليوم:</span>
                     {stepLogs.filter((log: any) => {
                        const d = new Date(log.timestamp);
                        const t = new Date();
                        return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
                     }).length === 0 ? (
                        <div className="text-center py-2 text-gray-450 text-[9px] font-bold">لم تسجل أي حركة اليوم بعد. ابدأ بالحركة ليكون ممشاك واعداً! 🚶‍♂️🌟</div>
                     ) : (
                        <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                           {stepLogs.filter((log: any) => {
                              const d = new Date(log.timestamp);
                              const t = new Date();
                              return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
                           }).map((log: any, idx: number) => (
                              <div key={log.id || idx} className="bg-white dark:bg-[#1A1A1A] p-2 rounded-xl flex items-center justify-between flex-row-reverse text-right text-[10px] border border-gray-100/50 dark:border-white/5">
                                 <div className="flex items-center gap-1.5 flex-row-reverse">
                                    <span className="text-emerald-500">👟</span>
                                    <span className="font-extrabold text-gray-800 dark:text-gray-200">{(log.steps || 0).toLocaleString('ar-EG')} خطوة</span>
                                    <span className="text-gray-400 text-[9px]">({log.context || 'إضافة سريعة'})</span>
                                 </div>
                                 <span className="text-gray-400 text-[8.5px]">
                                    {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                 </span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Sleep Expanded Panel */}
         <AnimatePresence>
            {isSleepCardExpanded && (
               <motion.div 
                 initial={{ opacity: 0, height: 0, marginTop: 0 }}
                 animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                 exit={{ opacity: 0, height: 0, marginTop: 0 }}
                 className="pt-4 border-t border-indigo-100 dark:border-indigo-950/20 relative z-10 space-y-4 overflow-hidden text-right leading-relaxed shadow-xs p-4 rounded-3xl bg-indigo-500/5"
                 dir="rtl"
               >
                  <div className="flex items-center justify-between pb-1 flex-row-reverse">
                     <span className="text-[10px] font-black text-gray-400 block text-right">تسجيل وإدارة النوم اليومي:</span>
                     <button
                       onClick={() => navigate('/sleep')}
                       className="text-[9px] font-black text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded-full hover:underline border-0 cursor-pointer"
                     >
                       التفاصيل والتقارير النفسية ←
                     </button>
                  </div>

                  {/* Sleep preset adds */}
                  <div className="flex flex-col gap-2.5">
                     <span className="text-[9.5px] font-black text-gray-500 block text-right">سجل ساعات نوم طوال الليل/اليوم:</span>
                     <div className="grid grid-cols-4 gap-2">
                        {[4, 6, 8, 10].map((hours) => (
                           <button
                             type="button"
                             key={hours}
                             onClick={() => handleAddSleepCustom(hours)}
                             className="p-2.5 rounded-xl bg-white dark:bg-black/25 border border-indigo-100/50 dark:border-white/5 text-center transition-all cursor-pointer active:scale-95"
                           >
                              <p className="text-xs font-black text-indigo-600">+{hours}</p>
                              <p className="text-[8px] text-gray-400 mt-1">ساعات</p>
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Mood check */}
                  <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                     <span className="text-[9.5px] font-black text-gray-500 block mb-2 text-right">🧠 كيف تشعر من الناحية المزاجية والنفسية الآن؟</span>
                     <div className="flex flex-wrap gap-2 justify-start flex-row-reverse">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('user_mood', 'refreshed');
                            setMood('refreshed');
                          }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 active:scale-95 border transition-all pointer-events-auto cursor-pointer",
                            mood === 'refreshed' ? "bg-emerald-55 dark:bg-emerald-955/40 text-emerald-600 border-emerald-300" : "bg-white dark:bg-white/5 text-gray-650 border-transparent"
                          )}
                        >
                           🔋 مسترخٍ ونشط
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('user_mood', 'good');
                            setMood('good');
                          }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 active:scale-95 border transition-all pointer-events-auto cursor-pointer",
                            mood === 'good' ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 border-indigo-300" : "bg-white dark:bg-white/5 text-gray-650 border-transparent"
                          )}
                        >
                           😊 مزاج ممتاز وطبيعي
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('user_mood', 'tired');
                            setMood('tired');
                          }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 active:scale-95 border transition-all pointer-events-auto cursor-pointer",
                            mood === 'tired' ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-300" : "bg-white dark:bg-white/5 text-gray-650 border-transparent"
                          )}
                        >
                           🥱 متعب / قليل النوم والشغف
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('user_mood', 'stressed');
                            setMood('stressed');
                          }}
                          className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 active:scale-95 border transition-all pointer-events-auto cursor-pointer",
                            mood === 'stressed' ? "bg-rose-50 dark:bg-rose-955/20 text-rose-600 border-rose-300" : "bg-white dark:bg-white/5 text-gray-650 border-transparent"
                          )}
                        >
                           🤯 أشعر بالقلق أو التوتر
                        </button>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         </>)} {/* 4. Sleep & Psychological Expandable Card */} {false && (<>
         {false && (
         <div 
           onClick={() => setIsSleepCardExpanded(!isSleepCardExpanded)}
           className={cn(
             "rounded-[24px] p-4 border relative overflow-hidden transition-all text-right shadow-sm cursor-pointer select-none",
             isFastingMode ? "bg-[#091D17] border-emerald-950/45 hover:bg-[#0c2a21]" : "bg-gradient-to-br from-purple-50/20 to-white dark:from-[#1F1B2B] dark:to-[#1A1A1A] border-purple-100/50 dark:border-purple-950/20 hover:border-purple-250"
           )}
         >
            <div className="flex justify-between items-center mb-3 flex-row-reverse relative z-10 w-full">
               <div className="flex items-center gap-2 flex-row-reverse text-[#7B1FA2] dark:text-purple-400">
                  <Moon className="w-4 h-4 text-purple-500" />
                  <span className="font-black text-xs leading-none">النوم والصحة النفسية 💤</span>
               </div>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   navigate('/sleep');
                 }}
                 className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 rounded-full hover:bg-purple-100 transition-colors"
               >
                  التفاصيل والتحليل ←
               </button>
            </div>

            <div className="flex items-center justify-between gap-4 flex-row-reverse relative z-10" dir="rtl">
               <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 border border-purple-200/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-extrabold text-xs shrink-0">
                  {Math.round(sleepScore)}%
               </div>

               <div className="flex-1 text-right flex flex-col justify-between" dir="rtl">
                  <div>
                     <h4 className="text-xs font-black text-gray-800 dark:text-white leading-none">
                        تتبع جودة ومدة النوم
                     </h4>
                     <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1.5 leading-none">
                        لقد نمت <span className="text-purple-600 font-extrabold">{(sleepHours).toFixed(1)} ساعة</span> من هدفك المفضل <span className="font-extrabold">({profile.targetSleep || 8} ساعات)</span>
                     </p>
                  </div>
                  <div className="w-full mt-2.5">
                     <div className="w-full h-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden flex flex-row-reverse">
                        <div className="bg-purple-500 h-full transition-all" style={{ width: `${sleepScore}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Hint footer */}
            <div className="text-[9px] text-gray-400 mt-2 text-left select-none z-10 relative">
               {isSleepCardExpanded ? "اضغط لإغلاق التفاصيل ▲" : "اضغط لتسجيل مدة نوم سريعة فوراً ▼"}
            </div>

            {/* Expanded area */}
            <AnimatePresence>
               {isSleepCardExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="pt-4 border-t border-purple-100 dark:border-purple-950/20 relative z-10 space-y-4 overflow-hidden text-right"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  >
                     <div>
                        <span className="text-[10px] font-black text-gray-400 block mb-2 text-right">اختر مدة النوم لتسجيلها فوراً لليوم:</span>
                        <div className="grid grid-cols-4 gap-2">
                           {[6, 7, 8, 9].map((hours) => (
                              <button
                                type="button"
                                key={hours}
                                disabled={sleepAdding}
                                onClick={() => handleAddSleepCustom(hours)}
                                className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-300 dark:hover:border-purple-850 text-center transition-all active:scale-95"
                              >
                                 <p className="text-xs font-black text-purple-600 dark:text-purple-400 leading-none">{hours}</p>
                                 <p className="text-[8px] text-gray-400 mt-1 leading-none">ساعات</p>
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="flex gap-2 justify-end w-full border-t border-gray-100 dark:border-white/5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('user_mood', 'relaxed');
                            setMood('relaxed');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center gap-1 active:scale-95"
                        >
                           ☺️ أشعر بالارتياح
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('user_mood', 'stressed');
                            setMood('stressed');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold bg-amber-55 dark:bg-amber-950/20 text-amber-600 flex items-center gap-1 active:scale-95"
                        >
                           🤯 أشعر بالقلق/التوتر
                        </button>
                     </div>
                  </motion.div>
               )}
            </AnimatePresence>
         </div>
         )}
         </>)}
      </div>

      {/* Mini-Apps Scroller */}
      <div className="mb-6">
         <h4 className="font-bold text-[11px] text-gray-500 mb-2 mt-4 text-right">أدوات إضافية</h4>
         <div className="flex overflow-x-auto gap-2 pb-2 snap-x scrollbar-hide" dir="rtl">
            <button onClick={handleAddWater} className={cn("snap-center shrink-0 w-[64px] border rounded-[16px] p-2 flex flex-col justify-center items-center gap-1.5 shadow-xs transition-transform active:scale-95 group",
                isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5 hover:border-sky-200"
            )}>
               <div className="w-7 h-7 rounded-full border border-gray-100 dark:border-white/10 dark:bg-sky-500/10 flex items-center justify-center text-gray-500 dark:text-sky-500 group-hover:bg-sky-50 transition-colors">
                  <Droplets className="w-3.5 h-3.5" />
               </div>
               <span className="font-bold text-[8px] text-gray-800 dark:text-white">ماء</span>
            </button>
            <button onClick={() => navigate('/wallet')} className={cn("snap-center shrink-0 w-[64px] border rounded-[16px] p-2 flex flex-col justify-center items-center gap-1.5 shadow-xs transition-transform active:scale-95 group",
                isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5 hover:border-blue-200"
            )}>
               <div className="w-7 h-7 rounded-full border border-gray-100 dark:border-white/10 dark:bg-blue-500/10 flex items-center justify-center text-gray-500 dark:text-blue-500 group-hover:bg-blue-50 transition-colors">
                  <Wallet className="w-3.5 h-3.5" />
               </div>
               <span className="font-bold text-[8px] text-gray-800 dark:text-white">محفظتي</span>
            </button>
            <button onClick={() => navigate('/work-log')} className={cn("snap-center shrink-0 w-[64px] border rounded-[16px] p-2 flex flex-col justify-center items-center gap-1.5 shadow-xs transition-transform active:scale-95 group",
                isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5 hover:border-orange-200"
            )}>
               <div className="w-7 h-7 rounded-full border border-gray-100 dark:border-white/10 dark:bg-orange-500/10 flex items-center justify-center text-gray-500 dark:text-orange-500 group-hover:bg-orange-50 transition-colors">
                  <Briefcase className="w-3.5 h-3.5" />
               </div>
               <span className="font-bold text-[8px] text-gray-800 dark:text-white">عمل</span>
            </button>
         </div>
      </div>

      {/* Space and final layouts */}
      <div className="space-y-4 relative z-10 w-full flex flex-col items-stretch pb-10 animate-fade-in-up">
          
         {/* 🎯 "استكمل بياناتك الصحية" - Moving to the bottom if completed in a summary design as requested */}
         {!isProfileIncomplete && (
            <motion.div 
               initial={{ opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
               className={cn(
                  "p-3.5 rounded-[20px] border flex flex-row-reverse items-center justify-between text-right cursor-pointer hover:bg-opacity-80 transition-all",
                  isFastingMode ? "bg-[#091D17] border-emerald-950/45" : "bg-emerald-50/40 dark:bg-[#1E2E20]/20 border-emerald-100 dark:border-emerald-950/40 shadow-sm"
               )}
               onClick={() => navigate('/profile')}
            >
               <div className="flex items-center gap-2.5 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                     <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                     <h3 className="font-black text-[11px] text-emerald-900 dark:text-emerald-400">بياناتك القياسية مكتملة ومحدَّثة ✨</h3>
                     <p className="text-[9px] text-emerald-700/80 dark:text-emerald-500/60 leading-tight mt-0.5">
                        الوزن: {profile.weight} كجم • الطول: {profile.height} سم • السن: {profileAge || '--'} سنة • هدف النوم: {profile.targetSleep || 8}س
                     </p>
                  </div>
               </div>
               <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-white dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/40 px-2 py-1 rounded-full cursor-pointer hover:bg-emerald-50 transition-colors">
                  تعديل
               </span>
            </motion.div>
         )}

         {/* Symptoms Today Card */}
         {false && mood === 'pain' && (
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className={cn("rounded-[20px] p-4 shadow-sm border text-right flex justify-between items-center flex-row-reverse", isFastingMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30")}>
               <div className="flex items-center gap-2.5 flex-row-reverse">
                  <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm">
                     <Frown className="w-4 h-4" />
                  </div>
                  <div>
                     <h3 className="font-bold text-xs text-rose-700 dark:text-rose-400">سجلت الم اليوم</h3>
                  </div>
               </div>
               <button onClick={() => navigate('/symptoms')} className="text-[9px] font-bold text-rose-500 bg-white dark:bg-black/20 border border-rose-100 dark:border-rose-900/50 px-2.5 py-1 rounded-full active:scale-95 transition-transform">
                  تحديث
               </button>
            </motion.div>
         )}

      </div>

      <div className="space-y-4 relative z-10 w-full flex flex-col items-stretch pb-10">
          
        {/* Symptoms Today Card */}
        {false && mood === 'pain' && (
           <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className={cn("rounded-[20px] p-4 shadow-sm border text-right flex justify-between items-center flex-row-reverse", isFastingMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30")}>
              <div className="flex items-center gap-2.5 flex-row-reverse">
                 <div className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm">
                    <Frown className="w-4 h-4" />
                 </div>
                 <div>
                    <h3 className="font-bold text-xs text-rose-700 dark:text-rose-400">سجلت الم اليوم</h3>
                 </div>
              </div>
              <button onClick={() => navigate('/symptoms')} className="text-[9px] font-bold text-rose-500 bg-white dark:bg-black/20 border border-rose-100 dark:border-rose-900/50 px-2.5 py-1 rounded-full active:scale-95 transition-transform">
                 تحديث
              </button>
           </motion.div>
        )}

      </div>

      {/* +++ أضيف بناءً على طلبك - صانع المشروبات والوجبات الدقيق +++ */}
      <DrinkBuilderModal
         isOpen={isDrinkCreatorOpen}
         onClose={() => {
            setIsDrinkCreatorOpen(false);
            setSelectedPresetForEdit(null);
         }}
         onLogDrink={handleLogDrinkFromModal}
         initialPreset={selectedPresetForEdit}
      />
      <DietBuilderModal
         isOpen={isDietCreatorOpen}
         onClose={() => {
            setIsDietCreatorOpen(false);
            setSelectedDietPresetForEdit(null);
         }}
         onLogMeal={handleLogMealFromModal}
         initialPreset={selectedDietPresetForEdit}
      />
      <NotificationsModal
         isOpen={isNotificationsOpen}
         onClose={() => setIsNotificationsOpen(false)}
         isProfileIncomplete={isProfileIncomplete}
         missingFields={missingFields}
         isDayOfArafah={isDayOfArafah}
         isFastingForbiddenToday={isFastingForbiddenToday}
         forbiddenFastingDayName={forbiddenFastingDayName}
         todayFastingType={todayFastingType}
         isFastingMode={isFastingMode}
         onSetFastingStateToday={handleSetFastingStateToday}
         onNavigate={navigate}
         waterCount={waterCount}
         dailyWaterGoal={dailyWaterGoal}
         stepCount={stepCount}
         sleepHours={sleepHours}
         targetSleep={profile.targetSleep || 8}
         temperature={temperature}
         aqi={aqi}
         uvIndex={uvIndex}
         medsStatus={medsStatus}
       />
       <ApkDownloadModal
          isOpen={isApkDialogOpen}
          onClose={() => setIsApkDialogOpen(false)}
      />
    </div>
  );
}

