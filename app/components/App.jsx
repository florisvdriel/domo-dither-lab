'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Constants
import { DOMO_PALETTE, ALL_COLOR_KEYS } from '../constants/palette';
import { DITHER_ALGORITHMS } from '../constants/ditherAlgorithms';
import { PRESETS } from '../constants/presets';
import { BLEND_MODES, EXPORT_RESOLUTIONS, PREVIEW_MAX_WIDTH, DEFAULT_STATE } from '../constants';

// Utilities
import { useDebounce, getGray } from '../utils/helpers';
import { ditherAlgorithms, blendModes } from '../utils/dithering';
import { applyBrightnessContrast, invertImageData, applyInkBleed, applyGradientMap } from '../utils/imageProcessing';
import { loadCustomPresets, saveCustomPresets } from '../utils/storage';

// UI Components
import Toast from './ui/Toast';
import Tooltip from './ui/Tooltip';
import Slider from './ui/Slider';
import Button from './ui/Button';
import ColorPicker, { ColorSwatch } from './ui/ColorPicker';
import Section from './ui/Section';
import IconButton from './ui/IconButton';
import AlgorithmSelect from './ui/AlgorithmSelect';
import LayerPanel from './ui/LayerPanel';
import DropZone from './ui/DropZone';
import ComparisonSlider from './ui/ComparisonSlider';
import SavePresetModal from './ui/SavePresetModal';


