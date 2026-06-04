import { Outlet, NavLink, useLocation, Navigate } from 'react-router-dom';
import { Home, Pill, Activity, Moon, Sparkles, User, Settings, Scale, Calendar } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion } from 'motion/react';
import SmartFAB from '../SmartFAB';
import Header from './Header';
import { SideMenu } from '../SideMenu';
import { SmartSleepDetector } from '../SmartSleepDetector';
import { useAppContext } from '../../context/AppContext';

export default function AppLayout() {
  const { isFastingMode, profile, showWomensHealth, toggleWomensHealth } = useAppContext();
  const location = useLocation();

  if (!profile.onboardingCompleted && location.pathname !== '/onboarding') {
     return <Navigate to="/onboarding" replace />;
  }

  const isDieting = profile.targetWeight || profile.currentWeight;

  const navItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'المهام', path: '/actions', icon: Sparkles },
    { name: 'السجل', path: '/history', icon: Calendar },
    { name: 'التقارير', path: '/reports', icon: Activity },
    { name: 'حسابي', path: '/profile', icon: User },
  ];

  return (
    <div className={cn(
      "flex flex-col h-[100dvh] w-full mx-auto relative transition-colors duration-1000 overflow-hidden",
      isFastingMode ? "bg-slate-950 text-[#FDFBF7]" : "bg-[#FCFAF8] dark:bg-[#121415]"
    )}>
      {/* Dynamic Background for Fasting Mode */}
      {isFastingMode && (
         <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-b from-[#0F1421] via-[#151D2F] to-[#0A0D15]">
            {/* Real elegant golden and turquoise ambient reflections */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#D4A373]/15 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-10 left-0 w-[350px] h-[350px] bg-sky-500/10 blur-[100px] rounded-full -translate-x-1/3" />
            
            {/* Exquisitely layeredRepeating Islamic arabesque star pattern */}
            <div 
               className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05]" 
               style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l7.838 24.12H75.34l-20.518 14.907 7.838 24.12L40 48.24 17.34 63.147l7.838-24.12L4.66 24.12h27.502L40 0zm0 18l-3.919 12.06H23.67l10.259 7.453-3.919 12.06L40 42.12l10.09 7.333-3.919-12.06 10.259-7.453h-12.41L40 18z' fill='%23D4A373' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                  backgroundSize: '40px 40px'
               }} 
            />
            
            {/* Decorative Crescent Overlay Symbol */}
            <div className="absolute top-12 left-8 opacity-[0.12] scale-110">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3a9 9 0 1 0 9 9 9.75 9.75 0 0 1-9-9z" fill="#D4A373" />
               </svg>
            </div>
         </div>
      )}

      <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto">
        <Header />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
          <Outlet />
        </main>

        <SideMenu />
        <SmartFAB />
        <SmartSleepDetector isFastingMode={isFastingMode} />

        {/* Floating Bottom Navigation */}
        <nav className={cn(
          "absolute mb-6 mx-5 bottom-0 left-0 right-0 backdrop-blur-2xl border px-6 py-4 shadow-soft rounded-[32px] z-40 transition-colors duration-500",
          isFastingMode 
            ? "bg-[#2D2824]/80 border-[#3D3834]" 
            : "bg-[#FDFBF7]/80 dark:bg-[#1A1A1A]/80 border-[#F0EBE1] dark:border-white/5"
        )}>
          <div className="flex justify-between items-center h-10 relative">
            {/* Women's Health NavLink (Only if female and enabled) */}
            {(showWomensHealth && profile.gender === 'female') && (
               <NavLink
                 to="/womens-health"
                 className={({ isActive }) =>
                   cn(
                     "flex flex-col items-center justify-center relative transition-all duration-300 transform",
                     isActive ? "scale-110 drop-shadow-md text-[#C2185B]" : "scale-100 hover:scale-105"
                   )
                 }
               >
                 {({ isActive }) => (
                   <>
                     <span className="text-2xl leading-none block">💐</span>
                     {isActive && (
                        <motion.div
                         layoutId="nav-indicator"
                         className="absolute -bottom-3 w-1 h-1 rounded-full bg-[#C2185B]"
                         initial={false}
                         transition={{ type: "spring", stiffness: 500, damping: 30 }}
                       />
                     )}
                   </>
                 )}
               </NavLink>
            )}

            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center relative transition-all duration-300",
                    isActive 
                      ? (isFastingMode ? "text-[#D4A373] scale-105" : "text-[#1A4D42] scale-105") 
                      : (isFastingMode ? "text-gray-500 hover:text-gray-300" : "text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400")
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon ? (
                      <item.icon
                        strokeWidth={isActive ? 3 : 2}
                        className={cn(
                          "w-6 h-6 transition-transform duration-300", 
                          isActive && "scale-110",
                          isActive && isFastingMode && "drop-shadow-[0_0_8px_rgba(212,163,115,0.4)]",
                          isActive && !isFastingMode && "drop-shadow-[0_0_8px_rgba(26,77,66,0.3)]"
                        )}
                      />
                    ) : (
                      <span className={cn(
                        "text-2xl transition-transform duration-300 leading-none block",
                        isActive && "scale-110 drop-shadow-md"
                      )}>{item.name}</span>
                    )}
                    {isActive && (
                       <motion.div
                        layoutId="nav-indicator"
                        className={cn(
                          "absolute -bottom-3 w-1 h-1 rounded-full",
                          isFastingMode ? "bg-[#D4A373]" : "bg-[#1A4D42]"
                        )}
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
