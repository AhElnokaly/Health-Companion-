import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface UIContextType {
  privacyMode: boolean;
  setPrivacyMode: (val: boolean) => void;
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  theme: 'light' | 'dark' | 'sky';
  setTheme: (val: 'light' | 'dark' | 'sky') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);
  
  const [theme, setThemeState] = useState<'light' | 'dark' | 'sky'>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'sky') {
      return saved;
    }
    return 'light';
  });

  const setTheme = (newTheme: 'light' | 'dark' | 'sky') => {
    setThemeState(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const isDark = theme === 'dark';
  const setIsDark = (val: boolean) => {
    setTheme(val ? 'dark' : 'light');
  };

  useEffect(() => {
    // Sync class list with selected theme
    document.documentElement.classList.remove('dark', 'sky');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'sky') {
      document.documentElement.classList.add('dark', 'sky');
    }
  }, [theme]);

  return (
    <UIContext.Provider value={{ privacyMode, setPrivacyMode, isDark, setIsDark, theme, setTheme }}>
      <div className={`${theme === 'dark' ? 'dark' : ''} ${theme === 'sky' ? 'sky' : ''} min-h-screen transition-colors duration-300`}>
        {children}
      </div>
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
