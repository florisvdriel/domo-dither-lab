'use client';

import { useState, useRef, useCallback } from 'react';

export default function Slider({ value, min, max, step, onChange, label, debounceMs = 0 }) {
  const percent = ((value - min) / (max - min)) * 100;
  const [hovering, setHovering] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);
  const isDraggingRef = useRef(false);
  
  // Sync local value when external value changes (and not dragging)
  if (!isDraggingRef.current && localValue !== value) {
    setLocalValue(value);
  }
  
  const handleChange = useCallback((e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    isDraggingRef.current = true;
    
    if (debounceMs > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
        isDraggingRef.current = false;
      }, debounceMs);
    } else {
      onChange(newValue);
      isDraggingRef.current = false;
    }
  }, [onChange, debounceMs]);
  
  const handleMouseUp = useCallback(() => {
    // Immediately fire the change on mouse up for responsiveness
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onChange(localValue);
    isDraggingRef.current = false;
  }, [onChange, localValue]);
  
  const displayPercent = ((localValue - min) / (max - min)) * 100;
  
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
          left: `${displayPercent}%`,
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
          value={localValue}
          onChange={handleChange}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
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