export default function DomoDitherTool() {
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
  
  const [gradientEnabled, setGradientEnabled] = useState(DEFAULT_STATE.gradientEnabled);
  const [gradientColors, setGradientColors] = useState(DEFAULT_STATE.gradientColors);
  const [gradientDitherType, setGradientDitherType] = useState(DEFAULT_STATE.gradientDitherType);
  const [gradientDitherScale, setGradientDitherScale] = useState(DEFAULT_STATE.gradientDitherScale);
  const [gradientDitherAngle, setGradientDitherAngle] = useState(DEFAULT_STATE.gradientDitherAngle);
  const [gradientDitherThreshold, setGradientDitherThreshold] = useState(DEFAULT_STATE.gradientDitherThreshold);
  
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
  
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const sourceCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const processingRef = useRef(false);

  const colorKeys = Object.keys(DOMO_PALETTE).filter(k => !['white', 'black'].includes(k));
  
  // Debounce all processing-related state changes
  const debouncedImageScale = useDebounce(imageScale, 150);
  const debouncedBrightness = useDebounce(brightness, 150);
  const debouncedContrast = useDebounce(contrast, 150);
  const debouncedLayers = useDebounce(layers, 150);
  const debouncedGradientDitherThreshold = useDebounce(gradientDitherThreshold, 150);
  const debouncedGradientDitherScale = useDebounce(gradientDitherScale, 150);
  const debouncedGradientDitherAngle = useDebounce(gradientDitherAngle, 150);
  const debouncedInkBleedAmount = useDebounce(inkBleedAmount, 150);
  const debouncedInkBleedRoughness = useDebounce(inkBleedRoughness, 150);
  
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
    setGradientEnabled(DEFAULT_STATE.gradientEnabled);
    setGradientColors([...DEFAULT_STATE.gradientColors]);
    setGradientDitherType(DEFAULT_STATE.gradientDitherType);
    setGradientDitherScale(DEFAULT_STATE.gradientDitherScale);
    setGradientDitherAngle(DEFAULT_STATE.gradientDitherAngle);
    setGradientDitherThreshold(DEFAULT_STATE.gradientDitherThreshold);
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
  
  // Add gradient color
  const addGradientColor = () => {
    if (gradientColors.length >= 4) return;
    const newColors = [...gradientColors];
    const insertIndex = Math.floor(newColors.length / 2);
    newColors.splice(insertIndex, 0, 'white');
    setGradientColors(newColors);
  };
  
  // Remove gradient color
  const removeGradientColor = (index) => {
    if (gradientColors.length <= 2) return;
    setGradientColors(gradientColors.filter((_, i) => i !== index));
  };

  // Apply preset
  const applyPreset = (presetKey, isCustom = false) => {
    const preset = isCustom ? customPresets[presetKey] : PRESETS[presetKey];
    if (!preset) return;
    
    if (preset.gradient) {
      setGradientEnabled(true);
      setGradientColors([...preset.gradientColors]);
      setGradientDitherType(preset.ditherType);
      setGradientDitherScale(preset.ditherScale);
      setGradientDitherAngle(preset.ditherAngle);
      setGradientDitherThreshold(preset.ditherThreshold);
    } else {
      setGradientEnabled(false);
      setLayers(preset.layers.map((l, i) => ({ ...l, id: Date.now() + i })));
    }
    
    if (preset.inkBleed !== undefined) setInkBleed(preset.inkBleed);
    if (preset.inkBleedAmount !== undefined) setInkBleedAmount(preset.inkBleedAmount);
    if (preset.paperTexture !== undefined) setPaperTexture(preset.paperTexture);
    
    showToast(`Applied ${preset.name} preset`);
  };
  
  // Save custom preset
  const saveCustomPreset = (name) => {
    const preset = {
      name: name.toUpperCase(),
      description: 'Custom preset',
      gradient: gradientEnabled,
      ...(gradientEnabled ? {
        gradientColors: [...gradientColors],
        ditherType: gradientDitherType,
        ditherScale: gradientDitherScale,
        ditherAngle: gradientDitherAngle,
        ditherThreshold: gradientDitherThreshold
      } : {
        layers: layers.map(l => ({ ...l }))
      }),
      inkBleed,
      inkBleedAmount,
      paperTexture
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

  // Randomizer
  const randomizeLayers = () => {
    const shuffledColors = [...colorKeys].sort(() => Math.random() - 0.5);
    const algorithms = ['halftoneCircle', 'halftoneLines', 'bayer4x4', 'bayer8x8', 'floydSteinberg', 'atkinson'];
    
    setGradientEnabled(false);
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
    if (preBlur > 0) {
      sourceCtx.filter = `blur(${preBlur}px)`;
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
    
    let finalImageData;
    
    // Gradient map mode
    if (gradientEnabled && gradientColors.length >= 2) {
      const colors = gradientColors.map(key => DOMO_PALETTE[key]?.rgb || [0, 0, 0]);
      
      if (gradientDitherType !== 'none') {
        const algo = ditherAlgorithms[gradientDitherType];
        const algoInfo = DITHER_ALGORITHMS[gradientDitherType];
        
        if (algo) {
          let ditheredData;
        // Scale the dither scale parameter to maintain consistent visual appearance
        const scaledGradientDitherScale = debouncedGradientDitherScale * scaleFactor;
        if (algoInfo.hasScale && algoInfo.hasAngle) {
          ditheredData = algo(sourceData, debouncedGradientDitherThreshold, scaledGradientDitherScale, debouncedGradientDitherAngle);
        } else if (algoInfo.hasScale) {
          ditheredData = algo(sourceData, debouncedGradientDitherThreshold, scaledGradientDitherScale);
        } else {
          ditheredData = algo(sourceData, debouncedGradientDitherThreshold);
        }
          
          const resultData = new Uint8ClampedArray(ditheredData.data);
          const ditheredDataArray = ditheredData.data;
          const len = resultData.length;
          const inv255 = 1 / 255;
          const colorsLen = colors.length;
          const colorsMinusOne = colorsLen - 1;
          
          if (colorsLen === 2) {
            const c0 = colors[0];
            const c1 = colors[1];
            for (let i = 0; i < len; i += 4) {
              const ditheredVal = ditheredDataArray[i] * inv255;
              if (ditheredVal < 0.5) {
                resultData[i] = c0[0];
                resultData[i + 1] = c0[1];
                resultData[i + 2] = c0[2];
              } else {
                resultData[i] = c1[0];
                resultData[i + 1] = c1[1];
                resultData[i + 2] = c1[2];
              }
            }
          } else {
            for (let i = 0; i < len; i += 4) {
              const ditheredVal = ditheredDataArray[i] * inv255;
              const colorIdx = Math.min(Math.round(ditheredVal * colorsMinusOne), colorsMinusOne);
              const [r, g, b] = colors[colorIdx];
              resultData[i] = r;
              resultData[i + 1] = g;
              resultData[i + 2] = b;
            }
          }
          
          finalImageData = new ImageData(resultData, scaledWidth, scaledHeight);
        } else {
          finalImageData = applyGradientMap(sourceData, gradientColors);
        }
      } else {
        finalImageData = applyGradientMap(sourceData, gradientColors);
      }
      
      // Apply ink bleed if enabled
      if (inkBleed && debouncedInkBleedAmount > 0) {
        finalImageData = applyInkBleed(finalImageData, debouncedInkBleedAmount, debouncedInkBleedRoughness);
      }
      
      // Always fill background (image functions as background)
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      
      // For both preview and export, direct 1:1 pixel copy
      // Preview uses previewImage (already limited to PREVIEW_MAX_WIDTH) so it matches visually
      ctx.putImageData(finalImageData, 0, 0);
    } else {
      // Layer mode
      // Always fill background (image functions as background)
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, outputWidth, outputHeight);
      const baseImageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
      const baseData = baseImageData.data;
      
      const inv255 = 1 / 255;
      const minDarkness = 0.02;
      
      // For both preview and export, use direct 1:1 pixel mapping
      // Preview uses previewImage (already limited to PREVIEW_MAX_WIDTH) so it matches visually
      debouncedLayers.forEach(layer => {
        // Skip hidden layers
        if (layer.visible === false) return;
        
        const algo = ditherAlgorithms[layer.ditherType];
        const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
        
        if (!algo) return;
        
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
        if (inkBleed && debouncedInkBleedAmount > 0) {
          ditheredData = applyInkBleed(ditheredData, debouncedInkBleedAmount, debouncedInkBleedRoughness);
        }
        
        const [r, g, b] = DOMO_PALETTE[layer.colorKey]?.rgb || [0, 0, 0];
        const blendFn = blendModes[layer.blendMode] || blendModes.multiply;
        const layerOpacity = layer.opacity;
        const layerOffsetX = layer.offsetX;
        const layerOffsetY = layer.offsetY;
        const ditheredDataArray = ditheredData.data;
        
        // Direct 1:1 mapping for both preview and export
        // Map from output coordinates to scaled coordinates when imageScale !== 1
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
            
            const si = (syw + sx) * 4;
            const di = (yw + x) * 4;
            
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
      });
      
      ctx.putImageData(baseImageData, 0, 0);
    }
  }, [debouncedImageScale, debouncedBrightness, debouncedContrast, invert, preBlur, gradientEnabled, gradientColors, gradientDitherType, debouncedGradientDitherThreshold, debouncedGradientDitherScale, debouncedGradientDitherAngle, debouncedLayers, backgroundColor, viewportSize, imageTransform, inkBleed, debouncedInkBleedAmount, debouncedInkBleedRoughness, image]);

  // Process preview image (debounced and optimized)
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !originalCanvasRef.current || processingRef.current) return;
    
    processingRef.current = true;
    
    // Use double requestAnimationFrame for better performance (allows browser to batch updates)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
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
      });
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
    link.download = `domo-dither-${exportResolution}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`Exported at ${exportResolution}`);
  };

  const exportSVG = () => {
    console.log('exportSVG called', { image: !!image });
    if (!image) {
      showToast('No image loaded');
      return;
    }
    
    try {
      console.log('Starting SVG export...');
      // Create a temporary canvas to get the processed image data for reference
      const tempCanvas = document.createElement('canvas');
      processImageCore(image, tempCanvas, true);
      const ctx = tempCanvas.getContext('2d');
      
      // Get the original source image data (before dithering) for sampling darkness values
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.width;
      sourceCanvas.height = image.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      sourceCtx.drawImage(image, 0, 0);
      const sourceImageData = sourceCtx.getImageData(0, 0, image.width, image.height);
      
      console.log('Image processed', { width: tempCanvas.width, height: tempCanvas.height });
      
      // Use actual processed image dimensions (limit to reasonable size for SVG)
      const maxSVGSize = 2000; // Limit SVG size to prevent huge files
      const maxDim = Math.max(tempCanvas.width, tempCanvas.height);
      const scale = maxDim > 0 ? Math.min(1, maxSVGSize / maxDim) : 1;
      const svgWidth = Math.max(1, Math.round(tempCanvas.width * scale));
      const svgHeight = Math.max(1, Math.round(tempCanvas.height * scale));
      
      // Calculate scale factor for dither patterns (same as processImageCore)
      const previewWidth = image ? (image.width > PREVIEW_MAX_WIDTH ? PREVIEW_MAX_WIDTH : image.width) : tempCanvas.width;
      const ditherScaleFactor = image ? image.width / previewWidth : 1;
      
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
      
      // Always include background (image functions as background)
      svg += `  <rect width="${svgWidth}" height="${svgHeight}" fill="${backgroundColor}"/>\n`;
      
      // Process gradient mode or layer mode
      if (gradientEnabled && gradientColors.length >= 2) {
        // Gradient mode: create a single group with gradient colors
        const colors = gradientColors.map(key => DOMO_PALETTE[key]?.hex || '#000000');
        svg += `  <defs>\n`;
        svg += `    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">\n`;
        gradientColors.forEach((colorKey, i) => {
          const color = DOMO_PALETTE[colorKey];
          const offset = (i / (gradientColors.length - 1)) * 100;
          svg += `      <stop offset="${offset}%" stop-color="${color?.hex || '#000000'}"/>\n`;
        });
        svg += `    </linearGradient>\n`;
        svg += `  </defs>\n`;
        svg += `  <g id="Gradient" fill="url(#gradient)">\n`;
        
        // Generate pattern based on gradient dither type
        const algoInfo = DITHER_ALGORITHMS[gradientDitherType];
        if (algoInfo?.category === 'halftone' && gradientDitherType === 'halftoneCircle') {
          // Scale the dither scale to match export dimensions
          const scaledGradientDitherScale = debouncedGradientDitherScale * ditherScaleFactor;
          const step = Math.max(3, Math.floor(scaledGradientDitherScale));
          const maxRadius = step * 0.48;
          const rad = (debouncedGradientDitherAngle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const radiusMultiplier = maxRadius * (0.6 + debouncedGradientDitherThreshold * 0.7);
          const wHalf = svgWidth * 0.5;
          const hHalf = svgHeight * 0.5;
          
          // Match the algorithm's grid bounds calculation
          const gridExtent = Math.max(svgWidth, svgHeight) * 2;
          const gridStart = -gridExtent;
          const gridEnd = gridExtent;
          const minGridX = Math.floor((gridStart - wHalf) / step) * step;
          const maxGridX = Math.ceil((gridEnd - wHalf) / step) * step;
          const minGridY = Math.floor((gridStart - hHalf) / step) * step;
          const maxGridY = Math.ceil((gridEnd - hHalf) / step) * step;
          
          for (let gy = minGridY; gy <= maxGridY; gy += step) {
            for (let gx = minGridX; gx <= maxGridX; gx += step) {
              const cx = gx * cos - gy * sin + wHalf;
              const cy = gx * sin + gy * cos + hHalf;
              
              if (cx < -step || cx >= svgWidth + step || cy < -step || cy >= svgHeight + step) continue;
              
              // Sample from original source image to get actual darkness values
              const sourceX = Math.max(0, Math.min(image.width - 1, Math.round(cx / scale * (image.width / tempCanvas.width))));
              const sourceY = Math.max(0, Math.min(image.height - 1, Math.round(cy / scale * (image.height / tempCanvas.height))));
              const sourceIdx = (sourceY * image.width + sourceX) * 4;
              
              if (sourceIdx + 2 < sourceImageData.data.length) {
                const gray = getGray(sourceImageData.data, sourceIdx);
                const darkness = 1 - gray;
                const radius = Math.sqrt(darkness) * radiusMultiplier;
                
                if (radius >= 0.5) {
                  svg += `    <circle cx="${cx}" cy="${cy}" r="${radius * scale}"/>\n`;
                }
              }
            }
          }
        } else {
          // For other gradient patterns, limit to reasonable resolution
          const pixelSize = Math.max(2, Math.ceil(Math.max(svgWidth, svgHeight) / 500)); // Limit to ~500 elements per dimension
          for (let y = 0; y < svgHeight; y += pixelSize) {
            for (let x = 0; x < svgWidth; x += pixelSize) {
              // Sample from original source image
              const srcX = Math.round(x / scale * (image.width / tempCanvas.width));
              const srcY = Math.round(y / scale * (image.height / tempCanvas.height));
              const idx = (srcY * image.width + srcX) * 4;
              if (idx + 2 < sourceImageData.data.length) {
                const gray = (sourceImageData.data[idx] + sourceImageData.data[idx + 1] + sourceImageData.data[idx + 2]) / 3;
                if (gray < 200) {
                  svg += `    <rect x="${x}" y="${y}" width="${pixelSize}" height="${pixelSize}"/>\n`;
                }
              }
            }
          }
        }
        
        svg += `  </g>\n`;
      } else if (debouncedLayers.length > 0) {
        // Layer mode - apply blend modes to match canvas rendering
        const blendModeMap = {
          'normal': 'normal',
          'multiply': 'multiply',
          'screen': 'screen',
          'overlay': 'overlay',
          'darken': 'darken',
          'lighten': 'lighten'
        };
        
        debouncedLayers.forEach((layer, layerIdx) => {
          if (layer.visible === false) return;
          
          const color = DOMO_PALETTE[layer.colorKey];
          if (!color) return;
          
          const svgBlendMode = blendModeMap[layer.blendMode] || 'multiply';
          svg += `  <g id="${color.name}" fill="${color.hex}" opacity="${layer.opacity}" style="mix-blend-mode: ${svgBlendMode};">\n`;
          
          const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
          
          // For halftone patterns, generate circles
          if (algoInfo?.category === 'halftone' && layer.ditherType === 'halftoneCircle') {
          // Scale the dither scale to match export dimensions
          const scaledLayerScale = layer.scale * ditherScaleFactor;
          const step = Math.max(3, Math.floor(scaledLayerScale));
          const maxRadius = step * 0.48;
          const rad = (layer.angle * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const radiusMultiplier = maxRadius * (0.6 + layer.threshold * 0.7);
          const wHalf = svgWidth * 0.5;
          const hHalf = svgHeight * 0.5;
          
          // Match the algorithm's grid bounds calculation (same as halftoneCircle function)
          const gridExtent = Math.max(svgWidth, svgHeight) * 2;
          const gridStart = -gridExtent;
          const gridEnd = gridExtent;
          const minGridX = Math.floor((gridStart - wHalf) / step) * step;
          const maxGridX = Math.ceil((gridEnd - wHalf) / step) * step;
          const minGridY = Math.floor((gridStart - hHalf) / step) * step;
          const maxGridY = Math.ceil((gridEnd - hHalf) / step) * step;
          
          for (let gy = minGridY; gy <= maxGridY; gy += step) {
            for (let gx = minGridX; gx <= maxGridX; gx += step) {
              // Apply layer offsets to match canvas rendering
              const offsetGx = gx - (layer.offsetX * ditherScaleFactor);
              const offsetGy = gy - (layer.offsetY * ditherScaleFactor);
              const cx = offsetGx * cos - offsetGy * sin + wHalf;
              const cy = offsetGx * sin + offsetGy * cos + hHalf;
              
              if (cx < -step || cx >= svgWidth + step || cy < -step || cy >= svgHeight + step) continue;
              
              // Sample from original source image to get actual darkness values
              const sourceX = Math.max(0, Math.min(image.width - 1, Math.round(cx / scale * (image.width / tempCanvas.width))));
              const sourceY = Math.max(0, Math.min(image.height - 1, Math.round(cy / scale * (image.height / tempCanvas.height))));
              const sourceIdx = (sourceY * image.width + sourceX) * 4;
              
              if (sourceIdx + 2 < sourceImageData.data.length) {
                const gray = getGray(sourceImageData.data, sourceIdx);
                const darkness = 1 - gray;
                const radius = Math.sqrt(darkness) * radiusMultiplier;
                
                if (radius >= 0.5) {
                  // Use darkness-based opacity to match canvas rendering (darkness already accounts for layer opacity via blend mode)
                  svg += `    <circle cx="${cx}" cy="${cy}" r="${radius * scale}"/>\n`;
                }
              }
            }
          }
        } else {
          // For other patterns, limit to reasonable resolution
          const pixelSize = Math.max(2, Math.ceil(Math.max(svgWidth, svgHeight) / 500)); // Limit to ~500 elements per dimension
          for (let y = 0; y < svgHeight; y += pixelSize) {
            for (let x = 0; x < svgWidth; x += pixelSize) {
              // Apply layer offsets to match canvas rendering
              const offsetX = x - (layer.offsetX * ditherScaleFactor * scale);
              const offsetY = y - (layer.offsetY * ditherScaleFactor * scale);
              // Sample from original source image
              const srcX = Math.round(offsetX / scale * (image.width / tempCanvas.width));
              const srcY = Math.round(offsetY / scale * (image.height / tempCanvas.height));
              const idx = (srcY * image.width + srcX) * 4;
              if (idx + 2 < sourceImageData.data.length && srcX >= 0 && srcX < image.width && srcY >= 0 && srcY < image.height) {
                const gray = (sourceImageData.data[idx] + sourceImageData.data[idx + 1] + sourceImageData.data[idx + 2]) / 3;
                if (gray < 200) { // Threshold for dark pixels
                  // Use darkness-based opacity to match canvas rendering
                  const darkness = 1 - (gray / 255);
                  const rectOpacity = Math.max(0.1, darkness);
                  svg += `    <rect x="${x}" y="${y}" width="${pixelSize}" height="${pixelSize}" opacity="${rectOpacity}"/>\n`;
                }
              }
            }
          }
          }
          
          svg += `  </g>\n`;
        });
      } else {
        // No gradient or layers - just export background
        console.log('No gradient or layers enabled, exporting background only');
      }
      
      svg += `</svg>`;
      
      console.log('SVG generated', { length: svg.length, svgWidth, svgHeight });
      
      // Download SVG
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'domo-dither.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('SVG download triggered');
      showToast('Exported SVG');
    } catch (error) {
      console.error('SVG export error:', error);
      showToast('SVG export failed: ' + error.message);
    }
  };

  const gradientAlgoInfo = useMemo(() => DITHER_ALGORITHMS[gradientDitherType], [gradientDitherType]);

  return (
    <DropZone onDrop={loadImageFile}>
      <div style={{ display: 'flex', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'monospace' }}>
        {/* Sidebar */}
        <div style={{ width: '300px', backgroundColor: '#0a0a0a', overflowY: 'auto', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '11px', letterSpacing: '0.2em', margin: 0, fontWeight: 400 }}>DOMO DITHER</h1>
            <IconButton onClick={resetAll} title="Reset all">↺</IconButton>
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
            
            <Button onClick={() => setShowSaveModal(true)} style={{ opacity: 0.7 }}>
              + SAVE CURRENT AS PRESET
            </Button>
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
              {paperTexture ? '● PAPER MODE ON' : '○ PAPER MODE'}
            </Button>
            <p style={{ fontSize: '9px', color: '#444', margin: '8px 0 0 0' }}>
              Adds warm paper tint and texture overlay
            </p>
          </Section>
          
          {/* Gradient Map Section */}
          <Section title="GRADIENT MAP" defaultOpen={false}>
            <Button onClick={() => setGradientEnabled(!gradientEnabled)} active={gradientEnabled} style={{ marginBottom: '16px' }}>
              {gradientEnabled ? 'ENABLED' : 'DISABLED'}
            </Button>
            
            {gradientEnabled && (
              <>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  COLORS ({gradientColors.length}/4)
                </label>
                
                <div style={{ 
                  height: '24px', 
                  marginBottom: '16px', 
                  background: `linear-gradient(to right, ${gradientColors.map((c, i) => `${DOMO_PALETTE[c]?.hex || '#000'} ${(i / (gradientColors.length - 1)) * 100}%`).join(', ')})`,
                  border: '1px solid #333'
                }} />
                
                {gradientColors.map((colorKey, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: '#666', fontSize: '10px' }}>STOP {i + 1}</span>
                      {gradientColors.length > 2 && (
                        <IconButton onClick={() => removeGradientColor(i)} style={{ marginLeft: 'auto' }}>×</IconButton>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {ALL_COLOR_KEYS.map(key => (
                        <ColorSwatch
                          key={key}
                          colorKey={key}
                          color={DOMO_PALETTE[key]}
                          selected={colorKey === key}
                          onClick={() => {
                            const newColors = [...gradientColors];
                            newColors[i] = key;
                            setGradientColors(newColors);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {gradientColors.length < 4 && (
                  <Button onClick={addGradientColor} style={{ marginBottom: '16px' }}>+ ADD STOP</Button>
                )}
                
                <div style={{ borderTop: '1px solid #222', paddingTop: '16px', marginTop: '8px' }}>
                  <AlgorithmSelect value={gradientDitherType} onChange={setGradientDitherType} includeNone />
                  
                  {gradientDitherType !== 'none' && (
                    <>
                      <Slider label={`DENSITY ${Math.round(gradientDitherThreshold * 100)}%`} value={gradientDitherThreshold} min={0} max={1} step={0.01} onChange={setGradientDitherThreshold} />
                      {gradientAlgoInfo?.hasScale && (
                        <Slider label={`SIZE ${gradientDitherScale}px`} value={gradientDitherScale} min={2} max={32} step={1} onChange={setGradientDitherScale} />
                      )}
                      {gradientAlgoInfo?.hasAngle && (
                        <Slider label={`ANGLE ${gradientDitherAngle}°`} value={gradientDitherAngle} min={0} max={180} step={5} onChange={setGradientDitherAngle} />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </Section>
          
          {/* Layers Section */}
          {!gradientEnabled && (
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
                />
              ))}
              {layers.length < 4 && (
                <Button onClick={addLayer}>+ ADD LAYER</Button>
              )}
            </Section>
          )}
          
          {/* Output Section */}
          <Section title="OUTPUT">
            <ColorPicker 
              value={backgroundColor === '#ffffff' ? 'white' : backgroundColor === '#000000' ? 'black' : ''} 
              onChange={(k) => setBackgroundColor(DOMO_PALETTE[k].hex)} 
              label="BACKGROUND" 
              showAll 
            />
            
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
                <Button onClick={exportSVG}>EXPORT SVG</Button>
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
