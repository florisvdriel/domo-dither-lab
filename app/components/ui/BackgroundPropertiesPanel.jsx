'use client';

import { ColorSwatch } from './ColorPicker';
import Section from './Section';

export default function BackgroundPropertiesPanel({
  backgroundColor,
  onBackgroundColorChange,
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
          Select background color from palette
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Palette colors */}
          {colorKeys.map(key => (
            <ColorSwatch
              key={key}
              color={palette[key]?.hex || '#000000'}
              selected={backgroundColor === palette[key]?.hex}
              onClick={() => onBackgroundColorChange(palette[key]?.hex)}
              size={36}
            />
          ))}
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


