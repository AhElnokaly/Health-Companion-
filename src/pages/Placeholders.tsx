import { CalendarClock, ShieldAlert, Heart, Trophy, FolderHeart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ComingSoon({ title, icon: Icon }: { title: string, icon: any }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-black pb-32">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 animate-pulse">
        <Icon className="w-12 h-12" />
      </div>
      <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 text-center tracking-tighter">{title}</h1>
      <p className="text-gray-500 text-center mb-8 font-bold text-sm leading-relaxed max-w-xs">هذه الميزة قيد التطوير حالياً، وسيتم إطلاقها في التحديث القادم. شكراً لوجودك معنا!</p>
      <Link to="/" className="bg-gray-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">العودة للرئيسية</Link>
    </div>
  );
}

export function TimeTable() { return <ComingSoon title="الجدول الزمني (صيام)" icon={CalendarClock} />; }
export function Vault() { return <ComingSoon title="خزانة التقارير" icon={FolderHeart} />; }
export function SOS() { return <ComingSoon title="دليل الطوارئ" icon={ShieldAlert} />; }
export function Spiritual() { return <ComingSoon title="مركز العبادات" icon={Heart} />; }
