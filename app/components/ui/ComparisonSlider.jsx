'use client';

import { useState, useRef, useEffect } from 'react';

export default function ComparisonSlider({ position, onChange }) {
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const handleRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const step = 0.05; // 5% increments

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(0, position - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(1, position + step));
    }
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      onChange(Math.max(0, Math.min(1, x)));
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, onChange]);
  
  return (
    <div 
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: dragging ? 'ew-resize' : 'default',
        zIndex: 5
      }}
    >
      {/* Divider line */}
      <div 
        style={{
          position: 'absolute',
          left: `${position * 100}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#fff',
          transform: 'translateX(-50%)',
          boxShadow: '0 0 8px rgba(0,0,0,0.5)',
          zIndex: 6
        }}
      />
      
      {/* Drag handle */}
      <div
        ref={handleRef}
        tabIndex={0}
        role="slider"
        aria-label="Comparison slider position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        aria-valuetext={`${Math.round(position * 100)}% original visible`}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        style={{
          position: 'absolute',
          left: `${position * 100}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'ew-resize',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 7,
          outline: 'none'
        }}
        onFocus={(e) => {
          e.target.style.outline = '2px solid #fff';
          e.target.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.target.style.outline = 'none';
        }}
      >
        <span style={{ fontSize: '14px', color: '#000', userSelect: 'none' }}>⟷</span>
      </div>
      
      {/* Labels */}
      <div style={{
        position: 'absolute',
        left: '8px',
        top: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '9px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em'
      }}>
        ORIGINAL
      </div>
      <div style={{
        position: 'absolute',
        right: '8px',
        top: '8px',
        padding: '4px 8px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: '#fff',
        fontSize: '9px',
        fontFamily: 'monospace',
        letterSpacing: '0.05em'
      }}>
        PROCESSED
      </div>
    </div>
  );
}


