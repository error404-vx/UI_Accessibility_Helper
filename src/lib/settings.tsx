import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { WcagLevel } from '../../shared/types';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  level: WcagLevel;
  theme: Theme;
  reducedMotion: boolean;
}

const DEFAULTS: Settings = { level: 'AA', theme: 'system', reducedMotion: false };
const STORAGE_KEY = 'uah-settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext<{ settings: Settings; update: (patch: Partial<Settings>) => void } | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    root.classList.toggle('reduce-motion', settings.reducedMotion);
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}

export function prefersReducedMotion(settings: Settings): boolean {
  return settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
