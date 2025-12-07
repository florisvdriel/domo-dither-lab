import { getGray, GRAY_R, GRAY_G, GRAY_B } from './helpers';
import { DOMO_PALETTE } from '../constants/palette';

// Apply brightness and contrast (optimized)
export function applyBrightnessContrast(imageData, brightness, contrast) {
  const data = new Uint8ClampedArray(imageData.data);
  const len = data.length;
  const brightnessOffset = brightness * 255;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  const factor128 = factor * 128;
  const oneMinusFactor = 1 - factor;
  
  for (let i = 0; i < len; i += 4) {
    let r = data[i] + brightnessOffset;
    let g = data[i + 1] + brightnessOffset;
    let b = data[i + 2] + brightnessOffset;
    
    r = factor * r + oneMinusFactor * 128;
    g = factor * g + oneMinusFactor * 128;
    b = factor * b + oneMinusFactor * 128;
    
    // Clamp using bitwise operations where possible
    data[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
    data[i + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
    data[i + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}

// Invert image data
export function invertImageData(imageData) {
  const data = new Uint8ClampedArray(imageData.data);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
  return new ImageData(data, imageData.width, imageData.height);
}

// Ink bleed effect - simulates capillary action via randomized dilation (fiber spread) - optimized
export function applyInkBleed(imageData, amount, roughness = 0.5) {
  const w = imageData.width, h = imageData.height;
  const original = new Uint8ClampedArray(imageData.data); // Read-only copy
  const result = new Uint8ClampedArray(imageData.data);   // Output buffer
  const len = original.length;
  
  // Number of dilation passes based on amount (1-3 passes)
  const passes = Math.max(1, Math.round(amount * 3));
  
  // Probability of a white pixel bleeding based on amount and roughness
  // Higher roughness = more irregular/random spread
  const baseProb = 0.3 + amount * 0.5; // 0.3 to 0.8 range
  const roughnessFactor = 1 - roughness * 0.5;
  const bleedOpacity = 0.9;
  const oneMinusBleedOpacity = 1 - bleedOpacity;
  const paperThreshold = 128; // Threshold in [0, 255] range
  
  // Pre-calculate neighbor offsets
  const neighborOffsets = [
    -w * 4,  // Up
    w * 4,   // Down
    -4,      // Left
    4        // Right
  ];
  
  // Run multiple dilation passes
  for (let pass = 0; pass < passes; pass++) {
    // Use result from previous pass as the new "original" for this pass
    if (pass > 0) {
      original.set(result);
    }
    
    // Iterate through every pixel
    for (let y = 0; y < h; y++) {
      const yw = y * w;
      const yw4 = yw * 4;
      for (let x = 0; x < w; x++) {
        const i = yw4 + x * 4;
        
        // Check if current pixel is white (paper) - optimized gray calculation
        const gray = original[i] * GRAY_R + original[i + 1] * GRAY_G + original[i + 2] * GRAY_B;
        const isPaper = gray >= paperThreshold;
        
        if (isPaper) {
          // Check 4 neighbors (Up, Down, Left, Right) - optimized bounds checking
          let hasInkNeighbor = false;
          let inkR = 0, inkG = 0, inkB = 0;
          
          // Check up
          if (y > 0) {
            const ni = i + neighborOffsets[0];
            const neighborGray = original[ni] * GRAY_R + original[ni + 1] * GRAY_G + original[ni + 2] * GRAY_B;
            if (neighborGray < paperThreshold) {
              hasInkNeighbor = true;
              inkR = original[ni];
              inkG = original[ni + 1];
              inkB = original[ni + 2];
            }
          }
          
          // Check down
          if (!hasInkNeighbor && y < h - 1) {
            const ni = i + neighborOffsets[1];
            const neighborGray = original[ni] * GRAY_R + original[ni + 1] * GRAY_G + original[ni + 2] * GRAY_B;
            if (neighborGray < paperThreshold) {
              hasInkNeighbor = true;
              inkR = original[ni];
              inkG = original[ni + 1];
              inkB = original[ni + 2];
            }
          }
          
          // Check left
          if (!hasInkNeighbor && x > 0) {
            const ni = i + neighborOffsets[2];
            const neighborGray = original[ni] * GRAY_R + original[ni + 1] * GRAY_G + original[ni + 2] * GRAY_B;
            if (neighborGray < paperThreshold) {
              hasInkNeighbor = true;
              inkR = original[ni];
              inkG = original[ni + 1];
              inkB = original[ni + 2];
            }
          }
          
          // Check right
          if (!hasInkNeighbor && x < w - 1) {
            const ni = i + neighborOffsets[3];
            const neighborGray = original[ni] * GRAY_R + original[ni + 1] * GRAY_G + original[ni + 2] * GRAY_B;
            if (neighborGray < paperThreshold) {
              hasInkNeighbor = true;
              inkR = original[ni];
              inkG = original[ni + 1];
              inkB = original[ni + 2];
            }
          }
          
          if (hasInkNeighbor) {
            // Calculate bleed probability with roughness adding randomness
            const prob = baseProb * (roughnessFactor + Math.random() * roughness);
            
            if (Math.random() < prob) {
              // Flip to ink - but at 90% opacity (slightly lighter than core ink)
              result[i] = Math.round(inkR * bleedOpacity + 255 * oneMinusBleedOpacity);
              result[i + 1] = Math.round(inkG * bleedOpacity + 255 * oneMinusBleedOpacity);
              result[i + 2] = Math.round(inkB * bleedOpacity + 255 * oneMinusBleedOpacity);
            }
          }
        }
        // If it's already ink, keep it as-is (already copied from original)
      }
    }
  }
  
  return new ImageData(result, w, h);
}

// Interpolate between colors
function interpolateColor(color1, color2, t) {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * t),
    Math.round(color1[1] + (color2[1] - color1[1]) * t),
    Math.round(color1[2] + (color2[2] - color1[2]) * t)
  ];
}

// Apply gradient map (optimized)
export function applyGradientMap(imageData, gradientColors) {
  const data = new Uint8ClampedArray(imageData.data);
  const colors = gradientColors.map(key => DOMO_PALETTE[key]?.rgb || [0, 0, 0]);
  const numStops = colors.length;
  const len = data.length;
  const stopsMinusOne = numStops - 1;
  
  for (let i = 0; i < len; i += 4) {
    const gray = getGray(data, i);
    
    const scaledPos = gray * stopsMinusOne;
    const index = Math.min(Math.floor(scaledPos), numStops - 2);
    const t = scaledPos - index;
    
    const c1 = colors[index];
    const c2 = colors[index + 1];
    const oneMinusT = 1 - t;
    
    data[i] = Math.round(c1[0] * oneMinusT + c2[0] * t);
    data[i + 1] = Math.round(c1[1] * oneMinusT + c2[1] * t);
    data[i + 2] = Math.round(c1[2] * oneMinusT + c2[2] * t);
  }
  
  return new ImageData(data, imageData.width, imageData.height);
}

