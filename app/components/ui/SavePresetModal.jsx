'use client';

import { useState } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';
import Button from './Button';

export default function SavePresetModal({ onSave, onCancel }) {
  const [name, setName] = useState('');
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: COLORS.bg.tertiary,
        border: `1px solid ${COLORS.border.default}`,
        borderRadius: '8px',
        padding: '28px',
        width: '320px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ 
          margin: '0 0 20px', 
          fontSize: '13px', 
          fontFamily: FONTS.ui, 
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: COLORS.text.primary
        }}>
          Save Preset
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name..."
          style={{
            width: '100%',
            padding: '12px 14px',
            backgroundColor: COLORS.bg.secondary,
            border: `1px solid ${COLORS.border.default}`,
            borderRadius: '4px',
            color: COLORS.text.primary,
            fontSize: '12px',
            fontFamily: FONTS.ui,
            marginBottom: '20px',
            boxSizing: 'border-box',
            outline: 'none',
            transition: TRANSITIONS.fast
          }}
          onFocus={(e) => e.target.style.borderColor = COLORS.ink.coral}
          onBlur={(e) => e.target.style.borderColor = COLORS.border.default}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>Cancel</Button>
          <Button primary onClick={() => name.trim() && onSave(name.trim())} style={{ flex: 1 }}>Save</Button>
        </div>
      </div>
    </div>
  );
}
