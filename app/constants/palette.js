// Default Color Palette - 8 colors for up to 10 layers
export const DEFAULT_PALETTE = {
  coral: { name: 'Coral', hex: '#E86A58', rgb: [232, 106, 88] },
  teal: { name: 'Teal', hex: '#4A9B8C', rgb: [74, 155, 140] },
  gold: { name: 'Gold', hex: '#D4A84B', rgb: [212, 168, 75] },
  navy: { name: 'Navy', hex: '#2D4A6F', rgb: [45, 74, 111] },
  plum: { name: 'Plum', hex: '#8B5A8C', rgb: [139, 90, 140] },
  olive: { name: 'Olive', hex: '#7A8B4A', rgb: [122, 139, 74] },
  slate: { name: 'Slate', hex: '#5A6B7A', rgb: [90, 107, 122] },
  peach: { name: 'Peach', hex: '#E8A07A', rgb: [232, 160, 122] },
  white: { name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255] },
  black: { name: 'Black', hex: '#000000', rgb: [0, 0, 0] },
};

// Color keys excluding black and white (for layers)
export const COLOR_KEYS = ['coral', 'teal', 'gold', 'navy', 'plum', 'olive', 'slate', 'peach'];

export const ALL_COLOR_KEYS = Object.keys(DEFAULT_PALETTE);
