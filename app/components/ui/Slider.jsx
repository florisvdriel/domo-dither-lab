'use client';

import { useState } from 'react';

export default function Slider({ value, min, max, step, onChange, label }) {
  const percent = ((value - min) / (max - min)) * 100;
  const [hovering, setHovering] = useState(false);
  
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          color: '#666', 
          fontSize: '10px', 
          marginBottom: '10px', 
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          {label}
        </label>
      )}
      <div 
        style={{ 
          position: 'relative', 
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div style={{ 
          position: 'absolute',
          left: 0,
          right: 0,
          height: '1px', 
          backgroundColor: hovering ? '#555' : '#333',
          transition: 'background-color 0.15s ease'
        }} />
        
        <div style={{ 
          position: 'absolute',
          left: `${percent}%`,
          transform: 'translateX(-50%)',
          width: hovering ? '10px' : '8px',
          height: hovering ? '10px' : '8px',
          backgroundColor: '#fff',
          transition: 'all 0.12s ease',
          pointerEvents: 'none'
        }} />
        
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%', 
            opacity: 0, 
            cursor: 'pointer', 
            margin: 0 
          }}
        />
      </div>
    </div>
  );
}

