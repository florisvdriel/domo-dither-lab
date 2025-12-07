// Local storage helpers for custom presets
export function loadCustomPresets() {
  try {
    const saved = localStorage.getItem('domo-dither-presets');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function saveCustomPresets(presets) {
  try {
    localStorage.setItem('domo-dither-presets', JSON.stringify(presets));
  } catch (e) {
    console.warn('Could not save presets:', e);
  }
}

