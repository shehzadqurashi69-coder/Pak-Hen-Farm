/**
 * Pak Hen Farm - Client Session & Preference State
 * All application business data (orders, users, withdrawals, stats) is 100% managed
 * by Firebase Cloud Database (Firestore).
 */

import { UserAccount } from '../types/farm';

const SESSION_KEY = 'pakhenfarm_active_session_user';
const LANG_KEY = 'pakhenfarm_app_language';

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Error saving session:', e);
  }
}

export function getLanguagePreference(): 'en' | 'ur' {
  try {
    const lang = localStorage.getItem(LANG_KEY);
    return lang === 'ur' ? 'ur' : 'en';
  } catch {
    return 'en';
  }
}

export function setLanguagePreference(lang: 'en' | 'ur'): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    console.error('Error saving language:', e);
  }
}
