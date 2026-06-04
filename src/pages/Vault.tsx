import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, FolderHeart, Plus, FileText, Camera, Users, Calendar, View, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-error-handler';

export default function Vault() {
  const { isFastingMode } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('كل الملفات');
  const [isAdding, setIsAdding] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{id: string, name: string}[]>([]);
  const [selectedPerson, setSelectedPerson] = useState(''); 

  const [title, setTitle] = useState('');
  const [type, setType] = useState('روشتة');
  const [date, setDate] = useState('');
  const [forWho, setForWho] = useState(''); 
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!user) return;

    const qFamily = query(collection(db, 'users', user.uid, 'family_members'));
    const unsubscribeFamily = onSnapshot(qFamily, (snapshot) => {
      const mems: {id: string, name: string}[] = [];
      snapshot.forEach(doc => {
        mems.push({ id: doc.id, name: doc.data().name });
      });
      setFamilyMembers(mems);
    });

    const qDocs = query(collection(db, 'users', user.uid, 'medical_documents'));
    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      // Sort by date desc
      docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDocuments(docs);
    });

    return () => {
        unsubscribeFamily();
        unsubscribeDocs();
    };
  }, [user]);

  const handleSave = async () => {
      if (!user || !title || !date) return;
      try {
        await addDoc(collection(db, 'users', user.uid, 'medical_documents'), {
            title,
            type,
            date,
            forWho,
            notes,
            photoUrl: '', // would be uploaded image url
            createdAt: serverTimestamp()
        });
        setIsAdding(false);
        setTitle('');
        setNotes('');
        setDate('');
        setForWho('');
      } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/medical_documents`);
      }
  };

  const handleDelete = async (id: string) => {
      if (!user) return;
      try {
          await deleteDoc(doc(db, 'users', user.uid, 'medical_documents', id));
      } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/medical_documents`);
      }
  };

  const tabs = ['كل الملفات', 'روشتة', 'تحليل', 'أشعة'];

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
                <h1 className="text-xl font-bold">إضافة مستند جديد</h1>
              </div>

              <div className={cn("p-6 rounded-[32px] mb-6 space-y-6 shadow-sm border", isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-[#1A1A1A] border-[#F0EBE1] dark:border-white/5")}>
                 
                 {/* Photo Upload Area */}
                 <div className={cn("w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95",
                    isFastingMode ? "border-[#D4A373]/30 bg-[#D4A373]/5 text-[#D4A373]" : "border-[#1A4D42]/20 bg-[#1A4D42]/5 text-[#1A4D42] dark:border-white/10 dark:bg-white/5 dark:text-white"
                 )}>
                    <Camera className="w-6 h-6 mb-2" />
                    <p className="text-xs font-bold">صوّر الروشتة أو التقرير</p>
                 </div>

                 <div>
                    <label className="block text-xs font-bold mb-3 text-gray-500">عنوان المستند</label>
                    <div className="relative text-right">
                       <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                       <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} dir="rtl" placeholder="مثال: روشتة دكتور باطنة"
                         className={cn("w-full h-14 pr-4 pl-12 rounded-2xl border-none font-bold text-sm text-right",
                            isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                         )}
                       />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-3 text-gray-500">نوع المستند</label>
                    <select value={type} onChange={(e) => setType(e.target.value)} dir="rtl"
                       className={cn("w-full h-14 px-4 rounded-2xl border-none font-bold text-sm text-right appearance-none",
                          isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                       )}
                    >
                      <option>روشتة</option>
                      <option>تحليل</option>
                      <option>أشعة</option>
                      <option>تقرير طبي عام</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-3 text-gray-500">تاريخ الكشف/التحليل</label>
                    <div className="relative text-right">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                       <input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="rtl"
                         className={cn("w-full h-14 pr-4 pl-12 rounded-2xl border-none font-bold text-sm text-right",
                            isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                         )}
                       />
                    </div>
                  </div>

                  <div>
                      <label className="text-xs font-bold text-gray-500 mb-2 block">المستند لمين؟</label>
                      <select 
                        className={cn("w-full h-14 rounded-2xl border-none font-bold text-sm px-4 appearance-none text-right mb-4",
                          isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                        )}
                        value={forWho}
                        onChange={(e) => setForWho(e.target.value)}
                        dir="rtl"
                      >
                          <option value="">لنفسي</option>
                          {familyMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                      </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-3 text-gray-500">ملاحظات (اختياري)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} dir="rtl"
                      placeholder="أي تفاصيل مهمة..."
                      className={cn("w-full h-24 p-4 rounded-2xl border-none font-bold text-sm text-right resize-none",
                         isFastingMode ? "bg-black/20 text-white" : "bg-[#FDFBF7] dark:bg-white/5 border border-[#F0EBE1] dark:border-none text-[#1A4D42] dark:text-white"
                      )}
                    />
                  </div>

              </div>
              <button 
                 onClick={handleSave}
                 disabled={!title || !date}
                 className={cn("w-full h-16 rounded-[24px] font-bold text-sm text-white shadow-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50",
                    isFastingMode ? "bg-[#D4A373] shadow-amber-900/20" : "bg-[#1A4D42] shadow-[#1A4D42]/20 hover:bg-[#0D2923]"
                 )}>
                 حفظ المستند
              </button>
          </div>
      );
  }

  return (
    <div className={cn("min-h-full p-6 pt-10 pb-24 text-right transition-colors duration-1000 relative",
       isFastingMode ? "bg-[#1A1A1A] text-white" : "bg-[#FDFBF7] dark:bg-[#121415] text-gray-900 dark:text-white"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-row-reverse">
        <button onClick={() => navigate(-1)} className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
           isFastingMode ? "bg-black/20 text-gray-300" : "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-500"
        )}>
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-row-reverse">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isFastingMode ? "bg-[#D4A373]/20 text-[#D4A373]" : "bg-emerald-50 dark:bg-emerald-900/20 text-[#1A4D42]  dark:text-emerald-400")}>
               <FolderHeart className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold">خزانة الروشيتات</h1>
        </div>
      </div>

       {/* Family Member Selector */}
       {(familyMembers.length > 0) && (
           <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-row-reverse mb-6 items-center px-1">
              <button 
                 onClick={() => setSelectedPerson('')}
                 className={cn("px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border flex items-center gap-2 flex-row-reverse shadow-sm",
                    selectedPerson === '' ? (isFastingMode ? "bg-[#D4A373] text-white border-[#D4A373]" : "bg-primary text-white border-primary") : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-300"
                 )}
              >
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center bg-white/20")}>
                    <Users className="w-3 h-3" />
                  </div>
                  أنا
              </button>
              {familyMembers.map(member => (
                 <button 
                    key={member.id}
                    onClick={() => setSelectedPerson(member.id)}
                    className={cn("px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all border flex items-center gap-2 flex-row-reverse shadow-sm",
                       selectedPerson === member.id ? (isFastingMode ? "bg-[#D4A373] text-white border-[#D4A373]" : "bg-primary text-white border-primary") : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 text-gray-700 dark:text-gray-300"
                    )}
                 >
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center bg-white/20")}>
                      <Users className="w-3 h-3" />
                    </div>
                    {member.name}
                 </button>
              ))}
           </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-row-reverse overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn("px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap border",
                     activeTab === tab ? (isFastingMode ? "bg-[#D4A373]/20 text-[#D4A373] border-[#D4A373]/30" : "bg-emerald-50 dark:bg-emerald-900/30 text-[#1A4D42] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800") : "bg-transparent text-gray-500 border-transparent"
                  )}
                >
                    {tab}
                </button>
            ))}
        </div>

        {/* Document List */}
        <div className="space-y-4">
            {documents
               .filter(doc => (!doc.forWho && selectedPerson === '') || doc.forWho === selectedPerson)
               .filter(doc => activeTab === 'كل الملفات' || doc.type === activeTab)
               .map(doc => {
                 let memName = 'أنا';
                 if (doc.forWho) {
                     const m = familyMembers.find(f => f.id === doc.forWho);
                     if (m) memName = m.name;
                 }
                 return (
                 <div key={doc.id} className={cn("p-4 rounded-[24px] flex items-center justify-between flex-row-reverse border shadow-sm group",
                     isFastingMode ? "bg-[#2D2824] border-[#3D3834]" : "bg-white dark:bg-white/5 border-[#F0EBE1] dark:border-white/10"
                 )}>
                    <div className="flex items-center gap-4 flex-row-reverse">
                        <div className={cn("w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0",
                            isFastingMode ? "bg-[#D4A373]/10 text-[#D4A373]" : "bg-emerald-50 dark:bg-emerald-900/20 text-[#1A4D42] dark:text-emerald-400"
                        )}>
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-right">
                           <h3 className="font-bold text-sm text-[#1A4D42] dark:text-white mb-1">{doc.title}</h3>
                           <div className="flex gap-2 items-center flex-row-reverse text-[10px] text-gray-500 font-bold">
                               <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{doc.type}</span>
                               <span>• {doc.date}</span>
                               <span className="text-primary dark:text-[#D4A373] bg-primary/5 dark:bg-[#D4A373]/10 px-2 py-0.5 rounded-full">{memName}</span>
                           </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-primary transition-colors">
                            <View className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDelete(doc.id)} className="p-2 bg-rose-50 dark:bg-rose-900/10 rounded-xl text-gray-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                    </div>
                 </div>
            )})}
            {documents.filter(doc => (!doc.forWho && selectedPerson === '') || doc.forWho === selectedPerson).length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-[#1A1A1A] rounded-[36px] border border-dashed border-[#F0EBE1] dark:border-white/10 mt-8">
                   <FolderHeart className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4 opacity-40" />
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">مفيش مستندات محفوظة<br/>لحد دلوقتي</p>
                </div>
            )}
        </div>

        <button 
           onClick={() => setIsAdding(true)}
           className={cn("fixed bottom-28 left-6 w-14 h-14 rounded-[20px] shadow-2xl flex items-center justify-center transition-all active:scale-95 z-40",
              isFastingMode ? "bg-[#D4A373] text-white shadow-amber-900/20" : "bg-[#1A4D42] text-white shadow-[#1A4D42]/30"
           )}
        >
           <Plus className="w-6 h-6" />
        </button>

    </div>
  );
}
