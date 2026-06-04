import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ChevronLeft, CalendarHeart, Sparkles, PlusCircle, Baby, CheckCircle2, 
  Droplets, Brain, Salad, Activity, Moon, Info, Calendar as CalendarIcon,
  Bell, Home, Compass, Users, TrendingUp, HeartPulse, MessageCircle, Eye, EyeOff, Trash2, Coffee, ArrowDownToLine, Search, Pencil, X,
  RotateCw, ThumbsUp
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { ExpandableCard } from '../components/ExpandableCard';
import { ARTICLES, ArticleData } from '../data/womensHealthArticles';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type HormonePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'pregnancy' | 'postpartum';

interface CycleLog {
  id: string;
  startDate: number;
  endDate: number | null;
  status: 'period' | 'pregnancy' | 'postpartum';
}

const PHASE_DETAILS = {
  menstrual: {
    name: 'فترة الحيض',
    color: '#C2185B', // Rose Primary
    twColor: 'text-[#C2185B]',
    bg: 'bg-[#C2185B]',
    lightBg: 'bg-[#C2185B]/10',
    desc: 'مستوى الهرمونات في أدنى مستوياته. طاقة منخفضة ووقت مثالي للراحة والاستبطان.',
    nutrition: 'الحديد، فيتامين C، الماغنسيوم (سبانخ، لحوم حمراء، شيكولاتة داكنة).',
    exercise: 'تمارين تمدد خفيفة، مشي هادئ، يوجا استرخائية.',
    islamic: 'إعفاء رباني من الصلاة والصيام. فرصة رائعة للذكر والدعاء والتأمل.',
    symptoms: ['تقلصات', 'إرهاق', 'رغبة في الانعزال'],
    partnerSupport: 'شريك العمر: وفر لها سبل الراحة والهدوء، قهوة أو كوب دافئ هادئ، واجتنب لومها على قلة طاقتها اليوم. كثرة الحب والمساندة تخفف الألم الهرموني!'
  },
  follicular: {
    name: 'الطور الجريبي',
    color: '#7B1FA2', // Mauve
    twColor: 'text-[#7B1FA2]',
    bg: 'bg-[#7B1FA2]',
    lightBg: 'bg-[#7B1FA2]/10',
    desc: 'الاستراديول يرتفع. طاقة متزايدة، إبداع عالي، مزاج إيجابي وتفاؤل.',
    nutrition: 'بروتينات خفيفة، خضروات مخمرة، أطعمة تدعم استقلاب الإستروجين.',
    exercise: 'كارديو، تمارين قوة خفيفة إلى متوسطة، نشاط اجتماعي.',
    islamic: 'أيام طهر. التزام تام بالعبادات، استغلي نشاطك في النوافل.',
    symptoms: ['نشاط ذهني', 'تفاؤل', 'زيادة الإبداع'],
    partnerSupport: 'شريك العمر: ستلاحظ مبادرتها ومودّتها الكبيرة ونشاطها اليوم. وقت رائع للتخطيط لمستقبل الأسرة، أو الخروج معاً لكسر روتين الأسبوع!'
  },
  ovulation: {
    name: 'فترة التبويض',
    color: '#F57F17', // Gold
    twColor: 'text-[#F57F17]',
    bg: 'bg-[#F57F17]',
    lightBg: 'bg-[#F57F17]/10',
    desc: 'ذروة الإستروجين وتزايد التستوستيرون. طاقة في أعلى مستوياتها، ثقة وتواصل اجتماعي.',
    nutrition: 'مضادات أكسدة، ألياف لدعم التخلص من فائض الإستروجين (توت، بروكلي).',
    exercise: 'تمارين عالية الكثافة (HIIM)، عضلات قابلة لبذل مجهود أعلى.',
    islamic: 'أيام طهر. تأملي في آيات الخالق في تكوين الإنسان.',
    symptoms: ['ثقة بالنفس', 'طاقة عالية', 'ألم خفيف أسفل البطن'],
    partnerSupport: 'شريك العمر: تجد زوجتك متألقة بدنياً ونفسياً اليوم. عبر لها عن مدى تقديرك لجمالها ونشاطها، واستغل اليوم للحديث الدافئ والإنصات العميق لها.'
  },
  luteal: {
    name: 'الطور اللوتيني',
    color: '#00796B', // Teal
    twColor: 'text-[#00796B]',
    bg: 'bg-[#00796B]',
    lightBg: 'bg-[#00796B]/10',
    desc: 'هيمنة البروجسترون. تباطؤ تدريجي للطاقة، رغبة في الترتيب والإنجاز الهادئ، احتمالية لمتلازمة ما قبل الطمث (PMS).',
    nutrition: 'كربوهيدرات معقدة لتنظيم السيروتونين، كالسيوم وماغنسيوم (شوفان، مكسرات).',
    exercise: 'يوجا، بيلاتس، السباحة. تجنبي الإجهاد العالي.',
    islamic: 'أيام طهر. قد تتقلب مشاعرك، استعيني بالصلاة والدعاء لتسكين القلق.',
    symptoms: ['تقلبات مزاجية', 'انتفاخ', 'تشوش ذهني (Brain Fog)'],
    partnerSupport: 'شريك العمر: تجنب تماماً العتب أو الجدل الحاد اليوم؛ أي هجوم بسيط سيكون مؤلماً وتتفجر بسببه متلازمة الـ PMS. مفاجأتها بشوكولاتة دافئة وكلمة حنونة كفيلة بحماية سلام بيتكم!'
  },
  pregnancy: {
    name: 'رحلة الحمل',
    color: '#4F46E5', // Indigo
    twColor: 'text-indigo-600',
    bg: 'bg-indigo-600',
    lightBg: 'bg-indigo-50',
    desc: 'مرحلة تكوين حياة جديدة. الرعاية تتركز على دعم النمو وتقليل أعراض الوحام.',
    nutrition: 'حمض الفوليك، الكالسيوم، بروتين عالي الجودة، ترطيب مستمر.',
    exercise: 'مشي خفيف، يوجا الحوامل (بعد استشارة الطبيب).',
    islamic: 'رخصة إفطار رمضان إذا شق عليك، ثواب عظيم للصبر على مشقة الحمل.',
    symptoms: ['غثيان', 'تعب', 'تغيرات في الشهية'],
    partnerSupport: 'شريك العمر: الحمل يستهلك عافيتها. المساعدة البسيطة في البيت، وتوفير وسائد مريحة للنوم مع التدليك اللطيف لقدميها يعبران عن عمق السكون والمحبة.'
  },
  postpartum: {
    name: 'فترة النفاس',
    color: '#0284C7', // Sky
    twColor: 'text-sky-600',
    bg: 'bg-sky-600',
    lightBg: 'bg-sky-50',
    desc: 'مرحلة استعادة العافية (الربع الرابع). التركيز على التئام الجروح، الرضاعة، والاستقرار النفسي.',
    nutrition: 'أطعمة دافئة ومغذية (شوربات، كولاجين)، حديد لتعويض الدم، مرطبات.',
    exercise: 'ممنوع المجهود. تمارين كيجل الخفيفة جداً متى سمح الطبيب.',
    islamic: 'إعفاء من الصلاة والصيام. استغلي الوقت في سماع القرآن والدعاء للمولود.',
    symptoms: ['آلام تقلصات', 'نزيف', 'تقلبات عاطفية قوية'],
    partnerSupport: 'شريك العمر: رفيقتك تعيش كفاحاً نفسياً وبدنياً عظيماً. تولّ عنها بعض مهام الطفل والرضعات ليلاً لترتاح، وعبر لها عن فخرك بها كأم بطلة لتهدئة قلق النفاس.'
  }
};

const DYNAMIC_PHASE_TIPS: Record<HormonePhase, { dos: string[]; donts: string[] }> = {
  menstrual: {
    dos: [
      "تناولي السبانخ واللحم الأحمر لتعويض الفقد الحاد في مخزون الحديد.",
      "مارسي يوجا التمدد الهادئة لتخفيف تشنجات جدار الرحم والظهر والبطن.",
      "ضعي قربة ماء دافئ على منطقة الحوض لتخفيف التقلصات المؤلمة بانتظام.",
      "اشربي شاي البابونج أو القرفة الدافئ قبل النوم لتهدئة عضلات جدار الرحم.",
      "سجلي غزارة التدفق وتناول الماء المستمر بانتظام لتقييم رطوبة بشرتك."
    ],
    donts: [
      "تجنبي الكافيين المفرط (أكثر من فنجان قهوة) لأنه يضيق الأوعية الدقيقة ويزيد تشنج الرحم.",
      "تجنبي الأطعمة شديدة الملوحة لتفادي احتباس السوائل المؤلم وتورم اليدين والقدمين.",
      "تجنبي المشروبات المثلجة جداً والمأكولات المليئة بالزيوت المقلية الدسمة لتلافي تشنج القولون الهرموني.",
      "تجنبي بذل أي مجهود هوائي شاق (HIIT) أو رفع أحمال ثقيلة جداً لعدم إجهاد العمود الفقري.",
      "تجنبي النوم في غرف باردة غير مهواة لتجنب تقلص عضلات أسفل الظهر."
    ]
  },
  follicular: {
    dos: [
      "استغلي ارتفاع الإستروجين لبدء مشروع جديد، كتابة أفكار مبتكرة، أو التخطيط المهني لشهرك.",
      "تناولي أطعمة غنية بالبروتينات الخفيفة كالديك الرومي والبيض وأطعمة غنية بالزنك لدعم البويضات.",
      "زيدي كثافة تمارين القوة والكارديو؛ عضلاتك قابلة للاستشفاء بشكل رائع ومثالي الآن.",
      "عززي نشاطك الاجتماعي والتواصل مع العائلة؛ مستويات الثقة والمزاج في أوجها الإيجابي.",
      "تناولي خضروات مخمرة مثل الكرنب المخلل لدعم الميكروبيوم ومساعدته في الاستقلاب الهرموني."
    ],
    donts: [
      "تجنبي الانعزال أو الاستسلام للكسل؛ دماغك ومزاجك مستعدان تماماً للنجاح والتواصل المبهج.",
      "تجنبي السكريات والحلويات المصنعة بكثرة؛ مستويات الحرق لديك مثالية فلا تفسديها بالكربوهيدرات السريعة.",
      "tجنبي التهاون في تنظيم ساعات نومك؛ حتى لو كانت طاقتك عالية، النوم يحافظ على توازن الغدة الدرقية.",
      "تجنبي الإفراط في تعبئة جدولك بمهام تفوق طاقتك الفردية منعاً للمرور بإنهاك هرموني مباغت.",
      "تجنبي إهمال تنفس الهواء النقي لزيادة السعة الرئوية مدعومة بالإستروجين الإيجابي."
    ]
  },
  ovulation: {
    dos: [
      "سجلي درجة حرارة جسمك الأساسية لمراقبة دقيقة وفهم عميق للنافذة الأكثر خصوبة وتوافقاً.",
      "ركزي على الألياف ومضادات الأكسدة مثل البروكلي والتوت البري لمساعدة الكبد في التخلص السليم من الإستروجين بعد ذروته.",
      "مارسي التمارين عالية الطاقة والركض لحرق أي طاقة فائضة وتجديد خلايا الدماغ والقلب.",
      "استغلي طلاقتك اللفظية العالية وثقتك بنفسك لحل المشاكل المعلقة وتقديم العروض التقديمية بنجاح.",
      "أكثري من الخضار ذات الأوراق الداكنة والدهون الصحية كالأفوكادو لدعم نضارة وشباب قرنية العين والبشرة."
    ],
    donts: [
      "تجنبي الاندفاع العاطفي فالتستوستيرون المرتفع قد يزيد الجرأة الفورية في القرارت دون رغبة حقيقية.",
      "تجنبي البقاء في أماكن شديدة الحرارة لفترات طويلة لمنع الشعور بالدوار الهرموني الخفيف.",
      "تجنبي الجفاف الشديد؛ قللي شرب المشروبات الغازية لعدم سحب الكالسيوم والمعادن الحساسة للأنسجة.",
      "تجنبي التمرين حتى التعب القاتل؛ المفاصل تكون لينة ومدرة للهرمون المرخي مما قد يسبب التواءً غير مقصود.",
      "تجنبي الغضب أو الانفعال لتلافي حدوث صداع نصفي طفيف تالٍ للتبويض مباشرة."
    ]
  },
  luteal: {
    dos: [
      "تناولي الكربوهيدرات المعقدة كالشوفان والأرز البني لتنظيم مستوى السيروتونين وتفادي نوبات الجوع الهرموني.",
      "احرصي على النوم المبكر الهادئ لثماني ساعات لتجنب أرق هرمون البروجسترون المرتفع.",
      "مارسي تمارين اليوجا الاسترخائية، البيلاتس، والمشي الهادئ في الطبيعة بعيداً عن الصعب وضغوطات اليوم.",
      "احفظي خصوصية حالتك المزاجية المتقلبة؛ استمعي للقرآن والذكر وجربي تخفيف جدول أعمالك.",
      "اشربي الماغنسيوم ليلاً أو تناولي المكسرات النيئة لراحة عضلاتك وتهدئة القلق النفسي الهرموني."
    ],
    donts: [
      "تجنبي الدخول في نقاشات حادة أو اتخاذ قرارات مصيرية تحت وطأة تقلبات متلازمة ما قبل الطمث PMS.",
      "تجنبي الوجبات السريعة ورقائق البطاطس المليئة بالزيوت المكررة لسبب تزايد فرص نفخة الأمعاء والبطن.",
      "تجنبي ممارسة تمارين الكارديو العنيفة أو رفع الأثقال القصوى؛ الغدة الكظرية تكون أضعف من تحمل إجهاد مفرط.",
      "تجنبي المشروبات التي تحتوي على منبهات مكثفة أو كحوليات لكيلا تصابي باضطرابات نوم متتابعة.",
      "تجنبي لوم نفسك على تقلب المزاج أو البكاء بدون سبب؛ تفهمي أن هذا طقس هرموني طبيعي تماماً سيزول."
    ]
  },
  pregnancy: {
    dos: [
      "تناولي وجبات صغيرة متفرقة كل ساعتين لتفادي انكماش المعدة ومنع غثيان الحمل والوحام المزعج.",
      "احرصي على شرب لترين ونصف من الماء بانتظام دائم لتنشيط تدفق الدم للرحم وتجنب تقلصات الحوض المبكرة.",
      "امشي ٢٠ دقيقة في هواء نيش ومنعش لتنشيط خلايا مخ الجنين وتحسين الحالة النفسية لكِ.",
      "دوني مواعيد فيتاميناتك ومكمل حمض الفوليك والحديد والكالسيوم في رفيق الأدوية لتلبي احتياجات جنينك بالكلية.",
      "استعيني بالوسائد الطبية الداعمة للظهر والبطن أثناء النوم على الجانب الأيسر لراحة تامة لشرايين الحوض."
    ],
    donts: [
      "تجنبي اللحوم المصنعة النيئة والأسماك عالية ملوحة أو عالية الزئبق كالتونة لسلامة الخلايا العصبية لجنينك.",
      "تجنبي حركات الانحناء السريعة أو رفع أوزان تفوق ٣ كيلوجرامات لمنع تمزق أربطة جدار الحوض والظهر.",
      "تجنبي تماماً التوتر أو الانفعال المفاجئ فإنه يرسل هرمونات الكورتيزول للجنين ويدفعه للقلق وقلة الحركة بالرحم.",
      "تجنبي الإفراط في المشروبات العشبية كالمرمية أو الحلبة أو القرفة التي قد تسبب انقباضات غير مستحسنة حالياً.",
      "تجنبي الجلوس المكتبي الطويل لأكثر من ساعة دون وقوف ومشي خطوتين لتفادي خمول وتنميل فخذيك."
    ]
  },
  postpartum: {
    dos: [
      "ابدئي تمارين كيجل بلطف وتدريجياً لتقوية عضلات قاع الحوض وعودة الرحم إلى حجمه المعتاد بمرونة وسهولة.",
      "اشربي ثلاثة لترات ماء على الأعل يومياً وعصائر طبيعية غير محلاة لزيادة إنتاج الحليب وتفادي الجفاف والصداع.",
      "دوني جدول غذاء يحتوي على شوربة الدجاج الطازجة بالخضار والبروتينات لتسريع التئام الجدار الداخلي للرحم.",
      "شاركي القلق وصعوبة قلة النوم مع شريك حياتك وعائلتك واطلبي الرعاية لضمان غفوة نوم تعويضية لجسمك.",
      "تمهلي وكوني فخورة برحلتك العظيمة؛ تعاملي مع جسدك بكامل التعاطف والحب والامتنان صبراً لتمام شفائه."
    ],
    donts: [
      "تجنبي حمل أو دفع أي أشياء ثقيلة تعادل أو تفوق وزن طفلك خلال أول ٦ أسابيع من الولادة حفاظاً على جدار الرحم.",
      "تجنبي إهمال العناية بالخيوط والمناطق الجراحية؛ طهريها بانتظام مع الاستحمام الفاتر والتهوية الكافية.",
      "تجنبي الدخول في قيود وأنظمة ريجيم جافة تفتقر للمعادن الأساسية والنشويات لكيلا يقل إفراز حليب طفلك.",
      "تجنبي الانعزال أو إخفاء مشاعرك إذا شعرت باكتئاب النفاس بل سارعي بالحديث لمن تحبين للشعور بالطمأنينة الكاملة.",
      "تجنبي شرب الكافيين المركز قبل موعد إرضاع طفلك مباشرة حتى لا تسببي له اضطراب النشاط أو البكاء بالليل."
    ]
  }
};

interface MedDatabaseItem {
  name: string;
  category: string;
  treating: string[];
  sideEffects: string;
  safetyPregnancy: string;
  safetyLactation: string;
  verdict: string;
}

const MEDS_DATABASE: MedDatabaseItem[] = [
  {
    name: 'بانادول / باراسيتامول (Panadol/Paracetamol)',
    category: 'مسكنات الألم وخافض الحرارة',
    treating: ['صداع', 'حمى', 'ألم أسفل الظهر', 'ألم خفيف'],
    sideEffects: 'آمن جداً عند الاستخدام المعتدل وبجرعات طبيعية (بحد أقصى 4 جرامات يومياً). نادراً ما يسبب مشاكل للمعدة.',
    safetyPregnancy: 'آمن تماماً ✔️ (يعتبر الأكثر أماناً وخياراً أولاً لتسكين الآلام وخفض الحرارة في جميع مراحل الحمل).',
    safetyLactation: 'آمن تماماً ✔️ (يمر بنسبة ضئيلة جداً في حليب الأم ولا يسبب أي مشاكل للرضيع).',
    verdict: 'آمن ومناسب للاستخدام اليومي المعتدل للجميع.'
  },
  {
    name: 'بروفين / إيبوبروفين (Profen/Ibuprofen)',
    category: 'مضاد التهاب غير ستيرويدي (NSAID)',
    treating: ['تقلصات شديدة', 'ألم مفاصل', 'صداع نصفي', 'ألم عضلات'],
    sideEffects: 'قد يسبب بمرور الوقت تهيج جدار المعدة، حموضة، أو غثيان خفيف.',
    safetyPregnancy: 'ممنوع في الثلث الثالث ⚠️ (قد يسبب إغلاقاً مبكراً للقناة الشريانية لقلب الجنين، ومشاكل لضغط الرئتين والدم. غير مستحب في الثلث الأول والثاني إلا للضرورة القصوى).',
    safetyLactation: 'آمن نسبياً ✔️ (يمر بنسب منخفضة جداً ويمكن تناوله بحذر ولفترات قصيرة بعد استشارة طبيبك).',
    verdict: 'ممنوع تماماً للحوامل في الأشهر الثلاثة الأخيرة.'
  },
  {
    name: 'بونستان فورت (Ponstan Fort)',
    category: 'مسكن مغص والتهابات',
    treating: ['مغص الدورة الشهرية', 'تقلصات الرحم والشرايين'],
    sideEffects: 'ألم بالبطن، إسهال مؤقت، أو رغبة خفيفة في الغثيان.',
    safetyPregnancy: 'غير موصى به ومحفوف بالمخاطر ❌ (يمنع استخدامه في مراحل الحمل وخاصة الثلث الثالث لتجنب إعاقة الولادة أو الإضرار بالجنين).',
    safetyLactation: 'يجب استخدامه بعد استشارة طبيبك ⚠️ (يفضل تجنبه أثناء الرضاعة لوجود خيارات أكثر أماناً).',
    verdict: 'علاج ممتاز لمغص الدورة الشهرية ولكنه ممنوع للحوامل.'
  },
  {
    name: 'باسكوبان (Buscopan)',
    category: 'مضاد لتقلصات العضلات الملساء',
    treating: ['مغص', 'انتفاخ المعدة', 'تقلصات رحمية ومعوية'],
    sideEffects: 'جفاف خفيف بالفم، زغللة مؤقتة بالرؤية، أو إمساك بسيط.',
    safetyPregnancy: 'يستعمل بحذر شديد ⚠️ (لا يفضل استخدامه أثناء الحمل وخاصة الشهور الثلاثة الأولى دون مراقبة طبية دقيقة).',
    safetyLactation: 'استخدميه بحذر طبي ⚠️ (قد يقلل من إنتاج الحليب أو يفرز بنسبة قليلة، استشيري طبيبك أولاً).',
    verdict: 'جيد للتشنجات والمغص المعوي، استعيني برأي طبيبك للحمل والرضاعة.'
  },
  {
    name: 'فوليك أسيد (Folic Acid)',
    category: 'فيتامينات ومكملات ضرورية',
    treating: ['إرهاق', 'فقر دم', 'رعاية ما قبل الحمل'],
    sideEffects: 'لا يوجد بجرعات الموصى بها، مفيد جداً لبناء الخلايا.',
    safetyPregnancy: 'آمن وضروري جداً ✔️ (مهم للغاية لمنع العيوب الخلقية في الحبل الشوكي للجنين ويؤخذ اختيارياً قبل الحمل وبداية الشهور الأولى).',
    safetyLactation: 'آمن وموصى به ✔️ (يدعم صحة الأم والطفل معاً أثناء الرضاعة الطبيعية).',
    verdict: 'مكمل لا غنى عنه لصحة الأم والجنين منذ ما قبل الحمل.'
  },
  {
    name: 'فولتارين / ديكلوفيناك (Voltaren/Diclofenac)',
    category: 'مضاد التهاب ومسكن مفاصل حاد',
    treating: ['ألم مفاصل', 'ألم عضلات', 'ألم أسفل الظهر'],
    sideEffects: 'ألم خفيف أو تهيج في المعدة عند حبوب الفم، واللبوس قد يسبب تلبك أمعائي.',
    safetyPregnancy: 'ممنوع تماماً في أشهر الحمل الأخيرة ❌ (قد يسبب أضراراً بالغة لقلب ورئة الجنين، ويمنع الولادة الطبيعية بيسر).',
    safetyLactation: 'استشيري طبيبك ⚠️ (يفضل استخدام مسكن طبيعي خفيف بدلاً عنه إلا للحالة القصوى الموصوفة).',
    verdict: 'ممتاز لآلام المفاصل الشديدة ولكنه يحمل تحذيرات صارمة للحوامل.'
  },
  {
    name: 'زنتاك / فاموتيدين (Pepcid/Famotidine)',
    category: 'مضادات حموضة المعدة',
    treating: ['حموضة', 'ارتجاع المريء', 'ألم معدة'],
    sideEffects: 'صداع عابر وخفيف، ميل بسيط للنوم أحياناً.',
    safetyPregnancy: 'آمن نسبياً ✔️ (مسموح به للارتجاع وحرقة الفؤاد في الحمل عند فشل مضادات الحموضة البسيطة).',
    safetyLactation: 'يفرز بنسب قليلة وآمن نسبياً ✔️ (تحت إشراف طبي لمنع أي إجهاد للرضيع).',
    verdict: 'يوفر راحة سريعة ومثبتة لحموضة وحرقة المريء المرافقة للحمل.'
  }
];

