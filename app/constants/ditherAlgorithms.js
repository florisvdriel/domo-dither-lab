// Domo Halftone Lab Algorithms
// Only keeping the specific requested list: Bayer 2/4/8, Floyd-Steinberg, Atkinson, Stucki, Riemersma, Noise Stipple, Organic Stipple.

export const DITHER_ALGORITHMS = {
  bayer2x2: { name: 'BAYER 2×2', category: 'ordered', hasScale: true, hasAngle: false, description: 'Small ordered pattern, creates a fine crosshatch texture' },
  bayer4x4: { name: 'BAYER 4×4', category: 'ordered', hasScale: true, hasAngle: false, description: 'Medium ordered pattern, classic retro computer look' },
  bayer8x8: { name: 'BAYER 8×8', category: 'ordered', hasScale: true, hasAngle: false, description: 'Large ordered pattern, smoother gradients with visible structure' },
  floydSteinberg: { name: 'FLOYD-STEINBERG', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Classic error diffusion, natural-looking results' },
  atkinson: { name: 'ATKINSON', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Mac-style dithering, higher contrast, iconic look' },
  stucki: { name: 'STUCKI', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Sharper than Floyd-Steinberg, larger diffusion kernel' },
  riemersma: { name: 'RIEMERSMA', category: 'diffusion', hasScale: true, hasAngle: false, description: 'Hilbert curve dithering, unique organic pattern' },
  noise: { name: 'NOISE STIPPLE', category: 'other', hasScale: true, hasAngle: false, description: 'Random stipple pattern, organic texture' },
  organicStipple: { name: 'ORGANIC STIPPLE', category: 'other', hasScale: true, hasAngle: false, description: 'Multi-pass jittered grid with density variation' },
};
