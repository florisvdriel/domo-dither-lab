import { getGray, BAYER_2x2, BAYER_4x4, BAYER_8x8, GRAY_R, GRAY_G, GRAY_B, seededRandom } from './helpers';

// Dithering Algorithms
export const ditherAlgorithms = {
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
    return new ImageData(data, w, h);
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
    return new ImageData(data, w, h);
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
    return new ImageData(data, w, h);
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
    
    // Pre-calculate pixel bounds for sampling
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
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
    return new ImageData(data, w, h);
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
    
    // Pre-calculate pixel bounds for sampling
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
        data[idx] = data[idx+1] = data[idx+2] = val;
      }
    }
    return new ImageData(data, w, h);
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
    
    // Calculate grid bounds more efficiently
    const gridExtent = Math.max(w, h) * 2;
    const gridStart = -gridExtent;
    const gridEnd = gridExtent;
    
    // Pre-calculate bounds for grid iteration
    const minGridX = Math.floor((gridStart - wHalf) / step) * step;
    const maxGridX = Math.ceil((gridEnd - wHalf) / step) * step;
    const minGridY = Math.floor((gridStart - hHalf) / step) * step;
    const maxGridY = Math.ceil((gridEnd - hHalf) / step) * step;
    
    for (let gy = minGridY; gy <= maxGridY; gy += step) {
      for (let gx = minGridX; gx <= maxGridX; gx += step) {
        const cx = gx * cos - gy * sin + wHalf;
        const cy = gx * sin + gy * cos + hHalf;
        
        // Early bounds check
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
        
        // Pre-calculate radius squared to avoid sqrt in inner loop
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
    return new ImageData(data, w, h);
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
    return new ImageData(data, w, h);
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
    
    // Calculate grid bounds more efficiently (same as halftoneCircle)
    const gridExtent = Math.max(w, h) * 2;
    const gridStart = -gridExtent;
    const gridEnd = gridExtent;
    
    // Pre-calculate bounds for grid iteration
    const minGridX = Math.floor((gridStart - wHalf) / step) * step;
    const maxGridX = Math.ceil((gridEnd - wHalf) / step) * step;
    const minGridY = Math.floor((gridStart - hHalf) / step) * step;
    const maxGridY = Math.ceil((gridEnd - hHalf) / step) * step;
    
    for (let gy = minGridY; gy <= maxGridY; gy += step) {
      for (let gx = minGridX; gx <= maxGridX; gx += step) {
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
        
        // Pre-calculate rotated basis vectors
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
        data[i] = data[i+1] = data[i+2] = result;
      }
    }
    return new ImageData(data, w, h);
  }
};

// Blend modes
export const blendModes = {
  normal: (base, blend, alpha) => blend * alpha + base * (1 - alpha),
  multiply: (base, blend, alpha) => ((base/255) * (blend/255) * 255) * alpha + base * (1 - alpha),
  screen: (base, blend, alpha) => (255 - ((255-base)/255) * ((255-blend)/255) * 255) * alpha + base * (1 - alpha),
  overlay: (base, blend, alpha) => {
    const result = base < 128 ? (2*base*blend)/255 : 255 - (2*(255-base)*(255-blend))/255;
    return result * alpha + base * (1 - alpha);
  },
  darken: (base, blend, alpha) => Math.min(base, blend) * alpha + base * (1 - alpha),
  lighten: (base, blend, alpha) => Math.max(base, blend) * alpha + base * (1 - alpha),
};


