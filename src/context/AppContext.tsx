import { createContext, useContext, useState, ReactNode } from 'react';

export interface UserProfile {
  name: string;
  nickname?: string;
  maritalStatus?: 'married' | 'single' | 'none';
  gender: 'male' | 'female';
  dob?: string;
  height?: number;
  weight?: number;
  bodyFatPercentage?: number;
  isPro?: boolean;
  onboardingCompleted?: boolean;
  goals?: string[];
  targetWeight?: number;
  targetSleep?: number;
  showWomensHealth?: boolean;
  dietType?: string;
}

interface AppContextType {
  isFastingMode: boolean;
  toggleFastingMode: () => void;
  setIsFastingMode: (v: boolean) => void;
  fastingChoice: 'fasting' | 'not_fasting' | null;
  setFastingChoiceToday: (choice: 'fasting' | 'not_fasting' | null) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  showWomensHealth: boolean;
  toggleWomensHealth: () => void;
  fastingThemeMode: 'light' | 'dark';
  setFastingThemeMode: (mode: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isFastingMode, setIsFastingMode] = useState(() => {
    // +++ تم التعديل لمنع استمرار الصيام من الأمس تلقائياً +++
    const todayStr = new Date().toISOString().split('T')[0];
    const savedDate = localStorage.getItem('is_fasting_mode_date');
    if (savedDate === todayStr) {
      return localStorage.getItem('is_fasting_mode') === 'true';
    }
    return false;
  });

  const [fastingChoice, setFastingChoice] = useState<'fasting' | 'not_fasting' | null>(() => {
    // +++ تم التعديل لمنع استمرار الاختيار من الأمس تلقائياً +++
    const todayStr = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('fasting_decision_' + todayStr);
    if (saved === 'fasting' || saved === 'not_fasting') return saved as 'fasting' | 'not_fasting';
    return null;
  });

  const setFastingChoiceToday = (choice: 'fasting' | 'not_fasting' | null) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFastingChoice(choice);
    if (choice === 'fasting') {
      setIsFastingMode(true);
      localStorage.setItem('is_fasting_mode', 'true');
      localStorage.setItem('is_fasting_mode_date', todayStr);
      localStorage.setItem('fasting_decision_' + todayStr, 'fasting');
    } else if (choice === 'not_fasting') {
      setIsFastingMode(false);
      localStorage.setItem('is_fasting_mode', 'false');
      localStorage.setItem('is_fasting_mode_date', todayStr);
      localStorage.setItem('fasting_decision_' + todayStr, 'not_fasting');
    } else {
      setIsFastingMode(false);
      localStorage.setItem('is_fasting_mode', 'false');
      localStorage.setItem('is_fasting_mode_date', todayStr);
      localStorage.removeItem('fasting_decision_' + todayStr);
    }
  };

  const [showWomensHealth, setShowWomensHealth] = useState(() => {
    return localStorage.getItem('show_womens_health') === 'true';
  });
  
  const [fastingThemeMode, setFastingThemeModeState] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('fasting_theme_mode');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // Default to dark fasting theme for elegant initial rendering or let it be 'dark'
  });

  const setFastingThemeMode = (mode: 'light' | 'dark') => {
    setFastingThemeModeState(mode);
    localStorage.setItem('fasting_theme_mode', mode);
  };

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfileState] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { name: 'ياسرة', gender: 'female' };
  });

  const setProfile = (p: UserProfile) => {
    setProfileState(p);
    localStorage.setItem('user_profile', JSON.stringify(p));
  };

  const toggleWomensHealth = () => {
    setShowWomensHealth(prev => {
      const next = !prev;
      localStorage.setItem('show_womens_health', next ? 'true' : 'false');
      return next;
    });
  };

  return (
    <AppContext.Provider value={{
      isFastingMode,
      toggleFastingMode: () => {
        setIsFastingMode(p => {
          const next = !p;
          const todayStr = new Date().toISOString().split('T')[0];
          localStorage.setItem('is_fasting_mode', next ? 'true' : 'false');
          localStorage.setItem('is_fasting_mode_date', todayStr);
          const nextChoice = next ? 'fasting' : 'not_fasting';
          setFastingChoice(nextChoice);
          localStorage.setItem('fasting_decision_' + todayStr, nextChoice);
          return next;
        });
      },
      setIsFastingMode: (v: boolean) => {
        const todayStr = new Date().toISOString().split('T')[0];
        setIsFastingMode(v);
        localStorage.setItem('is_fasting_mode', v ? 'true' : 'false');
        localStorage.setItem('is_fasting_mode_date', todayStr);
        const nextChoice = v ? 'fasting' : 'not_fasting';
        setFastingChoice(nextChoice);
        localStorage.setItem('fasting_decision_' + todayStr, nextChoice);
      },
      fastingChoice,
      setFastingChoiceToday,
      isSidebarOpen,
      setSidebarOpen,
      profile,
      setProfile,
      showWomensHealth,
      toggleWomensHealth,
      fastingThemeMode,
      setFastingThemeMode
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
