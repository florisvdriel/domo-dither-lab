/**
 * SVG Export Utilities for Halftone Lab
 * Generates optimized, layered SVG files for print and digital workflows
 */

import { DEFAULT_PALETTE } from '../constants/palette';
import { DITHER_ALGORITHMS } from '../constants/ditherAlgorithms';
import { getGray, GRAY_R, GRAY_G, GRAY_B } from './helpers';
import { applyBrightnessContrast } from './imageProcessing';

// Helper: Get Channel Value
const getChannel = (data, i, channel) => {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  switch (channel) {
    case 'red': return r;
    case 'green': return g;
    case 'blue': return b;
    case 'cyan': return 255 - r;
    case 'magenta': return 255 - g;
    case 'yellow': return 255 - b;
    case 'black': return Math.max(0, 255 - Math.max(r, g, b));
    case 'gray': default:
      return r * GRAY_R + g * GRAY_G + b * GRAY_B;
  }
};

// Helper: Box Blur
function boxBlur(data, w, h, radius) {
  if (radius < 1) return;
  const len = w * h;
  const temp = new Float32Array(len);

  // Horizontal
  for (let y = 0; y < h; y++) {
    const yw = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(w - 1, Math.max(0, x + k));
        sum += data[yw + px];
        count++;
      }
      temp[yw + x] = sum / count;
    }
  }

  // Vertical
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(h - 1, Math.max(0, y + k));
        sum += temp[py * w + x];
        count++;
      }
      data[y * w + x] = sum / count;
    }
  }
}

// Helper: Preprocess (Blur, B/C, Clamp, Invert) -> Returns 0-1 Darkness Map
function preprocess(imageData, w, h, options) {
  const {
    channel = 'gray',
    preBlur = 0,
    brightness = 0,
    contrast = 0,
    invert = false,
    clampMin = 0,
    clampMax = 1
  } = options;

  const len = w * h;
  const input = imageData.data;
  const output = new Float32Array(len);

  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < len; i++) {
    let val = getChannel(input, i * 4, channel);

    if (contrast !== 0) val = cFactor * (val - 128) + 128;
    if (brightness !== 0) val += brightness * 2.55;

    val = Math.max(0, Math.min(255, val));
    let norm = val / 255;

    let darkness = 1 - norm;
    const isInk = ['cyan', 'magenta', 'yellow', 'black'].includes(channel);
    if (isInk) darkness = norm;

    if (invert) darkness = 1 - darkness;

    if (darkness < clampMin) darkness = 0;
    else if (darkness > clampMax) darkness = 1;
    else darkness = (darkness - clampMin) / (clampMax - clampMin);

    output[i] = darkness;
  }

  if (preBlur > 0) boxBlur(output, w, h, preBlur);

  return output;
}

// Coordinate precision for file size optimization
const PRECISION = 1;
const round = (n) => Math.round(n * 10) / 10;

// Minimum element size threshold (skip elements smaller than this)
const MIN_ELEMENT_SIZE = 0.5;

/**
 * Generate SVG content for a single layer
 * @param {Object} palette - The active color palette to use
 */
