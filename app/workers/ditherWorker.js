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

// Seeded random for consistent noise
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
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

  bayer2x2: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_2x2;
    const size = 2;
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % size;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const gray = getGray(data, i);
        const mx = Math.floor(x * invPixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  bayer4x4: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_4x4;
    const size = 4;
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % size;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const gray = getGray(data, i);
        const mx = Math.floor(x * invPixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  bayer8x8: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const matrix = BAYER_8x8;
    const size = 8;
    const thresholdOffset = (threshold - 0.5) * 0.8;
    const pixelScale = Math.max(1, Math.floor(scale));
    const invPixelScale = 1 / pixelScale;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const my = Math.floor(y * invPixelScale) % size;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const gray = getGray(data, i);
        const mx = Math.floor(x * invPixelScale) % size;
        const result = gray > (matrix[my][mx] + thresholdOffset) ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = result;
      }
    }
    return { data, width: w, height: h };
  },

  floydSteinberg: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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

  atkinson: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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

  halftoneCircle: (imageData, threshold, dotSize = 6, angle = 15, hardness = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);

    const step = Math.max(1, Math.floor(dotSize));
    const maxRadius = step * 0.48;
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const radiusMultiplier = maxRadius * (0.6 + threshold * 0.7);
    const radiusThreshold = 0.5;
    const padding = 0.7;
    // Hardness 1 = 0 smooth; Hardness 0 = 1.5 smooth
    const edgeSmooth = (1 - hardness) * 1.5;
    const wHalf = w * 0.5;
    const hHalf = h * 0.5;

    // Optimized: tighter grid bounds based on actual visible area
    const diagonal = Math.sqrt(w * w + h * h);
    const gridExtent = diagonal * 0.6; // Reduced from 2x to ~1.2x
    const minGrid = -gridExtent;
    const maxGrid = gridExtent;

    for (let gy = minGrid; gy <= maxGrid; gy += step) {
      for (let gx = minGrid; gx <= maxGrid; gx += step) {
        const cx = gx * cos - gy * sin + wHalf;
        const cy = gx * sin + gy * cos + hHalf;

        if (cx < -step || cx >= w + step || cy < -step || cy >= h + step) continue;

        const sampleX = Math.max(0, Math.min(w - 1, Math.round(cx)));
        const sampleY = Math.max(0, Math.min(h - 1, Math.round(cy)));
        const si = (sampleY * w + sampleX) * 4;
        const gray = getGray(imageData.data, si);

        const darkness = 1 - gray;
        const radius = Math.sqrt(darkness) * radiusMultiplier;

        if (radius < radiusThreshold) continue;

        const radiusWithPadding = radius + padding;
        const minX = Math.max(0, Math.floor(cx - radiusWithPadding));
        const maxX = Math.min(w - 1, Math.ceil(cx + radiusWithPadding));
        const minY = Math.max(0, Math.floor(cy - radiusWithPadding));
        const maxY = Math.min(h - 1, Math.ceil(cy + radiusWithPadding));

        const radiusSq = radiusWithPadding * radiusWithPadding;

        for (let py = minY; py <= maxY; py++) {
          const dy = py - cy;
          const dySq = dy * dy;
          const pyw = py * w;
          for (let px = minX; px <= maxX; px++) {
            const dx = px - cx;
            const distSq = dx * dx + dySq;

            if (distSq <= radiusSq) {
              const dist = Math.sqrt(distSq);
              const i = (pyw + px) * 4;
              const coverage = Math.max(0, Math.min(1, radius - dist + edgeSmooth));
              const newVal = Math.round(255 * (1 - coverage));
              const current = data[i];
              if (newVal < current) {
                data[i] = data[i + 1] = data[i + 2] = newVal;
              }
            }
          }
        }
      }
    }
    return { data, width: w, height: h };
  },

  halftoneLines: (imageData, threshold, lineSpacing = 4, angle = 45, hardness = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);

    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const spacing = Math.max(1, lineSpacing);
    const maxWidth = spacing * 0.7;
    const widthMultiplier = maxWidth * (0.5 + threshold * 0.7);
    const spacingHalf = spacing * 0.5;
    const padding = 0.7;
    const edgeSmooth = (1 - hardness) * 1.5;

    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const ySin = y * sin;
      for (let x = 0; x < w; x++) {
        const i = (yw + x) * 4;
        const gray = getGray(imageData.data, i);

        const rx = x * cos + ySin;
        const linePos = ((rx % spacing) + spacing) % spacing;
        const centerDist = Math.abs(linePos - spacingHalf);

        const darkness = 1 - gray;
        const lineWidth = Math.sqrt(darkness) * widthMultiplier;
        const halfWidth = lineWidth * 0.5;
        const thresholdDist = halfWidth + edgeSmooth;

        if (centerDist <= thresholdDist) {
          const coverage = Math.max(0, Math.min(1, halfWidth - centerDist + edgeSmooth));
          const val = Math.round(255 * (1 - coverage));
          data[i] = data[i + 1] = data[i + 2] = val;
        }
      }
    }
    return { data, width: w, height: h };
  },

  halftoneSquare: (imageData, threshold, size = 6, angle = 0, hardness = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);

    const step = Math.max(1, Math.floor(size));
    const maxSize = step * 0.85;
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const sizeMultiplier = maxSize * (0.4 + threshold * 0.6) * 0.5;
    const padding = 0.7;
    const edgeSmooth = (1 - hardness) * 1.5;
    const wHalf = w * 0.5;
    const hHalf = h * 0.5;

    // Optimized: tighter grid bounds
    const diagonal = Math.sqrt(w * w + h * h);
    const gridExtent = diagonal * 0.6;
    const minGrid = -gridExtent;
    const maxGrid = gridExtent;

    for (let gy = minGrid; gy <= maxGrid; gy += step) {
      for (let gx = minGrid; gx <= maxGrid; gx += step) {
        const cx = gx * cos - gy * sin + wHalf;
        const cy = gx * sin + gy * cos + hHalf;

        if (cx < -step || cx >= w + step || cy < -step || cy >= h + step) continue;

        const sampleX = Math.max(0, Math.min(w - 1, Math.round(cx)));
        const sampleY = Math.max(0, Math.min(h - 1, Math.round(cy)));
        const si = (sampleY * w + sampleX) * 4;
        const gray = getGray(imageData.data, si);

        const darkness = 1 - gray;
        const squareHalf = Math.sqrt(darkness) * sizeMultiplier;

        if (squareHalf < 0.3) continue;

        const extent = squareHalf + 1;
        const minX = Math.max(0, Math.floor(cx - extent));
        const maxX = Math.min(w - 1, Math.ceil(cx + extent));
        const minY = Math.max(0, Math.floor(cy - extent));
        const maxY = Math.min(h - 1, Math.ceil(cy + extent));

        const negSin = -sin;

        for (let py = minY; py <= maxY; py++) {
          const dy = py - cy;
          const dyCos = dy * cos;
          const dySin = dy * sin;
          const pyw = py * w;
          for (let px = minX; px <= maxX; px++) {
            const dx = px - cx;
            const rdx = dx * cos + dySin;
            const rdy = dx * negSin + dyCos;

            const distX = Math.abs(rdx) - squareHalf;
            const distY = Math.abs(rdy) - squareHalf;
            const dist = Math.max(distX, distY);

            if (dist < edgeSmooth) {
              const i = (pyw + px) * 4;
              const coverage = Math.max(0, Math.min(1, -dist + edgeSmooth));
              const newVal = Math.round(255 * (1 - coverage));
              const current = data[i];
              if (newVal < current) {
                data[i] = data[i + 1] = data[i + 2] = newVal;
              }
            }
          }
        }
      }
    }
    return { data, width: w, height: h };
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
    return { data, width: w, height: h };
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
    return { data, width: w, height: h };
  },

  // Stucki error diffusion (sharper than Floyd-Steinberg, 42-divisor kernel)
  stucki: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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
  sierra: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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
  sierraTwoRow: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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
  sierraLite: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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
  riemersma: (imageData, threshold, scale = 1) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    const pixelScale = Math.max(1, Math.floor(scale));
    const thresh = 80 + threshold * 100;
    const invPixelScale = 1 / pixelScale;

    const sw = Math.ceil(w * invPixelScale);
    const sh = Math.ceil(h * invPixelScale);
    const gray = new Float32Array(sw * sh);
    const output = new Uint8Array(sw * sh);

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
            const idx = (dyw + dx) * 4;
            sum += data[idx] * GRAY_R + data[idx + 1] * GRAY_G + data[idx + 2] * GRAY_B;
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
        // Correctly pass hardness as the last argument
        result = algo(imageData, threshold, scale, angle, hardness);
      } else if (algorithm === 'noise' || algorithm.startsWith('bayer') || algorithm === 'floydSteinberg' || algorithm === 'atkinson' || algorithm === 'stucki' || algorithm === 'sierra' || algorithm === 'sierraTwoRow' || algorithm === 'sierraLite' || algorithm === 'blueNoise' || algorithm === 'riemersma') {
        result = algo(imageData, threshold, scale);
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