const getPregnancyWeekData = (week: number) => {
  const data: Record<number, { fruit: string, size: string, dev: string, exercises: string, shopping: string }> = {
    1: {
      fruit: "بذرة سمسم صغيرة",
      size: "0.1 ملم",
      dev: "الحيوان المنوي يلقح البويضة مشكلاً الخلايا الأساسية التي تسمى النطفة.",
      exercises: "المشي الخفيف والتمدد اللطيف.",
      shopping: "اختبار حمل منزلي، مكملات حمض الفوليك."
    },
    2: {
      fruit: "حبة خردل",
      size: "0.2 ملم",
      dev: "بدء انغراس البويضة الملقحة في بطانة الرحم (العلقة).",
      exercises: "مشي هادئ يومي لمدة 15 دقيقة.",
      shopping: "لوشن مرطب خالي من العطور للبشرة."
    },
    3: {
      fruit: "بذرة خشخاش",
      size: "2 ملم",
      dev: "بدء تشكل الطبقات الثلاث الأساسية للجنين لتكوين الأعضاء الداخلية والجهاز العصبي.",
      exercises: "تمارين تنفس عميق وتأمل استرخائي.",
      shopping: "سجادة يوجا مريحة، ملابس فضفاضة أولية."
    },
    4: {
      fruit: "حبة سمسم رقيقة",
      size: "3 ملم",
      dev: "انقسام الخلايا مستمر بسرعة فائقة، وبدء تكوين الحبل الشوكي والقلب الأولي.",
      exercises: "مشي هادئ في الهواء الطلق مع شرب كميات وافرة من الماء.",
      shopping: "مذكرة يومية لكتابة مشاعرك وأعراضك."
    },
    5: {
      fruit: "حبة تفاح صغيرة جداً (بذرة برتقال)",
      size: "5 ملم",
      dev: "يبدأ القلب الصغير في الخفقان بانتظام، تبرز ملامح تكوين العيون والآذان.",
      exercises: "تمارين تمدد خفيفة لعضلات الحوض والظهر.",
      shopping: "أقراص زنجبيل أو بسكويت مالح لتخفيف وحام الصباح."
    },
    6: {
      fruit: "حبة بازلاء خضراء 🟢",
      size: "8 ملم",
      dev: "تتشكل براعم الأطراف التي ستصبح يديه وقدميه الصغيرتين بالتدريج.",
      exercises: "مشي خفيف يومي مع أخذ أقساط كافية من الراحة.",
      shopping: "حمالة صدر قطنية ناعمة وداعمة لراحة الصدر."
    },
    7: {
      fruit: "حبة عنب أو حبة توت أزرق 🫐",
      size: "1.3 سم",
      dev: "بدء تكيف الدماغ في النمو والمفاصل الأساسية مثل الكوعين والركبتين.",
      exercises: "المشي اللطيف، التجنب الكامل لأي تمرة شاقة أو قفز.",
      shopping: "كريمات ترطيب طبيعية مضادة لعلامات تمدد الجلد."
    },
    8: {
      fruit: "حبة توت أحمر (كرز) 🍒",
      size: "1.6 سم",
      dev: "أصبح الجنين يتحرك حركات خفيفة جداً لا تشعرين بها بعد، وتتطور أصابعه.",
      exercises: "تمارين بيلاتس خفيفة ومطورة خصيصاً للحوامل.",
      shopping: "كوب أو مطرة مياه مميزة لتشجيعكِ على الترطيب المستمر."
    },
    9: {
      fruit: "حبة زيتونة خضراء 🫒",
      size: "2.3 سم",
      dev: "اكتمال تكوين جميع الهياكل الأساسية للجسم وبدء تحرك المفاصل بشكل أقوى.",
      exercises: "السباحة الخفيفة أو المشي المعتدل.",
      shopping: "وسادة حمل طويلة لتأمين نوم مريح للجنب."
    },
    10: {
      fruit: "حبة مشمش مجفف أو برون 🍑",
      size: "3.1 سم",
      dev: "يتحول الجنين ببطء من مرحلة المضغة، وتبدأ الأجهزة الحيوية الأساسية بالعمل.",
      exercises: "تمارين كيجل لتقوية عضلات قاع الحوض استعداداً للثقل.",
      shopping: "سماعات لطيفة للاستماع للقرآن والهدوء النفسي."
    },
    11: {
      fruit: "حبة تين ناضجة 🪻",
      size: "4.1 سم",
      dev: "يستطيع الجنين الآن فتح وغلق فمه الصغير، وبدء تكوين الأظافر الدقيقة.",
      exercises: "تمارين تمدد خفيفة للرقبة والكتفين والظهر.",
      shopping: "ملابس واسعة ومناسبة للأسابيع القادمة."
    },
    12: {
      fruit: "حبة ليمون حامض صغيرة 🍋",
      size: "5.4 سم",
      dev: "تطور الكلى وبدء تكوين البول وتبرز ردود الفعل الطبيعية كامتصاص الإبهام.",
      exercises: "مشي معتدل لمدة 20-30 دقيقة يومياً.",
      shopping: "حجز موعد أشعة سونار الثلث الأول والاطمئنان عليه."
    },
    13: {
      fruit: "حبة ليمون صفراء عادية 🍋",
      size: "7.4 سم",
      dev: "إنتاج خلايا الدم الحمراء في الكبد واكتمال تشكيل بصمات الأصابع الفريدة للطفل.",
      exercises: "يوجا ما قبل الولادة الخفيفة لتقوية الجسد وتطوير التنفس.",
      shopping: "زيوت تدليك طبيعية كزيت اللوز الحلو الآمن."
    },
    14: {
      fruit: "حبة دراق أو خوخ 🍑",
      size: "8.7 سم",
      dev: "بدء الثلث الثاني! يتغذى الجنين كلياً عبر المشيمة الآن، ويحرك عضلات وجهه.",
      exercises: "المشي بانتظام، تمارين قرفصاء خفيفة جداً بدعم كرسي.",
      shopping: "ملابس حمل مريحة وجذابة تلائم بطنك الصغيرة."
    },
    15: {
      fruit: "حبة تفاح أحمر 🍎",
      size: "10 سم",
      dev: "تتشكل عظام الجنين وتصبح أكثر صلابة بالتدريج، ويبدأ الشعر الخفيف بالنمو.",
      exercises: "تمارين التقوية الخفيفة للذراعين والظهر باستخدام أوزان خفيفة للغاية.",
      shopping: "مكملات الكالسيوم بالتنسيق مع طبيبك المتابع."
    },
    16: {
      fruit: "حبة أفوكادو ناضجة 🥑",
      size: "11.6 سم",
      dev: "عضلات الظهر تقوى والعيون تتحرك ببطء خلف الأجفان المغلقة.",
      exercises: "مشي يومي نشط وسريع قليلاً مع الحفاظ على وتيرة تنفس مريحة.",
      shopping: "ملابس نوم قطنية ناعمة للغاية ومقاس مريح."
    },
    17: {
      fruit: "ثمرة رمان كاملة 🪵",
      size: "13 سم",
      dev: "يخدم الهيكل العظمي عملية التثبيت وبدء سماع الأصوات الخارجية كالنبض.",
      exercises: "تمارين يوجا مخصصة للثلث الثاني لتنشيط الظهر الحوض.",
      shopping: "تجهيز قائمة بالأسماء المفضلة للمولود."
    },
    18: {
      fruit: "حبة كرز هندي أو ثمرة جميز 🍈",
      size: "14.2 سم",
      dev: "بدء تشكل الطبقة الواقية على جلد الجنين وعصبه الصوتي يبدأ بالعمل.",
      exercises: "تمارين تقوية الظهر لمنع آلام أسفل الظهر عند كبر البطن.",
      shopping: "ألبوم صور ذكريات الحمل واللقطات الأولى للسونار."
    },
    19: {
      fruit: "حبة مانجو كبيرة 🥭",
      size: "15.3 سم",
      dev: "تطور الحواس الخمس في الدماغ (السمع واللمس والذوق والشم والبصر).",
      exercises: "السباحة أو الرياضة المائية اللطيفة المريحة للمفاصل والظهر.",
      shopping: "البدء بشراء تجهيزات خزانة ملابس المولود الأساسية."
    },
    20: {
      fruit: "حبة موز صفراء طازجة 🍌",
      size: "25.6 سم (منتصف الطريق!)",
      dev: "مبروك! بلغتِ منتصف رحلتك الدافئة. حركة الجنين تصبح أوضح كرفرفة ناعمة.",
      exercises: "تمارين تمدد يومية للساقين لمنع التشنج العضلي (الشد العضلي).",
      shopping: "حجز السونار التفصيلي التفصيلي للشهر الخامس (Anomalies Scan)."
    },
    24: {
      fruit: "حبة ذرة حلوة صفراء 🌽",
      size: "30 سم",
      dev: "يتشكل جلد الرضيع الخارجي وتتطور الرئتين تدريجياً للتأقلم الخارجي.",
      exercises: "مشي خفيف يومي مع تمارين تقوية الحوض والجلوس المستقيم.",
      shopping: "شنطة مستلزمات البيبي الأنيقة للخروج والزيارات."
    },
    28: {
      fruit: "ثمرة باذنجان كبير 🍆",
      size: "37.6 سم",
      dev: "بدء الثلث الثالث والأخير! الجنين يفتح عينيه ويغلقهما ويستشعر مستويات الإضاءة.",
      exercises: "تمارين قرفصاء الحوامل لفتح وتجهيز الحوض للولادة.",
      shopping: "حقنة Anti-D (إذا كان فصيلة دمك سالب ودم زوجك موجب)."
    },
    32: {
      fruit: "حبة شمام أو كنتالوب صفراء 🍈",
      size: "42.4 سم",
      dev: "ينمو الجنين بسرعة ويكتسب وزناً دهنياً يدفئه بعد الولادة ويقوي مناعته.",
      exercises: "المشي ببطء مع فترات راحة متكررة وتمارين تنفس الولادة.",
      shopping: "تجهيز شنطة الولادة وحقيبة المستشفى الخاصة بك وبطفلك."
    },
    36: {
      fruit: "رأس ملفوف أو خس روماني كبير 🥬",
      size: "47.4 سم",
      dev: "يقترب طفلك من الوزن المكتمل والنزول للحوض لتجهيز لحظة الالتقاء السعيدة.",
      exercises: "تمارين كيجل المستمرة وتمديد لطيف للحوض بالجلوس على كرة التوازن.",
      shopping: "تجهيز كافي لمستلزمات مرحلة النفاس والرضاعة الأنيقة."
    },
    40: {
      fruit: "بطيخة ناضجة عائلية 🍉",
      size: "51.2 سم",
      dev: "اكتمال رائع للرئتين والدماغ. طفلك جاهز تماماً للاحتضان ولقاء عينيكِ الدافئتين.",
      exercises: "المشي الهادئ لتحفيز وتسهيل عضلات عنق الرحم والولادة.",
      shopping: "مستلزمات السرير الصغير وكريمات ترطيب حلمة الثدي للرضاعة."
    }
  };

  const closestWeek = Object.keys(data)
    .map(Number)
    .filter(w => w <= week)
    .sort((a,b) => b - a)[0] || 1;

  return data[closestWeek];
};

const SELF_CARE_ITEMS: Record<HormonePhase, { id: string; text: string; icon: string }[]> = {
  menstrual: [
    { id: 'm1', text: 'شرب كوب دافئ من الأعشاب مهدئ الرحم (نعناع، ينسون أو قرفة)', icon: '🌿' },
    { id: 'm2', text: 'استخدام كمادة دافئة / قارورة ماء لتخفيف ألم المغص وأسفل الظهر', icon: '🔥' },
    { id: 'm3', text: 'أخذ قسط وافر جداً من النوم الاستشفائي والراحة الجسدية', icon: '🛌' },
    { id: 'm4', text: 'ممارسة تمارين تمدد خفيفة لتخفيف احتقان وتشنج عنق الرحم', icon: '🧘‍♀️' }
  ],
  follicular: [
    { id: 'f1', text: 'تنظيم وتدوين أهدافكِ المهنية والشخصية بأعلى حافز وطاقة ذهنية', icon: '📝' },
    { id: 'f2', text: 'تمرين مشي سريع مبهج أو تمرين كارديو لتفعيل الدورة الدموية', icon: '🏃‍♀️' },
    { id: 'f3', text: 'تناول وجبة غنية بالحديد والصويا والبروتينات الكاملة', icon: '🥗' },
    { id: 'f4', text: 'تواصل دافئ ومحادثة مبهجة مع صديقة مقربة أو العائلة لتجديد الحيوية', icon: '👥' }
  ],
  ovulation: [
    { id: 'o1', text: 'تمرين رياضي أعلى كثافة (كارديو مكثف، جري، تمرين قوة) لتوظيف الطاقة القصوى', icon: '🏋️‍♀️' },
    { id: 'o2', text: 'تناول وجبة غنية بمضادات الأكسدة والألياف للتخلص من فضلات الاستروجين', icon: '🥦' },
    { id: 'o3', text: 'روتين ترطيب وتدليل نضارة البشرة للاحتفاء بجمال ورونق التبويض الطبيعي', icon: '🌸' },
    { id: 'o4', text: 'استغلال طلاقتك اللفظية للتعبير بوضوح وإنجاز تفاوضات معلقة', icon: '💡' }
  ],
  luteal: [
    { id: 'l1', text: 'تناول مكمل الماغنسيوم ليلاً لتغذية باسطات العضلات ومقاومة الأرق', icon: '🥛' },
    { id: 'l2', text: 'حظر التوتر وتفادي السيناريوهات الجدلية المرهقة للأعصاب', icon: '🧘‍♀️' },
    { id: 'l3', text: 'تنظيم غرفتك أو تصنيف دولابك لتفريغ طاقة PMS الإنتاجية والهدوء', icon: '🧹' },
    { id: 'l4', text: 'تناول وجبة مريحة دافئة تحتوي على شوفان أو قطع شوكولاتة داكنة', icon: '🍫' }
  ],
  pregnancy: [
    { id: 'p1', text: 'ترطيب خفيف للبطن بالزيوت الطبيعية لتعزيز مرونة الجلد ومنع علامات التمدد', icon: '🧴' },
    { id: 'p2', text: 'تقسيم الطعام لوجبات صغيرة متباعدة لتلافي غثيان ووحام الحمل', icon: '🍪' },
    { id: 'p3', text: 'تمارين تنفس عميق مجهزة مخصصة لتوسعة تمدد الرئتين والهدوء الذاتي', icon: '🌬️' },
    { id: 'p4', text: 'أخذ قيلولة ظهيرة مسترخية لضخ دفق دم مثالي مريح للرحم والجنين', icon: '🛌' }
  ],
  postpartum: [
    { id: 'pt1', text: 'تطهير طبي لطيف وتدليك خفيف للبشرة لتعجيل مرونة الاستشفاء والالتئام', icon: '🧼' },
    { id: 'pt2', text: 'تمارين كيجل خفيفة ولطيفة مع التركيز على تنظيم أنفاس قاع الحوض', icon: '🧘‍♀️' },
    { id: 'pt3', text: 'شرب ٣ لتر من المياه والسوائل لزيادة تدفق جودة وقوة درّ الحليب', icon: '🥛' },
    { id: 'pt4', text: 'طلب شوربة غذائية رملية دافئة (شوربة عظام أو الدجاج الفاخرة) لترطيب بدنك', icon: '🍲' }
  ]
};

