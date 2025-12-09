import { useState, useEffect, useRef, useCallback } from 'react';

// Debounce hook
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Throttle hook - ensures function is called at most once per interval
export function useThrottle(value, interval) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;
    
    if (elapsed >= interval) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - elapsed);
      return () => clearTimeout(handler);
    }
  }, [value, interval]);

  return throttledValue;
}

// Debounced callback hook - returns a debounced version of a callback
export function useDebouncedCallback(callback, delay) {
  const timeoutRef = useRef(null);
  
  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

// Seeded random for consistent noise
export function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Bayer matrices
export const BAYER_2x2 = [[0,2],[3,1]].map(r => r.map(v => v/4));
export const BAYER_4x4 = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]].map(r => r.map(v => v/16));
export const BAYER_8x8 = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]].map(r => r.map(v => v/64));

// Blue noise 64x64 texture (precomputed, normalized to 0-1)
// Generated using void-and-cluster algorithm approximation
export const BLUE_NOISE_64 = generateBlueNoiseTexture();

function generateBlueNoiseTexture() {
  const size = 64;
  const texture = [];
  
  // Use a deterministic seed-based approach to generate blue noise pattern
  // This creates a pattern with good spectral properties
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      // Combine multiple frequency components for blue noise approximation
      let value = 0;
      
      // Use interleaved gradient noise as base (good blue noise properties)
      const magic = 52.9829189;
      const igx = x + 0.5;
      const igy = y + 0.5;
      value = (igx * 0.06711056 + igy * 0.00583715) * magic;
      value = value - Math.floor(value);
      
      // Add higher frequency components
      const s1 = Math.sin(x * 0.1234 + y * 0.5678) * 0.5 + 0.5;
      const s2 = Math.sin(x * 0.8765 - y * 0.4321) * 0.5 + 0.5;
      const s3 = Math.sin((x + y) * 0.2468) * 0.5 + 0.5;
      
      // Combine with weights favoring high frequency content
      value = value * 0.6 + s1 * 0.15 + s2 * 0.15 + s3 * 0.1;
      
      row.push(value);
    }
    texture.push(row);
  }
  
  return texture;
}

// Generate Hilbert curve path for given dimensions
export function generateHilbertPath(width, height) {
  const path = [];
  const maxDim = Math.max(width, height);
  
  // Find the smallest power of 2 >= maxDim
  let order = 0;
  let size = 1;
  while (size < maxDim) {
    size *= 2;
    order++;
  }
  
  // Generate Hilbert curve points
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
    
    const w2 = Math.abs(ax2 + ay2);
    const h2 = Math.abs(bx2 + by2);
    
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
  
  // Start Hilbert curve generation
  if (size > 1) {
    hilbert(0, 0, size, 0, 0, size);
  } else {
    path.push({ x: 0, y: 0 });
  }
  
  // Filter to only include points within bounds
  return path.filter(p => p.x < width && p.y < height);
}

// Optimized grayscale calculation constants
export const GRAY_R = 0.299;
export const GRAY_G = 0.587;
export const GRAY_B = 0.114;
export const GRAY_INV = 1 / 255;

// Helper to calculate grayscale (optimized)
export function getGray(data, i) {
  return (data[i] * GRAY_R + data[i+1] * GRAY_G + data[i+2] * GRAY_B) * GRAY_INV;
}