export function generateLayerSVG(layer, sourceImageData, dimensions, options = {}, palette = DEFAULT_PALETTE) {
  const { width, height } = dimensions;
  const { scaleFactor = 1, includeWrapper = true } = options;

  const color = palette[layer.colorKey];
  if (!color) return '';

  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
  let elements = '';

  // Feature: Per-layer brightness/contrast
  let layerSourceImageData = sourceImageData;
  if ((layer.brightness && layer.brightness !== 0) || (layer.contrast && layer.contrast !== 0)) {
    layerSourceImageData = applyBrightnessContrast(sourceImageData, layer.brightness || 0, layer.contrast || 0);
  }

  // Generate pattern based on algorithm type
  if (algoInfo?.category === 'halftone') {
    if (layer.ditherType === 'halftoneCircle') {
      elements = generateHalftoneCircles(layer, layerSourceImageData, dimensions, scaleFactor);
    } else if (layer.ditherType === 'halftoneSquare') {
      elements = generateHalftoneSquares(layer, layerSourceImageData, dimensions, scaleFactor);
    } else if (layer.ditherType === 'halftoneLines') {
      elements = generateHalftoneLines(layer, layerSourceImageData, dimensions, scaleFactor);
    }
  } else if (algoInfo?.category === 'ordered') {
    elements = generateBayerPattern(layer, layerSourceImageData, dimensions, scaleFactor);
  } else if (algoInfo?.category === 'diffusion') {
    elements = generateErrorDiffusionPaths(layer, layerSourceImageData, dimensions, scaleFactor);
  } else if (layer.ditherType === 'noise') {
    elements = generateNoiseStipple(layer, layerSourceImageData, dimensions, scaleFactor);
  }

  if (!includeWrapper) {
    return elements;
  }

  const blendMode = layer.blendMode || 'multiply';
  return `  <g id="${color.name.replace(/\s+/g, '-')}" fill="${color.hex}" opacity="${layer.opacity}" style="mix-blend-mode: ${blendMode};">\n${elements}  </g>\n`;
}

/**
 * Generate halftone circles pattern
 */
function generateHalftoneCircles(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  // Preprocess source data using new parameters
  const preOptions = {
    channel: layer.channel,
    preBlur: (layer.preBlur || 0) * scaleFactor, // Scale blur radius
    brightness: layer.brightness,
    contrast: layer.contrast,
    invert: layer.invert,
    clampMin: layer.clampMin,
    clampMax: layer.clampMax
  };

  // Create darkness map (0-1)
  // Notes: preprocess expects specific w/h matching the ImageData. 
  // sourceImageData here is the original full-res image usually?
  // dimensions is the target SVG size.
  // We need to map coordinate space.

  // The 'preprocess' function works on the provided imageData.
  // We should preprocess the source image ONCE.
  // But wait, 'generateHalftoneCircles' is called per layer.
  // Processing the hole full-res source might be efficient enough.
  const mapWidth = sourceImageData.width;
  const mapHeight = sourceImageData.height;
  const map = preprocess(sourceImageData, mapWidth, mapHeight, preOptions);

  const step = Math.max(1, Math.floor(layer.scale * scaleFactor));
  const baseRadius = step * 0.5;
  const rad = (layer.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const wHalf = width * 0.5;
  const hHalf = height * 0.5;

  // Offsets
  const offsetX = layer.offsetX * scaleFactor;
  const offsetY = layer.offsetY * scaleFactor;

  // Grid Bounds
  const diagonal = Math.sqrt(width * width + height * height);
  const gridExtent = diagonal * 0.7; // Slightly larger to cover rotation
  const minGrid = Math.floor(-gridExtent / step) * step;
  const maxGrid = Math.ceil(gridExtent / step) * step;

  let svg = '';
  const circles = [];

  const dotScaleMin = layer.dotScaleMin !== undefined ? layer.dotScaleMin : 0.1;
  const dotScaleMax = layer.dotScaleMax !== undefined ? layer.dotScaleMax : 1;

  const gridType = layer.gridType || 'square';
  const isHex = gridType === 'hex';

  // Helper to process dot
  const processDot = (cx, cy) => {
    // Bounds check
    if (cx < -step || cx >= width + step || cy < -step || cy >= height + step) return;

    // Sample position (apply layer offset)
    const sampleX = cx - offsetX;
    const sampleY = cy - offsetY;

    // Map to source image coordinates
    const srcX = Math.round(sampleX * mapWidth / width);
    const srcY = Math.round(sampleY * mapHeight / height);

    if (srcX >= 0 && srcX < mapWidth && srcY >= 0 && srcY < mapHeight) {
      const idx = srcY * mapWidth + srcX;
      const darkness = map[idx]; // 0-1

      // Calculate radius
      // relativeSize maps darkness 0-1 to dotScaleMin-dotScaleMax
      const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));

      // Apply Threshold as global density scale
      let radius = baseRadius * relativeSize * layer.threshold;

      if (radius >= MIN_ELEMENT_SIZE) {
        circles.push({ cx: round(cx), cy: round(cy), r: round(radius) });
      }
    }
  };

  if (gridType === 'radial') {
    const maxR = gridExtent;
    for (let r = 0; r <= maxR; r += step) {
      const circumference = 2 * Math.PI * r;
      const dotsCount = r === 0 ? 1 : Math.round(circumference / step);
      const angleStep = (2 * Math.PI) / dotsCount;
      for (let i = 0; i < dotsCount; i++) {
        const theta = i * angleStep + rad;
        const cx = wHalf + r * Math.cos(theta);
        const cy = hHalf + r * Math.sin(theta);
        processDot(cx, cy);
      }
    }
  } else {
    // Square & Hex
    let row = 0;
    for (let gy = minGrid; gy <= maxGrid; gy += (isHex ? step * 0.866 : step)) {
      const rowOffset = (isHex && row % 2 !== 0) ? step * 0.5 : 0;
      row++;
      for (let gx = minGrid; gx <= maxGrid; gx += step) {
        const cx = (gx + rowOffset) * cos - gy * sin + wHalf;
        const cy = (gx + rowOffset) * sin + gy * cos + hHalf;
        processDot(cx, cy);
      }
    }
  }

  // Generate optimized SVG
  for (const c of circles) {
    svg += `    <circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>\n`;
  }

  return svg;
}

