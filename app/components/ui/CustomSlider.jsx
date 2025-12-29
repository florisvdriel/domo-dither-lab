'use client';

import { useState, useRef, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';

export default function CustomSlider({ value, min, max, step, onChange, label, debounceMs = 0 }) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Sync local value when external value changes (and not dragging)
  if (!isDraggingRef.current && localValue !== value) {
    setLocalValue(value);
  }

  const handleValueChange = useCallback((newValues) => {
    const newValue = newValues[0];
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

  const handlePointerUp = useCallback(() => {
    // Immediately fire the change on mouse up for responsiveness
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onChange(localValue);
    isDraggingRef.current = false;
  }, [onChange, localValue]);

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
      <div
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Slider
          value={[localValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={handleValueChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
