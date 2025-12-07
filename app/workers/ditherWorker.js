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
  return (data[i] * GRAY_R + data[i+1] * GRAY_G + data[i+2] * GRAY_B) * GRAY_INV;
}

// Seeded random for consistent noise
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Bayer matrices
const BAYER_2x2 = [[0,2],[3,1]].map(r => r.map(v => v/4));
const BAYER_4x4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]].map(r => r.map(v => v/16));
const BAYER_8x8 = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]].map(r => r.map(v => v/64));

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
        data[i] = data[i+1] = data[i+2] = result;
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
        data[i] = data[i+1] = data[i+2] = result;
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
        data[i] = data[i+1] = data[i+2] = result;
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
            sum += data[idx] * GRAY_R + data[idx+1] * GRAY_G + data[idx+2] * GRAY_B;
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
        data[idx] = data[idx+1] = data[idx+2] = val;
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
            sum += data[idx] * GRAY_R + data[idx+1] * GRAY_G + data[idx+2] * GRAY_B;
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
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
    return { data, width: w, height: h };
  },

  halftoneCircle: (imageData, threshold, dotSize = 6, angle = 15) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);
    
    const step = Math.max(3, Math.floor(dotSize));
    const maxRadius = step * 0.48;
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const radiusMultiplier = maxRadius * (0.6 + threshold * 0.7);
    const radiusThreshold = 0.5;
    const radiusPadding = 0.7;
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
        
        const radiusWithPadding = radius + radiusPadding;
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
              const coverage = Math.max(0, Math.min(1, radius - dist + radiusPadding));
              const newVal = Math.round(255 * (1 - coverage));
              const current = data[i];
              if (newVal < current) {
                data[i] = data[i+1] = data[i+2] = newVal;
              }
            }
          }
        }
      }
    }
    return { data, width: w, height: h };
  },

  halftoneLines: (imageData, threshold, lineSpacing = 4, angle = 45) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);
    
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const spacing = Math.max(3, lineSpacing);
    const maxWidth = spacing * 0.7;
    const widthMultiplier = maxWidth * (0.5 + threshold * 0.7);
    const spacingHalf = spacing * 0.5;
    const padding = 0.7;
    
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
        const thresholdDist = halfWidth + padding;
        
        if (centerDist <= thresholdDist) {
          const coverage = Math.max(0, Math.min(1, halfWidth - centerDist + padding));
          const val = Math.round(255 * (1 - coverage));
          data[i] = data[i+1] = data[i+2] = val;
        }
      }
    }
    return { data, width: w, height: h };
  },

  halftoneSquare: (imageData, threshold, size = 6, angle = 0) => {
    const data = new Uint8ClampedArray(imageData.data);
    const w = imageData.width, h = imageData.height;
    data.fill(255);
    
    const step = Math.max(3, Math.floor(size));
    const maxSize = step * 0.85;
    const rad = (angle * Math.PI) * (1 / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const sizeMultiplier = maxSize * (0.4 + threshold * 0.6) * 0.5;
    const padding = 0.7;
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
            
            if (dist < padding) {
              const i = (pyw + px) * 4;
              const coverage = Math.max(0, Math.min(1, -dist + padding));
              const newVal = Math.round(255 * (1 - coverage));
              const current = data[i];
              if (newVal < current) {
                data[i] = data[i+1] = data[i+2] = newVal;
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
        data[i] = data[i+1] = data[i+2] = result;
      }
    }
    return { data, width: w, height: h };
  }
};

// Message handler
self.onmessage = function(e) {
  const { type, id, algorithm, imageData, params } = e.data;
  
  if (type === 'dither') {
    const algo = ditherAlgorithms[algorithm];
    if (!algo) {
      self.postMessage({ type: 'error', id, error: `Unknown algorithm: ${algorithm}` });
      return;
    }
    
    try {
      const { threshold, scale, angle } = params;
      let result;
      
      // Call algorithm with appropriate parameters
      if (algorithm.startsWith('halftone')) {
        result = algo(imageData, threshold, scale, angle);
      } else if (algorithm === 'noise' || algorithm.startsWith('bayer') || algorithm === 'floydSteinberg' || algorithm === 'atkinson') {
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

