'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';

// Constants
import { DOMO_PALETTE } from '../constants/palette';
import { DEFAULT_PALETTE } from '../constants/palette';
import { DITHER_ALGORITHMS } from '../constants/ditherAlgorithms';
import { PRESETS } from '../constants/presets/index';
import { BLEND_MODES, EXPORT_RESOLUTIONS, PREVIEW_MAX_WIDTH, DEFAULT_STATE } from '../constants';
import { COLORS, FONTS, TRANSITIONS } from '../constants/design';

// Utilities
import { useDebounce, getGray } from '../utils/helpers';
import { ditherAlgorithms, blendModes } from '../utils/dithering';
import { applyBrightnessContrast, invertImageData, applyInkBleed } from '../utils/imageProcessing';
import { loadCustomPresets, saveCustomPresets } from '../utils/storage';
import { generateCombinedSVG, exportLayersAsZip, downloadSVG, estimateSVGSize } from '../utils/svgExport';
import { useDitherWorker } from '../hooks/useDitherWorker';
import { loadCustomPalette, saveCustomPalette, hexToRgb } from '../utils/paletteStorage';
import { generateNamedPalette, getColorNameFromHex } from '../utils/paletteGenerator';

// UI Components
import Toast from './ui/Toast';
import Button from './ui/Button';
import IconButton from './ui/IconButton';
import DropZone from './ui/DropZone';
import ComparisonSlider from './ui/ComparisonSlider';
import SavePresetModal from './ui/SavePresetModal';
import ExportDialog from './ui/ExportDialog';
import RightPanel from './ui/RightPanel';
import CompositionPanel from './ui/CompositionPanel';
import KeyboardShortcutsDialog from './ui/KeyboardShortcutsDialog';

// Keyboard shortcuts
import { COMMANDS, matchesShortcut } from '../utils/commands';
import { useUndoRedo } from '../hooks/useUndoRedo';