/**
 * Generate halftone squares pattern
 */
/**
 * Generate halftone squares pattern
 */
function generateHalftoneSquares(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;

  const preOptions = {
    channel: layer.channel,
    preBlur: (layer.preBlur || 0) * scaleFactor,
    brightness: layer.brightness,
    contrast: layer.contrast,
    invert: layer.invert,
    clampMin: layer.clampMin,
    clampMax: layer.clampMax
  };

  const mapWidth = sourceImageData.width;
  const mapHeight = sourceImageData.height;
  const map = preprocess(sourceImageData, mapWidth, mapHeight, preOptions);

  const step = Math.max(1, Math.floor(layer.scale * scaleFactor));
  const baseSize = step * 0.85;
  const rad = (layer.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const wHalf = width * 0.5;
  const hHalf = height * 0.5;

  const offsetX = layer.offsetX * scaleFactor;
  const offsetY = layer.offsetY * scaleFactor;

  const diagonal = Math.sqrt(width * width + height * height);
  const gridExtent = diagonal * 0.7;
  const minGrid = Math.floor(-gridExtent / step) * step;
  const maxGrid = Math.ceil(gridExtent / step) * step;

  let svg = '';
  const squares = [];

  const dotScaleMin = layer.dotScaleMin !== undefined ? layer.dotScaleMin : 0.1;
  const dotScaleMax = layer.dotScaleMax !== undefined ? layer.dotScaleMax : 1;
  const gridType = layer.gridType || 'square';
  const isHex = gridType === 'hex';

  const processSquare = (cx, cy) => {
    if (cx < -step || cx >= width + step || cy < -step || cy >= height + step) return;

    const sampleX = cx - offsetX;
    const sampleY = cy - offsetY;

    const srcX = Math.round(sampleX * mapWidth / width);
    const srcY = Math.round(sampleY * mapHeight / height);

    if (srcX >= 0 && srcX < mapWidth && srcY >= 0 && srcY < mapHeight) {
      const idx = srcY * mapWidth + srcX;
      const darkness = map[idx];

      const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));
      let size = baseSize * relativeSize * layer.threshold; // scale size

      if (size >= MIN_ELEMENT_SIZE) {
        squares.push({ cx: round(cx), cy: round(cy), size: round(size) });
      }
    }
  };

  if (gridType === 'radial') {
    const maxR = gridExtent;
    for (let r = 0; r <= maxR; r += step) {
      const circumference = 2 * Math.PI * r;
      const dotsCount = r === 0 ? 1 : Math.round(circumference / step);
      const angleStep = (2 * Math.PI) / dotsCount;
      for (let i = 0; i < dotsCount; i++) {
        const theta = i * angleStep + rad;
        const cx = wHalf + r * Math.cos(theta);
        const cy = hHalf + r * Math.sin(theta);
        processSquare(cx, cy);
      }
    }
  } else {
    // Square & Hex
    let row = 0;
    for (let gy = minGrid; gy <= maxGrid; gy += (isHex ? step * 0.866 : step)) {
      const rowOffset = (isHex && row % 2 !== 0) ? step * 0.5 : 0;
      row++;
      for (let gx = minGrid; gx <= maxGrid; gx += step) {
        const cx = (gx + rowOffset) * cos - gy * sin + wHalf;
        const cy = (gx + rowOffset) * sin + gy * cos + hHalf;
        processSquare(cx, cy);
      }
    }
  }

  for (const s of squares) {
    const half = s.size / 2;
    // If squares follow grid rotation:
    if (layer.angle !== 0) {
      svg += `    <rect x="${round(-half)}" y="${round(-half)}" width="${s.size}" height="${s.size}" transform="translate(${s.cx},${s.cy}) rotate(${layer.angle})"/>\n`;
    } else {
      svg += `    <rect x="${round(s.cx - half)}" y="${round(s.cy - half)}" width="${s.size}" height="${s.size}"/>\n`;
    }
  }

  return svg;
}

