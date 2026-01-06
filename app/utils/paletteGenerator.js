/**
 * Palette Generator Utility
 * Refactored for Domo Halftone Lab to enforce fixed brand palette
 */

import { DOMO_PALETTE } from '../constants/palette';

// Helper to get color name from hex (kept for compatibility)
export function getColorNameFromHex(hex) {
  if (!hex) return 'Unknown';
  const normalizedHex = hex.toUpperCase();
  const match = Object.values(DOMO_PALETTE).find(c => c.hex === normalizedHex);
  return match ? match.name : 'Custom Color';
}

/**
 * Returns the fixed Domo palette
 * Ignores harmonyType params to enforce brand consistency
 */
export function generatePalette(harmonyType = null, baseHue = null, baseSat = null, baseLight = null) {
  return { ...DOMO_PALETTE };
}

/**
 * Returns the fixed Domo palette
 */
export function generateRandomPalette(count = 4) {
  return { ...DOMO_PALETTE };
}

/**
 * Returns the fixed Domo palette
 */
export function generateNamedPalette(harmonyType) {
  return { ...DOMO_PALETTE };
}

// Export harmony types for compatibility (though unused)
export const HARMONY_TYPES = {
  domo: {
    name: 'Domo Brand',
    description: 'Fixed brand colors',
    colorCount: 7
  }
};
