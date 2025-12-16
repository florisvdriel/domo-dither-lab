'use client';

import { useState } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';

export default function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [hovering, setHovering] = useState(false);
  
  return (
    <div style={{ 
      borderBottom: `1px solid ${COLORS.border.subtle}`,
      marginBottom: '2px'
    }}>
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: hovering ? COLORS.bg.secondary : 'transparent',
          border: 'none',
          borderLeft: open ? `3px solid ${COLORS.ink.coral}` : '3px solid transparent',
          color: hovering ? COLORS.text.secondary : COLORS.text.tertiary,
          fontSize: '10px',
          fontFamily: FONTS.ui,
          fontWeight: 500,
          cursor: 'pointer',
          letterSpacing: '0.08em',
          transition: TRANSITIONS.fast,
          textAlign: 'left'
        }}
      >
        <span>{title}</span>
        <span style={{ 
          color: COLORS.text.tertiary,
          fontSize: '14px',
          transition: TRANSITIONS.fast,
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)'
        }}>
          ▼
        </span>
      </button>
      {open && (
        <div style={{ 
          padding: '20px',
          backgroundColor: COLORS.bg.secondary 
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
