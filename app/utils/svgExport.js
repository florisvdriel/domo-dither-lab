/**
 * SVG Export Utilities for Halftone Lab
 * Generates optimized, layered SVG files for print and digital workflows
 */

import { DEFAULT_PALETTE } from '../constants/palette';
import { DITHER_ALGORITHMS } from '../constants/ditherAlgorithms';
import { getGray } from './helpers';

// Coordinate precision for file size optimization
const PRECISION = 1;
const round = (n) => Math.round(n * 10) / 10;

// Minimum element size threshold (skip elements smaller than this)
const MIN_ELEMENT_SIZE = 0.5;

/**
 * Generate SVG content for a single layer
 * @param {Object} palette - The active color palette to use
 */
export function generateLayerSVG(layer, sourceImageData, dimensions, options = {}, palette = DEFAULT_PALETTE) {
  const { width, height } = dimensions;
  const { scaleFactor = 1, includeWrapper = true } = options;
  
  const color = palette[layer.colorKey];
  if (!color) return '';
  
  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
  let elements = '';
  
  // Generate pattern based on algorithm type
  if (algoInfo?.category === 'halftone') {
    if (layer.ditherType === 'halftoneCircle') {
      elements = generateHalftoneCircles(layer, sourceImageData, dimensions, scaleFactor);
    } else if (layer.ditherType === 'halftoneSquare') {
      elements = generateHalftoneSquares(layer, sourceImageData, dimensions, scaleFactor);
    } else if (layer.ditherType === 'halftoneLines') {
      elements = generateHalftoneLines(layer, sourceImageData, dimensions, scaleFactor);
    }
  } else if (algoInfo?.category === 'ordered') {
    elements = generateBayerPattern(layer, sourceImageData, dimensions, scaleFactor);
  } else if (algoInfo?.category === 'diffusion') {
    elements = generateErrorDiffusionPaths(layer, sourceImageData, dimensions, scaleFactor);
  } else if (layer.ditherType === 'noise') {
    elements = generateNoiseStipple(layer, sourceImageData, dimensions, scaleFactor);
  }
  
  if (!includeWrapper) {
    return elements;
  }
  
  const blendMode = layer.blendMode || 'multiply';
  return `  <g id="${color.name.replace(/\s+/g, '-')}" fill="${color.hex}" opacity="${layer.opacity}" style="mix-blend-mode: ${blendMode};">\n${elements}  </g>\n`;
}

/**
 * Generate halftone circles pattern
 */
