'use client';

import { useState } from 'react';

export default function DropZone({ onDrop, children }) {
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
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      {dragging && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 98, 255, 0.1)',
          border: '2px dashed #0062FF', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{ color: '#0062FF', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>DROP IMAGE HERE</div>
        </div>
      )}
    </div>
  );
}