/**
 * Generate halftone lines pattern - uses paths for efficiency
 */
function generateHalftoneLines(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;

  const preOptions = {
    channel: layer.channel,
    preBlur: (layer.preBlur || 0) * scaleFactor,
    brightness: layer.brightness,
    contrast: layer.contrast,
    invert: layer.invert,
    clampMin: layer.clampMin,
    clampMax: layer.clampMax
  };

  const mapWidth = sourceImageData.width;
  const mapHeight = sourceImageData.height;
  const map = preprocess(sourceImageData, mapWidth, mapHeight, preOptions);

  const spacing = Math.max(1, Math.floor(layer.lineSpacing * scaleFactor));
  const maxWidth = spacing * 0.7; // Max stroke width

  const rad = (layer.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dotScaleMin = layer.dotScaleMin !== undefined ? layer.dotScaleMin : 0.1;
  const dotScaleMax = layer.dotScaleMax !== undefined ? layer.dotScaleMax : 1;

  // Generate line segments
  const diagonal = Math.sqrt(width * width + height * height);
  const numLines = Math.ceil(diagonal / spacing) * 2;

  let svg = '';

  for (let i = -numLines; i <= numLines; i++) {
    const lineOffset = i * spacing - (layer.offsetX * scaleFactor);

    // Line endpoints (extend beyond canvas to cover rotation)
    const x1 = lineOffset * cos + diagonal * sin;
    const y1 = lineOffset * sin - diagonal * cos;
    const x2 = lineOffset * cos - diagonal * sin;
    const y2 = lineOffset * sin + diagonal * cos;

    // Sample along the line to determine stroke width
    // Currently we only sample the CENTER of the line. 
    // This produces constant-width lines which is efficient but less detailed than the raster version.
    const midX = (x1 + x2) / 2 + width / 2;
    const midY = (y1 + y2) / 2 + height / 2;

    const srcX = Math.round(midX * mapWidth / width);
    const srcY = Math.round(midY * mapHeight / height);

    if (srcX >= 0 && srcX < mapWidth && srcY >= 0 && srcY < mapHeight) {
      const idx = srcY * mapWidth + srcX;
      const darkness = map[idx];

      const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));
      const strokeWidth = relativeSize * maxWidth * layer.threshold;

      if (strokeWidth >= MIN_ELEMENT_SIZE) {
        svg += `    <line x1="${round(x1 + width / 2)}" y1="${round(y1 + height / 2)}" x2="${round(x2 + width / 2)}" y2="${round(y2 + height / 2)}" stroke="currentColor" stroke-width="${round(strokeWidth)}" fill="none"/>\n`;
      }
    }
  }

  return svg;
}

