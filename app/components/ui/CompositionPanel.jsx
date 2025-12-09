'use client';

import { useState } from 'react';
import Button from './Button';
import IconButton from './IconButton';
import LayerItem from './LayerItem';
import Section from './Section';
import { SwatchWithPicker } from './ColorPicker';

export default function CompositionPanel({
  // Source
  image,
  onChangeImage,
  onReset,
  fileInputRef,
  // Selection
  selection,
  onSelectSource,
  onSelectBackground,
  onSelectLayer,
  onSelectProject,
  // Background
  backgroundColor,
  // Layers
  layers,
  onAddLayer,
  onToggleLayerVisibility,
  onDuplicateLayer,
  onRemoveLayer,
  // Palette
  palette,
  colorKeys,
  onUpdatePaletteColor,
  onRandomizePalette,
  activePalette
}) {
  const [sourceHovering, setSourceHovering] = useState(false);
  const [bgHovering, setBgHovering] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Source Section */}
      <Section title="SOURCE">
        <div 
          style={{ 
            cursor: 'pointer'
          }}
          onClick={onSelectSource}
          onMouseEnter={() => setSourceHovering(true)}
          onMouseLeave={() => setSourceHovering(false)}
        >
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: '12px'
          }}>
            {/* Thumbnail */}
            <div style={{ 
              width: '56px', 
              height: '56px', 
              backgroundColor: '#111',
              border: selection.type === 'source' ? '1px solid #666' : (sourceHovering ? '1px solid #444' : '1px solid #222'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
              transition: 'border-color 0.12s ease'
            }}>
              {image ? (
                <img 
                  src={image.src} 
                  alt="Source" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                />
              ) : (
                <span style={{ color: '#333', fontSize: '20px' }}>◐</span>
              )}
            </div>
            
            {/* Buttons */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
                style={{ fontSize: '9px', padding: '6px 8px' }}
              >
                {image ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
              </Button>
              {image && (
                <Button 
                  onClick={(e) => { e.stopPropagation(); onReset(); }} 
                  style={{ fontSize: '9px', padding: '6px 8px', color: '#666' }}
                >
                  RESET
                </Button>
              )}
            </div>
          </div>
          <p style={{ 
            fontSize: '9px', 
            color: '#444', 
            margin: 0, 
            textAlign: 'center' 
          }}>
            Click to adjust the image
          </p>
        </div>
      </Section>

      {/* Composition Section */}
      <Section title="COMPOSITION">
        {/* Background item */}
        <div 
          style={{ 
            marginBottom: '8px', 
            backgroundColor: selection.type === 'background' ? '#1a1a1a' : '#000', 
            border: selection.type === 'background' ? '1px solid #444' : (bgHovering ? '1px solid #333' : '1px solid #222'),
            transition: 'all 0.12s ease',
            cursor: 'pointer'
          }}
          onClick={onSelectBackground}
          onMouseEnter={() => setBgHovering(true)}
          onMouseLeave={() => setBgHovering(false)}
        >
          <div style={{ display: 'flex' }}>
            {/* Color indicator */}
            <div style={{ 
              width: '4px', 
              flexShrink: 0, 
              backgroundColor: backgroundColor 
            }} />
            
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px 12px',
              gap: '8px'
            }}>
              <IconButton title="Background visibility">
                ◉
              </IconButton>
              <span style={{ 
                fontSize: '10px', 
                color: '#888', 
                fontFamily: 'monospace' 
              }}>
                BACKGROUND
              </span>
            </div>
          </div>
        </div>

        {/* Layer items */}
        {layers.map((layer, i) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            index={i}
            totalLayers={layers.length}
            onSelect={() => onSelectLayer(layer.id)}
            onToggleVisibility={() => onToggleLayerVisibility(i)}
            onDuplicate={() => onDuplicateLayer(i)}
            onRemove={() => onRemoveLayer(i)}
            canRemove={layers.length > 1}
            palette={activePalette}
            isSelected={selection.type === 'layer' && selection.id === layer.id}
          />
        ))}

        {/* Add Layer button */}
        {layers.length < 4 && (
          <Button onClick={onAddLayer} style={{ marginTop: '8px' }}>
            + ADD LAYER
          </Button>
        )}
      </Section>

      {/* Palette Section */}
      <Section title="PALETTE">
        {/* Color swatches in 2 rows */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px', 
          marginBottom: '12px'
        }}>
          {colorKeys.map(key => (
            <SwatchWithPicker
              key={key} 
              color={palette[key]?.hex || '#000000'}
              onChange={(newHex) => onUpdatePaletteColor(key, newHex)}
              size={40}
            />
          ))}
        </div>
        
        <Button onClick={onRandomizePalette}>
          ↻ RANDOMIZE
        </Button>
        
        <p style={{ 
          fontSize: '9px', 
          color: '#444', 
          margin: '8px 0 0 0', 
          textAlign: 'center' 
        }}>
          Click swatches to edit colors
        </p>
      </Section>
    </div>
  );
}

