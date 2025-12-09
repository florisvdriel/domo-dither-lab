---
name: Increase Layer Palette Limits
overview: Increase the maximum number of layers from 4 to 10 and expand the color palette from 4 to 8 colors, updating all hardcoded limits and UI components to support the new maximums.
todos:
  - id: expand-palette
    content: Expand DEFAULT_PALETTE to 8 colors in palette.js
    status: completed
  - id: update-layer-limits
    content: Update layer limit from 4 to 10 in App.jsx (addLayer, duplicateLayer)
    status: completed
  - id: update-randomize-palette
    content: Update randomizePalette() to generate 8 colors
    status: completed
  - id: update-composition-panel
    content: Update CompositionPanel layer limit check
    status: completed
  - id: add-algorithm-metadata
    content: Add metadata for 6 new dither algorithms in ditherAlgorithms.js
    status: completed
  - id: implement-blue-noise
    content: Implement blueNoise dithering algorithm
    status: completed
  - id: implement-stucki
    content: Implement stucki error diffusion algorithm
    status: completed
  - id: implement-sierra-variants
    content: Implement sierra, sierraTwoRow, sierraLite algorithms
    status: completed
  - id: implement-riemersma
    content: Implement riemersma (Hilbert curve) dithering algorithm
    status: completed
---

# Increase Layer and Palette Limits

## Overview

Expand the application limits:

- **Layers**: 4 → 10 maximum
- **Palette colors**: 4 → 8 colors

## Changes Required

### 1. Constants Update

**[`app/constants/palette.js`](app/constants/palette.js)**

- Expand `DEFAULT_PALETTE` from 4 to 8 colors (add 4 new colors: plum, olive, slate, peach)
- Update `COLOR_KEYS` array to include all 8 color keys

### 2. App.jsx Layer Limit Updates

**[`app/components/App.jsx`](app/components/App.jsx)**

- Line 221: Change `layers.length < 4` → `layers.length < 10` in `addLayer()`
- Line 245: Change `layers.length >= 4` → `layers.length >= 10` in `duplicateLayer()`
- Lines 422-429: Update `randomizePalette()` to generate 8 colors instead of 4

### 3. CompositionPanel Update

**[`app/components/ui/CompositionPanel.jsx`](app/components/ui/CompositionPanel.jsx)**

- Line 176: Change `layers.length < 4` → `layers.length < 10`
- Update palette grid from 4 columns to accommodate 8 swatches (2 rows of 4)

### 4. UI Layout Adjustments

The palette section already uses a 4-column grid, so 8 colors will naturally wrap to 2 rows. No structural changes needed, but we should verify the layout looks good.

## Part 2: New Dither Algorithms

### New Algorithms to Add

1. **Blue Noise** - Smooth gradients, very popular for high-quality dithering
2. **Stucki** - Sharper than Floyd-Steinberg, larger error diffusion kernel
3. **Sierra** - Classic error diffusion with 3-row kernel
4. **Sierra Two-Row** - Faster 2-row variant of Sierra
5. **Sierra Lite** - Lightweight single-row variant
6. **Riemersma** - Space-filling curve dithering, unique organic look

### Files to Modify

**[`app/constants/ditherAlgorithms.js`](app/constants/ditherAlgorithms.js)**

- Add metadata entries for all 6 new algorithms
- All are diffusion-type with `hasScale: true, hasAngle: false`

**[`app/utils/dithering.js`](app/utils/dithering.js)**

- Implement `blueNoise` - uses precomputed blue noise texture for threshold
- Implement `stucki` - error diffusion with 42-divisor kernel
- Implement `sierra` - error diffusion with 32-divisor kernel  
- Implement `sierraTwoRow` - error diffusion with 16-divisor kernel
- Implement `sierraLite` - error diffusion with 4-divisor kernel
- Implement `riemersma` - Hilbert curve-based error diffusion

### Algorithm Details

**Error Diffusion Kernels:**

```
Stucki (÷42):        Sierra (÷32):       Sierra Two-Row (÷16):
    *  8  4              *  5  3              *  4  3
2  4  8  4  2        2  4  5  4  2          1  2  3  2  1
1  2  4  2  1           2  3  2

Sierra Lite (÷4):
    *  2
1  1
```

**Blue Noise:** Uses a precomputed 64x64 blue noise texture as threshold map, tiled across image.

**Riemersma:** Follows a Hilbert space-filling curve, distributing error along the path for a unique organic pattern.

## Implementation Notes

- The layer limit is enforced in 3 places (add, duplicate, UI display)
- The palette limit is enforced during randomization
- Color assignment for new layers uses modulo with colorKeys length, so it will automatically cycle through all 8 colors
- Existing presets reference color keys by name (coral, teal, etc.) so they remain compatible
- New algorithms follow the same signature pattern: `(imageData, threshold, scale)` for diffusion types