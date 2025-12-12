'use client';

import { ColorSwatch, LayerColorDropdown } from './ColorPicker';
import Section from './Section';

export default function BackgroundPropertiesPanel({
  backgroundColor,
  onBackgroundColorChange,
  backgroundColorKey,
  palette,
  colorKeys
}) {
  return (
    <div>
      {/* Background Color Section */}
      <Section title="BACKGROUND COLOR" defaultOpen={true}>
        <p style={{
          fontSize: '9px',
          color: '#444',
          margin: '0 0 12px 0'
        }}>
          Select background color
        </p>

        <div style={{ marginBottom: '16px' }}>
          <LayerColorDropdown
            value={backgroundColorKey || backgroundColor}
            onChange={onBackgroundColorChange}
            palette={palette}
            // Background panel doesn't support updating palette colors in-place currently
            // or we could pass a handler if desired, but for now matching safe implementation
            onUpdatePaletteColor={null}
          />
        </div>

        {/* Black and white options */}
        <label style={{
          display: 'block',
          color: '#666',
          fontSize: '10px',
          marginBottom: '8px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          NEUTRALS
        </label>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <ColorSwatch
            color="#000000"
            selected={backgroundColor === '#000000'}
            onClick={() => onBackgroundColorChange('#000000')}
            size={36}
          />
          <ColorSwatch
            color="#FFFFFF"
            selected={backgroundColor === '#FFFFFF' || backgroundColor === '#ffffff'}
            onClick={() => onBackgroundColorChange('#FFFFFF')}
            size={36}
          />
        </div>
      </Section>
    </div>
  );
}




