export type TimeOfDay = 'night' | 'fajr' | 'sunrise' | 'morning' | 'noon' | 'afternoon' | 'sunset';

export interface TimeTheme {
  id: TimeOfDay;
  name: string;
  bgGradient: string;
  cardClasses: string;
  textPrimary: string;
  textSecondary: string;
}

export function getTimeTheme(hour: number = new Date().getHours()): TimeTheme {
  if (hour >= 4 && hour < 6) return { 
     id: 'fajr', name: 'فجر', 
     bgGradient: 'from-[#0B1021] to-[#2B1B3D]',
     cardClasses: 'bg-[#1a1c33]/50 border-[#2B1B3D]',
     textPrimary: 'text-white', textSecondary: 'text-indigo-200'
  };
  if (hour >= 6 && hour < 8) return { 
     id: 'sunrise', name: 'شروق', 
     bgGradient: 'from-[#FF7B54] to-[#FFD57E]',
     cardClasses: 'bg-white/40 border-[#FF7B54]/30',
     textPrimary: 'text-orange-950', textSecondary: 'text-orange-800'
  };
  if (hour >= 8 && hour < 12) return { 
     id: 'morning', name: 'ضحى', 
     bgGradient: 'from-[#74EBD5] to-[#9FACE6]',
     cardClasses: 'bg-white/40 border-[#74EBD5]/30',
     textPrimary: 'text-teal-950', textSecondary: 'text-teal-800'
  };
  if (hour >= 12 && hour < 15) return { 
     id: 'noon', name: 'ظهر', 
     bgGradient: 'from-[#4FACFE] to-[#00F2FE]',
     cardClasses: 'bg-black/10 border-white/20',
     textPrimary: 'text-white', textSecondary: 'text-blue-100'
  };
  if (hour >= 15 && hour < 18) return { 
     id: 'afternoon', name: 'عصر', 
     bgGradient: 'from-[#F6D365] to-[#FDA085]',
     cardClasses: 'bg-white/40 border-[#FDA085]/30',
     textPrimary: 'text-orange-950', textSecondary: 'text-orange-800'
  };
  if (hour >= 18 && hour < 20) return { 
     id: 'sunset', name: 'مغرب', 
     bgGradient: 'from-[#F5576C] to-[#F093FB]',
     cardClasses: 'bg-black/10 border-white/20',
     textPrimary: 'text-white', textSecondary: 'text-pink-100'
  };
  return { 
     id: 'night', name: 'ليل', 
     bgGradient: 'from-[#141E30] to-[#243B55]',
     cardClasses: 'bg-white/10 border-white/10',
     textPrimary: 'text-white', textSecondary: 'text-slate-300'
  };
}
