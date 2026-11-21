import { useCallback, useEffect, useState } from 'react';
export type ThemeMode = 'light' | 'dark';
export const THEME_MODE_KEY = 'theme-mode';
function readMode(): ThemeMode {
  try {
    return localStorage.getItem(THEME_MODE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
/** Persists the colour mode in localStorage and toggles the `dark` class on <html>. */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(readMode);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    try {
      localStorage.setItem(THEME_MODE_KEY, mode);
    } catch {
      /* storage unavailable, mode applies for this session only */
    }
  }, [mode]);
  const toggleMode = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);
  return { mode, toggleMode };
}
