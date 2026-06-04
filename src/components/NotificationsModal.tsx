import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, User, Clock, Check, AlertCircle, Sparkles, ChevronLeft, Activity, Droplets, Heart, Sun, Wind } from 'lucide-react';
import { cn } from '../lib/utils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProfileIncomplete: boolean;
  missingFields: string[];
  isDayOfArafah: boolean;
  isFastingForbiddenToday: boolean;
  forbiddenFastingDayName?: string;
  todayFastingType?: string;
  isFastingMode: boolean;
  onSetFastingStateToday?: (isFasting: boolean) => void;
  onNavigate: (path: string) => void;

  // New context-aware health metrics
  waterCount?: number;
  dailyWaterGoal?: number;
  stepCount?: number;
  sleepHours?: number;
  targetSleep?: number;
  temperature?: number | null;
  aqi?: number | null;
  uvIndex?: number | null;
  medsStatus?: {
    activeMeds?: any[];
    totalScheduled?: number;
    takenCount?: number;
    percent?: number;
  } | null;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  isProfileIncomplete,
  missingFields,
  isDayOfArafah,
  isFastingForbiddenToday,
  forbiddenFastingDayName,
  todayFastingType,
  isFastingMode,
  onSetFastingStateToday,
  onNavigate,

  // Fallback defaults
  waterCount = 0,
  dailyWaterGoal = 2500,
  stepCount = 0,
  sleepHours = 0,
  targetSleep = 8,
  temperature = null,
  aqi = null,
  uvIndex = null,
  medsStatus = null
}: NotificationsModalProps) {
  // Calculate notifications
  const notificationItems = [];

  if (isProfileIncomplete) {
    notificationItems.push({
      id: 'profile_incomplete',
      title: 'استكمل بياناتك الصحية',
      desc: 'يرجى ملء بيانات ملفك الشخصي بالكامل لحساب احتياجاتك اللحظية بدقة متناهية.',
      badge: 'مهم جداً ⚠️',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      icon: <User className="w-5 h-5 text-rose-500" />,
      action: {
        text: 'استكمال البيانات الشخصية ←',
        onClick: () => {
          onNavigate('/profile');
          onClose();
        }
      },
      missing: missingFields
    });
  }

  if (isDayOfArafah) {
    notificationItems.push({
      id: 'arafah_day',
      title: 'اليوم يوم عرفة العظيم 🕋',
      desc: 'صوم هذا اليوم العظيم يكفّر ذنوب السنة الماضية والسنة القابلة (حديث شريف). تقبل الله طاعاتكم!',
      badge: 'مناسبة مباركة ✨',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      icon: <span className="text-xl">🕋</span>,
      hasFastingAction: true
    });
  }

  if (isFastingForbiddenToday) {
    notificationItems.push({
      id: 'fasting_forbidden',
      title: `اليوم هو ${forbiddenFastingDayName || 'يوم يحرم صومه'} 🍬`,
      desc: 'يحرم الصوم في هذا اليوم المبارك شرعاً وصحياً (أيام العيد والتشريق). اغتنم الفرصة لتناول وجبات صحية ومشاركتها مع المقربين!',
      badge: 'تنبيه العيد 🌸',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      icon: <span className="text-xl">🎉</span>
    });
  }

  // --- +++ أضيف بناءً على طلبك - إشعارات وتنبيهات صحية ذكية وتفاعلية +++ ---

  // 1. Water Hydration Smart Check
  if (!isFastingMode && waterCount < dailyWaterGoal * 0.6) {
    const percentage = Math.round((waterCount / dailyWaterGoal) * 100);
    notificationItems.push({
      id: 'water_hydration_alert',
      title: 'معدل ارتواء جسمك منخفض اليوم 💧',
      desc: `شربت ${waterCount} مل فقط (${percentage}% من هدفك اليومي البالغ ${dailyWaterGoal} مل). نوصيك بتناول كوب ماء نقي الآن لتحفيز نشاط الخلايا وتجنب الصداع والكسل.`,
      badge: 'تنبيه رطوبة 💧',
      badgeColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
      icon: <Droplets className="w-5 h-5 text-sky-500" />,
      action: {
        text: 'افتح حاسبة المياه التفاعلية ←',
        onClick: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-dashboard-card', { detail: { card: 'water' } }));
        }
      }
    });
  }

  // 2. Scheduled Medications Check
  if (medsStatus && medsStatus.totalScheduled && medsStatus.totalScheduled > 0 && medsStatus.takenCount < medsStatus.totalScheduled) {
    notificationItems.push({
      id: 'medication_schedule_reminder',
      title: 'تذكير بالجرعات الدوائية المجدولة 💊',
      desc: `لقد أكدت تناول ${medsStatus.takenCount} من أصل ${medsStatus.totalScheduled} جرعة دواء اليوم. الالتزام بالمواعيد الدقيقة يحقق أفضل كفاءة ونتائج علاجية متكاملة لجسدك.`,
      badge: 'تنبيه طبي 🏥',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      icon: <Heart className="w-5 h-5 text-indigo-500" />,
      action: {
        text: 'عرض الملف الدوائي فوراً لتأكيد جرعتك ←',
        onClick: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-dashboard-card', { detail: { card: 'meds' } }));
        }
      }
    });
  }

  // 3. Movement & Sedentary Alert
  if (stepCount < 4000) {
    notificationItems.push({
      id: 'sedentary_steps_alert',
      title: 'تحفيز الحركة وتجديد طاقتك البدنية 👣',
      desc: `سجلت ${stepCount} خطوة فقط اليوم. المشي الخفيف والجلوس الأقل لـ 10 دقائق فقط الآن ينشط القلب، ويخفض مستويات السكر، ويجدد التركيز الذهني بشكل ملحوظ.`,
      badge: 'تحدي الحركة 👣',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      icon: <Activity className="w-5 h-5 text-emerald-500" />,
      action: {
        text: 'افتح كارت الخطوات السريعة لتحديث النشاط ←',
        onClick: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-dashboard-card', { detail: { card: 'steps' } }));
        }
      }
    });
  }

  // 4. Sleep Deficit Advice
  if (sleepHours > 0 && sleepHours < targetSleep - 1.5) {
    notificationItems.push({
      id: 'sleep_deficit_alert',
      title: 'رصد عجز خفيف في ساعات النوم لليوم 😴',
      desc: `لقد سجلت ${(sleepHours).toFixed(1)} ساعة نوم، وهو أقل من هدفك السلوكي المفضل (${targetSleep} ساعات). لتعويض استشفاء العضلات، ننصح بنوم مغذٍ ومبكر تجنباً للإرهاق.`,
      badge: 'عناية بالنوم 🛌',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      icon: <Clock className="w-5 h-5 text-purple-500" />,
      action: {
        text: 'افتح كارت التحكم وإدارة النوم ←',
        onClick: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open-dashboard-card', { detail: { card: 'sleep' } }));
        }
      }
    });
  }

  // 5. High Temperature Sun Alert
  if (temperature && temperature > 34) {
    notificationItems.push({
      id: 'weather_extreme_temp',
      title: `الحرارة تسجل ارتفاعاً اليوم (${temperature}°م) ☀️`,
      desc: `درجة الحرارة تميل للارتفاع الملحوظ اليوم. ننصح بشدة بتجنب التعرض للمشمس المباشر فترات طويلة، وتناول جرعة مياه إضافية لتعويض السوائل المفقودة.`,
      badge: 'وقاية ربيعية/صيفية ☀️',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      icon: <Sun className="w-5 h-5 text-amber-500" />
    });
  }

  // 6. Air Quality Index Safeguards
  if (aqi && aqi > 100) {
    notificationItems.push({
      id: 'weather_air_quality',
      title: `رصد تدني نسبي في جودة الهواء (${aqi}) 🌬️`,
      desc: `مؤشر نقاء الهواء غير صحي للفئات التي تعاني من حساسية الصدر أو الربو. يفضل البقاء في أجواء مغلقة جيدة التهوية أو ارتداء الكمامة الواقية بالخارج.`,
      badge: 'حماية تنفسية 🌬️',
      badgeColor: 'bg-teal-500/10 text-teal-650 dark:text-teal-400 border border-teal-500/20',
      icon: <Wind className="w-5 h-5 text-teal-500" />
    });
  }

  // Fallback if no notifications
  const hasNotifications = notificationItems.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            className={cn(
               "relative w-full max-w-md bg-white dark:bg-[#0E0F0F] sm:rounded-3xl shadow-2xl border border-gray-150 dark:border-white/5 flex flex-col overflow-hidden max-h-[90vh] sm:max-h-[80vh]",
               "bottom-0 fixed sm:bottom-auto sm:relative rounded-t-3xl rounded-b-none"
            )}
          >
            {/* Header top colored bar decoration */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

            {/* Title Bar */}
            <div className="p-4.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-800 dark:text-white leading-none">الإشعارات والتنبيهات الذكية</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">الحالة اللحظية والتوجيهات الصحية اليومية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Content List */}
            <div className="p-4 overflow-y-auto overscroll-contain space-y-3 flex-1 max-h-[60vh] sm:max-h-[500px]">
              {hasNotifications ? (
                notificationItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-[#161917]/50 border border-gray-150/50 dark:border-white/5 flex gap-3 text-right"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 flex items-center justify-center shadow-xs shrink-0 select-none">
                      {item.icon}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-row-reverse text-right">
                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider", item.badgeColor)}>
                          {item.badge}
                        </span>
                        <h4 className="text-[11.5px] font-black text-gray-800 dark:text-gray-200">
                          {item.title}
                        </h4>
                      </div>

                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                        {item.desc}
                      </p>

                      {item.missing && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-start">
                          {item.missing.map((field) => (
                            <span key={field} className="text-[8.5px] font-black bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-md border border-rose-500/15">
                              ⚠️ {field}
                            </span>
                          ))}
                        </div>
                      )}

                      {item.action && (
                        <button
                          type="button"
                          onClick={item.action.onClick}
                          className="text-[9.5px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 transition-all mt-2.5 cursor-pointer"
                        >
                          {item.action.text}
                        </button>
                      )}

                      {item.hasFastingAction && onSetFastingStateToday && (
                        <div className="flex flex-col gap-2 border-t border-gray-100 dark:border-white/5 pt-2 mt-2">
                          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold">
                            هل تريد تسجيل صيامك لليوم بنقرة واحدة وتعديل نظام السعرات والمياه؟
                          </p>
                          <div className="flex gap-1.5 justify-start">
                            {isFastingMode ? (
                              <div className="flex items-center justify-between w-full">
                                <span className="text-[9.5px] font-black text-emerald-650 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                   🟢 تم التسجيل كصائم
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onSetFastingStateToday(false)}
                                  className="text-[8.5px] font-bold text-red-500 hover:underline cursor-pointer"
                                >
                                  إلغاء الصيام
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => onSetFastingStateToday(true)}
                                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black py-1.5 px-3 rounded-lg active:scale-95 transition-all cursor-pointer"
                                >
                                  🕌 نعم، حددني كصائم لليوم
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSetFastingStateToday(false)}
                                  className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-[9px] font-black py-1.5 px-3 rounded-lg active:scale-95 transition-all cursor-pointer"
                                >
                                  لست صائماً ❌
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">لا توجد تنبيهات عاجلة اليوم</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 leading-relaxed">
                      جسمك ونظامك يسير ببطء واستقرار رائع! سنقوم بتنبيهك فورا في حالة وجود تذكير أو تنبيهات طارئة.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-[#111111]/30 border-t border-gray-100 dark:border-white/5 text-center">
              <span className="text-[8.5px] text-gray-400 font-bold">
                تنبيهات لايف كومبانيون الذكية تستند إلى تحليلاتك الشخصية اليومية
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
