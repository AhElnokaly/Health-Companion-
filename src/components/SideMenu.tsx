import { motion, AnimatePresence } from 'motion/react';
import { X, FolderHeart, Pill, Trophy, ShieldAlert, Heart, CalendarClock, User, Users, Wallet, Briefcase } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export function SideMenu() {
  const { isSidebarOpen, setSidebarOpen, profile } = useAppContext();
  const location = useLocation();
  const { user, logOut } = useAuth();

  const menuItems = [
    { title: 'محفظتي', icon: Wallet, path: '/wallet', desc: 'إدارة اموالك ومصاريفك' },
    { title: 'سجل العمل', icon: Briefcase, path: '/work-log', desc: 'تسجيل الحضور والانصراف' },
    { title: 'إعدادات الحساب', icon: User, path: '/profile', desc: 'الاسم وتعديل البيانات' },
    { title: 'التنبيهات الفائقة بالخلفية 🔔', icon: CalendarClock, path: '/notifications-setup', desc: 'إعداد وتجربة تنبيهات الأدوية والمياه دورياً بالخلفية' },
    ...(profile.gender === 'female' ? [
      { title: 'صحة المرأة والعناية 🌸', icon: Heart, path: '/womens-health', desc: 'تتبع الدورة الشهرية والتبويض والنصائح الهرمونية' }
    ] : []),
    { title: 'أفراد العائلة', icon: Users, path: '/family', desc: 'إدارة ملفات الأب، الأم، الأطفال' },
    ...(profile.maritalStatus === 'married' ? [
      { title: 'مزامنة شريك الحياة 💍', icon: Heart, path: '/partner-sync', desc: 'مشاركة حالتك ومتابعة شريك حياتك دون إنترنت' }
    ] : []),
    { title: 'التقارير والإحصائيات', icon: Trophy, path: '/reports', desc: 'نسبة الالتزام وتاريخ الأدوية' },
    { title: 'الجدول الزمني (صيام)', icon: CalendarClock, path: '/timetable', desc: 'مواعيد السحور والإفطار' },
    { title: 'مساعد صيام السنن', icon: CalendarClock, path: '/fasting-hub', desc: 'تنبيهات ورصيد النوافل والمقترحات' },
    { title: 'خزانة الروشيتات', icon: FolderHeart, path: '/vault', desc: 'صور التحاليل والأشعة والروشيتات' },
    { title: 'صيدلية المنزل', icon: Pill, path: '/home-pharmacy', desc: 'متابعة الصلاحية' },
    { title: 'تحديات الصحة', icon: Trophy, path: '/challenges', desc: 'المنافسة مع العائلة' },
    { title: 'مركز العبادات', icon: Heart, path: '/spiritual', desc: 'تنبيهات وأذكار' },
    { title: 'دليل الطوارئ SOS', icon: ShieldAlert, path: '/sos', desc: 'أرقام سريعة وفصائل دم' },
  ];

  return (
    <AnimatePresence>
      {isSidebarOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-[#0c0c0c] z-[70] shadow-2xl flex flex-col"
          >
             <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 bg-white shadow-sm flex items-center justify-center rounded-2xl dark:bg-white/10 dark:text-white">
                   <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </button>
                <div className="text-right flex items-center gap-3">
                   <div>
                       <h2 className="text-base font-black text-gray-900 dark:text-white">{profile.nickname || profile.name}</h2>
                       <p className="text-[10px] text-gray-500 font-bold">الحساب الشامل</p>
                   </div>
                   <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm bg-primary/10">
                       <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=0D8ABC&color=fff`} alt="User" />
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {menuItems.map((item, idx) => (
                  <Link 
                    key={idx} 
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                        "flex items-center gap-4 text-right p-4 rounded-3xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group",
                        location.pathname === item.path && "bg-primary/5 border border-primary/20"
                    )}
                  >
                     <div className="flex-1">
                        <h3 className="font-black text-gray-900 dark:text-white mb-1.5 text-sm">{item.title}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">{item.desc}</p>
                     </div>
                     <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110 transition-all text-gray-400 rounded-2xl flex items-center justify-center">
                        <item.icon className="w-6 h-6" />
                     </div>
                  </Link>
                ))}
             </div>
             <div className="p-6 border-t border-gray-100 dark:border-white/5">
                 <button onClick={logOut} className="w-full py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest">تسجيل الخروج</button>
             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
