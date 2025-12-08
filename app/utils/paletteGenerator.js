/**
 * Palette Generator Utility
 * Generates harmonious color palettes using color theory
 */

// Color harmony types - all generate exactly 4 colors
export const HARMONY_TYPES = {
  tetradic: {
    name: 'Tetradic',
    description: '4 colors, 90° apart',
    colorCount: 4
  },
  analogous: {
    name: 'Analogous',
    description: '4 colors, adjacent on wheel',
    colorCount: 4
  },
  triadic: {
    name: 'Triadic+',
    description: '3 colors + complement',
    colorCount: 4
  },
  splitComplementary: {
    name: 'Split-Comp+',
    description: '3 split + accent',
    colorCount: 4
  },
  monochromatic: {
    name: 'Monochromatic',
    description: '4 shades of one hue',
    colorCount: 4
  }
};

// Convert HSL to RGB
function hslToRgb(h, s, l) {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Convert RGB to Hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('').toUpperCase();
}

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

// Generate a random base hue
function randomHue() {
  return Math.floor(Math.random() * 360);
}

// Generate a random saturation (biased towards vivid colors)
function randomSaturation() {
  return 50 + Math.random() * 40; // 50-90%
}

// Generate a random lightness (avoiding too dark or too light)
function randomLightness() {
  return 35 + Math.random() * 35; // 35-70%
}

// Normalize hue to 0-360
function normalizeHue(h) {
  return ((h % 360) + 360) % 360;
}

// Create a color object from HSL values
function createColor(name, h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return {
    name,
    hex: rgbToHex(...rgb),
    rgb
  };
}

// Generate complementary palette expanded to 4 colors
function generateComplementary(baseHue, baseSat, baseLight) {
  return [
    createColor('Primary', baseHue, baseSat, baseLight),
    createColor('Primary Light', baseHue, baseSat - 10, baseLight + 15),
    createColor('Complement', normalizeHue(baseHue + 180), baseSat, baseLight),
    createColor('Complement Dark', normalizeHue(baseHue + 180), baseSat + 5, baseLight - 15)
  ];
}

// Generate analogous palette (3-5 colors, adjacent on wheel)
function generateAnalogous(baseHue, baseSat, baseLight, count = 4) {
  const colors = [];
  const step = 30; // 30° apart
  const startOffset = -step * Math.floor(count / 2);
  
  for (let i = 0; i < count; i++) {
    const hue = normalizeHue(baseHue + startOffset + (i * step));
    // Vary lightness slightly for visual interest
    const lightVariation = (i - count/2) * 5;
    colors.push(createColor(`Color ${i + 1}`, hue, baseSat, baseLight + lightVariation));
  }
  
  return colors;
}

// Generate triadic palette expanded to 4 colors (3 + complement)
function generateTriadic(baseHue, baseSat, baseLight) {
  return [
    createColor('Primary', baseHue, baseSat, baseLight),
    createColor('Secondary', normalizeHue(baseHue + 120), baseSat, baseLight),
    createColor('Tertiary', normalizeHue(baseHue + 240), baseSat, baseLight),
    createColor('Accent', normalizeHue(baseHue + 180), baseSat - 10, baseLight + 10)
  ];
}

// Generate split-complementary palette expanded to 4 colors
function generateSplitComplementary(baseHue, baseSat, baseLight) {
  return [
    createColor('Primary', baseHue, baseSat, baseLight),
    createColor('Split 1', normalizeHue(baseHue + 150), baseSat, baseLight),
    createColor('Split 2', normalizeHue(baseHue + 210), baseSat, baseLight),
    createColor('Accent', normalizeHue(baseHue + 60), baseSat - 15, baseLight + 10)
  ];
}