export default function WomensHealth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFastingMode, showWomensHealth, toggleWomensHealth, profile, setProfile } = useAppContext();
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [fastingLogs, setFastingLogs] = useState<{id: string, type: string, date: number}[]>([]);
  const [loading, setLoading] = useState(true);

  // New States for Pregnancy and Postpartum tracking
  const [feedingLogs, setFeedingLogs] = useState<{ id: string, side: 'left' | 'right' | 'both', duration: number, timestamp: number }[]>(() => {
    try {
      const saved = localStorage.getItem('local_breastfeeding_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [feedingSide, setFeedingSide] = useState<'left' | 'right' | 'both'>('left');
  const [feedingDuration, setFeedingDuration] = useState<number>(10);
  const [pregSubTab, setPregSubTab] = useState<'baby' | 'mom' | 'exercise' | 'shopping'>('baby');
  const [postSubTab, setPostSubTab] = useState<'kegels' | 'bleeding' | 'breastfeed'>('kegels');

  // New States for Symptom and Medication Analyzer
  const [selectedSymptomAnal, setSelectedSymptomAnal] = useState<string>('');
  const [medAnalQuery, setMedAnalQuery] = useState<string>('');
  const [analResult, setAnalResult] = useState<any>(null);
  const [analLoading, setAnalLoading] = useState<boolean>(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'community' | 'progress'>('home');
  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(null);

  // --- +++ أضيف بناءً على طلبك لرصد إخفاء سؤال انتهاء الدورة بذكاء وتسهيل تفاعلي رائع يسألها يومياً +++ ---
  const [periodAskDismissed, setPeriodAskDismissed] = useState<boolean>(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return localStorage.getItem('dismiss_period_ended_ask_' + todayStr) === 'true';
  });
  const [activeMoods, setActiveMoods] = useState<string[]>(['Mood']);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [contraceptionMethod, setContraceptionMethod] = useState<string>('none');
  const [loggedDrinks, setLoggedDrinks] = useState<string[]>([]);
  const [isPlanStarted, setIsPlanStarted] = useState(false);

  const [completedSelfCare, setCompletedSelfCare] = useState<string[]>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`local_self_care_done_${todayStr}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const toggleSelfCare = (id: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCompletedSelfCare(prev => {
      const updated = prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id];
      localStorage.setItem(`local_self_care_done_${todayStr}`, JSON.stringify(updated));
      return updated;
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  
  // States of modifying cycle logs
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'period' | 'pregnancy' | 'postpartum'>('period');
  const [logFilter, setLogFilter] = useState<'all' | 'period' | 'pregnancy' | 'postpartum'>('all');
  const [showAllLogs, setShowAllLogs] = useState<boolean>(false);
  
  // Smart Friend Chat State
  const [hasGemini, setHasGemini] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{text: string, isUser: boolean}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- +++ أضيف بناءً على طلبك - حالات وقسم المجتمع المتجاوب والحيوي لصحة المرأة +++ ---
  const [communityPosts, setCommunityPosts] = useState<{
    id: string;
    name: string;
    avatar: string;
    phase: string;
    msg: string;
    symptom: string;
    likes: number;
    hasLiked: boolean;
    comments: { id: string; name: string; text: string; date: string }[];
  }[]>(() => {
    const saved = localStorage.getItem('womens_community_posts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading community posts:", e);
      }
    }
    return [
      {
        id: 'cp_1',
        name: 'أمل العتيبي',
        avatar: 'أ',
        phase: 'menstrual',
        msg: 'بنات، المغص الشديد أسفل الظهر تعبني جداً النهار ده، وفقدت تركيزي كلياً في الشغل 😢',
        symptom: 'مغص',
        likes: 12,
        hasLiked: false,
        comments: [
          { id: 'c_1_1', name: 'ولاء رشاد', text: 'سلامتك يا حبيبتي، جربي مشروب القرفة الدافئ وقربة المية السخنة بتنقذني بجد!', date: 'منذ ساعتين' }
        ]
      },
      {
        id: 'cp_2',
        name: 'ولاء رشاد',
        avatar: 'و',
        phase: 'menstrual',
        msg: 'حاسة بخمول وإرهاق كامل في الجسم من أول اليوم.. حد بينصحني بوجبة أو حركة خفيفة تنشطني شوية؟',
        symptom: 'إرهاق',
        likes: 8,
        hasLiked: false,
        comments: []
      },
      {
        id: 'cp_3',
        name: 'دينا سليم',
        avatar: 'د',
        phase: 'follicular',
        msg: 'طاقتي وتركيزي في الشغل والبيت ممتازين جداً في الطور ده! سبحان الله، الإستروجين بيصنع فرق هائل في إنتاجيتنا 🌸',
        symptom: 'نشيطة',
        likes: 15,
        hasLiked: false,
        comments: [
          { id: 'c_3_1', name: 'رنا أحمد', text: 'فعلاً، استغلي الفترة دي في الإنجاز وتخطيط بقية الشهر!', date: 'منذ ساعة' }
        ]
      },
      {
        id: 'cp_4',
        name: 'منى فريد',
        avatar: 'م',
        phase: 'ovulation',
        msg: 'فترة التبويض دايماً بتخليني حاسة بنشاط وثقة رهيبة، بس واجهت نغزة خفيفة أسفل البطن اليمين، هل ده طبيعي؟',
        symptom: 'نشيطة',
        likes: 19,
        hasLiked: false,
        comments: [
          { id: 'c_4_1', name: 'أمل العتيبي', text: 'طبيعي جداً حبيبتي، بيسموه ألم منتصف الدورة وبيدل على تبويض نشط وصحي.', date: 'منذ ٤٠ دقيقة' }
        ]
      },
      {
        id: 'cp_5',
        name: 'هدى شاهين',
        avatar: 'هـ',
        phase: 'luteal',
        msg: 'العصبية وزعل من غير سبب هما عنواني دلوقتي، متلازمة ما قبل الطمث (PMS) مأثرة تماماً على هدوئي 🧠😢',
        symptom: 'متقلبة',
        likes: 24,
        hasLiked: false,
        comments: []
      },
      {
        id: 'cp_6',
        name: 'أروى العباسي',
        avatar: 'أ',
        phase: 'pregnancy',
        msg: 'الغثيان الصباحي وصعوبة النوم تعبوني في الثلث الأول.. ياريت أي أفكار مهدئة للمعدة بالليل والصبح 🤰',
        symptom: 'إرهاق',
        likes: 31,
        hasLiked: false,
        comments: [
          { id: 'c_6_1', name: 'أم مروان', text: 'جربي سناك خفيف زي قطعة بقسماط ناشف أو خيار قبل ما تقومي من السرير الصبح تفرق بجد.', date: 'منذ ساعة' }
        ]
      },
      {
        id: 'cp_7',
        name: 'سناء يوسف',
        avatar: 'س',
        phase: 'postpartum',
        msg: 'عضلات حوضي لسة مجهدة بعد الولادة وحاسة بتعب من أي مجهود، حد جرب تمارين للتسريع من التعافي والراحة؟',
        symptom: 'إرهاق',
        likes: 14,
        hasLiked: false,
        comments: [
          { id: 'c_7_1', name: 'منى رشدي', text: 'تمارين كيجل بالتدريج ممتازة جداً ومشي هادي ١٠ دقايق يومياً بيعزز عافيتك بالسلامة.', date: 'منذ ٣ ساعات' }
        ]
      }
    ];
  });

  const [communityTabFilter, setCommunityTabFilter] = useState<'current_phase' | 'match_symptoms' | 'all'>('current_phase');
  const [newPostText, setNewPostText] = useState('');
  const [newPostSymptom, setNewPostSymptom] = useState('مغص');
  const [newPostSuccessMsg, setNewPostSuccessMsg] = useState('');
  
  // +++ تم الإضافة لتنفيذ طلبك: مشاركة وتبادل نصائح دليل الرعاية مع المجتمع +++
  const [shareSuccessTipMsg, setShareSuccessTipMsg] = useState('');

  const handleShareTip = (tipText: string, isDo: boolean) => {
    const phaseNameStr = phaseData.name;
    const msg = `💡 نصيحة مفيدة من تجربتي اليومية في الرعاية الهرمونية:
"${tipText}"
(ينصح بـ${isDo ? 'اتباعها' : 'تجنبها'} في مرحلة ${phaseNameStr} لتقليل الآلام!)`;
    
    const newPost = {
      id: `cp_tip_${Date.now()}`,
      name: profile.name || 'رفيقة مجتمعية',
      avatar: (profile.name || 'ر').charAt(0),
      phase: phase,
      msg: msg,
      symptom: 'نصيحة مفيدة',
      likes: 0,
      hasLiked: false,
      comments: []
    };
    
    setCommunityPosts(prev => [newPost, ...prev]);
    setShareSuccessTipMsg("تمت مشاركة النصيحة في مجتمع رفيقات الدرب لمواساتهن ودعمهن بنجاح! 💞💐");
    setTimeout(() => {
      setShareSuccessTipMsg('');
    }, 4000);
  };
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  const [randomDoIndex, setRandomDoIndex] = useState(0);
  const [randomDonutIndex, setRandomDonutIndex] = useState(0);

  const [postCommentInputs, setPostCommentInputs] = useState<{[key: string]: string}>({});

  useEffect(() => {
    localStorage.setItem('womens_community_posts', JSON.stringify(communityPosts));
  }, [communityPosts]);

  useEffect(() => {
    fetch('/api/has-gemini')
      .then(res => res.json())
      .then(data => setHasGemini(data.hasKey))
      .catch(() => setHasGemini(false));
  }, []);

  // Gender check - Ask for Male/Female selection if not female
  if (profile?.gender !== 'female') {
    return (
      <div className={cn("min-h-[100dvh] transition-colors duration-500 flex flex-col justify-center items-center text-center px-6 pb-28 pt-10", isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-black text-gray-900 dark:text-gray-100")}>
         <div className="w-20 h-20 bg-rose-100 dark:bg-rose-950/45 text-[#C2185B] rounded-full flex items-center justify-center mb-6 animate-pulse">
            <HeartPulse className="w-10 h-10" />
         </div>
         <h1 className="text-2xl font-black text-[#C2185B] dark:text-pink-400 mb-3">مساحة صحة المرأة 🌸</h1>
         <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-sm leading-relaxed mb-6">
            مساحة صحة المرأة مخصصة ومصممة لمتابعة الدورة الشهرية، سلامة الحمل والنفاس، الرضاعة وصيدلية الأدوية بخصوصية تامة وبكرامة كاملة.
         </p>
         
         <div className="bg-white dark:bg-[#1E1E1E] border border-gray-150 dark:border-white/5 rounded-3xl p-6 shadow-sm max-w-sm w-full mb-6">
            <p className="text-xs font-bold text-gray-500 mb-4 text-center">فضلاً حددي خيار الجنس لتنشيط القسم واستكشاف الميزات:</p>
            <div className="grid grid-cols-2 gap-3" dir="rtl">
               <button 
                 onClick={() => {
                    if (setProfile && profile) {
                       setProfile({ ...profile, gender: 'female' });
                    }
                 }} 
                 className="p-4 rounded-2xl border-2 border-[#C2185B] bg-pink-50/40 dark:bg-pink-950/20 text-[#C2185B] dark:text-pink-400 font-bold text-sm transition-all flex flex-col items-center gap-2 hover:scale-[1.02] shadow-sm"
               >
                  <span className="text-2xl">👩</span>
                  <span>أنثى</span>
               </button>
               <button 
                 onClick={() => {
                    const ans = window.confirm("هل تود تغيير نوع الحساب إلى أنثى لتجربة واستخدام مميزات صحة المرأة؟");
                    if (ans && setProfile && profile) {
                       setProfile({ ...profile, gender: 'female' });
                    } else {
                       navigate('/');
                    }
                 }} 
                 className="p-4 rounded-2xl border-2 border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold text-sm transition-all flex flex-col items-center gap-2 hover:bg-gray-100"
               >
                  <span className="text-2xl">👨</span>
                  <span>ذكر</span>
               </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-4 leading-normal">
               *يتم إخفاء هذا القسم تلقائياً للأعضاء الذكور في القائمة والواجهة لحفظ الترتيب والخصوصية.
            </p>
         </div>
         
         <button onClick={() => navigate('/')} className="text-xs text-gray-500 hover:text-gray-700 font-bold underline">
            العودة للوحة التحكم الرئيسية
         </button>
      </div>
    );
  }

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, {text: userMsg, isUser: true}]);
    setIsChatLoading(true);

    try {
      const context = `المرحلة الحالية: ${PHASE_DETAILS[phase].name}
اليوم الحالي في الدورة: ${cycleDay}
الأعراض: ${activeMoods.join('، ')}
مستوى شرب الماء: ${loggedDrinks.length} كوب`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context })
      });
      const data = await res.json();
      if (data.text) {
        setChatMessages(prev => [...prev, {text: data.text, isUser: false}]);
      } else {
        setChatMessages(prev => [...prev, {text: "عذراً، حدث خطأ، حاولي مرة أخرى.", isUser: false}]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, {text: "عذراً، حدث خطأ بالاتصال.", isUser: false}]);
    }
    setIsChatLoading(false);
  };

  const confirm = (message: string, confirmText?: string, cancelText?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmState(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(null);
          resolve(false);
        }
      });
    });
  };

  const validateAndConfirmPeriod = async (
    startMs: number,
    endMs: number | null,
    status: 'period' | 'pregnancy' | 'postpartum',
    excludeLogId?: string
  ): Promise<boolean> => {
    if (status !== 'period') return true;

    const startDay = new Date(startMs).setHours(0,0,0,0);

    // 1. Durations (if end date exists)
    if (endMs) {
      const endDay = new Date(endMs).setHours(0,0,0,0);
      const duration = Math.floor((endDay - startDay) / 86400000) + 1;
      if (duration < 3) {
         const isSpotting = await confirm(
           `لقد حددتِ فترة حيض مدتها ${duration} يوم فقط، وهي أقل من الحد الأدنى لأيام الدورة الحقيقية (3 أيام).\n\nهل كان هذا الدم استحاضة (نزيف عارض) أم تبقيعاً خفيفاً؟\n\n- لإلغاء السجل واعتباره استحاضة/تبقيع: اضغطي نعم (استحاضة).\n- لاعتبارها دورة حقيقية منتهية: اضغطي لا (دورة حقيقية).`,
           "نعم (استحاضة)",
           "لا (دورة حقيقية)"
         );
         if (isSpotting) return false; // cancel saving
      } else if (duration > 15) {
         const ok = await confirm(
           `تنبيه: السجل المختار مدته ${duration} يوماً، وهو يتجاوز الحد الأقصى لأيام الحيض الشرعية والطبية (15 يوماً).\n\nما زاد عن 15 يوماً يُعتبر دم استحاضة. هل تريدين المتابعة وحفظ السجل على أي حال؟`,
           "نعم، حفظ",
           "إلغاء وتعديل"
         );
         if (!ok) return false;
      }
    }

    // 2. Minimum interval from other periods (15 days of purity - أقل الطهر)
    const otherPeriods = logs
      .filter(l => l.status === 'period' && l.id !== excludeLogId)
      .sort((a,b) => a.startDate - b.startDate);

    for (const p of otherPeriods) {
       const pStart = new Date(p.startDate).setHours(0,0,0,0);
       const pEnd = p.endDate ? new Date(p.endDate).setHours(0,0,0,0) : null;

       // Overlap check
       if (endMs) {
          const endDay = new Date(endMs).setHours(0,0,0,0);
          if (pEnd) {
             if (startDay <= pEnd && endDay >= pStart) {
                await confirm("خطأ: يوجد تداخل في التواريخ مع دورة مسجلة أخرى بالفعل. يرجى مراجعة وتعديل التواريخ.", "حسناً", "إغلاق");
                return false;
             }
          } else {
             if (endDay >= pStart) {
                await confirm("خطأ: يوجد تداخل مع دورة أخرى مستمرة حالياً ولا تحتوي على تاريخ انتهاء.", "حسناً", "إغلاق");
                return false;
             }
          }
       } else {
          // Current record is ongoing
          if (pEnd) {
             if (startDay <= pEnd) {
                await confirm("خطأ: تاريخ بدء الدورة الجديدة يتقاطع مع دورة سابقة منتهية.", "حسناً", "إغلاق");
                return false;
             }
          } else {
             await confirm("خطأ: لا يمكن تسجيل دورة مستمرة جديدة بينما توجد دورة أخرى مستمرة بالفعل في نفس الوقت.", "حسناً", "إغلاق");
             return false;
          }
       }

       // Purity interval (الطهر) check (15 days minimum)
       if (pEnd) {
          if (startDay > pEnd) {
             const purityDays = Math.floor((startDay - pEnd) / 86400000);
             if (purityDays < 15) {
                await confirm(
                   `لا يمكن تسجيل هذا السجل. الفترة الفاصلة (الطهر) بين دورتكِ المسجلة (تنتهي في ${new Date(pEnd).toLocaleDateString('ar-EG')}) وبداية هذا السجل هي ${purityDays} يوم فقط.\n\nالحد الأدنى لفترة الطهر بين الدورتين هو 15 يوماً تجنباً لإدخال دورتين متقاربتين عن طريق الخطأ. هذا النزيف قد يكون استحاضة النقاء.`,
                   "فهمت",
                   "إغلاق"
                );
                return false;
             }
          }
       }

       if (endMs && pStart > endMs) {
          const purityDays = Math.floor((pStart - endMs) / 86400000);
          if (purityDays < 15) {
             await confirm(
                `لا يمكن تسجيل هذا السجل. الفترة الفاصلة بين تاريخ انتهاء هذا السجل وبداية دورتك التالية المسجلة (تبدأ في ${new Date(pStart).toLocaleDateString('ar-EG')}) هي ${purityDays} يوم فقط.\n\nالطهر الفاصل يجب ألا يقل عن 15 يوماً.`,
                "فهمت",
                "إغلاق"
             );
             return false;
          }
       }
    }

    return true;
  };

  const toggleMood = (mood: string) => {
     setActiveMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]);
  };

  const handleShuffleTips = () => {
    const tips = DYNAMIC_PHASE_TIPS[phase] || DYNAMIC_PHASE_TIPS.follicular;
    setRandomDoIndex(prev => (prev + 1) % tips.dos.length);
    setRandomDonutIndex(prev => (prev + 1) % tips.donts.length);
  };

  const handleDeleteData = async () => {
     const ok = await confirm('هل أنت متأكدة من مسح جميع بيانات وتواريخ الدورة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.', 'مسح كل البيانات', 'تراجع');
     if (ok && user?.uid) {
         if (user.uid === 'local_guest_user') {
             localStorage.setItem('local_cycle_logs', '[]');
             setLogs([]);
             window.dispatchEvent(new Event('localCycleUpdated'));
         } else {
             try {
                 for (const log of logs) {
                     await deleteDoc(doc(db, 'users', user.uid, 'cycleLogs', log.id));
                 }
                 setLogs([]);
             } catch (e) {
                 console.error("Error deleting all data:", e);
             }
         }
     }
  };

  useEffect(() => {
    if (!user) return;

    if (user.uid === 'local_guest_user') {
      // 1. Cycle Logs Local listener
      const loadLocalCycleData = () => {
         const savedCycle = localStorage.getItem('local_cycle_logs') || '[]';
         try {
            const list = JSON.parse(savedCycle);
            list.sort((a: any, b: any) => b.startDate - a.startDate);
            setLogs(list);
         } catch (e){}
         setLoading(false);
      };
      
      // 2. Fasting Logs Local listener
      const loadLocalFastingData = () => {
         const savedFasting = localStorage.getItem('local_fasting_logs') || '[]';
         try {
            setFastingLogs(JSON.parse(savedFasting));
         } catch(e){}
      };

      // 3. Water Logs Local listener & extractor
      const loadLocalWaterData = () => {
         const savedWater = localStorage.getItem('local_water_logs') || '[]';
         try {
            const waterList = JSON.parse(savedWater);
            const todayDrinks: string[] = [];
            const startOfTodayMs = new Date().setHours(0, 0, 0, 0);
            waterList.forEach((data: any) => {
               if (data && data.timestamp >= startOfTodayMs) {
                  const bev = data.beverageType;
                  if (bev === 'نعناع') {
                     todayDrinks.push('mint');
                  } else if (bev === 'زنجبيل') {
                     todayDrinks.push('ginger');
                  } else if (bev === 'بابونج') {
                     todayDrinks.push('chamomile');
                  } else {
                     todayDrinks.push(data.id || String(data.timestamp));
                  }
               }
            });
            setLoggedDrinks(todayDrinks);
         } catch (e){}
      };

      // 4. Local contraception settings
      const savedSettings = localStorage.getItem('local_settings_womenshealth') || 'none';
      setContraceptionMethod(savedSettings);

      loadLocalCycleData();
      loadLocalFastingData();
      loadLocalWaterData();

      window.addEventListener('localCycleUpdated', loadLocalCycleData);
      window.addEventListener('localWaterUpdated', loadLocalWaterData);

      return () => {
         window.removeEventListener('localCycleUpdated', loadLocalCycleData);
         window.removeEventListener('localWaterUpdated', loadLocalWaterData);
      };
    }

    const q1 = query(collection(db, 'users', user.uid, 'cycleLogs'));
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const loaded: CycleLog[] = [];
      snapshot.forEach(doc => {
        loaded.push({ id: doc.id, ...doc.data() } as CycleLog);
      });
      loaded.sort((a, b) => b.startDate - a.startDate);
      setLogs(loaded);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/cycleLogs`);
      setLoading(false);
    });
    
    const q2 = query(collection(db, 'users', user.uid, 'fastingLogs'));
    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const fl: any[] = [];
      snapshot.forEach(doc => fl.push({ id: doc.id, ...doc.data() }));
      setFastingLogs(fl);
    });

    const unsubscribe3 = onSnapshot(doc(db, 'users', user.uid, 'settings', 'womensHealth'), (docSnap) => {
       if (docSnap.exists()) {
          setContraceptionMethod(docSnap.data()?.contraceptionMethod || 'none');
       }
    });

    // +++ أضيف بناءً على طلبك لربط شرب الماء بمتتبع المياه العام في لوحة التحكم +++
    const qWater = query(collection(db, 'users', user.uid, 'waterLogs'));
    const unsubscribeWater = onSnapshot(qWater, (snapshot) => {
       const todayDrinks: string[] = [];
       const startOfTodayMs = new Date().setHours(0, 0, 0, 0);
       snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.timestamp >= startOfTodayMs) {
             const bev = data.beverageType;
             if (bev === 'نعناع') {
                todayDrinks.push('mint');
             } else if (bev === 'زنجبيل') {
                todayDrinks.push('ginger');
             } else if (bev === 'بابونج') {
                todayDrinks.push('chamomile');
             } else {
                todayDrinks.push(docSnap.id);
             }
          }
       });
       setLoggedDrinks(todayDrinks);
    }, (error) => {
       console.error("Error loading water logs in Womens page subscription:", error);
    });

    return () => { unsubscribe1(); unsubscribe2(); unsubscribe3(); unsubscribeWater(); };
  }, [user]);

  // Offline Smart Analytics - Calculate user's unique averages
  const cycleStats = useMemo(() => {
    const periodLogs = [...logs].filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate);
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
  }, [logs]);

  // +++ أضيف بناءً على طلبك - حساب متوسط عدد أيام الدورة أو الحد الأقصى الافتراضي لتجنب الأحمر اللانهائي +++
  const periodDurationStats = useMemo(() => {
    const historicalPeriods = logs.filter(l => l.status === 'period' && l.endDate);
    if (historicalPeriods.length === 0) {
      return 7; // الحد الأقصى لعدد أيام الدورة إذا لم يكن هناك تسجيل لأيام دورة سابقة
    }
    let totalDays = 0;
    historicalPeriods.forEach(p => {
       const days = Math.floor((p.endDate! - p.startDate) / 86400000) + 1;
       totalDays += days;
    });
    const avg = Math.round(totalDays / historicalPeriods.length);
    return Math.min(10, Math.max(3, avg));
  }, [logs]);

  // Derive Current State
  const { phase, cycleDay, currentLog, isLate } = useMemo(() => {
    if (!logs.length) return { phase: 'follicular' as HormonePhase, cycleDay: 1, currentLog: null, isLate: false };

    const activePregnancy = logs.find(l => l.status === 'pregnancy' && !l.endDate);
    if (activePregnancy) return { phase: 'pregnancy' as HormonePhase, cycleDay: null, currentLog: activePregnancy, isLate: false };

    const activePostpartum = logs.find(l => l.status === 'postpartum' && !l.endDate);
    if (activePostpartum) return { phase: 'postpartum' as HormonePhase, cycleDay: null, currentLog: activePostpartum, isLate: false };

    // +++ تعديل لكي لا تكون الدورة نشطة ومحسوبة كحيض إلى ما لا نهاية +++
    const activePeriod = logs.find(l => {
       if (l.status !== 'period' || l.endDate) return false;
       const today = new Date().setHours(0,0,0,0);
       const start = new Date(l.startDate).setHours(0,0,0,0);
       const absDaysSince = Math.floor((today - start) / 86400000) + 1;
       // نعتبر الدورة نشطة طالما لم يتم إدخال تاريخ انتهاء، وضمن الحد الأقصى المنطقي (10 أيام أو متوسط أيام دورتها أيهما أكبر) لتفادي الانحراف التحليلي
       return absDaysSince <= Math.max(10, periodDurationStats);
    });
    const pastPeriods = logs.filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate);
    const lastPeriod = pastPeriods[0];

    if (lastPeriod) {
       const today = new Date().setHours(0,0,0,0);
       const start = new Date(lastPeriod.startDate).setHours(0,0,0,0);
       const absDaysSince = Math.floor((today - start) / 86400000) + 1;
       
       if (activePeriod) {
          return { phase: 'menstrual' as HormonePhase, cycleDay: absDaysSince, currentLog: activePeriod, isLate: false };
       }

       // Smart Offline Predictive logic
       const cycleLength = cycleStats.averageCycle;
       const late = absDaysSince > cycleLength + 2; // Considered late if 2 days past average

       let calculatedPhase: HormonePhase = 'luteal';
       if (late) {
          calculatedPhase = 'luteal';
       } else {
          const estimatedOvulation = Math.max(14, cycleLength - 14); // Ovulation is usually 14 days before next period
          if (absDaysSince < estimatedOvulation - 4) {
             calculatedPhase = 'follicular';
          } else if (absDaysSince >= estimatedOvulation - 4 && absDaysSince <= estimatedOvulation + 1) {
             calculatedPhase = 'ovulation';
          } else {
             calculatedPhase = 'luteal';
          }
       }

       return { phase: calculatedPhase, cycleDay: absDaysSince, currentLog: lastPeriod, isLate: late };
    }

    return { phase: 'follicular' as HormonePhase, cycleDay: 1, currentLog: null, isLate: false };
  }, [logs, cycleStats.averageCycle, periodDurationStats]);

  const gestAge = useMemo(() => {
    if (phase !== 'pregnancy' || !currentLog) return { weeks: 1, days: 0, trimester: 1, remainingDays: 280, diffDays: 0 };
    const startMs = currentLog.startDate;
    const todayMs = new Date().setHours(0,0,0,0);
    const diffDays = Math.max(0, Math.floor((todayMs - startMs) / 86400000));
    const weeks = Math.floor(diffDays / 7) + 1;
    const days = diffDays % 7;
    const remainingDays = Math.max(0, 280 - diffDays);
    const trimester = weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3;
    return { weeks, days, trimester, remainingDays, diffDays };
  }, [phase, currentLog]);

  const postpartumAge = useMemo(() => {
    if (phase !== 'postpartum' || !currentLog) return { days: 1 };
    const startMs = currentLog.startDate;
    const todayMs = new Date().setHours(0,0,0,0);
    const diffDays = Math.max(0, Math.floor((todayMs - startMs) / 86400000)) + 1;
    return { days: diffDays };
  }, [phase, currentLog]);

  const phaseData = PHASE_DETAILS[phase];

  const smartAdviceList = useMemo(() => {
     const adviceArr: string[] = [];
     
     // 1. Context-Aware Advice (Symptoms)
     if (activeMoods.includes('مغص')) {
        adviceArr.push("بما أنكِ تشعرين ببعض المغص اليوم، أنصحكِ بكوب دافئ من القرفة أو النعناع، ووضع قربة ماء دافئ على منطقة البطن.");
     }
     if (activeMoods.includes('صداع')) {
        adviceArr.push("الصداع مزعج، صديقتي. حاولي أخذ قسط من الراحة بعيداً عن الشاشات لفترة قصيرة، وتأكدي من ترطيب جسمك جيداً.");
     }
     if (activeMoods.includes('إرهاق')) {
        adviceArr.push("بما أنكِ تشعرين بالإنهاك اليوم، لا ترهقي نفسك بمهام ثقيلة. خذي استراحة، فجسمكِ يحتاج للهدوء الآن.");
     }
     if (activeMoods.includes('متقلبة')) {
        adviceArr.push("تقلب المزاج أمر طبيعي تماماً مع تغير الهرمونات. كوني لطيفة مع نفسك وافعلي شيئاً صغيراً يسعدك اليوم.");
     }

     // 2. Proactive Alerts
     if (phase === 'luteal' && cycleDay && cycleDay > 24) {
        const daysLeft = 28 - cycleDay;
        const daysStr = daysLeft > 0 ? `خلال ${daysLeft} أيام` : 'في أي وقت قريباً';
        adviceArr.push(`عزيزتي، من المتوقع أن تبدأ دورتك ${daysStr}. الاستعداد النفسي والبدني مهم، جهزي مشروباتك الدافئة والمسكنات إن احتجتِ!`);
     }

     // 4. Hydration / Meds Reminders
     if (loggedDrinks.length < 4) {
        adviceArr.push("تذكير صغير: يبدو أنكِ لم تشربي كمية كافية من الماء اليوم، ترطيب جسمك يخفف من الإرهاق والصداع الداخلي!");
     } else if (phase === 'menstrual') {
        adviceArr.push("لا تنسي قرص الحديد أو المكملات الغذائية اليوم لتعويض نشاطك أثناء الدورة الشهرية.");
     }
     
     if (adviceArr.length === 0) {
        adviceArr.push("أنا هنا لمتابعة حالتك الجسدية والنفسية يوماً بيوم. يبدو أن كل شيء مستقر اليوم، يومك سعيد ومليء بالطاقة!");
     }

     return adviceArr;
  }, [activeMoods, phase, cycleDay, loggedDrinks.length]);

  // ++++ تم الحساب بناءً على طلبك لتحديد ما إذا كان اليوم المختار بالتقويم يقع ضمن فترة دورة مسجلة ++++
  const selectedPeriodLog = useMemo(() => {
     const selectedMs = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
     return logs.find(l => {
        if (l.status !== 'period') return false;
        const start = new Date(l.startDate).setHours(0,0,0,0);
        const end = l.endDate ? new Date(l.endDate).setHours(0,0,0,0) : (start + (Math.max(10, periodDurationStats) - 1) * 86400000);
        return selectedMs >= start && selectedMs <= end;
     });
  }, [selectedDate, logs, periodDurationStats]);

  const daysSinceStartOfSelected = useMemo(() => {
     if (!selectedPeriodLog) return 0;
     const selectedMs = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
     const startMs = new Date(selectedPeriodLog.startDate).setHours(0,0,0,0);
     return Math.floor((selectedMs - startMs) / 86400000) + 1;
  }, [selectedDate, selectedPeriodLog]);

  const endSelectedPeriod = async () => {
    if (!selectedPeriodLog || !user) return;
    const selectedMs = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime();
    
    const formattedDate = selectedDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const ok = await confirm(
       `هل أنتِ متأكدة من رغبتكِ في إنهاء الدورة في هذا اليوم المحدد (${formattedDate})؟\n\n- (سيتم تعيين هذا اليوم كآخر يوم للدورة)`, 
       "نعم، إنهاء الدورة", 
       "تراجع"
    );
    if (!ok) return;

    if (user.uid === 'local_guest_user') {
       const updated = logs.map(l => {
          if (l.id === selectedPeriodLog.id) {
             return { ...l, endDate: selectedMs };
          }
          return l;
       });
       localStorage.setItem('local_cycle_logs', JSON.stringify(updated));
       setLogs(updated);
       window.dispatchEvent(new Event('localCycleUpdated'));
    } else {
       try {
          await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', selectedPeriodLog.id), { 
             endDate: selectedMs 
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/cycleLogs`);
       }
    }
  };

  const deleteSelectedPeriod = async () => {
    if (!selectedPeriodLog || !user) return;
    const ok = await confirm(
       `لقد قمتِ باختيار يوم يقع في بداية الدورة (اليوم الـ ${daysSinceStartOfSelected}).\n\nهل أنتِ متأكدة من رغبتكِ في إلغاء وحذف تسجيل هذه الدورة بالكامل من السجلات لتصحيح الخطأ؟`,
       "نعم، حذف السجل بالكامل",
       "تراجع"
    );
    if (!ok) return;

    if (user.uid === 'local_guest_user') {
       const updated = logs.filter(l => l.id !== selectedPeriodLog.id);
       localStorage.setItem('local_cycle_logs', JSON.stringify(updated));
       setLogs(updated);
       window.dispatchEvent(new Event('localCycleUpdated'));
    } else {
       try {
          await deleteDoc(doc(db, 'users', user.uid, 'cycleLogs', selectedPeriodLog.id));
       } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/cycleLogs`);
       }
    }
  };

  // ++++ متغير JSX ذكي لعرض خيارات الإنهاء أو الحذف المباشرة في حالة اختيار يوم دورة بالتقويم ++++
  const selectedPeriodButtons = useMemo(() => {
    if (!selectedPeriodLog) return null;
    return (
      <>
         <div className="col-span-2 text-center bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100/30 dark:border-pink-900/20 p-2.5 rounded-[16px] mb-1">
            <span className="text-[10px] font-bold text-[#C2185B] dark:text-pink-400">
               💡 لقد قمتِ بتحديد اليوم الـ <span className="text-sm font-black">{daysSinceStartOfSelected}</span> من دورة مسجلة تبدأ في 
               {' '}{new Date(selectedPeriodLog.startDate).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}.
            </span>
         </div>
         {daysSinceStartOfSelected >= 3 ? (
            <>
               <button 
                  style={{ gridColumn: 'span 2' }} 
                  onClick={endSelectedPeriod} 
                  className="p-2.5 rounded-[16px] bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-emerald-100 dark:border-emerald-950/20 transition-all hover:bg-emerald-100 active:scale-95 shadow-sm"
               >
                  <CheckCircle2 className="w-3.5 h-3.5" /> إنهاء الدورة في هذا اليوم (اليوم الـ {daysSinceStartOfSelected})
               </button>
               <button 
                  style={{ gridColumn: 'span 2' }} 
                  onClick={deleteSelectedPeriod} 
                  className="p-2.5 rounded-[16px] bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-rose-200/50 dark:border-rose-900/30 transition-all hover:bg-rose-100 active:scale-95"
               >
                  <Trash2 className="w-3.5 h-3.5" /> إلغاء الدورة بالكامل وهدم السجل (لتصحيح الخطأ)
               </button>
            </>
         ) : (
            <button 
               style={{ gridColumn: 'span 2' }} 
               onClick={deleteSelectedPeriod} 
               className="p-2.5 rounded-[16px] bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-red-200/50 dark:border-red-900/30 transition-all hover:bg-red-100 active:scale-95 shadow-sm"
            >
               <Trash2 className="w-3.5 h-3.5" /> إلغاء الدورة بالكامل وهدم السجل (لتصحيح الخطأ)
            </button>
         )}
      </>
    );
  }, [selectedPeriodLog, daysSinceStartOfSelected, endSelectedPeriod, deleteSelectedPeriod]);

  const handleAction = async (actionType: 'start_period' | 'end_period' | 'start_pregnancy' | 'end_pregnancy' | 'start_postpartum' | 'end_postpartum') => {

    if (!user) return;
    const now = selectedDate.getTime();

    if (user.uid === 'local_guest_user') {
      const offlineLogs = [...logs];
      const saveOfflineAndSet = (list: any[]) => {
         localStorage.setItem('local_cycle_logs', JSON.stringify(list));
         setLogs(list);
         window.dispatchEvent(new Event('localCycleUpdated'));
      };

      if (actionType === 'start_period') {
        const hasPastPeriods = offlineLogs.some(l => l.status === 'period');
        if (hasPastPeriods) {
           // Check for purity constraint (minimum 15 days of purity between periods)
           const pastEndedPeriods = offlineLogs.filter(l => l.status === 'period' && l.endDate).sort((a,b) => b.startDate - a.startDate);
           const lastPeriod = pastEndedPeriods[0];
           if (lastPeriod && lastPeriod.endDate) {
              const purityDays = Math.floor((now - new Date(lastPeriod.endDate).setHours(0,0,0,0)) / 86400000);
              if (purityDays < 15) {
                 await confirm(`لا يمكن تسجيل دورة جديدة الآن. الفترة الفاصلة (الطهر) بين دورتكِ السابقة وهذا اليوم هي ${purityDays} يوم فقط (الحد الأدنى للطهر بين الدورتين هو 15 يوماً).\n\nهذا النزيف قد يكون استحاضة أو نزيفاً عارضاً ولا يُقبل تسجيله كدورة جديدة حالياً لتفادي تسجيل دورتين بالخطأ.`, "حسناً", "إغلاق");
                 return;
              }
           }

           if (cycleDay !== null && cycleDay < 20) {
              const ok = await confirm(`لقد مر ${cycleDay - 1} يوم فقط على آخر دورة لكِ (يُفضل ألا تقل الدورة عن 20 يوماً). هل أنتِ متأكدة من تسجيل دورة جديدة الآن؟`, "نعم، متأكدة", "إلغاء");
              if (!ok) return;
           }
        }
        
        // End active period if exists
        const pd = offlineLogs.find(l => l.status === 'period' && !l.endDate);
        if (pd) {
           pd.endDate = now;
           pd.timestamp = pd.timestamp || now;
        }
        
        offlineLogs.unshift({
           id: `local_${Date.now()}`,
           startDate: now,
           endDate: null,
           status: 'period',
           timestamp: now
        });
        saveOfflineAndSet(offlineLogs);
      } else if (actionType === 'end_period' && currentLog) {
         const daysSinceStart = Math.floor((now - new Date(currentLog.startDate).setHours(0,0,0,0)) / 86400000) + 1;
         if (daysSinceStart < 3) {
            const isSpotting = await confirm(
               `لقد مر أقل من 3 أيام على الحيض (وهو الحد الأدنى لأيام الدورة الحقيقية).\n\nهل كانت هذه استحاضة (نزيف عارض) أم تبقيعاً خفيفاً؟\n\n- لإلغاء السجل واعتباره استحاضة/تبقيع: اضغطي نعم (استحاضة).\n- لاعتبارها دورة حقيقية منتهية: اضغطي لا (دورة حقيقية).`,
               "نعم (استحاضة)",
               "لا (دورة حقيقية)"
             );
            if (isSpotting) {
               const listFiltered = offlineLogs.filter(l => l.id !== currentLog.id);
               saveOfflineAndSet(listFiltered);
               return;
            }
         } else if (daysSinceStart > 15) {
            await confirm(
               `تنبيه: لقد تجاوزت مدة الدورة الحد الأقصى لأيام الحيض (15 يوماً) حيث بلغت ${daysSinceStart} يوماً.\n\nالدم الزائد عن 15 يوماً يعتبر استحاضة شرعاً وطبياً وننصحك بمراجعة الأحكام أو استشارة الطبيب.`,
               "مفهوم",
               "موافق"
            );
         }
         const target = offlineLogs.find(l => l.id === currentLog.id);
         if (target) {
            target.endDate = now;
            target.timestamp = target.timestamp || now;
            saveOfflineAndSet(offlineLogs);
         }
      } else if (actionType === 'start_pregnancy') {
         offlineLogs.unshift({
            id: `local_${Date.now()}`,
            startDate: now,
            endDate: null,
            status: 'pregnancy',
            timestamp: now
         });
         saveOfflineAndSet(offlineLogs);
      } else if (actionType === 'end_pregnancy' && currentLog) {
         const target = offlineLogs.find(l => l.id === currentLog.id);
         if (target) {
            target.endDate = now;
            target.timestamp = target.timestamp || now;
            saveOfflineAndSet(offlineLogs);
         }
      } else if (actionType === 'start_postpartum') {
         if (currentLog?.status === 'pregnancy') {
            const pr = offlineLogs.find(l => l.id === currentLog.id);
            if (pr) {
               pr.endDate = now;
               pr.timestamp = pr.timestamp || now;
            }
         }
         offlineLogs.unshift({
            id: `local_${Date.now()}`,
            startDate: now,
            endDate: null,
            status: 'postpartum',
            timestamp: now
         });
         saveOfflineAndSet(offlineLogs);
      } else if (actionType === 'end_postpartum' && currentLog) {
         const target = offlineLogs.find(l => l.id === currentLog.id);
         if (target) {
            target.endDate = now;
            target.timestamp = target.timestamp || now;
            saveOfflineAndSet(offlineLogs);
         }
      }
      return;
    }

    try {
      if (actionType === 'start_period') {
        const hasPastPeriods = logs.some(l => l.status === 'period');
        if (hasPastPeriods) {
           // Check for purity constraint (minimum 15 days of purity between periods)
           const pastEndedPeriods = logs.filter(l => l.status === 'period' && l.endDate).sort((a,b) => b.startDate - a.startDate);
           const lastPeriod = pastEndedPeriods[0];
           if (lastPeriod && lastPeriod.endDate) {
              const purityDays = Math.floor((now - new Date(lastPeriod.endDate).setHours(0,0,0,0)) / 86400000);
              if (purityDays < 15) {
                 await confirm(`لا يمكن تسجيل دورة جديدة الآن. الفترة الفاصلة (الطهر) بين دورتكِ السابقة وهذا اليوم هي ${purityDays} يوم فقط (الحد الأدنى للطهر بين الدورتين هو 15 يوماً).\n\nهذا النزيف قد يكون استحاضة أو نزيفاً عارضاً ولا يُقبل تسجيله كدورة جديدة حالياً لتفادي تسجيل دورتين بالخطأ.`, "حسناً", "إغلاق");
                 return;
              }
           }

           if (cycleDay !== null && cycleDay < 20) {
              const ok = await confirm(`لقد مر ${cycleDay - 1} يوم فقط على آخر دورة لكِ (يُفضل ألا تقل الدورة عن 20 يوماً). هل أنتِ متأكدة من تسجيل دورة جديدة الآن؟`, "نعم، متأكدة", "إلغاء");
              if (!ok) return;
           }
        }
        const pd = logs.find(l => l.status === 'period' && !l.endDate);
        if (pd) await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', pd.id), { endDate: now, timestamp: pd.timestamp || now });
        await addDoc(collection(db, 'users', user.uid, 'cycleLogs'), { startDate: now, endDate: null, status: 'period', timestamp: now });
      } else if (actionType === 'end_period' && currentLog) {
        const daysSinceStart = Math.floor((now - new Date(currentLog.startDate).setHours(0,0,0,0)) / 86400000) + 1;
        if (daysSinceStart < 3) {
           const isSpotting = await confirm(
              `لقد مر أقل من 3 أيام على الحيض (وهو الحد الأدنى لأيام الدورة الحقيقية).\n\nهل كانت هذه استحاضة (نزيف عارض) أم تبقيعاً خفيفاً؟\n\n- لإلغاء السجل واعتباره استحاضة/تبقيع: اضغطي نعم (استحاضة).\n- لاعتبارها دورة حقيقية منتهية: اضغطي لا (دورة حقيقية).`,
              "نعم (استحاضة)",
              "لا (دورة حقيقية)"
           );
           if (isSpotting) {
              await deleteDoc(doc(db, 'users', user.uid, 'cycleLogs', currentLog.id));
              return;
           }
        } else if (daysSinceStart > 15) {
           await confirm(
              `تنبيه: لقد تجاوزت مدة الدورة الحد الأقصى لأيام الحيض (15 يوماً) حيث بلغت ${daysSinceStart} يوماً.\n\nالدم الزائد عن 15 يوماً يعتبر استحاضة شرعاً وطبياً وننصحك بمراجعة الأحكام أو استشارة الطبيب.`,
              "مفهوم",
              "موافق"
           );
        }
        await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', currentLog.id), { endDate: now, timestamp: currentLog.timestamp || now });
      } else if (actionType === 'start_pregnancy') {
         await addDoc(collection(db, 'users', user.uid, 'cycleLogs'), { startDate: now, endDate: null, status: 'pregnancy', timestamp: now });
      } else if (actionType === 'end_pregnancy' && currentLog) {
         await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', currentLog.id), { endDate: now, timestamp: currentLog.timestamp || now });
      } else if (actionType === 'start_postpartum') {
         if (currentLog?.status === 'pregnancy') {
            await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', currentLog.id), { endDate: now, timestamp: currentLog.timestamp || now });
         }
         await addDoc(collection(db, 'users', user.uid, 'cycleLogs'), { startDate: now, endDate: null, status: 'postpartum', timestamp: now });
      } else if (actionType === 'end_postpartum' && currentLog) {
         await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', currentLog.id), { endDate: now, timestamp: currentLog.timestamp || now });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/cycleLogs`);
    }
  };

  // Interactive Calendar Logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

  // Ramadan Missed Days Calculation
  const getRamadanMissedDays = () => {
     let missed = 0;
     logs.forEach(log => {
        if (log.status === 'period' || log.status === 'postpartum') {
           const logStart = log.startDate;
           const logEnd = log.endDate || Date.now();
           const RAMADANS = [
              { start: new Date('2024-03-10').getTime(), end: new Date('2024-04-09').getTime() },
              { start: new Date('2025-02-28').getTime(), end: new Date('2025-03-30').getTime() },
              { start: new Date('2026-02-17').getTime(), end: new Date('2026-03-19').getTime() }
           ];
           RAMADANS.forEach(ramadan => {
              const overlapStart = Math.max(logStart, ramadan.start);
              const overlapEnd = Math.min(logEnd, ramadan.end);
              if (overlapStart < overlapEnd) {
                 missed += Math.ceil((overlapEnd - overlapStart) / 86400000);
              }
           });
        }
     });
     return missed;
  };

  if (loading) return null;

  return (
    <div className={cn("min-h-full pb-10 text-right bg-[#FAFAFA] dark:bg-[#121415] transition-colors duration-1000", isFastingMode ? "bg-black dark:bg-black text-amber-50" : "")}>
      
      {/* Header */}
      <div className="px-6 pt-10 pb-6 bg-white dark:bg-[#1A1A1A] border-b border-[#F0EBE1] dark:border-white/5 relative z-10 rounded-b-[40px] shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center mb-4 flex-row-reverse">
           <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-gray-500 active:scale-95 transition-all">
             <ChevronRight className="w-6 h-6" />
           </button>
           <div className="text-center">
              <h1 className="text-xl font-bold flex justify-center items-center gap-1 tracking-tight text-[#1A1A2E] dark:text-white">
                 Woman Companion
              </h1>
              <h2 className="text-lg font-black text-[#1A1A2E] dark:text-white mt-1">رفيقة المرأة 🌸</h2>
           </div>
           <div className="flex gap-2 relative">
             <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="w-10 h-10 flex items-center justify-center text-gray-500 active:scale-95 transition-all">
               {isPrivacyMode ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
             </button>
           </div>
        </div>

        {/* Global Settings */}
        {/* Global Settings */}
        <div className="flex justify-between items-center gap-2 mb-6 flex-row-reverse px-2">
            <button 
                onClick={toggleWomensHealth} 
                className={cn(
                    "flex-1 flex gap-2 items-center justify-center text-[10px] font-bold p-2 rounded-xl transition-all shadow-sm border",
                    showWomensHealth 
                        ? "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-900/50" 
                        : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10"
                )}
            >
                {showWomensHealth ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showWomensHealth ? "إخفاء من الفوتر" : "إظهار في الفوتر"}
            </button>
            <button 
                onClick={handleDeleteData}
                className="flex-1 flex gap-2 items-center justify-center text-[10px] font-bold p-2 rounded-xl bg-red-50 text-red-600 border border-red-200 shadow-sm transition-all hover:bg-red-100 active:scale-95 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50"
            >
                <Trash2 className="w-3.5 h-3.5" />
                مسح البيانات
            </button>
        </div>

        {/* Top Navigation Tabs */}
        <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-1 rounded-[18px] mx-auto w-full mb-6 border border-gray-100 dark:border-white/10" dir="rtl">
            <button onClick={() => setActiveTab('home')} className={cn("flex-1 py-2 px-1 rounded-[14px] flex flex-col items-center gap-1 transition-all", activeTab === 'home' ? "bg-white dark:bg-[#2A2A2A] shadow-sm text-[#C2185B]" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}>
               <Home className="w-4 h-4" />
               <span className="text-[9px] font-bold">الرئيسية</span>
            </button>
            <button onClick={() => setActiveTab('explore')} className={cn("flex-1 py-2 px-1 rounded-[14px] flex flex-col items-center gap-1 transition-all", activeTab === 'explore' ? "bg-white dark:bg-[#2A2A2A] shadow-sm text-[#C2185B]" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}>
               <Compass className="w-4 h-4" />
               <span className="text-[9px] font-bold">الاستكشاف</span>
            </button>
            <button onClick={() => setActiveTab('community')} className={cn("flex-1 py-2 px-1 rounded-[14px] flex flex-col items-center gap-1 transition-all", activeTab === 'community' ? "bg-white dark:bg-[#2A2A2A] shadow-sm text-[#C2185B]" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}>
               <Users className="w-4 h-4" />
               <span className="text-[9px] font-bold">المجتمع</span>
            </button>
            <button onClick={() => setActiveTab('progress')} className={cn("flex-1 py-2 px-1 rounded-[14px] flex flex-col items-center gap-1 transition-all", activeTab === 'progress' ? "bg-white dark:bg-[#2A2A2A] shadow-sm text-[#C2185B]" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}>
               <TrendingUp className="w-4 h-4" />
               <span className="text-[9px] font-bold">التقدم</span>
            </button>
        </div>

      <div className={cn("transition-all duration-500", isPrivacyMode && "blur-lg select-none pointer-events-none")}>
        {activeTab === 'home' && (
           <>
              {/* --- +++ كارت تفاعلي مضاف بناءً على طلبك ليسألها يومياً بنهاية متوسط أيام الدورة إذا انتهت +++ --- */}
              {currentLog?.status === 'period' && !currentLog.endDate && cycleDay && cycleDay >= periodDurationStats && !periodAskDismissed && (
                <motion.div
                   initial={{ opacity: 0, y: -15 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="m-6 p-4 rounded-[24px] bg-gradient-to-r from-rose-50 to-[#FCF4F6] dark:from-rose-950/25 dark:to-[#1A1A1A] border border-rose-100/80 dark:border-rose-900/40 text-right shadow-xs font-sans relative z-10"
                >
                   <div className="flex gap-2.5 items-start flex-row-reverse mb-2">
                      <span className="text-xl shrink-0">🌸</span>
                      <div className="flex-1">
                         <h4 className="font-extrabold text-[#C2185B] dark:text-rose-400 text-xs">متتبعكِ الذكي: هل انتهى الحيض وتطهرتِ اليوم؟ ✨🌸</h4>
                         <p className="text-[11px] leading-relaxed text-[#5C2E40] dark:text-rose-200 mt-1 font-semibold" dir="rtl">
                            عزيزتي، متوسط فترة دورتكِ السابقة هو <strong>{periodDurationStats} أيام</strong>، واليوم هو اليوم الـ <strong>{cycleDay}</strong> لدورتكِ الحالية. هل انقطع الدم وتطهرتِ اليوم؟
                         </p>
                      </div>
                   </div>

                   <p className="text-[9.5px] text-gray-500 dark:text-gray-400 mb-3.5 leading-relaxed font-semibold">
                      تأكيد انتهاء الدورة يفيد في دقة رصد ورسم أيام الطهر والمبيض الهامة لكِ بذكاء هرموني، وفي حال عدم الانتهاء فسنذكركِ غداً مجدداً.
                   </p>

                   <div className="flex gap-2.5 justify-end" dir="rtl">
                      <button
                         onClick={async () => {
                            await handleAction('end_period');
                            setPeriodAskDismissed(true);
                         }}
                         className="px-3.5 py-2 rounded-xl bg-[#C2185B] hover:bg-[#A2124D] text-white font-black text-[10.5px] active:scale-95 transition-all shadow-xs"
                      >
                         نعم، تطهرت وانتهت اليوم 🧼✨
                      </button>
                      <button
                         onClick={() => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            localStorage.setItem('dismiss_period_ended_ask_' + todayStr, 'true');
                            setPeriodAskDismissed(true);
                         }}
                         className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold text-[10.5px] active:scale-95 transition-all border border-gray-200/50 dark:border-white/5"
                      >
                         لا، ليس بعد (سؤال غداً) ⏳
                      </button>
                   </div>
                </motion.div>
              )}

              <div className="text-center mb-6">
           <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
             دورتك الحالية: {phaseData.name} <span className="text-gray-400 font-normal inline-block mr-1 text-[10px] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">(الاستعداد)</span>
           </p>
           {/* Mini timeline indicator */}
           <div className="w-full max-w-[200px] mx-auto mt-3 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex flex-row-reverse">
              <div className="bg-[#C2185B] h-full" style={{width: '20%'}}></div>
              <div className="bg-[#7B1FA2] h-full" style={{width: '25%'}}></div>
              <div className="bg-[#F57F17] h-full" style={{width: '10%'}}></div>
              <div className="bg-[#00796B] h-full" style={{width: '45%'}}></div>
           </div>
           <div className="flex justify-between text-[8px] font-bold text-gray-400 w-full max-w-[200px] mx-auto mt-1 flex-row-reverse">
              <span>حيض</span>
              <span>جريبي</span>
              <span>تبويض</span>
              <span>لوتيني</span>
           </div>
        </div>

        {/* Phase Progress UI */}
        <div className="flex flex-col items-center justify-center mt-4">
           <div className="relative w-[220px] h-[220px] flex items-center justify-center">
              {/* SVG Ring Background */}
              <svg className="w-full h-full transform rotate-180 absolute inset-0">
                 <circle cx="110" cy="110" r="90" stroke="currentColor" strokeWidth="18" fill="transparent" className="text-gray-100 dark:text-white/5" />
                 {phase === 'pregnancy' ? (
                    <circle cx="110" cy="110" r="90" stroke="#4F46E5" strokeWidth="18" fill="transparent"
                      strokeDasharray={2 * Math.PI * 90}
                      strokeDashoffset={2 * Math.PI * 90 - (Math.min(280, gestAge.diffDays) / 280 * (2 * Math.PI * 90))}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                 ) : phase === 'postpartum' ? (
                    <circle cx="110" cy="110" r="90" stroke="#0284C7" strokeWidth="18" fill="transparent"
                      strokeDasharray={2 * Math.PI * 90}
                      strokeDashoffset={2 * Math.PI * 90 - (Math.min(40, postpartumAge.days) / 40 * (2 * Math.PI * 90))}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                 ) : (
                    cycleDay !== null && (
                       <circle cx="110" cy="110" r="90" stroke={phaseData.color} strokeWidth="18" fill="transparent"
                         strokeDasharray={2 * Math.PI * 90}
                         strokeDashoffset={2 * Math.PI * 90 - (((isLate ? 28 : (cycleDay || 1)) / 28) * (2 * Math.PI * 90))}
                         strokeLinecap="round"
                         className="transition-all duration-1000 ease-out"
                       />
                    )
                 )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                 {phase === 'pregnancy' ? (
                     <>
                        <div className="bg-indigo-50 dark:bg-indigo-505/10 p-2.5 rounded-full mb-1">
                           <Baby className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="text-3xl font-black text-[#1A1A2E] dark:text-white">الأسبوع {gestAge.weeks}</div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">اليوم {gestAge.days} في الحمل</div>
                        <div className="text-[8px] font-extrabold text-[#4F46E5] dark:text-indigo-300 mt-1">الثلث {gestAge.trimester === 1 ? 'الأول' : gestAge.trimester === 2 ? 'الثاني' : 'الثالث'} 🤰</div>
                     </>
                 ) : phase === 'postpartum' ? (
                     <>
                        <div className="bg-sky-50 dark:bg-sky-500/10 p-2.5 rounded-full mb-1">
                           <Baby className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                        </div>
                        <div className="text-3xl font-black text-[#1A1A2E] dark:text-white">اليوم {postpartumAge.days}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">في النفاس 👶</div>
                        <div className="text-[8px] font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">مرحلة الشفاء والوصل</div>
                     </>
                 ) : (
                     <>
                        {isLate ? (
                            <>
                               <div className="text-5xl font-black tracking-tight text-amber-650 dark:text-amber-400">{cycleDay !== null ? Math.max(1, cycleDay - cycleStats.averageCycle) : '—'}</div>
                               <div className="text-xs font-black text-amber-500 mt-1 leading-snug">تأخر الدورة ⚠️</div>
                            </>
                        ) : (
                            <>
                               <Sparkles className="w-6 h-6 text-gray-300 dark:text-gray-600 mb-2" />
                               <div className="text-4xl font-black tracking-tighter text-[#1A1A2E] dark:text-white">{cycleDay !== null ? cycleDay : '—'}</div>
                               <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">اليوم الحالي</div>
                            </>
                        )}
                     </>
                 )}
                  {currentLog && (
                     <button
                        onClick={async () => {
                           setEditingLogId(currentLog.id);
                           setEditStartDate(new Date(currentLog.startDate).toISOString().split('T')[0]);
                           setEditEndDate(currentLog.endDate ? new Date(currentLog.endDate).toISOString().split('T')[0] : '');
                           setEditStatus(currentLog.status);
                        }}
                        className="mt-3 px-3 py-1 text-[9px] font-extrabold text-[#C2185B] dark:text-pink-400 bg-pink-50 dark:bg-pink-900/40 rounded-full hover:bg-pink-100 dark:hover:bg-pink-100/10 transition-all border border-pink-200/30 active:scale-95 animate-pulse animate-duration-500"
                        title="تعديل تاريخ وتفاصيل السجل الحالي"
                     >
                        ✏️ تعديل هذا السجل
                     </button>
                  )}
              </div>
           </div>
        </div>

        {/* Dynamic Maternal Support Cards based on active phase */}
        {phase === 'pregnancy' && (
            <div className="px-6 mt-4">
               <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-5 shadow-sm text-right">
                  <div className="flex justify-between items-center mb-4 flex-row-reverse pb-3 border-b border-gray-50 dark:border-white/5">
                     <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full flex items-center gap-1">
                        <Baby className="w-3 h-3" /> رحلة الحمل المباركة
                     </span>
                     <span className="text-[10px] font-bold text-gray-400">باقي {gestAge.remainingDays} يوم على الولادة المتوقعة 📅</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 mb-4 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl text-[10px] sm:text-xs font-bold" dir="rtl">
                     <button onClick={() => setPregSubTab('baby')} className={cn("py-2 rounded-xl text-center transition-all", pregSubTab === 'baby' ? "bg-white dark:bg-[#2A2A2A] text-indigo-600 shadow-sm" : "text-gray-500")}>
                        🍼 نمو طفلك
                     </button>
                     <button onClick={() => setPregSubTab('mom')} className={cn("py-2 rounded-xl text-center transition-all", pregSubTab === 'mom' ? "bg-white dark:bg-[#2A2A2A] text-indigo-600 shadow-sm" : "text-gray-500")}>
                        🌸 صحة الأم
                     </button>
                     <button onClick={() => setPregSubTab('exercise')} className={cn("py-2 rounded-xl text-center transition-all", pregSubTab === 'exercise' ? "bg-white dark:bg-[#2A2A2A] text-indigo-600 shadow-sm" : "text-gray-500")}>
                        🧘 تمارين آمنة
                     </button>
                     <button onClick={() => setPregSubTab('shopping')} className={cn("py-2 rounded-xl text-center transition-all", pregSubTab === 'shopping' ? "bg-white dark:bg-[#2A2A2A] text-indigo-600 shadow-sm" : "text-gray-500")}>
                        🛍️ المشتريات
                     </button>
                  </div>

                  <AnimatePresence mode="wait">
                     {pregSubTab === 'baby' && (
                        <motion.div key="baby" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3">
                           <div className="flex gap-4 items-center bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 flex-row-reverse text-right">
                              <span className="text-4xl">🥑</span>
                              <div className="flex-1">
                                 <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-400">حجم طفلك الآن يماثل:</h4>
                                 <p className="font-black text-xs text-gray-800 dark:text-gray-200 mt-1">{getPregnancyWeekData(gestAge.weeks)?.fruit}</p>
                                 <p className="text-[10px] text-gray-400 mt-0.5">طوله التقريبي: {getPregnancyWeekData(gestAge.weeks)?.size}</p>
                              </div>
                           </div>
                           <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl">
                              <h5 className="font-bold text-xs text-indigo-800 dark:text-indigo-300 mb-1 flex items-center justify-end gap-1">ماذا يتطور هذا الأسبوع؟ <Sparkles className="w-3.5 h-3.5" /></h5>
                              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-semibold text-right">{getPregnancyWeekData(gestAge.weeks)?.dev}</p>
                           </div>
                        </motion.div>
                     )}

                     {pregSubTab === 'mom' && (
                        <motion.div key="mom" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3 font-semibold text-xs text-gray-650 text-right" dir="rtl">
                           <div className="bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-2xl border border-amber-100/50 dark:border-amber-900/20 text-right">
                              <h5 className="font-bold text-[#F57F17] mb-1.5 flex items-center justify-end gap-1">💡 الفحوصات واللقاحات المطلوبة</h5>
                              <ul className="list-disc list-inside space-y-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                                 <li>متابعة ضغط الدم ومستويات السكر بانتظام.</li>
                                 {gestAge.weeks >= 28 && <li className="font-bold text-indigo-650 dark:text-indigo-400">💉 تذكير: وقت حقنة الأنتي D وحقنة الكزاز الموصى بها.</li>}
                                 <li>فحص نسبة الهيموجلوبين بالدم ومستوى الحديد والترطيب المستمر.</li>
                              </ul>
                           </div>
                           <div className="bg-sky-50/40 dark:bg-sky-950/10 p-3 rounded-2xl border border-sky-100/50 dark:border-sky-900/20 text-right">
                              <h5 className="font-bold text-sky-700 dark:text-sky-400 mb-1.5">⚖️ زيادة الوزن الصحي</h5>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                                 الزيادة المتوقعة في الثلث {gestAge.trimester === 1 ? 'الأول هي 1-2 كجم إجمالاً' : gestAge.trimester === 2 ? 'الثاني هي 0.5 كجم أسبوعياً' : 'الثالث هي 0.5 كجم أسبوعياً للتأكد من نمو الجنين بأمان'}.
                              </p>
                           </div>
                        </motion.div>
                     )}

                     {pregSubTab === 'exercise' && (
                        <motion.div key="exercise" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="p-3 bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/10 rounded-2xl text-right">
                           <h5 className="font-bold text-indigo-900 dark:text-indigo-400 mb-1 flex items-center justify-end gap-1">🧘 يوجا وتمارين الثلث {gestAge.trimester === 1 ? 'الأول' : gestAge.trimester === 2 ? 'الثاني' : 'الثالث'}</h5>
                           <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                              تم اختيار هذه التمارين بعناية لتكون آمنة تماماً ولا تشكل أي ضغط على الحوض أو الجنين.
                           </p>
                           <div className="p-2.5 bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-100 dark:border-white/5 text-[11px] font-bold text-[#4F46E5] flex items-center justify-end gap-1.5">
                              <span>{getPregnancyWeekData(gestAge.weeks)?.exercises}</span>
                              <span>✨</span>
                           </div>
                        </motion.div>
                     )}

                     {pregSubTab === 'shopping' && (
                        <motion.div key="shopping" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-2">
                           <h5 className="font-bold text-xs text-gray-700 dark:text-gray-300 mb-1 bg-gray-50 dark:bg-white/5 p-2 rounded-xl text-center">أهم المشتريات المقترحة لهذه المرحلة</h5>
                           <div className="p-3 bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-950/10 rounded-2xl flex items-center gap-2.5 flex-row-reverse text-right">
                              <span className="text-xl">🛍️</span>
                              <div className="flex-1">
                                 <p className="text-xs font-bold text-rose-900 dark:text-rose-400">مشتريات هامة:</p>
                                 <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{getPregnancyWeekData(gestAge.weeks)?.shopping}</p>
                              </div>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </div>
         )}

         {phase === 'postpartum' && (
            <div className="px-6 mt-4">
               <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-5 shadow-sm text-right">
                  <div className="flex justify-between items-center mb-4 flex-row-reverse pb-3 border-b border-gray-50 dark:border-white/5">
                     <span className="text-xs font-extrabold text-sky-600 bg-sky-50 dark:bg-sky-900/20 px-3 py-1 rounded-full flex items-center gap-1">
                        👶 مرحلة النفاس والرضاعة
                     </span>
                     <span className="text-[10px] font-bold text-gray-400">اليوم الـ {postpartumAge.days} في النفاس 🌸</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mb-4 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl text-[10px] sm:text-xs font-bold" dir="rtl">
                     <button onClick={() => setPostSubTab('kegels')} className={cn("py-2 rounded-xl text-center transition-all", postSubTab === 'kegels' ? "bg-white dark:bg-[#2A2A2A] text-sky-600 shadow-sm" : "text-gray-500")}>
                        🧘 تمارين الحوض
                     </button>
                     <button onClick={() => setPostSubTab('bleeding')} className={cn("py-2 rounded-xl text-center transition-all", postSubTab === 'bleeding' ? "bg-white dark:bg-[#2A2A2A] text-sky-600 shadow-sm" : "text-gray-500")}>
                        🩸 النزيف والطهر
                     </button>
                     <button onClick={() => setPostSubTab('breastfeed')} className={cn("py-2 rounded-xl text-center transition-all", postSubTab === 'breastfeed' ? "bg-white dark:bg-[#2A2A2A] text-sky-600 shadow-sm" : "text-gray-500")}>
                        🍼 الرضاعة
                     </button>
                  </div>

                  <AnimatePresence mode="wait">
                     {postSubTab === 'kegels' && (
                        <motion.div key="kegels" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="p-3 bg-sky-50/30 dark:bg-sky-950/10 border border-sky-100/30 dark:border-sky-900/10 rounded-2xl text-right">
                           <h5 className="font-bold text-sky-900 dark:text-sky-300 mb-1 flex items-center justify-end gap-1">🧘 تمارين كيجل وقشرة الحوض</h5>
                           <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                              تم اختيار هذه الممارسات لمساعدتك على استعادة قوتك الطبيعية بالتدريج وبأمان تام.
                           </p>
                           <div className="p-2.5 bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-100 dark:border-white/5 text-[11px] font-bold text-sky-600 flex items-center justify-end gap-1.5">
                              <span>
                                 {postpartumAge.days <= 7 
                                    ? "الراحة الكاملة والاسترخاء، تجنبي المجهود وعليكِ بالتنفس العميق واللطيف لشفاء الجروح."
                                    : postpartumAge.days <= 14 
                                       ? "ابدئي بتمارين كيجل خفيفة جداً (انقباض لطيف لعضلات قاع الحوض لمدة 3 ثواني ثم راحة 3 ثواني، كرري 5 مرات)."
                                       : "المداومة اليومية على تمارين كيجل (انقباض 5 ثواني ثم بسط 5 ثواني، كرري 10 مرات، 3 جلسات باليوم) لتقوية المنطقة."}
                              </span>
                              <span>✨</span>
                           </div>
                        </motion.div>
                     )}

                     {postSubTab === 'bleeding' && (
                        <motion.div key="bleeding" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3 font-semibold text-xs text-gray-600 dark:text-gray-300 text-right">
                           <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 text-right">
                              <h5 className="font-bold text-amber-700 dark:text-amber-400 mb-1 flex items-center justify-end gap-1">🩸 طبيعة النزيف المتوقعة</h5>
                              <p className="text-[11px] leading-relaxed">
                                 {postpartumAge.days <= 3 
                                    ? "دم أحمر قاني غزير مع بعض التقلصات الطفيفة (مرحلة طبيعية تماماً لتنظيف الرحم)."
                                    : postpartumAge.days <= 10
                                       ? "تتحول الإفرازات بالتدريج إلى اللون الوردي أو البني الفاتح، والنزيف يصبح أقل كثافة."
                                       : "إفرازات بيضاء أو صفراء خفيفة تشير لشفاء الرحم واقتراب مرحلة الطهر الشرعي والبدني."}
                              </p>
                           </div>
                           <div className="p-3 bg-emerald-50/40 dark:bg-emerald-900/20 border border-emerald-100/50 dark:border-emerald-900/20 text-right">
                              <h5 className="font-bold text-emerald-800 dark:text-emerald-400 mb-1">🌙 الجانب الشرعي للمسلمة</h5>
                              <p className="text-[11px] leading-relaxed">
                                 النفاس يعفي من الصلاة والصيام. بمجرد جفاف الدم ورؤية علامة الطهر (أو اكتمال 40 يوماً عند أغلب الفقهاء)، يجب الاغتسال واستئناف العبادات.
                              </p>
                           </div>
                        </motion.div>
                     )}

                     {postSubTab === 'breastfeed' && (
                        <motion.div key="breastfeed" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="space-y-3">
                           {/* Quick Feeding Logger Form */}
                           <div className="p-3 bg-sky-50/20 dark:bg-sky-950/10 border border-sky-100/30 dark:border-sky-900/20 rounded-2xl">
                              <h5 className="font-bold text-xs text-sky-800 dark:text-sky-300 mb-2 text-center">متابعة الرضاعة الطبيعية 🍼</h5>
                              
                              <div className="flex gap-2 justify-center mb-3">
                                 <button onClick={() => setFeedingSide('both')} className={cn("text-[10px] px-2.5 py-1.5 rounded-lg font-bold border", feedingSide === 'both' ? "bg-sky-500 text-white border-transparent" : "bg-white dark:bg-[#1a1a1a] text-gray-500 border-gray-100 dark:border-white/5")}>كلا الجانبين</button>
                                 <button onClick={() => setFeedingSide('right')} className={cn("text-[10px] px-2.5 py-1.5 rounded-lg font-bold border", feedingSide === 'right' ? "bg-sky-500 text-white border-transparent" : "bg-white dark:bg-[#1a1a1a] text-gray-500 border-gray-100 dark:border-white/5")}>الأيمن</button>
                                 <button onClick={() => setFeedingSide('left')} className={cn("text-[10px] px-2.5 py-1.5 rounded-lg font-bold border", feedingSide === 'left' ? "bg-sky-500 text-white border-transparent" : "bg-white dark:bg-[#1a1a1a] text-gray-500 border-gray-100 dark:border-white/5")}>الأيسر</button>
                              </div>

                              <div className="flex justify-between items-center gap-2 mb-3 flex-row-reverse text-right">
                                 <span className="text-[10px] font-bold text-gray-500">مدة الرضاعة (دقائق):</span>
                                 <div className="flex items-center gap-1">
                                    <button onClick={() => setFeedingDuration(p => Math.max(1, p - 5))} className="w-6 h-6 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-gray-500">-</button>
                                    <span className="text-xs font-bold w-6 text-center text-gray-800 dark:text-white">{feedingDuration}</span>
                                    <button onClick={() => setFeedingDuration(p => Math.min(60, p + 5))} className="w-6 h-6 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-gray-500">+</button>
                                 </div>
                              </div>

                              <button 
                                 onClick={() => {
                                    const newLog = {
                                       id: `feed_${Date.now()}`,
                                       side: feedingSide,
                                       duration: feedingDuration,
                                       timestamp: Date.now()
                                    };
                                    const updated = [newLog, ...feedingLogs];
                                    setFeedingLogs(updated);
                                    localStorage.setItem('local_breastfeeding_logs', JSON.stringify(updated));
                                 }}
                                 className="w-full py-2 bg-sky-500 text-white font-bold rounded-xl text-xs hover:bg-sky-600 transition-colors"
                              >
                                 حفظ السجل
                              </button>
                           </div>

                           {/* Feeding History list */}
                           {feedingLogs.length > 0 && (
                              <div className="space-y-1.5 text-right">
                                 <h6 className="text-[10px] font-bold text-gray-400 text-right">آخر الرضعات المسجلة:</h6>
                                 <div className="max-h-[100px] overflow-y-auto space-y-1 pr-1">
                                    {feedingLogs.slice(0, 3).map(log => (
                                       <div key={log.id} className="flex justify-between items-center bg-gray-50 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 text-[10px] sm:text-xs">
                                          <button 
                                             onClick={() => {
                                                const updated = feedingLogs.filter(f => f.id !== log.id);
                                                setFeedingLogs(updated);
                                                localStorage.setItem('local_breastfeeding_logs', JSON.stringify(updated));
                                             }}
                                             className="text-rose-500 hover:text-rose-650 font-bold p-0.5"
                                          >
                                             حذف
                                          </button>
                                          <span className="text-gray-400 font-bold">{new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                          <span className="font-bold text-gray-700 dark:text-gray-300">الجانب: {log.side === 'left' ? 'الأيسر' : log.side === 'right' ? 'الأيمن' : 'كلا الجانبين'} ({log.duration} د)</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </div>
         )}

        {/* Offline Smart Analytics Widget */}
        {logs.filter(l => l.status === 'period').length >= 2 && (
            <div className="px-6 mt-6">
                <div className="bg-[#1A1A2E] dark:bg-white/10 p-5 rounded-[24px] text-right flex justify-between items-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-gray-900 dark:border-white/10 relative overflow-hidden">
                   <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-purple-500/20 dark:bg-purple-500/30 rounded-full blur-2xl"></div>
                   <div className="flex gap-4 w-full relative z-10" dir="rtl">
                       <div className="flex-1">
                          <p className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1"><Activity className="w-3 h-3 text-cyan-400"/> متوسط طول دورتك</p>
                          <div className="flex items-end gap-1">
                             <div className="text-2xl font-black text-white">{cycleStats.averageCycle}</div>
                             <span className="text-xs text-gray-400 mb-1 font-bold">يوم</span>
                          </div>
                       </div>
                       <div className="w-[1px] bg-white/10 my-1"></div>
                       <div className="flex-1">
                          <p className="text-[10px] text-gray-400 font-bold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-purple-400"/> التبويض المتوقع</p>
                          <div className="flex items-end gap-1">
                             <div className="text-xl font-bold text-white mt-0.5" dir="ltr">{Math.max(14, cycleStats.averageCycle - 14)} <span className="text-[10px] font-normal text-gray-400">اليوم</span></div>
                          </div>
                          <p className="text-[8px] text-purple-400 mt-1">تحليل محلي ذكي (أوفلاين)</p>
                       </div>
                   </div>
                </div>
            </div>
        )}

        {/* Dynamic Tips & Interventions */}
        <div className="px-6 mt-8">
           <div className={cn("p-4 rounded-[24px] shadow-sm border text-right transition-colors duration-500", phaseData.bg, phaseData.borderColor)}>
              <h3 className={cn("font-bold text-sm mb-2 flex items-center justify-end gap-1.5", phaseData.textColor)}>
                 صديقتك الذكية <Sparkles className="w-5 h-5 ml-1" />
              </h3>
               <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium space-y-3 mt-3">
                  {smartAdviceList.map((adv, idx) => (
                     <div key={idx} className="flex gap-2 p-3 bg-white/50 dark:bg-white/5 rounded-[16px] backdrop-blur-sm border border-white/20 dark:border-white/10 shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{animationDelay: `${idx * 150}ms`}} dir="rtl">
                        <div className="shrink-0 mt-0.5">
                           <Info className={cn("w-4 h-4", phaseData.twColor)} />
                        </div>
                        <p>{adv}</p>
                     </div>
                  ))}
               </div>

               {hasGemini && !isChatOpen && (
                 <button onClick={() => setIsChatOpen(true)} className="mt-4 w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl py-3 px-4 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-white/10 shadow-sm">
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                    <span>هل تبحثين عن مزيد من الدعم؟ تحدثي معي</span>
                 </button>
               )}

               {hasGemini && isChatOpen && (
                 <div className="mt-4 bg-white/80 dark:bg-[#1A1A1A]/80 backdrop-blur-md border border-gray-100 dark:border-white/10 rounded-3xl p-4 shadow-sm h-[300px] flex flex-col relative overflow-hidden" dir="rtl">
                    <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100 dark:border-white/5">
                        <span className="font-bold text-xs text-gray-800 dark:text-white flex items-center gap-1"><Sparkles className="w-4 h-4 text-purple-500"/> مساحة دعم ومساندة</span>
                        <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-gray-600"><PlusCircle className="w-4 h-4 rotate-45 transform" /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                       {chatMessages.length === 0 && (
                          <div className="text-center text-gray-400 text-[10px] my-6 font-medium">أهلاً بكِ، أنا هنا للاستماع إليكِ وتقديم الدعم بخصوص دورتكِ وحالتكِ. كيف يمكني مساعدتك اليوم؟</div>
                       )}
                       {chatMessages.map((msg, i) => (
                           <div key={i} className={cn("p-3 rounded-2xl text-[11px] leading-relaxed font-medium break-words max-w-[85%]", msg.isUser ? "bg-purple-50 dark:bg-purple-500/20 text-purple-900 border border-purple-100 dark:border-purple-500/20 mr-auto rounded-tl-sm shrink-0" : "bg-white dark:bg-[#2A2A2A] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/10 ml-auto rounded-tr-sm")}>
                               {msg.text}
                           </div>
                       ))}
                       {isChatLoading && (
                           <div className="bg-white dark:bg-[#2A2A2A] text-gray-400 border border-gray-100 dark:border-white/10 ml-auto p-3 rounded-2xl rounded-tr-sm text-[11px] max-w-[85%]">
                               <Sparkles className="w-4 h-4 animate-pulse inline ml-1"/> تكتب...
                           </div>
                       )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 relative z-10 flex gap-2">
                       <input 
                         type="text" 
                         className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 text-[11px] text-gray-800 dark:text-white focus:outline-none focus:border-purple-200 font-medium" 
                         placeholder="اكتبي رسالتك (حالتك في سرية وتشفير كامل)..." 
                         value={chatInput} 
                         onChange={e => setChatInput(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                       />
                       <button onClick={handleSendMessage} disabled={isChatLoading || !chatInput.trim()} className="w-10 h-10 shrink-0 bg-purple-500 text-white rounded-xl flex items-center justify-center hover:bg-purple-600 disabled:opacity-50 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
               )}
           </div>
        </div>
        
        {/* Fasting Info - If Ramadan mode enabled globally */}
        {isFastingMode && typeof getRamadanMissedDays === 'function' && (
           <div className="px-6 mt-6">
               <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-[24px] p-5 shadow-sm text-right flex flex-row-reverse gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-[#1A1A1A] rounded-full flex items-center justify-center shrink-0 border border-amber-50 dark:border-white/5 shadow-sm text-amber-500">
                     <Moon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                     <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300 mb-1">أيام الإفطار في رمضان</h4>
                     <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">إجمالي الأيام المتبقية عليكِ قضاؤها: <span className="font-bold text-lg">{getRamadanMissedDays()}</span> أيام</p>
                  </div>
               </div>
           </div>
        )}

        {/* Quick Log Buttons Container */}
        <div className="px-6 mt-8 mb-6">
           <h3 className="font-bold text-[#1A1A2E] dark:text-white text-right mb-4">تسجيل سريع</h3>
           
           <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-4 shadow-sm mb-4">
              <p className="text-[10px] font-bold text-gray-500 text-right mb-3">كيف تشعرين اليوم؟</p>
              <div className="flex flex-wrap justify-end gap-3" dir="rtl">
                 <button onClick={() => toggleMood('مغص')} className={cn("flex flex-col items-center gap-1.5 transition-all w-12", !activeMoods.includes('مغص') && "opacity-40 grayscale")}>
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center"><Activity className="w-4 h-4 text-rose-500" /></div>
                    <span className="text-[9px] font-bold text-gray-800 dark:text-white">مغص</span>
                 </button>
                 <button onClick={() => toggleMood('صداع')} className={cn("flex flex-col items-center gap-1.5 transition-all w-12", !activeMoods.includes('صداع') && "opacity-40 grayscale")}>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Brain className="w-4 h-4 text-purple-500" /></div>
                    <span className="text-[9px] font-bold text-gray-800 dark:text-white">صداع</span>
                 </button>
                 <button onClick={() => toggleMood('إرهاق')} className={cn("flex flex-col items-center gap-1.5 transition-all w-12", !activeMoods.includes('إرهاق') && "opacity-40 grayscale")}>
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><Moon className="w-4 h-4 text-amber-500" /></div>
                    <span className="text-[9px] font-bold text-gray-800 dark:text-white">إرهاق</span>
                 </button>
                 <button onClick={() => toggleMood('نشيطة')} className={cn("flex flex-col items-center gap-1.5 transition-all w-12", !activeMoods.includes('نشيطة') && "opacity-40 grayscale")}>
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><Sparkles className="w-4 h-4 text-emerald-500" /></div>
                    <span className="text-[9px] font-bold text-gray-800 dark:text-white">نشيطة</span>
                 </button>
                 <button onClick={() => toggleMood('متقلبة')} className={cn("flex flex-col items-center gap-1.5 transition-all w-12", !activeMoods.includes('متقلبة') && "opacity-40 grayscale")}>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"><Activity className="w-4 h-4 text-indigo-500" /></div>
                    <span className="text-[9px] font-bold text-gray-800 dark:text-white">متقلبة</span>
                 </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                 <p className="text-[10px] font-bold text-gray-500 text-right mb-3">شرب الماء (الأكواب اليوم)</p>
                 <div className="flex justify-end items-center gap-2" dir="rtl">
                    <button 
                       onClick={async () => {
                          // +++ أضيف بناءً على طلبك لتسجيل المياه في المتتبع المركزي عند الضغط +++
                          if (user) {
                             if (user.uid === 'local_guest_user') {
                                const savedWater = localStorage.getItem('local_water_logs') || '[]';
                                try {
                                   const list = JSON.parse(savedWater);
                                   list.unshift({
                                      id: `local_${Date.now()}`,
                                      amount: 250,
                                      effectiveAmount: 250,
                                      context: 'صفحة المرأة',
                                      beverageType: 'ماء عادي',
                                      timestamp: Date.now()
                                   });
                                   localStorage.setItem('local_water_logs', JSON.stringify(list));
                                   window.dispatchEvent(new Event('localWaterUpdated'));
                                 } catch (e){}
                             } else {
                                try {
                                   await addDoc(collection(db, 'users', user.uid, 'waterLogs'), {
                                      amount: 250,
                                      effectiveAmount: 250,
                                      context: 'صفحة المرأة',
                                      beverageType: 'ماء عادي',
                                      timestamp: Date.now()
                                   });
                                } catch (e) {
                                   console.error("Failed to sync water from Womens page to central Water tracking:", e);
                                }
                             }
                          }
                       }} 
                       className="bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 text-sky-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                       <PlusCircle className="w-4 h-4" /> إضافة ماء
                    </button>
                    <div className="flex gap-1">
                       {loggedDrinks.length > 0 ? (
                           [...Array(Math.min(10, loggedDrinks.length))].map((_, i) => (
                              <Droplets key={i} className="w-5 h-5 text-sky-500 drop-shadow-sm" />
                           ))
                       ) : (
                           <span className="text-[10px] text-gray-400">لم تقومي بتسجيل أي ماء اليوم</span>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Pamper Yourself Card */}
        <div className="px-6">
           <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-[24px] p-5 shadow-sm text-right flex flex-col gap-4">
              <h4 className="font-bold text-sm text-[#C2185B] dark:text-rose-400 mb-1 flex items-center justify-end gap-2">
                 دللي نفسك <Coffee className="w-4 h-4" />
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mb-1 leading-relaxed">
                 استرخي بمشروب دافئ ومريح. سيتم تسجيله تلقائياً في سجلات المياه!
              </p>
              <div className="grid grid-cols-3 gap-2" dir="rtl">
                 {[
                    { id: 'mint', name: 'نعناع', icon: '🌿', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100/50 dark:bg-emerald-500/20' },
                    { id: 'ginger', name: 'زنجبيل', icon: '🫚', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/50 dark:bg-amber-500/20' },
                    { id: 'chamomile', name: 'بابونج', icon: '🌼', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100/50 dark:bg-yellow-500/20' }
                 ].map(drink => {
                     const isLogged = loggedDrinks.includes(drink.id);
                     return (
                    <button 
                       key={drink.id} 
                       disabled={isLogged}
                       onClick={async () => {
                          if (isLogged) return;
                          setLoggedDrinks(prev => [...prev, drink.id]);
                          // +++ أضيف بناءً على طلبك لتسجيل المياه في المتتبع المركزي عند الضغط +++
                          if (user) {
                             if (user.uid === 'local_guest_user') {
                                const savedWater = localStorage.getItem('local_water_logs') || '[]';
                                try {
                                   const list = JSON.parse(savedWater);
                                   list.unshift({
                                      id: `local_${Date.now()}`,
                                      amount: 250,
                                      effectiveAmount: 225, // 0.9 hydration factor
                                      context: 'مشروب دافئ (صفحة المرأة)',
                                      beverageType: drink.name,
                                      timestamp: Date.now()
                                   });
                                   localStorage.setItem('local_water_logs', JSON.stringify(list));
                                   window.dispatchEvent(new Event('localWaterUpdated'));
                                } catch (e){}
                             } else {
                                try {
                                   await addDoc(collection(db, 'users', user.uid, 'waterLogs'), {
                                      amount: 250,
                                      effectiveAmount: 225, // 0.9 hydration factor
                                      context: 'مشروب دافئ (صفحة المرأة)',
                                      beverageType: drink.name,
                                      timestamp: Date.now()
                                   });
                                } catch (e) {
                                   console.error("Failed to sync drink from Womens page to central Water tracking:", e);
                                }
                             }
                          }
                       }} 
                       className={cn("py-3 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm", isLogged ? "bg-gray-100/50 dark:bg-white/5 border-gray-200 dark:border-white/10 opacity-70 cursor-not-allowed" : cn(drink.bg, "border-white/50 dark:border-white/5 hover:scale-105 active:scale-95"))}
                    >
                       <span className="text-xl">{isLogged ? '✅' : drink.icon}</span>
                       <span className={cn("text-[10px] font-bold", isLogged ? "text-gray-500 font-medium" : drink.color)}>{isLogged ? 'مسجل' : drink.name}</span>
                    </button>
                 );})}
              </div>
           </div>
        </div>

         {/* +++ أضيف بناءً على طلبك - بطاقة روتين التدليل والعناية الذاتية للمرحلة الحالية لزيادة التفاعل والحث على رعاية الذات +++ */}
         <div className="px-6 mt-6">
            <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-5 shadow-sm text-right relative overflow-hidden font-sans">
               <h4 className="font-bold text-sm text-[#C2185B] dark:text-pink-400 mb-2 flex items-center justify-end gap-2">
                  روتين الرعاية والتدليل الذاتي اليومي 🌸✨
               </h4>
               <p className="text-[11px] text-gray-500 mb-4 leading-relaxed font-semibold">
                  أتمي خطوات التدليل المخصصة لمرحلتكِ الحالية ({phaseData.name}) اليوم لدعم عافيتكِ الهرمونية والنفسية بذكاء.
               </p>

               {/* Progress and Badge */}
               <div className="bg-rose-50/40 dark:bg-pink-950/10 p-3 rounded-2xl mb-4 text-center border border-rose-100/30 dark:border-white/5">
                  <div className="flex justify-between items-center mb-1 flex-row-reverse text-xs font-bold text-gray-750 dark:text-gray-300">
                     <span>نسبة الإنجاز اليومي:</span>
                     <span className="text-[#C2185B] dark:text-pink-400">{Math.round((completedSelfCare.length / (SELF_CARE_ITEMS[phase]?.length || 4)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden flex flex-row-reverse">
                     <div 
                        className="bg-gradient-to-r from-pink-500 to-[#C2185B] h-full transition-all duration-500 ease-out" 
                        style={{ width: `${(completedSelfCare.length / (SELF_CARE_ITEMS[phase]?.length || 4)) * 100}%` }}
                     ></div>
                  </div>
                  {completedSelfCare.length === (SELF_CARE_ITEMS[phase]?.length || 4) && (
                     <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 animate-bounce">
                        بطلة! لقد أتممتِ روتين رعاية ذاتكِ بالكامل لليوم بنجاح 💖👑
                     </p>
                  )}
               </div>

               {/* Checklist list */}
               <div className="space-y-2.5" dir="rtl">
                  {(SELF_CARE_ITEMS[phase] || []).map((item) => {
                     const isDone = completedSelfCare.includes(item.id);
                     return (
                        <button
                           key={item.id}
                           onClick={() => toggleSelfCare(item.id)}
                           className={cn(
                              "w-full p-3 rounded-xl border text-right transition-all flex items-center gap-3",
                              isDone 
                                 ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 text-gray-500" 
                                 : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-98"
                           )}
                        >
                           <span className="text-lg shrink-0">{item.icon}</span>
                           <span className={cn("text-xs flex-1 font-semibold leading-tight text-right", isDone ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-200")}>
                              {item.text}
                           </span>
                           <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                              isDone 
                                 ? "bg-emerald-500 border-transparent text-white" 
                                 : "border-gray-300 dark:border-white/20"
                           )}>
                              {isDone && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />}
                           </div>
                        </button>
                     );
                  })}
               </div>
            </div>
         </div>

         {/* +++ أضيف بناءً على طلبك - دليل شريك الحياة لمساندتكِ اليوم +++ */}
         <div className="px-6 mt-6 font-sans">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border border-pink-100/45 dark:border-pink-950/30 rounded-[24px] p-5 shadow-sm text-right">
               <h5 className="font-bold text-xs text-[#C2185B] dark:text-pink-400 mb-2 flex items-center justify-end gap-1.5 font-sans">
                  دليل شريك الحياة لمساندتكِ اليوم 💑💞
               </h5>
               <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">
                  {phaseData.partnerSupport || "أفضل مساندة اليوم هي تيسير المهام، والاستماع اللطيف والتقدير التام لعطائكِ المستمر."}
               </p>
            </div>
         </div>

         {/* Global Interactive Calendar Widget */}
        <div className="px-6 mt-8 mb-6">
         {/* Symptom & Safe Medication Analyzer / Doctor 🌸💊 */}
         <div className="px-6 mt-8">
            <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[32px] p-6 shadow-sm text-right relative overflow-hidden">
               <div className="absolute top-0 left-0 w-32 h-32 bg-rose-50/40 dark:bg-rose-950/20 rounded-br-[100px] pointer-events-none -mr-8 -mt-8"></div>
               <h4 className="font-bold text-sm text-[#C2185B] dark:text-pink-400 mb-2 flex items-center justify-end gap-2 relative z-10">
                  محلل الأعراض وفحص سلامة الأدوية 🌸💊
               </h4>
               <p className="text-[11px] text-gray-500 mb-4 leading-relaxed font-semibold">
                  تحققي من سلامة الأدوية، وحللي أعراضكِ مع قاعدة البيانات الطبية للقسم. اطلبي مشورة فورية بخصوص الحمل أو الرضاعة.
               </p>

               {/* Step 1: Input or select a symptom / write custom drug */}
               <div className="space-y-4" dir="rtl">
                  <div>
                     <label className="block text-[10px] font-black text-gray-400 mb-2">حددي العَرَض الطبي الحالي:</label>
                     <div className="flex flex-wrap gap-2">
                        {['صداع', 'مغص ونزيف', 'حموضة وغثيان', 'ألم في الظهر', 'إرهاق شديد'].map(sym => (
                           <button
                              key={sym}
                              onClick={() => {
                                 setSelectedSymptomAnal(sym);
                                 setMedAnalQuery('');
                                 // Auto trigger a safe internal database analysis
                                 const matched = MEDS_DATABASE.filter(m => m.treating.some(ind => ind.includes(sym) || sym.includes(ind)));
                                 if (matched.length > 0) {
                                    setAnalResult({
                                       symptom: sym,
                                       recommendedMeds: matched,
                                       generalAdvice: "نوصي بالراحة وتجنب القيام بمجهود كبير. يمكنك تناول أحد الأدوية الآمنة أدناه بعد استشارتها مع طبيبك المختص.",
                                       isDynamic: false
                                    });
                                 } else {
                                    setAnalResult({
                                       symptom: sym,
                                       recommendedMeds: [],
                                       generalAdvice: "لم يتم العثور على أدوية مطابقة تماماً في الصيدلية المنزلية لجهود هذا العرض المكتوب. يرجى مراجعة طبيبك أو استخدام الطبيب الذكي لمزيد من الدقة.",
                                       isDynamic: false
                                    });
                                 }
                              }}
                              className={cn(
                                 "text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all",
                                 selectedSymptomAnal === sym
                                    ? "bg-[#C2185B] text-white border-transparent"
                                    : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-white/10"
                              )}
                           >
                              {sym}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="relative">
                     <label className="block text-[10px] font-black text-gray-400 mb-2">أو ابحثي عن دواء معين لفحص سلامته (مثال: بنادول، بروفين):</label>
                     <div className="flex gap-2 w-full items-center">
                        <input
                           type="text"
                           placeholder="اكتبي اسم الدواء أو تركيبه الكيميائي هنا..."
                           className="flex-1 min-w-0 text-xs px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/10 rounded-2xl text-right font-medium focus:outline-none focus:border-rose-300"
                           value={medAnalQuery}
                           onChange={(e) => {
                              setMedAnalQuery(e.target.value);
                              setSelectedSymptomAnal('');
                           }}
                        />
                        <button
                           onClick={() => {
                              if (!medAnalQuery.trim()) return;
                              const queryLower = medAnalQuery.toLowerCase();
                              const matched = MEDS_DATABASE.filter(m => 
                                 m.name.toLowerCase().includes(queryLower) || 
                                 m.category.toLowerCase().includes(queryLower) ||
                                 m.treating.some(tr => tr.toLowerCase().includes(queryLower))
                              );
                              
                              if (matched.length > 0) {
                                 setAnalResult({
                                    symptom: `فحص دواء: ${medAnalQuery}`,
                                    recommendedMeds: matched,
                                    generalAdvice: `تم العثور على دواء مطابق في الموسوعة الطبية. يرجى قراءة إشارة التحذير بخصوص الحمل والرضاعة أدناه بعناية.`,
                                    isDynamic: false
                                  });
                              } else {
                                 setAnalResult({
                                    symptom: `فحص دواء: ${medAnalQuery}`,
                                    recommendedMeds: [],
                                    generalAdvice: `هذا الدواء غير مسجل في قاعدة البيانات لرفيقة المرأة. نوصي باستعمال التحليل المدعم بالذكاء الاصطناعي لفحص ملاءمته فورياً من الإنترنت.`,
                                    isDynamic: false
                                 });
                              }
                           }}
                           className="shrink-0 px-5 py-2 bg-[#C2185B] text-white font-bold rounded-2xl text-xs hover:bg-[#A2154B] transition-all cursor-pointer border-0"
                        >
                           فحص
                        </button>
                     </div>
                  </div>

                  {/* Optional AI Assistant integration for deep symptom analysis */}
                  {hasGemini && (
                     <div className="pt-2">
                        <button
                           onClick={async () => {
                              const query = medAnalQuery.trim() || selectedSymptomAnal || "أعراض عامة للدورة ومناسبتها";
                              setAnalLoading(true);
                              try {
                                 const response = await fetch('/api/chat', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                       message: `بصفتك طبيب ومستشار صحي موثوق، حلل هذا العرض أو الدواء: "${query}" لامرأة في مرحلة صحية هي "${PHASE_DETAILS[phase].name}". اشرح الفوائد والأعراض الجانبية والتحذيرات والجرعة الموصى بها وسلامته للحامل والمرضع ومخاطر استخدامه. اجعل الرد بأسلوب غني، عاطفي، وبنقاط مصممة ومختصرة باللغة العربية.`,
                                       context: `مرحلة المستخدمة: ${phase}. هل هناك حمل؟ ${phase === 'pregnancy' ? 'نعم' : 'لا'}. هل هناك رضاعة؟ ${phase === 'postpartum' ? 'نعم' : 'لا'}.`
                                    })
                                 });
                                 const resData = await response.json();
                                 if (resData.text) {
                                    setAnalResult({
                                       symptom: query,
                                       recommendedMeds: [],
                                       generalAdvice: resData.text,
                                       isDynamic: true
                                    });
                                 }
                              } catch (e) {
                                 console.error(e);
                              }
                              setAnalLoading(false);
                           }}
                           disabled={analLoading}
                           className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 font-bold rounded-2xl text-xs text-white transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                        >
                           <Sparkles className="w-4 h-4 animate-pulse" />
                           {analLoading ? "جاري تشغيل تحليل الطبيب الذكي..." : "طلب استشارة فورية من الطبيب الذكي 🤖👩‍⚕️"}
                        </button>
                     </div>
                  )}

                  {/* Feedback screen / Analysis result */}
                  {analResult && (
                     <div className="mt-4 p-4 bg-rose-50/40 dark:bg-[#251A24] border border-rose-100/50 dark:border-pink-900/30 rounded-2xl text-right animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center mb-3">
                           <button onClick={() => setAnalResult(null)} className="text-gray-400 hover:text-gray-650 text-xs">إغلاق</button>
                           <h5 className="font-bold text-xs text-[#C2185B] dark:text-pink-400">نتيجة التحليل لـ ({analResult.symptom}):</h5>
                        </div>

                        {analResult.isDynamic ? (
                           <div className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold whitespace-pre-wrap">
                              {analResult.generalAdvice}
                           </div>
                        ) : (
                           <div className="space-y-3">
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                                 {analResult.generalAdvice}
                              </p>

                              {analResult.recommendedMeds.map((med, index) => (
                                 <div key={index} className="p-3 bg-white dark:bg-[#1a1a1a] border border-rose-100/30 dark:border-white/5 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center pb-2 border-b border-gray-50 dark:border-white/5 flex-row-reverse">
                                       <span className="font-extrabold text-xs text-rose-950 dark:text-pink-400">{med.name}</span>
                                       <span className="text-[9px] font-black text-pink-700 bg-pink-100/50 dark:bg-pink-900/20 px-2 py-0.5 rounded">{med.category}</span>
                                    </div>
                                    <div className="text-[10px] space-y-1 text-gray-600 dark:text-gray-300">
                                       <div>💡 <span className="font-bold text-gray-700 dark:text-gray-200">الاستخدام:</span> {med.treating.join('، ')}</div>
                                       <div>⚠️ <span className="font-bold text-gray-750 dark:text-gray-250">الأعراض الجانبية:</span> {med.sideEffects}</div>
                                       <div>⚖️ <span className="font-bold text-gray-750 dark:text-gray-250">الخلاصة:</span> {med.verdict}</div>
                                       <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-white/5 text-[9px] font-extrabold text-right">
                                          <div className="text-[#C2185B] dark:text-pink-400 font-bold mb-1">🌿 مستويات الأمان الإنجابية والتحذيرات:</div>
                                          <div className="bg-rose-50/50 dark:bg-rose-950/10 p-2 rounded-xl space-y-1 text-gray-700 dark:text-gray-300">
                                             <div>🤰 <span className="font-extrabold text-rose-900 dark:text-rose-455">ملاءمة الحمل:</span> {med.safetyPregnancy}</div>
                                             <div>👶 <span className="font-extrabold text-pink-900 dark:text-rose-455">ملاءمة الرضاعة:</span> {med.safetyLactation}</div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                        <p className="text-[8px] text-gray-400 mt-3 italic text-center">*تنبيـه الطبيب الذكي هو استشاري توعوي وليس بديلًا بالكامل عن استشارة الطبيب البشري المختص.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>

           <h3 className="font-bold text-[#1A1A2E] dark:text-white text-right mb-4">التقويم الذكي</h3>
           <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-5 shadow-sm w-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#C2185B]/5 rounded-bl-[100px] -z-0"></div>
              
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-4 relative z-10">
                 <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500">
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <span className="font-bold text-[#1A1A2E] dark:text-white">
                    {currentMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                 </span>
                 <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500">
                    <ChevronRight className="w-5 h-5" />
                 </button>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-gray-400">
                 {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map(d => (
                    <div key={d}>{d}</div>
                 ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-6 relative z-10" dir="rtl">
                 {[...Array(firstDayOfMonth)].map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square flex items-center justify-center text-xs text-gray-300 dark:text-gray-700">
                       {prevMonthDays - firstDayOfMonth + i + 1}
                    </div>
                 ))}
                 {[...Array(daysInMonth)].map((_, i) => {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    
                    // Simple logic to find if log exists for date
                    const ms = date.getTime();
                    let isPeriod = false;
                    let isFertile = false;
                    let isOvulation = false;

                    // +++ تم تعديل المنطق هنا لكي لا يعلّم الأحمر إلى ما لا نهاية +++
                    const periodLog = logs.find(l => {
                       if (l.status !== 'period') return false;
                       const start = new Date(l.startDate).setHours(0,0,0,0);
                       const end = l.endDate ? new Date(l.endDate).setHours(0,0,0,0) : (start + (Math.max(10, periodDurationStats) - 1) * 86400000);
                       return ms >= start && ms <= end;
                    });
                    if (periodLog) {
                       isPeriod = true;
                    } else if (phase === 'follicular' || phase === 'luteal' || phase === 'ovulation') {
                       // Estimate fertile window based on cycle logic
                       const lastLog = logs.find(l => l.status === 'period');
                       if (lastLog) {
                          const cycleLen = cycleStats.averageCycle || 28; // Defaulting to 28 for estimation
                          const startOfPeriod = new Date(lastLog.startDate).setHours(0,0,0,0);
                          const estimatedOvulation = startOfPeriod + (cycleLen - 14) * 86400000;
                          if (Math.abs(ms - estimatedOvulation) < 43200000) {
                             isOvulation = true;
                          } else if (ms >= estimatedOvulation - 4 * 86400000 && ms <= estimatedOvulation + 86400000) {
                             isFertile = true;
                          }
                       }
                    }

                    return (
                       <button
                          key={i}
                          onClick={() => setSelectedDate(date)}
                          className={cn(
                             "aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all",
                             isToday && !isSelected && !isPeriod && !isFertile && !isOvulation && "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white",
                             isSelected && !isPeriod && "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-md transform scale-110",
                             isPeriod && "bg-rose-500 text-white shadow-sm",
                             isOvulation && "bg-purple-500 text-white shadow-sm",
                             isFertile && !isOvulation && "bg-cyan-500 text-white shadow-sm",
                             !isToday && !isSelected && !isPeriod && !isFertile && !isOvulation && "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5",
                             "relative"
                          )}
                       >
                          {i + 1}
                          {isToday && <span className="absolute -bottom-1 w-1 h-1 bg-[#C2185B] rounded-full"></span>}
                       </button>
                    );
                 })}
              </div>
              
              {/* +++ أضيف بناءً على طلبك: دليل ألوان التقويم +++ */}
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 mb-5 px-1 text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 border-t border-gray-50 dark:border-white/5 pt-4" dir="rtl">
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shrink-0 animate-pulse"></span>
                    <span>أيام الدورة</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm shrink-0"></span>
                    <span>أيام الخصوبة</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shrink-0"></span>
                    <span>يوم التبويض</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C2185B] shrink-0"></span>
                    <span>اليوم الحالي</span>
                 </div>
              </div>
              
              {isLate && (
                 <div className="mb-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-[16px] text-right">
                    <p className="text-amber-800 dark:text-amber-400 text-xs font-bold mb-2 flex items-center justify-end gap-1"><CalendarIcon className="w-4 h-4"/> تأخر ملحوظ في الدورة</p>
                    <p className="text-amber-700 dark:text-amber-500 text-[10px] leading-relaxed mb-3">
                       {profile?.maritalStatus === 'single' 
                         ? "لقد مر أكثر من 35 يوماً على آخر دورة لكِ، يرجى تسجيل بدء الدورة الجديدة فور نزولها للمتابعة الصحية الفائقة."
                         : "لقد مر أكثر من 35 يوماً على آخر دورة لكِ، هل هناك احتمال لوجود حمل؟ أم أنه مجرد تأخر؟"
                       }
                     </p>
                    <div className="flex gap-2 justify-end">
                       <button onClick={() => handleAction('start_period')} className="flex-1 p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-[10px] transition-all hover:bg-amber-200">
                          بدء دورة جديدة
                       </button>
                       <button style={{ display: profile?.maritalStatus === 'single' ? 'none' : 'block' }} onClick={() => handleAction('start_pregnancy')} className="flex-1 p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 font-bold text-[10px] transition-all hover:bg-rose-100">
                          {profile?.maritalStatus === 'single' ? "" : "نعم، تسجيل حمل"}
                       </button>
                    </div>
                 </div>
              )}

              <div className="grid grid-cols-2 gap-2" dir="rtl">
                 {selectedPeriodButtons}
                 {!selectedPeriodLog && (phase === 'menstrual' || phase === 'follicular' || phase === 'ovulation' || phase === 'luteal') && (
                    <>
                       {currentLog?.status === 'period' && !currentLog.endDate ? (
                          <button style={{ gridColumn: 'span 2' }} onClick={() => handleAction('end_period')} className="p-2.5 rounded-[16px] bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-rose-100 dark:border-rose-900/30 transition-all hover:bg-rose-100">
                             <CheckCircle2 className="w-3.5 h-3.5" /> انتهاء الدورة
                          </button>
                       ) : (
                          <>
                             <button 
                                style={profile?.maritalStatus === 'single' ? { gridColumn: 'span 2' } : {}}
                                onClick={() => handleAction('start_period')} 
                                className="p-2.5 rounded-[16px] bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-rose-100 dark:border-rose-900/30 transition-all hover:bg-rose-100"
                             >
                                <PlusCircle className="w-3.5 h-3.5" /> بدء الدورة
                             </button>
                             {profile?.maritalStatus !== 'single' && (
                                <button onClick={() => handleAction('start_pregnancy')} className="p-2.5 rounded-[16px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-900/30 transition-all hover:bg-indigo-100">
                                   <Baby className="w-3.5 h-3.5" /> تسجيل حمل
                                </button>
                             )}
                          </>
                       )}
                    </>
                 )}
                 
                 {!selectedPeriodLog && phase === 'pregnancy' && (
                    <>
                       <button onClick={() => handleAction('start_postpartum')} className="p-2.5 rounded-[16px] bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-sky-100 dark:border-sky-900/30 transition-all hover:bg-sky-100">
                          <Baby className="w-3.5 h-3.5" /> تسجيل ولادة
                       </button>
                       <button onClick={() => handleAction('end_pregnancy')} className="p-2.5 rounded-[16px] bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-300 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-gray-200 dark:border-white/10 transition-all hover:bg-gray-100">
                          إلغاء فترة الحمل
                       </button>
                    </>
                 )}

                 {!selectedPeriodLog && phase === 'postpartum' && (
                    <>
                       <button onClick={() => handleAction('end_postpartum')} className="p-2.5 rounded-[16px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-emerald-100 dark:border-emerald-900/30 transition-all hover:bg-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" /> انتهاء النفاس
                       </button>
                       <button onClick={() => handleAction('start_period')} className="p-2.5 rounded-[16px] bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-bold text-[10px] flex items-center justify-center gap-1.5 border border-rose-100 dark:border-rose-900/30 transition-all hover:bg-rose-100">
                          <PlusCircle className="w-3.5 h-3.5" /> عودة الدورة
                       </button>
                    </>
                 )}
              </div>
           </div>
        </div>
        </>
      )}

      {activeTab === 'explore' && (
         <div className="px-6 mt-4 space-y-6 text-right animate-in fade-in slide-in-from-bottom-2" dir="rtl">
            
            {selectedArticle ? (
              <div className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[24px] p-5 shadow-sm relative overflow-hidden">
                <button onClick={() => setSelectedArticle(null)} className="mb-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-[#3A3A3A] transition-all">
                   <ChevronRight className="w-5 h-5" />
                </button>
                <img src={selectedArticle.thumb} alt={selectedArticle.title} className="w-full h-40 object-cover rounded-[16px] mb-4" />
                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full mb-3 inline-block", selectedArticle.bg, selectedArticle.color)}>{selectedArticle.cat}</span>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2 leading-snug">{selectedArticle.title}</h3>
                <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                   <span>{selectedArticle.mins} دقائق للقراءة</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedArticle.content}
                </div>
              </div>
            ) : (
            <>
               <h3 className="font-bold text-lg text-[#1A1A2E] dark:text-white mb-2">الاستكشاف والتثقيف</h3>
               
               {/* Search Bar */}
               <div className="relative mb-6">
                  <input 
                     type="text" 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="ابحثي عن مقالات، أعراض، أو نصائح..." 
                     className={cn("w-full pl-4 pr-12 py-3.5 rounded-2xl text-sm transition-all border outline-none shadow-sm", isFastingMode ? "bg-[#1A1A1A] border-[#3D3834] text-white focus:border-amber-500" : "bg-white border-gray-100 dark:bg-[#1A1A1A] dark:border-white/10 dark:text-white focus:border-pink-300 dark:focus:border-pink-500/50")}
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
               </div>

               {/* Ask AI Mini Card */}
               <div 
                  onClick={async () => {
                     const aiPrompt = window.prompt('أهلا بكِ، أنا المساعدة الذكية. كيف يمكنني مساعدتك اليوم؟', '');
                     if (aiPrompt) {
                        // alert(`تلقيت سؤالك: "${aiPrompt}". جاري البحث والتحليل وسأرسل لك الإجابة قريباً.`);
                     }
                  }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30 rounded-[24px] p-5 shadow-sm text-right flex flex-row-reverse gap-4 items-center cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
               >
                  <div className="w-12 h-12 bg-white dark:bg-[#1A1A1A] rounded-full flex items-center justify-center shrink-0 border border-blue-50 dark:border-white/5 shadow-sm text-blue-500">
                     <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                     <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 mb-1">اسألي المساعدة الذكية</h4>
                     <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                        لديكِ سؤال طبي أو تبحثين عن نصيحة مخصصة؟ اسألي الآن.
                     </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-blue-300" />
               </div>
               
               <div className="mt-6 mb-2">
                  <h4 className="font-bold text-sm text-[#1A1A2E] dark:text-white mb-3 flex justify-between items-center">
                     <span>مقالات تهمك</span>
                  </h4>
                  <div className="space-y-3 pb-[100px]">
                     {ARTICLES.filter(art => searchQuery.trim() === '' || art.title.includes(searchQuery) || art.cat.includes(searchQuery)).map((art) => (
                        <div key={art.id} onClick={() => setSelectedArticle(art)} className="bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-[20px] p-3 shadow-sm flex items-center gap-4 cursor-pointer hover:border-gray-200 dark:hover:border-white/10 transition-all active:scale-95">
                           <img src={art.thumb} alt={art.title} className="w-16 h-16 rounded-2xl object-cover" />
                           <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between mb-1.5 flex-row-reverse">
                                 <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", art.bg, art.color)}>{art.cat}</span>
                                 <span className="text-[9px] text-gray-400 font-bold">{art.mins} دقائق قراءة</span>
                              </div>
                              <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 leading-tight mb-1">{art.title}</h5>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </>
            )}
         </div>
      )}
      {activeTab === 'progress' && (
         <div className="px-6 mt-4 space-y-6 text-right animate-in fade-in slide-in-from-bottom-2" dir="rtl">
            <div className="flex justify-between items-center mb-4">
               <button 
                  onClick={async () => {
                     let report = "=== التقرير الطبي לחالة الدورة الشهرية ===\n\n";
                     report += `تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}\n`;
                     report += `متوسط طول الدورة: 28 يوم\n`;
                     report += `متوسط فترة الحيض: 5 أيام\n\n`;
                     report += "آخر الدورات المسجلة:\n";
                     const periodLogs = logs.filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate).slice(0, 5);
                     periodLogs.forEach((l, i) => {
                         const sdStr = new Date(l.startDate).toLocaleDateString('ar-EG');
                         const edStr = l.endDate ? new Date(l.endDate).toLocaleDateString('ar-EG') : 'مستمرة';
                         const len = l.endDate ? Math.ceil((l.endDate - l.startDate) / 86400000) : '-';
                         report += `${i + 1}. من ${sdStr} إلى ${edStr} (المدة: ${len} أيام)\n`;
                     });
                     report += "\nالأعراض الأكثر تكراراً (تحليل الذكاء الاصطناعي):\n";
                     report += "- الم مفاصل: غالباً يحدث قبل الدورة بيومين.\n";
                     report += "- صداع نصفي: يتكرر وقت التبويض.\n";
                     report += "- مغص وإرهاق: مستمر خلال الأيام الأولى للحيض.\n\n";
                     report += "ملاحظة: تفاعل إيجابي مع المسكنات (إيبوبروفين) للمغص.\n\n";
                     report += "=========================================";
                     
                     const printWindow = window.open('', '', 'height=600,width=800');
                     if (printWindow) {
                         printWindow.document.write(`<html dir="rtl"><head><title>التقرير الطبي</title><style>body{font-family: Arial, sans-serif; padding: 30px; line-height: 1.8; color: #333;} h1{color: #C2185B;} pre{white-space: pre-wrap; font-family: inherit; font-size: 14px;}</style></head><body><h1>تقرير المتابعة</h1><pre>${report}</pre><script>window.print()</script></body></html>`);
                         printWindow.document.close();
                     } else {
                         try {
                             await navigator.clipboard.writeText(report);
                             const ok = await confirm("تم نسخ التقرير للحافظة! (يمكنك لصقه في أي مكان). للاستفادة من ميزة الطباعة المباشرة، يرجى السماح بالنوافذ المنبثقة.");
                         } catch(e) {}
                     }
                  }}
                  className="flex justify-center items-center gap-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-bold px-3 py-1.5 rounded-xl text-[10px] border border-blue-100 dark:border-blue-900/50 shadow-sm transition-all active:scale-95"
               >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>تقرير للطبيب</span>
               </button>
               <h3 className="font-bold text-lg text-[#1A1A2E] dark:text-white">إحصائيات دورتك</h3>
            </div>
            
            {/* Correlation Analysis Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-[#1A1A1A] border border-indigo-100 dark:border-indigo-900/30 rounded-[24px] p-5 shadow-sm text-right flex flex-row-reverse gap-4 mb-6">
               <div className="w-16 h-16 bg-white dark:bg-[#1A1A1A] rounded-2xl flex items-center justify-center shrink-0 border border-indigo-50 dark:border-white/5 shadow-sm text-indigo-500">
                  <Brain className="w-8 h-8" />
               </div>
               <div className="flex-1 flex flex-col justify-center">
                  <h4 className="font-bold text-sm text-indigo-800 dark:text-indigo-300 mb-1 flex justify-end items-center gap-1">
                     <Sparkles className="w-4 h-4" /> تحليل الترابط
                  </h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed mb-3">
                     لاحظنا أن <span className="font-bold text-rose-500">الصداع النصفي</span> يتكرر لديكِ غالباً أثناء <b>التبويض</b>، بينما <span className="font-bold text-amber-500">ألم المفاصل</span> يأتي عادةً <b>قبل بداية الحيض بيومين</b>.
                  </p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-xl text-center">
                     نصيحة: للوقاية من الصداع غداً، احرصي على شرب لترين من الماء وتقليل الكافيين.
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
               <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[20px] p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-500 mb-1">متوسط طول الدورة</span>
                  <span className="text-2xl font-black text-[#1A1A2E] dark:text-white">28 <span className="text-[10px] font-bold text-gray-400">يوم</span></span>
               </div>
               <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[20px] p-4 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-gray-500 mb-1">متوسط فترة الحيض</span>
                  <span className="text-2xl font-black text-[#1A1A2E] dark:text-white">5 <span className="text-[10px] font-bold text-gray-400">أيام</span></span>
               </div>
            </div>

            {/* Cycle Length Chart */}
            <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-5 shadow-sm">
               <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-6">طول الدورة (آخر 6 شهور)</h4>
               <div className="h-40 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={[
                        { name: 'يناير', days: 28 },
                        { name: 'فبراير', days: 27 },
                        { name: 'مارس', days: 29 },
                        { name: 'أبريل', days: 28 },
                        { name: 'مايو', days: 28 },
                        { name: 'يونيو', days: 30 }
                     ]} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                           <linearGradient id="colorDays" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C2185B" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#C2185B" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                        <RechartsTooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                           labelStyle={{ fontWeight: 'bold', color: '#1A1A2E', textAlign: 'right' }}
                           itemStyle={{ color: '#C2185B', fontWeight: 'bold', textAlign: 'right' }}
                        />
                        <Area type="monotone" dataKey="days" name="الأيام" stroke="#C2185B" strokeWidth={3} fillOpacity={1} fill="url(#colorDays)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-5 shadow-sm mt-6">
               <div className="flex justify-between items-center mb-4 flex-row-reverse">
                 <h4 id="history-title-section" className="font-bold text-sm text-gray-800 dark:text-white">تواريخ وسجلات المتابعة</h4>
                 <button onClick={async () => {
                    const promptText = profile?.maritalStatus === 'single'
                       ? 'أدخلي نوع السجل المراد إضافته:\n1 - دورة شهرية (حيض)\n3 - نفاس\n\n(اكتبي رقم الاختيار):'
                       : 'أدخلي نوع السجل المراد إضافته:\n1 - دورة شهرية (حيض)\n2 - حمل\n3 - نفاس\n\n(اكتبي رقم الاختيار):';
                    const typeChoice = prompt(promptText, '1');
                    if (typeChoice === '2' && profile?.maritalStatus === 'single') return;
                     if (!typeChoice) return;
                     let statusChoice: 'period' | 'pregnancy' | 'postpartum' = 'period';
                     if (typeChoice === '2') statusChoice = 'pregnancy';
                     else if (typeChoice === '3') statusChoice = 'postpartum';
                     const sd = prompt('أدخلي تاريخ البدء (YYYY-MM-DD):');
                    if (sd) {
                       const ed = prompt('أدخلي تاريخ نهاية السجل (YYYY-MM-DD) أو اتركيه فارغاً:');
                       const startDate = new Date(sd).getTime();
                       if (!isNaN(startDate)) {
                          const endDate = ed ? new Date(ed).getTime() : null;
                           const finalEndDate = !isNaN(endDate as any) ? endDate : null; const isValid = await validateAndConfirmPeriod(startDate, finalEndDate, statusChoice); if (!isValid) return;
                           if (user?.uid === 'local_guest_user') {
                              const list = [...logs];
                              list.unshift({
                                 id: `local_${Date.now()}`,
                                 startDate,
                                 endDate: finalEndDate,
                                 status: statusChoice,
                                 timestamp: Date.now()
                              });
                              localStorage.setItem('local_cycle_logs', JSON.stringify(list));
                              setLogs(list);
                              window.dispatchEvent(new Event('localCycleUpdated'));
                           } else if (user?.uid) {
                              addDoc(collection(db, 'users', user.uid, 'cycleLogs'), { startDate, endDate: finalEndDate, status: statusChoice, timestamp: Date.now() });
                           }
                       }
                    }
                 }} className="text-[10px] font-bold text-[#C2185B] bg-pink-50 dark:bg-pink-900/10 px-3 py-1.5 rounded-full hover:bg-pink-100 transition-colors flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" /> اضافة دورة سابقة
                 </button>
               </div>
               <div className="flex flex-wrap gap-3 text-[9px] font-bold text-gray-500 mb-4 justify-end">
                 <span className="flex items-center gap-1 flex-row-reverse"><span className="w-2.5 h-2.5 rounded-full bg-[#a882dd]"></span> يوم التبويض</span>
                 <span className="flex items-center gap-1 flex-row-reverse"><span className="w-2.5 h-2.5 rounded-full bg-[#79dae8]"></span> أيام الخصوبة</span>
                 <span className="flex items-center gap-1 flex-row-reverse"><span className="w-2.5 h-2.5 rounded-full bg-[#ff7c8f]"></span> أيام الحيض</span>
               </div>

               {/* Filter pills */}
                <div className="flex gap-1.5 mb-4 justify-end flex-wrap">
                   <button 
                      onClick={() => setLogFilter('all')} 
                      className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all", 
                         logFilter === 'all' 
                            ? "bg-[#C2185B] text-white border-[#C2185B]" 
                            : "bg-gray-50 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                      )}
                   >
                      الكل
                   </button>
                   <button 
                      onClick={() => setLogFilter('period')} 
                      className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all", 
                         logFilter === 'period' 
                            ? "bg-[#C2185B] text-white border-[#C2185B]" 
                            : "bg-gray-50 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                      )}
                   >
                      دورات الحيض
                   </button>
                   <button 
                      onClick={() => setLogFilter('pregnancy')} 
                      className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all", 
                         logFilter === 'pregnancy' 
                            ? "bg-indigo-600 text-white border-indigo-600" 
                            : "bg-gray-50 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                      )}
                   >
                      فترات الحمل
                   </button>
                   <button 
                      onClick={() => setLogFilter('postpartum')} 
                      className={cn("text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all", 
                         logFilter === 'postpartum' 
                            ? "bg-[#0284c7] text-white border-[#0284c7]" 
                            : "bg-gray-50 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-100"
                      )}
                   >
                      فترات النفاس
                   </button>
                </div>

                <div className="flex flex-wrap gap-2.5 text-[8px] font-bold text-gray-400 mb-4 justify-end">
                  <span className="flex items-center gap-1 flex-row-reverse"><span className="w-2 h-2 rounded-full bg-[#a882dd]"></span> يوم التبويض</span>
                  <span className="flex items-center gap-1 flex-row-reverse"><span className="w-2 h-2 rounded-full bg-[#79dae8]"></span> أيام الخصوبة</span>
                  <span className="flex items-center gap-1 flex-row-reverse"><span className="w-2 h-2 rounded-full bg-[#ff7c8f]"></span> أيام الحيض</span>
                </div>

                {(() => {
                   const rawFiltered = logs.filter(l => {
                      if (logFilter === 'all') return true;
                      return l.status === logFilter;
                   });
                   const sortedFiltered = [...rawFiltered].sort((a, b) => b.startDate - a.startDate);
                   const finalDisplay = showAllLogs ? sortedFiltered : sortedFiltered.slice(0, 3);

                   if (sortedFiltered.length === 0) {
                      return <p className="text-xs text-gray-500 text-center py-6">لم يتم العثور على أي سجلات في هذا الفلتر.</p>;
                   }

                   return (
                      <div className="space-y-4 relative z-0">
                         {finalDisplay.map((log) => {
                            let cycleLength = 28;
                            let periodLength = 5;
                            let daysArray = [];
                            
                            if (log.status === 'period') {
                               const periodLogsOnly = logs.filter(l => l.status === 'period').sort((a,b) => b.startDate - a.startDate);
                               const periodIndex = periodLogsOnly.findIndex(l => l.id === log.id);
                               const nextPeriodLog = periodIndex > 0 ? periodLogsOnly[periodIndex - 1] : null;
                               
                               cycleLength = nextPeriodLog 
                                  ? Math.floor((nextPeriodLog.startDate - log.startDate) / 86400000)
                                  : 28;
                               periodLength = log.endDate ? Math.ceil((log.endDate - log.startDate) / 86400000) : 5;
                               daysArray = Array.from({length: Math.min(cycleLength, 35)}, (_, i) => i + 1);
                            }

                            const isEditing = editingLogId === log.id;

                            return (
                            <div id={`log-card-${log.id}`} key={log.id} className="border border-gray-100 dark:border-white/5 rounded-[20px] p-4 text-center relative group bg-white dark:bg-[#1C1C1C] hover:shadow-md transition-shadow">
                               
                               {/* Edit / Delete control buttons in normal state */}
                               {!isEditing && (
                                  <div className="absolute top-3 left-3 flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                                     <button onClick={async () => {
                                        setEditingLogId(log.id);
                                        setEditStartDate(new Date(log.startDate).toISOString().split('T')[0]);
                                        setEditEndDate(log.endDate ? new Date(log.endDate).toISOString().split('T')[0] : '');
                                        setEditStatus(log.status);
                                     }} className="w-7 h-7 rounded-full bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center transition-all hover:bg-pink-100 dark:hover:bg-pink-500/20 active:scale-95" title="تعديل السجل">
                                        <Pencil className="w-3.5 h-3.5" />
                                     </button>
                                     <button onClick={async () => {
                                        const ok = await confirm('هل أنت متأكدة من حذف هذا السجل؟', 'حذف', 'إلغاء');
                                        if (ok) {
                                           try {
                                              if (user?.uid === 'local_guest_user') {
                                                 const listFiltered = logs.filter(l => l.id !== log.id);
                                                 localStorage.setItem('local_cycle_logs', JSON.stringify(listFiltered));
                                                 setLogs(listFiltered);
                                                 window.dispatchEvent(new Event('localCycleUpdated'));
                                              } else if (user?.uid) {
                                                 await deleteDoc(doc(db, 'users', user.uid, 'cycleLogs', log.id));
                                              }
                                           } catch (err) {
                                              console.error("Error deleting log:", err);
                                           }
                                        }
                                     }} className="w-7 h-7 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center transition-all hover:bg-red-100 dark:hover:bg-red-500/20 active:scale-95" title="حذف السجل">
                                        <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                  </div>
                                )}

                                {isEditing ? (
                                   // Inside-card elegant editing form
                                   <div className="text-right space-y-3 p-1.5" dir="rtl">
                                      <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/5">
                                         <h5 className="font-bold text-xs text-[#C2185B] flex items-center gap-1.5">
                                            <Pencil className="w-3.5 h-3.5" /> تعديل السجل المختار
                                         </h5>
                                         <button onClick={() => setEditingLogId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                            <X className="w-4 h-4" />
                                         </button>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                         <div>
                                            <label className="block text-[10px] text-gray-500 mb-1 font-bold">نوع السجل</label>
                                            <select
                                               value={editStatus}
                                               onChange={(e) => setEditStatus(e.target.value)}
                                               className="w-full text-xs font-bold p-2 bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-white/10 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:border-[#C2185B]"
                                            >
                                               <option value="period">دورة حيض 🩸</option>
                                               {profile?.maritalStatus !== 'single' && <option value="pregnancy">حمل 🤰</option>}
                                               <option value="postpartum">نفاس 👶</option>
                                            </select>
                                         </div>
                                         <div>
                                            <label className="block text-[10px] text-gray-500 mb-1 font-bold">تاريخ البدء</label>
                                            <input 
                                               type="date" 
                                               value={editStartDate} 
                                               onChange={(e) => setEditStartDate(e.target.value)} 
                                               className="w-full text-xs font-bold p-2 bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-white/10 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:border-[#C2185B]"
                                            />
                                         </div>
                                         <div>
                                            <label className="block text-[10px] text-gray-500 mb-1 font-bold">تاريخ الانتهاء</label>
                                            <input 
                                               type="date" 
                                               value={editEndDate} 
                                               onChange={(e) => setEditEndDate(e.target.value)} 
                                               className="w-full text-xs font-bold p-2 bg-gray-50 dark:bg-[#222] border border-gray-100 dark:border-white/10 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:border-[#C2185B]"
                                               placeholder="مستمر"
                                            />
                                         </div>
                                      </div>

                                      <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-white/5">
                                         <button 
                                            onClick={() => setEditingLogId(null)} 
                                            className="px-3 py-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 transition-colors"
                                         >
                                            إلغاء
                                         </button>
                                         <button 
                                            onClick={async () => {
                                               const startMs = new Date(editStartDate).getTime();
                                               if (isNaN(startMs)) {
                                                  alert('تاريخ البدء غير صحيح');
                                                  return;
                                               }
                                               const endMs = editEndDate ? new Date(editEndDate).getTime() : null;
                                               if (endMs && endMs < startMs) {
                                                  alert('تاريخ الانتهاء يجب أن يكون تالياً لتاريخ البدء');
                                                   return;
                                                }
                                                const isValid = await validateAndConfirmPeriod(startMs, endMs, editStatus, log.id);
                                                if (!isValid) return;
                                                if (false) {
                                                  return;
                                               }
                                               
                                               try {
                                                  if (user?.uid === 'local_guest_user') {
                                                     const updatedList = logs.map(l => {
                                                        if (l.id === log.id) {
                                                           return {
                                                              ...l,
                                                              startDate: startMs,
                                                              endDate: endMs,
                                                              status: editStatus
                                                           };
                                                        }
                                                        return l;
                                                     });
                                                     localStorage.setItem('local_cycle_logs', JSON.stringify(updatedList));
                                                     setLogs(updatedList);
                                                     window.dispatchEvent(new Event('localCycleUpdated'));
                                                  } else if (user?.uid) {
                                                     await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', log.id), {
                                                        startDate: startMs,
                                                        endDate: endMs,
                                                        status: editStatus
                                                     });
                                                  }
                                                  setEditingLogId(null);
                                               } catch (err) {
                                                  console.error("Error editing log:", err);
                                               }
                                            }} 
                                            className="px-4 py-1.5 text-[10px] font-bold bg-[#C2185B] text-white rounded-lg hover:bg-[#A3154C] transition-colors"
                                         >
                                            حفظ التغييرات
                                         </button>
                                      </div>
                                   </div>
                                ) : (
                                   // Normal Card Layout
                                   <>
                                      <p className="text-xs font-bold text-gray-800 dark:text-white mb-3">
                                         {log.status === 'period' && <span className="text-pink-600 dark:text-pink-400 font-black ml-1.5">🩸 حيض:</span>}
                                         {log.status === 'pregnancy' && <span className="text-indigo-600 dark:text-indigo-400 font-black ml-1.5">🤰 حمل:</span>}
                                         {log.status === 'postpartum' && <span className="text-sky-600 dark:text-sky-400 font-black ml-1.5">👶 نفاس:</span>}

                                         {new Date(log.startDate).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', year: 'numeric' })}
                                         {log.endDate ? ` - ${new Date(log.endDate).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', year: 'numeric' })}` : ' (مستمر حالياً)'}
                                         {log.status === 'period' && (
                                            <span className="text-gray-400 font-normal mr-2">(${cycleLength} يوم)</span>
                                         )}
                                      </p>

                                      {log.status === 'period' ? (
                                         <div className="flex flex-wrap justify-between gap-1 max-w-[280px] mx-auto text-[10px] font-bold" dir="rtl">
                                            {daysArray.map(dayNum => {
                                               let bgColor = "bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-gray-700 text-gray-400";
                                               if (dayNum <= periodLength) bgColor = "bg-[#ff7c8f] border-[#ff7c8f] text-white";
                                               else if (dayNum >= 10 && dayNum <= 13) bgColor = "bg-[#79dae8] border-[#79dae8] text-white";
                                               else if (dayNum === 14) bgColor = "bg-[#a882dd] border-[#a882dd] text-white";
                                               
                                               return (
                                                  <div key={dayNum} className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", bgColor)}>
                                                     {dayNum}
                                                  </div>
                                               );
                                            })}
                                         </div>
                                      ) : log.status === 'pregnancy' ? (
                                         <div className="flex flex-col items-center justify-center py-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/10 max-w-[280px] mx-auto">
                                            <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">فترة الحمل 🤰</span>
                                            {log.endDate ? (
                                               <span className="text-[10px] text-gray-500 mt-1">المدة: ${Math.max(1, Math.round((log.endDate - log.startDate) / 86400000))} يوماً</span>
                                            ) : (
                                               <span className="text-[10px] text-indigo-600 dark:text-indigo-500 mt-1 font-bold">الحمل مستمر في رحلتك الدافئة</span>
                                            )}
                                         </div>
                                      ) : (
                                         <div className="flex flex-col items-center justify-center py-3 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-100/50 dark:border-sky-900/10 max-w-[280px] mx-auto">
                                            <span className="text-xs font-black text-sky-700 dark:text-sky-400">فترة النفاس 👶</span>
                                            {log.endDate ? (
                                               <span className="text-[10px] text-gray-500 mt-1">المدة: ${Math.max(1, Math.round((log.endDate - log.startDate) / 86400000))} يوماً</span>
                                            ) : (
                                               <span className="text-[10px] text-sky-600 dark:text-sky-500 mt-1 font-bold">مستمرة حالياً في مرحلة الاستشفاء</span>
                                            )}
                                         </div>
                                      )}
                                   </>
                                )}
                            </div>
                         )})}
                         
                         {sortedFiltered.length > 3 && (
                            <button 
                               onClick={() => setShowAllLogs(!showAllLogs)} 
                               className="w-full py-2 bg-gray-50 dark:bg-[#1C1C1C] text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 dark:border-white/5"
                            >
                               {showAllLogs ? "عرض سجلات أقل" : `عرض جميع السجلات (${sortedFiltered.length})`}
                            </button>
                         )}
                      </div>
                   );
                })()}
             </div>
             
             <div className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-5 shadow-sm mt-6 mb-8 text-right">
               <h4 className="font-bold text-sm text-gray-800 dark:text-white mb-4">إعدادات وسائل الدعم ومنع الحمل</h4>
               <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium">وسيلة منع الحمل المختارة ستؤثر على كيفية تتبع التطبيق لدورتك وتقديم النصائح اليومية.</p>
               <select 
                  className="w-full bg-gray-50 dark:bg-[#2A2A2A] border border-gray-100 dark:border-white/10 rounded-xl p-3 text-sm font-bold text-gray-800 dark:text-white mb-2 focus:outline-none focus:border-[#C2185B]"
                  dir="rtl"
                  value={contraceptionMethod}
                  onChange={async (e) => {
                     const val = e.target.value;
                     setContraceptionMethod(val);
                     if (user) {
                        if (user.uid === 'local_guest_user') {
                           localStorage.setItem('local_settings_womenshealth', val);
                        } else {
                           try {
                              await setDoc(doc(db, 'users', user.uid, 'settings', 'womensHealth'), {
                                 contraceptionMethod: val
                              }, { merge: true });
                           } catch (err) {
                              console.error("Error updating settings:", err);
                           }
                        }
                     }
                  }}
               >
                  <option value="none">لا أستخدم وسيلة حالياً</option>
                  <option value="pill">حبوب منع الحمل (تأثير على التبويض)</option>
                  <option value="minipill">حبوب منع الحمل المصغرة (الرضاعة)</option>
                  <option value="iud_copper">اللولب النحاسي (قد يزيد التدفق)</option>
                  <option value="iud_hormonal">اللولب الهرموني (تخفيف التدفق)</option>
                  <option value="injection">حقن منع الحمل</option>
                  <option value="implant">شريحة تحت الجلد (Implant)</option>
               </select>
               {contraceptionMethod === 'pill' && (
                  <div className="text-[10px] text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30 p-2 rounded-lg mt-2 font-bold mb-2">💡 سيتم تعديل توقعات دورتك لتكون منتظمة (التبويض غير متوقع).</div>
               )}
               {contraceptionMethod === 'iud_copper' && (
                  <div className="text-[10px] text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30 p-2 rounded-lg mt-2 font-bold mb-2">💡 دورتك قد تستمر لتكون منتظمة، ولكن قد تواجهين تدفقاً أثقل في الأيام الأولى.</div>
               )}
               {contraceptionMethod === 'iud_hormonal' && (
                  <div className="text-[10px] text-pink-600 bg-pink-50 dark:bg-pink-900/20 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30 p-2 rounded-lg mt-2 font-bold mb-2">💡 قد تواجهين غياباً للدورة أو تدفقاً خفيفاً جداً بمرور الوقت.</div>
               )}
            </div>
         </div>
      )}

      {activeTab === 'community' && (
         <div className="px-6 mt-4 space-y-6 text-right animate-in fade-in slide-in-from-bottom-2" dir="rtl">
            
            {/* Header section showing she is not alone */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/10 border border-pink-100 dark:border-pink-900/30 rounded-3xl p-5 shadow-sm">
               <div className="flex items-center gap-2 mb-2 justify-end">
                  <span className="text-xs bg-pink-100 text-[#C2185B] dark:bg-pink-900/40 dark:text-pink-300 font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                     <Users className="w-3.5 h-3.5" /> مجتمع الرفيقات النشط
                  </span>
                  <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
               </div>
               <h4 className="font-extrabold text-sm text-[#1A1A2E] dark:text-white mb-2 leading-relaxed">
                  أنتِ لستِ وحدكِ يا صديقتنا 🌸
               </h4>
               <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  يتواجد حالياً <strong className="text-[#C2185B]">٤,٢٥٠ بطلة</strong> يمررن بـ <strong className="text-pink-600 dark:text-pink-400">{phaseData.name}</strong> في الساعات الراهنة. كوني رفيقة لهن، فتكاتف المشاركات وتبادل الدعم يبدد ضيق الأيام.
               </p>
               
               {/* Display Her Symptoms */}
               <div className="mt-3 pt-3 border-t border-pink-100/50 dark:border-pink-900/30 flex flex-wrap gap-2 items-center justify-end">
                  <span className="text-[10px] text-gray-400 font-bold">أعراضكِ النشطة اليوم:</span>
                  {activeMoods.filter(m => m !== 'Mood').length > 0 ? (
                     activeMoods.filter(m => m !== 'Mood').map((mood, idx) => (
                        <span key={idx} className="text-[9px] bg-[#C2185B] text-white px-2 py-0.5 rounded-full font-bold">
                           {mood} 🩸
                        </span>
                     ))
                  ) : (
                     <span className="text-[9px] text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        لا يوجد أعراض نشطة مسجلة اليوم (انقري على زر التضامن +١ لتسجيلها تلقائياً)
                     </span>
                  )}
               </div>
            </div>

            {/* +++ أطلبك: تنبيه النجاح الفوري عند مشارك النصيحة لمجتمع الرفيقات +++ */}
            {shareSuccessTipMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#C2185B] to-rose-600 text-white font-extrabold text-xs p-3.5 rounded-2xl text-center shadow-lg leading-normal border border-pink-400/20"
              >
                💞 {shareSuccessTipMsg}
              </motion.div>
            )}

            {/* Dynamic fluctuating Dos & Don'ts for the current phase */}
            <div className="bg-white dark:bg-[#121415] border border-[#F0EBE1] dark:border-white/5 rounded-3xl p-5 shadow-sm">
               <div className="flex justify-between items-center mb-3">
                  <button 
                     onClick={handleShuffleTips}
                     className="text-xs text-[#C2185B] dark:text-pink-400 hover:text-pink-700 bg-pink-50 dark:bg-pink-950/40 p-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer font-bold border-0"
                     title="تجديد النصائح والملهمات"
                  >
                     <RotateCw className="w-3.5 h-3.5" />
                     تحديث النصائح اليومية
                  </button>
                  <h4 className="font-extrabold text-[#1A1A2E] dark:text-white text-xs flex items-center gap-1.5">
                     <Brain className="w-4 h-4 text-[#C2185B]" /> دليل الرعاية والتحصين الهرموني لـ ({phaseData.name})
                  </h4>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {/* DOs Card */}
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl p-4">
                     <h5 className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ✅ افعلي هذا لدعم المرحلة
                     </h5>
                     <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                        {DYNAMIC_PHASE_TIPS[phase]?.dos[randomDoIndex] || DYNAMIC_PHASE_TIPS.follicular.dos[0]}
                     </p>
                     {/* +++ أطلبك: مشاركة وتبادل نصائح دليل الرعاية المطور مع مجتمع الرفيقات +++ */}
                     <button 
                        onClick={() => handleShareTip(DYNAMIC_PHASE_TIPS[phase]?.dos[randomDoIndex] || DYNAMIC_PHASE_TIPS.follicular.dos[0], true)}
                        className="mt-3 w-full py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold text-[9.5px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border-0"
                     >
                        <Users className="w-3 h-3" />
                        <span>مشاركة النصيحة في مجتمع الرفيقات 🫶</span>
                     </button>
                  </div>

                  {/* DON'Ts Card */}
                  <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 rounded-2xl p-4">
                     <h5 className="font-bold text-[11px] text-[#C2185B] dark:text-rose-450 mb-2 flex items-center gap-1 justify-end">
                        <X className="w-3.5 h-3.5" /> ❌ تجنبي هذا لتخفيف العارض
                     </h5>
                     <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                        {DYNAMIC_PHASE_TIPS[phase]?.donts[randomDonutIndex] || DYNAMIC_PHASE_TIPS.follicular.donts[0]}
                     </p>
                     {/* +++ أطلبك: مشاركة وتبادل نصائح دليل الرعاية المطور مع مجتمع الرفيقات +++ */}
                     <button 
                        onClick={() => handleShareTip(DYNAMIC_PHASE_TIPS[phase]?.donts[randomDonutIndex] || DYNAMIC_PHASE_TIPS.follicular.donts[0], false)}
                        className="mt-3 w-full py-1.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-[#C2185B] dark:text-rose-450 font-extrabold text-[9.5px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all border-0"
                     >
                        <Users className="w-3 h-3" />
                        <span>مشاركة النصيحة في مجتمع الرفيقات 🫶</span>
                     </button>
                  </div>
               </div>
            </div>

            {/* Experience Creator Form */}
            <div className="bg-[#FFF5F7] dark:bg-pink-950/10 border border-[#FEE2E6] dark:border-pink-900/20 rounded-3xl p-5 shadow-sm text-right">
               <h4 className="font-extrabold text-xs text-[#1A1A2E] dark:text-white mb-2 flex items-center gap-1.5 justify-end">
                  <Pencil className="w-4 h-4 text-[#C2185B]" /> شاركي تجربتكِ أو عارضكِ لمساندة رفيقاتكِ
               </h4>
               <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
                  اكتبي ما تشعرين به الآن أو حلولاً جربتيها؛ مشاركتكِ ستظهر للفتيات اللواتي يختبرن نفس دورتكِ أو عارضكِ لتخفيف آلامهن بخصوصية تامة.
               </p>

               <div className="space-y-3">
                  <textarea 
                     value={newPostText}
                     onChange={(e) => setNewPostText(e.target.value)}
                     placeholder="مثال: أشعر بالمغص الشديد في أسفل البطن حالياً.. هل من صديقة تفيدني بما يهدئ المعدة؟"
                     className="w-full h-20 text-xs font-semibold p-3 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#C2185B] resize-none text-right"
                  />

                  <div className="flex flex-wrap gap-3 items-center justify-between">
                     <div className="flex items-center gap-1.5 flex-row-reverse">
                        <label className="text-[10px] text-gray-500 font-bold whitespace-nowrap">العارض المصاحب:</label>
                        <select 
                           value={newPostSymptom}
                           onChange={(e) => setNewPostSymptom(e.target.value)}
                           className="text-[10px] font-bold p-1.5 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl text-gray-800 dark:text-white cursor-pointer focus:outline-none focus:border-[#C2185B]"
                        >
                           <option value="مغص">مغص 🩸</option>
                           <option value="صداع">صداع 🧠</option>
                           <option value="إرهاق">إرهاق 💤</option>
                           <option value="نشيطة">نشاط عالي ⚡</option>
                           <option value="متقلبة">تقلب مزاجي 🤯</option>
                        </select>
                     </div>

                     <button 
                        onClick={() => {
                           if (!newPostText.trim()) {
                              alert("صديقتنا، تفضلي بكتابة كلمات تجربتك أولاً قبل النشر.");
                              return;
                           }
                           const postObj = {
                              id: 'cp_user_' + Date.now(),
                              name: profile?.name || 'رفيقة درب',
                              avatar: (profile?.name ? profile.name[0] : 'ر'),
                              phase: phase,
                              msg: newPostText,
                              symptom: newPostSymptom,
                              likes: 0,
                              hasLiked: false,
                              comments: []
                           };
                           setCommunityPosts(prev => [postObj, ...prev]);
                           setNewPostText('');
                           setNewPostSuccessMsg("تم التوثيق والبدء في بث تجربتكِ كصدى داعم للرفيقات! 🌸✨");
                           setTimeout(() => setNewPostSuccessMsg(''), 5000);
                        }}
                        className="bg-[#C2185B] hover:bg-[#A0144A] text-white font-bold text-[11px] px-5 py-2.5 rounded-2xl transition-all active:scale-95 shadow-sm shadow-[#C2185B]/20 cursor-pointer border-0"
                     >
                        نشر وتعميم التجربة 🚀
                     </button>
                  </div>

                  {newPostSuccessMsg && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-bold text-pink-600 bg-pink-100/40 p-2.5 rounded-xl border border-pink-100 text-center mt-2"
                     >
                        {newPostSuccessMsg}
                     </motion.div>
                  )}
               </div>
            </div>

            {/* Filter control headers */}
            <div className="flex flex-col gap-2">
               <h4 className="font-extrabold text-[12px] text-[#1A1A2E] dark:text-white">تصفح تجارب من حولكِ:</h4>
               <div className="flex gap-2 flex-row-reverse flex-wrap">
                  <button 
                     onClick={() => setCommunityTabFilter('current_phase')}
                     className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-0", 
                        communityTabFilter === 'current_phase' 
                           ? "bg-[#C2185B] text-white shadow-sm font-black" 
                           : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-white font-bold"
                     )}
                  >
                     تجارب مرحلتي الحالية ({phaseData.name})
                  </button>
                  <button 
                     onClick={() => setCommunityTabFilter('match_symptoms')}
                     className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-0", 
                        communityTabFilter === 'match_symptoms' 
                           ? "bg-amber-600 text-white shadow-sm font-black" 
                           : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-white font-bold"
                     )}
                  >
                     أعراض تطابق أعراضي النشطة ({activeMoods.filter(m => m !== 'Mood').join(' أو ') || 'لا يوجد عارض نشط'})
                  </button>
                  <button 
                     onClick={() => setCommunityTabFilter('all')}
                     className={cn("px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer border-0", 
                        communityTabFilter === 'all' 
                           ? "bg-[#1A1A2E] dark:bg-white dark:text-[#1A1A2E] text-white shadow-sm font-black" 
                           : "bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-white font-bold"
                     )}
                  >
                     كل المجموعات ({communityPosts.length})
                  </button>
               </div>
            </div>

            {/* Render Posts List */}
            <div className="space-y-4">
               {(() => {
                  const filtered = communityPosts.filter(p => {
                     if (communityTabFilter === 'current_phase') {
                        return p.phase === phase;
                     }
                     if (communityTabFilter === 'match_symptoms') {
                        return activeMoods.includes(p.symptom);
                     }
                     return true; 
                  });

                  if (filtered.length === 0) {
                     return (
                        <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                           <Users className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-bounce" />
                           <p className="text-xs font-bold text-gray-500">لا توجد تجارب معروضة حالياً ضمن الفلتر المختار.</p>
                           <p className="text-[10px] text-gray-400 mt-1">شاركي تجربتكِ الأولى أعلاه لمباركة رفيقاتكِ اللواتي يقرأن!</p>
                        </div>
                     );
                  }

                  return filtered.map((post) => {
                     const postPhaseName = PHASE_DETAILS[post.phase as HormonePhase]?.name || "مرحلة أخرى";
                     const postSymptomName = post.symptom;

                     return (
                        <div 
                           key={post.id} 
                           className="bg-white dark:bg-[#1A1A1A] border border-[#F0EBE1] dark:border-white/5 rounded-[24px] p-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md"
                        >
                           <div className="flex gap-3 justify-between items-start">
                              <div className="flex flex-col items-start gap-1">
                                 <span className="text-[8px] font-extrabold bg-pink-55 text-[#C2185B] dark:bg-[#C2185B]/20 dark:text-pink-300 px-2 py-0.5 rounded-full">
                                    {postPhaseName}
                                 </span>
                                 <span className="text-[8px] font-extrabold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                    العارض: {postSymptomName} 🩸
                                 </span>
                              </div>

                              <div className="flex gap-2 items-center flex-row-reverse">
                                 <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 text-[#C2185B] flex items-center justify-center font-bold text-xs select-none">
                                    {post.avatar}
                                 </div>
                                 <div className="text-right">
                                    <h4 className="font-extrabold text-xs text-gray-800 dark:text-white leading-none">
                                       {post.name}
                                    </h4>
                                    <span className="text-[8px] text-gray-400 mt-0.5 block">عضوة في الدعم والرفقة</span>
                                 </div>
                              </div>
                           </div>

                           <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-semibold text-right whitespace-pre-wrap">
                              {post.msg}
                           </p>

                           {/* Interactive like/Symptom registration button */}
                           <div className="flex justify-between items-center border-t border-b border-gray-50 dark:border-white/5 py-2.5 mt-1">
                              <span className="text-[9px] font-bold text-gray-400">
                                 {post.likes} تضامنّ 🤝
                              </span>

                              <div className="flex gap-3 items-center">
                                 {/* +1 Button which also registers her symptom! */}
                                 <button 
                                    onClick={() => {
                                       const updated = communityPosts.map(p => {
                                          if (p.id === post.id) {
                                             const isAddition = !p.hasLiked;
                                             return {
                                                ...p,
                                                likes: isAddition ? p.likes + 1 : Math.max(0, p.likes - 1),
                                                hasLiked: isAddition
                                             };
                                          }
                                          return p;
                                       });
                                       setCommunityPosts(updated);

                                       // Treat with Sympathy - add symptom to current user Daily log!
                                       if (!post.hasLiked) {
                                          if (!activeMoods.includes(post.symptom)) {
                                             toggleMood(post.symptom);
                                             alert(`🤝 تم التضامن بنجاح! لقد سجلنا شعوركِ بـ (${post.symptom} 🩸) في جدول تتبع أعراضك لليوم لتطبيق نصائحها وتعديل خطتك اليومية.`);
                                          } else {
                                             alert("🤝 تم تسجيل تضامنكِ! هذا العارض نشط مسبقاً في جدول بياناتكِ لليوم.");
                                          }
                                       }
                                    }}
                                    className={cn("text-[10px] font-extrabold py-1 px-2.5 rounded-lg flex items-center gap-1 transition-all active:scale-95 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20 border-0", 
                                       post.hasLiked ? "text-[#C2185B]" : "text-gray-400 dark:text-gray-500"
                                    )}
                                 >
                                    <ThumbsUp className="w-3 h-3" />
                                    <span>أنا أيضاً (+١) 🤝</span>
                                 </button>

                                 <span className="text-gray-200 dark:text-white/10 font-thin">|</span>

                                 <span className="text-[9px] text-gray-400 font-bold select-none flex items-center gap-0.5">
                                    <MessageCircle className="w-3 h-3" /> {post.comments.length} تعليق
                                 </span>
                              </div>
                           </div>

                           {/* Comments Section */}
                           <div className="space-y-2.5 bg-gray-50 dark:bg-white/5 p-3 rounded-2xl">
                              <span className="text-[9px] font-semibold text-gray-400 block mb-1">التعليقات والمواساة ({post.comments.length}):</span>
                              
                              {post.comments.length > 0 ? (
                                 <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {post.comments.map((cm) => (
                                       <div key={cm.id} className="text-right text-[10px] bg-white dark:bg-[#1C1C1C] p-2 rounded-xl shadow-xs border border-gray-100 dark:border-white/5 leading-relaxed">
                                          <div className="flex justify-between items-center mb-1 flex-row-reverse">
                                             <span className="font-extrabold text-[#C2185B]">{cm.name}</span>
                                             <span className="text-[8px] text-gray-400">{cm.date}</span>
                                          </div>
                                          <p className="font-bold text-gray-600 dark:text-gray-300 text-right">{cm.text}</p>
                                       </div>
                                    ))}
                                 </div>
                              ) : (
                                 <span className="text-[9px] text-gray-450 italic block text-center py-1">لا يوجد تعليقات مواساة للآن، اكتبي كلماتكِ اللطيفة لها!</span>
                              )}

                              {/* Comment box */}
                              <div className="flex gap-2 mt-2 items-center flex-row-reverse">
                                 <input 
                                    type="text"
                                    value={postCommentInputs[post.id] || ''}
                                    onChange={(e) => {
                                       const val = e.target.value;
                                       setPostCommentInputs(prev => ({ ...prev, [post.id]: val }));
                                    }}
                                    placeholder="اكتبي تعليقاً داعماً أو مواساة صديقة..."
                                    className="flex-1 text-[10px] font-semibold p-2 bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-[#C2185B] text-gray-800 dark:text-white text-right"
                                 />
                                 <button 
                                    onClick={() => {
                                       const inputVal = postCommentInputs[post.id];
                                       if (!inputVal || !inputVal.trim()) return;
                                       
                                       const commentObj = {
                                          id: 'cmt_' + Date.now(),
                                          name: profile?.name || 'رفيقة درب',
                                          text: inputVal,
                                          date: 'الآن'
                                       };

                                       const updated = communityPosts.map(p => {
                                          if (p.id === post.id) {
                                             return {
                                                ...p,
                                                comments: [...p.comments, commentObj]
                                             };
                                          }
                                          return p;
                                       });
                                       setCommunityPosts(updated);
                                       setPostCommentInputs(prev => ({ ...prev, [post.id]: '' }));
                                    }}
                                    className="bg-[#C2185B] hover:bg-[#A0144A] text-white font-bold text-[9px] px-3.5 py-2 rounded-lg cursor-pointer border-0 shrink-0"
                                 >
                                    مواساة 💬
                                 </button>
                              </div>
                           </div>
                        </div>
                     );
                  });
               })()}
            </div>
         </div>
      )}
      </div>

      {editingLogId && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
             <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl max-w-sm w-full text-right shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/10">
                 <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-white/5 mb-4 font-sans">
                     <h4 className="font-extrabold text-sm text-[#C2185B] flex items-center gap-1.5">
                         <Pencil className="w-4 h-4" /> تعديل السجل المختار
                     </h4>
                     <button onClick={() => setEditingLogId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 bg-transparent border-0 cursor-pointer">
                         <X className="w-4 h-4" />
                     </button>
                 </div>
                 
                 <div className="space-y-4 font-sans text-right">
                     <div>
                         <label className="block text-[10px] text-gray-400 mb-1 font-bold">نوع السجل</label>
                         <select
                             value={editStatus}
                             onChange={(e) => setEditStatus(e.target.value as any)}
                             className="w-full text-xs font-bold p-2.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:border-[#C2185B] cursor-pointer"
                         >
                             <option value="period">دورة حيض 🩸</option>
                             {profile?.maritalStatus !== 'single' && <option value="pregnancy">حمل 🤰</option>}
                             <option value="postpartum">نفاس 👶</option>
                         </select>
                     </div>
                     <div>
                         <label className="block text-[10px] text-gray-400 mb-1 font-bold">تاريخ البدء</label>
                         <input 
                             type="date" 
                             value={editStartDate} 
                             onChange={(e) => setEditStartDate(e.target.value)} 
                             className="w-full text-xs font-bold p-2.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:border-[#C2185B]"
                         />
                     </div>
                     <div>
                         <label className="block text-[10px] text-gray-400 mb-1 font-bold">تاريخ الانتهاء</label>
                         <input 
                             type="date" 
                             value={editEndDate} 
                             onChange={(e) => setEditEndDate(e.target.value)} 
                             className="w-full text-xs font-bold p-2.5 bg-gray-50 dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl text-gray-800 dark:text-white focus:outline-none focus:border-[#C2185B]"
                             placeholder="مستمر"
                         />
                     </div>
                 </div>

                 <div className="flex gap-3 mt-6 font-sans">
                     <button 
                         onClick={async () => {
                             const startMs = new Date(editStartDate).getTime();
                             if (isNaN(startMs)) {
                                 alert('تاريخ البدء غير صحيح');
                                 return;
                             }
                             const endMs = editEndDate ? new Date(editEndDate).getTime() : null;
                             if (endMs && endMs < startMs) {
                                 alert('تاريخ الانتهاء يجب أن يكون تالياً لتاريخ البدء');
                                 return;
                             }

                             const isValid = await validateAndConfirmPeriod(startMs, endMs, editStatus, editingLogId);
                             if (!isValid) return;

                             try {
                                 if (user?.uid === 'local_guest_user') {
                                     const updatedList = logs.map(l => {
                                         if (l.id === editingLogId) {
                                             return {
                                                 ...l,
                                                 startDate: startMs,
                                                 endDate: endMs,
                                                 status: editStatus
                                             };
                                         }
                                         return l;
                                             });
                                     localStorage.setItem('local_cycle_logs', JSON.stringify(updatedList));
                                     setLogs(updatedList);
                                     window.dispatchEvent(new Event('localCycleUpdated'));
                                 } else if (user?.uid) {
                                     await updateDoc(doc(db, 'users', user.uid, 'cycleLogs', editingLogId), {
                                         startDate: startMs,
                                         endDate: endMs,
                                         status: editStatus
                                     });
                                 }
                                 setEditingLogId(null);
                             } catch (err) {
                                 console.error("Error editing log master modal:", err);
                             }
                         }} 
                         className="flex-1 bg-[#C2185B] hover:bg-[#A0144A] text-white font-bold py-3 rounded-xl transition-all active:scale-95 text-xs cursor-pointer"
                     >
                         حفظ التغييرات
                     </button>
                     <button 
                         onClick={() => setEditingLogId(null)} 
                         className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all active:scale-95 text-xs cursor-pointer"
                     >
                         إلغاء
                     </button>
                 </div>
             </div>
         </div>
      )}

      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
            <div className="bg-white dark:bg-[#1A1A1A] p-6 rounded-3xl max-w-sm w-full text-right shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 font-bold leading-relaxed whitespace-pre-wrap">{confirmState.message}</p>
                <div className="flex gap-3">
                    <button onClick={confirmState.onConfirm} className="flex-1 bg-[#C2185B] hover:bg-[#A0144A] text-white font-bold py-3 rounded-xl transition-all active:scale-95">{confirmState.confirmText || 'نعم'}</button>
                    <button onClick={confirmState.onCancel} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all active:scale-95">{confirmState.cancelText || 'إلغاء'}</button>
                </div>
            </div>
        </div>
      )}

    </div>
    </div>
  );
}
