'use client';

import { useEffect, useCallback } from 'react';

// Map shift+number to the number (since shift+1 = !, etc.)
const SHIFT_NUMBER_MAP = {
  '!': '1',
  '@': '2',
  '#': '3',
  '$': '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
};

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} shortcuts - Map of shortcut keys to handler functions
 * @param {Object} options - Configuration options
 */
export function useKeyboardShortcuts(shortcuts, options = {}) {
  const { enabled = true } = options;
  
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    const tagName = e.target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return;
    }
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // Get the key, handling shift+number -> number mapping
    let key = e.key.toLowerCase();
    if (e.shiftKey && SHIFT_NUMBER_MAP[e.key]) {
      key = SHIFT_NUMBER_MAP[e.key];
    }
    
    // Build shortcut key string (order: cmd, shift, alt, key)
    let shortcutKey = '';
    if (cmdOrCtrl) shortcutKey += 'cmd+';
    if (e.shiftKey) shortcutKey += 'shift+';
    if (e.altKey) shortcutKey += 'alt+';
    shortcutKey += key;
    
    // Also check without modifiers for simple keys
    const simpleKey = key;
    
    // Check for matching shortcut
    if (shortcuts[shortcutKey]) {
      e.preventDefault();
      shortcuts[shortcutKey](e);
    } else if (!cmdOrCtrl && !e.shiftKey && !e.altKey && shortcuts[simpleKey]) {
      e.preventDefault();
      shortcuts[simpleKey](e);
    }
  }, [shortcuts, enabled]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Standard shortcuts configuration for Halftone Lab
 */
export function createShortcuts({
  onUndo,
  onRedo,
  onExport,
  onRandomize,
  onToggleComparison,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSelectLayer,
  onToggleLayerVisibility
}) {
  return {
    // Undo/Redo
    'cmd+z': onUndo,
    'cmd+shift+z': onRedo,
    
    // Export
    'cmd+e': onExport,
    'cmd+shift+e': onExport, // Alternative
    
    // Randomize
    'r': onRandomize,
    
    // Comparison
    'c': onToggleComparison,
    
    // Zoom
    '=': onZoomIn,      // Plus key (without shift)
    '+': onZoomIn,      // Plus key (with shift on some keyboards)
    '-': onZoomOut,     // Minus key
    '0': onResetZoom,   // Reset to 100%
    
    // Layer selection (1-4)
    '1': () => onSelectLayer?.(0),
    '2': () => onSelectLayer?.(1),
    '3': () => onSelectLayer?.(2),
    '4': () => onSelectLayer?.(3),
    
    // Toggle layer visibility (Shift + 1-4)
    'shift+1': () => onToggleLayerVisibility?.(0),
    'shift+2': () => onToggleLayerVisibility?.(1),
    'shift+3': () => onToggleLayerVisibility?.(2),
    'shift+4': () => onToggleLayerVisibility?.(3),
  };
}

export default useKeyboardShortcuts;

