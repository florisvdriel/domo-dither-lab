'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Always use dark theme to match the design system
  const theme = 'dark';

  if (!mounted) {
    // Prevent flash of unstyled content
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme }}>
      <div className="dark" data-theme="dark">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
