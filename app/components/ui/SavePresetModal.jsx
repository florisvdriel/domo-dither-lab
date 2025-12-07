'use client';

import { useState } from 'react';
import Button from './Button';

export default function SavePresetModal({ onSave, onCancel }) {
  const [name, setName] = useState('');
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#111',
        border: '1px solid #333',
        padding: '24px',
        width: '300px'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          SAVE PRESET
        </h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Preset name..."
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#000',
            border: '1px solid #333',
            color: '#fff',
            fontSize: '11px',
            fontFamily: 'monospace',
            marginBottom: '16px',
            boxSizing: 'border-box'
          }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>CANCEL</Button>
          <Button primary onClick={() => name.trim() && onSave(name.trim())} style={{ flex: 1 }}>SAVE</Button>
        </div>
      </div>
    </div>
  );
}