function generateHalftoneCircles(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  
  const step = Math.max(3, Math.floor(layer.scale * scaleFactor));
  const maxRadius = step * 0.48;
  const rad = (layer.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const radiusMultiplier = maxRadius * (0.6 + layer.threshold * 0.7);
  const wHalf = width * 0.5;
  const hHalf = height * 0.5;
  
  // Calculate tight grid bounds
  const diagonal = Math.sqrt(width * width + height * height);
  const gridExtent = diagonal * 0.6;
  const minGrid = -gridExtent;
  const maxGrid = gridExtent;
  
  let svg = '';
  const circles = [];
  
  for (let gy = minGrid; gy <= maxGrid; gy += step) {
    for (let gx = minGrid; gx <= maxGrid; gx += step) {
      // Apply layer offsets
      const offsetGx = gx - (layer.offsetX * scaleFactor);
      const offsetGy = gy - (layer.offsetY * scaleFactor);
      const cx = offsetGx * cos - offsetGy * sin + wHalf;
      const cy = offsetGx * sin + offsetGy * cos + hHalf;
      
      // Bounds check
      if (cx < -step || cx >= width + step || cy < -step || cy >= height + step) continue;
      
      // Sample from source image
      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(cx * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(cy * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;
      
      if (idx + 2 < data.length) {
        const gray = getGray(data, idx);
        const darkness = 1 - gray;
        const radius = Math.sqrt(darkness) * radiusMultiplier;
        
        if (radius >= MIN_ELEMENT_SIZE) {
          circles.push({ cx: round(cx), cy: round(cy), r: round(radius) });
        }
      }
    }
  }
  
  // Generate optimized SVG - batch similar radii
  for (const c of circles) {
    svg += `    <circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>\n`;
  }
  
  return svg;
}

/**
 * Generate halftone squares pattern
 */
function generateHalftoneSquares(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  
  const step = Math.max(3, Math.floor(layer.scale * scaleFactor));
  const maxSize = step * 0.85;
  const rad = (layer.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sizeMultiplier = maxSize * (0.4 + layer.threshold * 0.6);
  const wHalf = width * 0.5;
  const hHalf = height * 0.5;
  
  const diagonal = Math.sqrt(width * width + height * height);
  const gridExtent = diagonal * 0.6;
  const minGrid = -gridExtent;
  const maxGrid = gridExtent;
  
  let svg = '';
  
  for (let gy = minGrid; gy <= maxGrid; gy += step) {
    for (let gx = minGrid; gx <= maxGrid; gx += step) {
      const offsetGx = gx - (layer.offsetX * scaleFactor);
      const offsetGy = gy - (layer.offsetY * scaleFactor);
      const cx = offsetGx * cos - offsetGy * sin + wHalf;
      const cy = offsetGx * sin + offsetGy * cos + hHalf;
      
      if (cx < -step || cx >= width + step || cy < -step || cy >= height + step) continue;
      
      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(cx * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(cy * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;
      
      if (idx + 2 < data.length) {
        const gray = getGray(data, idx);
        const darkness = 1 - gray;
        const size = Math.sqrt(darkness) * sizeMultiplier;
        
        if (size >= MIN_ELEMENT_SIZE) {
          const halfSize = size * 0.5;
          // For rotated squares, use transform
          if (layer.angle !== 0) {
            svg += `    <rect x="${round(-halfSize)}" y="${round(-halfSize)}" width="${round(size)}" height="${round(size)}" transform="translate(${round(cx)},${round(cy)}) rotate(${layer.angle})"/>\n`;
          } else {
            svg += `    <rect x="${round(cx - halfSize)}" y="${round(cy - halfSize)}" width="${round(size)}" height="${round(size)}"/>\n`;
          }
        }
      }
    }
  }
  
  return svg;
}

/**
 * Generate halftone lines pattern - uses paths for efficiency
 */
function generateHalftoneLines(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  
  const spacing = Math.max(3, layer.scale * scaleFactor);
  const rad = (layer.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const maxWidth = spacing * 0.7 * (0.5 + layer.threshold * 0.7);
  
  // Generate line segments with varying stroke widths
  const diagonal = Math.sqrt(width * width + height * height);
  const numLines = Math.ceil(diagonal / spacing) * 2;
  
  let svg = '';
  
  for (let i = -numLines; i <= numLines; i++) {
    const lineOffset = i * spacing - (layer.offsetX * scaleFactor);
    
    // Line endpoints (extend beyond canvas)
    const x1 = lineOffset * cos + diagonal * sin;
    const y1 = lineOffset * sin - diagonal * cos;
    const x2 = lineOffset * cos - diagonal * sin;
    const y2 = lineOffset * sin + diagonal * cos;
    
    // Sample along the line to determine stroke width
    const midX = (x1 + x2) / 2 + width / 2;
    const midY = (y1 + y2) / 2 + height / 2;
    
    const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(midX * srcWidth / width)));
    const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(midY * srcHeight / height)));
    const idx = (srcY * srcWidth + srcX) * 4;
    
    if (idx + 2 < data.length) {
      const gray = getGray(data, idx);
      const darkness = 1 - gray;
      const strokeWidth = Math.sqrt(darkness) * maxWidth;
      
      if (strokeWidth >= MIN_ELEMENT_SIZE) {
        svg += `    <line x1="${round(x1 + width/2)}" y1="${round(y1 + height/2)}" x2="${round(x2 + width/2)}" y2="${round(y2 + height/2)}" stroke="currentColor" stroke-width="${round(strokeWidth)}" fill="none"/>\n`;
      }
    }
  }
  
  return svg;
}

/**
 * Generate Bayer dither pattern using optimized path runs
 */
function generateBayerPattern(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  
  const pixelSize = Math.max(2, Math.floor(layer.scale * scaleFactor));
  const threshold = layer.threshold;
  
  // Get appropriate Bayer matrix size
  let matrixSize = 4;
  if (layer.ditherType === 'bayer2x2') matrixSize = 2;
  else if (layer.ditherType === 'bayer8x8') matrixSize = 8;
  
  // Generate bitmap of which cells are "on"
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);
  const bitmap = new Uint8Array(cols * rows);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize + pixelSize / 2;
      const y = row * pixelSize + pixelSize / 2;
      
      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(x * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(y * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;
      
      if (idx + 2 < data.length) {
        const gray = getGray(data, idx);
        const mx = col % matrixSize;
        const my = row % matrixSize;
        const bayerValue = getBayerValue(mx, my, matrixSize);
        const thresholdOffset = (threshold - 0.5) * 0.8;
        
        if (gray < bayerValue + thresholdOffset) {
          bitmap[row * cols + col] = 1;
        }
      }
    }
  }
  
  // Convert bitmap to optimized path using horizontal run-length encoding
  let pathData = '';
  
  for (let row = 0; row < rows; row++) {
    let runStart = -1;
    for (let col = 0; col <= cols; col++) {
      const isOn = col < cols && bitmap[row * cols + col];
      
      if (isOn && runStart === -1) {
        runStart = col;
      } else if (!isOn && runStart !== -1) {
        // End of run - add rectangle to path
        const x = runStart * pixelSize;
        const y = row * pixelSize;
        const w = (col - runStart) * pixelSize;
        const h = pixelSize;
        pathData += `M${round(x)},${round(y)}h${round(w)}v${round(h)}h${round(-w)}z`;
        runStart = -1;
      }
    }
  }
  
  if (pathData) {
    return `    <path d="${pathData}"/>\n`;
  }
  return '';
}

/**
 * Get Bayer matrix value
 */
function getBayerValue(x, y, size) {
  if (size === 2) {
    const m = [[0, 2], [3, 1]];
    return m[y % 2][x % 2] / 4;
  } else if (size === 4) {
    const m = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
    return m[y % 4][x % 4] / 16;
  } else {
    const m = [[0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],[12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],[3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],[15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
    return m[y % 8][x % 8] / 64;
  }
}

/**
 * Generate error diffusion pattern using contour paths
 */
function generateErrorDiffusionPaths(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  
  const pixelSize = Math.max(2, Math.floor(layer.scale * scaleFactor));
  const threshold = 80 + layer.threshold * 100;
  
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);
  
  // Create grayscale buffer for error diffusion
  const gray = new Float32Array(cols * rows);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize + pixelSize / 2;
      const y = row * pixelSize + pixelSize / 2;
      
      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(x * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(y * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;
      
      if (idx + 2 < data.length) {
        gray[row * cols + col] = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      }
    }
  }
  
  // Apply error diffusion (Floyd-Steinberg or Atkinson)
  const isAtkinson = layer.ditherType === 'atkinson';
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const oldPixel = gray[i];
      const newPixel = oldPixel > threshold ? 255 : 0;
      gray[i] = newPixel;
      const error = oldPixel - newPixel;
      
      if (isAtkinson) {
        const e = error / 8;
        if (col + 1 < cols) gray[i + 1] += e;
        if (col + 2 < cols) gray[i + 2] += e;
        if (row + 1 < rows) {
          if (col > 0) gray[i + cols - 1] += e;
          gray[i + cols] += e;
          if (col + 1 < cols) gray[i + cols + 1] += e;
        }
        if (row + 2 < rows) gray[i + cols * 2] += e;
      } else {
        // Floyd-Steinberg
        if (col + 1 < cols) gray[i + 1] += error * 7 / 16;
        if (row + 1 < rows) {
          if (col > 0) gray[i + cols - 1] += error * 3 / 16;
          gray[i + cols] += error * 5 / 16;
          if (col + 1 < cols) gray[i + cols + 1] += error * 1 / 16;
        }
      }
    }
  }
  
  // Convert to bitmap and generate path
  let pathData = '';
  
  for (let row = 0; row < rows; row++) {
    let runStart = -1;
    for (let col = 0; col <= cols; col++) {
      const isOn = col < cols && gray[row * cols + col] < 128;
      
      if (isOn && runStart === -1) {
        runStart = col;
      } else if (!isOn && runStart !== -1) {
        const x = runStart * pixelSize;
        const y = row * pixelSize;
        const w = (col - runStart) * pixelSize;
        const h = pixelSize;
        pathData += `M${round(x)},${round(y)}h${round(w)}v${round(h)}h${round(-w)}z`;
        runStart = -1;
      }
    }
  }
  
  if (pathData) {
    return `    <path d="${pathData}"/>\n`;
  }
  return '';
}

/**
 * Generate noise/stipple pattern
 */
function generateNoiseStipple(layer, sourceImageData, dimensions, scaleFactor) {
  const { width, height } = dimensions;
  const data = sourceImageData.data;
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  
  const pixelSize = Math.max(2, Math.floor(layer.scale * scaleFactor));
  const decisionThreshold = 0.3 + (1 - layer.threshold) * 0.4;
  
  let svg = '';
  const dotRadius = pixelSize * 0.4;
  
  // Seeded random for consistency
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const cols = Math.ceil(width / pixelSize);
  const rows = Math.ceil(height / pixelSize);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * pixelSize + pixelSize / 2;
      const y = row * pixelSize + pixelSize / 2;
      
      const srcX = Math.max(0, Math.min(srcWidth - 1, Math.round(x * srcWidth / width)));
      const srcY = Math.max(0, Math.min(srcHeight - 1, Math.round(y * srcHeight / height)));
      const idx = (srcY * srcWidth + srcX) * 4;
      
      if (idx + 2 < data.length) {
        const gray = getGray(data, idx);
        const noise = seededRandom(row * cols + col + 0.5);
        const adjustedThreshold = decisionThreshold + (noise - 0.5) * 0.25;
        
        if (gray < adjustedThreshold && dotRadius >= MIN_ELEMENT_SIZE) {
          svg += `    <circle cx="${round(x)}" cy="${round(y)}" r="${round(dotRadius)}"/>\n`;
        }
      }
    }
  }
  
  return svg;
}

