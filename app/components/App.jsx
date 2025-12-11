'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';

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
import RightPanel from './ui/RightPanel';
import CompositionPanel from './ui/CompositionPanel';


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
    // Extract color keys from DEFAULT_PALETTE (excluding white/black)
    const { white, black, ...colors } = DEFAULT_PALETTE;
    return colors;
  });

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Locked colors - preserved during randomization
  const [lockedColors, setLockedColors] = useState(new Set());

  // Selection state for context-sensitive right panel
  // type: 'project' | 'source' | 'background' | 'layer'
  // id: layer.id when type === 'layer'
  const [selection, setSelection] = useState({ type: 'project', id: null });

  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const presetImportRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const processingRef = useRef(false);

  // Web worker for off-main-thread dithering
  const { dither: workerDither, isAvailable: isWorkerAvailable } = useDitherWorker();

  // Active palette includes editable colors + black/white for backgrounds
  const activePalette = useMemo(() => {
    return {
      ...palette,
      white: DEFAULT_PALETTE.white,
      black: DEFAULT_PALETTE.black
    };
  }, [palette]);

  const colorKeys = Object.keys(activePalette).filter(k => !['white', 'black'].includes(k));

  // Computed backgroundColor - follows palette if using a key, otherwise uses raw hex
  const backgroundColor = useMemo(() => {
    if (backgroundColorKey && activePalette[backgroundColorKey]) {
      return activePalette[backgroundColorKey].hex;
    }
    return backgroundColorRaw;
  }, [backgroundColorKey, activePalette, backgroundColorRaw]);

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
  const prevPaletteKeysRef = useRef(colorKeys);

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
  }, [palette]);

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
    if (layers.length < 10) setLayers([...layers, createDefaultLayer()]);
  };

  const updateLayer = (index, newLayer) => {
    const newLayers = [...layers];
    newLayers[index] = newLayer;
    setLayers(newLayers);
  };

  const removeLayer = (index) => {
    // If removing the selected layer, deselect it
    if (selection.type === 'layer' && selection.id === layers[index]?.id) {
      setSelection({ type: 'project', id: null });
    }
    setLayers(layers.filter((_, i) => i !== index));
  };

  const toggleLayerVisibility = (index) => {
    const newLayers = [...layers];
    newLayers[index] = { ...newLayers[index], visible: newLayers[index].visible === false ? true : false };
    setLayers(newLayers);
  };

  const duplicateLayer = (index) => {
    if (layers.length >= 10) return;
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
  };

  const toggleColorLock = (colorKey) => {
    setLockedColors(prev => {
      const next = new Set(prev);
      if (next.has(colorKey)) {
        next.delete(colorKey);
      } else {
        next.add(colorKey);
      }
      return next;
    });
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

    // Preserve locked colors from current palette
    lockedColors.forEach(lockedKey => {
      if (palette[lockedKey]) {
        // Check if the key exists in newPalette, if so we need to find a new spot
        if (newPalette[lockedKey]) {
          // Key conflict - locked color takes precedence
          newPalette[lockedKey] = palette[lockedKey];
        } else {
          // Add the locked color to the new palette
          newPalette[lockedKey] = palette[lockedKey];
        }
      }
    });

    // Get the new palette keys
    const newKeys = Object.keys(newPalette);

    // Update layers to use new palette keys BEFORE updating palette
    // This prevents flicker from mismatched keys during the transition
    // But preserve color keys for layers that use locked colors
    setLayers(prevLayers => prevLayers.map((layer, index) => {
      // If the layer uses a locked color that still exists, keep it
      if (lockedColors.has(layer.colorKey) && newPalette[layer.colorKey]) {
        return layer;
      }
      return {
        ...layer,
        colorKey: newKeys[index % newKeys.length]
      };
    }));

    // Update the ref to prevent useLayoutEffect from triggering another remap
    prevPaletteKeysRef.current = newKeys;

    setPalette(newPalette);
    saveCustomPalette(newPalette);
    const lockedCount = lockedColors.size;
    showToast(lockedCount > 0 ? `Randomized (${lockedCount} locked)` : 'Palette randomized');
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
  // Processes the preview image and renders to the target canvas
  const processImageCore = useCallback((sourceImage, targetCanvas) => {
    if (!sourceImage || !targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCtx.imageSmoothingEnabled = false; // Crisp nearest-neighbor scaling

    // Output dimensions match source image (previewImage is already limited to PREVIEW_MAX_WIDTH)
    const outputWidth = sourceImage.width;
    const outputHeight = sourceImage.height;

    targetCanvas.width = outputWidth;
    targetCanvas.height = outputHeight;

    // Apply image scale setting for processing resolution
    const scaledWidth = Math.round(sourceImage.width * debouncedImageScale);
    const scaledHeight = Math.round(sourceImage.height * debouncedImageScale);
    sourceCanvas.width = scaledWidth;
    sourceCanvas.height = scaledHeight;

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

      // Use layer scale directly for dithering
      let ditheredData;
      if (algoInfo.hasScale && algoInfo.hasAngle) {
        ditheredData = algo(sourceData, layer.threshold, layer.scale, layer.angle);
      } else if (algoInfo.hasScale) {
        ditheredData = algo(sourceData, layer.threshold, layer.scale);
      } else {
        ditheredData = algo(sourceData, layer.threshold);
      }

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
              const alpha = layerOpacity * darkness;
              baseData[di] = blendFn(baseData[di], r, alpha);
              baseData[di + 1] = blendFn(baseData[di + 1], g, alpha);
              baseData[di + 2] = blendFn(baseData[di + 2], b, alpha);
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
              const alpha = layerOpacity * darkness;
              baseData[di] = blendFn(baseData[di], r, alpha);
              baseData[di + 1] = blendFn(baseData[di + 1], g, alpha);
              baseData[di + 2] = blendFn(baseData[di + 2], b, alpha);
            }
          }
        }
      }
    }

    ctx.putImageData(baseImageData, 0, 0);
  }, [debouncedImageScale, debouncedBrightness, debouncedContrast, invert, debouncedPreBlur, debouncedLayers, backgroundColor, inkBleed, debouncedInkBleedAmount, debouncedInkBleedRoughness, activePalette, colorKeys]);

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

      downloadSVG(svg, 'stack-combined.svg');

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

  return (
    <DropZone onDrop={loadImageFile}>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'monospace' }}>
        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
        <input ref={presetImportRef} type="file" accept=".json" onChange={importPresetsFromJSON} style={{ display: 'none' }} />

        {/* Left Sidebar - Composition */}
        <div style={{ width: '240px', backgroundColor: '#0a0a0a', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '11px', letterSpacing: '0.2em', margin: 0, fontWeight: 400 }}>STACK LAB</h1>
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
            layers={layers}
            onAddLayer={addLayer}
            onToggleLayerVisibility={toggleLayerVisibility}
            onDuplicateLayer={duplicateLayer}
            onRemoveLayer={removeLayer}
            palette={palette}
            colorKeys={colorKeys}
            onUpdatePaletteColor={updatePaletteColor}
            onRandomizePalette={randomizePalette}
            activePalette={activePalette}
            lockedColors={lockedColors}
            onToggleColorLock={toggleColorLock}
          />
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
          onClick={(e) => {
            // Click on canvas background (outside image) shows project properties
            if (e.target === canvasContainerRef.current) {
              setSelection({ type: 'project', id: null });
            }
          }}
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
          exportResolution={exportResolution}
          onExportResolutionChange={setExportResolution}
          onExportPNG={exportPNG}
          onExportSVGCombined={exportSVGCombined}
          onExportSVGLayers={exportSVGLayers}
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
      </div>
    </DropZone>
  );
}
