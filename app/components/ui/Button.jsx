'use client';

/**
 * MIGRATION GUIDE: Old Button → New shadcn Button
 *
 * Old props → New props:
 * - primary={true} → variant="primary"
 * - active={true} → variant="active"
 * - small={true} → size="sm"
 * - danger={true} → variant="danger"
 * - style={{ flex: 1 }} → className="flex-1" (keep fullWidth default)
 * - onClick={...} → onClick={...} (same)
 * - disabled={...} → disabled={...} (same)
 *
 * Examples:
 *
 * Before: <Button primary onClick={handleClick}>SAVE</Button>
 * After:  <Button variant="primary" onClick={handleClick}>SAVE</Button>
 *
 * Before: <Button active={isActive} onClick={toggle}>TOGGLE</Button>
 * After:  <Button variant={isActive ? "active" : "default"} onClick={toggle}>TOGGLE</Button>
 *
 * Before: <Button small onClick={...}>ICON</Button>
 * After:  <Button size="sm" onClick={...}>ICON</Button>
 *
 * Before: <Button danger onClick={deletePreset}>DELETE</Button>
 * After:  <Button variant="danger" onClick={deletePreset}>DELETE</Button>
 *
 * Before: <Button style={{ flex: 1 }}>OPTION 1</Button>
 * After:  <Button className="flex-1">OPTION 1</Button>
 *
 * Import path change:
 * Before: import Button from '@/app/components/ui/Button'
 * After:  import { Button } from '@/components/ui/button'
 */

import { useState } from 'react';

export default function Button({ children, onClick, primary = false, active = false, small = false, danger = false, style = {} }) {
  const [hovering, setHovering] = useState(false);
  
  let bg = '#000';
  let color = '#fff';
  let border = '1px solid #333';
  
  if (primary) {
    bg = hovering ? '#ddd' : '#fff';
    color = '#000';
    border = 'none';
  } else if (active) {
    bg = '#fff';
    color = '#000';
  } else if (danger && hovering) {
    bg = '#3a0a0a';
    border = '1px solid #661010';
  } else if (hovering) {
    bg = '#1a1a1a';
    border = '1px solid #444';
  }
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: small ? 'auto' : '100%',
        padding: small ? '6px 12px' : '10px',
        fontSize: '10px',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        letterSpacing: '0.05em',
        backgroundColor: bg,
        color: color,
        border: border,
        ...style,
      }}
    >
      {children}
    </button>
  );
}


