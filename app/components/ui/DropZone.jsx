'use client';

import { useState } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';

export default function DropZone({ onDrop, children, style = {}, onClick }) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onDrop(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onClick}
      style={{ position: 'relative', width: '100%', height: '100%', ...style }}
    >
      {children}
      {dragging && (
        <div style={{
          position: 'absolute', 
          inset: 0, 
          backgroundColor: COLORS.ink.coralDim,
          border: `2px dashed ${COLORS.ink.coral}`, 
          borderRadius: '8px',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ 
            color: COLORS.ink.coral, 
            fontSize: '12px', 
            fontFamily: FONTS.ui, 
            fontWeight: 500,
            letterSpacing: '0.1em' 
          }}>
            DROP IMAGE HERE
          </div>
        </div>
      )}
    </div>
  );
}
