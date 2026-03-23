/**
 * Hook that applies the correct theme class to the document root.
 * @module hooks/useThemeEffect
 */

import { useEffect } from 'react';
import type { Theme } from '@/shared';

/**
 * Applies 'light' or 'dark' class to `<html>` based on the theme setting.
 * When theme is 'system', listens to OS preference via matchMedia.
 *
 * @param theme - The theme preference: 'system', 'light', or 'dark'
 */
export function useThemeEffect(theme: Theme) {
  useEffect(() => {
    function applyTheme(resolved: 'light' | 'dark') {
      const cl = document.documentElement.classList;
      cl.toggle('light', resolved === 'light');
      cl.toggle('dark', resolved === 'dark');
    }

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: light)');
      applyTheme(mql.matches ? 'light' : 'dark');
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'light' : 'dark');
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);
}
