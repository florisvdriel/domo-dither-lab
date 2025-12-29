'use client';

import { useState, useRef, useCallback } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';

export default function Slider({ value, min, max, step, onChange, label, debounceMs = 0 }) {
  const percent = ((value - min) / (max - min)) * 100;
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
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
  
  const handleMouseDown = () => setDragging(true);
  
  const handleMouseUp = useCallback(() => {
    setDragging(false);
    // Immediately fire the change on mouse up for responsiveness
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onChange(localValue);
    isDraggingRef.current = false;
  }, [onChange, localValue]);
  
  const displayPercent = ((localValue - min) / (max - min)) * 100;
  const isActive = hovering || dragging;
  
  return (
    <div style={{ marginBottom: '18px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          color: COLORS.text.secondary, 
          fontSize: '10px', 
          marginBottom: '12px', 
          fontFamily: FONTS.data,
          letterSpacing: '0.05em',
          fontWeight: 500
        }}>
          {label}
        </label>
      )}
      <div 
        style={{ 
          position: 'relative', 
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Track background */}
        <div style={{ 
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px', 
          backgroundColor: COLORS.border.default,
          transition: TRANSITIONS.fast
        }} />
        
        {/* Active track (filled portion) */}
        <div style={{ 
          position: 'absolute',
          left: 0,
          width: `${displayPercent}%`,
          height: '2px', 
          backgroundColor: isActive ? COLORS.ink.coral : COLORS.border.strong,
          transition: TRANSITIONS.fast
        }} />
        
        {/* Thumb */}
        <div style={{ 
          position: 'absolute',
          left: `${displayPercent}%`,
          transform: 'translateX(-50%)',
          width: isActive ? '14px' : '12px',
          height: isActive ? '14px' : '12px',
          backgroundColor: COLORS.ink.coral,
          borderRadius: '50%',
          border: isActive ? `2px solid ${COLORS.text.primary}` : 'none',
          transition: TRANSITIONS.fast,
          pointerEvents: 'none',
          boxShadow: isActive ? `0 0 12px ${COLORS.ink.coralDim}` : '0 2px 4px rgba(0,0,0,0.3)'
        }} />
        
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={localValue}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
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
