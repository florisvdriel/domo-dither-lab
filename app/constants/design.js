// Design system for Halftone Lab
// "Screenprint Studio" aesthetic - dark workshop base with print ink accents

export const COLORS = {
  // Base backgrounds (warmer blacks, not pure)
  bg: {
    primary: '#0D0D0D',      // Main canvas/app background
    secondary: '#161616',     // Elevated surfaces
    tertiary: '#1C1C1C',      // Panels/cards
    elevated: '#252525',      // Hover states
  },
  
  // Screenprint ink colors (from palette)
  ink: {
    coral: '#F5F1E8',
    coralHover: '#FFFFFF',
    coralDim: 'rgba(245, 241, 232, 0.15)',
    teal: '#4A9B8C',
    gold: '#D4A84B',
    navy: '#2D4A6F',
  },
  
  // Paper/cream tones for text
  text: {
    primary: '#F5F1E8',      // Cream (main text)
    secondary: '#B8B5AB',    // Labels/secondary
    tertiary: '#6B6966',     // Hints/disabled
    inverse: '#0D0D0D',      // Text on light backgrounds
  },
  
  // Border system
  border: {
    subtle: '#282828',
    default: '#333333',
    strong: '#404040',
    accent: 'rgba(232, 106, 88, 0.3)',
  }
};

// Typography
export const FONTS = {
  ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  data: 'ui-monospace, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
};

// Common transitions
export const TRANSITIONS = {
  fast: 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
  medium: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

