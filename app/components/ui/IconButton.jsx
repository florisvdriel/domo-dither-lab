'use client';

import { useState } from 'react';
import { COLORS, TRANSITIONS } from '../../constants/design';

export default function IconButton({ children, onClick, disabled = false, title, active = false }) {
  const [hovering, setHovering] = useState(false);
  
  let bg = 'transparent';
  let color = COLORS.text.tertiary;
  
  if (disabled) {
    bg = 'transparent';
    color = COLORS.border.default;
  } else if (active) {
    bg = COLORS.ink.coralDim;
    color = COLORS.ink.coral;
  } else if (hovering) {
    bg = COLORS.bg.elevated;
    color = COLORS.text.primary;
  }
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={disabled}
      title={title}
      style={{
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        border: 'none',
        color: color,
        fontSize: '14px',
        cursor: disabled ? 'default' : 'pointer',
        transition: TRANSITIONS.fast,
        borderRadius: '4px'
      }}
    >
      {children}
    </button>
  );
}