// Generate tetradic/square palette (4 colors, 90° apart)
function generateTetradic(baseHue, baseSat, baseLight) {
  return [
    createColor('Primary', baseHue, baseSat, baseLight),
    createColor('Secondary', normalizeHue(baseHue + 90), baseSat, baseLight - 5),
    createColor('Tertiary', normalizeHue(baseHue + 180), baseSat, baseLight),
    createColor('Quaternary', normalizeHue(baseHue + 270), baseSat, baseLight - 5)
  ];
}

// Generate monochromatic palette (4 variations of one hue)
function generateMonochromatic(baseHue, baseSat, baseLight) {
  const colors = [];
  const count = 4;
  const lightStep = 45 / (count - 1); // Spread across lightness range
  const satVariation = 10;
  
  for (let i = 0; i < count; i++) {
    const light = 30 + (i * lightStep); // 30% to 75%
    const sat = baseSat + (Math.random() - 0.5) * satVariation;
    colors.push(createColor(`Shade ${i + 1}`, baseHue, Math.max(30, Math.min(90, sat)), light));
  }
  
  return colors;
}

/**
 * Generate a palette based on harmony type
 * @param {string} harmonyType - One of the HARMONY_TYPES keys
 * @param {number} baseHue - Optional base hue (0-360), random if not provided
 * @param {number} baseSat - Optional base saturation (0-100)
 * @param {number} baseLight - Optional base lightness (0-100)
 * @returns {Object} Palette object with color entries
 */
export function generatePalette(harmonyType, baseHue = null, baseSat = null, baseLight = null) {
  // Use provided values or generate random ones
  const hue = baseHue !== null ? baseHue : randomHue();
  const sat = baseSat !== null ? baseSat : randomSaturation();
  const light = baseLight !== null ? baseLight : randomLightness();
  
  let colors;
  
  switch (harmonyType) {
    case 'analogous':
      colors = generateAnalogous(hue, sat, light, 4);
      break;
    case 'triadic':
      colors = generateTriadic(hue, sat, light);
      break;
    case 'splitComplementary':
      colors = generateSplitComplementary(hue, sat, light);
      break;
    case 'tetradic':
      colors = generateTetradic(hue, sat, light);
      break;
    case 'monochromatic':
      colors = generateMonochromatic(hue, sat, light);
      break;
    default:
      colors = generateTetradic(hue, sat, light);
  }
  
  // Convert array to palette object
  const palette = {};
  colors.forEach((color, index) => {
    const key = color.name.toLowerCase().replace(/\s+/g, '_');
    palette[key] = color;
  });
  
  return palette;
}

/**
 * Generate a completely random palette with specified number of colors
 * @param {number} count - Number of colors (2-6)
 * @returns {Object} Palette object
 */
export function generateRandomPalette(count = 4) {
  const harmonyTypes = Object.keys(HARMONY_TYPES);
  const randomType = harmonyTypes[Math.floor(Math.random() * harmonyTypes.length)];
  return generatePalette(randomType);
}

/**
 * Get color names for generated palettes
 */
const COLOR_NAMES = [
  'Coral', 'Teal', 'Gold', 'Navy', 'Plum', 'Sage', 'Rose', 'Azure',
  'Amber', 'Jade', 'Ruby', 'Slate', 'Ochre', 'Mint', 'Berry', 'Storm'
];

/**
 * Generate a named palette with pleasant color names
 * @param {string} harmonyType - Harmony type
 * @returns {Object} Palette with nice names
 */
export function generateNamedPalette(harmonyType) {
  const rawPalette = generatePalette(harmonyType);
  const palette = {};
  const usedNames = new Set();
  
  Object.values(rawPalette).forEach((color, index) => {
    // Pick a unique name
    let name;
    do {
      name = COLOR_NAMES[Math.floor(Math.random() * COLOR_NAMES.length)];
    } while (usedNames.has(name) && usedNames.size < COLOR_NAMES.length);
    usedNames.add(name);
    
    const key = name.toLowerCase();
    palette[key] = {
      ...color,
      name
    };
  });
  
  return palette;
}

