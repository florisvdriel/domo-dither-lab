'use client';

import { useState } from 'react';

export default function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovering, setHovering] = useState(false);
  
  return (
    <div style={{ borderBottom: '1px solid #222' }}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: hovering ? '#0f0f0f' : 'transparent',
          border: 'none',
          color: hovering ? '#888' : '#666',
          fontSize: '10px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '0.1em',
          transition: 'all 0.12s ease'
        }}
      >
        {title}
        <span style={{ color: '#444' }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  );
}