/**
 * Generate complete SVG with all layers combined
 * @param {Object} palette - The active color palette to use
 */
export function generateCombinedSVG(layers, sourceImageData, dimensions, backgroundColor, options = {}, palette = DEFAULT_PALETTE) {
  const { width, height } = dimensions;
  const { scaleFactor = 1 } = options;
  
  const svgWidth = round(width);
  const svgHeight = round(height);
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
  svg += `  <rect id="background" width="100%" height="100%" fill="${backgroundColor}"/>\n`;
  
  // Generate each visible layer
  layers.forEach((layer, index) => {
    if (layer.visible === false) return;
    svg += generateLayerSVG(layer, sourceImageData, dimensions, { scaleFactor, includeWrapper: true }, palette);
  });
  
  svg += `</svg>`;
  
  return svg;
}

/**
 * Generate individual layer SVG (for separate export)
 * @param {Object} palette - The active color palette to use
 */
export function generateSingleLayerSVG(layer, sourceImageData, dimensions, backgroundColor, options = {}, palette = DEFAULT_PALETTE) {
  const { width, height } = dimensions;
  const { scaleFactor = 1 } = options;
  const color = palette[layer.colorKey];
  
  const svgWidth = round(width);
  const svgHeight = round(height);
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">\n`;
  svg += `  <rect id="background" width="100%" height="100%" fill="${backgroundColor}"/>\n`;
  svg += generateLayerSVG(layer, sourceImageData, dimensions, { scaleFactor, includeWrapper: true }, palette);
  svg += `</svg>`;
  
  return svg;
}