/**
 * Generate Bayer dither pattern using optimized path runs
 */
function generateBayerPattern(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;

  const pixelSize = Math.max(1, Math.floor(layer.scale * scaleFactor));
  const threshold = layer.threshold;

  // Get appropriate Bayer matrix size
  let matrixSize = 4;
  if (layer.ditherType === 'bayer2x2') matrixSize = 2;
  else if (layer.ditherType === 'bayer8x8') matrixSize = 8;

  // Generate bitmap of which cells are "on"
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);
  const bitmap = new Uint8Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize + pixelSize / 2;
      const y = row * pixelSize + pixelSize / 2;

      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(x * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(y * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;

      if (idx + 2 < data.length) {
        const gray = getGray(data, idx);
        const mx = col % matrixSize;
        const my = row % matrixSize;
        const bayerValue = getBayerValue(mx, my, matrixSize);
        const thresholdOffset = (threshold - 0.5) * 0.8;

        if (gray < bayerValue + thresholdOffset) {
          bitmap[row * cols + col] = 1;
        }
      }
    }
  }

  // Convert bitmap to optimized path using horizontal run-length encoding
  let pathData = '';

  for (let row = 0; row < rows; row++) {
    let runStart = -1;
    for (let col = 0; col <= cols; col++) {
      const isOn = col < cols && bitmap[row * cols + col];

      if (isOn && runStart === -1) {
        runStart = col;
      } else if (!isOn && runStart !== -1) {
        // End of run - add rectangle to path
        const x = runStart * pixelSize;
        const y = row * pixelSize;
        const w = (col - runStart) * pixelSize;
        const h = pixelSize;
        pathData += `M${round(x)},${round(y)}h${round(w)}v${round(h)}h${round(-w)}z`;
        runStart = -1;
      }
    }
  }

  if (pathData) {
    return `    <path d="${pathData}"/>\n`;
  }
  return '';
}

/**
 * Get Bayer matrix value
 */
function getBayerValue(x, y, size) {
  if (size === 2) {
    const m = [[0, 2], [3, 1]];
    return m[y % 2][x % 2] / 4;
  } else if (size === 4) {
    const m = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    return m[y % 4][x % 4] / 16;
  } else {
    const m = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
    return m[y % 8][x % 8] / 64;
  }
}

/**
 * Generate error diffusion pattern using contour paths
 */