export default function HalftoneLab() {
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // Downscaled for performance
  const [imageScale, setImageScale] = useState(DEFAULT_STATE.imageScale);
  const [backgroundColorRaw, setBackgroundColorRaw] = useState(DEFAULT_STATE.backgroundColor);
  const [backgroundColorKey, setBackgroundColorKey] = useState(null); // null = use raw hex, otherwise use palette key
  const [exportResolution, setExportResolution] = useState(DEFAULT_STATE.exportResolution);

  const [brightness, setBrightness] = useState(DEFAULT_STATE.brightness);
  const [contrast, setContrast] = useState(DEFAULT_STATE.contrast);
  const [invert, setInvert] = useState(DEFAULT_STATE.invert);
  const [inkBleed, setInkBleed] = useState(DEFAULT_STATE.inkBleed);
  const [inkBleedAmount, setInkBleedAmount] = useState(DEFAULT_STATE.inkBleedAmount);
  const [inkBleedRoughness, setInkBleedRoughness] = useState(DEFAULT_STATE.inkBleedRoughness);
  const [paperTexture, setPaperTexture] = useState(DEFAULT_STATE.paperTexture);

  // Client-side only initialization to avoid hydration mismatch
  const [isClient, setIsClient] = useState(false);
  const [paletteState, setPaletteState] = useState({ palette: {}, layers: [] });

  const [layers, setLayers] = useState([{
    id: 1,
    colorKey: 'blue',
    ditherType: 'floydSteinberg',
    threshold: 0.5,
    scale: 2,
    angle: 0,
    offsetX: 0,
    offsetY: 0,
    blendMode: 'multiply',
    opacity: 1,
    visible: true,
    knockout: false,
    invert: false,
    gamma: 1,
    noise: 0,
    clampMin: 0,
    clampMax: 1,
    preBlur: 0
  }]);

  // UI and Viewport state
  const [viewportSize, setViewportSize] = useState(DEFAULT_STATE.viewportSize);
  const [imageTransform, setImageTransform] = useState(DEFAULT_STATE.imageTransform);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [preBlur, setPreBlur] = useState(DEFAULT_STATE.preBlur);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.5);
  const [customPresets, setCustomPresets] = useState(loadCustomPresets);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [lockedColors, setLockedColors] = useState(new Set());
  const [backgroundLocked, setBackgroundLocked] = useState(false);
  const [selection, setSelection] = useState({ type: 'project', id: null });

  // Refs
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const compCanvasRef = useRef(null);
  const imageWrapperRef = useRef(null);
  const fileInputRef = useRef(null);
  const presetImportRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const processingRef = useRef(false);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const layerCacheRef = useRef(new Map());
  const preprocessCacheRef = useRef(new Map());
  const globalRevisionRef = useRef(0);
  const imageIdRef = useRef(0);
  const pendingUpdateRef = useRef(0);

  // Constants
  const MAX_HISTORY = 50;
  const CACHE_VERSION = 1;

  // Derived state
  const palette = paletteState.palette;

  const activePalette = useMemo(() => {
    return {
      ...palette,
      white: DEFAULT_PALETTE.white,
      black: DEFAULT_PALETTE.black
    };
  }, [palette]);

  const colorKeys = Object.keys(activePalette).filter(k => !['white', 'black'].includes(k));

  const backgroundColor = useMemo(() => {
    if (backgroundColorKey && activePalette[backgroundColorKey]) {
      return activePalette[backgroundColorKey].hex;
    }
    return backgroundColorRaw;
  }, [backgroundColorKey, activePalette, backgroundColorRaw]);

  // Hook for worker
  const { dither: workerDither, isAvailable: isWorkerAvailable } = useDitherWorker();

  // Callbacks
  const captureSnapshot = useCallback(() => {
    return {
      layers: JSON.parse(JSON.stringify(layers)),
      brightness,
      contrast,
      invert,
      imageScale,
      preBlur,
      backgroundColorRaw,
      backgroundColorKey,
      palette: JSON.parse(JSON.stringify(palette)),
      inkBleed,
      inkBleedAmount,
      inkBleedRoughness,
      paperTexture
    };
  }, [layers, brightness, contrast, invert, imageScale, preBlur, backgroundColorRaw, backgroundColorKey, palette, inkBleed, inkBleedAmount, inkBleedRoughness, paperTexture]);

  // Effects
  useEffect(() => {
    setIsClient(true);
    const saved = loadCustomPalette();
    // Default to Domo Palette if no custom valid one found (or just enforce it)
    // For Domo Lab, we strictly enforce it on init
    const initialPalette = { ...DOMO_PALETTE };

    const firstColorKey = 'blue'; // Domo Blue
    const initialLayers = [{
      id: 1,
      colorKey: firstColorKey,
      ditherType: 'floydSteinberg',
      threshold: 0.5,
      scale: 2,
      channel: 'gray',
      angle: 0,
      offsetX: 0,
      offsetY: 0,
      blendMode: 'multiply',
      opacity: 1,
      visible: true,
      knockout: false
    }];
    setPaletteState({ palette: initialPalette, layers: initialLayers });
    setLayers(initialLayers);
  }, []);

  useEffect(() => {
    if (isClient && palette && Object.keys(palette).length > 0 && historyRef.current.length === 0) {
      const initialSnapshot = captureSnapshot();
      historyRef.current = [initialSnapshot];
      historyIndexRef.current = 0;
    }
  }, [isClient, palette, captureSnapshot]);

  // Wrapper for setPalette to update the combined state
  const setPalette = useCallback((newPaletteOrUpdater) => {
    setPaletteState(prev => ({
      ...prev,
      palette: typeof newPaletteOrUpdater === 'function'
        ? newPaletteOrUpdater(prev.palette)
        : newPaletteOrUpdater
    }));
  }, []);



  // Smart setter for background color - detects if it's a palette key or raw hex
  const setBackgroundColor = useCallback((colorOrKey) => {
    // Check if it's a palette key
    if (activePalette[colorOrKey]) {
      setBackgroundColorKey(colorOrKey);
      setBackgroundColorRaw(activePalette[colorOrKey].hex);
    } else if (colorOrKey === '#000000' || colorOrKey === '#FFFFFF' || colorOrKey === '#ffffff') {
      // Neutrals - use raw hex, clear key
      setBackgroundColorKey(null);
      setBackgroundColorRaw(colorOrKey.toUpperCase());
    } else {
      // Check if the hex matches any palette color - if so, link to that key
      const matchingKey = Object.keys(activePalette).find(
        k => activePalette[k]?.hex?.toUpperCase() === colorOrKey?.toUpperCase()
      );
      if (matchingKey && matchingKey !== 'white' && matchingKey !== 'black') {
        setBackgroundColorKey(matchingKey);
      } else {
        setBackgroundColorKey(null);
      }
      setBackgroundColorRaw(colorOrKey);
    }
  }, [activePalette]);



  // Undo/Redo: Push current state to history
  const pushHistory = useCallback(() => {
    if (isRestoringRef.current) return;

    const snapshot = captureSnapshot();
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;

    // Remove any future history if we're not at the end
    const newHistory = currentHistory.slice(0, currentIndex + 1);

    // Add new snapshot
    newHistory.push(snapshot);

    // Update index to point to the new snapshot
    historyIndexRef.current = newHistory.length - 1;

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
      historyIndexRef.current = MAX_HISTORY - 1;
    }

    historyRef.current = newHistory;
  }, [captureSnapshot, MAX_HISTORY]);

  // Undo/Redo: Restore state from snapshot
  const restoreSnapshot = useCallback((snapshot) => {
    isRestoringRef.current = true;

    setLayers(snapshot.layers);
    setBrightness(snapshot.brightness);
    setContrast(snapshot.contrast);
    setInvert(snapshot.invert);
    setImageScale(snapshot.imageScale);
    setPreBlur(snapshot.preBlur);
    setBackgroundColorRaw(snapshot.backgroundColorRaw);
    setBackgroundColorKey(snapshot.backgroundColorKey);
    setPalette(snapshot.palette);
    setInkBleed(snapshot.inkBleed);
    setInkBleedAmount(snapshot.inkBleedAmount);
    setInkBleedRoughness(snapshot.inkBleedRoughness);
    setPaperTexture(snapshot.paperTexture);

    // Use setTimeout to reset the flag after state updates complete
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  }, []);

  // Undo/Redo: Undo action
  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    const newIndex = historyIndexRef.current - 1;
    historyIndexRef.current = newIndex;
    restoreSnapshot(historyRef.current[newIndex]);
    showToast('Undo');
  }, [restoreSnapshot]);

  // Undo/Redo: Redo action
  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    const newIndex = historyIndexRef.current + 1;
    historyIndexRef.current = newIndex;
    restoreSnapshot(historyRef.current[newIndex]);
    showToast('Redo');
  }, [restoreSnapshot]);

  // Undo/Redo: Check if we can undo/redo
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // Get the currently selected layer (if any)
  const selectedLayer = useMemo(() => {
    if (selection.type === 'layer' && selection.id !== null) {
      return layers.find(l => l.id === selection.id) || null;
    }
    return null;
  }, [selection, layers]);

  // Get the index of the selected layer
  const selectedLayerIndex = useMemo(() => {
    if (selection.type === 'layer' && selection.id !== null) {
      return layers.findIndex(l => l.id === selection.id);
    }
    return -1;
  }, [selection, layers]);

  // Track previous palette keys to detect changes
  // Initialize with empty array to trigger remapping on first render
  const prevPaletteKeysRef = useRef([]);

  // Automatically remap layer colors when palette keys change
  // Use useLayoutEffect to run synchronously before paint, preventing flicker
  useLayoutEffect(() => {
    const currentKeys = Object.keys(palette);
    const prevKeys = prevPaletteKeysRef.current;

    // Only remap if the keys actually changed (not just the colors)
    if (currentKeys.length > 0 && JSON.stringify(currentKeys) !== JSON.stringify(prevKeys)) {
      setLayers(prevLayers => prevLayers.map((layer, index) => {
        // If the current colorKey doesn't exist in new palette, remap to index-based key
        if (!palette[layer.colorKey]) {
          return {
            ...layer,
            colorKey: currentKeys[index % currentKeys.length]
          };
        }
        return layer;
      }));
      prevPaletteKeysRef.current = currentKeys;
    }
  }, [palette]); // Removed 'layers' from dependencies to prevent issues

  // Debounce all processing-related state changes
  // Longer debounce for expensive operations
  const debouncedImageScale = useDebounce(imageScale, 200);
  const debouncedBrightness = useDebounce(brightness, 100);
  const debouncedContrast = useDebounce(contrast, 100);
  // REMOVED: Double debouncing of layers - sliders already debounce individually
  // const debouncedLayers = useDebounce(layers, 100);
  const debouncedInkBleedAmount = useDebounce(inkBleedAmount, 150);
  const debouncedInkBleedRoughness = useDebounce(inkBleedRoughness, 150);
  const debouncedPreBlur = useDebounce(preBlur, 150);

  // Phase 3: Clear layer cache (escape hatch and invalidation)
  const clearLayerCache = useCallback(() => {
    layerCacheRef.current.clear();
    if (process.env.NODE_ENV === 'development') {
      console.log('[Cache] Cleared all cached layers');
    }
  }, []);

  // Phase 4: Clear preprocessing cache
  const clearPreprocessCache = useCallback(() => {
    preprocessCacheRef.current.clear();
    if (process.env.NODE_ENV === 'development') {
      console.log('[PreprocessCache] Cleared all cached preprocessing data');
    }
  }, []);

  // Phase 4: Clear all caches (layer + preprocess)
  const clearAllCaches = useCallback(() => {
    clearLayerCache();
    clearPreprocessCache();
  }, [clearLayerCache, clearPreprocessCache]);

  // Phase 4: Compute preprocessing signature for cache key
  // Only includes params that affect the global preprocessing step
  const computePreprocessSignature = useCallback((imageId, scale, brightness, contrast, invert, preBlur) => {
    return JSON.stringify({
      v: CACHE_VERSION,
      imageId,
      scale,
      brightness,
      contrast,
      invert,
      preBlur
    });
  }, []);

  // Phase 3: Invalidate cache when global inputs change
  // This is called whenever global params that affect sourceData change
  const invalidateGlobalCache = useCallback(() => {
    globalRevisionRef.current += 1;
    clearLayerCache();
    // Note: preprocessCache is signature-based, so it self-invalidates when params change
    // But we clear it anyway to prevent unbounded growth
    clearPreprocessCache();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Global revision bumped to ${globalRevisionRef.current}`);
    }
  }, [clearLayerCache, clearPreprocessCache]);

  // Phase 3: Aggressively invalidate cache when ANY global input changes
  // Conservative approach: over-invalidate rather than under-invalidate
  useEffect(() => {
    // These global params affect the sourceData that all layers use
    // Any change means ALL cached layers are potentially stale
    invalidateGlobalCache();
  }, [debouncedImageScale, debouncedBrightness, debouncedContrast, invert, debouncedPreBlur, invalidateGlobalCache]);

  // Phase 4: Compute cache statistics for dev tools
  const cacheStats = useMemo(() => ({
    layerCacheSize: layerCacheRef.current.size,
    preprocessCacheSize: preprocessCacheRef.current.size
  }), [layers, debouncedImageScale, debouncedBrightness, debouncedContrast, invert, debouncedPreBlur]); // Re-compute when caches might change

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  // Create preview image (downscaled for performance)
  useEffect(() => {
    if (!image) {
      setPreviewImage(null);
      return;
    }

    if (image.width <= PREVIEW_MAX_WIDTH) {
      setPreviewImage(image);
      return;
    }

    const scale = PREVIEW_MAX_WIDTH / image.width;
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = Math.round(image.width * scale);
    previewCanvas.height = Math.round(image.height * scale);
    const ctx = previewCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Crisp nearest-neighbor scaling
    ctx.drawImage(image, 0, 0, previewCanvas.width, previewCanvas.height);

    const previewImg = new Image();
    previewImg.onload = () => setPreviewImage(previewImg);
    previewImg.src = previewCanvas.toDataURL();
  }, [image]);

  // Reset all
  const resetAll = () => {
    setImageScale(DEFAULT_STATE.imageScale);
    setBrightness(DEFAULT_STATE.brightness);
    setContrast(DEFAULT_STATE.contrast);
    setInvert(DEFAULT_STATE.invert);
    setInkBleed(DEFAULT_STATE.inkBleed);
    setInkBleedAmount(DEFAULT_STATE.inkBleedAmount);
    setInkBleedRoughness(DEFAULT_STATE.inkBleedRoughness);
    setPaperTexture(DEFAULT_STATE.paperTexture);
    setBackgroundColorRaw(DEFAULT_STATE.backgroundColor);
    setBackgroundColorKey(null);
    setExportResolution(DEFAULT_STATE.exportResolution);
    setViewportSize(DEFAULT_STATE.viewportSize);
    setImageTransform(DEFAULT_STATE.imageTransform);
    setPreBlur(DEFAULT_STATE.preBlur);
    setLayers(DEFAULT_STATE.layers.map(l => ({ ...l, id: Date.now() })));
    showToast('Reset to defaults');
  };

  const createDefaultLayer = () => ({
    id: Date.now(),
    colorKey: colorKeys[layers.length % colorKeys.length],
    ditherType: 'floydSteinberg',
    threshold: 0.5,
    scale: 2,
    angle: 0,
    offsetX: 0,
    offsetY: 0,
    blendMode: 'multiply',
    opacity: 1,
    visible: true,
    brightness: 0,
    contrast: 0,
    gamma: 1,
    hardness: 1,
    gridType: 'square',
    channel: 'gray',
    clampMin: 0,
    clampMax: 1,
    preBlur: 0,
    noise: 0,
    dotScaleMin: 0.1,
    dotScaleMax: 1,
    knockout: false
  });

  const addLayer = () => {
    if (layers.length < 4) {
      const newLayers = [...layers, createDefaultLayer()];
      setLayers(newLayers);
      // Push history after state change using the new value
      setTimeout(() => pushHistory(), 0);
    }
  };

  const updateLayer = (index, newLayer) => {
    const newLayers = [...layers];
    newLayers[index] = newLayer;
    setLayers(newLayers);
    setTimeout(() => pushHistory(), 0);
  };

  const removeLayer = (index) => {
    // If removing the selected layer, deselect it
    if (selection.type === 'layer' && selection.id === layers[index]?.id) {
      setSelection({ type: 'project', id: null });
    }
    setLayers(layers.filter((_, i) => i !== index));
    setTimeout(() => pushHistory(), 0);
  };

  const toggleLayerVisibility = (index) => {
    const newLayers = [...layers];
    newLayers[index] = { ...newLayers[index], visible: newLayers[index].visible === false ? true : false };
    setLayers(newLayers);
    setTimeout(() => pushHistory(), 0);
  };

  const duplicateLayer = (index) => {
    if (layers.length >= 4) return;
    const newLayer = { ...layers[index], id: Date.now() };
    const newLayers = [...layers];
    newLayers.splice(index + 1, 0, newLayer);
    setLayers(newLayers);
    setTimeout(() => pushHistory(), 0);
  };

  const moveLayerUp = (index) => {
    if (index === 0) return;
    const newLayers = [...layers];
    [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
    setLayers(newLayers);
    setTimeout(() => pushHistory(), 0);
  };

  const moveLayerDown = (index) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    setLayers(newLayers);
    setTimeout(() => pushHistory(), 0);
  };

  // Apply preset
  const applyPreset = (presetKey, isCustom = false) => {
    // Handle randomize special case
    if (presetKey === 'random') {
      randomizeLayers();
      return;
    }

    const preset = isCustom ? customPresets[presetKey] : PRESETS[presetKey];
    if (!preset) return;

    if (preset.layers) {
      setLayers(preset.layers.map((l, i) => ({ ...l, id: Date.now() + i })));
    }

    if (preset.inkBleed !== undefined) setInkBleed(preset.inkBleed);
    if (preset.inkBleedAmount !== undefined) setInkBleedAmount(preset.inkBleedAmount);
    if (preset.paperTexture !== undefined) setPaperTexture(preset.paperTexture);
    if (preset.backgroundColor !== undefined) setBackgroundColor(preset.backgroundColor);

    showToast(`Applied ${preset.name} preset`);
  };

  // Save custom preset
  const saveCustomPreset = (name) => {
    const preset = {
      name: name.toUpperCase(),
      description: 'Custom preset',
      layers: layers.map(l => ({ ...l })),
      inkBleed,
      inkBleedAmount,
      paperTexture,
      backgroundColor
    };

    const newPresets = { ...customPresets, [name.toLowerCase().replace(/\s+/g, '_')]: preset };
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    setShowSaveModal(false);
    showToast(`Saved "${name}" preset`);
  };

  // Delete custom preset
  const deleteCustomPreset = (key) => {
    const newPresets = { ...customPresets };
    delete newPresets[key];
    setCustomPresets(newPresets);
    saveCustomPresets(newPresets);
    showToast('Preset deleted');
  };

  // Export all custom presets as JSON
  const exportPresetsAsJSON = () => {
    if (Object.keys(customPresets).length === 0) {
      showToast('No custom presets to export');
      return;
    }

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: customPresets,
      // Optionally include custom palette if it exists
      ...(Object.keys(palette).length > 0 && { palette: palette })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stack-lab-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${Object.keys(customPresets).length} preset(s)`);
  };

  // Import presets from JSON file
  const importPresetsFromJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Validate structure
        if (!data.presets || typeof data.presets !== 'object') {
          showToast('Invalid preset file format');
          return;
        }

        // Validate each preset has required fields
        let validPresets = 0;
        const newPresets = { ...customPresets };

        Object.entries(data.presets).forEach(([key, preset]) => {
          if (preset.name && preset.layers && Array.isArray(preset.layers)) {
            newPresets[key] = preset;
            validPresets++;
          }
        });

        if (validPresets === 0) {
          showToast('No valid presets found in file');
          return;
        }

        setCustomPresets(newPresets);
        saveCustomPresets(newPresets);

        // Also import palette if present
        if (data.palette && typeof data.palette === 'object' && Object.keys(data.palette).length > 0) {
          const newPalette = { ...palette, ...data.palette };
          setPalette(newPalette);
          saveCustomPalette(newPalette);
          showToast(`Imported ${validPresets} preset(s) and palette`);
        } else {
          showToast(`Imported ${validPresets} preset(s)`);
        }
      } catch (err) {
        console.error('Import error:', err);
        showToast('Failed to parse preset file');
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    event.target.value = '';
  };

  // Palette functions
  const updatePaletteColor = (colorKey, newHex) => {
    const newName = getColorNameFromHex(newHex);
    const newPalette = {
      ...palette,
      [colorKey]: {
        ...palette[colorKey],
        name: newName,
        hex: newHex.toUpperCase(),
        rgb: hexToRgb(newHex)
      }
    };
    setPalette(newPalette);
    saveCustomPalette(newPalette);
    setTimeout(() => pushHistory(), 0);
  };

  const toggleLayerLock = (index) => {
    setLayers(prev => prev.map((layer, i) =>
      i === index ? { ...layer, locked: !layer.locked } : layer
    ));
    setTimeout(() => pushHistory(), 0);
  };

  const toggleBackgroundLock = () => {
    setBackgroundLocked(prev => !prev);
  };

  // Preset palettes
  const PRESET_PALETTES = {
    vibrant: {
      coral: { name: 'Coral', hex: '#FF6B6B', rgb: [255, 107, 107] },
      turquoise: { name: 'Turquoise', hex: '#4ECDC4', rgb: [78, 205, 196] },
      gold: { name: 'Gold', hex: '#FFE66D', rgb: [255, 230, 109] },
      violet: { name: 'Violet', hex: '#A8E6CF', rgb: [168, 230, 207] },
      pink: { name: 'Pink', hex: '#FF8B94', rgb: [255, 139, 148] },
      blue: { name: 'Blue', hex: '#95E1D3', rgb: [149, 225, 211] },
      peach: { name: 'Peach', hex: '#FFAAA5', rgb: [255, 170, 165] },
      mint: { name: 'Mint', hex: '#C7CEEA', rgb: [199, 206, 234] }
    },
    pastel: {
      rose: { name: 'Rose', hex: '#FFB3BA', rgb: [255, 179, 186] },
      peach: { name: 'Peach', hex: '#FFDFBA', rgb: [255, 223, 186] },
      cream: { name: 'Cream', hex: '#FFFFBA', rgb: [255, 255, 186] },
      mint: { name: 'Mint', hex: '#BAFFC9', rgb: [186, 255, 201] },
      sky: { name: 'Sky', hex: '#BAE1FF', rgb: [186, 225, 255] },
      lavender: { name: 'Lavender', hex: '#E0BBE4', rgb: [224, 187, 228] },
      lilac: { name: 'Lilac', hex: '#D4A5A5', rgb: [212, 165, 165] },
      sage: { name: 'Sage', hex: '#C9E4CA', rgb: [201, 228, 202] }
    },
    earthy: {
      terracotta: { name: 'Terracotta', hex: '#E07A5F', rgb: [224, 122, 95] },
      sage: { name: 'Sage', hex: '#81B29A', rgb: [129, 178, 154] },
      sand: { name: 'Sand', hex: '#F2CC8F', rgb: [242, 204, 143] },
      clay: { name: 'Clay', hex: '#C77D58', rgb: [199, 125, 88] },
      moss: { name: 'Moss', hex: '#6B8E65', rgb: [107, 142, 101] },
      stone: { name: 'Stone', hex: '#A8AAAA', rgb: [168, 170, 170] },
      bark: { name: 'Bark', hex: '#8B6F47', rgb: [139, 111, 71] },
      leaf: { name: 'Leaf', hex: '#9DAD7F', rgb: [157, 173, 127] }
    },
    neon: {
      pink: { name: 'Pink', hex: '#FF006E', rgb: [255, 0, 110] },
      yellow: { name: 'Yellow', hex: '#FFBE0B', rgb: [255, 190, 11] },
      cyan: { name: 'Cyan', hex: '#00F5FF', rgb: [0, 245, 255] },
      green: { name: 'Green', hex: '#8AC926', rgb: [138, 201, 38] },
      purple: { name: 'Purple', hex: '#B5179E', rgb: [181, 23, 158] },
      orange: { name: 'Orange', hex: '#FB5607', rgb: [251, 86, 7] },
      blue: { name: 'Blue', hex: '#3A86FF', rgb: [58, 134, 255] },
      magenta: { name: 'Magenta', hex: '#FF006E', rgb: [255, 0, 110] }
    }
  };

  const applyPresetPalette = (presetName) => {
    const presetPalette = PRESET_PALETTES[presetName];
    if (!presetPalette) return;

    // Update palette
    setPalette(presetPalette);
    saveCustomPalette(presetPalette);

    // Get the new palette keys
    const newKeys = Object.keys(presetPalette);

    // Update layers to use new palette keys
    setLayers(prevLayers => prevLayers.map((layer, index) => {
      // Remap to index-based key
      return {
        ...layer,
        colorKey: newKeys[index % newKeys.length]
      };
    }));

    // Update the ref to prevent useLayoutEffect from triggering another remap
    prevPaletteKeysRef.current = newKeys;

    setTimeout(() => pushHistory(), 0);
  };

  const randomizePalette = () => {
    // Generate a random 8-color palette by combining two harmony types
    const harmonyTypes = ['tetradic', 'analogous', 'triadic', 'splitComplementary'];
    const randomHarmony1 = harmonyTypes[Math.floor(Math.random() * harmonyTypes.length)];
    const randomHarmony2 = harmonyTypes[Math.floor(Math.random() * harmonyTypes.length)];
    let newPalette = generateNamedPalette(randomHarmony1);
    const secondPalette = generateNamedPalette(randomHarmony2);

    // Merge palettes to get more colors
    Object.entries(secondPalette).forEach(([key, value]) => {
      if (!newPalette[key]) {
        newPalette[key] = value;
      }
    });

    // Ensure we have exactly 8 colors
    const paletteEntries = Object.entries(newPalette);
    if (paletteEntries.length > 8) {
      newPalette = Object.fromEntries(paletteEntries.slice(0, 8));
    } else if (paletteEntries.length < 8) {
      // If less than 8, generate more colors
      const additionalPalette = generateNamedPalette('tetradic');
      const additionalEntries = Object.entries(additionalPalette);
      let i = 0;
      while (Object.keys(newPalette).length < 8 && i < additionalEntries.length) {
        const [key, value] = additionalEntries[i];
        if (!newPalette[key]) {
          newPalette[key] = value;
        }
        i++;
      }
    }

    // Identify locked layers and their active colors
    const lockedLayerColors = layers
      .filter(l => l.locked && l.colorKey && palette[l.colorKey])
      .map(l => ({ key: l.colorKey, hex: palette[l.colorKey].hex }));

    // Feature 02: Ensure locked layers keep their appearance (color value)
    // We need to make sure the NEW palette maps the old color key to the old hex value
    // This effectively locks the palette slot used by the locked layer
    lockedLayerColors.forEach(({ key, hex }) => {
      // If the key exists in the new generated palette, overwrite it with original color
      if (newPalette[key]) {
        newPalette[key] = { ...newPalette[key], hex };
      } else {
        // If the key is not in the new palette, we should probably add it back or remap?
        // The logic below for remapping layers handles layers whose keys disappear.
        // BUT for a locked layer, we want it to stay the same.
        // So simplistic approach: force the key into the palette.
        // Logic issue: If new palette has 8 keys, and we force old keys back...
        // Better: Just overwrite existing keys in new palette with locked colors?
        // Or just add them.
        newPalette[key] = { name: 'Locked', hex };
      }
    });

    // If we added keys, trim back to 8? Or iterate new keys and fill slots?
    // Current implementation generates random names.

    // Get the new palette keys
    const newKeys = Object.keys(newPalette);

    // Update layers to use new palette keys BEFORE updating palette
    // For NON-LOCKED layers: remap if their key is gone.
    // For LOCKED layers: They should point to their key which we ensured exists/is correct.
    setLayers(prevLayers => prevLayers.map((layer, index) => {
      if (layer.locked) {
        return layer; // Key is preserved in palette, so no change needed to layer
      }

      // If the layer's key exists in new palette (and not locked), it will just switch color (desired random behavior)
      // If key doesn't exist, remap to a valid key.
      if (newPalette[layer.colorKey]) {
        return layer;
      }

      // Remap to index-based key from new palette
      return {
        ...layer,
        colorKey: newKeys[index % newKeys.length]
      };
    }));

    // Update the ref to prevent useLayoutEffect from triggering another remap
    prevPaletteKeysRef.current = newKeys;

    // Fix Bug 05: Background randomization respecting neutrals
    // Only randomize background if it currently uses a palette key (not null)
    // Feature 03: check backgroundLocked
    if (backgroundColorKey && !backgroundLocked) {
      // Pick a random color from the new palette for the background
      const randomBgKey = newKeys[Math.floor(Math.random() * newKeys.length)];
      setBackgroundColorKey(randomBgKey);
      setBackgroundColorRaw(newPalette[randomBgKey].hex);
    }

    setPalette(newPalette);
    saveCustomPalette(newPalette);

    const lockedCount = layers.filter(l => l.locked).length;
    showToast(lockedCount > 0 ? `Palette randomized (${lockedCount} layers locked)` : 'Palette randomized');

    setTimeout(() => pushHistory(), 0);
  };

  const resetPalette = () => {
    const { white, black, ...colors } = DEFAULT_PALETTE;
    setPalette(colors);
    saveCustomPalette(colors);
    showToast('Palette reset to default');
  };

  // Reset image adjustments
  const resetImageAdjustments = () => {
    setImageScale(DEFAULT_STATE.imageScale);
    setPreBlur(DEFAULT_STATE.preBlur);
    setBrightness(DEFAULT_STATE.brightness);
    setContrast(DEFAULT_STATE.contrast);
    setInvert(DEFAULT_STATE.invert);
    showToast('Image adjustments reset');
  };

  // Randomizer
  const randomizeLayers = () => {
    const shuffledColors = [...colorKeys].sort(() => Math.random() - 0.5);
    const algorithms = ['halftoneCircle', 'halftoneLines', 'bayer4x4', 'bayer8x8', 'floydSteinberg', 'atkinson'];

    const getRandomLayer = (colorKey) => ({
      id: Date.now() + Math.random(), // Unique ID
      colorKey,
      ditherType: algorithms[Math.floor(Math.random() * algorithms.length)],
      threshold: 0.45 + Math.random() * 0.2,
      scale: Math.floor(6 + Math.random() * 6),
      angle: Math.floor(Math.random() * 45),
      offsetX: Math.floor(-20 + Math.random() * 40),
      offsetY: Math.floor(-20 + Math.random() * 40),
      blendMode: 'multiply',
      opacity: 0.9 + Math.random() * 0.1,
      visible: true,
      brightness: 0,
      contrast: 0,
      hardness: 0.95,
      knockout: false
    });

    setLayers(prevLayers => {
      // If we have existing layers, try to preserve locked ones
      // If we are replacing all layers (which randomizeLayers implies), we might want to keep the locked ones in place?
      // Or "Randomize Layers" usually means "Regenerate whole composition".
      // Feature 02 says: "lock a layer's appearance".
      // So we should keep locked layers as they are.

      const lockedLayers = prevLayers.filter(l => l.locked);

      // If all locked, do nothing? Or maybe just add new ones?
      // Usually randomize replaces everything. Let's assume we replace non-locked layers or generate a new set but keep locked ones.

      if (lockedLayers.length === prevLayers.length && prevLayers.length > 0) {
        showToast('All layers locked');
        return prevLayers;
      }

      // Strategy: Create 2 new random layers (default behavior) but append/prepend locked ones?
      // Or regenerate the non-locked slots?
      // Let's go with: Keep locked layers, and ensure we have at least 2 layers total.
      // If locked layers < 2, add random ones.

      const newLayers = [...lockedLayers];

      // Add random layers until we have 2 (or more if desired, but default was 2)
      let needed = 2 - newLayers.length;
      if (needed < 0) needed = 0; // If we have 2+ locked layers, maybe don't add more? Or maybe add 1?
      // Let's start fresh: 2 layers is the "randomize" target. 
      // If we have locked layers, we keep them. If we have less than 2, we add.

      while (newLayers.length < 2) {
        newLayers.push(getRandomLayer(shuffledColors[newLayers.length % shuffledColors.length]));
      }

      // If we already have 2+ locked layers, maybe we should just return them?
      // Or does user expect "Randomize" to add/change stuff?
      // If I have 3 locked layers, Randomize should probably do nothing to them.

      return newLayers.sort((a, b) => a.id - b.id); // Keep order roughly stable? Or just return list.
    });

    // Using previous simplified logic for total replace:
    /*
    setLayers([
      { ... },
      { ... }
    ]);
    */
  };

  const reorderLayers = (fromIndex, toIndex) => {
    setLayers(prevLayers => {
      const newLayers = [...prevLayers];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      return newLayers;
    });
    setTimeout(() => pushHistory(), 0);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const loadImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Update state
        setImage(img);
        setPreviewImage(null); // Clear preview to force regeneration

        // Bump image ID to invalidate all caches
        imageIdRef.current = Date.now();
        pendingUpdateRef.current = 0;

        // Explicitly clear all caches
        clearAllCaches();

        setSelection({ type: 'project', id: null }); // Deselect

        // Reset view
        const newScale = Math.min(
          (window.innerWidth - 300) / img.width,
          (window.innerHeight - 100) / img.height
        ) * 0.8;

        setImageTransform({
          x: 0,
          y: 0,
          scale: Math.max(0.1, Math.min(1, newScale))
        });

        showToast('Image uploaded successfully');
        // Set viewport size to match image dimensions
        setViewportSize({ w: img.width, h: img.height });
        // Phase 4: Increment image ID for preprocessing cache
        imageIdRef.current += 1;
        // Phase 3: Invalidate cache when image changes
        invalidateGlobalCache();
        showToast('Image loaded');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Zoom handlers (viewport architecture - image moves, canvas stays fixed)
  const handleWheel = (e) => {
    if (!image) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setImageTransform(prev => ({
      ...prev,
      scale: Math.max(0.25, Math.min(8, prev.scale * delta))
    }));
  };

  const handleMouseDown = (e) => {
    if (!image || e.button !== 0 || showComparison) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - imageTransform.x, y: e.clientY - imageTransform.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setImageTransform(prev => ({
      ...prev,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setImageTransform({ x: 0, y: 0, scale: 1 });
  };

  // Phase 3: Compute layer signature for cache key
  // Conservative: Include ALL parameters that could affect dithered output
  const computeLayerSignature = useCallback((layer, globalRevision) => {
    // Include EVERY layer parameter that affects dithering
    const sig = {
      v: CACHE_VERSION, // Cache version
      g: globalRevision, // Global revision (image, brightness, contrast, etc.)
      // Core params
      ditherType: layer.ditherType,
      threshold: layer.threshold,
      scale: layer.scale,
      angle: layer.angle,
      hardness: layer.hardness,
      gridType: layer.gridType,
      channel: layer.channel,
      // Clamp
      clampMin: layer.clampMin,
      clampMax: layer.clampMax,
      // Dot scaling (halftone)
      dotScaleMin: layer.dotScaleMin,
      dotScaleMax: layer.dotScaleMax,
      // Per-layer adjustments
      brightness: layer.brightness,
      contrast: layer.contrast,
      gamma: layer.gamma,
      invert: layer.invert,
      preBlur: layer.preBlur,
      noise: layer.noise,
      // Organic stipple
      jitter: layer.jitter
    };
    // JSON.stringify for simple, complete serialization (no hash collisions)
    return JSON.stringify(sig);
  }, []);

  // Core image processing function (viewport architecture)
  // Processes the preview image and renders to the target canvas
  const processImageCore = useCallback(async (sourceImage, targetCanvas) => {
    if (!sourceImage || !targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Crisp nearest-neighbor scaling

    // Reuse existing sourceCanvas instead of creating new one
    const sourceCanvas = sourceCanvasRef.current;
    if (!sourceCanvas) return;
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCtx.imageSmoothingEnabled = false; // Crisp nearest-neighbor scaling

    // Output dimensions match source image (previewImage is already limited to PREVIEW_MAX_WIDTH)
    const outputWidth = sourceImage.width;
    const outputHeight = sourceImage.height;

    // Reuse composition canvas instead of creating new one
    let compCanvas = compCanvasRef.current;
    if (!compCanvas) {
      compCanvas = document.createElement('canvas');
      compCanvasRef.current = compCanvas;
    }
    // Resize if needed
    if (compCanvas.width !== outputWidth || compCanvas.height !== outputHeight) {
      compCanvas.width = outputWidth;
      compCanvas.height = outputHeight;
    }
    const compCtx = compCanvas.getContext('2d');

    // Apply image scale setting for processing resolution
    const scaledWidth = Math.round(sourceImage.width * debouncedImageScale);
    const scaledHeight = Math.round(sourceImage.height * debouncedImageScale);

    // Resize sourceCanvas if needed
    if (sourceCanvas.width !== scaledWidth || sourceCanvas.height !== scaledHeight) {
      sourceCanvas.width = scaledWidth;
      sourceCanvas.height = scaledHeight;
    }

    // Phase 4: Check preprocessing cache before doing expensive preprocessing
    const preprocessSig = computePreprocessSignature(
      imageIdRef.current,
      debouncedImageScale,
      debouncedBrightness,
      debouncedContrast,
      invert,
      debouncedPreBlur
    );

    const cachedPreprocess = preprocessCacheRef.current.get(preprocessSig);
    let sourceData;

    if (cachedPreprocess) {
      // Cache HIT - reuse preprocessed data!
      sourceData = cachedPreprocess.imageData;
      if (process.env.NODE_ENV === 'development') {
        console.log('[PreprocessCache] HIT - Reusing cached sourceData');
      }
    } else {
      // Cache MISS - need to preprocess
      if (process.env.NODE_ENV === 'development') {
        console.log('[PreprocessCache] MISS - Computing sourceData');
      }

      sourceCtx.fillStyle = '#888888';
      sourceCtx.fillRect(0, 0, scaledWidth, scaledHeight);

      // Apply pre-blur if enabled
      if (debouncedPreBlur > 0) {
        sourceCtx.filter = `blur(${debouncedPreBlur}px)`;
      }
      sourceCtx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);
      sourceCtx.filter = 'none';

      sourceData = sourceCtx.getImageData(0, 0, scaledWidth, scaledHeight);

      if (debouncedBrightness !== 0 || debouncedContrast !== 0) {
        sourceData = applyBrightnessContrast(sourceData, debouncedBrightness, debouncedContrast);
      }

      if (invert) {
        sourceData = invertImageData(sourceData);
      }

      // Phase 4: Store in preprocessing cache
      preprocessCacheRef.current.set(preprocessSig, {
        imageData: sourceData,
        timestamp: Date.now()
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[PreprocessCache] Stored new sourceData');
      }
    }

    // Layer mode - fill background first on offscreen canvas
    compCtx.fillStyle = backgroundColor;
    compCtx.fillRect(0, 0, outputWidth, outputHeight);
    const baseImageData = compCtx.getImageData(0, 0, outputWidth, outputHeight);
    const baseData = baseImageData.data;

    const inv255 = 1 / 255;
    const minDarkness = 0.02;

    // Convert background color to RGB for knockout
    const bgRgb = hexToRgb(backgroundColor);
    const bgR = bgRgb.r;
    const bgG = bgRgb.g;
    const bgB = bgRgb.b;

    // Process visible layers only
    const visibleLayers = layers.filter(l => l.visible !== false);

    // For both preview and export, use direct 1:1 pixel mapping
    // Preview uses previewImage (already limited to PREVIEW_MAX_WIDTH) so it matches visually
    // Use worker for off-main-thread processing
    try {
      // Cancel any pending operations to prevent race conditions
      if (workerDither && workerDither.cancelAll) {
        workerDither.cancelAll();
      }

      // Prepare promises for parallel layer processing
      const layerPromises = visibleLayers.map(async (layer) => {
        const algoInfo = DITHER_ALGORITHMS[layer.ditherType];

        if (!algoInfo) return null;

        // Phase 3: Check cache before dithering
        const currentSignature = computeLayerSignature(layer, globalRevisionRef.current);
        const cached = layerCacheRef.current.get(layer.id);

        if (cached && cached.signature === currentSignature) {
          // Cache hit! Reuse existing dithered result
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Cache] HIT for layer ${layer.id} (${layer.ditherType})`);
          }
          return {
            layerId: layer.id,
            data: cached.imageData,
            ...layer
          };
        }

        // Cache miss - need to dither
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Cache] MISS for layer ${layer.id} (${layer.ditherType})`);
        }

        // Brightness/contrast are now handled in the preprocessing pipeline
        // So we just use the source data directly
        let layerSourceData = sourceData;

        // Offload heaviest part (dithering) to worker
        // Worker handles the heavy loop logic
        if (isWorkerAvailable() && workerDither) {
          const hardness = layer.hardness === undefined ? 1 : layer.hardness;
          return await workerDither(layer.ditherType, layerSourceData, {
            threshold: layer.threshold,
            scale: layer.scale,
            angle: layer.angle,
            hardness: hardness,
            gridType: layer.gridType || 'square',
            channel: layer.channel || 'gray',
            clampMin: layer.clampMin === undefined ? 0 : layer.clampMin,
            clampMax: layer.clampMax === undefined ? 1 : layer.clampMax,
            preBlur: layer.preBlur || 0,
            dotScaleMin: layer.dotScaleMin === undefined ? 0.1 : layer.dotScaleMin,
            dotScaleMax: layer.dotScaleMax === undefined ? 1 : layer.dotScaleMax,
            brightness: layer.brightness || 0,
            contrast: layer.contrast || 0,
            gamma: layer.gamma === undefined ? 1 : layer.gamma,
            invert: layer.invert || false,
            noise: layer.noise || 0,
            // Organic stipple
            jitter: layer.jitter ?? 0.5
          }).then(result => {
            // Phase 3: Update cache with new result
            layerCacheRef.current.set(layer.id, {
              signature: currentSignature,
              imageData: result,
              timestamp: Date.now()
            });
            return {
              layerId: layer.id,
              data: result,
              // Pass through layer properties needed for composition
              ...layer
            };
          });
        } else {
          // Fallback to main thread if worker unavailable
          const algo = ditherAlgorithms[layer.ditherType];
          let ditheredData;

          const hardness = layer.hardness === undefined ? 1 : layer.hardness;
          const params = {
            gridType: layer.gridType || 'square',
            channel: layer.channel || 'gray',
            clampMin: layer.clampMin === undefined ? 0 : layer.clampMin,
            clampMax: layer.clampMax === undefined ? 1 : layer.clampMax,
            preBlur: layer.preBlur || 0,
            dotScaleMin: layer.dotScaleMin === undefined ? 0.1 : layer.dotScaleMin,
            dotScaleMax: layer.dotScaleMax === undefined ? 1 : layer.dotScaleMax,
            brightness: layer.brightness || 0,
            contrast: layer.contrast || 0,
            gamma: layer.gamma === undefined ? 1 : layer.gamma,
            invert: layer.invert || false,
            noise: layer.noise || 0,
            // Organic stipple
            jitter: layer.jitter ?? 0.5
          };

          if (algoInfo.category === 'halftone') {
            ditheredData = algo(layerSourceData, layer.threshold, layer.scale, layer.angle, hardness, params);
          } else if (algoInfo.category === 'ordered' || algoInfo.category === 'diffusion') {
            // Ordered and diffusion algorithms now accept options parameter
            ditheredData = algo(layerSourceData, layer.threshold, layer.scale, layer.angle, hardness, params);
          } else if (layer.ditherType === 'organicStipple') {
            // organicStipple needs params for jitter
            ditheredData = algo(layerSourceData, layer.threshold, layer.scale, layer.angle, hardness, params);
          } else if (algoInfo.hasScale && algoInfo.hasAngle) {
            ditheredData = algo(layerSourceData, layer.threshold, layer.scale, layer.angle);
          } else if (algoInfo.hasScale) {
            ditheredData = algo(layerSourceData, layer.threshold, layer.scale);
          } else {
            ditheredData = algo(layerSourceData, layer.threshold);
          }

          // Phase 3: Update cache with new result
          layerCacheRef.current.set(layer.id, {
            signature: currentSignature,
            imageData: ditheredData,
            timestamp: Date.now()
          });

          return {
            layerId: layer.id,
            data: ditheredData,
            ...layer
          };
        }
      });

      // Wait for all layers to be processed
      // We filter out nulls if any
      const results = (await Promise.all(layerPromises)).filter(Boolean);

      // Composition Loop
      for (const result of results) {
        let ditheredData = result.data;
        const layer = result; // Contains layer props merged in earlier

        // Apply ink bleed to layer if enabled
        if (inkBleed && debouncedInkBleedAmount > 0) {
          ditheredData = applyInkBleed(ditheredData, debouncedInkBleedAmount, debouncedInkBleedRoughness, 1);
        }

        // Get palette color with fallback to prevent flicker during palette transitions
        let paletteColor = activePalette[layer.colorKey];
        if (!paletteColor && colorKeys.length > 0) {
          // Fallback to color at same index position to minimize visual disruption
          paletteColor = activePalette[colorKeys[li % colorKeys.length]];
        }
        // Final fallback if still no color found
        if (!paletteColor) {
          paletteColor = { rgb: [128, 128, 128] };
        }
        const r = paletteColor.rgb[0];
        const g = paletteColor.rgb[1];
        const b = paletteColor.rgb[2];
        const blendFn = blendModes[layer.blendMode] || blendModes.multiply;
        const layerOpacity = layer.opacity;
        const layerOffsetX = layer.offsetX;
        const layerOffsetY = layer.offsetY;
        const ditheredDataArray = ditheredData.data;

        // Check if we can use direct 1:1 mapping (no scaling needed)
        const isDirectMapping = scaledWidth === outputWidth && scaledHeight === outputHeight;

        if (isDirectMapping) {
          // Fast path: direct 1:1 pixel copy with offset
          for (let y = 0; y < outputHeight; y++) {
            const sy = y - layerOffsetY;
            if (sy < 0 || sy >= outputHeight) continue;

            const syw = sy * outputWidth;
            const yw = y * outputWidth;

            for (let x = 0; x < outputWidth; x++) {
              const sx = x - layerOffsetX;
              if (sx < 0 || sx >= outputWidth) continue;

              const si = (syw + sx) << 2;
              const di = (yw + x) << 2;

              const darkness = 1 - (ditheredDataArray[si] * inv255);
              if (darkness > minDarkness) {
                // Knockout: reset to background where this layer has ink (skip applying layer color)
                if (layer.knockout) {
                  baseData[di] = bgR;
                  baseData[di + 1] = bgG;
                  baseData[di + 2] = bgB;
                } else {
                  // Apply blend only when not knockout
                  const alpha = layerOpacity * darkness;
                  baseData[di] = blendFn(baseData[di], r, alpha);
                  baseData[di + 1] = blendFn(baseData[di + 1], g, alpha);
                  baseData[di + 2] = blendFn(baseData[di + 2], b, alpha);
                }
              }
            }
          }
        } else {
          // Scaled path: map from output coordinates to dithered data coordinates
          const scaleX = scaledWidth / outputWidth;
          const scaleY = scaledHeight / outputHeight;

          for (let y = 0; y < outputHeight; y++) {
            const sy = Math.round((y - layerOffsetY) * scaleY);
            if (sy < 0 || sy >= scaledHeight) continue;

            const syw = sy * scaledWidth;
            const yw = y * outputWidth;

            for (let x = 0; x < outputWidth; x++) {
              const sx = Math.round((x - layerOffsetX) * scaleX);
              if (sx < 0 || sx >= scaledWidth) continue;

              const si = (syw + sx) << 2;
              const di = (yw + x) << 2;

              const darkness = 1 - (ditheredDataArray[si] * inv255);
              if (darkness > minDarkness) {
                // Knockout: reset to background where this layer has ink (skip applying layer color)
                if (layer.knockout) {
                  baseData[di] = bgR;
                  baseData[di + 1] = bgG;
                  baseData[di + 2] = bgB;
                } else {
                  // Apply blend only when not knockout
                  const alpha = layerOpacity * darkness;
                  baseData[di] = blendFn(baseData[di], r, alpha);
                  baseData[di + 1] = blendFn(baseData[di + 1], g, alpha);
                  baseData[di + 2] = blendFn(baseData[di + 2], b, alpha);
                }
              }
            }
          }
        }
      }



      // Final Blit: Only now do we touch the visible canvas
      // This ensures no flickering or white flashes
      targetCanvas.width = outputWidth;
      targetCanvas.height = outputHeight;
      const finalCtx = targetCanvas.getContext('2d');
      // Set smoothing again because resizing canvas might reset context state
      finalCtx.imageSmoothingEnabled = false;
      finalCtx.putImageData(baseImageData, 0, 0);

    } catch (error) {
      if (error && error.message !== 'Operation cancelled') {
        console.error('Rendering error:', error);
      }
      // If cancelled, we simply exit without updating the canvas, preserving the previous frame
    }
  }, [debouncedImageScale, debouncedBrightness, debouncedContrast, invert, debouncedPreBlur, layers, backgroundColor, inkBleed, debouncedInkBleedAmount, debouncedInkBleedRoughness, activePalette, colorKeys]);

  // Track pending updates to skip stale processing

  // Process preview image (debounced and optimized with skip-stale logic)
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !originalCanvasRef.current) return;

    // Increment pending update counter
    const updateId = ++pendingUpdateRef.current;

    // If already processing, the new update will be picked up when current finishes
    if (processingRef.current) return;

    processingRef.current = true;

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      // Skip if a newer update was requested
      if (updateId !== pendingUpdateRef.current) {
        processingRef.current = false;
        return;
      }

      // Draw original for comparison
      const originalCanvas = originalCanvasRef.current;
      if (!originalCanvas) {
        processingRef.current = false;
        return;
      }
      const originalCtx = originalCanvas.getContext('2d');
      originalCtx.imageSmoothingEnabled = false; // Crisp nearest-neighbor scaling
      originalCanvas.width = previewImage.width;
      originalCanvas.height = previewImage.height;
      originalCtx.drawImage(previewImage, 0, 0);

      // Process the preview image
      if (canvasRef.current) {
        processImageCore(previewImage, canvasRef.current);
      }

      processingRef.current = false;

      // Check if there's a pending newer update
      if (updateId !== pendingUpdateRef.current) {
        // Trigger re-render to process the latest state
        requestAnimationFrame(() => {
          if (!processingRef.current && canvasRef.current) {
            processingRef.current = true;
            processImageCore(previewImage, canvasRef.current);
            processingRef.current = false;
          }
        });
      }
    });
  }, [previewImage, processImageCore]);

  const exportPNG = () => {
    if (!image || !canvasRef.current) return;

    const scale = EXPORT_RESOLUTIONS[exportResolution].scale;

    // Get the preview canvas - this is exactly what the user sees
    const previewCanvas = canvasRef.current;

    // Create export canvas and scale up the preview with nearest-neighbor (crisp pixels)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = previewCanvas.width * scale;
    exportCanvas.height = previewCanvas.height * scale;
    const ctx = exportCanvas.getContext('2d');

    // Disable image smoothing for crisp pixel scaling (nearest-neighbor)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(previewCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

    const dataUrl = exportCanvas.toDataURL('image/png');

    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stack-${exportResolution}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported at ${exportResolution}`);
  };

  // Get source image data for SVG export
  // If processingResolution is provided, downsample the image to that resolution first
  // Maintains aspect ratio by fitting within the processing resolution bounds
  // Applies the same brightness/contrast/invert adjustments as the preview
  const getSourceImageData = useCallback((processingResolution = null) => {
    if (!image) return null;

    // If no processing resolution specified, use full resolution
    if (!processingResolution) {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.width;
      sourceCanvas.height = image.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      sourceCtx.imageSmoothingEnabled = false; // Crisp nearest-neighbor scaling
      sourceCtx.drawImage(image, 0, 0);
      let imageData = sourceCtx.getImageData(0, 0, image.width, image.height);

      // Apply adjustments to match preview processing
      if (debouncedBrightness !== 0 || debouncedContrast !== 0) {
        imageData = applyBrightnessContrast(imageData, debouncedBrightness, debouncedContrast);
      }
      if (invert) {
        imageData = invertImageData(imageData);
      }

      return imageData;
    }

    // Calculate processing dimensions that maintain aspect ratio
    // Fit within processingResolution bounds while preserving image aspect ratio
    const { w: maxWidth, h: maxHeight } = processingResolution;
    const imageAspect = image.width / image.height;
    const targetAspect = maxWidth / maxHeight;

    let targetWidth, targetHeight;
    if (imageAspect > targetAspect) {
      // Image is wider - fit to width
      targetWidth = maxWidth;
      targetHeight = Math.round(maxWidth / imageAspect);
    } else {
      // Image is taller - fit to height
      targetHeight = maxHeight;
      targetWidth = Math.round(maxHeight * imageAspect);
    }

    // Downsample to processing resolution
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Disable image smoothing for crisp downsampling (pixelated look)
    tempCtx.imageSmoothingEnabled = false;

    // Apply pre-blur if enabled (matching preview processing)
    if (preBlur > 0) {
      tempCtx.filter = `blur(${preBlur}px)`;
    }
    tempCtx.drawImage(image, 0, 0, targetWidth, targetHeight);
    tempCtx.filter = 'none';

    let imageData = tempCtx.getImageData(0, 0, targetWidth, targetHeight);

    // Apply adjustments to match preview processing
    if (debouncedBrightness !== 0 || debouncedContrast !== 0) {
      imageData = applyBrightnessContrast(imageData, debouncedBrightness, debouncedContrast);
    }
    if (invert) {
      imageData = invertImageData(imageData);
    }

    return imageData;
  }, [image, debouncedBrightness, debouncedContrast, invert, preBlur]);

  // Export combined SVG (all layers in one file)
  const exportSVGCombined = useCallback(() => {
    if (!image || !previewImage) {
      showToast('No image loaded');
      return;
    }

    try {
      // Use the same scaled processing resolution as the preview
      // Preview processes at previewImage.width * imageScale (matching processImageCore)
      const scaledWidth = Math.round(previewImage.width * debouncedImageScale);
      const scaledHeight = Math.round(previewImage.height * debouncedImageScale);
      const processingResolution = { w: scaledWidth, h: scaledHeight };

      const sourceImageData = getSourceImageData(processingResolution);
      if (!sourceImageData) return;

      // Dimensions match the actual downsampled image dimensions (maintains aspect ratio)
      const dimensions = {
        width: sourceImageData.width,
        height: sourceImageData.height
      };

      // scaleFactor is 1 since we're processing at target resolution
      const svg = generateCombinedSVG(
        layers,
        sourceImageData,
        dimensions,
        backgroundColor,
        { scaleFactor: 1 },
        activePalette
      );

      downloadSVG(svg, 'stack-combined.svg');

      const estimatedSize = estimateSVGSize(layers, dimensions, 1);
      const sizeKB = Math.round(estimatedSize / 1024);
      showToast(`Exported combined SVG (~${sizeKB}KB)`);
    } catch (error) {
      console.error('SVG export error:', error);
      showToast('SVG export failed: ' + error.message);
    }
  }, [image, previewImage, debouncedImageScale, layers, backgroundColor, getSourceImageData, activePalette]);

  // Export separate SVG layers as ZIP
  const exportSVGLayers = useCallback(async () => {
    if (!image || !previewImage) {
      showToast('No image loaded');
      return;
    }

    try {
      showToast('Generating layer files...');

      // Use the same scaled processing resolution as the preview
      // Preview processes at previewImage.width * imageScale (matching processImageCore)
      const scaledWidth = Math.round(previewImage.width * debouncedImageScale);
      const scaledHeight = Math.round(previewImage.height * debouncedImageScale);
      const processingResolution = { w: scaledWidth, h: scaledHeight };

      const sourceImageData = getSourceImageData(processingResolution);
      if (!sourceImageData) return;

      // Dimensions match the actual downsampled image dimensions (maintains aspect ratio)
      const dimensions = {
        width: sourceImageData.width,
        height: sourceImageData.height
      };

      // scaleFactor is 1 since we're processing at target resolution
      await exportLayersAsZip(
        layers,
        sourceImageData,
        dimensions,
        backgroundColor,
        { scaleFactor: 1 },
        activePalette
      );

      const visibleLayers = layers.filter(l => l.visible !== false);
      showToast(`Exported ${visibleLayers.length} layer${visibleLayers.length !== 1 ? 's' : ''} as ZIP`);
    } catch (error) {
      console.error('SVG layers export error:', error);
      showToast('SVG export failed: ' + error.message);
    }
  }, [image, previewImage, debouncedImageScale, layers, backgroundColor, getSourceImageData, activePalette]);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Undo (Cmd/Ctrl + Z)
      if (matchesShortcut(e, COMMANDS.UNDO.shortcuts[0])) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo (Cmd/Ctrl + Shift + Z)
      if (matchesShortcut(e, COMMANDS.REDO.shortcuts[0])) {
        e.preventDefault();
        redo();
        return;
      }

      // Help dialog
      if (matchesShortcut(e, COMMANDS.SHOW_SHORTCUTS.shortcuts[0]) ||
        matchesShortcut(e, COMMANDS.SHOW_SHORTCUTS.shortcuts[1])) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      // Close dialogs with ESC is handled in the dialog components themselves

      // Canvas zoom and pan (only when image exists and not in comparison mode)
      if (image) {
        // Zoom In (Cmd/Ctrl + =  or Cmd/Ctrl + +)
        if (matchesShortcut(e, COMMANDS.ZOOM_IN.shortcuts[0]) ||
          matchesShortcut(e, COMMANDS.ZOOM_IN.shortcuts[1])) {
          e.preventDefault();
          setImageTransform(prev => ({
            ...prev,
            scale: Math.min(8, prev.scale * 1.5)
          }));
          return;
        }

        // Zoom Out (Cmd/Ctrl + -)
        if (matchesShortcut(e, COMMANDS.ZOOM_OUT.shortcuts[0])) {
          e.preventDefault();
          setImageTransform(prev => ({
            ...prev,
            scale: Math.max(0.25, prev.scale / 1.5)
          }));
          return;
        }

        // Reset Zoom (0)
        if (matchesShortcut(e, COMMANDS.ZOOM_RESET.shortcuts[0]) && !showComparison) {
          e.preventDefault();
          resetView();
          return;
        }

        // Pan controls (only when not in comparison mode)
        if (!showComparison) {
          const panAmount = 20;

          if (matchesShortcut(e, COMMANDS.PAN_LEFT.shortcuts[0])) {
            e.preventDefault();
            setImageTransform(prev => ({ ...prev, x: prev.x - panAmount }));
            return;
          }

          if (matchesShortcut(e, COMMANDS.PAN_RIGHT.shortcuts[0])) {
            e.preventDefault();
            setImageTransform(prev => ({ ...prev, x: prev.x + panAmount }));
            return;
          }

          if (matchesShortcut(e, COMMANDS.PAN_UP.shortcuts[0])) {
            e.preventDefault();
            setImageTransform(prev => ({ ...prev, y: prev.y - panAmount }));
            return;
          }

          if (matchesShortcut(e, COMMANDS.PAN_DOWN.shortcuts[0])) {
            e.preventDefault();
            setImageTransform(prev => ({ ...prev, y: prev.y + panAmount }));
            return;
          }
        }
      }

      // Note: Comparison slider arrow keys are handled in ComparisonSlider component
      // Note: Layer reordering Alt+arrows are handled in LayerItem component
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, showComparison, undo, redo]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: COLORS.bg.primary, color: COLORS.text.primary, fontFamily: FONTS.ui }}>
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
      <input ref={presetImportRef} type="file" accept=".json" onChange={importPresetsFromJSON} style={{ display: 'none' }} />

      {/* Left Sidebar - Composition */}
      <div style={{ width: '280px', backgroundColor: COLORS.bg.secondary, borderRight: `1px solid ${COLORS.border.default}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: `2px solid ${COLORS.ink.coral}`,
          background: `linear-gradient(180deg, ${COLORS.bg.primary} 0%, ${COLORS.bg.secondary} 100%)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <h1 style={{
                fontSize: '14px',
                letterSpacing: '0.05em',
                fontWeight: 600,
                margin: 0,
                color: COLORS.text.primary,
                fontFamily: FONTS.ui
              }}>
                Domo Dither Lab
              </h1>
            </div>
          </div>

          <IconButton onClick={() => setSelection({ type: 'project', id: null })} title="Project settings">⚙</IconButton>
        </div>

        <CompositionPanel
          image={image}
          onChangeImage={() => fileInputRef.current?.click()}
          onReset={resetAll}
          fileInputRef={fileInputRef}
          selection={selection}
          onSelectSource={() => setSelection({ type: 'source', id: null })}
          onSelectBackground={() => setSelection({ type: 'background', id: null })}
          onSelectLayer={(id) => setSelection({ type: 'layer', id })}
          onSelectProject={() => setSelection({ type: 'project', id: null })}
          backgroundColor={backgroundColor}
          backgroundColorKey={backgroundColorKey}
          layers={layers}
          onAddLayer={addLayer}
          onToggleLayerVisibility={toggleLayerVisibility}
          onDuplicateLayer={duplicateLayer}
          onRemoveLayer={removeLayer}
          onMoveLayerUp={moveLayerUp}
          onMoveLayerDown={moveLayerDown}
          palette={palette}
          colorKeys={colorKeys}
          onUpdatePaletteColor={updatePaletteColor}
          onRandomizePalette={randomizePalette}
          onApplyPreset={applyPresetPalette}
          presetNames={Object.keys(PRESET_PALETTES)}
          activePalette={activePalette}
          onToggleLayerLock={toggleLayerLock}
          backgroundLocked={backgroundLocked}
          onToggleBackgroundLock={toggleBackgroundLock}
          onReorderLayers={reorderLayers}
        />
      </div>

      {/* Canvas Area */}
      <DropZone
        onDrop={loadImageFile}
        style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
        onClick={(e) => {
          // Click on canvas background (outside image) shows project properties
          // We need to check if the click target is NOT the image or inside it
          // BUT - the image wrapper is inside the container which is inside the DropZone.
          // The DropZone covers everything.
          // If we click the padding area (which is part of the inner div), e.target might be the inner div.
          // If we click the DropZone itself (outside inner div due to flex), e.target is DropZone.

          const isInsideImage = imageWrapperRef.current && imageWrapperRef.current.contains(e.target);
          const isButton = e.target.closest('button') !== null;

          if (!isInsideImage && !isButton) {
            setSelection({ type: 'project', id: null });
          }
        }}
      >
        <div
          ref={canvasContainerRef}
          tabIndex={image ? 0 : -1}
          aria-label={image ? "Canvas viewport. Use Cmd+Plus and Cmd+Minus to zoom, arrow keys to pan, 0 to reset view." : undefined}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            backgroundColor: COLORS.bg.primary,
            overflow: 'hidden',
            position: 'relative',
            cursor: isPanning ? 'grabbing' : (image && !showComparison ? 'grab' : 'default'),
            outline: 'none'
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        // Click handler moved to DropZone to cover full area
        >
          {/* Paper texture overlay - warm tint + noise */}
          {paperTexture && image && (
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              mixBlendMode: 'multiply',
              opacity: 0.3,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E"), linear-gradient(to bottom right, #fffdf5, #f0f0e0)`,
              backgroundRepeat: 'repeat',
              zIndex: 20
            }} />
          )}

          {/* Top bar */}
          {image && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              backgroundColor: 'rgba(13, 13, 13, 0.75)',
              padding: '14px 18px',
              borderRadius: '8px',
              border: `1px solid ${COLORS.border.subtle}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              {/* Dimensions */}
              <div style={{
                fontSize: '10px',
                color: COLORS.text.secondary,
                fontFamily: FONTS.data,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '4px',
                  height: '16px',
                  backgroundColor: COLORS.ink.coral,
                  borderRadius: '2px'
                }} />
                <span>
                  {image.width} × {image.height}
                  {image.width > PREVIEW_MAX_WIDTH && (
                    <span style={{ color: COLORS.text.tertiary, marginLeft: '8px' }}>
                      (preview @ {Math.round(PREVIEW_MAX_WIDTH / image.width * 100)}%)
                    </span>
                  )}
                </span>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '4px', pointerEvents: 'auto' }}>
                <Button small onClick={() => setImageTransform(prev => ({ ...prev, scale: Math.max(0.25, prev.scale / 1.5) }))}>−</Button>
                <Button small onClick={resetView} style={{ minWidth: '60px' }}>{Math.round(imageTransform.scale * 100)}%</Button>
                <Button small onClick={() => setImageTransform(prev => ({ ...prev, scale: Math.min(8, prev.scale * 1.5) }))}>+</Button>
                <div style={{ width: '8px' }} />
                <Button small onClick={() => setShowComparison(!showComparison)} active={showComparison}>
                  {showComparison ? '✓ COMPARE' : 'COMPARE'}
                </Button>
              </div>
            </div>
          )}

          {/* Help text */}
          {image && !showComparison && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              color: COLORS.text.tertiary,
              fontFamily: FONTS.data,
              pointerEvents: 'none',
              letterSpacing: '0.05em'
            }}>
              Scroll to zoom • Drag to pan
            </div>
          )}

          {!image ? (
            <div style={{ textAlign: 'center', color: COLORS.text.tertiary }}>
              <div style={{ fontSize: '56px', marginBottom: '20px', opacity: 0.4 }}>◐</div>
              <p style={{ fontSize: '11px', letterSpacing: '0.1em', fontFamily: FONTS.ui, fontWeight: 500 }}>UPLOAD OR DROP IMAGE</p>
              <p style={{ fontSize: '9px', marginTop: '8px', color: COLORS.text.tertiary, fontFamily: FONTS.data }}>
                JPG, PNG, WebP supported
              </p>
            </div>
          ) : (
            <div
              ref={imageWrapperRef}
              style={{
                width: previewImage ? `${previewImage.width}px` : `${viewportSize.w}px`,
                height: previewImage ? `${previewImage.height}px` : `${viewportSize.h}px`,
                position: 'relative',
                backgroundColor: COLORS.bg.primary
              }}
            >
              <div style={{
                transform: `translate(${imageTransform.x}px, ${imageTransform.y}px) scale(${imageTransform.scale})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                position: 'absolute',
                width: '100%',
                height: '100%'
              }}>
                {/* Original canvas (for comparison) */}
                <canvas
                  ref={originalCanvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    imageRendering: imageTransform.scale > 1 ? 'pixelated' : 'auto',
                    clipPath: showComparison ? `inset(0 ${(1 - comparisonPosition) * 100}% 0 0)` : 'none',
                    display: showComparison ? 'block' : 'none'
                  }}
                />

                {/* Processed canvas */}
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    imageRendering: imageTransform.scale > 1 ? 'pixelated' : 'auto',
                    clipPath: showComparison ? `inset(0 0 0 ${comparisonPosition * 100}%)` : 'none'
                  }}
                />

                {/* Comparison slider */}
                {showComparison && (
                  <ComparisonSlider
                    position={comparisonPosition}
                    onChange={setComparisonPosition}
                  />
                )}
              </div>
            </div>
          )}
          <canvas ref={sourceCanvasRef} style={{ display: 'none' }} />
        </div>
      </DropZone>

      {/* Right Panel - Context-sensitive properties */}
      <RightPanel
        selection={selection}
        // Project properties
        customPresets={customPresets}
        onApplyPreset={applyPreset}
        onSavePreset={() => setShowSaveModal(true)}
        onDeletePreset={deleteCustomPreset}
        onExportPresets={exportPresetsAsJSON}
        onImportPresets={importPresetsFromJSON}
        presetImportRef={presetImportRef}
        inkBleed={inkBleed}
        onInkBleedChange={setInkBleed}
        inkBleedAmount={inkBleedAmount}
        onInkBleedAmountChange={setInkBleedAmount}
        inkBleedRoughness={inkBleedRoughness}
        onInkBleedRoughnessChange={setInkBleedRoughness}
        paperTexture={paperTexture}
        onPaperTextureChange={setPaperTexture}
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        backgroundColorKey={backgroundColorKey}
        exportResolution={exportResolution}
        onExportResolutionChange={setExportResolution}
        onExportPNG={exportPNG}
        onExportSVGCombined={exportSVGCombined}
        onExportSVGLayers={exportSVGLayers}
        onOpenExport={() => setShowExportModal(true)}
        palette={palette}
        colorKeys={colorKeys}
        hasImage={!!image}
        // Image properties
        imageScale={imageScale}
        onImageScaleChange={setImageScale}
        preBlur={preBlur}
        onPreBlurChange={setPreBlur}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        contrast={contrast}
        onContrastChange={setContrast}
        invert={invert}
        onInvertChange={setInvert}
        onResetImageAdjustments={resetImageAdjustments}
        onClearCache={clearLayerCache}
        onClearAllCaches={clearAllCaches}
        cacheStats={cacheStats}
        // Layer properties
        selectedLayer={selectedLayer}
        selectedLayerIndex={selectedLayerIndex}
        totalLayers={layers.length}
        onUpdateLayer={(newLayer) => selectedLayerIndex >= 0 && updateLayer(selectedLayerIndex, newLayer)}
        onRemoveLayer={() => selectedLayerIndex >= 0 && removeLayer(selectedLayerIndex)}
        onDuplicateLayer={() => selectedLayerIndex >= 0 && duplicateLayer(selectedLayerIndex)}
        activePalette={activePalette}
        onUpdatePaletteColor={updatePaletteColor}
      />

      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />

      {showSaveModal && (
        <SavePresetModal
          onSave={saveCustomPreset}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {showExportModal && (
        <ExportDialog
          open={showExportModal}
          onOpenChange={setShowExportModal}
          exportResolution={exportResolution}
          onExportResolutionChange={setExportResolution}
          onExportPNG={exportPNG}
          onExportSVGCombined={exportSVGCombined}
          onExportSVGLayers={exportSVGLayers}
          hasImage={!!image}
        />
      )}

      {showKeyboardShortcuts && (
        <KeyboardShortcutsDialog
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      )}
    </div>
  );
}
