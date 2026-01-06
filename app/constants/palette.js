/**
 * Domo Brand Palette
 * Fixed colors for Domo Halftone Lab
 */

export const DOMO_PALETTE = {
  blue: { name: 'Domo Blue', hex: '#0062FF', rgb: [0, 98, 255] },
  darkRed: { name: 'Domo Dark Red', hex: '#430E0A', rgb: [67, 14, 10] },
  red: { name: 'Domo Red', hex: '#E9280A', rgb: [233, 40, 10] },
  green: { name: 'Domo Green', hex: '#11533B', rgb: [17, 83, 59] },
  gold: { name: 'Domo Gold', hex: '#C7A95A', rgb: [199, 169, 90] },
  black: { name: 'Black', hex: '#000000', rgb: [0, 0, 0] },
  white: { name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255] }
};

// Helper to get array of values if needed
export const DOMO_COLORS = Object.values(DOMO_PALETTE);

// Export as DEFAULT_PALETTE for compatibility
export const DEFAULT_PALETTE = DOMO_PALETTE;
