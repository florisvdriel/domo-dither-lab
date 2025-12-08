'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Constants
import { DEFAULT_PALETTE } from '../constants/palette';
import { DITHER_ALGORITHMS } from '../constants/ditherAlgorithms';
import { PRESETS } from '../constants/presets';
import { BLEND_MODES, EXPORT_RESOLUTIONS, PREVIEW_MAX_WIDTH, DEFAULT_STATE } from '../constants';

// Utilities
import { useDebounce, getGray } from '../utils/helpers';
import { ditherAlgorithms, blendModes } from '../utils/dithering';
import { applyBrightnessContrast, invertImageData, applyInkBleed } from '../utils/imageProcessing';
import { loadCustomPresets, saveCustomPresets } from '../utils/storage';
import { generateCombinedSVG, exportLayersAsZip, downloadSVG, estimateSVGSize } from '../utils/svgExport';
// Web worker hook available for future optimization
// import { useDitherWorker } from '../hooks/useDitherWorker';
import { loadCustomPalette, saveCustomPalette, hexToRgb } from '../utils/paletteStorage';
import { generateNamedPalette } from '../utils/paletteGenerator';

// Hooks
import { useHistory } from '../hooks/useHistory';
import { useKeyboardShortcuts, createShortcuts } from '../hooks/useKeyboardShortcuts';

// UI Components
import Toast from './ui/Toast';
import Tooltip from './ui/Tooltip';
import Slider from './ui/Slider';
import Button from './ui/Button';
import { SwatchWithPicker, ColorSwatch } from './ui/ColorPicker';
import Section from './ui/Section';
import IconButton from './ui/IconButton';
import AlgorithmSelect from './ui/AlgorithmSelect';
import LayerPanel from './ui/LayerPanel';
import DropZone from './ui/DropZone';
import ComparisonSlider from './ui/ComparisonSlider';
import SavePresetModal from './ui/SavePresetModal';

// Session storage key
const SESSION_STORAGE_KEY = 'halftone-lab-session';


