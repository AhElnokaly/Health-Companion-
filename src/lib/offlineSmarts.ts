import { UserProfile } from '../context/AppContext';

export interface SmartInsight {
  id: string;
  type: 'warning' | 'tip' | 'praise' | 'action';
  message: string;
  icon: string;
  actionRoute?: string;
  actionText?: string;
}

export function generateOfflineSmarts(
  profile: UserProfile, 
  currentDate: Date = new Date(),
  localStats: { sleepHours?: number; waterCups?: number } = {}
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const hour = currentDate.getHours();
  const isFemale = profile.gender === 'female';

  // 1. Smart Hydration (Morning check)
  if (hour >= 6 && hour <= 10 && (localStats.waterCups || 0) === 0) {
    insights.push({
      id: 'morning-water',
      type: 'action',
      message: isFemale 
        ? 'صباح الخير يا رفيقتي! كوب من الماء الدافئ الآن ينشط عملية الأيض لديكِ طوال اليوم.'
        : 'صباح الخير يا رفيقي! كوب من الماء الدافئ الآن ينشط عملية الأيض لديكَ طوال اليوم.',
      icon: '💧',
      actionRoute: '/water',
      actionText: 'سجل شرب الماء'
    });
  }

  // 2. Sleep Debt Detection
  if (profile.targetSleep && localStats.sleepHours !== undefined) {
     if (localStats.sleepHours < profile.targetSleep - 2) {
       insights.push({
         id: 'sleep-debt',
         type: 'warning',
         message: isFemale 
           ? `لاحظنا أنكِ نمتِ ${localStats.sleepHours} ساعات فقط، وهذا أقل من هدفكِ (${profile.targetSleep}). حاولي أخذ قيلولة اليوم لتعويض الإرهاق.`
           : `لاحظنا أنكَ نمتَ ${localStats.sleepHours} ساعات فقط، وهذا أقل من هدفكَ (${profile.targetSleep}). حاول أخذ قيلولة اليوم لتعويض الإرهاق.`,
         icon: '🥱',
         actionRoute: '/sleep',
         actionText: 'مراجعة النوم'
       });
     }
  }

  // 3. Evening Winding Down
  if (hour >= 21 || hour <= 4) {
    insights.push({
      id: 'evening-wind-down',
      type: 'tip',
      message: isFemale
        ? 'الوقت متأخر الآن.. تقليل إضاءة الشاشة والابتعاد عن الكافيين يساعدكِ في الحصول على نوم أعمق.'
        : 'الوقت متأخر الآن.. تقليل إضاءة الشاشة والابتعاد عن الكافيين يساعدكَ في الحصول على نوم أعمق.',
      icon: '🌙'
    });
  }

  // 4. Weight/Goal specific
  if (profile.goals?.includes('lose_weight')) {
    if (hour >= 19 && hour <= 21) {
      insights.push({
        id: 'light-dinner',
        type: 'tip',
        message: isFemale
          ? 'لخسارة الوزن بشكل فعال، اجعلي وجبة العشاء خفيفة وغنية بالبروتين وتجنبي الكربوهيدرات الثقيلة الآن.'
          : 'لخسارة الوزن بشكل فعال، اجعل وجبة العشاء خفيفة وغنية بالبروتين وتجنب الكربوهيدرات الثقيلة الآن.',
        icon: '🥗'
      });
    }
  }

  // 5. General setup fallback
  if (!profile.onboardingCompleted || !profile.targetWeight) {
    insights.push({
      id: 'missing-data',
      type: 'action',
      message: isFemale
        ? 'ملفكِ الشخصي غير مكتمل! التحليلات الذكية تحتاج لمعرفة وزنكِ وطولكِ لتعمل بدقة.'
        : 'ملفكَ الشخصي غير مكتمل! التحليلات الذكية تحتاج لمعرفة وزنكَ وطولكَ لتعمل بدقة.',
      icon: '⚙️',
      actionRoute: '/profile',
      actionText: 'استكمال البيانات'
    });
  }

  return insights;
}
