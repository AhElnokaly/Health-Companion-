import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Smartphone, Info, Check, Apple, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  setDeferredPrompt?: (prompt: any) => void;
}

export default function ApkDownloadModal({ isOpen, onClose, deferredPrompt, setDeferredPrompt }: ApkDownloadModalProps) {
  const [activeTab, setActiveTab] = useState<'apk' | 'ios' | 'android_pwa'>('apk');

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        if (setDeferredPrompt) setDeferredPrompt(null);
      });
    }
  };

  // --- +++ أضيفت لتجنب تقديم بالخادم وتخطي تداخل شريط التنقل السفلي وسهولة التمرير +++ ---
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 select-none" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            className={cn(
               "relative w-full max-w-md bg-white dark:bg-[#0E0F0F] sm:rounded-3xl shadow-2xl border border-gray-150 dark:border-white/5 flex flex-col overflow-hidden max-h-[80vh] sm:max-h-[85vh]",
               "bottom-0 fixed sm:bottom-auto sm:relative rounded-t-3xl rounded-b-none"
            )}
          >
            {/* Header decoration */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-500" />

            {/* Title Bar */}
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-800 dark:text-white leading-none">نسخة الموبايل وتطبيق الـ APK</h3>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">حمل التطبيق مباشرة أو ثبته على هاتفك فوراً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Tabs Picker */}
            <div className="p-1 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-white/5 flex">
              <button
                type="button"
                onClick={() => setActiveTab('apk')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer",
                  activeTab === 'apk'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                )}
              >
                <span>الـ APK للأندرويد 🤖</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer",
                  activeTab === 'ios'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                )}
              >
                <span>آيفون (iOS) 🍏</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android_pwa')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer",
                  activeTab === 'android_pwa'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                )}
              >
                <span>الويب كـ App 📲</span>
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div 
              className="p-5 overflow-y-auto space-y-4 scrollbar-hide flex-1 text-right overscroll-contain" 
              style={{ WebkitOverflowScrolling: 'touch' }}
            >

              {activeTab === 'apk' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl text-center space-y-3">
                    <span className="text-3xl block">🤖</span>
                    <h4 className="text-[12px] font-black text-blue-650 dark:text-blue-400">تحميل مباشر للأندرويد (تثبيت فوري)</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                      احصل على ملف تثبيت الـ <span className="text-blue-600 font-black">APK الرسمي المباشر</span> لتشغيل LifeCompanion على هاتفك بشكل مستقل تماماً، وبسرعة وسلاسة لا تضاهى.
                    </p>
                    <a
                      href="/api/download-apk"
                      download="health_companion.apk"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10.5px] font-black shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4 animate-bounce" />
                      تحميل ملف APK للأندرويد مجاناً
                    </a>
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl border border-gray-150 dark:border-white/5 space-y-1.5">
                    <h5 className="text-[11px] font-black text-gray-805 dark:text-gray-250">💡 خطوات ما بعد التحميل:</h5>
                    <ol className="text-[10px] text-gray-500 dark:text-gray-400 font-bold list-decimal pr-4 space-y-1.5 leading-relaxed">
                      <li>بعد تنزيل الملف، انقر عليه لفتحه.</li>
                      <li>إذا ظهر لك "حظر التثبيت من مصادر غير معروفة"، اذهب للإعدادات وقم بتفعيل خيار "السماح من هذا المصدر".</li>
                      <li>انقر فوق "تثبيت" واستمتع بالتطبيق المفتوح على شاشتك بأيقونته الجميلة!</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'ios' && (
                <div className="space-y-4">
                  <div className="p-4.5 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-center space-y-3">
                    <span className="text-3xl block">🍏</span>
                    <h4 className="text-[12px] font-black text-indigo-650 dark:text-indigo-400">تثبيت فوري على شاشتك (آيفون Safari)</h4>
                    <p className="text-[10.5px] text-gray-500 dark:text-gray-400 font-semi leading-relaxed">
                      لا تقلق! وبدون أي تحميل، يمكنك إضافة التطبيق فوراً بنصف ثانية إلى شاشة هاتفك الرئيسية عبر متصفح <span className="font-black text-blue-500">Safari</span>، وسيقوم بالعمل كتطبيق أصلي مستقل تماماً.
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-[#161917]/50 rounded-2xl border border-gray-150 dark:border-white/5 space-y-2">
                    <h5 className="text-[11px] font-black text-gray-800 dark:text-gray-200">🍏 طريقة الإضافة بسهولة:</h5>
                    <ul className="text-[10px] font-bold text-gray-500 dark:text-gray-400 space-y-2.5 leading-relaxed">
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] flex items-center justify-center font-bold shrink-0">1</span>
                        <span>افتح موقع التطبيق الحالي بمتصفحك الأصلي <span className="font-black text-blue-500">Apple Safari</span> على هاتفك.</span>
                      </li>
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] flex items-center justify-center font-bold shrink-0">2</span>
                        <span>انقر على زر مشاركة المتصفح <span className="font-extrabold text-blue-500">Share ⎋</span> (سهم للأعلى في الأسفل).</span>
                      </li>
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] flex items-center justify-center font-bold shrink-0">3</span>
                        <span>مرّر الخيارات واختر <span className="font-black text-indigo-600 dark:text-indigo-400 text-[10.5px]">"إضافة إلى الشاشة الرئيسية"</span> أو <span className="font-black">"Add to Home Screen"</span>.</span>
                      </li>
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] flex items-center justify-center font-bold shrink-0">4</span>
                        <span>افتح الأبليكيشن الجديد كأيقونة فخمة من سطح هاتفك!</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'android_pwa' && (
                <div className="space-y-4">
                  {deferredPrompt ? (
                    <div className="p-4.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3 shadow-sm">
                      <span className="text-3xl block animate-bounce">✨</span>
                      <h4 className="text-[12px] font-black text-emerald-600 dark:text-emerald-400">تثبيت فوري بضغطة زر!</h4>
                      <p className="text-[10.5px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                        متصفحك يدعم التثبيت التلقائي والمباشر للـ PWA كأبليكيشن موبايل فائق على شاشتك الآن.
                      </p>
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                         <Download className="w-4 h-4 animate-pulse" />
                         تثبيت التطبيق على هاتفك الآن
                      </button>
                    </div>
                  ) : (
                    <div className="p-4.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3">
                      <span className="text-3xl block">📲</span>
                      <h4 className="text-[12px] font-black text-emerald-650 dark:text-emerald-400">الإضافة الفورية لأندرويد (متصفح Chrome)</h4>
                      <p className="text-[10.5px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                        يمكنك تثبيت نسخة الويب كـ App مستقل سريع وخفيف ومزامن بنسبة 100% دون الحاجة لتنزيل ملفات الـ APK مسبقاً!
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-gray-50 dark:bg-[#161917]/50 rounded-2xl border border-gray-150 dark:border-white/5 space-y-2">
                    <h5 className="text-[11px] font-black text-gray-800 dark:text-gray-200">🤖 التثبيت الفوري لكروم:</h5>
                    <ul className="text-[10px] font-bold text-gray-500 dark:text-gray-400 space-y-2.5 leading-relaxed">
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] flex items-center justify-center font-bold shrink-0">1</span>
                        <span>انقر على النقاط الثلاث <span className="font-extrabold text-blue-500">⁝</span> في الزاوية العلوية لكروم.</span>
                      </li>
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] flex items-center justify-center font-bold shrink-0">2</span>
                        <span>اختر <span className="font-black text-emerald-600 dark:text-emerald-400">"تثبيت التطبيق"</span> أو <span className="font-black">"إضافة للشاشة الرئيسية"</span>.</span>
                      </li>
                      <li className="flex items-start gap-2 flex-row-reverse text-right">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] flex items-center justify-center font-bold shrink-0">3</span>
                        <span>أكّد الإضافة وستجده بأيقونته الرائعة بهاتفك جاهزاً فورياً!</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 dark:bg-[#111111]/30 border-t border-gray-100 dark:border-white/5 text-center">
              <span className="text-[8.5px] text-gray-400 font-bold">
                تطبيق لايف كومبانيون يدعم ميزة الـ PWA للعمل بكفاءة تامة بدون اتصال
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
