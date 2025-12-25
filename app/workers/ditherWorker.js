/**
 * Web Worker for off-main-thread dithering calculations
 * Prevents UI jank during parameter adjustments
 */

// Grayscale calculation constants
const GRAY_R = 0.299;
const GRAY_G = 0.587;
const GRAY_B = 0.114;
const GRAY_INV = 1 / 255;



function getGray(data, i) {
  return (data[i] * GRAY_R + data[i + 1] * GRAY_G + data[i + 2] * GRAY_B) * GRAY_INV;
}

// Helper to extract specific channel value
const getChannel = (data, i, channel) => {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  switch (channel) {
    case 'red': return r;
    case 'green': return g;
    case 'blue': return b;
    case 'cyan': return 255 - r; // Approximate
    case 'magenta': return 255 - g;
    case 'yellow': return 255 - b;
    case 'black': return Math.max(0, 255 - Math.max(r, g, b)); // K from CMYK
    case 'gray': default:
      return r * GRAY_R + g * GRAY_G + b * GRAY_B;
  }
};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

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

  // Vertical (read from temp, write to data)
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

function sharpenFilter(data, w, h, amount, radius) {
  if (amount <= 0 || radius < 1) return;
  const len = w * h;
  const temp = new Float32Array(len);

  // Create a blurred copy
  for (let i = 0; i < len; i++) {
    temp[i] = data[i];
  }
  boxBlur(temp, w, h, Math.floor(radius));

  // Unsharp mask: original + (original - blurred) * strength
  const strength = amount * 1.5; // Scale the amount
  for (let i = 0; i < len; i++) {
    const diff = data[i] - temp[i];
    data[i] = Math.max(0, Math.min(1, data[i] + diff * strength));
  }
}

function addNoise(data, w, h, amount) {
  if (amount <= 0) return;
  const len = w * h;
  for (let i = 0; i < len; i++) {
    const noise = (seededRandom(i + 0.5) - 0.5) * 2; // -1 to 1
    data[i] = Math.max(0, Math.min(1, data[i] + noise * amount * 0.2));
  }
}

function denoiseFilter(data, w, h, amount) {
  if (amount <= 0) return;
  const len = w * h;
  const temp = new Float32Array(len);

  // Copy data to temp
  for (let i = 0; i < len; i++) {
    temp[i] = data[i];
  }

  // Bilateral-style filter: smooth based on similarity, not distance
  const threshold = 0.1 * (1 - amount); // Lower threshold = more aggressive smoothing

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const center = temp[idx];

      let sum = center;
      let count = 1;

      // Check 8 neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = ny * w + nx;
            const neighbor = temp[nidx];

            // Only average with similar values (edge-preserving)
            if (Math.abs(neighbor - center) < threshold) {
              sum += neighbor;
              count++;
            }
          }
        }
      }

      // Blend between original and smoothed based on amount
      data[idx] = center + (sum / count - center) * amount;
    }
  }
}

function adjustTones(data, shadows, midtones, highlights) {
  if (shadows === 0 && midtones === 0 && highlights === 0) return;
  const len = data.length;

  for (let i = 0; i < len; i++) {
    let darkness = data[i]; // 0 = white, 1 = black

    // Calculate weight for each tone region
    // Shadows affect dark areas (high darkness values)
    const shadowWeight = Math.pow(darkness, 2);
    // Highlights affect bright areas (low darkness values)
    const highlightWeight = Math.pow(1 - darkness, 2);
    // Midtones affect middle values
    const midtoneWeight = 1 - shadowWeight - highlightWeight;

    // Apply adjustments (positive = brighten/reduce darkness, negative = darken/increase darkness)
    darkness -= shadows * shadowWeight * 0.5;
    darkness -= midtones * midtoneWeight * 0.5;
    darkness -= highlights * highlightWeight * 0.5;

    data[i] = Math.max(0, Math.min(1, darkness));
  }
}

