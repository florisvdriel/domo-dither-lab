'use client';

import { useState } from 'react';
import { DOMO_PALETTE } from '../../constants/palette';

// Color Swatch
export function ColorSwatch({ color, selected, onClick, colorKey }) {
  const [hovering, setHovering] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        flex: 1,
        height: '24px',
        backgroundColor: color.hex,
        border: selected ? '2px solid #fff' : '2px solid transparent',
        cursor: 'pointer',
        transform: hovering && !selected ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 0.12s ease',
        zIndex: hovering ? 1 : 0,
      }}
    />
  );
}

// Color Picker
export default function ColorPicker({ value, onChange, label, showAll = false }) {
  const colors = showAll ? DOMO_PALETTE : Object.fromEntries(
    Object.entries(DOMO_PALETTE).filter(([k]) => !['white', 'black'].includes(k))
  );
  
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          color: '#666', 
          fontSize: '10px', 
          marginBottom: '8px', 
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', gap: '3px' }}>
        {Object.entries(colors).map(([key, color]) => (
          <ColorSwatch key={key} colorKey={key} color={color} selected={value === key} onClick={() => onChange(key)} />
        ))}
      </div>
    </div>
  );
}

