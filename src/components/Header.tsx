import React from 'react';
import { LogOut, ArrowLeft, Languages, Bell } from 'lucide-react';
import { UserAccount } from '../types/farm';
import { t } from '../utils/translations';

interface HeaderProps {
  user: UserAccount | null;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  lang: 'en' | 'ur';
  onToggleLang: () => void;
  onLogout: () => void;
  unreadAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeScreen,
  onNavigate,
  lang,
  onToggleLang,
  onLogout,
  unreadAlertsCount = 0,
}) => {
  const isUr = lang === 'ur';
  const strings = t[lang];
  const isSubScreen = activeScreen !== 'dashboard' && activeScreen !== 'admin' && activeScreen !== 'staff';

  return (
    <header className="sticky top-0 z-40 border-b border-[#d4af37]/25 bg-[#051a10]/95 backdrop-blur-md px-3 sm:px-6 py-3 shadow-lg shadow-black/40">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        {/* Left: Back button (if on sub-screen) OR Logo & Title */}
        <div className="flex items-center gap-3">
          {isSubScreen && (
            <button
              onClick={() => onNavigate('dashboard')}
              aria-label={strings.backBtn}
              className="group flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#f3df88] hover:border-[#d4af37] hover:bg-[#0f3422] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>{strings.backBtn}</span>
            </button>
          )}

          <div
            onClick={() => {
              if (user?.role === 'admin') onNavigate('admin');
              else if (user?.role === 'staff') onNavigate('staff');
              else onNavigate('dashboard');
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#0a2618] shadow-md shadow-[#d4af37]/20 p-1 overflow-hidden">
              <img
                src="/golden-hen.svg"
                alt="Pak Hen Farm Golden Hen"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#d4af37] drop-shadow-sm font-serif">
                  {strings.appName}
                </h1>
                {user?.role === 'admin' && (
                  <span className="rounded-full bg-[#d4af37] px-2 py-0.5 text-[10px] font-black uppercase text-[#051a10]">
                    Admin
                  </span>
                )}
                {user?.role === 'staff' && (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-[#051a10]">
                    Staff
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-[#f4efe6]/70 truncate max-w-[200px] md:max-w-none">
                {strings.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Language toggle and user actions */}
        <div className="flex items-center gap-2">
          {/* Notifications Inbox Button (User only) */}
          {user && user.role === 'user' && (
            <button
              onClick={() => onNavigate('notifications')}
              className={`relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer active:scale-95 shadow-sm ${
                activeScreen === 'notifications'
                  ? 'border-[#d4af37] bg-[#143d28] text-[#f3df88]'
                  : 'border-[#d4af37]/40 bg-[#0a2618] text-[#f3df88] hover:border-[#d4af37] hover:bg-[#0f3422]'
              }`}
              title={strings.navInbox}
            >
              <Bell className="h-4 w-4 text-[#d4af37]" />
              <span className="hidden sm:inline">{strings.navInbox}</span>
              {unreadAlertsCount > 0 && activeScreen !== 'notifications' && (
                <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-[#051a10] shadow-md animate-pulse">
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              )}
            </button>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-2.5 py-1.5 text-xs sm:text-sm font-bold text-[#f3df88] hover:border-[#d4af37] hover:bg-[#0f3422] transition-colors cursor-pointer active:scale-95 shadow-sm"
            title="Toggle English / اردو"
          >
            <Languages className="h-4 w-4 text-[#d4af37]" />
            <span>{isUr ? 'English' : 'اردو'}</span>
          </button>

          {user && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/40 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/60 hover:border-rose-400 transition-colors cursor-pointer active:scale-95"
              title={strings.logout}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{strings.logout}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