function preprocess(imageData, w, h, options) {
  const {
    channel = 'gray',
    preBlur = 0,
    brightness = 0,
    contrast = 0,
    invert = false,
    clampMin = 0,
    clampMax = 1,
    // New properties for ordered/diffusion
    sharpen = 0,
    sharpenRadius = 1,
    denoise = 0,
    noise = 0,
    shadows = 0,
    midtones = 0,
    highlights = 0
  } = options;

  const len = w * h;
  const input = imageData.data;
  const output = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    let val = getChannel(input, i * 4, channel);
    let norm = val / 255;

    let darkness = 1 - norm;
    const isInk = ['cyan', 'magenta', 'yellow', 'black'].includes(channel);
    if (isInk) {
      darkness = norm;
    }

    if (invert) {
      darkness = 1 - darkness;
    }

    if (darkness < clampMin) darkness = 0;
    else if (darkness > clampMax) darkness = 1;
    else darkness = (darkness - clampMin) / (clampMax - clampMin);

    output[i] = darkness;
  }

  // Apply filters in order: blur -> sharpen -> denoise -> tone adjustments -> brightness/contrast -> noise
  if (preBlur > 0) {
    boxBlur(output, w, h, preBlur);
  }

  if (sharpen > 0) {
    sharpenFilter(output, w, h, sharpen, sharpenRadius);
  }

  if (denoise > 0) {
    denoiseFilter(output, w, h, denoise);
  }

  if (shadows !== 0 || midtones !== 0 || highlights !== 0) {
    adjustTones(output, shadows, midtones, highlights);
  }

  // Apply global brightness and contrast on normalized darkness values (0-1 range)
  if (brightness !== 0 || contrast !== 0) {
    for (let i = 0; i < len; i++) {
      let darkness = output[i];

      // Apply contrast: scale around midpoint (0.5)
      if (contrast !== 0) {
        const factor = (contrast + 100) / 100; // -100 to 100 -> 0 to 2
        darkness = (darkness - 0.5) * factor + 0.5;
      }

      // Apply brightness: shift the darkness value
      if (brightness !== 0) {
        darkness -= brightness / 100; // -100 to 100 -> -1 to 1 shift
      }

      output[i] = Math.max(0, Math.min(1, darkness));
    }
  }

  if (noise > 0) {
    addNoise(output, w, h, noise);
  }

  return output;
}

// Bayer matrices
const BAYER_2x2 = [[0, 2], [3, 1]].map(r => r.map(v => v / 4));
const BAYER_4x4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => v / 16));
const BAYER_8x8 = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25], [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]].map(r => r.map(v => v / 64));

// Blue noise 64x64 texture (precomputed, normalized to 0-1)
const BLUE_NOISE_64 = (function () {
  const size = 64;
  const texture = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let value = 0;
      const magic = 52.9829189;
      const igx = x + 0.5;
      const igy = y + 0.5;
      value = (igx * 0.06711056 + igy * 0.00583715) * magic;
      value = value - Math.floor(value);
      const s1 = Math.sin(x * 0.1234 + y * 0.5678) * 0.5 + 0.5;
      const s2 = Math.sin(x * 0.8765 - y * 0.4321) * 0.5 + 0.5;
      const s3 = Math.sin((x + y) * 0.2468) * 0.5 + 0.5;
      value = value * 0.6 + s1 * 0.15 + s2 * 0.15 + s3 * 0.1;
      row.push(value);
    }
    texture.push(row);
  }
  return texture;
})();

// Generate Hilbert curve path for given dimensions
function generateHilbertPath(width, height) {
  const path = [];
  const maxDim = Math.max(width, height);

  let size = 1;
  while (size < maxDim) {
    size *= 2;
  }

  function hilbert(x, y, ax, ay, bx, by) {
    const w = Math.abs(ax + ay);
    const h = Math.abs(bx + by);

    const dax = ax > 0 ? 1 : ax < 0 ? -1 : 0;
    const day = ay > 0 ? 1 : ay < 0 ? -1 : 0;
    const dbx = bx > 0 ? 1 : bx < 0 ? -1 : 0;
    const dby = by > 0 ? 1 : by < 0 ? -1 : 0;

    if (h === 1) {
      for (let i = 0; i < w; i++) {
        path.push({ x, y });
        x += dax;
        y += day;
      }
      return;
    }

    if (w === 1) {
      for (let i = 0; i < h; i++) {
        path.push({ x, y });
        x += dbx;
        y += dby;
      }
      return;
    }

    let ax2 = Math.floor(ax / 2);
    let ay2 = Math.floor(ay / 2);
    let bx2 = Math.floor(bx / 2);
    let by2 = Math.floor(by / 2);

    if (2 * w > 3 * h) {
      if ((ax2 & 1) && (w > 2)) {
        ax2 += dax;
        ay2 += day;
      }
      hilbert(x, y, ax2, ay2, bx, by);
      hilbert(x + ax2, y + ay2, ax - ax2, ay - ay2, bx, by);
    } else {
      if ((bx2 & 1) && (h > 2)) {
        bx2 += dbx;
        by2 += dby;
      }
      hilbert(x, y, bx2, by2, ax2, ay2);
      hilbert(x + bx2, y + by2, ax, ay, bx - bx2, by - by2);
      hilbert(x + (ax - dax) + (bx2 - dbx), y + (ay - day) + (by2 - dby), -bx2, -by2, -(ax - ax2), -(ay - ay2));
    }
  }

  if (size > 1) {
    hilbert(0, 0, size, 0, 0, size);
  } else {
    path.push({ x: 0, y: 0 });
  }

  return path.filter(p => p.x < width && p.y < height);
}

