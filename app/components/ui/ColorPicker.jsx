'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { DEFAULT_PALETTE } from '../../constants/palette';
import { hexToRgb } from '../../utils/paletteStorage';

// Color Swatch for preset colors at bottom
function ColorSwatch({ color, selected, onClick, size = 28 }) {
  const [hovering, setHovering] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        border: selected ? '1px solid #fff' : hovering ? '1px solid #444' : '1px solid #222',
        borderRadius: 0,
        cursor: 'pointer',
        transition: 'border-color 0.12s ease',
        padding: 0,
        outline: 'none'
      }}
    />
  );
}

// Full-featured Color Picker matching Figma design
export default function ColorPicker({ 
  value, 
  onChange, 
  label, 
  showAll = false, 
  palette = null,
  showOpacity = false,
  opacity = 100,
  onOpacityChange = null
}) {
  // Use provided palette or fall back to DEFAULT_PALETTE
  const basePalette = palette || DEFAULT_PALETTE;
  const colors = showAll ? basePalette : Object.fromEntries(
    Object.entries(basePalette).filter(([k]) => !['white', 'black'].includes(k))
  );
  
  // Convert palette key to hex for picker, or use hex directly
  const getHexValue = () => {
    if (value && value.startsWith('#')) {
      return value;
    }
    if (value && basePalette[value]) {
      return basePalette[value].hex;
    }
    return '#E86A58'; // Default coral
  };
  
  const [hexValue, setHexValue] = useState(getHexValue);
  const [localOpacity, setLocalOpacity] = useState(opacity);
  
  // Sync hex value when value prop changes
  useEffect(() => {
    setHexValue(getHexValue());
  }, [value]);
  
  useEffect(() => {
    setLocalOpacity(opacity);
  }, [opacity]);
  
  const handleColorChange = useCallback((newHex) => {
    setHexValue(newHex);
    // Find if this matches a palette color
    const matchingKey = Object.entries(basePalette).find(
      ([key, color]) => color.hex.toLowerCase() === newHex.toLowerCase()
    );
    if (matchingKey) {
      onChange(matchingKey[0]);
    } else {
      onChange(newHex);
    }
  }, [onChange, basePalette]);
  
  const handleSwatchClick = useCallback((key) => {
    const color = basePalette[key];
    if (color) {
      setHexValue(color.hex);
      onChange(key);
    }
  }, [onChange, basePalette]);
  
  const handleOpacityChange = useCallback((e) => {
    const newOpacity = parseInt(e.target.value, 10);
    setLocalOpacity(newOpacity);
    if (onOpacityChange) {
      onOpacityChange(newOpacity / 100);
    }
  }, [onOpacityChange]);

  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ 
          display: 'block', 
          color: '#666', 
          fontSize: '10px', 
          marginBottom: '10px', 
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          {label}
        </label>
      )}
      
      {/* Main color picker area */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #333'
      }}>
        {/* Saturation/Brightness picker + Hue slider from react-colorful */}
        <div style={{ marginBottom: '16px' }}>
          <HexColorPicker 
            color={hexValue} 
            onChange={handleColorChange} 
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        
        {/* Opacity slider (if enabled) */}
        {showOpacity && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              position: 'relative',
              height: '14px',
              borderRadius: '7px',
              background: `linear-gradient(to right, transparent, ${hexValue})`,
              backgroundImage: `
                linear-gradient(to right, transparent, ${hexValue}),
                repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 10px 10px
              `
            }}>
              <input
                type="range"
                min="0"
                max="100"
                value={localOpacity}
                onChange={handleOpacityChange}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <div style={{
                position: 'absolute',
                left: `${localOpacity}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '3px solid #fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                pointerEvents: 'none'
              }} />
            </div>
          </div>
        )}
        
        {/* Hex input and opacity */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#2a2a2a',
            borderRadius: '6px',
            padding: '8px 12px',
            flex: 1
          }}>
            <span style={{ 
              color: '#888', 
              fontSize: '11px', 
              fontFamily: 'monospace',
              marginRight: '8px'
            }}>
              Hex
            </span>
            <HexColorInput 
              color={hexValue} 
              onChange={handleColorChange}
              prefixed={false}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            />
          </div>
          
          {showOpacity && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              padding: '8px 12px',
              minWidth: '70px'
            }}>
              <input
                type="number"
                min="0"
                max="100"
                value={localOpacity}
                onChange={handleOpacityChange}
                style={{
                  width: '36px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  textAlign: 'right'
                }}
              />
              <span style={{ 
                color: '#888', 
                fontSize: '11px', 
                fontFamily: 'monospace',
                marginLeft: '2px'
              }}>
                %
              </span>
            </div>
          )}
        </div>
        
        {/* Preset swatches */}
        <div>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            fontFamily: 'monospace',
            marginBottom: '8px'
          }}>
            Palette colors
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '6px', 
            flexWrap: 'wrap'
          }}>
            {Object.entries(colors).map(([key, color]) => (
              <ColorSwatch 
                key={key} 
                color={color.hex} 
                selected={value === key || hexValue.toLowerCase() === color.hex.toLowerCase()} 
                onClick={() => handleSwatchClick(key)} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple swatch-only picker for compact use (layer panel)
export function CompactColorPicker({ value, onChange, palette = null }) {
  const basePalette = palette || DEFAULT_PALETTE;
  const colors = Object.fromEntries(
    Object.entries(basePalette).filter(([k]) => !['white', 'black'].includes(k))
  );
  
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {Object.entries(colors).map(([key, color]) => (
        <ColorSwatch 
          key={key} 
          color={color.hex} 
          selected={value === key} 
          onClick={() => onChange(key)}
          size={24}
        />
      ))}
    </div>
  );
}

// Inline Color Picker with popover
export function InlineColorPicker({ color, onChange, size = 36 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color);
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef(null);
  
  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Sync local color when prop changes
  useEffect(() => {
    setLocalColor(color);
  }, [color]);
  
  const handleColorChange = useCallback((newColor) => {
    setLocalColor(newColor);
    onChange(newColor);
  }, [onChange]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          width: size,
          height: size,
          backgroundColor: localColor,
          border: hovering ? '1px solid #444' : '1px solid #222',
          borderRadius: 0,
          cursor: 'pointer',
          padding: 0,
          transition: 'border-color 0.15s ease'
        }}
      />
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: size + 8,
          left: 0,
          backgroundColor: '#0a0a0a',
          border: '1px solid #222',
          borderRadius: 0,
          padding: '12px',
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          <style>{`
            .inline-color-picker .react-colorful {
              width: 180px !important;
            }
            .inline-color-picker .react-colorful__saturation {
              border-radius: 0 !important;
              height: 140px !important;
            }
            .inline-color-picker .react-colorful__hue {
              border-radius: 0 !important;
              height: 14px !important;
            }
            .inline-color-picker .react-colorful__hue-pointer,
            .inline-color-picker .react-colorful__saturation-pointer {
              width: 16px !important;
              height: 16px !important;
            }
          `}</style>
          <div className="inline-color-picker">
            <HexColorPicker 
              color={localColor} 
              onChange={handleColorChange}
            />
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '10px',
            backgroundColor: '#000',
            border: '1px solid #333',
            borderRadius: 0,
            padding: '6px 10px'
          }}>
            <span style={{ color: '#666', fontSize: '10px', fontFamily: 'monospace', marginRight: '6px' }}>#</span>
            <HexColorInput 
              color={localColor} 
              onChange={handleColorChange}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase',
                width: '100%'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Export ColorSwatch for use elsewhere
export { ColorSwatch };

// Alias for InlineColorPicker - used in palette section
export { InlineColorPicker as SwatchWithPicker };
