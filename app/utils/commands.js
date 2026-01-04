// Command Registry - Central place for all keyboard commands
// Designed to be extensible for future command bar (Cmd+K style)

export const COMMAND_CATEGORIES = {
  CANVAS: 'Canvas',
  LAYERS: 'Layers',
  EDITING: 'Editing',
  VIEW: 'View',
  HELP: 'Help'
};

// Command definitions with metadata
export const COMMANDS = {
  // Canvas controls
  ZOOM_IN: {
    id: 'zoom-in',
    name: 'Zoom In',
    description: 'Zoom into the canvas',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: '=', modifiers: ['meta'] }, // Cmd/Ctrl + =
      { key: '+', modifiers: ['meta'] }  // Cmd/Ctrl + + (shift+=)
    ],
    handler: null // Will be set when registering
  },

  ZOOM_OUT: {
    id: 'zoom-out',
    name: 'Zoom Out',
    description: 'Zoom out of the canvas',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: '-', modifiers: ['meta'] }
    ],
    handler: null
  },

  ZOOM_RESET: {
    id: 'zoom-reset',
    name: 'Reset Zoom',
    description: 'Reset zoom to 100%',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: '0', modifiers: [] }
    ],
    handler: null
  },

  PAN_LEFT: {
    id: 'pan-left',
    name: 'Pan Left',
    description: 'Move canvas left',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: 'ArrowLeft', modifiers: [] }
    ],
    handler: null
  },

  PAN_RIGHT: {
    id: 'pan-right',
    name: 'Pan Right',
    description: 'Move canvas right',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: 'ArrowRight', modifiers: [] }
    ],
    handler: null
  },

  PAN_UP: {
    id: 'pan-up',
    name: 'Pan Up',
    description: 'Move canvas up',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: 'ArrowUp', modifiers: [] }
    ],
    handler: null
  },

  PAN_DOWN: {
    id: 'pan-down',
    name: 'Pan Down',
    description: 'Move canvas down',
    category: COMMAND_CATEGORIES.CANVAS,
    shortcuts: [
      { key: 'ArrowDown', modifiers: [] }
    ],
    handler: null
  },

  // Comparison slider
  SLIDER_LEFT: {
    id: 'slider-left',
    name: 'Move Slider Left',
    description: 'Show more processed image',
    category: COMMAND_CATEGORIES.VIEW,
    shortcuts: [
      { key: 'ArrowLeft', modifiers: [], context: 'comparison' }
    ],
    handler: null
  },

  SLIDER_RIGHT: {
    id: 'slider-right',
    name: 'Move Slider Right',
    description: 'Show more original image',
    category: COMMAND_CATEGORIES.VIEW,
    shortcuts: [
      { key: 'ArrowRight', modifiers: [], context: 'comparison' }
    ],
    handler: null
  },

  // Layer controls
  LAYER_UP: {
    id: 'layer-up',
    name: 'Move Layer Up',
    description: 'Move selected layer up in stack',
    category: COMMAND_CATEGORIES.LAYERS,
    shortcuts: [
      { key: 'ArrowUp', modifiers: ['alt'] }
    ],
    handler: null
  },

  LAYER_DOWN: {
    id: 'layer-down',
    name: 'Move Layer Down',
    description: 'Move selected layer down in stack',
    category: COMMAND_CATEGORIES.LAYERS,
    shortcuts: [
      { key: 'ArrowDown', modifiers: ['alt'] }
    ],
    handler: null
  },

  // Undo/Redo
  UNDO: {
    id: 'undo',
    name: 'Undo',
    description: 'Undo last action',
    category: COMMAND_CATEGORIES.EDITING,
    shortcuts: [
      { key: 'z', modifiers: ['meta'] }
    ],
    handler: null
  },

  REDO: {
    id: 'redo',
    name: 'Redo',
    description: 'Redo last undone action',
    category: COMMAND_CATEGORIES.EDITING,
    shortcuts: [
      { key: 'z', modifiers: ['meta', 'shift'] }
    ],
    handler: null
  },

  // Help
  SHOW_SHORTCUTS: {
    id: 'show-shortcuts',
    name: 'Show Keyboard Shortcuts',
    description: 'Display keyboard shortcuts reference',
    category: COMMAND_CATEGORIES.HELP,
    shortcuts: [
      { key: '?', modifiers: [] },
      { key: '/', modifiers: [] }
    ],
    handler: null
  }
};

// Utility to format shortcut for display
export function formatShortcut(shortcut) {
  const { key, modifiers = [] } = shortcut;
  const parts = [];

  // Map modifiers to display names
  const modifierMap = {
    meta: '⌘', // Mac Command / Windows Ctrl
    ctrl: 'Ctrl',
    alt: '⌥',  // Mac Option / Windows Alt
    shift: '⇧'
  };

  // Add modifiers in order
  const modifierOrder = ['meta', 'ctrl', 'shift', 'alt'];
  modifierOrder.forEach(mod => {
    if (modifiers.includes(mod)) {
      parts.push(modifierMap[mod]);
    }
  });

  // Add the key
  const keyMap = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    '=': '+',
    '-': '-',
    '0': '0',
    'z': 'Z',
    '?': '?',
    '/': '/'
  };

  parts.push(keyMap[key] || key.toUpperCase());

  return parts.join('');
}

// Check if a keyboard event matches a shortcut
export function matchesShortcut(event, shortcut) {
  const { key, modifiers = [] } = shortcut;

  // Check if key matches (case-insensitive)
  const keyMatches = event.key.toLowerCase() === key.toLowerCase() ||
                     event.key === key;

  if (!keyMatches) return false;

  // Check modifiers
  const hasShift = modifiers.includes('shift');
  const hasMeta = modifiers.includes('meta');
  const hasCtrl = modifiers.includes('ctrl');
  const hasAlt = modifiers.includes('alt');

  // Must match all required modifiers and not have extra ones
  const modifiersMatch =
    event.shiftKey === hasShift &&
    (event.metaKey || event.ctrlKey) === hasMeta &&
    event.altKey === hasAlt;

  return modifiersMatch;
}

// Group commands by category for display
export function getCommandsByCategory() {
  const grouped = {};

  Object.values(COMMANDS).forEach(command => {
    const category = command.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(command);
  });

  return grouped;
}
