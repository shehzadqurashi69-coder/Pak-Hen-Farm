/**
 * Pak Hen Farm - Main Application Root
 * Optimized for Firebase Free Tier:
 * - Zero Firestore listeners before sign-in
 * - Single targeted user doc listener for active investors (no collection scans inside callbacks)
 * - Short-lived cached one-time fetches for banners, stats, farm profile, alerts, collections, and lazy gallery
 * - Admin/Staff sessions skip investor-only reads completely
 * - Preserves auth session on temporary Firestore quota/network errors
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserAccount,
  EggCollectionRecord,
  GlobalFarmStats,
  UserAlert,
  FarmBanner,
  FarmGalleryItem,
  FarmProfileSettings,
} from './types/farm';
import { DEFAULT_BANNERS, DEFAULT_GALLERY_ITEMS, DEFAULT_FARM_PROFILE } from './utils/farmRules';
import {
  getCurrentUser,
  setCurrentUser,
  getLanguagePreference,
  setLanguagePreference,
} from './services/storage';
import {
  apiGetUserById,
  apiGetCollections,
  apiGetStats,
  apiGetBanners,
  apiGetGallery,
  apiGetFarmProfile,
  apiGetUserAlerts,
  apiMarkAlertsAsRead,
  subscribeToUserDoc,
  clearAllAppCache,
  classifyFirestoreError,
  getFriendlyErrorMessage,
} from './services/api';
import { Header } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { UserDashboard } from './components/UserDashboard';
import { PackagesView } from './components/PackagesView';
import { WithdrawView } from './components/WithdrawView';
import { ProfileView } from './components/ProfileView';
import { InviteView } from './components/InviteView';
import { HelpView } from './components/HelpView';
import { TermsView } from './components/TermsView';
import { NotificationsView } from './components/NotificationsView';
import { WalletView } from './components/WalletView';
import { ProfitView } from './components/ProfitView';
import { FarmGalleryView } from './components/FarmGalleryView';
import { AdminPortal } from './components/AdminPortal';
import { StaffPortal } from './components/StaffPortal';
import { AlertTriangle, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => getCurrentUser());
  const [lang, setLang] = useState<'en' | 'ur'>(() => getLanguagePreference());
  const [activeScreen, setActiveScreen] = useState<string>(() => {
    const u = getCurrentUser();
    if (u?.role === 'admin') return 'admin';
    if (u?.role === 'staff') return 'staff';
    return 'dashboard';
  });

  const [collections, setCollections] = useState<EggCollectionRecord[]>([]);
  const [userAlerts, setUserAlerts] = useState<UserAlert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<Set<string>>(() => {
    try {
      const u = getCurrentUser();
      if (!u) return new Set();
      const raw = localStorage.getItem(`pakhen_read_alerts_${u.id}`);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [globalStats, setGlobalStats] = useState<GlobalFarmStats>({
    totalCollected: 0,
    cracked: 0,
    netFresh: 0,
    lastUpdated: new Date().toISOString(),
  });
  const [banners, setBanners] = useState<FarmBanner[]>(DEFAULT_BANNERS);
  const [galleryItems, setGalleryItems] = useState<FarmGalleryItem[]>(DEFAULT_GALLERY_ITEMS);
  const [farmProfile, setFarmProfile] = useState<FarmProfileSettings>(DEFAULT_FARM_PROFILE);
  const [dbNotice, setDbNotice] = useState<string | null>(null);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);

  const galleryLoadedRef = useRef(false);

  // Keep HTML lang and dir attribute synced with selected language
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    if (lang === 'ur') {
      document.documentElement.classList.add('lang-ur');
    } else {
      document.documentElement.classList.remove('lang-ur');
    }
  }, [lang]);

  // Surface quota/network errors gracefully without logging out or crashing the UI
  const reportDbError = useCallback(
    (err: any) => {
      const classified = classifyFirestoreError(err, lang);
      if (classified.kind === 'quota' || classified.kind === 'network' || classified.kind === 'permission') {
        setDbNotice(getFriendlyErrorMessage(err, lang));
      }
    },
    [lang]
  );

  // Load initial data strictly AFTER sign-in, scoped to the user's role
  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;

    // Admin & Staff load their own data lazily per tab — skip all App-level investor reads & listeners!
    if (currentUser.role === 'admin' || currentUser.role === 'staff') {
      return () => {
        cancelled = true;
      };
    }

    // 1. Load Farm Profile once (cached 15 min) for investor header/footer branding
    apiGetFarmProfile(false)
      .then((profile) => {
        if (!cancelled && profile) setFarmProfile(profile);
      })
      .catch((err) => {
        if (!cancelled) reportDbError(err);
      });

    // 2. Investor one-time cached reads (reused across tab navigation)
    Promise.allSettled([
      apiGetStats(false),
      apiGetBanners(false),
      apiGetCollections(currentUser, false),
      apiGetUserAlerts(currentUser.id, false),
    ]).then(([statsRes, bannersRes, colsRes, alertsRes]) => {
      if (cancelled) return;
      let firstErr: any = null;

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setGlobalStats(statsRes.value);
      } else if (statsRes.status === 'rejected') {
        firstErr = firstErr || statsRes.reason;
      }

      if (bannersRes.status === 'fulfilled' && bannersRes.value && bannersRes.value.length > 0) {
        setBanners(bannersRes.value);
      } else if (bannersRes.status === 'rejected') {
        firstErr = firstErr || bannersRes.reason;
      }

      if (colsRes.status === 'fulfilled' && colsRes.value) {
        setCollections(colsRes.value);
      } else if (colsRes.status === 'rejected') {
        firstErr = firstErr || colsRes.reason;
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value) {
        setUserAlerts(alertsRes.value);
      } else if (alertsRes.status === 'rejected') {
        firstErr = firstErr || alertsRes.reason;
      }

      if (firstErr) {
        reportDbError(firstErr);
      }
    });

    // 3. Retain ONLY ONE real-time listener: the investor's own profile document
    //    so Admin package approvals & wallet changes reflect immediately without extra queries.
    const unsubUser = subscribeToUserDoc(currentUser.id, (freshUser) => {
      if (!cancelled && freshUser) {
        setCurrentUserState(freshUser);
        setCurrentUser(freshUser);
      }
    });

    return () => {
      cancelled = true;
      unsubUser();
    };
  }, [currentUser?.id, currentUser?.role, reportDbError]);

  // Lazy-load Farm Gallery ONLY when the user actually visits the Gallery tab
  useEffect(() => {
    if (!currentUser || activeScreen !== 'gallery' || galleryLoadedRef.current) return;
    let cancelled = false;
    apiGetGallery(false)
      .then((items) => {
        if (!cancelled && items && items.length > 0) {
          setGalleryItems(items);
          galleryLoadedRef.current = true;
        }
      })
      .catch((err) => {
        if (!cancelled) reportDbError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, activeScreen, reportDbError]);

  // Targeted manual Refresh for User Dashboard (reloads ONLY dashboard data, never full DB)
  const handleRefreshDashboard = useCallback(async () => {
    if (!currentUser?.id || isRefreshingDashboard) return;
    setIsRefreshingDashboard(true);
    setDbNotice(null);
    try {
      const [userRes, statsRes, colsRes, alertsRes] = await Promise.allSettled([
        apiGetUserById(currentUser.id, true),
        apiGetStats(true),
        apiGetCollections(currentUser, true),
        apiGetUserAlerts(currentUser.id, true),
      ]);

      let firstErr: any = null;
      if (userRes.status === 'fulfilled' && userRes.value) {
        setCurrentUserState(userRes.value);
        setCurrentUser(userRes.value);
      } else if (userRes.status === 'rejected') {
        firstErr = firstErr || userRes.reason;
      }

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setGlobalStats(statsRes.value);
      } else if (statsRes.status === 'rejected') {
        firstErr = firstErr || statsRes.reason;
      }

      if (colsRes.status === 'fulfilled' && colsRes.value) {
        setCollections(colsRes.value);
      } else if (colsRes.status === 'rejected') {
        firstErr = firstErr || colsRes.reason;
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value) {
        setUserAlerts(alertsRes.value);
      } else if (alertsRes.status === 'rejected') {
        firstErr = firstErr || alertsRes.reason;
      }

      if (firstErr) {
        reportDbError(firstErr);
      }
    } finally {
      setIsRefreshingDashboard(false);
    }
  }, [currentUser, isRefreshingDashboard, reportDbError]);

  const handleToggleLang = () => {
    const nextLang = lang === 'en' ? 'ur' : 'en';
    setLang(nextLang);
    setLanguagePreference(nextLang);
  };

  const handleMarkAllAlertsRead = () => {
    if (!currentUser?.id) return;
    const allIds = userAlerts.map((a) => a.id);
    setReadAlertIds((prev) => {
      const next = new Set([...prev, ...allIds]);
      try {
        localStorage.setItem(`pakhen_read_alerts_${currentUser.id}`, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
    if (allIds.length > 0) {
      apiMarkAlertsAsRead(currentUser.id, allIds).catch(() => {});
    }
  };

  const handleNavigate = (screen: string) => {
    if (screen === 'notifications') {
      handleMarkAllAlertsRead();
    }
    setActiveScreen(screen);
  };

  const unreadAlertsCount =
    activeScreen === 'notifications'
      ? 0
      : userAlerts.filter((a) => !a.read && !readAlertIds.has(a.id)).length;

  const handleLoginSuccess = async (user: UserAccount) => {
    setDbNotice(null);
    setCurrentUserState(user);
    try {
      const raw = localStorage.getItem(`pakhen_read_alerts_${user.id}`);
      if (raw) setReadAlertIds(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }
    if (user.role === 'admin') {
      setActiveScreen('admin');
    } else if (user.role === 'staff') {
      setActiveScreen('staff');
    } else {
      setActiveScreen('dashboard');
    }
  };

  const handleLogout = () => {
    clearAllAppCache();
    galleryLoadedRef.current = false;
    setDbNotice(null);
    setCollections([]);
    setUserAlerts([]);
    setCurrentUser(null);
    setCurrentUserState(null);
    setActiveScreen('dashboard');
  };

  // If not authenticated, show Clean Sign In / Register Screen with ZERO Firestore reads
  if (!currentUser) {
    return (
      <AuthScreen
        onSuccess={handleLoginSuccess}
        lang={lang}
        onToggleLang={handleToggleLang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#051a10] text-[#f4efe6] flex flex-col font-sans selection:bg-[#d4af37] selection:text-[#051a10]">
      {/* App Header with Back button, Logo, Language Toggle, Sign Out */}
      <Header
        user={currentUser}
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        lang={lang}
        onToggleLang={handleToggleLang}
        onLogout={handleLogout}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* Non-blocking Graceful Quota / Network Notice (Preserves Active Session) */}
      {dbNotice && (
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3">
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/50 bg-amber-950/75 px-4 py-3 text-xs text-amber-100 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span className="leading-relaxed">{dbNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDbNotice(null)}
              aria-label={lang === 'ur' ? 'بند کریں' : 'Dismiss notice'}
              className="shrink-0 rounded-lg p-1 text-amber-300 hover:bg-amber-900/50 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area with padding-bottom for sticky bottom bar */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-5 pb-28 sm:pb-32">
        {currentUser.role === 'admin' ? (
          <AdminPortal adminUser={currentUser} farmProfile={farmProfile} lang={lang} />
        ) : currentUser.role === 'staff' ? (
          <StaffPortal staffUser={currentUser} lang={lang} />
        ) : (
          <>
            {activeScreen === 'dashboard' && (
              <UserDashboard
                user={currentUser}
                collections={collections}
                globalStats={globalStats}
                alerts={userAlerts}
                onNavigate={handleNavigate}
                unreadAlertsCount={unreadAlertsCount}
                banners={banners}
                onRefreshDashboard={handleRefreshDashboard}
                isRefreshingDashboard={isRefreshingDashboard}
                onCollectedEggs={(record, updatedUser) => {
                  setCurrentUserState(updatedUser);
                  setCurrentUser(updatedUser);
                  setCollections((prev) => [record, ...prev]);
                }}
                lang={lang}
              />
            )}

            {activeScreen === 'wallet' && (
              <WalletView
                user={currentUser}
                collections={collections}
                lang={lang}
                onNavigate={handleNavigate}
                onUserUpdated={(updatedUser) => {
                  setCurrentUserState(updatedUser);
                  setCurrentUser(updatedUser);
                }}
              />
            )}

            {activeScreen === 'profit' && (
              <ProfitView
                user={currentUser}
                collections={collections}
                lang={lang}
                onNavigate={handleNavigate}
              />
            )}

            {activeScreen === 'packages' && (
              <PackagesView
                user={currentUser}
                onOrderPlaced={() => {
                  // Notification handled in component
                }}
                lang={lang}
              />
            )}

            {activeScreen === 'withdraw' && (
              <WithdrawView
                user={currentUser}
                onWithdrawalRequested={(_req, updatedUser) => {
                  if (updatedUser) {
                    setCurrentUserState(updatedUser);
                    setCurrentUser(updatedUser);
                  }
                }}
                lang={lang}
              />
            )}

            {activeScreen === 'profile' && (
              <ProfileView
                user={currentUser}
                lang={lang}
                onNavigate={(tab) => setActiveScreen(tab as any)}
              />
            )}

            {activeScreen === 'invite' && (
              <InviteView
                user={currentUser}
                lang={lang}
                onUserUpdated={(updatedUser) => {
                  setCurrentUserState(updatedUser);
                  setCurrentUser(updatedUser);
                }}
              />
            )}

            {activeScreen === 'help' && (
              <HelpView user={currentUser} lang={lang} />
            )}

            {activeScreen === 'terms' && (
              <TermsView lang={lang} />
            )}

            {activeScreen === 'notifications' && (
              <NotificationsView
                user={currentUser}
                alerts={userAlerts}
                lang={lang}
                onMarkAllRead={handleMarkAllAlertsRead}
                onUserUpdated={(updatedUser) => {
                  setCurrentUserState(updatedUser);
                  setCurrentUser(updatedUser);
                }}
              />
            )}

            {activeScreen === 'gallery' && (
              <FarmGalleryView
                user={currentUser}
                items={galleryItems}
                farmProfile={farmProfile}
                lang={lang}
                onNavigate={handleNavigate}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Farm Footer */}
      <footer className="border-t border-[#d4af37]/20 bg-[#051a10] py-6 px-4 text-center text-xs text-[#f4efe6]/50 mb-14 sm:mb-16">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#d4af37] font-semibold">
            <img src="/golden-hen.svg" alt="Golden Hen" className="h-5 w-5" />
            <span>
              {farmProfile.farmName || 'Pak Hen Farm'} •{' '}
              {lang === 'ur'
                ? farmProfile.farmBioUr || 'پورے پاکستان میں حقیقی فزیکل پولٹری فارمنگ'
                : farmProfile.farmBio || 'Real Physical Poultry Farming Across Pakistan'}
            </span>
          </div>
          <div className="text-xs text-[#f3df88]/80 font-medium">
            {lang === 'ur'
              ? '100٪ مصدقہ شرعی مضاربہ و فزیکل پولٹری فارمنگ'
              : '100% Verified Physical Poultry Farming & Shariah Partnership'}
          </div>
        </div>
      </footer>

      {/* Fixed Bottom Navigation Bar (Sticky - Always visible without scrolling) */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#08130e]/95 backdrop-blur-md border-t border-[#d4af37] px-3 py-2 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('dashboard');
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'dashboard' ? 'text-[#d4af37]' : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
            }`}
          >
            <span className="text-base">🏠</span>
            <span className="text-[11px]">{lang === 'ur' ? 'ہوم' : 'Home'}</span>
          </a>

          <a
            href="#gallery"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('gallery');
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'gallery' ? 'text-[#d4af37]' : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
            }`}
          >
            <span className="text-base">🖼️</span>
            <span className="text-[11px]">{lang === 'ur' ? 'گیلری' : 'Gallery'}</span>
          </a>

          <a
            href="#sos"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('help');
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'help' ? 'text-[#d4af37]' : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
            }`}
          >
            <span className="text-base">🚨</span>
            <span className="text-[11px]">{lang === 'ur' ? 'ہیلپ / SOS' : 'Help / SOS'}</span>
          </a>

          <a
            href="#terms"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('terms');
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'terms' ? 'text-[#d4af37]' : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
            }`}
          >
            <span className="text-base">📜</span>
            <span className="text-[11px]">{lang === 'ur' ? 'قواعد' : 'Terms'}</span>
          </a>

          <a
            href="#profile"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate('profile');
            }}
            className={`flex flex-col items-center gap-0.5 text-xs font-bold transition-all cursor-pointer ${
              activeScreen === 'profile' ? 'text-[#d4af37]' : 'text-[#f4efe6]/70 hover:text-[#f4efe6]'
            }`}
          >
            <span className="text-base">👤</span>
            <span className="text-[11px]">{lang === 'ur' ? 'میری پروفائل' : 'My Profile'}</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
