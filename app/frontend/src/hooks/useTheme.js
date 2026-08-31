import { createContext, useState, useContext, useEffect, createElement } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {};

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
