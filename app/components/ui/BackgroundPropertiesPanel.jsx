'use client';

import { ColorSwatch } from './ColorPicker';
import Section from './CustomSection';

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {colorKeys.map((key) => {
              const color = palette[key];
              if (!color) return null;
              return (
                <ColorSwatch
                  key={key}
                  color={color.hex}
                  selected={backgroundColorKey === key || backgroundColor === color.hex}
                  onClick={() => onBackgroundColorChange(key)}
                  size="100%"
                  style={{ height: '32px' }}
                />
              );
            })}
          </div>
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