function generateErrorDiffusionPaths(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;

  const pixelSize = Math.max(1, Math.floor(layer.scale * scaleFactor));
  const threshold = 80 + layer.threshold * 100;

  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);

  // Create grayscale buffer for error diffusion
  const gray = new Float32Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize + pixelSize / 2;
      const y = row * pixelSize + pixelSize / 2;

      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(x * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(y * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;

      if (idx + 2 < data.length) {
        gray[row * cols + col] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      }
    }
  }

  // Apply error diffusion (Floyd-Steinberg or Atkinson)
  const isAtkinson = layer.ditherType === 'atkinson';

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const oldPixel = gray[i];
      const newPixel = oldPixel > threshold ? 255 : 0;
      gray[i] = newPixel;
      const error = oldPixel - newPixel;

      if (isAtkinson) {
        const e = error / 8;
        if (col + 1 < cols) gray[i + 1] += e;
        if (col + 2 < cols) gray[i + 2] += e;
        if (row + 1 < rows) {
          if (col > 0) gray[i + cols - 1] += e;
          gray[i + cols] += e;
          if (col + 1 < cols) gray[i + cols + 1] += e;
        }
        if (row + 2 < rows) gray[i + cols * 2] += e;
      } else {
        // Floyd-Steinberg
        if (col + 1 < cols) gray[i + 1] += error * 7 / 16;
        if (row + 1 < rows) {
          if (col > 0) gray[i + cols - 1] += error * 3 / 16;
          gray[i + cols] += error * 5 / 16;
          if (col + 1 < cols) gray[i + cols + 1] += error * 1 / 16;
        }
      }
    }
  }

  // Convert to bitmap and generate path
  let pathData = '';

  for (let row = 0; row < rows; row++) {
    let runStart = -1;
    for (let col = 0; col <= cols; col++) {
      const isOn = col < cols && gray[row * cols + col] < 128;

      if (isOn && runStart === -1) {
        runStart = col;
      } else if (!isOn && runStart !== -1) {
        const x = runStart * pixelSize;
        const y = row * pixelSize;
        const w = (col - runStart) * pixelSize;
        const h = pixelSize;
        pathData += `M${round(x)},${round(y)}h${round(w)}v${round(h)}h${round(-w)}z`;
        runStart = -1;
      }
    }
  }

  if (pathData) {
    return `    <path d="${pathData}"/>\n`;
  }
  return '';
}

/**
 * Generate noise/stipple pattern
 */
function generateNoiseStipple(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;

  const pixelSize = Math.max(1, Math.floor(layer.scale * scaleFactor));
  const decisionThreshold = 0.3 + (1 - layer.threshold) * 0.4;

  let svg = '';
  const dotRadius = pixelSize * 0.4;

  // Seeded random for consistency
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize + pixelSize / 2;
      const y = row * pixelSize + pixelSize / 2;

      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(x * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(y * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;

      if (idx + 2 < data.length) {
        const gray = getGray(data, idx);
        const noise = seededRandom(row * cols + col + 0.5);
        const adjustedThreshold = decisionThreshold + (noise - 0.5) * 0.25;

        if (gray < adjustedThreshold && dotRadius >= MIN_ELEMENT_SIZE) {
          svg += `    <circle cx="${round(x)}" cy="${round(y)}" r="${round(dotRadius)}"/>\n`;
        }
      }
    }
  }

  return svg;
}

/**
 * Generate complete SVG with all layers combined
 * @param {Object} palette - The active color palette to use
 */
export function generateCombinedSVG(layers, sourceImageData, dimensions, backgroundColor, options = {}, palette = DEFAULT_PALETTE) {
  const { width, height } = dimensions;
  const { scaleFactor = 1 } = options;

  const svgWidth = round(width);
  const svgHeight = round(height);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;

  // Defs for masks
  let defs = '';
  let maskCounter = 0;

  svg += `  <rect id="background" width="100%" height="100%" fill="${backgroundColor}"/>\n`;

  // Accumulate layer content with knockout support
  let content = '';

  layers.forEach((layer, index) => {
    if (layer.visible === false) return;

    if (layer.knockout) {
      // Generate knockout geometry without wrapper
      const knockoutGeometry = generateLayerSVG(layer, sourceImageData, dimensions, { scaleFactor, includeWrapper: false }, palette);

      if (knockoutGeometry.trim()) {
        // Create inverse mask
        const maskId = `knockout-mask-${maskCounter++}`;
        const color = palette[layer.colorKey];

        defs += `  <mask id="${maskId}">\n`;
        defs += `    <rect width="100%" height="100%" fill="white"/>\n`;
        defs += `    <g fill="black">\n`;
        defs += knockoutGeometry;
        defs += `    </g>\n`;
        defs += `  </mask>\n`;

        // Wrap accumulated content with mask
        if (content.trim()) {
          content = `  <g mask="url(#${maskId})">\n${content}  </g>\n`;
        }

        // Add knockout layer on top with normal rendering
        content += generateLayerSVG(layer, sourceImageData, dimensions, { scaleFactor, includeWrapper: true }, palette);
      }
    } else {
      // Normal layer - just append
      content += generateLayerSVG(layer, sourceImageData, dimensions, { scaleFactor, includeWrapper: true }, palette);
    }
  });

  // Add defs if any masks were created
  if (defs) {
    svg += `  <defs>\n${defs}  </defs>\n`;
  }

  // Add all layer content
  svg += content;
  svg += `</svg>`;

  return svg;
}

