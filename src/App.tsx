/**
 * Pak Hen Farm - Main Application Root
 * Strictly production-ready, no mock data, permanent state persistence.
 */

import React, { useState, useEffect } from 'react';
import { UserAccount, EggCollectionRecord, GlobalFarmStats, UserAlert, FarmBanner, FarmGalleryItem } from './types/farm';
import { DEFAULT_BANNERS, DEFAULT_GALLERY_ITEMS } from './utils/farmRules';
import {
  getCurrentUser,
  setCurrentUser,
  getLanguagePreference,
  setLanguagePreference,
} from './services/storage';
import {
  apiSyncUser,
  apiGetCollections,
  apiGetStats,
  subscribeToUserDoc,
  subscribeToGlobalStats,
  subscribeToUserAlerts,
  apiMarkAlertsAsRead,
  subscribeToBanners,
  subscribeToGallery,
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

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserAccount | null>(() => getCurrentUser());
  const [lang, setLang] = useState<'en' | 'ur'>(() => getLanguagePreference());
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');

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

  // Centralized Firebase Cloud Sync: live Firestore onSnapshot listeners
  useEffect(() => {
    // 1. Live Global Stats listener
    const unsubStats = subscribeToGlobalStats((freshStats) => {
      setGlobalStats(freshStats);
    });

    // 2. Live Ads Banners listener
    const unsubBanners = subscribeToBanners((freshBanners) => {
      if (freshBanners && freshBanners.length > 0) {
        setBanners(freshBanners);
      }
    });

    // 3. Live Farm Gallery listener
    const unsubGallery = subscribeToGallery((liveGallery) => {
      if (liveGallery && liveGallery.length > 0) {
        setGalleryItems(liveGallery);
      }
    });

    if (!currentUser) {
      return () => {
        unsubStats();
        unsubBanners();
        unsubGallery();
      };
    }

    // 4. Live User profile listener (instantly reflects Admin package approvals and egg collections)
    const unsubUser = subscribeToUserDoc(currentUser.id, async (freshUser) => {
      if (freshUser) {
        setCurrentUserState(freshUser);
        setCurrentUser(freshUser);
        try {
          const freshCols = await apiGetCollections(freshUser);
          setCollections(freshCols);
        } catch {
          // Ignore
        }
      }
    });

    // 5. Live User Alerts listener (for Notifications / Farm Inbox)
    const unsubAlerts = subscribeToUserAlerts(currentUser.id, (freshAlerts) => {
      setUserAlerts(freshAlerts);
    });

    return () => {
      unsubStats();
      unsubBanners();
      unsubGallery();
      unsubUser();
      unsubAlerts();
    };
  }, [currentUser?.id]);

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
    setCurrentUserState(user);
    try {
      const raw = localStorage.getItem(`pakhen_read_alerts_${user.id}`);
      if (raw) setReadAlertIds(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }
    try {
      const cols = await apiGetCollections(user);
      setCollections(cols);
    } catch {
      // Ignore
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
    setCurrentUser(null);
    setCurrentUserState(null);
    setActiveScreen('dashboard');
  };

  // If not authenticated, show Clean Sign In / Register Screen with NO navigation headers
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-5">
        {currentUser.role === 'admin' ? (
          <AdminPortal adminUser={currentUser} lang={lang} />
        ) : currentUser.role === 'staff' ? (
          <StaffPortal staffUser={currentUser} lang={lang} />
        ) : (
          <>
            {activeScreen === 'dashboard' && (
              <UserDashboard
                user={currentUser}
                collections={collections}
                globalStats={globalStats}
                onNavigate={handleNavigate}
                unreadAlertsCount={unreadAlertsCount}
                banners={banners}
                onCollectedEggs={(record, updatedUser) => {
                  setCurrentUserState(updatedUser);
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
              <InviteView user={currentUser} lang={lang} />
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
                lang={lang}
                onNavigate={handleNavigate}
              />
            )}
          </>
        )}
      </main>

      {/* Clean Farm Footer */}
      <footer className="border-t border-[#d4af37]/20 bg-[#051a10] py-6 px-4 text-center text-xs text-[#f4efe6]/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#d4af37] font-semibold">
            <img src="/golden-hen.svg" alt="Golden Hen" className="h-5 w-5" />
            <span>Pak Hen Farm • {lang === 'ur' ? 'پورے پاکستان میں حقیقی فزیکل پولٹری فارمنگ' : 'Real Physical Poultry Farming Across Pakistan'}</span>
          </div>
          <div className="text-xs text-[#f3df88]/80 font-medium">
            {lang === 'ur' ? '100٪ مصدقہ شرعی مضاربہ و فزیکل پولٹری فارمنگ' : '100% Verified Physical Poultry Farming & Shariah Partnership'}
          </div>
        </div>
      </footer>
    </div>
  );
}
