import { 
  ChevronRight, Smile, Meh, Frown, Sparkles, 
  RotateCcw, Activity, Calendar, Clock, Heart, 
  Thermometer, Info, HelpCircle, Check, MapPin, Sparkle, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useState, useMemo, CSSProperties } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';
import { motion } from 'motion/react';

// Definitions for human body detailed regions
interface BodyRegion {
  id: string;
  name: string; // Arabic clinical name
  symptom: string; // The specific symptom it adds to reports
  style: CSSProperties; // exact bounding coordinates inside the silhouette container
}

interface SubRegion {
  id: string;
  name: string; // Arabic clinical name
  symptom: string; // Detailed symptom name
}

const subRegionsMap: Record<string, SubRegion[]> = {
  head_front: [
    { id: 'forehead', name: 'الجبهة', symptom: 'ألم في الجبهة (Forehead)' },
    { id: 'eyes', name: 'العينين', symptom: 'ألم أو ضغط خلف العينين (Eyes)' },
    { id: 'sinuses', name: 'الجيوب الأنفية', symptom: 'ضغط الجيوب الأنفية (Sinuses)' },
    { id: 'temples', name: 'الصدغين (جانبي الرأس)', symptom: 'صداع بالفصين / الصدغين (Temples)' },
    { id: 'jaw', name: 'الفك والأسنان', symptom: 'ألم في الفك أو الأسنان (Jaw/Teeth)' },
    { id: 'ears', name: 'الأذن', symptom: 'ألم وضغط في الأذن (Ear)' },
  ],
  neck_front: [
    { id: 'throat', name: 'الحلق والبلعوم', symptom: 'ألم وصعوبة بلع بالحنجرة (Throat)' },
    { id: 'neck_muscles', name: 'العضلات الجانبية', symptom: 'تشنج عضلات الرقبة الجانبية' },
    { id: 'thyroid', name: 'منطقة الغدة الدرقية', symptom: 'ألم أو تضخم موضع الغدة الدرقية' },
  ],
  shoulder_left: [
    { id: 'sh_joint_l', name: 'مفصل الكتف الأيسر', symptom: 'ألم عميق بمفصل الكتف الأيسر' },
    { id: 'clavicle_l', name: 'ترقوة الكتف الأيسر', symptom: 'ألم ترقوة الكتف الأيسر' },
    { id: 'deltoid_l', name: 'العضلة الدالية اليسرى', symptom: 'شد عضلي بالكتف الأيسر' },
  ],
  shoulder_right: [
    { id: 'sh_joint_r', name: 'مفصل الكتف الأيمن', symptom: 'ألم عميق بمفصل الكتف الأيمن' },
    { id: 'clavicle_r', name: 'ترقوة الكتف الأيمن', symptom: 'ألم ترقوة الكتف الأيمن' },
    { id: 'deltoid_r', name: 'العضلة الدالية اليمنى', symptom: 'شد عضلي بالكتف الأيمن' },
  ],
  chest: [
    { id: 'sternum', name: 'منتصف الصدر (القص)', symptom: 'ضغط خلف عظمة القص بالصدر (Sternum)' },
    { id: 'chest_left', name: 'الصدر الأيسر (جهة القلب)', symptom: 'نغزات بالصدر الأيسر (Heart region)' },
    { id: 'chest_right', name: 'الصدر الأيمن', symptom: 'ألم بالجانب الأيمن من الصدر' },
    { id: 'ribs_front', name: 'الأضلاع والقفص الصدري', symptom: 'ألم غضاريف الضلوع (Costochondritis)' },
  ],
  stomach: [
    { id: 'epigastric', name: 'البطن العلوي الأوسط (فم المعدة)', symptom: 'حرقة أو ومغص فم المعدة' },
    { id: 'ruq', name: 'أعلى البطن الأيمن (الكبد والمرارة)', symptom: 'مغص بالمرارة وأعلى البطن الأيمن (RUQ)' },
    { id: 'luq', name: 'أعلى البطن الأيسر (الطحال)', symptom: 'ألم بأعلى البطن الأيسر (LUQ)' },
  ],
  pelvis: [
    { id: 'rlq', name: 'أسفل البطن الأيمن (الزائدة)', symptom: 'ألم حاد أسفل البطن الأيمن (RLQ/Appendicitis)' },
    { id: 'llq', name: 'أسفل البطن الأيسر', symptom: 'مغص معوي أسفل البطن الأيسر (LLQ)' },
    { id: 'suprapubic', name: 'منطقة العانة والمثانة', symptom: 'ألم في أسفل البطن الأوسط (Suprapubic)' },
    { id: 'ovary_r', name: 'المبيض الأيمن / الحوض الأيمن', symptom: 'ألم وخز بموضع المبيض الأيمن' },
    { id: 'ovary_l', name: 'المبيض الأيسر / الحوض الأيسر', symptom: 'ألم وخز بموضع المبيض الأيسر' },
  ],
  arm_left: [
    { id: 'bicep_l', name: 'العضد (أعلى الذراع الأيسر)', symptom: 'ألم موضع عضد اليد اليسرى' },
    { id: 'elbow_l', name: 'المرفق / الكوع الأيسر', symptom: 'التهاب مفصل المرفق الأيس' },
    { id: 'forearm_l', name: 'الساعد الأيسر', symptom: 'تشنج الساعد الأيسر' },
  ],
  arm_right: [
    { id: 'bicep_r', name: 'العضد (أعلى الذراع الأيمن)', symptom: 'ألم موضع عضد اليد اليمنى' },
    { id: 'elbow_r', name: 'المرفق / الكوع الأيمن', symptom: 'التهاب مفصل المرفق الأيمن' },
    { id: 'forearm_r', name: 'الساعد الأيمن', symptom: 'تشنج الساعد الأيمن' },
  ],
  hand_left: [
    { id: 'wrist_l', name: 'معصم / رسغ اليد اليسرى', symptom: 'ألم المعصم الأيسر' },
    { id: 'fingers_l', name: 'أصابع اليد اليسرى ومفاصلها', symptom: 'ألم بمفاصل وأصابع يدي اليسرى' },
    { id: 'palm_l', name: 'راحة وكف اليد اليسرى', symptom: 'تنميل راحة اليد اليسرى' },
  ],
  hand_right: [
    { id: 'wrist_r', name: 'معصم / رسغ اليد اليمنى', symptom: 'ألم المعصم الأيمن' },
    { id: 'fingers_r', name: 'أصابع اليد اليمنى ومفاصلها', symptom: 'ألم بمفاصل وأصابع يدي اليمنى' },
    { id: 'palm_r', name: 'راحة وكف اليد اليمنى', symptom: 'تنميل راحة اليد اليمنى' },
  ],
  thigh_left: [
    { id: 'quad_l', name: 'عضلة الفخذ الأمامية اليسرى', symptom: 'تمزق أو ألم بعضلة الفخذ اليسرى' },
    { id: 'inner_th_l', name: 'الفخذ الداخلي الأيسر', symptom: 'ألم الورك الداخلي الأيسر' },
    { id: 'hip_l', name: 'مفصل الورك الأيسر', symptom: 'ألم بمفصل الورك الأيسر' },
  ],
  thigh_right: [
    { id: 'quad_r', name: 'عضلة الفخذ الأمامية اليمنى', symptom: 'تمزق أو ألم بعضلة الفخذ اليمنى' },
    { id: 'inner_th_r', name: 'الفخذ الداخلي الأيمن', symptom: 'ألم الورك الداخلي الأيمن' },
    { id: 'hip_r', name: 'مفصل الورك الأيمن', symptom: 'ألم بمفصل الورك الأيمن' },
  ],
  knee_left: [
    { id: 'patella_l', name: 'صابونة الركبة اليسرى', symptom: 'ألم بصابونة الركبة اليسرى' },
    { id: 'ligament_l', name: 'الأربطة للركبة اليسرى', symptom: 'ألم بأربطة الركبة اليسرى الجانبية' },
  ],
  knee_right: [
    { id: 'patella_r', name: 'صابونة الركبة اليمنى', symptom: 'ألم بصابونة الركبة اليمنى' },
    { id: 'ligament_r', name: 'الأربطة للركبة اليمنى', symptom: 'ألم بأربطة الركبة اليمنى الجانبية' },
  ],
  leg_left: [
    { id: 'shin_l', name: 'قصبة الساق اليسرى', symptom: 'ألم بقصبة الساق اليسرى' },
    { id: 'ankle_l', name: 'كاحل القدم الأيسر', symptom: 'ألم أو التواء بالكاحل الأيسر' },
  ],
  leg_right: [
    { id: 'shin_r', name: 'قصبة الساق اليمنى', symptom: 'ألم بقصبة الساق اليمنى' },
    { id: 'ankle_r', name: 'كاحل القدم الأيمن', symptom: 'ألم أو التواء بالكاحل الأيمن' },
  ],
  foot_left: [
    { id: 'sole_l', name: 'باطن القدم اليسرى', symptom: 'ألم باطن ونعل القدم اليسرى' },
    { id: 'toes_l', name: 'أصابع القدم اليسرى', symptom: 'ألم في أصابع القدم اليسرى' },
  ],
  foot_right: [
    { id: 'sole_r', name: 'باطن القدم اليمنى', symptom: 'ألم باطن ونعل القدم اليمنى' },
    { id: 'toes_r', name: 'أصابع القدم اليمنى', symptom: 'ألم في أصابع القدم اليمنى' },
  ],
  head_back: [
    { id: 'occipital', name: 'مؤخرة الرأس / القفا', symptom: 'صداع التوتر خلف الرأس' },
    { id: 'skull_base', name: 'قاعدة الجمجمة', symptom: 'ألم ممتد بقاعدة الجمجمة من الخلف' },
  ],
  neck_back: [
    { id: 'cervical', name: 'الفقرات العنقية', symptom: 'ألم بفقرات الرقبة الخلفية' },
    { id: 'neck_ext', name: 'عضلات العنق الخلفية', symptom: 'شد عضلي بالرقبة من الخلف' },
  ],
  shoulders_back: [
    { id: 'traps', name: 'عضلة الكتف شبه المنحرفة', symptom: 'شد بـ عضلة الترابيس الخلفية' },
    { id: 'scapula', name: 'لوح الكتف الخلفي', symptom: 'ألم تحت لوح الكتف الخلفي' },
  ],
  upper_back: [
    { id: 'thoracic', name: 'الفقرات الصدرية', symptom: 'شد بـ الفقرات الصدرية بأعلى الظهر' },
    { id: 'dorsal_muscles', name: 'عضلات الظهر العلوية', symptom: 'ألم بعضلات أوسط الظهر' },
  ],
  lower_back: [
    { id: 'lumbar', name: 'الفقرات القطنية', symptom: 'ألم أو غضروف الفقرات القطنية' },
    { id: 'flank_r', name: 'الخاصرة اليمنى (موقع الكلية الأيمن)', symptom: 'وجع خاصرة اليمين / الكلية اليمنى' },
    { id: 'flank_l', name: 'الخاصرة اليسرى (موقع الكلية الأيسر)', symptom: 'وجع خاصرة اليسار / الكلية اليسرى' },
  ],
  sacrum_back: [
    { id: 'coccyx', name: 'العصعص', symptom: 'ألم بعظمة العصعص القطنية' },
    { id: 'si_joints', name: 'المفاصل العجزية الحرقفية', symptom: 'التهاب المفصل العجزي الحرقفي' },
    { id: 'glute_l', name: 'الأرداف اليسرى', symptom: 'شد عضلي بالأرداف الخلفية اليسرى' },
    { id: 'glute_r', name: 'الأرداف اليمنى', symptom: 'شد عضلي بالأرداف الخلفية اليمنى' },
  ],
  thigh_left_back: [
    { id: 'hamstring_l', name: 'عضلات الفخذ الخلفية اليسرى', symptom: 'شد عضلات الفخذ الخلفية اليسرى' },
    { id: 'sciatica_l', name: 'مسار العصب الوركي (عرق النسا)', symptom: 'ألم ممتد عرق النسا بالرجل اليسرى' },
  ],
  thigh_right_back: [
    { id: 'hamstring_r', name: 'عضلات الفخذ الخلفية اليمنى', symptom: 'شد عضلات الفخذ الخلفية اليمنى' },
    { id: 'sciatica_r', name: 'مسار العصب الوركي (عرق النسا)', symptom: 'ألم ممتد عرق النسا بالرجل اليمنى' },
  ],
  calf_left: [
    { id: 'gastro_l', name: 'عضلة البطة', symptom: 'تشنج أو تمزق بعضلة الساق اليسرى' },
    { id: 'achilles_l', name: 'وتر أخيل / عرقوب القدم الأيسر', symptom: 'التهاب وتر أخيل الأيسر' },
  ],
  calf_right: [
    { id: 'gastro_r', name: 'عضلة البطة', symptom: 'تشنج أو تمزق بعضلة الساق اليمنى' },
    { id: 'achilles_r', name: 'وتر أخيل / عرقوب القدم الأيمن', symptom: 'التهاب وتر أخيل الأيمن' },
  ],
  heel_left: [
    { id: 'heel_bone_l', name: 'عظمة الكعب الأيسر', symptom: 'نتوء ومهماز كعب القدم الأيسر' },
  ],
  heel_right: [
    { id: 'heel_bone_r', name: 'عظمة الكعب الأيمن', symptom: 'نتوء ومهماز كعب القدم الأيمن' },
  ],
};