// Dithering Algorithms
const ditherAlgorithms = {
  none: (imageData) => imageData,

  bayer2x2: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_2x2;
    const size = 2;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % size;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];
        const gray = 1 - darkness; // Keep as 0-1 normalized brightness
        const mx = Math.floor(x * invPixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  bayer4x4: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_4x4;
    const size = 4;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % size;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];
        const gray = 1 - darkness; // Keep as 0-1 normalized brightness
        const mx = Math.floor(x * invPixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  bayer8x8: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_8x8;
    const size = 8;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % size;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];
        const gray = 1 - darkness; // Keep as 0-1 normalized brightness
        const mx = Math.floor(x * invPixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  floydSteinberg: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const error7_16 = 7 / 16;
    const error3_16 = 3 / 16;
    const error5_16 = 5 / 16;
    const error1_16 = 1 / 16;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = oldPixel - newPixel;
        if (x + 1 < sw) gray[i + 1] += error * error7_16;
        if (y + 1 < sh) {
          const nextRow = i + sw;
          if (x > 0) gray[nextRow - 1] += error * error3_16;
          gray[nextRow] += error * error5_16;
          if (x + 1 < sw) gray[nextRow + 1] += error * error1_16;
        }
      }
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  atkinson: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const errorDiv = 1 / 8;
    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * errorDiv;
        if (x + 1 < sw) gray[i + 1] += error;
        if (x + 2 < sw) gray[i + 2] += error;
        if (y + 1 < sh) {
          const nextRow = i + sw;
          if (x > 0) gray[nextRow - 1] += error;
          gray[nextRow] += error;
          if (x + 1 < sw) gray[nextRow + 1] += error;
        }
        if (y + 2 < sh) gray[i + sw * 2] += error;
      }
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  halftoneCircle: (imageData, threshold, dotSize = 6, angle = 15, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const {
      gridType = 'square',
      dotScaleMin = 0.1,
      dotScaleMax = 1
    } = options;

    // Pre-process image to get 0-1 Darkness Map
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    data.fill(255); // Fill with white (paper)

    const step = Math.max(2, Math.floor(dotSize));
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const edgeSmooth = (1 - hardness) * 1.5;
    const wHalf = w * 0.5;
    const hHalf = h * 0.5;

    // Grid Bounds
    const diagonal = Math.sqrt(w * w + h * h);
    const gridExtent = diagonal * 0.7;
    const minGrid = Math.floor(-gridExtent / step) * step;
    const maxGrid = Math.ceil(gridExtent / step) * step;

    const baseRadius = step * 0.5;
    const radiusThreshold = 0.5; // Min subpixel size?

    // RADIAL GRID HANDLING
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
          drawDot(cx, cy);
        }
      }
    } else {
      // SQUARE & HEXAGONAL
      const isHex = gridType === 'hex';
      let row = 0;
      for (let gy = minGrid; gy <= maxGrid; gy += (isHex ? step * 0.866 : step)) {
        const rowOffset = (isHex && row % 2 !== 0) ? step * 0.5 : 0;
        row++;
        for (let gx = minGrid; gx <= maxGrid; gx += step) {
          const cx = (gx + rowOffset) * cos - gy * sin + wHalf;
          const cy = (gx + rowOffset) * sin + gy * cos + hHalf;
          drawDot(cx, cy);
        }
      }
    }

    function drawDot(cx, cy) {
      if (cx < -step || cx >= w + step || cy < -step || cy >= h + step) return;

      const sampleX = Math.max(0, Math.min(w - 1, Math.round(cx)));
      const sampleY = Math.max(0, Math.min(h - 1, Math.round(cy)));
      const si = sampleY * w + sampleX;

      const darkness = map[si]; // 0-1 range from preprocess

      // Dot Size Calculation
      // dotScaleMin/Max map the 0-1 darkness to relative radius
      const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));
      let finalRadius = baseRadius * relativeSize;
      finalRadius *= threshold; // Density Scaling

      if (finalRadius < 0.5) return;

      const radiusWithSmooth = finalRadius + edgeSmooth;
      const radiusSq = radiusWithSmooth * radiusWithSmooth;

      const minX = Math.max(0, Math.floor(cx - radiusWithSmooth));
      const maxX = Math.min(w - 1, Math.ceil(cx + radiusWithSmooth));
      const minY = Math.max(0, Math.floor(cy - radiusWithSmooth));
      const maxY = Math.min(h - 1, Math.ceil(cy + radiusWithSmooth));

      for (let py = minY; py <= maxY; py++) {
        const dy = py - cy;
        const dySq = dy * dy;
        const pyw = py * w;
        for (let px = minX; px <= maxX; px++) {
          const dx = px - cx;
          const distSq = dx * dx + dySq;
          if (distSq <= radiusSq) {
            const dist = Math.sqrt(distSq);
            const coverage = Math.max(0, Math.min(1, finalRadius - dist + edgeSmooth));
            const inkVal = Math.round(255 * (1 - coverage));

            const idx = (pyw + px) * 4;
            if (inkVal < data[idx]) {
              data[idx] = data[idx + 1] = data[idx + 2] = inkVal;
            }
          }
        }
      }
    }

    return { data, width: w, height: h };
  },

  halftoneLines: (imageData, threshold, lineSpacing = 4, angle = 45, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const {
      dotScaleMin = 0.1,
      dotScaleMax = 1
    } = options;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    data.fill(255);

    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const spacing = Math.max(1, lineSpacing);
    const maxWidth = spacing * 0.7;

    // Legacy logic used 0.5 + threshold*0.7. 
    // Adapting to use threshold as global scaler and dotScaleMin/Max for dynamic range

    const spacingHalf = spacing * 0.5;
    const padding = 0.7;
    const edgeSmooth = (1 - hardness) * 1.5;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const ySin = y * sin;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;

        // Use preprocess map
        const darkness = map[y * w + x];

        const rx = x * cos + ySin;
        const linePos = ((rx % spacing) + spacing) % spacing;
        const centerDist = Math.abs(linePos - spacingHalf);

        // Map darkness to line width
        const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));
        const lineWidth = relativeSize * maxWidth * threshold; // Threshold scales global
        const halfWidth = lineWidth * 0.5;
        const thresholdDist = halfWidth + edgeSmooth;

        if (centerDist <= thresholdDist) {
          const coverage = Math.max(0, Math.min(1, halfWidth - centerDist + edgeSmooth));
          const val = Math.round(255 * (1 - coverage));

          if (val < data[i]) {
            data[i] = data[i + 1] = data[i + 2] = val;
          }
        }
      }
    }
    return { data, width: w, height: h };
  },

  halftoneSquare: (imageData, threshold, size = 6, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const {
      gridType = 'square',
      dotScaleMin = 0.1,
      dotScaleMax = 1
    } = options;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    data.fill(255);

    const step = Math.max(1, Math.floor(size));
    const maxSize = step * 0.85;
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const edgeSmooth = (1 - hardness) * 1.5;
    const wHalf = w * 0.5;
    const hHalf = h * 0.5;
    const baseRadius = maxSize * 0.5;

    // Use same grid logic as Circle (Square, Hex, Radial supported for Squares too!)
    const diagonal = Math.sqrt(w * w + h * h);
    const gridExtent = diagonal * 0.7;
    const minGrid = Math.floor(-gridExtent / step) * step;
    const maxGrid = Math.ceil(gridExtent / step) * step;

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
          drawSquare(cx, cy);
        }
      }
    } else {
      const isHex = gridType === 'hex';
      let row = 0;
      for (let gy = minGrid; gy <= maxGrid; gy += (isHex ? step * 0.866 : step)) {
        const rowOffset = (isHex && row % 2 !== 0) ? step * 0.5 : 0;
        row++;
        for (let gx = minGrid; gx <= maxGrid; gx += step) {
          const cx = (gx + rowOffset) * cos - gy * sin + wHalf;
          const cy = (gx + rowOffset) * sin + gy * cos + hHalf;
          drawSquare(cx, cy);
        }
      }
    }

    function drawSquare(cx, cy) {
      if (cx < -step || cx >= w + step || cy < -step || cy >= h + step) return;

      const sampleX = Math.max(0, Math.min(w - 1, Math.round(cx)));
      const sampleY = Math.max(0, Math.min(h - 1, Math.round(cy)));
      const si = sampleY * w + sampleX;
      const darkness = map[si];

      const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));
      let finalHalfSize = baseRadius * relativeSize * threshold;

      if (finalHalfSize < 0.25) return;

      const radiusWithSmooth = finalHalfSize + edgeSmooth;

      const bbRadius = radiusWithSmooth * 1.5;
      const minX = Math.max(0, Math.floor(cx - bbRadius));
      const maxX = Math.min(w - 1, Math.ceil(cx + bbRadius));
      const minY = Math.max(0, Math.floor(cy - bbRadius));
      const maxY = Math.min(h - 1, Math.ceil(cy + bbRadius));

      // Note: For squares, we check if the point (px-cx, py-cy) is inside the ROTATED square.
      // Inverse rotate (dx, dy) by -angle gives local coordinates (lu, lv).
      // Since grid was rotated by 'angle' to get cx/cy, the local axes of the square are aligned with the grid generation axes.

      for (let py = minY; py <= maxY; py++) {
        const dy = py - cy;
        const pyw = py * w;
        for (let px = minX; px <= maxX; px++) {
          const dx = px - cx;

          const lu = dx * cos + dy * sin;
          const lv = -dx * sin + dy * cos;

          const distU = Math.abs(lu);
          const distV = Math.abs(lv);
          const dist = Math.max(distU, distV);

          if (dist <= radiusWithSmooth) {
            const coverage = Math.max(0, Math.min(1, finalHalfSize - dist + edgeSmooth));
            const val = Math.round(255 * (1 - coverage));
            const idx = (pyw + px) * 4;
            if (val < data[idx]) {
              data[idx] = data[idx + 1] = data[idx + 2] = val;
            }
          }
        }
      }
    }

    return { data, width: w, height: h };
  },


  noise: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const decisionThreshold = 0.3 + (1 - threshold) * 0.4;
    const noiseAmount = 0.25;
    const invPixelScale = 1 / pixelScale;
    const sw = Math.ceil(w * invPixelScale);

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];
        const brightness = 1 - darkness;
        const sx = Math.floor(x * invPixelScale);
        const noise = seededRandom(sy * sw + sx + 0.5);
        const adjustedThreshold = decisionThreshold + (noise - 0.5) * noiseAmount;
        const result = brightness > adjustedThreshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  // Blue noise dithering using precomputed 64x64 blue noise texture
  blueNoise: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % 64;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];
        const brightness = 1 - darkness;
        const mx = Math.floor(x * invPixelScale) % 64;
        const blueNoiseValue = BLUE_NOISE_64[my][mx];
        const result = brightness > (blueNoiseValue + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  // Stucki error diffusion (sharper than Floyd-Steinberg, 42-divisor kernel)
  stucki: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const div = 1 / 42;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        if (x + 1 < sw) gray[i + 1] += error * 8;
        if (x + 2 < sw) gray[i + 2] += error * 4;
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 1) gray[row1 - 2] += error * 2;
          if (x > 0) gray[row1 - 1] += error * 4;
          gray[row1] += error * 8;
          if (x + 1 < sw) gray[row1 + 1] += error * 4;
          if (x + 2 < sw) gray[row1 + 2] += error * 2;
        }
        if (y + 2 < sh) {
          const row2 = i + sw * 2;
          if (x > 1) gray[row2 - 2] += error * 1;
          if (x > 0) gray[row2 - 1] += error * 2;
          gray[row2] += error * 4;
          if (x + 1 < sw) gray[row2 + 1] += error * 2;
          if (x + 2 < sw) gray[row2 + 2] += error * 1;
        }
      }
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  // Sierra error diffusion (32-divisor kernel)
  sierra: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const div = 1 / 32;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        if (x + 1 < sw) gray[i + 1] += error * 5;
        if (x + 2 < sw) gray[i + 2] += error * 3;
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 1) gray[row1 - 2] += error * 2;
          if (x > 0) gray[row1 - 1] += error * 4;
          gray[row1] += error * 5;
          if (x + 1 < sw) gray[row1 + 1] += error * 4;
          if (x + 2 < sw) gray[row1 + 2] += error * 2;
        }
        if (y + 2 < sh) {
          const row2 = i + sw * 2;
          if (x > 0) gray[row2 - 1] += error * 2;
          gray[row2] += error * 3;
          if (x + 1 < sw) gray[row2 + 1] += error * 2;
        }
      }
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  // Sierra Two-Row error diffusion (16-divisor kernel)
  sierraTwoRow: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const div = 1 / 16;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        if (x + 1 < sw) gray[i + 1] += error * 4;
        if (x + 2 < sw) gray[i + 2] += error * 3;
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 1) gray[row1 - 2] += error * 1;
          if (x > 0) gray[row1 - 1] += error * 2;
          gray[row1] += error * 3;
          if (x + 1 < sw) gray[row1 + 1] += error * 2;
          if (x + 2 < sw) gray[row1 + 2] += error * 1;
        }
      }
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  // Sierra Lite error diffusion (4-divisor kernel)
  sierraLite: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const div = 1 / 4;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        if (x + 1 < sw) gray[i + 1] += error * 2;
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 0) gray[row1 - 1] += error * 1;
          gray[row1] += error * 1;
        }
      }
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = gray[sy * sw + sx] > 127 ? 255 : 0;
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  // Riemersma dithering using Hilbert curve
  riemersma: (imageData, threshold, scale = 1, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    // Preprocess image with new filters
    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);
    const output = new Uint8Array(sw * sh);

    // Sample from preprocessed map
    for (let sy = 0; sy < sh; sy++) {
      const syStart = sy * pixelScale;
      const syEnd = Math.min(syStart + pixelScale, h);
      const syw = sy * sw;
      for (let sx = 0; sx < sw; sx++) {
        const sxStart = sx * pixelScale;
        const sxEnd = Math.min(sxStart + pixelScale, w);
        let sum = 0, count = 0;
        for (let dy = syStart; dy < syEnd; dy++) {
          const dyw = dy * w;
          for (let dx = sxStart; dx < sxEnd; dx++) {
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    const hilbertPath = generateHilbertPath(sw, sh);

    const queueSize = 16;
    const errorQueue = new Float32Array(queueSize);
    const weights = new Float32Array(queueSize);
    let weightSum = 0;

    for (let i = 0; i < queueSize; i++) {
      weights[i] = Math.pow(2, -i / 4);
      weightSum += weights[i];
    }

    for (let p = 0; p < hilbertPath.length; p++) {
      const { x, y } = hilbertPath[p];
      if (x >= sw || y >= sh) continue;

      const i = y * sw + x;

      let accError = 0;
      for (let q = 0; q < queueSize; q++) {
        accError += errorQueue[q] * weights[q];
      }
      accError /= weightSum;

      const oldPixel = gray[i] + accError;
      const newPixel = oldPixel > thresh ? 255 : 0;
      output[i] = newPixel;
      const error = oldPixel - newPixel;

      for (let q = queueSize - 1; q > 0; q--) {
        errorQueue[q] = errorQueue[q - 1];
      }
      errorQueue[0] = error;
    }

    for (let y = 0; y < h; y++) {
      const sy = Math.floor(y * invPixelScale);
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * invPixelScale);
        const val = output[sy * sw + sx];
        const idx = (yw + x) * 4;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  // Modulation dithering - creates wave-like patterns
  modulation: (imageData, threshold, scale = 8, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const frequency = Math.max(1, scale) * 0.15;
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const thresholdOffset = (threshold - 0.5) * 0.6;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];

        // Rotate coordinates
        const rx = x * cos + y * sin;
        const ry = -x * sin + y * cos;

        // Create modulation pattern using sine waves in both directions
        const wave1 = Math.sin(rx * frequency) * 0.5 + 0.5;
        const wave2 = Math.sin(ry * frequency) * 0.5 + 0.5;
        const modulation = (wave1 + wave2) * 0.5;

        // Modulate threshold based on image darkness and wave pattern
        const modulatedThreshold = modulation * (1 - darkness * 0.8);
        const brightness = 1 - darkness;

        const result = brightness > (modulatedThreshold + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  // Circuit dithering - creates electronic circuit board-like patterns
  circuit: (imageData, threshold, scale = 8, angle = 0, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    const gridSize = Math.max(2, Math.floor(scale));
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const thresholdOffset = (threshold - 0.5) * 0.6;
    const lineWidth = Math.max(1, gridSize * 0.15);

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const darkness = map[yw + x];

        // Rotate coordinates
        const rx = x * cos + y * sin;
        const ry = -x * sin + y * cos;

        // Create grid pattern
        const cellX = Math.floor(rx / gridSize);
        const cellY = Math.floor(ry / gridSize);
        const localX = ((rx % gridSize) + gridSize) % gridSize;
        const localY = ((ry % gridSize) + gridSize) % gridSize;

        // Use seeded random for deterministic pattern
        const cellSeed = cellX * 73856093 ^ cellY * 19349663;
        const cellRandom = Math.abs(Math.sin(cellSeed * 0.0001));

        // Determine if this cell should have horizontal or vertical lines
        const isHorizontal = cellRandom > 0.5;

        // Create circuit traces based on darkness
        let isLine = false;
        const brightnessThreshold = 1 - darkness + thresholdOffset;

        if (darkness > 0.1) {
          if (isHorizontal) {
            // Horizontal traces
            const distToCenter = Math.abs(localY - gridSize * 0.5);
            isLine = distToCenter < lineWidth * (darkness + 0.3);
          } else {
            // Vertical traces
            const distToCenter = Math.abs(localX - gridSize * 0.5);
            isLine = distToCenter < lineWidth * (darkness + 0.3);
          }
        }

        // Add connection points (pads) at grid intersections for darker areas
        const distToCorner = Math.sqrt(
          Math.pow(localX - gridSize * 0.5, 2) +
          Math.pow(localY - gridSize * 0.5, 2)
        );
        const isPad = distToCorner < gridSize * 0.2 * darkness;

        // Combine line and pad with threshold
        const circuitValue = (isLine || isPad) ? darkness : 0;
        const result = circuitValue > (0.3 + thresholdOffset * 0.5) ? 0 : 255;

        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  }
};

// Message handler
self.onmessage = function (e) {
  const { type, id, algorithm, imageData, params } = e.data;

  if (type === 'dither') {
    const algo = ditherAlgorithms[algorithm];
    if (!algo) {
      self.postMessage({ type: 'error', id, error: `Unknown algorithm: ${algorithm}` });
      return;
    }

    try {
      const { threshold, scale, angle, hardness } = params;
      let result;

      // Call algorithm with appropriate parameters
      if (algorithm.startsWith('halftone')) {
        // Pass params object as the 6th argument for advanced controls (gridType, channel, etc)
        result = algo(imageData, threshold, scale, angle, hardness, params);
      } else if (algorithm === 'noise' || algorithm === 'blueNoise' || algorithm.startsWith('bayer') || algorithm === 'floydSteinberg' || algorithm === 'atkinson' || algorithm === 'stucki' || algorithm === 'sierra' || algorithm === 'sierraTwoRow' || algorithm === 'sierraLite' || algorithm === 'riemersma' || algorithm === 'modulation' || algorithm === 'circuit') {
        // Pass all parameters including options for all algorithms with preprocessing support
        result = algo(imageData, threshold, scale, angle, hardness, params);
      } else {
        result = algo(imageData, threshold);
      }

      // Transfer the buffer back for efficiency
      self.postMessage(
        { type: 'result', id, result },
        [result.data.buffer]
      );
    } catch (error) {
      self.postMessage({ type: 'error', id, error: error.message });
    }
  }
};

