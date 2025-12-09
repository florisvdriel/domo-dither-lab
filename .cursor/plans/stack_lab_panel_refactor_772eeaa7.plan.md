---
name: Stack Lab Panel Refactor
overview: "Refactor the UI to a context-sensitive right panel architecture where the left sidebar shows composition (source, layers, palette) and the right panel dynamically displays properties based on selection: Project Properties (default), Image Properties (source selected), or Layer Properties (layer selected)."
todos:
  - id: selection-state
    content: Add selection state management to App.jsx
    status: completed
  - id: right-panel-container
    content: Create RightPanel.jsx container with panel switching logic
    status: completed
  - id: project-properties
    content: Create ProjectPropertiesPanel with presets, analog effects, export
    status: completed
  - id: image-properties
    content: Create ImagePropertiesPanel with source adjustments
    status: completed
  - id: layer-properties
    content: Create LayerPropertiesPanel (extract controls from LayerPanel)
    status: completed
  - id: background-properties
    content: Create BackgroundPropertiesPanel for background settings
    status: completed
  - id: compact-layer-item
    content: Refactor LayerPanel to compact LayerItem for left sidebar
    status: completed
  - id: composition-panel
    content: Create CompositionPanel for left sidebar layer stack
    status: completed
  - id: integrate-layout
    content: Update App.jsx layout to use new panel components
    status: completed
  - id: rename-stack-lab
    content: Rename application header from HALFTONE LAB to STACK LAB
    status: completed
---

# Stack Lab - Context-Sensitive Panel Refactor

## Architecture Overview

Transform the current single-sidebar layout into a three-column architecture:

- **Left Sidebar** (240px): Composition panel with source thumbnail, layer stack, and palette
- **Center**: Canvas/viewport area (unchanged)
- **Right Panel** (320px): Context-sensitive properties panel

## Selection State System

Add a new selection state to [`App.jsx`](app/components/App.jsx) that tracks what is currently selected:

```javascript
const [selection, setSelection] = useState({ type: 'project', id: null });
// type: 'project' | 'source' | 'background' | 'layer'
// id: layer.id when type === 'layer'
```

## Left Sidebar Restructure

### Source Section (Compact)

- Small thumbnail of source image (clickable to select)
- "CHANGE IMAGE" and "RESET" buttons
- "Click to adjust the image" helper text

### Composition Section

- **Background item**: Clickable row with visibility toggle and color indicator
- **Layer items**: Compact rows showing:
  - Visibility toggle (eye icon)
  - Color indicator stripe
  - Layer number + algorithm name (e.g., "LAYER 1 / HALFTONE DOTS")
  - Drag handle, duplicate, delete icons
- **Add Layer button** at bottom

### Palette Section

- 8 color swatches in 2 rows (4x2 grid)
- "RANDOMIZE" button
- "Click swatches to edit colors" helper

## Right Panel - Three States

### 1. Project Properties (default, `selection.type === 'project'`)

- **Presets**: DEFAULT/CUSTOM tabs, RANDOMIZE button, preset grid (SUBTLE, BOLD, CMYK, RETRO, DUOTONE, RGB SPLIT)
- **Analog Effects**: INK BLEED toggle with SPREAD/ROUGHNESS sliders, PAPER MODE toggle
- **Export**: Background color swatches, Resolution buttons (1x/2x/4x), EXPORT PNG, SVG options

### 2. Image Properties (`selection.type === 'source'`)

- **Adjustments section**:
  - SCALE slider (100%)
  - PRE BLUR slider (2px)
  - BRIGHTNESS slider (0)
  - CONTRAST slider (0)
  - INVERT / RESET buttons

### 3. Layer Properties (`selection.type === 'layer'`)

Move all current LayerPanel controls here:

- Color picker (palette swatches)
- Algorithm select dropdown
- DENSITY slider
- SIZE slider (if applicable)
- ANGLE slider (if applicable)
- OFFSET X/Y sliders
- BLEND mode dropdown
- OPACITY slider

### 4. Background Properties (`selection.type === 'background'`)

- Background color picker (palette swatches + black/white)
- Visibility toggle

## File Changes

### New Components

1. **`RightPanel.jsx`**: Container that renders the appropriate panel based on selection
2. **`ProjectPropertiesPanel.jsx`**: Presets, analog effects, export
3. **`ImagePropertiesPanel.jsx`**: Source image adjustments
4. **`LayerPropertiesPanel.jsx`**: Layer-specific controls (extracted from LayerPanel)
5. **`BackgroundPropertiesPanel.jsx`**: Background settings
6. **`CompositionPanel.jsx`**: Left sidebar layer stack with compact layer items

### Modified Components

- **[`App.jsx`](app/components/App.jsx)**: Add selection state, restructure layout, wire up panel switching
- **[`LayerPanel.jsx`](app/components/ui/LayerPanel.jsx)**: Convert to compact "LayerItem" for left sidebar (just header row, no expanded controls)

### Rename

- Update header from "HALFTONE LAB" to "STACK LAB"

## Implementation Order

1. Add selection state management to App.jsx
2. Create RightPanel container with panel switching logic
3. Extract and create ProjectPropertiesPanel (presets + analog effects + export)
4. Create ImagePropertiesPanel (move source adjustments)
5. Create LayerPropertiesPanel (extract from LayerPanel)
6. Create BackgroundPropertiesPanel
7. Refactor LayerPanel to compact LayerItem
8. Create CompositionPanel for left sidebar
9. Update App.jsx layout to use new components
10. Rename to STACK LAB