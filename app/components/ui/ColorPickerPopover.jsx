'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { HexColorPicker, HexColorInput } from 'react-colorful';

export default function ColorPickerPopover({ color, onChange, size = 36 }) {
  const [localColor, setLocalColor] = useState(color || '#000000');
  const [isHovering, setIsHovering] = useState(false);

  // Sync local color when prop changes (e.g., palette updates)
  useEffect(() => {
    if (color) {
      setLocalColor(color);
    }
  }, [color]);

  const handleColorChange = (newColor) => {
    setLocalColor(newColor);
    onChange(newColor);
  };

  // Handle size as number (px) or string (e.g., "100%")
  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            width: sizeStyle,
            height: sizeStyle,
            backgroundColor: localColor,
            border: isHovering ? '1px solid #444' : '1px solid #222',
            borderRadius: 0,
            cursor: 'pointer',
            padding: 0,
            transition: 'border-color 0.15s ease',
            outline: 'none'
          }}
          aria-label="Pick color"
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="border-0 rounded-none p-0"
        style={{
          backgroundColor: '#0a0a0a',
          border: '1px solid #222',
          borderRadius: 0,
          padding: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          width: 'auto'
        }}
      >
        {/* Color Picker */}
        <div style={{ marginBottom: '12px' }}>
          <HexColorPicker
            color={localColor}
            onChange={handleColorChange}
            style={{
              width: '180px',
              borderRadius: 0
            }}
          />
        </div>

        {/* Hex Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#000',
            border: '1px solid #333',
            borderRadius: 0,
            padding: '6px 10px'
          }}
        >
          <span
            style={{
              color: '#666',
              fontSize: '10px',
              fontFamily: 'monospace',
              marginRight: '6px'
            }}
          >
            #
          </span>
          <HexColorInput
            color={localColor}
            onChange={handleColorChange}
            prefixed={false}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'monospace',
              outline: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
