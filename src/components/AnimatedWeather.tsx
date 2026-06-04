import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CloudRain, Sun, Cloud, Moon, Wind } from 'lucide-react';

interface AnimatedWeatherProps {
  condition: 'clear-day' | 'clear-night' | 'cloudy' | 'rainy' | 'windy';
  className?: string;
}

export const AnimatedWeather: React.FC<AnimatedWeatherProps> = ({ condition, className = '' }) => {
  if (condition === 'rainy') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`drop-${i}`}
            initial={{ y: -50, x: Math.random() * 300, opacity: Math.random() * 0.5 + 0.2 }}
            animate={{ y: 800, x: Math.random() * 300 - 50 }}
            transition={{
              duration: Math.random() * 0.8 + 0.6,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
            className="absolute top-0 w-0.5 h-6 bg-white/40 rounded-full"
          />
        ))}
        <CloudRain className="absolute top-4 right-4 w-24 h-24 text-white/10" strokeWidth={1} />
      </div>
    );
  }

  if (condition === 'clear-day') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-10 -right-10 w-48 h-48 opacity-20"
        >
          <Sun className="w-full h-full text-white" strokeWidth={1} />
        </motion.div>
      </div>
    );
  }

  if (condition === 'clear-night') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
            style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
          />
        ))}
        <Moon className="absolute -top-4 -right-4 w-32 h-32 text-white/10" strokeWidth={1} />
      </div>
    );
  }

  if (condition === 'windy') {
     return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
           {[...Array(5)].map((_, i) => (
             <motion.div
               key={`wind-${i}`}
               initial={{ x: 400, opacity: 0 }}
               animate={{ x: -100, opacity: [0, 0.3, 0] }}
               transition={{ duration: Math.random() * 2 + 2, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
               className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent"
               style={{ top: `${Math.random() * 80 + 10}%`, width: `${Math.random() * 100 + 50}px` }}
             />
           ))}
           <Wind className="absolute top-6 right-6 w-24 h-24 text-white/10" strokeWidth={1} />
        </div>
     );
  }

  // default cloudy
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
         animate={{ x: [-20, 20, -20] }}
         transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
         className="absolute -top-4 right-10 opacity-20"
      >
         <Cloud className="w-32 h-32 text-white" strokeWidth={1} />
      </motion.div>
      <motion.div
         animate={{ x: [10, -10, 10] }}
         transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
         className="absolute top-10 -left-10 opacity-10"
      >
         <Cloud className="w-40 h-40 text-white" strokeWidth={1} />
      </motion.div>
    </div>
  );
};
