// Curated dither algorithms (removed digital-looking ones: checker, grid, diagonal)
export const DITHER_ALGORITHMS = {
  none: { name: 'NONE', category: 'none', hasScale: false, hasAngle: false, description: 'No dithering applied' },
  bayer2x2: { name: 'BAYER 2×2', category: 'ordered', hasScale: true, hasAngle: false, description: 'Small ordered pattern, creates a fine crosshatch texture' },
  bayer4x4: { name: 'BAYER 4×4', category: 'ordered', hasScale: true, hasAngle: false, description: 'Medium ordered pattern, classic retro computer look' },
  bayer8x8: { name: 'BAYER 8×8', category: 'ordered', hasScale: true, hasAngle: false, description: 'Large ordered pattern, smoother gradients with visible structure' },
  floydSteinberg: { name: 'FLOYD-STEINBERG', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Classic error diffusion, natural-looking results' },
  atkinson: { name: 'ATKINSON', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Mac-style dithering, higher contrast, iconic look' },
  stucki: { name: 'STUCKI', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Sharper than Floyd-Steinberg, larger diffusion kernel' },
  sierra: { name: 'SIERRA', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Classic 3-row error diffusion, balanced results' },
  sierraTwoRow: { name: 'SIERRA TWO-ROW', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Faster 2-row Sierra variant, good quality' },
  sierraLite: { name: 'SIERRA LITE', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Lightweight Sierra, fast with decent quality' },
  blueNoise: { name: 'BLUE NOISE', category: 'other', hasScale: true, hasAngle: false, description: 'Smooth gradients, high-quality threshold dithering' },
  riemersma: { name: 'RIEMERSMA', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Hilbert curve dithering, unique organic pattern' },
  halftoneCircle: { name: 'HALFTONE DOTS', category: 'halftone', hasScale: true, hasAngle: true, description: 'Traditional print dots, size varies with tone' },
  halftoneLines: { name: 'HALFTONE LINES', category: 'halftone', hasScale: true, hasAngle: true, description: 'Engraving-style lines, width varies with tone' },
  halftoneSquare: { name: 'HALFTONE SQUARES', category: 'halftone', hasScale: true, hasAngle: true, description: 'Square dots for a more geometric look' },
  noise: { name: 'NOISE/STIPPLE', category: 'other', hasScale: true, hasAngle: false, description: 'Random stipple pattern, organic texture' },
};
