// Presets
export const PRESETS = {
  subtle: {
    name: 'SUBTLE',
    description: 'Light halftone overlay',
    layers: [
      { colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.55, scale: 8, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 0.85 }
    ]
  },
  bold: {
    name: 'BOLD',
    description: 'High contrast dual layer',
    layers: [
      { colorKey: 'festival', ditherType: 'halftoneCircle', threshold: 0.45, scale: 6, angle: 15, offsetX: -8, offsetY: -8, blendMode: 'multiply', opacity: 1 },
      { colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 75, offsetX: 8, offsetY: 8, blendMode: 'multiply', opacity: 1 }
    ]
  },
  vintage: {
    name: 'VINTAGE',
    description: 'Classic print aesthetic',
    layers: [
      { colorKey: 'threshold', ditherType: 'atkinson', threshold: 0.5, scale: 2, angle: 0, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 0.9 },
      { colorKey: 'hearth', ditherType: 'halftoneLines', threshold: 0.55, scale: 4, angle: 45, offsetX: 2, offsetY: 2, blendMode: 'multiply', opacity: 0.7 }
    ]
  },
  cmyk: {
    name: 'CMYK',
    description: 'Four-color process style',
    layers: [
      { colorKey: 'horizon', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: -4, offsetY: 0, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'festival', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 45, offsetX: 0, offsetY: -4, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'threshold', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 0, offsetX: 4, offsetY: 0, blendMode: 'multiply', opacity: 0.8 },
      { colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 75, offsetX: 0, offsetY: 4, blendMode: 'multiply', opacity: 0.9 }
    ]
  },
  retro: {
    name: 'RETRO',
    description: '8-bit computer style',
    layers: [
      { colorKey: 'rooted', ditherType: 'bayer8x8', threshold: 0.5, scale: 3, angle: 0, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 1 }
    ]
  },
  duotone: {
    name: 'DUOTONE',
    description: 'Two-color gradient effect',
    gradient: true,
    gradientColors: ['hearth', 'threshold'],
    ditherType: 'halftoneCircle',
    ditherScale: 6,
    ditherAngle: 15,
    ditherThreshold: 0.5
  },
  rgbSplit: {
    name: 'RGB SPLIT',
    description: 'Chromatic aberration effect',
    layers: [
      { colorKey: 'festival', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: -5, offsetY: 0, blendMode: 'screen', opacity: 1, visible: true },
      { colorKey: 'rooted', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'screen', opacity: 1, visible: true },
      { colorKey: 'horizon', ditherType: 'halftoneCircle', threshold: 0.5, scale: 6, angle: 15, offsetX: 5, offsetY: 0, blendMode: 'screen', opacity: 1, visible: true }
    ]
  }
};