export default function SymptomTracker() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFastingMode } = useAppContext();

  // Basic States
  const [painLevel, setPainLevel] = useState(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [focusedRegion, setFocusedRegion] = useState<BodyRegion | null>(null);
  const [impact, setImpact] = useState<string>('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [medication, setMedication] = useState('');
  const [relief, setRelief] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Advanced States for Clinical Precision
  const [bodyView, setBodyView] = useState<'front' | 'back'>('front');
  const [painType, setPainType] = useState<string>(''); // طبيعة الألم
  const [frequency, setFrequency] = useState<string>(''); // وتيرة الألم
  const [activeCategory, setActiveCategory] = useState<string>('pain');
  
  // High-precision Date and Time
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().split(' ')[0].substring(0, 5);
  const [onsetDate, setOnsetDate] = useState(defaultDate);
  const [onsetHour, setOnsetHour] = useState(defaultTime);

  // Vitals states
  const [showVitals, setShowVitals] = useState(false);
  const [vitalsTemp, setVitalsTemp] = useState('');
  const [vitalsBPSys, setVitalsBPSys] = useState('');
  const [vitalsBPMax, setVitalsBPMax] = useState(''); // Systolic
  const [vitalsBPMin, setVitalsBPMin] = useState(''); // Diastolic
  const [vitalsSugar, setVitalsSugar] = useState('');

  // Front anatomical map regions
  const frontRegions: BodyRegion[] = [
    { id: 'head_front', name: 'الرأس / الجبهة', symptom: 'صداع (مقدمة الرأس)', style: { top: '6%', left: '49%', transform: 'translateX(-50%)', width: '30px', height: '30px', borderRadius: '50%' } },
    { id: 'neck_front', name: 'الرقبة والبلعوم', symptom: 'ألم الرقبة (من الأمام)', style: { top: '15%', left: '49%', transform: 'translateX(-50%)', width: '20px', height: '14px', borderRadius: '4px' } },
    { id: 'shoulder_left', name: 'الكتف الأيسر', symptom: 'ألم في الكتف الأيسر', style: { top: '19%', left: '31%', width: '18px', height: '18px', borderRadius: '50%' } },
    { id: 'shoulder_right', name: 'الكتف الأيمن', symptom: 'ألم في الكتف الأيمن', style: { top: '19%', right: '31%', width: '18px', height: '18px', borderRadius: '50%' } },
    { id: 'chest', name: 'منطقة الصدر', symptom: 'ألم في الصدر', style: { top: '23%', left: '49%', transform: 'translateX(-50%)', width: '48px', height: '32px', borderRadius: '12px' } },
    { id: 'stomach', name: 'المعدة والبطن العلوي', symptom: 'ألم في المعدة (البطن العلوي)', style: { top: '32%', left: '49%', transform: 'translateX(-50%)', width: '42px', height: '24px', borderRadius: '8px' } },
    { id: 'pelvis', name: 'الحوض وأسفل البطن', symptom: 'مغص أسفل البطن / الحوض', style: { top: '40%', left: '49%', transform: 'translateX(-50%)', width: '46px', height: '28px', borderRadius: '6px' } },
    { id: 'arm_left', name: 'الذراع الأيسر', symptom: 'ألم في الذراع الأيسر', style: { top: '26%', left: '22%', width: '16px', height: '45px', borderRadius: '10px' } },
    { id: 'arm_right', name: 'الذراع الأيمن', symptom: 'ألم في الذراع الأيمن', style: { top: '26%', right: '22%', width: '16px', height: '45px', borderRadius: '10px' } },
    { id: 'hand_left', name: 'اليد اليسرى والرسغ', symptom: 'ألم في اليد اليسرى', style: { top: '39%', left: '18%', width: '16px', height: '16px', borderRadius: '50%' } },
    { id: 'hand_right', name: 'اليد اليمنى والرسغ', symptom: 'ألم في اليد اليمنى', style: { top: '39%', right: '18%', width: '16px', height: '16px', borderRadius: '50%' } },
    { id: 'thigh_left', name: 'الفخذ الأيسر', symptom: 'ألم في الفخذ الأيسر', style: { top: '50%', left: '35%', width: '22px', height: '52px', borderRadius: '12px' } },
    { id: 'thigh_right', name: 'الفخذ الأيمن', symptom: 'ألم في الفخذ الأيمن', style: { top: '50%', right: '35%', width: '22px', height: '52px', borderRadius: '12px' } },
    { id: 'knee_left', name: 'الركبة اليسرى', symptom: 'ألم في الركبة اليسرى', style: { top: '65%', left: '35%', width: '20px', height: '20px', borderRadius: '50%' } },
    { id: 'knee_right', name: 'الركبة اليمنى', symptom: 'ألم في الركبة اليمنى', style: { top: '65%', right: '35%', width: '20px', height: '20px', borderRadius: '50%' } },
    { id: 'leg_left', name: 'الساق اليسرى والكاحل', symptom: 'ألم الساق والكاحل الأيسر', style: { top: '72%', left: '35%', width: '18px', height: '50px', borderRadius: '10px' } },
    { id: 'leg_right', name: 'الساق اليمنى والكاحل', symptom: 'ألم الساق والكاحل الأيمن', style: { top: '72%', right: '35%', width: '18px', height: '50px', borderRadius: '10px' } },
    { id: 'foot_left', name: 'القدم اليسرى', symptom: 'ألم القدم اليسرى', style: { top: '88%', left: '33%', width: '20px', height: '14px', borderRadius: '4px' } },
    { id: 'foot_right', name: 'القدم اليمنى', symptom: 'ألم القدم اليمنى', style: { top: '88%', right: '33%', width: '20px', height: '14px', borderRadius: '4px' } }
  ];

  // Back anatomical map regions
  const backRegions: BodyRegion[] = [
    { id: 'head_back', name: 'الرأس من الخلف / القفا', symptom: 'صداع (خلف الرأس)', style: { top: '6%', left: '49%', transform: 'translateX(-50%)', width: '30px', height: '30px', borderRadius: '50%' } },
    { id: 'neck_back', name: 'الرقبة من الخلف / العنق', symptom: 'ألم الرقبة من الخلف', style: { top: '15%', left: '49%', transform: 'translateX(-50%)', width: '20px', height: '14px', borderRadius: '4px' } },
    { id: 'shoulders_back', name: 'أعلى الظهر والكتفين الخلفيين', symptom: 'ألم في الأكتاف (الخلف)', style: { top: '19%', left: '49%', transform: 'translateX(-50%)', width: '74px', height: '14px', borderRadius: '30px' } },
    { id: 'upper_back', name: 'أعلى وأوسط الظهر', symptom: 'ألم أعلى وأوسط الظهر', style: { top: '24%', left: '49%', transform: 'translateX(-50%)', width: '48px', height: '38px', borderRadius: '10px' } },
    { id: 'lower_back', name: 'أسفل الظهر / الفقرات القطنية', symptom: 'ألم أسفل الظهر (القطنية)', style: { top: '35%', left: '49%', transform: 'translateX(-50%)', width: '48px', height: '26px', borderRadius: '8px' } },
    { id: 'sacrum_back', name: 'الحوض والعجز من الخلف', symptom: 'ألم في الحوض / العجزية', style: { top: '42%', left: '49%', transform: 'translateX(-50%)', width: '46px', height: '22px', borderRadius: '6px' } },
    { id: 'thigh_left_back', name: 'الفخذ الأيسر من الخلف', symptom: 'ألم أوتار الركبة اليسرى', style: { top: '50%', left: '35%', width: '22px', height: '52px', borderRadius: '12px' } },
    { id: 'thigh_right_back', name: 'الفخذ الأيمن من الخلف', symptom: 'ألم أوتار الركبة اليمنى', style: { top: '50%', right: '35%', width: '22px', height: '52px', borderRadius: '12px' } },
    { id: 'calf_left', name: 'ربلة الساق اليسرى (البطة)', symptom: 'ألم في ربلة الساق اليسرى', style: { top: '71%', left: '35%', width: '18px', height: '45px', borderRadius: '10px' } },
    { id: 'calf_right', name: 'ربلة الساق اليمنى (البطة)', symptom: 'ألم في ربلة الساق اليمنى', style: { top: '71%', right: '35%', width: '18px', height: '45px', borderRadius: '10px' } },
    { id: 'heel_left', name: 'كعب القدم الأيسر', symptom: 'ألم الكعب الأيسر', style: { top: '88%', left: '33%', width: '20px', height: '14px', borderRadius: '4px' } },
    { id: 'heel_right', name: 'كعب القدم الأيمن', symptom: 'ألم الكعب الأيمن', style: { top: '88%', right: '33%', width: '20px', height: '14px', borderRadius: '4px' } }
  ];

  const currentRegions = bodyView === 'front' ? frontRegions : backRegions;

  const allAnatomicalSymptoms = useMemo(() => {
    const mainList = frontRegions.concat(backRegions).map(r => r.symptom);
    const subList = Object.values(subRegionsMap).flatMap(subs => subs.map(s => s.symptom));
    return [...mainList, ...subList];
  }, [frontRegions, backRegions]);

  // Static list for non-interactive symptoms (or list manual toggle)
  const symptomsList = [
    // General
    { name: 'إرهاق', category: 'general' },
    { name: 'دوخة', category: 'general' },
    { name: 'حمى', category: 'general' },
    { name: 'هبات ساخنة', category: 'general' },
    { name: 'قشعريرة', category: 'general' },
    // Digestion
    { name: 'إسهال', category: 'digestion' },
    { name: 'إمساك', category: 'digestion' },
    { name: 'غثيان', category: 'digestion' },
    { name: 'حموضة', category: 'digestion' },
    { name: 'انتفاخ المعدة', category: 'digestion' },
    // Neurological/Mood
    { name: 'تقلب مزاجي', category: 'mood' },
    { name: 'قلق', category: 'mood' },
    { name: 'ضبابية الدماغ', category: 'mood' },
    { name: 'أرق', category: 'mood' },
    // Pain General
    { name: 'صداع', category: 'pain' },
    { name: 'ألم مفاصل', category: 'pain' },
    { name: 'ألم عضلات', category: 'pain' },
    { name: 'مغص', category: 'pain' },
    { name: 'ألم أسفل الظهر', category: 'pain' },
  ];

  // Human body clickable hotspot toggler
  const handleToggleRegion = (region: BodyRegion) => {
    setFocusedRegion(region); // Zoom-in on the selected region to show detailed anatomy sub-regions
    setSelectedSymptoms(prev => {
      const exists = prev.includes(region.symptom);
      if (exists) {
        const subSymptoms = subRegionsMap[region.id]?.map(sr => sr.symptom) || [];
        return prev.filter(s => s !== region.symptom && !subSymptoms.includes(s));
      } else {
        return [...prev, region.symptom];
      }
    });
  };

  const handleToggleSymptom = (name: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const triggerOptions = [
    'قلة نوم', 'تعب بدني', 'ضغط نفسي', 'نوعية أكل', 'مجهود رياضي', 'دورة شهرية', 'أدوية علاجية'
  ];

  const handleToggleTrigger = (name: string) => {
    setTriggers(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const suggestedRemedies = useMemo(() => {
    const remedies = [];
    const hasSymptom = (keyword: string) => selectedSymptoms.some(s => s.toLowerCase().includes(keyword));
    
    if (hasSymptom('صداع') || hasSymptom('رأس')) {
      remedies.push({ 
        name: 'شرب ماء وراحة للعينين', 
        icon: '💧', 
        desc: 'تأكدي من ترطيب جسمك والابتعاد تماماً عن شاشات الموبايل والجلوس في مكان خافت الإضاءة وهادئ.'
      });
    }
    if (hasSymptom('مغص') || hasSymptom('بطن') || hasSymptom('ظهر')) {
      remedies.push({ 
        name: 'قرفة أو مشروب دافئ مع كمادات', 
        icon: '🪵', 
        desc: 'شرب منقوع القرفة أو النعناع واستخدام قربة ماء دافئ على الظهر أو أسفل البطن لتسكين انقباض الأوعية والرحم.'
      });
    }
    if (hasSymptom('أرق') || hasSymptom('قلق') || hasSymptom('مزاج')) {
      remedies.push({ 
        name: 'مشروب بابونج دافئ مهدئ', 
        icon: '🌼', 
        desc: 'يُساعد البابونج بشكل استثنائي في تهدئة الخلايا الدماغية، وخفض الكورتيزول وتحفيز الاسترخاء الطبيعي.'
      });
    }
    if (hasSymptom('غثيان')) {
      remedies.push({ 
        name: 'منقوع الزنجبيل الطازج', 
        icon: '🫚', 
        desc: 'الزنجبيل يحتوي على مركبات الجينجيرول التي تُكافح الغثيان وتهدئ التقلبات المعوية وحركة جدران المعدة.'
      });
    }
    if (hasSymptom('معدة') || hasSymptom('انتفاخ') || hasSymptom('حموضة')) {
      remedies.push({ 
        name: 'شرب الكمون اللطيف أو النعناع', 
        icon: '🌿', 
        desc: 'الكمون المطبوخ الدافئ يطرد الغازات بكفاءة عالية، بينما النعناع يخفف تشنجات المعدة والحموضة المرتفعة.'
      });
    }
    if (hasSymptom('مفاصل') || hasSymptom('ركبة') || hasSymptom('كتف') || hasSymptom('ذراع')) {
      remedies.push({ 
        name: 'راحة مفصلية وتدليك زيتي لطيف', 
        icon: '💆‍♀️', 
        desc: 'استخدمي حركات تدليك دائرية لطيفة باستعمال زيت طبيعي دافئ (زيت زيتون أو سمسم) لزيادة تدفق الدم الموضعي.'
      });
    }
    return remedies;
  }, [selectedSymptoms]);

  // Handle saving to database or locally
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const logData = {
      painLevel,
      symptoms: selectedSymptoms,
      impact,
      triggers,
      medication,
      relief,
      notes,
      painType,
      frequency,
      onsetDate,
      onsetHour,
      vitals: showVitals ? {
        temp: vitalsTemp ? parseFloat(vitalsTemp) : null,
        bpMax: vitalsBPMax ? parseInt(vitalsBPMax) : null,
        bpMin: vitalsBPMin ? parseInt(vitalsBPMin) : null,
        sugar: vitalsSugar ? parseFloat(vitalsSugar) : null,
      } : null,
      timestamp: Date.now()
    };

    try {
      if (user.uid === 'local_guest_user') {
        const saved = localStorage.getItem('local_symptoms') || '[]';
        const list = JSON.parse(saved);
        list.unshift({ id: `local_${Date.now()}`, ...logData });
        localStorage.setItem('local_symptoms', JSON.stringify(list));
        window.dispatchEvent(new Event('localSymptomsUpdated'));
      } else {
        await addDoc(collection(db, 'users', user.uid, 'symptoms'), logData);
      }
      navigate(-1);
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/symptoms`);
       setIsSaving(false);
    }
  };

  // Preset Date Time Selectors
  const applyTimePreset = (minutesAgo: number) => {
    const targetDate = new Date(Date.now() - minutesAgo * 60 * 1000);
    setOnsetDate(targetDate.toISOString().split('T')[0]);
    setOnsetHour(targetDate.toTimeString().split(' ')[0].substring(0, 5));
  };

  const getPainLevelDescription = () => {
    if (painLevel === 0) return 'لا يوجد أي ألم أو تعب عافية كاملة 🤸‍♀️';
    if (painLevel <= 2) return 'ألم أو انزعاج طفيف جداً لا يؤثر على أي نشاط 🙂';
    if (painLevel <= 4) return 'ألم خفيف ومزعج قليلاً ولكنه تحت السيطرة والمقاومة 😐';
    if (painLevel <= 6) return 'ألم متوسط وواضح يشوش التركيز ويحتاج لتمهل وراحة متكررة 😕';
    if (painLevel <= 8) return 'ألم شديد يعيق عن المهام الطبيعية ويصعب الصبر عليه ☹️';
    return 'ألم شديد للغاية غير محتمل، يُنصح بالراحة الطارئة واستشارة مهنية 😭';
  };

  return (
    <div className={cn("min-h-[100dvh] pb-32 transition-colors duration-500", isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#1A1A1A] text-gray-900 dark:text-gray-100")}>
      
      {/* Premium Medical Header */}
      <div className={cn("px-6 pt-10 pb-4 sticky top-0 z-30 backdrop-blur-md", isFastingMode ? "bg-[#1A1A1A]/90 border-b border-[#3D3834]" : "bg-[#FDFBF7]/90 dark:bg-[#1A1A1A]/90 border-b border-[#F0EBE1] dark:border-white/5")}>
        <div className="flex items-center gap-4 flex-row-reverse">
          <button onClick={() => navigate(-1)} className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-95", 
            isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-[#F0EBE1] dark:border-white/5 text-gray-500 hover:text-[#1A4D42]"
          )}>
             <ChevronRight className="w-5 h-5" />
          </button>
          <div className="flex-1 text-right">
             <h1 className={cn("text-xl font-black tracking-tight", isFastingMode ? "text-amber-100" : "text-[#1A4D42] dark:text-emerald-400")}>تسجيل عرضي الصحي</h1>
             <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">تحديد الموضع والخصائص والمؤشرات بدقة لمتابعة طبية دقيقة</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Level 1: Precise Date and Time of Onset */}
        <div className={cn("p-6 rounded-[28px] shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
          <h3 className="font-bold text-xs mb-3 text-right text-gray-400 flex items-center justify-end gap-1.5 flex-row-reverse">
             <span>توقيت بدء ظهور العرض</span>
             <Clock className="w-3.5 h-3.5 text-primary" />
          </h3>
          
          <div className="grid grid-cols-2 gap-3" dir="rtl">
            <div>
               <label className="text-[10px] font-bold text-gray-450 block mb-1">تاريخ البدء</label>
               <input 
                 type="date" 
                 value={onsetDate}
                 onChange={(e) => setOnsetDate(e.target.value)}
                 className="w-full text-xs font-bold rounded-xl p-3 bg-gray-50 dark:bg-black/15 border border-gray-100 dark:border-white/5 text-right font-sans"
               />
            </div>
            <div>
               <label className="text-[10px] font-bold text-gray-450 block mb-1">وقت البدء</label>
               <input 
                 type="time" 
                 value={onsetHour}
                 onChange={(e) => setOnsetHour(e.target.value)}
                 className="w-full text-xs font-bold rounded-xl p-3 bg-gray-50 dark:bg-black/15 border border-gray-100 dark:border-white/5 text-right font-sans"
               />
            </div>
          </div>

          {/* Time presets */}
          <div className="flex flex-wrap gap-2 flex-row-reverse mt-3">
             <button onClick={() => applyTimePreset(0)} className="px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold bg-primary/10 text-primary hover:bg-primary/20 transition-all">الآن</button>
             <button onClick={() => applyTimePreset(60)} className="px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-all text-gray-500">منذ ساعة</button>
             <button onClick={() => applyTimePreset(240)} className="px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-all text-gray-500">منذ ٤ ساعات</button>
             <button onClick={() => applyTimePreset(720)} className="px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-all text-gray-500">منذ الصباح</button>
          </div>
        </div>
        
        {/* Level 2: Modern Interactive Pain Scale */}
        <div className={cn("p-6 rounded-[28px] shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
           <h3 className="font-bold text-center text-xs text-gray-400 mb-4">شدة الألم أو عدم الارتياح العام</h3>
           
           {/* Color & Icon Stage */}
           <div className="flex justify-between items-center mb-5 px-4">
              <div className="flex flex-col items-center gap-1.5">
                 <Smile className={cn("w-10 h-10 transition-all duration-300", painLevel <= 2 ? "text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-110" : "text-gray-300 dark:text-gray-700")} />
                 <span className="text-[10px] font-extrabold text-gray-400">خفيف جداً</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                 <Meh className={cn("w-10 h-10 transition-all duration-300", painLevel > 2 && painLevel <= 6 ? "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] scale-110" : "text-gray-300 dark:text-gray-700")} />
                 <span className="text-[10px] font-extrabold text-gray-400">متوسط</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                 <Frown className={cn("w-10 h-10 transition-all duration-300", painLevel > 6 ? "text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.7)] scale-110" : "text-gray-300 dark:text-gray-700")} />
                 <span className="text-[10px] font-extrabold text-gray-400">شديد وقاسي</span>
              </div>
           </div>

           {/* Precision Slider Gauge */}
           <div className="relative px-2 py-5">
                {/* Track */}
                <div className="absolute top-1/2 left-2 right-2 h-4 bg-gray-100 dark:bg-black/20 rounded-full -translate-y-1/2 overflow-hidden shadow-inner border border-gray-200/20">
                   <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-emerald-400 via-amber-400 to-rose-500 transition-all" style={{ width: `${(painLevel / 10) * 100}%` }} />
                </div>
                
                <input 
                  type="range" 
                  min="0" max="10" 
                  value={painLevel} 
                  onChange={(e) => setPainLevel(parseInt(e.target.value))}
                  className="w-full absolute top-1/2 left-0 -translate-y-1/2 opacity-0 cursor-pointer h-full z-10" 
                  dir="rtl"
                />

                {/* Thumb indicator (visual magic) */}
                <div 
                  className="w-8 h-8 bg-white border-4 rounded-full absolute top-1/2 -translate-y-1/2 shadow-xl hover:scale-110 transition-all duration-150 pointer-events-none flex items-center justify-center font-black text-[10px]" 
                  style={{ 
                     right: `${(painLevel / 10) * 100}%`, 
                     marginRight: '-16px',
                     borderColor: painLevel === 0 ? '#10B981' : painLevel <= 3 ? '#34D399' : painLevel <= 6 ? '#F59E0B' : painLevel <= 8 ? '#EF4444' : '#BE123C',
                     color: painLevel === 0 ? '#10B981' : painLevel <= 3 ? '#047857' : painLevel <= 6 ? '#B45309' : '#B91C1C'
                  }} 
                >
                   {painLevel}
                </div>
           </div>
           
           {/* Level Indicator Badge */}
           <div className="bg-gray-50 dark:bg-black/15 p-3 rounded-2xl text-center text-xs mt-2 border border-gray-100 dark:border-white/5">
              <p className="font-extrabold text-[#1A4D42] dark:text-emerald-400 transition-all duration-300">
                {getPainLevelDescription()}
              </p>
           </div>
        </div>

        {/* Level 3: Dual-Mode Interactive Detailed Pain Map */}
        <div className={cn("p-6 rounded-[28px] shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
           <div className="flex justify-between items-center mb-6 flex-row-reverse text-right">
              <div>
                 <h3 className="font-black text-sm flex items-center justify-end gap-1.5 flex-row-reverse">
                    <span>موقع الألم التفصيلي</span>
                    <MapPin className="w-4 h-4 text-rose-500" />
                 </h3>
                 <p className="text-[10px] text-gray-400 block mt-0.5">اضغطي الموضع لتسجيل بؤرة الوجع بدقة</p>
              </div>
              
              {/* Toggle Front vs Back */}
              <div className="bg-gray-100 dark:bg-black/20 p-1 rounded-xl flex gap-1 border border-gray-200/50 dark:border-white/5">
                 <button 
                   onClick={() => setBodyView('back')} 
                   className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-1", 
                     bodyView === 'back' ? "bg-white dark:bg-[#1A1A1A] text-rose-500 shadow-sm" : "text-gray-400"
                   )}
                 >
                    الجهة الخلفية
                 </button>
                 <button 
                   onClick={() => setBodyView('front')} 
                   className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black transition-all flex items-center gap-1", 
                     bodyView === 'front' ? "bg-white dark:bg-[#1A1A1A] text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-400"
                   )}
                 >
                    الجهة الأمامية
                 </button>
              </div>
           </div>
           
           {/* Silhouette Canvas */}
           <div className="relative flex justify-center items-center py-6">
              
              {/* Silhouette Container Frame */}
              <div className={cn("relative w-56 h-[25rem] rounded-[2.5rem] border shadow-inner transition-colors duration-300 overflow-hidden mx-auto", 
                isFastingMode ? "bg-black/20 border-[#3D3834]" : "bg-gray-50/50 dark:bg-black/25 border-gray-200/40 dark:border-white/5"
              )}>
                 
                 {/* Vector Silhouette Outline */}
                 <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g opacity={bodyView === 'front' ? "0.19" : "0.14"} className="text-[#1A4D42] dark:text-emerald-500 transition-opacity">
                      {/* Head */}
                      <circle cx="100" cy="45" r="18" fill="currentColor" />
                      {/* Neck */}
                      <rect x="94" y="61" width="12" height="12" rx="2" fill="currentColor" />
                      {/* Shoulders and Torso */}
                      <path d="M72,73 Q100,68 128,73 C138,76 138,82 138,88 L134,180 C134,188 126,194 118,194 L82,194 C74,194 66,188 66,180 L62,88 C62,82 62,76 72,73 Z" fill="currentColor" />
                      {/* Left Arm */}
                      <path d="M58,78 C52,78 46,84 46,92 L40,165 C40,172 45,178 52,178 C58,178 62,172 62,165 L60,92 C60,84 64,78 58,78 Z" fill="currentColor" />
                      {/* Right Arm */}
                      <path d="M142,78 C148,78 154,84 154,92 L160,165 C160,172 155,178 148,178 C142,178 138,172 138,165 L140,92 C140,84 136,78 142,78 Z" fill="currentColor" />
                      {/* Pelvis and Legs */}
                      <path d="M74,194 L126,194 C132,194 134,198 132,204 L114,354 C112,362 106,368 98,368 C90,368 84,362 82,354 L68,204 C66,198 68,194 74,194 Z" fill="currentColor" />
                    </g>
                 </svg>

                 {/* Interactive Glowing Dots & Pulsars */}
                 {currentRegions.map((region) => {
                    const isSelected = selectedSymptoms.includes(region.symptom);
                    return (
                        <button
                          key={region.id}
                          style={region.style}
                          onClick={() => handleToggleRegion(region)}
                          className={cn(
                              "absolute group transition-all duration-300 flex items-center justify-center select-none outline-none border cursor-pointer",
                              isSelected 
                                ? "bg-rose-500 border-white shadow-[0_0_14px_#EF4444] z-20 scale-125 animate-pulse" 
                                : "bg-emerald-500/10 border-emerald-500/40 hover:bg-rose-500/25 dark:border-emerald-500/30 z-10"
                          )}
                          title={region.name}
                        >
                          {/* Inner dot or check */}
                          {isSelected ? (
                            <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 group-hover:bg-rose-500" />
                          )}

                          {/* Pulsation ring for active regions */}
                          {isSelected && (
                            <span className="absolute -inset-2.5 rounded-full border border-rose-500/40 animate-ping pointer-events-none" />
                          )}
                        </button>
                    );
                 })}
                 
                 {/* Subtle helper text overlay - center */}
                 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 px-2.5 py-1 rounded-full text-[8px] text-white backdrop-blur-xs font-black select-none font-sans pointer-events-none">
                    {bodyView === 'front' ? 'واجهة أمامية' : 'واجهة خلفية'}
                 </div>
              </div>
           </div>

           {/* Listed anatomy selections details */ }

            {/* Dynamic Drill-Down Detailed Sub-regions Panel */}
            {focusedRegion && subRegionsMap[focusedRegion.id] ? (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }} 
                 animate={{ opacity: 1, height: 'auto' }}
                 className={cn("p-5 rounded-3xl mb-6 border text-right transition-all backdrop-blur-md relative", 
                   isFastingMode 
                     ? "bg-[#2D2824] border-amber-500/30 text-white" 
                     : "bg-[#1A4D42]/5 border-[#1A4D42]/10 dark:bg-emerald-950/15 dark:border-emerald-900/40"
                 )}
                 dir="rtl"
               >
                 {/* Close Button absolute top-left */}
                 <button 
                   onClick={() => setFocusedRegion(null)}
                   className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-black/35 dark:hover:bg-black/50 text-gray-500 hover:text-rose-500 transition-all font-bold text-sm"
                   title="إغلاق التحديد التفصيلي"
                 >
                   ×
                 </button>

                 <div className="flex items-center gap-1.5 mb-2 mt-1 justify-start">
                   <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                   <h4 className="font-extrabold text-xs text-rose-600 dark:text-rose-400">
                     التفاصيل ومواضع الألم الدقيقة لـ ({focusedRegion.name})
                   </h4>
                 </div>
                 
                 <p className="text-[10px] text-gray-400 dark:text-gray-400 mb-3.5 leading-relaxed font-bold pl-8">
                   اضغطي على الأجزاء المعينة أو الجيوب الدقيقة الحساسة أو المؤلمة لتحديد العرض بدقة بالغة ومتابعة بؤرة الوجع:
                 </p>
                 
                 <div className="grid grid-cols-2 gap-2">
                   {subRegionsMap[focusedRegion.id].map((sub) => {
                     const isSubSelected = selectedSymptoms.includes(sub.symptom);
                     return (
                       <button
                         key={sub.id}
                         onClick={() => {
                           handleToggleSymptom(sub.symptom);
                           // Automatically make sure the parent region is checked as well for clinical consistency
                           setSelectedSymptoms(prev => {
                             if (!prev.includes(focusedRegion.symptom)) {
                               return [...prev, focusedRegion.symptom];
                             }
                             return prev;
                             });
                         }}
                         className={cn("p-2.5 rounded-xl text-[10.5px] font-bold text-right border transition-all active:scale-95 duration-100 flex items-center justify-between gap-1.5", 
                           isSubSelected 
                             ? "bg-rose-500 text-white border-rose-450 shadow-md shadow-rose-500/15" 
                             : (isFastingMode 
                               ? "bg-black/20 text-gray-300 border-white/5 hover:bg-white/5" 
                               : "bg-white dark:bg-black/25 text-gray-700 dark:text-gray-300 border-gray-150 dark:border-white/5 hover:border-gray-200")
                         )}
                       >
                         <span>{sub.name}</span>
                         {isSubSelected ? (
                           <Check className="w-3.5 h-3.5 text-white bg-rose-600 rounded-full p-0.5 shrink-0" />
                         ) : (
                           <div className="w-3.5 h-3.5 rounded-full border border-gray-305 dark:border-white/20 shrink-0" />
                         )}
                       </button>
                     );
                   })}
                 </div>
               </motion.div>
            ) : focusedRegion ? (
               <div className="p-4 rounded-3xl mb-6 bg-gray-50 dark:bg-black/10 text-center text-[10px] text-gray-450 font-bold border border-dashed border-gray-150" dir="rtl">
                 عفواً، لا توجد تفاصيل دقيقة إضافية لـ ({focusedRegion.name}). لقد تم تحديد موضع الألم بالكامل.
               </div>
            ) : null}

            {/*  Listed anatomy selections details */}
           <div className="space-y-3">
              <div className="flex justify-between items-center text-right flex-row-reverse">
                 <h4 className="text-[11px] font-black text-gray-400">المواضع والتفاصيل الدقيقة المختارة:</h4>
                 {selectedSymptoms.length > 0 && (
                   <button 
                     onClick={() => {
                       setSelectedSymptoms(prev => prev.filter(s => !allAnatomicalSymptoms.includes(s))); setFocusedRegion(null);
                     }}
                     className="text-[10px] font-bold text-rose-500 flex items-center gap-1 hover:underline transition-all"
                   >
                     <span>إلغاء تحديد الجسم</span>
                     <RotateCcw className="w-3 h-3" />
                   </button>
                 )}
              </div>
              
              {selectedSymptoms.filter(s => allAnatomicalSymptoms.includes(s)).length === 0 ? (
                 <div className="p-3 text-center border border-dashed border-gray-100 dark:border-white/5 rounded-2xl bg-gray-50/50 dark:bg-black/10">
                    <p className="text-[10px] text-gray-400 font-bold">لا توجد نقطة ألم فسيولوجية محددة بعد</p>
                 </div>
              ) : (
                 <div className="flex flex-wrap gap-2 flex-row-reverse">
                    {selectedSymptoms.filter(s => allAnatomicalSymptoms.includes(s)).map((sName, index) => (
                       <span 
                         key={index} 
                         onClick={() => setSelectedSymptoms(prev => prev.filter(v => v !== sName))}
                         className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/40 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer hover:bg-rose-100/50 transition-all flex-row-reverse"
                       >
                          <span>{sName}</span>
                          <span className="text-[9px] cursor-pointer font-sans">×</span>
                       </span>
                    ))}
                 </div>
              )}
           </div>

           {/* Pain Character Block: Sharp, dull, throbbing */}
           {selectedSymptoms.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/5 pt-4 mt-4 space-y-3">
                 <h4 className="text-right text-[11px] font-black text-gray-400">طبيعة ونوع الوجع المتأصل</h4>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-row-reverse" dir="rtl">
                    {[
                      { id: 'throbbing', name: 'نبض مستمر (Throbbing)' },
                      { id: 'sharp', name: 'وخز حاد / طعنات (Sharp)' },
                      { id: 'dull', name: 'ثقيل ومبهم (Dull)' },
                      { id: 'burning', name: 'حرقان / حرارة (Burning)' },
                      { id: 'crampy', name: 'مغص / تقلصات (Crampy)' },
                      { id: 'other', name: 'أخرى' }
                    ].map((type) => (
                       <button
                         key={type.id}
                         onClick={() => setPainType(painType === type.id ? '' : type.id)}
                         className={cn("p-2 rounded-xl text-[10px] font-bold text-center border transition-all active:scale-95", 
                           painType === type.id 
                             ? (isFastingMode ? "bg-amber-500/20 text-amber-500 border-amber-500" : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800") 
                             : "bg-gray-50 text-gray-500 border-transparent dark:bg-black/10 dark:text-gray-450"
                         )}
                       >
                          {type.name}
                       </button>
                    ))}
                 </div>
              </div>
           )}

           {/* Frequency Indicator */}
           {selectedSymptoms.length > 0 && (
              <div className="pt-3 space-y-3">
                 <h4 className="text-right text-[11px] font-black text-gray-400">وتيرة وتواتر الألم</h4>
                 <div className="grid grid-cols-2 gap-2 flex-row-reverse" dir="rtl">
                    {[
                      { id: 'constant', name: 'مستمر طوال الوقت' },
                      { id: 'intermittent', name: 'متقطع على نوبات' },
                      { id: 'waves', name: 'يأتي فجأة كالموجات' },
                      { id: 'progressive', name: 'يزداد تدريجياً' }
                    ].map((freq) => (
                       <button
                         key={freq.id}
                         onClick={() => setFrequency(frequency === freq.id ? '' : freq.id)}
                         className={cn("p-2 rounded-xl text-[10px] font-bold text-center border transition-all active:scale-95", 
                           frequency === freq.id 
                             ? (isFastingMode ? "bg-amber-500/20 text-amber-500 border-amber-500" : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900") 
                             : "bg-gray-50 text-gray-500 border-transparent dark:bg-black/10 dark:text-gray-450"
                         )}
                       >
                          {freq.name}
                       </button>
                    ))}
                 </div>
              </div>
           )}

        </div>

        {/* Level 4: Other Symptoms checklist (General, digestion, mood) */}
        <div className={cn("p-6 rounded-[28px] shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
           <div className="flex justify-between items-center mb-5 flex-row-reverse">
              <h3 className="font-bold text-xs text-gray-400 text-right">أعراض أخرى تشتكي منها؟</h3>
              
              <div className="flex bg-gray-100 dark:bg-black/20 p-1 rounded-xl gap-1 border border-gray-255/15">
                 {[
                   { id: 'pain', label: 'ألم فسيولوجي' },
                   { id: 'digestion', label: 'هضم وامتصاص' },
                   { id: 'mood', label: 'نفسية ومزاج' },
                   { id: 'general', label: 'عامة' }
                 ].map(cat => (
                   <button 
                      key={cat.id} 
                      onClick={() => setActiveCategory(cat.id)} 
                      className={cn("py-1 px-2.5 rounded-lg text-[9px] font-black transition-all", 
                        activeCategory === cat.id 
                          ? "bg-white dark:bg-[#1A1A1A] shadow-sm text-primary" 
                          : "text-gray-450 dark:text-gray-400"
                      )}
                   >
                      {cat.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex flex-wrap gap-2 flex-row-reverse justify-start">
              {symptomsList.filter(s => s.category === activeCategory).map((symptom, i) => {
                 const isSelected = selectedSymptoms.includes(symptom.name);
                 return (
                 <button 
                   key={i} 
                   onClick={() => handleToggleSymptom(symptom.name)}
                   className={cn(
                      "px-4 py-2 rounded-[16px] text-xs font-bold transition-all active:scale-95 border",
                      isSelected 
                        ? (isFastingMode ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-[#1A4D42] text-white border-[#1A4D42] shadow-sm") 
                        : (isFastingMode ? "bg-black/20 text-gray-400 border-white/5 hover:bg-white/5" : "bg-gray-50 text-gray-500 border-transparent hover:bg-white dark:bg-white/5 dark:border-white/10 dark:text-gray-400")
                   )}
                 >
                    {symptom.name}
                 </button>
              )})}
           </div>
        </div>

        {/* Level 5: Vitals Input Container (Stethoscope Style - Optional) */}
        <div className={cn("rounded-[30px] border overflow-hidden", isFastingMode ? "border-[#3D3834]" : "border-[#F0EBE1] dark:border-white/5")}>
           
           {/* Expand clickable rail */}
           <button 
             onClick={() => setShowVitals(!showVitals)}
             className={cn("w-full p-5 flex justify-between items-center flex-row-reverse transition-all", 
               isFastingMode ? "bg-black/10 hover:bg-black/20 text-white" : "bg-gray-50/50 hover:bg-gray-100/40 dark:bg-[#161719]/45 text-gray-900 dark:text-white"
             )}
           >
              <div className="flex items-center gap-2.5 flex-row-reverse text-right">
                 <div className="w-9 h-9 bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                 </div>
                 <div>
                    <h4 className="font-bold text-xs">إضافة مؤشرات حيوية اختيارية</h4>
                    <p className="text-[9px] text-gray-400 block mt-0.5">درجة الحرارة، ضغط الشرايين، ومستويات السكر</p>
                 </div>
              </div>
              <span className="text-[10px] font-black text-primary px-3 py-1 bg-white dark:bg-black/25 rounded-md border border-gray-100 dark:border-white/5">
                 {showVitals ? 'إخفاء' : 'إظهار +'}
              </span>
           </button>

           {showVitals && (
              <div className={cn("p-6 space-y-4 border-t transition-all", 
                isFastingMode ? "bg-[#29221C]/35 border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-gray-100 dark:border-white/5"
              )}>
                 
                 <div className="grid grid-cols-2 gap-4" dir="rtl">
                    {/* Temperature */}
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                          <span>درجة حرارة الجسم</span>
                       </label>
                       <div className="relative">
                          <input 
                            type="number" 
                            step="0.1"
                            min="35"
                            max="42"
                            placeholder="مثال: 37.0"
                            value={vitalsTemp}
                            onChange={(e) => setVitalsTemp(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl p-3 pr-10 text-left font-mono border bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 focus:ring-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-extrabold" dir="rtl">°م</span>
                       </div>
                       <span className="text-[8px] text-gray-400 block p-0.5">المعياري: 36.5° - 37.5°</span>
                    </div>

                    {/* Blood Sugar */}
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-gray-400 flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <span>نسبة السكر في الدم</span>
                       </label>
                       <div className="relative">
                          <input 
                            type="number" 
                            placeholder="مثال: 95"
                            value={vitalsSugar}
                            onChange={(e) => setVitalsSugar(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl p-3 pr-16 text-left font-mono border bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 focus:ring-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-gray-400 font-extrabold" dir="rtl">ملغ/دسل</span>
                       </div>
                       <span className="text-[8px] text-gray-400 block p-0.5">صائماً: 70 - 100 ملغ/دسل</span>
                    </div>
                 </div>

                 {/* Blood Pressure Range */}
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 block text-right">ضغط الدم الشرياني (SYS / DIA)</label>
                    <div className="grid grid-cols-2 gap-3" dir="rtl">
                       <div>
                          <input 
                            type="number" 
                            placeholder="الانقباضي (مثال: 120)"
                            value={vitalsBPMax}
                            onChange={(e) => setVitalsBPMax(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl p-3 text-center font-mono border bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5"
                          />
                       </div>
                       <div>
                          <input 
                            type="number" 
                            placeholder="الانبساطي (مثال: 80)"
                            value={vitalsBPMin}
                            onChange={(e) => setVitalsBPMin(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl p-3 text-center font-mono border bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5"
                          />
                       </div>
                    </div>
                    <span className="text-[8px] text-gray-400 block p-0.5 text-right">المعياري النموذجي: 120 / 80 ملم زئبقي</span>
                 </div>

              </div>
           )}
        </div>

        {/* Level 6: Impact & Daily Routine Interference */}
        <div className={cn("p-6 rounded-[28px] shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
            <h3 className="font-bold text-xs text-gray-400 mb-4 text-right">تأثير العرض على الأداء والروتين اليومي</h3>
            <div className="flex flex-col gap-2">
                {[
                    { id: 'none', label: 'لم يمنعني عن شيء (عادي ومستمر بيومي) 😊' },
                    { id: 'mild', label: 'أبطأ روتيني المعتاد قليلاً ولكني أجاهد للتكملة 🫤' },
                    { id: 'severe', label: 'توقفت تماماً عن النشاط واضطررت للراحة والاستلقاء 🛌' }
                ].map(opt => (
                    <button 
                        key={opt.id}
                        onClick={() => setImpact(opt.id)}
                        className={cn("w-full py-3 px-4 rounded-[18px] text-xs font-bold text-right transition-all border active:scale-95 duration-150", 
                            impact === opt.id 
                                ? (isFastingMode ? "bg-amber-500/20 text-text-amber-500 border-amber-500" : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800") 
                                : "bg-gray-50 text-gray-650 border-transparent dark:bg-black/10 dark:text-gray-400"
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Level 7: Triggers & Context */}
        <div className={cn("p-6 rounded-[28px] shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
           <h3 className="font-bold text-xs text-gray-400 mb-4">محفزات قد تكون عجلت بظهوره (اختياري)</h3>
           <div className="flex flex-wrap gap-2 flex-row-reverse text-right">
               {triggerOptions.map((trigger, i) => {
                  const isSelected = triggers.includes(trigger);
                  return (
                  <button 
                    key={i} 
                    onClick={() => handleToggleTrigger(trigger)}
                    className={cn(
                       "px-3 py-2.5 rounded-[16px] text-xs font-bold transition-all border",
                       isSelected 
                         ? (isFastingMode ? "bg-amber-500/20 text-amber-500 border-amber-500" : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-900") 
                         : (isFastingMode ? "bg-black/20 text-gray-400 border-white/5" : "bg-gray-50 text-gray-550 border-transparent dark:bg-black/10")
                    )}
                  >
                     {trigger}
                  </button>
               )})}
           </div>
        </div>

        {/* Level 8: Medication intake and tracking Relief */}
        {selectedSymptoms.length > 0 && (
           <div className={cn("p-6 rounded-[28px] shadow-sm border text-right", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
              <h3 className="font-bold text-xs text-gray-400 mb-4">هل تناولتِ أي مسكن أو علاج مخصص؟</h3>
              <input 
                 type="text" 
                 value={medication}
                 onChange={(e) => setMedication(e.target.value)}
                 className={cn("w-full border rounded-xl p-3.5 text-xs font-bold focus:outline-none focus:ring-2 focus:border-transparent mb-4 text-right", 
                   isFastingMode ? "bg-[#1A1A1A] border-[#3D3834] focus:ring-amber-500 text-white" : "bg-gray-50 dark:bg-black/20 border-gray-100 dark:border-white/5 focus:ring-[#1A4D42] text-gray-900 dark:text-white"
                 )}
                 placeholder="اسم الدواء (مثل: بنادول، بروفين، دواء السكر...)"
                 dir="rtl"
              />
              
              {medication && (
                 <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black text-gray-400 mb-1">مدى استجابة الجسم للفائدة والتحسن:</p>
                    <div className="flex gap-2 flex-row-reverse">
                       {['تحسن تام ومثالي', 'تحسن جزئي طفيف', 'لم يتأثر الألم'].map(opt => (
                          <button 
                             key={opt}
                             onClick={() => setRelief(opt)}
                             className={cn("flex-1 py-3 px-1 rounded-xl text-[10px] font-bold transition-all border",
                                relief === opt 
                                ? (isFastingMode ? "bg-amber-500 text-black border-amber-500" : "bg-[#1A4D42] text-white border-[#1A4D42]")
                                : "bg-white dark:bg-black/15 text-gray-500 border-gray-200 dark:border-white/10"
                             )}
                          >
                             {opt}
                          </button>
                       ))}
                    </div>
                 </div>
              )}
           </div>
        )}

        {/* Level 9: Dynamic Natural Suggested Remedies based on selected items */}
        {suggestedRemedies.length > 0 && (
           <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-3">
              <h3 className="font-extrabold text-xs text-right px-2 text-rose-500 flex items-center justify-end gap-1.5 flex-row-reverse">
                 <span>حلول منزلية وطبيعية مقترحة</span>
                 <Sparkles className="w-4 h-4 text-rose-500" />
              </h3>
              {suggestedRemedies.map((remedy, idx) => (
                 <div key={idx} className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200/20 dark:border-rose-900/30 rounded-[24px] p-4 flex flex-row-reverse items-center justify-between shadow-xs">
                    <div className="w-12 h-12 bg-white dark:bg-black/20 rounded-full flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/20 text-xl shadow-xs">
                       {remedy.icon}
                    </div>
                    <div className="flex-1 text-right mr-4">
                       <h4 className="font-extrabold text-xs text-rose-800 dark:text-rose-300 mb-1">{remedy.name}</h4>
                       <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-bold">{remedy.desc}</p>
                    </div>
                 </div>
              ))}
           </motion.div>
        )}

        {/* Level 10: Clinical Notes text */}
        <div>
           <h3 className="font-bold text-xs text-gray-400 mb-2 text-right px-1">ملاحظات سريرية إضافية</h3>
           <textarea 
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             className={cn("w-full border rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:border-transparent min-h-[110px] resize-none text-right placeholder-gray-400",
                isFastingMode ? "bg-[#2D2824] border-[#3D3834] focus:ring-amber-500 text-white" : "bg-white dark:bg-black/20 border-[#F0EBE1] dark:border-white/10 focus:ring-[#1A4D42] dark:text-white"
             )}
             placeholder="هل هناك أي تفاصيل أخرى ترغبين في كتابتها لمناقشتها مع طبيبك؟ (مثل: تفاصيل الأكل، الضغط النفسي)..."
             dir="rtl"
           />
        </div>

        {/* Level 11: Real-time Context-Aware Clinical AI Insight */}
        <motion.div initial={{y: 20, opacity: 0}} animate={{y: 0, opacity: 1}} className={cn("border rounded-[28px] p-5 flex flex-row-reverse gap-4 text-right shadow-xs",
           isFastingMode ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/30"
        )}>
           <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl",
              isFastingMode ? "bg-amber-500 text-white shadow-amber-500/30 shadow-lg" : "bg-[#1A4D42] text-white shadow-[#1A4D42]/30 shadow-lg"
           )}>
              <Sparkles className="w-5 h-5" />
           </div>
           <div className="flex-1">
              <h4 className={cn("font-black text-xs mb-1", isFastingMode ? "text-amber-500" : "text-[#1A4D42] dark:text-emerald-400")}>المستشار الفسيولوجي الذكي</h4>
              <p className={cn("text-[10.5px] leading-relaxed font-bold", isFastingMode ? "text-amber-100" : "text-gray-600 dark:text-gray-300")}>
                {selectedSymptoms.length === 0 
                  ? 'يرجى تحديد واحد أو أكثر من الأعراض وموضح التعب لتأمين نصائح مخصصة لحالتك الصحية والصيام.'
                  : isFastingMode 
                    ? `ملاحظة: لو شعرت بـ (${selectedSymptoms.slice(0, 2).join(' و')}) والشدة ${painLevel}/10 خلال نهار الصيام، احرصي على تجنب المجهود القاسي. الجفاف هو السبب المرجح للصداع. احرصي على شرب وفير بين الفطور والسحور.`
                    : `تحليل أولي: الشكوى من (${selectedSymptoms.join('، ')}) يتطلب متابعة تذبذب المؤشرات. إذا استمر هذا العرض لمدد تتجاوز الـ ٤٨ ساعة أو تكرر بانتظام، يفضل تدوين تاريخ الظهر ومشاركته مع طبيبك المختص.`
                }
              </p>
           </div>
        </motion.div>

      </div>

      {/* Persistent Bottom Primary Button (Perfect responsive container) */}
      <div className={cn("fixed bottom-[80px] left-0 right-0 p-4 border-t z-40 max-w-md mx-auto backdrop-blur-xl transition-colors",
         isFastingMode ? "bg-[#1A1A1A]/80 border-[#3D3834]" : "bg-white/80 dark:bg-black/80 border-[#F0EBE1] dark:border-white/5"
      )}>
         <button 
           onClick={handleSave}
           disabled={isSaving || selectedSymptoms.length === 0}
           className={cn("w-full py-4 rounded-[22px] font-black text-xs shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2",
              isFastingMode 
                ? "bg-amber-500 text-[#1A1A1A] shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed" 
                : "bg-[#1A4D42] text-white shadow-[#1A4D42]/20 disabled:bg-gray-300 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
           )}
         >
            {isSaving ? 'جاري توثيق البيانات الصحية...' : 'توثيق العرض الطبي الآن'}
         </button>
      </div>

    </div>
  );
}
