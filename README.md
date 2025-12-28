# Domo Dither Tool

An exploration of generative brand systems through dithering algorithms. This tool demonstrates the "designer as gardener" methodology - creating conditions for coherent visual variation rather than rigid control.

## About

This project explores how brand systems can move beyond static guidelines to create parameters for visual coherence. It applies various dithering algorithms (halftone patterns, error diffusion, ordered dithering) with the Domo color palette to transform images into screenprint-style compositions.

Built as a research & development exploration of:
- Generative design systems
- Coherence over control philosophy
- Multi-layer color separation
- Analog print effects (misregistration, ink bleed)

## Features

- **Multiple dithering algorithms**: Halftone dots/lines/squares, Bayer matrices, Floyd-Steinberg, Atkinson, noise, organic stipple with density variation
- **Layer system**: Up to 4 color layers with individual patterns, offsets, and blend modes
- **Gradient mapping**: Multi-stop color gradients with optional dithering
- **Analog effects**: Ink bleed simulation, paper texture overlay
- **Preset system**: Built-in presets (including new RGB Split) + save your own custom combinations
- **Export options**: PNG export (1x, 2x, 4x resolution) + SVG export with layer separation
- **Viewport architecture**: Fixed canvas window with image positioning for precise framing
- **Pre-blur**: Apply blur before dithering for softer results
- **Transparency control**: Toggle background visibility for transparent exports
- **Aspect ratio presets**: Quick 1:1 and 9:16 viewport sizing

## Tech Stack

- Next.js 14+ with App Router
- React 18+ with Hooks
- Canvas API for image processing
- Custom dithering algorithms
- SVG generation for vector exports

## Development

This was built in collaboration with Claude AI as an exploration of "vibe coding" - rapid prototyping of visual tools through conversational development.

### Local Development

To run this locally, you'll need Node.js 18+ installed. Then:

```bash
npm install
npm run dev
```

This will start a Next.js development server at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

This creates an optimized production build using Next.js.

## Deployment

### Vercel (Recommended)

The easiest way to deploy a Next.js app is through Vercel:

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your repository
5. Vercel will automatically detect Next.js and configure the build
6. Deploy!

### Netlify

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Select your repository
5. Build command: `npm run build`
6. Publish directory: `.next`
7. Deploy!

### Other Platforms

Next.js can be deployed to any platform that supports Node.js. The build output is in the `.next` directory.

## Design Philosophy

This tool embodies the concept of **coherence over control** - rather than dictating specific outputs, it creates parameters within which coherent variations can emerge. The designer acts as a gardener, tending to conditions rather than controlling every outcome.

The multi-layer system with offsets mimics screenprinting misregistration, while ink bleed effects simulate capillary action on paper fibers. These "imperfections" become part of the visual identity system.

## Project Context

Created by Floris van Driel at Vandejong Creative Agency as exploration of methodology for flexible brand systems. This represents R&D work exploring how brand guidelines could function more like product systems - with parameters and rules rather than static templates.

## License

MIT License - feel free to use, modify, and build upon this work.

## Credits

- Design & concept: Floris van Driel
- Development: Collaborative work with Claude AI
- Agency: Vandejong Creative Agency, Amsterdam
