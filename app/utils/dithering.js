import { getGray, BAYER_2x2, BAYER_4x4, BAYER_8x8, BLUE_NOISE_64, GRAY_R, GRAY_G, GRAY_B, seededRandom, generateHilbertPath } from './helpers';

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

  // Contrast factor
  const cFactor = contrast !== 0 ? (259 * (contrast + 255)) / (255 * (259 - contrast)) : 1;

  for (let i = 0; i < len; i++) {
    let val = getChannel(input, i * 4, channel);

    if (contrast !== 0) {
      val = cFactor * (val - 128) + 128;
    }
    if (brightness !== 0) {
      val += brightness * 2.55;
    }

    val = Math.max(0, Math.min(255, val));
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

  // Apply filters in order: blur -> sharpen -> denoise -> tone adjustments -> noise
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

  if (noise > 0) {
    addNoise(output, w, h, noise);
  }

  return output;
}


// Dithering Algorithms
export const ditherAlgorithms = {
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
    return new ImageData(data, w, h);
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
    return new ImageData(data, w, h);
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
    return new ImageData(data, w, h);
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

    // Sample from preprocessed map instead of raw image data
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
            // Use preprocessed darkness value (0-1) and convert to 0-255
            sum += (1 - map[dyw + dx]) * 255;
            count++;
          }
        }
        gray[syw + sx] = count > 0 ? sum / count : 0;
      }
    }

    // Error diffusion
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

    // Map back to full resolution
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
    return new ImageData(data, w, h);
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

    // Error diffusion (Atkinson)
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

    // Map back to full resolution
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
    return new ImageData(data, w, h);
  },


  halftoneCircle: (imageData, threshold, dotSize = 6, angle = 15, hardness = 1, options = {}) => {
    const w = imageData.width, h = imageData.height;

    const {
      gridType = 'square',
      dotScaleMin = 0.1,
      dotScaleMax = 1
    } = options;

    const map = preprocess(imageData, w, h, options);

    const data = new Uint8ClampedArray(imageData.data);
    data.fill(255);

    const step = Math.max(2, Math.floor(dotSize));
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const edgeSmooth = (1 - hardness) * 1.5;
    const wHalf = w * 0.5;
    const hHalf = h * 0.5;

    const diagonal = Math.sqrt(w * w + h * h);
    const gridExtent = diagonal * 0.7;
    const minGrid = Math.floor(-gridExtent / step) * step;
    const maxGrid = Math.ceil(gridExtent / step) * step;
    const baseRadius = step * 0.5;

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

      const darkness = map[si];
      const relativeSize = dotScaleMin + (darkness * (dotScaleMax - dotScaleMin));
      let finalRadius = baseRadius * relativeSize;
      finalRadius *= threshold;

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

    return new ImageData(data, w, h);
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
    const spacingHalf = spacing * 0.5;
    const edgeSmooth = (1 - hardness) * 1.5;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const ySin = y * sin;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;

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
    return new ImageData(data, w, h);
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

    return new ImageData(data, w, h);
  },


  noise: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
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
        const gray = getGray(data, i);
        const sx = Math.floor(x * invPixelScale);
        const noise = seededRandom(sy * sw + sx + 0.5);
        const adjustedThreshold = decisionThreshold + (noise - 0.5) * noiseAmount;
        const result = gray > adjustedThreshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return new ImageData(data, w, h);
  },

  // Blue noise dithering using precomputed 64x64 blue noise texture
  blueNoise: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % 64;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const gray = getGray(data, i);
        const mx = Math.floor(x * invPixelScale) % 64;
        const blueNoiseValue = BLUE_NOISE_64[my][mx];
        const result = gray > (blueNoiseValue + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return new ImageData(data, w, h);
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

    // Stucki kernel (÷42):
    //     *  8  4
    // 2  4  8  4  2
    // 1  2  4  2  1
    const div = 1 / 42;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        // Row 0
        if (x + 1 < sw) gray[i + 1] += error * 8;
        if (x + 2 < sw) gray[i + 2] += error * 4;
        // Row 1
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 1) gray[row1 - 2] += error * 2;
          if (x > 0) gray[row1 - 1] += error * 4;
          gray[row1] += error * 8;
          if (x + 1 < sw) gray[row1 + 1] += error * 4;
          if (x + 2 < sw) gray[row1 + 2] += error * 2;
        }
        // Row 2
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

    // Map back to full resolution
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
    return new ImageData(data, w, h);
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

    // Sierra kernel (÷32):
    //     *  5  3
    // 2  4  5  4  2
    //    2  3  2
    const div = 1 / 32;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        // Row 0
        if (x + 1 < sw) gray[i + 1] += error * 5;
        if (x + 2 < sw) gray[i + 2] += error * 3;
        // Row 1
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 1) gray[row1 - 2] += error * 2;
          if (x > 0) gray[row1 - 1] += error * 4;
          gray[row1] += error * 5;
          if (x + 1 < sw) gray[row1 + 1] += error * 4;
          if (x + 2 < sw) gray[row1 + 2] += error * 2;
        }
        // Row 2
        if (y + 2 < sh) {
          const row2 = i + sw * 2;
          if (x > 0) gray[row2 - 1] += error * 2;
          gray[row2] += error * 3;
          if (x + 1 < sw) gray[row2 + 1] += error * 2;
        }
      }
    }

    // Map back to full resolution
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
    return new ImageData(data, w, h);
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

    // Sierra Two-Row kernel (÷16):
    //     *  4  3
    // 1  2  3  2  1
    const div = 1 / 16;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        // Row 0
        if (x + 1 < sw) gray[i + 1] += error * 4;
        if (x + 2 < sw) gray[i + 2] += error * 3;
        // Row 1
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

    // Map back to full resolution
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
    return new ImageData(data, w, h);
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

    // Sierra Lite kernel (÷4):
    //     *  2
    // 1  1
    const div = 1 / 4;

    for (let y = 0; y < sh; y++) {
      const yw = y * sw;
      for (let x = 0; x < sw; x++) {
        const i = yw + x;
        const oldPixel = gray[i];
        const newPixel = oldPixel > thresh ? 255 : 0;
        gray[i] = newPixel;
        const error = (oldPixel - newPixel) * div;

        // Row 0
        if (x + 1 < sw) gray[i + 1] += error * 2;
        // Row 1
        if (y + 1 < sh) {
          const row1 = i + sw;
          if (x > 0) gray[row1 - 1] += error * 1;
          gray[row1] += error * 1;
        }
      }
    }

    // Map back to full resolution
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
    return new ImageData(data, w, h);
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

    // Generate Hilbert curve path
    const hilbertPath = generateHilbertPath(sw, sh);

    // Error buffer for Riemersma (uses a queue of recent errors)
    const queueSize = 16;
    const errorQueue = new Float32Array(queueSize);
    const weights = new Float32Array(queueSize);
    let weightSum = 0;

    // Calculate exponential weights (more recent = higher weight)
    for (let i = 0; i < queueSize; i++) {
      weights[i] = Math.pow(2, -i / 4);
      weightSum += weights[i];
    }

    // Process pixels along Hilbert curve
    for (let p = 0; p < hilbertPath.length; p++) {
      const { x, y } = hilbertPath[p];
      if (x >= sw || y >= sh) continue;

      const i = y * sw + x;

      // Add accumulated error from queue
      let accError = 0;
      for (let q = 0; q < queueSize; q++) {
        accError += errorQueue[q] * weights[q];
      }
      accError /= weightSum;

      const oldPixel = gray[i] + accError;
      const newPixel = oldPixel > thresh ? 255 : 0;
      output[i] = newPixel;
      const error = oldPixel - newPixel;

      // Shift error queue and add new error
      for (let q = queueSize - 1; q > 0; q--) {
        errorQueue[q] = errorQueue[q - 1];
      }
      errorQueue[0] = error;
    }

    // Map back to full resolution
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
    return new ImageData(data, w, h);
  }
};

// Blend modes - optimized with pre-computed constants
const INV_255 = 1 / 255;

export const blendModes = {
  normal: (base, blend, alpha) => blend * alpha + base * (1 - alpha),
  multiply: (base, blend, alpha) => {
    const result = base * blend * INV_255;
    return result * alpha + base * (1 - alpha);
  },
  screen: (base, blend, alpha) => {
    const result = 255 - (255 - base) * (255 - blend) * INV_255;
    return result * alpha + base * (1 - alpha);
  },
  overlay: (base, blend, alpha) => {
    const result = base < 128
      ? 2 * base * blend * INV_255
      : 255 - 2 * (255 - base) * (255 - blend) * INV_255;
    return result * alpha + base * (1 - alpha);
  },
  darken: (base, blend, alpha) => {
    const result = base < blend ? base : blend;
    return result * alpha + base * (1 - alpha);
  },
  lighten: (base, blend, alpha) => {
    const result = base > blend ? base : blend;
    return result * alpha + base * (1 - alpha);
  },
};


