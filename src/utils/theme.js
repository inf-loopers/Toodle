/**
 * @file theme.js
 * @description Shared light/dark theme helpers for pages inside and outside the app shell.
 *
 * The active theme is stored under a single localStorage key and applied by
 * toggling the `dark` class on <html> (see `@custom-variant dark` in
 * `src/styles/index.css`). Both `PageLayout` (the shell) and standalone
 * routes such as `/onboarding` use these helpers so switching themes behaves
 * the same everywhere.
 */

export const THEME_STORAGE_KEY = 'toodle.theme';

/**
 * Read the initial theme from localStorage, falling back to the OS preference.
 */
export function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * Apply a theme to the document root.
 */
export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

/**
 * Persist the active theme for future sessions.
 */
export function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }
}
