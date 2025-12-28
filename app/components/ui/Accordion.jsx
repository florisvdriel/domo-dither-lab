'use client';

import { useState } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';

export function Accordion({ value, onChange, children }) {
  return <div>{children}</div>;
}

export function AccordionSection({ id, title, isOpen, onToggle, children }) {
  const [hovering, setHovering] = useState(false);

  const headerId = `accordion-header-${id}`;
  const panelId = `accordion-panel-${id}`;

  return (
    <div style={{
      borderBottom: `1px solid ${COLORS.border.subtle}`,
      marginBottom: '2px'
    }}>
      <button
        id={headerId}
        onClick={onToggle}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        style={{
          width: '100%',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: hovering ? COLORS.bg.secondary : 'transparent',
          border: 'none',
          borderLeft: isOpen ? `3px solid ${COLORS.ink.coral}` : '3px solid transparent',
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
          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)'
        }}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          style={{
            padding: '20px',
            backgroundColor: COLORS.bg.secondary
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
