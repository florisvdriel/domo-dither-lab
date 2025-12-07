'use client';

import { useState } from 'react';

export default function IconButton({ children, onClick, disabled = false, title }) {
  const [hovering, setHovering] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={disabled}
      title={title}
      style={{
        width: '20px',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovering && !disabled ? '#333' : 'transparent',
        border: 'none',
        color: disabled ? '#333' : (hovering ? '#fff' : '#666'),
        fontSize: '12px',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.12s ease'
      }}
    >
      {children}
    </button>
  );
}

