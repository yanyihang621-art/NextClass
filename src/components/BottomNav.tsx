import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { path: '/agenda', icon: 'today', label: '日程' },
    { path: '/timetable', icon: 'calendar_view_week', label: '课表' },
    { path: '/import', icon: 'cloud_upload', label: '导入' },
    { path: '/settings', icon: 'person', label: '我的' },
  ];

  return (
    <nav
      className="flex-shrink-0 flex justify-around items-center px-2 pt-1.5 bg-glass shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[2rem] z-50"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {navItems.map((item) => {
        const isActive = path === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center px-4 py-1 transition-all duration-300",
              isActive ? "bg-primary-container text-on-primary-container rounded-full" : "text-slate-400 hover:text-primary"
            )}
          >
            <span 
              className={cn("material-symbols-outlined mb-0.5 text-[22px]", isActive && "fill")}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
