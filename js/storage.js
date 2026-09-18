/**
 * Persistenz im localStorage. Bewusst defensiv: in privaten Fenstern oder bei
 * blockierten Cookies kann der Zugriff werfen - die App muss trotzdem laufen.
 */
import { CONFIG } from './config.js';

export function loadState() {
  try {
    const raw = window.localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Meetingkosten: Zustand konnte nicht geladen werden.', error);
    return null;
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    return true;
  } catch (error) {
    console.warn('Meetingkosten: Zustand konnte nicht gesichert werden.', error);
    return false;
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(CONFIG.storageKey);
    return true;
  } catch (error) {
    console.warn('Meetingkosten: Zustand konnte nicht gelöscht werden.', error);
    return false;
  }
}