/**
 * Download SVG as file
 */
export function downloadSVG(svgContent, filename) {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Estimate SVG file size (rough approximation)
 */
export function estimateSVGSize(layers, dimensions, scaleFactor = 1) {
  const { width, height } = dimensions;
  let totalElements = 0;
  
  layers.forEach(layer => {
    if (layer.visible === false) return;
    
    const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
    const step = Math.max(3, Math.floor(layer.scale * scaleFactor));
    
    if (algoInfo?.category === 'halftone') {
      // Grid-based: estimate number of dots
      totalElements += Math.ceil(width / step) * Math.ceil(height / step);
    } else {
      // Pixel-based: more elements
      const pixelSize = Math.max(2, Math.floor(layer.scale * scaleFactor));
      totalElements += Math.ceil(width / pixelSize) * Math.ceil(height / pixelSize) * 0.5; // ~50% coverage
    }
  });
  
  // Rough bytes per element (circle ~40 bytes, rect ~35 bytes, path segment ~10 bytes)
  const bytesPerElement = 30;
  const overhead = 500; // SVG header, groups, etc.
  
  return overhead + totalElements * bytesPerElement;
}

/**
 * Export all layers as separate SVG files in a ZIP archive
 * @param {Object} palette - The active color palette to use
 */
export async function exportLayersAsZip(layers, sourceImageData, dimensions, backgroundColor, options = {}, palette = DEFAULT_PALETTE) {
  // Dynamically import JSZip to avoid SSR issues
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  const { scaleFactor = 1 } = options;
  const visibleLayers = layers.filter(layer => layer.visible !== false);
  
  // Add background SVG
  const bgSvg = generateBackgroundSVG(dimensions, backgroundColor);
  zip.file('00-background.svg', bgSvg);
  
  // Add each layer as separate SVG
  visibleLayers.forEach((layer, index) => {
    const color = palette[layer.colorKey];
    const layerName = color ? color.name.toLowerCase().replace(/\s+/g, '-') : `layer-${index + 1}`;
    const filename = `${String(index + 1).padStart(2, '0')}-${layerName}.svg`;
    
    const svg = generateSingleLayerSVG(layer, sourceImageData, dimensions, 'transparent', { scaleFactor }, palette);
    zip.file(filename, svg);
  });
  
  // Generate and download ZIP
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'halftone-layers.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate background-only SVG
 */
function generateBackgroundSVG(dimensions, backgroundColor) {
  const { width, height } = dimensions;
  const svgWidth = round(width);
  const svgHeight = round(height);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
  <rect id="background" width="100%" height="100%" fill="${backgroundColor}"/>
</svg>`;
}
