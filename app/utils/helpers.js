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

// Optimized grayscale calculation constants
export const GRAY_R = 0.299;
export const GRAY_G = 0.587;
export const GRAY_B = 0.114;
export const GRAY_INV = 1 / 255;

// Helper to calculate grayscale (optimized)
export function getGray(data, i) {
  return (data[i] * GRAY_R + data[i+1] * GRAY_G + data[i+2] * GRAY_B) * GRAY_INV;
}


