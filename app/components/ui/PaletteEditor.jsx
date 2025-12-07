'use client';

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import Button from './Button';
import IconButton from './IconButton';
import { hexToRgb } from '../../utils/paletteStorage';
import { HARMONY_TYPES, generateNamedPalette } from '../../utils/paletteGenerator';

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
  const [newColorHex, setNewColorHex] = useState('#E86A58');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState(null);
  const [error, setError] = useState('');
  const [harmonyType, setHarmonyType] = useState('triadic');

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
    setNewColorHex('#E86A58');
    setError('');
    setShowColorPicker(false);
  };

  const removeColor = (index) => {
    setColors(colors.filter((_, i) => i !== index));
    if (editingColorIndex === index) {
      setEditingColorIndex(null);
    }
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

  const generatePalette = () => {
    const newPalette = generateNamedPalette(harmonyType);
    const newColors = Object.entries(newPalette).map(([key, color]) => ({
      key,
      name: color.name,
      hex: color.hex
    }));
    setColors(newColors);
  };

  const clearPalette = () => {
    setColors([]);
    setEditingColorIndex(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        backgroundColor: '#111',
        border: '1px solid #333',
        borderRadius: '12px',
        padding: '24px',
        width: '450px',
        maxHeight: '85vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', margin: 0, fontWeight: 500 }}>EDIT PALETTE</h2>
          <IconButton onClick={onCancel}>×</IconButton>
        </div>
        
        {/* Palette Generator */}
        <div style={{ 
          backgroundColor: '#0a0a0a',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <label style={{ 
            display: 'block', 
            color: '#888', 
            fontSize: '10px', 
            marginBottom: '12px', 
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            GENERATE PALETTE
          </label>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <select
              value={harmonyType}
              onChange={(e) => setHarmonyType(e.target.value)}
              style={{
                flex: 1,
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                padding: '10px 12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {Object.entries(HARMONY_TYPES).map(([key, info]) => (
                <option key={key} value={key}>{info.name}</option>
              ))}
            </select>
            <Button onClick={generatePalette} style={{ padding: '10px 16px' }}>
              ↻ GENERATE
            </Button>
          </div>
          
          <p style={{ fontSize: '9px', color: '#555', margin: 0 }}>
            {HARMONY_TYPES[harmonyType]?.description}
          </p>
        </div>
        
        {/* Existing colors */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ 
              color: '#888', 
              fontSize: '10px', 
              fontFamily: 'monospace',
              letterSpacing: '0.05em'
            }}>
              COLORS ({colors.length})
            </label>
            {colors.length > 0 && (
              <button
                onClick={clearPalette}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                Clear all
              </button>
            )}
          </div>
          
          {colors.length === 0 ? (
            <p style={{ fontSize: '11px', color: '#555', textAlign: 'center', padding: '24px 0' }}>
              No colors yet. Generate a palette or add colors manually.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colors.map((color, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  padding: '10px 12px',
                  backgroundColor: '#0a0a0a',
                  border: editingColorIndex === i ? '1px solid #444' : '1px solid #222',
                  borderRadius: '8px',
                  transition: 'border-color 0.15s ease'
                }}>
                  <button
                    onClick={() => setEditingColorIndex(editingColorIndex === i ? null : i)}
                    style={{ 
                      width: '36px', 
                      height: '36px', 
                      backgroundColor: color.hex,
                      border: '2px solid #333',
                      borderRadius: '6px',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title="Click to edit color"
                  />
                  <input
                    type="text"
                    value={color.name}
                    onChange={(e) => updateColor(i, 'name', e.target.value)}
                    placeholder="Color name"
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 0',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <span style={{ 
                    fontSize: '10px', 
                    color: '#666', 
                    fontFamily: 'monospace',
                    width: '65px',
                    textAlign: 'right'
                  }}>
                    {color.hex}
                  </span>
                  <IconButton onClick={() => removeColor(i)} title="Remove">×</IconButton>
                </div>
              ))}
            </div>
          )}
          
          {/* Inline color picker for editing */}
          {editingColorIndex !== null && colors[editingColorIndex] && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '8px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <HexColorPicker 
                  color={colors[editingColorIndex].hex} 
                  onChange={(hex) => updateColor(editingColorIndex, 'hex', hex)}
                  style={{ width: '100%' }}
                />
              </div>
              <Button onClick={() => setEditingColorIndex(null)} style={{ width: '100%' }}>
                Done
              </Button>
            </div>
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
            color: '#888', 
            fontSize: '10px', 
            marginBottom: '12px', 
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            ADD NEW COLOR
          </label>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ 
                width: '44px', 
                height: '44px', 
                backgroundColor: newColorHex,
                border: '2px solid #333',
                borderRadius: '8px',
                padding: 0,
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Pick color"
            />
            <input
              type="text"
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="Color name"
              onKeyDown={(e) => e.key === 'Enter' && addColor()}
              style={{
                flex: 1,
                backgroundColor: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#fff',
                padding: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            <Button onClick={addColor} style={{ padding: '12px 20px' }}>ADD</Button>
          </div>
          
          {showColorPicker && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '8px'
            }}>
              <HexColorPicker 
                color={newColorHex} 
                onChange={setNewColorHex}
                style={{ width: '100%' }}
              />
            </div>
          )}
          
          {error && (
            <p style={{ fontSize: '10px', color: '#e94040', margin: '8px 0 0 0' }}>{error}</p>
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
