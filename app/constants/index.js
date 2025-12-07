export const BLEND_MODES = {
  multiply: 'MULTIPLY',
  normal: 'NORMAL',
  screen: 'SCREEN',
  overlay: 'OVERLAY',
  darken: 'DARKEN',
  lighten: 'LIGHTEN',
};

export const EXPORT_RESOLUTIONS = { 
  '1x': { scale: 1, label: 'SCREEN (1x)' }, 
  '2x': { scale: 2, label: 'PRINT (2x)' }, 
  '4x': { scale: 4, label: 'LARGE (4x)' } 
};

// Preview resolution limit for performance
export const PREVIEW_MAX_WIDTH = 1500;

// Default state values
export const DEFAULT_STATE = {
  imageScale: 1.0,
  brightness: 0,
  contrast: 0,
  invert: false,
  preBlur: 0,
  inkBleed: false,
  inkBleedAmount: 0.5,
  inkBleedRoughness: 0.5,
  paperTexture: false,
  gradientEnabled: false,
  gradientColors: ['black', 'white'],
  gradientDitherType: 'none',
  gradientDitherScale: 8,
  gradientDitherAngle: 15,
  gradientDitherThreshold: 0.5,
  backgroundColor: '#000000',
  exportResolution: '1x',
  viewportSize: { w: 1080, h: 1080 },
  imageTransform: { x: 0, y: 0, scale: 1 },
  layers: [
    { id: 1, colorKey: 'hearth', ditherType: 'halftoneCircle', threshold: 0.5, scale: 8, angle: 15, offsetX: 0, offsetY: 0, blendMode: 'multiply', opacity: 1, visible: true }
  ]
};


