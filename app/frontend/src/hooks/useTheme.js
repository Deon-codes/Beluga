import { createContext, useState, useContext, useEffect, createElement } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('theme-mode');
      if (saved) {
        return saved === 'dark';
      }
    } catch (error) {
      // Ignore localStorage access failures in restricted environments.
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
    } catch (error) {
      // Ignore write failures.
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((value) => !value);

  return createElement(
    ThemeContext.Provider,
    { value: { isDark, toggleTheme } },
    children
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
