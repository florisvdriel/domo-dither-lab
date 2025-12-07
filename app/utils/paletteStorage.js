// Palette localStorage persistence

const CUSTOM_PALETTE_KEY = 'halftone-lab-custom-palette';
const ACTIVE_PALETTE_KEY = 'halftone-lab-active-palette';

// Default custom palette structure
export const DEFAULT_CUSTOM_PALETTE = {};

// Load custom palette from localStorage
export function loadCustomPalette() {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_PALETTE;
  
  try {
    const stored = localStorage.getItem(CUSTOM_PALETTE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate structure
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load custom palette:', e);
  }
  return DEFAULT_CUSTOM_PALETTE;
}

// Save custom palette to localStorage
export function saveCustomPalette(palette) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CUSTOM_PALETTE_KEY, JSON.stringify(palette));
  } catch (e) {
    console.warn('Failed to save custom palette:', e);
  }
}

// Load active palette mode ('default' or 'custom')
export function loadActivePaletteMode() {
  if (typeof window === 'undefined') return 'default';
  
  try {
    const stored = localStorage.getItem(ACTIVE_PALETTE_KEY);
    if (stored === 'custom' || stored === 'default') {
      return stored;
    }
  } catch (e) {
    console.warn('Failed to load active palette mode:', e);
  }
  return 'default';
}

// Save active palette mode
export function saveActivePaletteMode(mode) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ACTIVE_PALETTE_KEY, mode);
  } catch (e) {
    console.warn('Failed to save active palette mode:', e);
  }
}

// Validate a color entry
export function validateColor(color) {
  if (!color || typeof color !== 'object') return false;
  if (typeof color.name !== 'string' || !color.name.trim()) return false;
  if (typeof color.hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color.hex)) return false;
  return true;
}

// Convert hex to RGB array
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

// Create a palette entry from hex and name
export function createPaletteEntry(name, hex) {
  return {
    name,
    hex: hex.toUpperCase(),
    rgb: hexToRgb(hex)
  };
}