export default function HalftoneLab() {
  const [image, setImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null); // Downscaled for performance
  const [imageScale, setImageScale] = useState(DEFAULT_STATE.imageScale);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_STATE.backgroundColor);
  const [exportResolution, setExportResolution] = useState(DEFAULT_STATE.exportResolution);
  
  const [brightness, setBrightness] = useState(DEFAULT_STATE.brightness);
  const [contrast, setContrast] = useState(DEFAULT_STATE.contrast);
  const [invert, setInvert] = useState(DEFAULT_STATE.invert);
  const [inkBleed, setInkBleed] = useState(DEFAULT_STATE.inkBleed);
  const [inkBleedAmount, setInkBleedAmount] = useState(DEFAULT_STATE.inkBleedAmount);
  const [inkBleedRoughness, setInkBleedRoughness] = useState(DEFAULT_STATE.inkBleedRoughness);
  const [paperTexture, setPaperTexture] = useState(DEFAULT_STATE.paperTexture);
  
  const [layers, setLayers] = useState(DEFAULT_STATE.layers);
  
  // Viewport architecture
  const [viewportSize, setViewportSize] = useState(DEFAULT_STATE.viewportSize);
  const [imageTransform, setImageTransform] = useState(DEFAULT_STATE.imageTransform);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Pre-blur
  const [preBlur, setPreBlur] = useState(DEFAULT_STATE.preBlur);
  
  // Comparison slider
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.5);
  
  // Custom presets
  const [customPresets, setCustomPresets] = useState(loadCustomPresets);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // Palette - load custom if exists, otherwise use default (without black/white for editing)
  const [palette, setPalette] = useState(() => {
    const saved = loadCustomPalette();
    if (Object.keys(saved).length > 0) {
      return saved;
    }
    // Extract just the 4 color keys from DEFAULT_PALETTE (excluding white/black)
    const { white, black, ...colors } = DEFAULT_PALETTE;
    return colors;
  });
  
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  
  // Processing indicator state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Expanded layer panel tracking (for keyboard shortcuts)
  const [expandedLayerIndex, setExpandedLayerIndex] = useState(0);
  
  // History for undo/redo - tracks the undoable state
  const getUndoableState = useCallback(() => ({
    imageScale,
    backgroundColor,
    brightness,
    contrast,
    invert,
    inkBleed,
    inkBleedAmount,
    inkBleedRoughness,
    preBlur,
    layers: JSON.parse(JSON.stringify(layers)), // Deep clone
    palette: JSON.parse(JSON.stringify(palette)),
  }), [imageScale, backgroundColor, brightness, contrast, invert, inkBleed, inkBleedAmount, inkBleedRoughness, preBlur, layers, palette]);
  
  const initialHistoryState = useMemo(() => ({
    imageScale: DEFAULT_STATE.imageScale,
    backgroundColor: DEFAULT_STATE.backgroundColor,
    brightness: DEFAULT_STATE.brightness,
    contrast: DEFAULT_STATE.contrast,
    invert: DEFAULT_STATE.invert,
    inkBleed: DEFAULT_STATE.inkBleed,
    inkBleedAmount: DEFAULT_STATE.inkBleedAmount,
    inkBleedRoughness: DEFAULT_STATE.inkBleedRoughness,
    preBlur: DEFAULT_STATE.preBlur,
    layers: DEFAULT_STATE.layers,
    palette: (() => {
      const { white, black, ...colors } = DEFAULT_PALETTE;
      return colors;
    })(),
  }), []);
  
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    commitToHistory,
    resetHistory
  } = useHistory(initialHistoryState);
  
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const presetImportRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const processingRef = useRef(false);
  
  // Web worker available for future optimization (not currently used)
  // const { dither: workerDither, isAvailable: isWorkerAvailable } = useDitherWorker();

  // Active palette includes editable colors + black/white for backgrounds
  const activePalette = useMemo(() => {
    return {
      ...palette,
      white: DEFAULT_PALETTE.white,
      black: DEFAULT_PALETTE.black
    };
  }, [palette]);

  const colorKeys = Object.keys(activePalette).filter(k => !['white', 'black'].includes(k));
  
  // Debounce all processing-related state changes
  // Longer debounce for expensive operations
  const debouncedImageScale = useDebounce(imageScale, 200);
  const debouncedBrightness = useDebounce(brightness, 100);
  const debouncedContrast = useDebounce(contrast, 100);
  const debouncedLayers = useDebounce(layers, 100);
  const debouncedInkBleedAmount = useDebounce(inkBleedAmount, 150);
  const debouncedInkBleedRoughness = useDebounce(inkBleedRoughness, 150);
  const debouncedPreBlur = useDebounce(preBlur, 150);
  
  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };
  
  // Session persistence - save state to localStorage
  const saveSession = useCallback(() => {
    try {
      const sessionData = {
        imageScale,
        backgroundColor,
        brightness,
        contrast,
        invert,
        inkBleed,
        inkBleedAmount,
        inkBleedRoughness,
        preBlur,
        layers,
        palette,
        exportResolution,
        savedAt: Date.now()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (err) {
      console.warn('Failed to save session:', err);
    }
  }, [imageScale, backgroundColor, brightness, contrast, invert, inkBleed, inkBleedAmount, inkBleedRoughness, preBlur, layers, palette, exportResolution]);
  
  // Debounced session save
  const saveSessionTimeoutRef = useRef(null);
  useEffect(() => {
    if (saveSessionTimeoutRef.current) {
      clearTimeout(saveSessionTimeoutRef.current);
    }
    saveSessionTimeoutRef.current = setTimeout(saveSession, 1000);
    return () => {
      if (saveSessionTimeoutRef.current) {
        clearTimeout(saveSessionTimeoutRef.current);
      }
    };
  }, [saveSession]);
  
  // Restore session on mount
  const hasRestoredSession = useRef(false);
  useEffect(() => {
    if (hasRestoredSession.current) return;
    hasRestoredSession.current = true;
    
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) return;
      
      const data = JSON.parse(saved);
      const age = Date.now() - (data.savedAt || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      
      // Restore state
      if (data.imageScale !== undefined) setImageScale(data.imageScale);
      if (data.backgroundColor !== undefined) setBackgroundColor(data.backgroundColor);
      if (data.brightness !== undefined) setBrightness(data.brightness);
      if (data.contrast !== undefined) setContrast(data.contrast);
      if (data.invert !== undefined) setInvert(data.invert);
      if (data.inkBleed !== undefined) setInkBleed(data.inkBleed);
      if (data.inkBleedAmount !== undefined) setInkBleedAmount(data.inkBleedAmount);
      if (data.inkBleedRoughness !== undefined) setInkBleedRoughness(data.inkBleedRoughness);
      if (data.preBlur !== undefined) setPreBlur(data.preBlur);
      if (data.layers) setLayers(data.layers);
      if (data.palette) setPalette(data.palette);
      if (data.exportResolution !== undefined) setExportResolution(data.exportResolution);
      
      showToast('Previous session restored');
    } catch (err) {
      console.warn('Failed to restore session:', err);
    }
  }, []);
  
  // Commit state to history when significant changes occur
  const commitTimeoutRef = useRef(null);
  useEffect(() => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    commitTimeoutRef.current = setTimeout(() => {
      commitToHistory(getUndoableState());
    }, 500);
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
      }
    };
  }, [imageScale, backgroundColor, brightness, contrast, invert, inkBleed, inkBleedAmount, inkBleedRoughness, preBlur, layers, palette, commitToHistory, getUndoableState]);
  
  // Undo handler
  const handleUndo = useCallback(() => {
    const prevState = undo();
    if (prevState) {
      setImageScale(prevState.imageScale);
      setBackgroundColor(prevState.backgroundColor);
      setBrightness(prevState.brightness);
      setContrast(prevState.contrast);
      setInvert(prevState.invert);
      setInkBleed(prevState.inkBleed);
      setInkBleedAmount(prevState.inkBleedAmount);
      setInkBleedRoughness(prevState.inkBleedRoughness);
      setPreBlur(prevState.preBlur);
      setLayers(prevState.layers);
      setPalette(prevState.palette);
      showToast('Undo');
    }
  }, [undo]);
  
  // Redo handler
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setImageScale(nextState.imageScale);
      setBackgroundColor(nextState.backgroundColor);
      setBrightness(nextState.brightness);
      setContrast(nextState.contrast);
      setInvert(nextState.invert);
      setInkBleed(nextState.inkBleed);
      setInkBleedAmount(nextState.inkBleedAmount);
      setInkBleedRoughness(nextState.inkBleedRoughness);
      setPreBlur(nextState.preBlur);
      setLayers(nextState.layers);
      setPalette(nextState.palette);
      showToast('Redo');
    }
  }, [redo]);
  
  // Clear session
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear session:', err);
    }
  }, []);
  
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
    setBackgroundColor(DEFAULT_STATE.backgroundColor);
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
    ditherType: 'halftoneCircle',
    threshold: 0.5,
    scale: 8,
    angle: 45 + (layers.length * 30),
    offsetX: layers.length * 5,
    offsetY: layers.length * 5,
    blendMode: 'multiply',
    opacity: 1,
    visible: true
  });

  const addLayer = () => {
    if (layers.length < 4) setLayers([...layers, createDefaultLayer()]);
  };

  const updateLayer = (index, newLayer) => {
    const newLayers = [...layers];
    newLayers[index] = newLayer;
    setLayers(newLayers);
  };

  const removeLayer = (index) => setLayers(layers.filter((_, i) => i !== index));
  
  const duplicateLayer = (index) => {
    if (layers.length >= 4) return;
    const newLayer = { ...layers[index], id: Date.now() };
    const newLayers = [...layers];
    newLayers.splice(index + 1, 0, newLayer);
    setLayers(newLayers);
  };
  
  const moveLayerUp = (index) => {
    if (index === 0) return;
    const newLayers = [...layers];
    [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
    setLayers(newLayers);
  };
  
  const moveLayerDown = (index) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    setLayers(newLayers);
  };

  // Apply preset
  const applyPreset = (presetKey, isCustom = false) => {
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
      // Include custom palette with presets
      palette: palette
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `halftone-lab-presets-${new Date().toISOString().split('T')[0]}.json`;
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
    const newPalette = {
      ...palette,
      [colorKey]: {
        ...palette[colorKey],
        hex: newHex.toUpperCase(),
        rgb: hexToRgb(newHex)
      }
    };
    setPalette(newPalette);
    saveCustomPalette(newPalette);
  };

  const randomizePalette = () => {
    // Generate a random 4-color palette using tetradic harmony
    const harmonyTypes = ['tetradic', 'analogous', 'triadic', 'splitComplementary'];
    const randomHarmony = harmonyTypes[Math.floor(Math.random() * harmonyTypes.length)];
    let newPalette = generateNamedPalette(randomHarmony);
    
    // Ensure we have exactly 4 colors
    const paletteEntries = Object.entries(newPalette);
    if (paletteEntries.length > 4) {
      newPalette = Object.fromEntries(paletteEntries.slice(0, 4));
    } else if (paletteEntries.length < 4) {
      // If less than 4, generate more colors
      const additionalPalette = generateNamedPalette('tetradic');
      const additionalEntries = Object.entries(additionalPalette);
      let i = 0;
      while (Object.keys(newPalette).length < 4 && i < additionalEntries.length) {
        const [key, value] = additionalEntries[i];
        if (!newPalette[key]) {
          newPalette[key] = value;
        }
        i++;
      }
    }
    
    setPalette(newPalette);
    saveCustomPalette(newPalette);
    showToast('Palette randomized');
  };

  const resetPalette = () => {
    const { white, black, ...colors } = DEFAULT_PALETTE;
    setPalette(colors);
    saveCustomPalette(colors);
    showToast('Palette reset to default');
  };

  // Randomizer
  const randomizeLayers = () => {
    const shuffledColors = [...colorKeys].sort(() => Math.random() - 0.5);
    const algorithms = ['halftoneCircle', 'halftoneLines', 'bayer4x4', 'bayer8x8', 'floydSteinberg', 'atkinson'];
    
    setLayers([
      {
        id: Date.now(),
        colorKey: shuffledColors[0],
        ditherType: algorithms[Math.floor(Math.random() * algorithms.length)],
        threshold: 0.45 + Math.random() * 0.2,
        scale: Math.floor(6 + Math.random() * 6),
        angle: Math.floor(Math.random() * 45),
        offsetX: Math.floor(-20 + Math.random() * 40),
        offsetY: Math.floor(-20 + Math.random() * 40),
        blendMode: 'multiply',
        opacity: 0.9 + Math.random() * 0.1,
        visible: true
      },
      {
        id: Date.now() + 1,
        colorKey: shuffledColors[1],
        ditherType: algorithms[Math.floor(Math.random() * algorithms.length)],
        threshold: 0.45 + Math.random() * 0.2,
        scale: Math.floor(6 + Math.random() * 6),
        angle: Math.floor(45 + Math.random() * 45),
        offsetX: Math.floor(-20 + Math.random() * 40),
        offsetY: Math.floor(-20 + Math.random() * 40),
        blendMode: 'multiply',
        opacity: 0.9 + Math.random() * 0.1,
        visible: true
      }
    ]);
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
        setImage(img);
        setImageTransform({ x: 0, y: 0, scale: 1 });
        // Set viewport size to match image dimensions
        setViewportSize({ w: img.width, h: img.height });
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

  // Core image processing function (viewport architecture)
  const processImageCore = useCallback((sourceImage, targetCanvas, isExport = false) => {
    if (!sourceImage || !targetCanvas) return;
    
    const ctx = targetCanvas.getContext('2d');
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    
    // For preview, use sourceImage dimensions (previewImage is already limited to PREVIEW_MAX_WIDTH)
    // For export, use full image dimensions
    const outputWidth = sourceImage.width;
    const outputHeight = sourceImage.height;
    
    targetCanvas.width = outputWidth;
    targetCanvas.height = outputHeight;
    
    // For export, use full resolution; for preview, use scaled size
    const scaledWidth = isExport ? sourceImage.width : Math.round(sourceImage.width * debouncedImageScale);
    const scaledHeight = isExport ? sourceImage.height : Math.round(sourceImage.height * debouncedImageScale);
    sourceCanvas.width = scaledWidth;
    sourceCanvas.height = scaledHeight;
    
    // Calculate scale factor to make dither patterns consistent between preview and export
    // The scale parameter in UI is relative to preview size
    // For preview: use scale as-is (scaleFactor = 1)
    // For export: scale up proportionally to match export dimensions
    const previewWidth = image ? (image.width > PREVIEW_MAX_WIDTH ? PREVIEW_MAX_WIDTH : image.width) : sourceImage.width;
    const scaleFactor = isExport ? (image ? image.width / previewWidth : 1) : 1;
    
    sourceCtx.fillStyle = '#888888';
    sourceCtx.fillRect(0, 0, scaledWidth, scaledHeight);
    
    // Apply pre-blur if enabled
    if (debouncedPreBlur > 0) {
      sourceCtx.filter = `blur(${debouncedPreBlur}px)`;
    }
    sourceCtx.drawImage(sourceImage, 0, 0, scaledWidth, scaledHeight);
    sourceCtx.filter = 'none';
    
    let sourceData = sourceCtx.getImageData(0, 0, scaledWidth, scaledHeight);
    
    if (debouncedBrightness !== 0 || debouncedContrast !== 0) {
      sourceData = applyBrightnessContrast(sourceData, debouncedBrightness, debouncedContrast);
    }
    
    if (invert) {
      sourceData = invertImageData(sourceData);
    }
    
    // Layer mode - fill background first
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    const baseImageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
    const baseData = baseImageData.data;
      
      const inv255 = 1 / 255;
      const minDarkness = 0.02;
      
      // Process visible layers only
      const visibleLayers = debouncedLayers.filter(l => l.visible !== false);
      
      // For both preview and export, use direct 1:1 pixel mapping
      // Preview uses previewImage (already limited to PREVIEW_MAX_WIDTH) so it matches visually
      for (let li = 0; li < visibleLayers.length; li++) {
        const layer = visibleLayers[li];
        
        const algo = ditherAlgorithms[layer.ditherType];
        const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
        
        if (!algo) continue;
        
        // Scale the dither scale parameter to maintain consistent visual appearance
        const scaledLayerScale = layer.scale * scaleFactor;
        let ditheredData;
        if (algoInfo.hasScale && algoInfo.hasAngle) {
          ditheredData = algo(sourceData, layer.threshold, scaledLayerScale, layer.angle);
        } else if (algoInfo.hasScale) {
          ditheredData = algo(sourceData, layer.threshold, scaledLayerScale);
        } else {
          ditheredData = algo(sourceData, layer.threshold);
        }
        
        // Apply ink bleed to layer if enabled
        // Pass scaleFactor to ensure bleed effect scales proportionally with export resolution
        if (inkBleed && debouncedInkBleedAmount > 0) {
          ditheredData = applyInkBleed(ditheredData, debouncedInkBleedAmount, debouncedInkBleedRoughness, scaleFactor);
        }
        
        const paletteColor = activePalette[layer.colorKey];
        const r = paletteColor?.rgb?.[0] ?? 0;
        const g = paletteColor?.rgb?.[1] ?? 0;
        const b = paletteColor?.rgb?.[2] ?? 0;
        const blendFn = blendModes[layer.blendMode] || blendModes.multiply;
        const layerOpacity = layer.opacity;
        const layerOffsetX = layer.offsetX;
        const layerOffsetY = layer.offsetY;
        const ditheredDataArray = ditheredData.data;
        
        // Direct 1:1 mapping for both preview and export
        // Map from output coordinates to scaled coordinates when imageScale !== 1
        const scaleX = scaledWidth / outputWidth;
        const scaleY = scaledHeight / outputHeight;
        
        // Pre-calculate bounds to avoid per-pixel checks where possible
        const minY = Math.max(0, Math.ceil(-layerOffsetY * scaleY));
        const maxY = Math.min(outputHeight, Math.floor((scaledHeight - 1) / scaleY + layerOffsetY));
        
        for (let y = 0; y < outputHeight; y++) {
          const sy = Math.round((y - layerOffsetY) * scaleY);
          if (sy < 0 || sy >= scaledHeight) continue;
          
          const syw = sy * scaledWidth;
          const yw = y * outputWidth;
          
          for (let x = 0; x < outputWidth; x++) {
            const sx = Math.round((x - layerOffsetX) * scaleX);
            if (sx < 0 || sx >= scaledWidth) continue;
            
            const si = (syw + sx) << 2; // Faster than * 4
            const di = (yw + x) << 2;
            
            const darkness = 1 - (ditheredDataArray[si] * inv255);
            // Treat near-white pixels as fully transparent (screen print behavior)
            if (darkness > minDarkness) {
              const alpha = layerOpacity * darkness;
              baseData[di] = blendFn(baseData[di], r, alpha);
              baseData[di + 1] = blendFn(baseData[di + 1], g, alpha);
              baseData[di + 2] = blendFn(baseData[di + 2], b, alpha);
            }
          }
        }
      }
    
    ctx.putImageData(baseImageData, 0, 0);
  }, [debouncedImageScale, debouncedBrightness, debouncedContrast, invert, debouncedPreBlur, debouncedLayers, backgroundColor, inkBleed, debouncedInkBleedAmount, debouncedInkBleedRoughness, image, activePalette]);

  // Track pending updates to skip stale processing
  const pendingUpdateRef = useRef(0);
  
  // Process preview image (debounced and optimized with skip-stale logic)
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !originalCanvasRef.current) return;
    
    // Increment pending update counter
    const updateId = ++pendingUpdateRef.current;
    
    // If already processing, the new update will be picked up when current finishes
    if (processingRef.current) return;
    
    processingRef.current = true;
    setIsProcessing(true);
    
    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      // Skip if a newer update was requested
      if (updateId !== pendingUpdateRef.current) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // Draw original for comparison
      const originalCanvas = originalCanvasRef.current;
      if (!originalCanvas) {
        processingRef.current = false;
        setIsProcessing(false);
        return;
      }
      const originalCtx = originalCanvas.getContext('2d');
      originalCanvas.width = previewImage.width;
      originalCanvas.height = previewImage.height;
      originalCtx.drawImage(previewImage, 0, 0);
      
      // Process the preview image
      if (canvasRef.current) {
        processImageCore(previewImage, canvasRef.current);
      }
      
      processingRef.current = false;
      setIsProcessing(false);
      
      // Check if there's a pending newer update
      if (updateId !== pendingUpdateRef.current) {
        // Trigger re-render to process the latest state
        requestAnimationFrame(() => {
          if (!processingRef.current && canvasRef.current) {
            processingRef.current = true;
            setIsProcessing(true);
            processImageCore(previewImage, canvasRef.current);
            processingRef.current = false;
            setIsProcessing(false);
          }
        });
      }
    });
  }, [previewImage, processImageCore]);

  const exportPNG = () => {
    if (!image) return;
    
    // Create export canvas at full resolution
    const exportCanvas = document.createElement('canvas');
    processImageCore(image, exportCanvas, true);
    
    const scale = EXPORT_RESOLUTIONS[exportResolution].scale;
    
    let dataUrl;
    
    if (scale === 1) {
      dataUrl = exportCanvas.toDataURL('image/png');
    } else {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = exportCanvas.width * scale;
      scaledCanvas.height = exportCanvas.height * scale;
      const ctx = scaledCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(exportCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      dataUrl = scaledCanvas.toDataURL('image/png');
    }
    
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
    link.download = `halftone-${exportResolution}.png`;
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
        debouncedLayers,
        sourceImageData,
        dimensions,
        backgroundColor,
        { scaleFactor: 1 },
        activePalette
      );
      
      downloadSVG(svg, 'halftone-combined.svg');
      
      const estimatedSize = estimateSVGSize(debouncedLayers, dimensions, 1);
      const sizeKB = Math.round(estimatedSize / 1024);
      showToast(`Exported combined SVG (~${sizeKB}KB)`);
    } catch (error) {
      console.error('SVG export error:', error);
      showToast('SVG export failed: ' + error.message);
    }
  }, [image, previewImage, debouncedImageScale, debouncedLayers, backgroundColor, getSourceImageData, activePalette]);
  
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
        debouncedLayers,
        sourceImageData,
        dimensions,
        backgroundColor,
        { scaleFactor: 1 },
        activePalette
      );
      
      const visibleLayers = debouncedLayers.filter(l => l.visible !== false);
      showToast(`Exported ${visibleLayers.length} layer${visibleLayers.length !== 1 ? 's' : ''} as ZIP`);
    } catch (error) {
      console.error('SVG layers export error:', error);
      showToast('SVG export failed: ' + error.message);
    }
  }, [image, previewImage, debouncedImageScale, debouncedLayers, backgroundColor, getSourceImageData, activePalette]);

  // Toggle layer visibility by index
  const toggleLayerVisibility = useCallback((index) => {
    if (index >= 0 && index < layers.length) {
      const newLayers = [...layers];
      newLayers[index] = { ...newLayers[index], visible: !newLayers[index].visible };
      setLayers(newLayers);
    }
  }, [layers]);

  // Keyboard shortcuts
  const shortcuts = useMemo(() => createShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onExport: () => image && exportPNG(),
    onRandomize: () => image && randomizeLayers(),
    onToggleComparison: () => image && setShowComparison(prev => !prev),
    onZoomIn: () => setImageTransform(prev => ({ ...prev, scale: Math.min(8, prev.scale * 1.5) })),
    onZoomOut: () => setImageTransform(prev => ({ ...prev, scale: Math.max(0.25, prev.scale / 1.5) })),
    onResetZoom: () => setImageTransform(prev => ({ ...prev, scale: 1 })),
    onSelectLayer: (index) => {
      if (index < layers.length) {
        setExpandedLayerIndex(index);
      }
    },
    onToggleLayerVisibility: toggleLayerVisibility
  }), [handleUndo, handleRedo, image, exportPNG, randomizeLayers, layers.length, toggleLayerVisibility]);
  
  useKeyboardShortcuts(shortcuts, { enabled: !showSaveModal });

  return (
    <DropZone onDrop={loadImageFile}>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'monospace' }}>
        {/* Sidebar */}
        <div style={{ width: '300px', backgroundColor: '#0a0a0a', overflowY: 'auto', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '11px', letterSpacing: '0.2em', margin: 0, fontWeight: 400 }}>HALFTONE LAB</h1>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <Tooltip text="Undo (⌘Z)">
                <IconButton onClick={handleUndo} disabled={!canUndo} title="Undo">↶</IconButton>
              </Tooltip>
              <Tooltip text="Redo (⌘⇧Z)">
                <IconButton onClick={handleRedo} disabled={!canRedo} title="Redo">↷</IconButton>
              </Tooltip>
              <div style={{ width: '8px' }} />
              <Tooltip text="Reset all settings">
                <IconButton onClick={resetAll} title="Reset all">↺</IconButton>
              </Tooltip>
            </div>
          </div>
          
          {/* Source Section */}
          <Section title="SOURCE">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Button primary onClick={() => fileInputRef.current.click()} style={{ marginBottom: '12px' }}>
              {image ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
            </Button>
            <p style={{ fontSize: '9px', color: '#444', margin: '0 0 16px 0', textAlign: 'center' }}>or drag & drop anywhere</p>
            
            {image && (
              <>
                <Slider label={`SCALE ${Math.round(imageScale * 100)}%`} value={imageScale} min={0.5} max={2} step={0.05} onChange={setImageScale} />
                <Slider label={`PRE-BLUR ${Math.round(preBlur)}px`} value={preBlur} min={0} max={20} step={0.5} onChange={setPreBlur} />
                <Button onClick={randomizeLayers}>↻ RANDOMIZE</Button>
              </>
            )}
          </Section>
          
          {/* Palette Section */}
          <Section title="PALETTE">
            {/* Editable color swatches */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '12px',
              alignItems: 'flex-start'
            }}>
              {colorKeys.map(key => (
                <SwatchWithPicker
                  key={key}
                  color={palette[key]?.hex || '#000000'}
                  onChange={(newHex) => updatePaletteColor(key, newHex)}
                  size={40}
                />
              ))}
            </div>
            
            {/* Palette actions */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button onClick={randomizePalette} style={{ flex: 1 }}>
                ↻ RANDOMIZE
              </Button>
              <Button onClick={resetPalette} style={{ flex: 1, opacity: 0.7 }}>
                RESET
              </Button>
            </div>
            
            <p style={{ fontSize: '9px', color: '#444', margin: '8px 0 0 0', textAlign: 'center' }}>
              Click swatches to edit colors
            </p>
          </Section>
          
          {/* Presets Section */}
          <Section title="PRESETS" defaultOpen={false}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <Tooltip key={key} text={preset.description}>
                  <Button onClick={() => applyPreset(key)} style={{ fontSize: '9px' }}>
                    {preset.name}
                  </Button>
                </Tooltip>
              ))}
            </div>
            
            {/* Custom presets */}
            {Object.keys(customPresets).length > 0 && (
              <>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  SAVED
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  {Object.entries(customPresets).map(([key, preset]) => (
                    <div key={key} style={{ display: 'flex', gap: '4px' }}>
                      <Button onClick={() => applyPreset(key, true)} style={{ flex: 1, fontSize: '9px' }}>
                        {preset.name}
                      </Button>
                      <IconButton onClick={() => deleteCustomPreset(key)} title="Delete">×</IconButton>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <Button onClick={() => setShowSaveModal(true)} style={{ marginBottom: '12px' }}>
              + SAVE CURRENT AS PRESET
            </Button>
            
            {/* Export/Import */}
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px', marginTop: '4px' }}>
              <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                SHARE PRESETS
              </label>
              <input 
                ref={presetImportRef}
                type="file" 
                accept=".json" 
                onChange={importPresetsFromJSON} 
                style={{ display: 'none' }} 
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <Tooltip text="Export all saved presets as JSON">
                  <Button 
                    onClick={exportPresetsAsJSON} 
                    style={{ flex: 1, fontSize: '9px', opacity: Object.keys(customPresets).length > 0 ? 1 : 0.4 }}
                  >
                    EXPORT
                  </Button>
                </Tooltip>
                <Tooltip text="Import presets from JSON file">
                  <Button 
                    onClick={() => presetImportRef.current?.click()} 
                    style={{ flex: 1, fontSize: '9px' }}
                  >
                    IMPORT
                  </Button>
                </Tooltip>
              </div>
            </div>
          </Section>
          
          {/* Adjustments Section */}
          <Section title="ADJUSTMENTS">
            <Slider 
              label={`BRIGHTNESS ${brightness > 0 ? '+' : ''}${Math.round(brightness * 100)}`} 
              value={brightness} min={-0.5} max={0.5} step={0.01} onChange={setBrightness} 
            />
            <Slider 
              label={`CONTRAST ${contrast > 0 ? '+' : ''}${Math.round(contrast * 100)}`} 
              value={contrast} min={-0.5} max={0.5} step={0.01} onChange={setContrast} 
            />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button onClick={() => setInvert(!invert)} active={invert} style={{ flex: 1 }}>
                {invert ? '◐ INVERTED' : '◑ INVERT'}
              </Button>
              <Button onClick={() => { setBrightness(0); setContrast(0); setInvert(false); }} style={{ flex: 1, color: '#666' }}>
                RESET
              </Button>
            </div>
          </Section>
          
          {/* Analog Effects Section */}
          <Section title="ANALOG EFFECTS" defaultOpen={false}>
            <div style={{ marginBottom: '16px' }}>
              <Button onClick={() => setInkBleed(!inkBleed)} active={inkBleed} style={{ marginBottom: inkBleed ? '12px' : '0' }}>
                {inkBleed ? '● INK BLEED ON' : '○ INK BLEED'}
              </Button>
              {inkBleed && (
                <>
                  <Slider 
                    label={`SPREAD ${Math.round(inkBleedAmount * 100)}%`} 
                    value={inkBleedAmount} min={0.1} max={1} step={0.05} onChange={setInkBleedAmount} 
                  />
                  <Slider 
                    label={`ROUGHNESS ${Math.round(inkBleedRoughness * 100)}%`} 
                    value={inkBleedRoughness} min={0} max={1} step={0.05} onChange={setInkBleedRoughness} 
                  />
                </>
              )}
            </div>
            
            <Button onClick={() => setPaperTexture(!paperTexture)} active={paperTexture}>
              {paperTexture ? '● PAPER PREVIEW ON' : '○ PAPER PREVIEW'}
            </Button>
            <p style={{ fontSize: '9px', color: '#666', margin: '8px 0 0 0' }}>
              ⚠ Preview only — does not affect exports
            </p>
          </Section>
          
          {/* Layers Section */}
          <Section title={`LAYERS ${layers.length}/4`}>
              {layers.map((layer, i) => (
                <LayerPanel
                  key={layer.id}
                  layer={layer}
                  index={i}
                  totalLayers={layers.length}
                  onUpdate={(l) => updateLayer(i, l)}
                  onRemove={() => removeLayer(i)}
                  onDuplicate={() => duplicateLayer(i)}
                  onMoveUp={() => moveLayerUp(i)}
                  onMoveDown={() => moveLayerDown(i)}
                  canRemove={layers.length > 1}
                  palette={activePalette}
                  isExpanded={expandedLayerIndex === i}
                  onToggleExpand={() => setExpandedLayerIndex(expandedLayerIndex === i ? -1 : i)}
                />
              ))}
              {layers.length < 4 && (
                <Button onClick={addLayer}>+ ADD LAYER</Button>
              )}
              <p style={{ fontSize: '8px', color: '#444', margin: '12px 0 0 0', textAlign: 'center' }}>
                Press 1-4 to select layer • Shift+1-4 to toggle visibility
              </p>
          </Section>
          
          {/* Output Section */}
          <Section title="OUTPUT">
            <label style={{ 
              display: 'block', 
              color: '#666', 
              fontSize: '10px', 
              marginBottom: '8px', 
              fontFamily: 'monospace',
              letterSpacing: '0.05em'
            }}>
              BACKGROUND
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
              {/* Palette colors */}
              {colorKeys.map(key => (
                <ColorSwatch
                  key={key}
                  color={palette[key]?.hex || '#000000'}
                  selected={backgroundColor === palette[key]?.hex}
                  onClick={() => setBackgroundColor(palette[key]?.hex)}
                  size={28}
                />
              ))}
              {/* Black and white */}
              <ColorSwatch
                color="#000000"
                selected={backgroundColor === '#000000'}
                onClick={() => setBackgroundColor('#000000')}
                size={28}
              />
              <ColorSwatch
                color="#FFFFFF"
                selected={backgroundColor === '#FFFFFF' || backgroundColor === '#ffffff'}
                onClick={() => setBackgroundColor('#FFFFFF')}
                size={28}
              />
            </div>
            
            <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>RESOLUTION</label>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {Object.entries(EXPORT_RESOLUTIONS).map(([key, { label }]) => (
                <Button key={key} onClick={() => setExportResolution(key)} active={exportResolution === key} style={{ flex: 1, fontSize: '8px' }}>
                  {label}
                </Button>
              ))}
            </div>
            
            {image && (
              <>
                <Button primary onClick={exportPNG} style={{ marginBottom: '8px' }}>EXPORT PNG</Button>
                
                {/* SVG Export Options */}
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', marginTop: '16px', fontFamily: 'monospace' }}>
                  SVG EXPORT
                </label>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  <Tooltip text="Single SVG with all layers as groups">
                    <Button 
                      onClick={exportSVGCombined} 
                      style={{ flex: 1, fontSize: '9px' }}
                    >
                      COMBINED
                    </Button>
                  </Tooltip>
                  <Tooltip text="ZIP file with separate SVG per layer">
                    <Button 
                      onClick={exportSVGLayers}
                      style={{ flex: 1, fontSize: '9px' }}
                    >
                      LAYERS (ZIP)
                    </Button>
                  </Tooltip>
                </div>
              </>
            )}
          </Section>
        </div>
        
        {/* Canvas Area */}
        <div 
          ref={canvasContainerRef}
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '32px', 
            backgroundColor: '#111', 
            overflow: 'hidden',
            position: 'relative',
            cursor: isPanning ? 'grabbing' : (image && !showComparison ? 'grab' : 'default')
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
          
          {/* Processing indicator */}
          {isProcessing && image && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '6px 12px',
              fontSize: '9px',
              color: '#888',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                border: '1px solid #555',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              PROCESSING
            </div>
          )}
          
          {/* Top bar */}
          {image && (
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              left: '16px', 
              right: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none'
            }}>
              {/* Dimensions */}
              <div style={{ 
                fontSize: '10px', 
                color: '#555', 
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '6px 10px'
              }}>
                {image.width} × {image.height}
                {image.width > PREVIEW_MAX_WIDTH && (
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    (preview @ {Math.round(PREVIEW_MAX_WIDTH / image.width * 100)}%)
                  </span>
                )}
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
              bottom: '16px', 
              left: '50%', 
              transform: 'translateX(-50%)',
              fontSize: '9px', 
              color: '#333', 
              fontFamily: 'monospace',
              pointerEvents: 'none'
            }}>
              Scroll to zoom • Drag to pan
            </div>
          )}
          
          {!image ? (
            <div style={{ textAlign: 'center', color: '#444' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>◐</div>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em' }}>UPLOAD OR DROP IMAGE</p>
            </div>
          ) : (
            <div style={{
              width: previewImage ? `${previewImage.width}px` : `${viewportSize.w}px`,
              height: previewImage ? `${previewImage.height}px` : `${viewportSize.h}px`,
              position: 'relative',
              backgroundColor: '#111'
            }}>
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
        
        <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
        
        {showSaveModal && (
          <SavePresetModal 
            onSave={saveCustomPreset} 
            onCancel={() => setShowSaveModal(false)} 
          />
        )}
      </div>
    </DropZone>
  );
}