/**
 * Generate individual layer SVG (for separate export)
 * @param {Object} palette - The active color palette to use
 */
export function generateSingleLayerSVG(layer, sourceImageData, dimensions, backgroundColor, options = {}, palette = DEFAULT_PALETTE) {
  const { width, height } = dimensions;
  const { scaleFactor = 1 } = options;
  const color = palette[layer.colorKey];

  const svgWidth = round(width);
  const svgHeight = round(height);

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
  svg += `  <rect id="background" width="100%" height="100%" fill="${backgroundColor}"/>\n`;
  svg += generateLayerSVG(layer, sourceImageData, dimensions, { scaleFactor, includeWrapper: true }, palette);
  svg += `</svg>`;

  return svg;
}

/**
 * Download SVG as file
 */
export function downloadSVG(svgContent, filename) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Estimate SVG file size (rough approximation)
 */
export function estimateSVGSize(layers, dimensions, scaleFactor = 1) {
  const { width, height } = dimensions;
  let totalElements = 0;

  layers.forEach(layer => {
    if (layer.visible === false) return;

    const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
    const step = Math.max(1, Math.floor(layer.scale * scaleFactor));

    if (algoInfo?.category === 'halftone') {
      // Grid-based: estimate number of dots
      totalElements += Math.ceil(width / step) * Math.ceil(height / step);
    } else {
      // Pixel-based: more elements
      const pixelSize = Math.max(1, Math.floor(layer.scale * scaleFactor));
      totalElements += Math.ceil(width / pixelSize) * Math.ceil(height / pixelSize) * 0.5; // ~50% coverage
    }
  });

  // Rough bytes per element (circle ~40 bytes, rect ~35 bytes, path segment ~10 bytes)
  const bytesPerElement = 30;
  const overhead = 500; // SVG header, groups, etc.

  return overhead + totalElements * bytesPerElement;
}

/**
 * Export all layers as separate SVG files in a ZIP archive
 * @param {Object} palette - The active color palette to use
 */
export async function exportLayersAsZip(layers, sourceImageData, dimensions, backgroundColor, options = {}, palette = DEFAULT_PALETTE) {
  // Dynamically import JSZip to avoid SSR issues
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const { scaleFactor = 1 } = options;
  const visibleLayers = layers.filter(layer => layer.visible !== false);

  // Add background SVG
  const bgSvg = generateBackgroundSVG(dimensions, backgroundColor);
  zip.file('00-background.svg', bgSvg);

  // Add each layer as separate SVG
  visibleLayers.forEach((layer, index) => {
    const color = palette[layer.colorKey];
    const layerName = color ? color.name.toLowerCase().replace(/\s+/g, '-') : `layer-${index + 1}`;
    const filename = `${String(index + 1).padStart(2, '0')}-${layerName}.svg`;

    const svg = generateSingleLayerSVG(layer, sourceImageData, dimensions, 'transparent', { scaleFactor }, palette);
    zip.file(filename, svg);
  });

  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'halftone-layers.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate background-only SVG
 */
function generateBackgroundSVG(dimensions, backgroundColor) {
  const { width, height } = dimensions;
  const svgWidth = round(width);
  const svgHeight = round(height);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect id="background" width="100%" height="100%" fill="${backgroundColor}"/>
</svg>`;
}
