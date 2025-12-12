// Presets - using generic color keys that map to DEFAULT_PALETTE
// Color keys: coral, teal, gold, navy, plum, white, black
export const PRESETS = {
  subtle: {
    name: 'SUBTLE',
    description: 'Light halftone overlay',
    layers: [
      { colorKey: 'navy', ditherType: 'halftoneCircle', threshold: 0.55, scale: 8, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 0.85 }
    ]
  },
  bold: {
    name: 'BOLD',
    description: 'High contrast dual layer',
    layers: [
      { colorKey: 'coral', ditherType: 'halftoneCircle', threshold: 0.45, scale: 6, angle: 15, offsetX: -8, offsetY: -8, blendMode: 'multiply', opacity: 1 },
      { colorKey: 'navy', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 75, offsetX: 8, offsetY: 8, blendMode: 'multiply', opacity: 1 }
    ]
  },
  vintage: {
    name: 'VINTAGE',
    description: 'Classic print aesthetic',
    layers: [
      { colorKey: 'gold', ditherType: 'atkinson', threshold: 0.5, scale: 2, angle: 0, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 0.9 },
      { colorKey: 'navy', ditherType: 'halftoneLines', threshold: 0.55, scale: 4, angle: 45, offsetX: 2, offsetY: 2, blendMode: 'multiply', opacity: 0.7 }
    ]
  },
  cmyk: {
    name: 'CMYK',
    description: 'Four-color process style',
    layers: [
      { colorKey: 'teal', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: -4, offsetY: 0, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'coral', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 45, offsetX: 0, offsetY: -4, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'gold', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 0, offsetX: 4, offsetY: 0, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'navy', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 75, offsetX: 0, offsetY: 4, blendMode: 'multiply', opacity: 0.9 }
    ]
  },
  retro: {
    name: 'RETRO',
    description: '8-bit computer style',
    layers: [
      { colorKey: 'teal', ditherType: 'bayer8x8', threshold: 0.5, scale: 3, angle: 0, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 1 }
    ]
  },
  duotone: {
    name: 'DUOTONE',
    description: 'Two-color print effect',
    backgroundColor: '#2D4A6F',
    layers: [
      { colorKey: 'gold', ditherType: 'halftoneCircle', threshold: 0.55, scale: 6, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'screen', opacity: 1, visible: true }
    ]
  },
  rgbSplit: {
    name: 'RGB SPLIT',
    description: 'Chromatic aberration effect',
    layers: [
      { colorKey: 'coral', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: -5, offsetY: 0, blendMode: 'multiply', opacity: 1, visible: true },
      { colorKey: 'teal', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 1, visible: true },
      { colorKey: 'plum', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: 5, offsetY: 0, blendMode: 'multiply', opacity: 1, visible: true }
    ]
  }
};
