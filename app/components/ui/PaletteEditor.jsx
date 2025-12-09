'use client';

import { useState } from 'react';
import Button from './Button';
import IconButton from './IconButton';
import { hexToRgb } from '../../utils/paletteStorage';

export default function PaletteEditor({ palette, onSave, onCancel }) {
  const [colors, setColors] = useState(() => {
    // Convert palette object to array for editing
    return Object.entries(palette).map(([key, color]) => ({
      key,
      name: color.name,
      hex: color.hex
    }));
  });
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#FF0000');
  const [error, setError] = useState('');

  const addColor = () => {
    if (!newColorName.trim()) {
      setError('Enter a color name');
      return;
    }
    
    if (!/^#[0-9A-Fa-f]{6}$/.test(newColorHex)) {
      setError('Enter a valid hex color (e.g. #FF0000)');
      return;
    }
    
    const key = newColorName.toLowerCase().replace(/\s+/g, '_');
    if (colors.some(c => c.key === key)) {
      setError('Color name already exists');
      return;
    }
    
    setColors([...colors, { key, name: newColorName.trim(), hex: newColorHex.toUpperCase() }]);
    setNewColorName('');
    setNewColorHex('#FF0000');
    setError('');
  };

  const removeColor = (index) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const updateColor = (index, field, value) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], [field]: value };
    if (field === 'name') {
      newColors[index].key = value.toLowerCase().replace(/\s+/g, '_');
    }
    setColors(newColors);
  };

  const handleSave = () => {
    // Convert array back to palette object
    const newPalette = {};
    colors.forEach(color => {
      newPalette[color.key] = {
        name: color.name,
        hex: color.hex.toUpperCase(),
        rgb: hexToRgb(color.hex)
      };
    });
    onSave(newPalette);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        backgroundColor: '#111',
        border: '1px solid #333',
        padding: '24px',
        width: '400px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '12px', letterSpacing: '0.1em', margin: 0, fontWeight: 400 }}>EDIT PALETTE</h2>
          <IconButton onClick={onCancel}>×</IconButton>
        </div>
        
        {/* Existing colors */}
        <div style={{ marginBottom: '20px' }}>
          {colors.length === 0 ? (
            <p style={{ fontSize: '10px', color: '#666', textAlign: 'center', padding: '20px 0' }}>
              No custom colors yet. Add some below.
            </p>
          ) : (
            colors.map((color, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '8px',
                padding: '8px',
                backgroundColor: '#0a0a0a',
                border: '1px solid #222'
              }}>
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => updateColor(i, 'hex', e.target.value)}
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                />
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => updateColor(i, 'name', e.target.value)}
                  placeholder="Color name"
                  style={{
                    flex: 1,
                    backgroundColor: '#000',
                    border: '1px solid #333',
                    color: '#fff',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontFamily: 'monospace'
                  }}
                />
                <span style={{ 
                  fontSize: '9px', 
                  color: '#666', 
                  fontFamily: 'monospace',
                  width: '60px'
                }}>
                  {color.hex}
                </span>
                <IconButton onClick={() => removeColor(i)} title="Remove">×</IconButton>
              </div>
            ))
          )}
        </div>
        
        {/* Add new color */}
        <div style={{ 
          borderTop: '1px solid #222', 
          paddingTop: '16px',
          marginBottom: '20px'
        }}>
          <label style={{ 
            display: 'block', 
            color: '#666', 
            fontSize: '10px', 
            marginBottom: '8px', 
            fontFamily: 'monospace' 
          }}>
            ADD NEW COLOR
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="color"
              value={newColorHex}
              onChange={(e) => setNewColorHex(e.target.value)}
              style={{ 
                width: '40px', 
                height: '32px', 
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                backgroundColor: 'transparent'
              }}
            />
            <input
              type="text"
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="Color name"
              onKeyDown={(e) => e.key === 'Enter' && addColor()}
              style={{
                flex: 1,
                backgroundColor: '#000',
                border: '1px solid #333',
                color: '#fff',
                padding: '8px',
                fontSize: '10px',
                fontFamily: 'monospace'
              }}
            />
            <Button onClick={addColor} style={{ padding: '8px 16px' }}>ADD</Button>
          </div>
          {error && (
            <p style={{ fontSize: '9px', color: '#e94040', margin: '4px 0 0 0' }}>{error}</p>
          )}
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>CANCEL</Button>
          <Button primary onClick={handleSave} style={{ flex: 1 }}>SAVE PALETTE</Button>
        </div>
        
        <p style={{ fontSize: '9px', color: '#444', margin: '12px 0 0 0', textAlign: 'center' }}>
          Custom colors will be saved to your browser
        </p>
      </div>
    </div>
  );
}

