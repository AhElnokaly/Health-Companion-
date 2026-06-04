import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Plus, User, Calendar, Ruler, Weight, CheckCircle2, Activity, Trash2, Edit3, Save } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, updateDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  gender: 'male' | 'female';
  dob: string;
  weight?: number;
  height?: number;
  medicalConditions?: string;
}

export default function Family() {
  const { profile, isFastingMode } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('ابني');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    if (!profile.isPro && members.length >= 3) {
       setErrorMessage("الخطة المجانية بتسمح بإضافة ٣ أفراد بس. اعمل ترقية لـ Pro!");
       setTimeout(() => navigate('/profile'), 2000);
       return;
    }
    setName('');
    setRelation('ابني');
    setGender('male');
    setDob('');
    setWeight('');
    setHeight('');
    setMedicalConditions('');
    setSelectedMember(null);
    setIsAdding(true);
  };

  const openEdit = (m: FamilyMember) => {
    setSelectedMember(m);
    setName(m.name);
    setRelation(m.relation);
    setGender(m.gender);
    setDob(m.dob);
    setWeight(m.weight ? m.weight.toString() : '');
    setHeight(m.height ? m.height.toString() : '');
    setMedicalConditions(m.medicalConditions || '');
    setIsAdding(true);
  };

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'users', user.uid, 'family_members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mems: FamilyMember[] = [];
      snapshot.forEach(doc => {
        mems.push({ id: doc.id, ...doc.data() } as FamilyMember);
      });
      setMembers(mems);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/family_members`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user || !name) return;
    setErrorMessage('');

    if (!selectedMember) {
       const isDuplicate = members.some(m => m.name.trim().toLowerCase() === name.trim().toLowerCase());
       if (isDuplicate) {
          setErrorMessage('هذا الاسم موجود بالفعل، يرجى ادخال اسم مختلف.');
          return;
       }
    }

    try {
      const parentData = {
        name: name.trim(),
        relation,
        gender,
        dob,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        medicalConditions,
      };

      if (selectedMember) {
        await updateDoc(doc(db, 'users', user.uid, 'family_members', selectedMember.id), {
          ...parentData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'family_members'), {
          ...parentData,
          createdAt: serverTimestamp()
        });
      }
      setIsAdding(false);
    } catch (e) {
      handleFirestoreError(e, selectedMember ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/family_members`);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (confirmDeleteId === id) {
       try {
         await deleteDoc(doc(db, 'users', user.uid, 'family_members', id));
         setConfirmDeleteId(null);
       } catch (error) {
         handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/family_members`);
       }
    } else {
       setConfirmDeleteId(id);
       setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const calcAge = (birthDate: string) => {
    if (!birthDate) return null;
    const bDate = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (isAdding) {
    return (
      <div className={cn("min-h-full p-6 pt-10 pb-24 text-right transition-colors duration-1000",
         isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white"
      )}>
        <div className="flex justify-between items-center mb-8 flex-row-reverse">
          <button onClick={() => setIsAdding(false)} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
             isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-500"
          )}>
            <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{selectedMember ? 'تعديل بيانات الفرد' : 'إضافة فرد جديد'}</h1>
        </div>

        <div className={cn("p-6 rounded-[32px] mb-6 space-y-6 shadow-sm border", 
           isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5"
        )}>
          <div>
            {errorMessage && (
               <div className="bg-rose-50 text-rose-500 p-3 rounded-xl text-xs font-bold text-center mb-4">
                  {errorMessage}
               </div>
            )}
            <label className="block text-xs font-bold mb-3 text-gray-500">الاسم</label>
            <div className="relative text-right">
               <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
               <input type="text" value={name} onChange={(e) => setName(e.target.value)} dir="rtl"
                 className={cn("w-full h-14 pr-4 pl-12 rounded-2xl border-none font-bold text-sm text-right",
                    isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                 )}
               />
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-3 text-gray-500 text-right">النوع</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')} dir="rtl"
                 className={cn("w-full h-14 px-4 rounded-2xl border-none font-bold text-sm text-right appearance-none",
                    isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                 )}
              >
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-3 text-gray-500 text-right">صلة القرابة</label>
              <select value={relation} onChange={(e) => setRelation(e.target.value)} dir="rtl"
                 className={cn("w-full h-14 px-4 rounded-2xl border-none font-bold text-sm text-right appearance-none",
                    isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                 )}
              >
                <option>أبي</option>
                <option>أمي</option>
                <option>ابني</option>
                <option>ابنتي</option>
                <option>جدي</option>
                <option>جدتي</option>
                <option>أخي</option>
                <option>أختي</option>
                <option>زوجي / زوجتي</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-3 text-gray-500">تاريخ الميلاد</label>
            <div className="relative text-right">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
               <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} dir="rtl"
                 className={cn("w-full h-14 pr-4 pl-12 rounded-2xl border-none font-bold text-sm text-right",
                    isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                 )}
               />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-3 text-gray-500 text-right">الطول</label>
              <div className="relative text-right">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">سم</span>
                 <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} dir="rtl"
                   className={cn("w-full h-14 pr-4 pl-12 rounded-2xl border-none font-bold text-sm text-right",
                      isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                   )}
                 />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-3 text-gray-500 text-right">الوزن</label>
              <div className="relative text-right">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">كجم</span>
                 <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} dir="rtl"
                   className={cn("w-full h-14 pr-4 pl-12 rounded-2xl border-none font-bold text-sm text-right",
                      isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                   )}
                 />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-3 text-gray-500">التاريخ المرضي المسبق أو أي ملاحظات هامة</label>
            <textarea value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} dir="rtl"
              placeholder="مثال: حساسية بنسلين، ضغط الدم المرتفع"
              className={cn("w-full h-32 p-4 rounded-2xl border-none font-bold text-sm text-right resize-none",
                 isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
              )}
            />
          </div>

        </div>

        <motion.button 
           whileTap={{ scale: 0.95 }}
           onClick={handleSave}
           disabled={!name}
           className={cn("w-full h-16 rounded-[24px] font-bold text-sm text-white shadow-xl flex items-center justify-center transition-all disabled:opacity-50",
              isFastingMode ? "bg-[#D4A373] shadow-amber-900/20" : "bg-[#1A4D42] shadow-[#1A4D42]/20 hover:bg-[#0D2923]"
           )}>
           {selectedMember ? 'حفظ التعديلات' : 'إضافة'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className={cn("min-h-full p-6 pt-10 pb-24 text-right transition-colors duration-1000",
       isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white"
    )}>
      <div className="flex justify-between items-center mb-8 flex-row-reverse">
        <button onClick={() => navigate(-1)} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
           isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-[#F0EBE1] dark:border-white/5 text-gray-500"
        )}>
          <ChevronRight className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">أفراد العائلة</h1>
      </div>

      <div className="space-y-4 mb-8 text-right">
        {members.map(member => (
          <div key={member.id} className={cn("p-5 rounded-[24px] flex items-center justify-between flex-row-reverse border shadow-sm cursor-pointer",
             isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-white/5 border-[#F0EBE1] dark:border-white/10"
          )} onClick={() => openEdit(member)}>
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center",
                 isFastingMode ? "bg-[#D4A373]/20 text-[#D4A373]" : "bg-[#FAEDDF] dark:bg-primary/20 text-[#E07A5F]"
              )}>
                 <User className="w-6 h-6" />
              </div>
              <div className="text-right">
                 <h3 className="font-bold text-sm text-[#1A4D42] dark:text-white mb-1">{member.name}</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                    {member.relation} 
                    {calcAge(member.dob) ? ` • ${calcAge(member.dob)} سنة` : ''}
                    {member.weight ? ` • ${member.weight} كجم` : ''}
                    {member.height ? ` • ${member.height} سم` : ''}
                 </p>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={(e) => handleDelete(member.id, e)} className={cn("p-2 text-xs font-bold transition-colors rounded-xl", confirmDeleteId === member.id ? "bg-rose-500 text-white" : "text-gray-400 hover:text-rose-500")}>
                  {confirmDeleteId === member.id ? "متأكد؟" : <Trash2 className="w-4 h-4" />}
               </button>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-10">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-gray-500 font-bold mb-2">مفيش أفراد مضافة</h3>
            <p className="text-xs text-gray-400">ضِف أفراد عيلتك عشان تتابع أدويتهم بسهولة</p>
          </div>
        )}
      </div>

      {/* --- +++ أضيفت لدعم مزامنة الزوج/الزوجة ومشاركة البيانات دورياً بناءً على طلبك +++ --- */}
      {profile.maritalStatus === 'married' && (
        <div className={cn("mb-5 p-5 rounded-[24px] border shadow-sm text-right flex items-center justify-between flex-row-reverse",
           isFastingMode ? "bg-[#2D2824] border-stone-800" : "bg-gradient-to-br from-[#FAEDDF] to-rose-50/20 dark:from-[#2D2824]/40 dark:to-stone-900 border-[#F0EBE1] dark:border-white/5"
        )}>
           <div className="mr-2">
              <h3 className="text-xs font-black text-[#1A4D42] dark:text-rose-400 mb-1">💍 ربط شريك الحياة بمزامنة الأثير</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal font-bold">
                شارك بياناتك الشخصية (الاسم، وتاريخ الميلاد المتبادل) والوزن والمؤشرات الهرمونية دورياً عبر مسح فوري للـ QR.
              </p>
           </div>
           <button 
             onClick={() => navigate('/partner-sync')}
             className="py-2.5 px-3.5 bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[11px] rounded-xl shadow-md cursor-pointer transition-all active:scale-95 shrink-0 ml-3"
           >
              تفعيل المزامنة الزوجية
           </button>
        </div>
      )}
      {/* ---------------------------------------------------- */}

      <motion.button 
         whileTap={{ scale: 0.95 }}
         onClick={openAdd}
         className={cn("w-full h-16 rounded-[24px] font-bold text-sm text-white shadow-xl flex items-center justify-center gap-3 transition-all flex-row-reverse",
            isFastingMode ? "bg-[#D4A373] shadow-amber-900/20" : "bg-[#1A4D42] shadow-[#1A4D42]/20 hover:bg-[#0D2923]"
         )}>
         <Plus className="w-5 h-5" />
         <span>عضو جديد</span>
      </motion.button>

    </div>
  );
}
