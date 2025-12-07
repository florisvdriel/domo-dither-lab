'use client';

import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for using the dither web worker
 * Provides off-main-thread dithering calculations
 */
export function useDitherWorker() {
  const workerRef = useRef(null);
  const pendingRef = useRef(new Map());
  const idCounterRef = useRef(0);
  
  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      // Create worker from the worker file
      workerRef.current = new Worker(
        new URL('../workers/ditherWorker.js', import.meta.url)
      );
      
      // Handle messages from worker
      workerRef.current.onmessage = (e) => {
        const { type, id, result, error } = e.data;
        const pending = pendingRef.current.get(id);
        
        if (pending) {
          pendingRef.current.delete(id);
          
          if (type === 'result') {
            // Reconstruct ImageData from the transferred buffer
            const imageData = new ImageData(
              new Uint8ClampedArray(result.data),
              result.width,
              result.height
            );
            pending.resolve(imageData);
          } else if (type === 'error') {
            pending.reject(new Error(error));
          }
        }
      };
      
      workerRef.current.onerror = (e) => {
        console.error('Dither worker error:', e);
      };
    } catch (err) {
      console.warn('Web Worker not available, falling back to main thread:', err);
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      // Reject any pending promises
      pendingRef.current.forEach(({ reject }) => {
        reject(new Error('Worker terminated'));
      });
      pendingRef.current.clear();
    };
  }, []);
  
  /**
   * Run dithering algorithm in web worker
   * Falls back to main thread if worker unavailable
   */
  const dither = useCallback((algorithm, imageData, params) => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        // Worker not available, reject to trigger fallback
        reject(new Error('Worker not available'));
        return;
      }
      
      const id = ++idCounterRef.current;
      pendingRef.current.set(id, { resolve, reject });
      
      // Clone the image data for transfer
      const dataClone = new Uint8ClampedArray(imageData.data);
      
      workerRef.current.postMessage(
        {
          type: 'dither',
          id,
          algorithm,
          imageData: {
            data: dataClone,
            width: imageData.width,
            height: imageData.height
          },
          params
        },
        [dataClone.buffer]
      );
    });
  }, []);
  
  /**
   * Check if worker is available
   */
  const isAvailable = useCallback(() => {
    return workerRef.current !== null;
  }, []);
  
  /**
   * Cancel all pending operations
   */
  const cancelAll = useCallback(() => {
    pendingRef.current.forEach(({ reject }) => {
      reject(new Error('Operation cancelled'));
    });
    pendingRef.current.clear();
  }, []);
  
  return {
    dither,
    isAvailable,
    cancelAll
  };
}

export default useDitherWorker;

