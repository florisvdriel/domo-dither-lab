'use client';

import { useState } from 'react';
import Button from './Button';
import ColorPicker from './ColorPicker';

export default function PaletteEditor({ palette, onSave, onCancel }) {
  const [colors, setColors] = useState(() => {
    // Convert palette object to array for easier editing
    return Object.entries(palette).map(([key, value]) => ({
      id: key,
      hex: value.hex,
      rgb: value.rgb
    }));
  });
  const [editingIndex, setEditingIndex] = useState(null);

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const addColor = () => {
    const newId = `custom_${Date.now()}`;
    const newHex = '#808080';
    setColors([...colors, { 
      id: newId, 
      hex: newHex,
      rgb: hexToRgb(newHex)
    }]);
  };

  const updateColor = (index, hex) => {
    const newColors = [...colors];
    newColors[index] = {
      ...newColors[index],
      hex,
      rgb: hexToRgb(hex)
    };
    setColors(newColors);
  };

  const removeColor = (index) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // Convert array back to palette object
    const newPalette = {};
    colors.forEach(color => {
      newPalette[color.id] = {
        hex: color.hex,
        rgb: color.rgb
      };
    });
    onSave(newPalette);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '24px',
        borderRadius: '8px',
        minWidth: '320px',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          fontSize: '12px', 
          letterSpacing: '0.1em',
          color: '#fff'
        }}>
          CUSTOM PALETTE
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          {colors.length === 0 ? (
            <p style={{ color: '#666', fontSize: '11px', textAlign: 'center', margin: '20px 0' }}>
              No custom colors yet. Add some below.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colors.map((color, index) => (
                <div key={color.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  position: 'relative'
                }}>
                  <div
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: color.hex,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: editingIndex === index ? '2px solid #fff' : '2px solid transparent'
                    }}
                  />
                  <span style={{ 
                    flex: 1, 
                    fontSize: '11px', 
                    color: '#888',
                    fontFamily: 'monospace'
                  }}>
                    {color.hex.toUpperCase()}
                  </span>
                  <button
                    onClick={() => removeColor(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px'
                    }}
                  >
                    ×
                  </button>
                  
                  {editingIndex === index && (
                    <div style={{
                      position: 'absolute',
                      top: '48px',
                      left: 0,
                      zIndex: 10,
                      backgroundColor: '#222',
                      padding: '8px',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      <ColorPicker
                        color={color.hex}
                        onChange={(hex) => updateColor(index, hex)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Button 
          onClick={addColor} 
          style={{ width: '100%', marginBottom: '16px' }}
        >
          + ADD COLOR
        </Button>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onCancel} style={{ flex: 1 }}>
            CANCEL
          </Button>
          <Button 
            primary 
            onClick={handleSave} 
            style={{ flex: 1 }}
            disabled={colors.length === 0}
          >
            SAVE
          </Button>
        </div>
      </div>
    </div>
  );
}

