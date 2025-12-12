'use client';

import { useState } from 'react';
import Button from './Button';
import IconButton from './IconButton';
import LayerItem from './LayerItem';
import { SwatchWithPicker } from './ColorPicker';

// Simple non-collapsible section header
function SectionHeader({ title }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderBottom: '1px solid #222',
      color: '#666',
      fontSize: '10px',
      fontFamily: 'monospace',
      letterSpacing: '0.1em'
    }}>
      {title}
    </div>
  );
}

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
  backgroundColorKey,
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
  activePalette,
  onToggleLayerLock,
  onReorderLayers
}) {
  const [sourceHovering, setSourceHovering] = useState(false);
  const [bgHovering, setBgHovering] = useState(false);
  const [hoveringSwatchKey, setHoveringSwatchKey] = useState(null);

  // Compute which palette colors are used by visible layers
  const usedColorKeys = new Set(
    layers
      .filter(layer => layer.visible !== false) // Only count visible layers
      .map(layer => layer.colorKey)
  );
  if (backgroundColorKey) {
    usedColorKeys.add(backgroundColorKey);
  }

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('layerIndex', index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('layerIndex'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      onReorderLayers && onReorderLayers(sourceIndex, targetIndex);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Scrollable middle section (Source + Composition) */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Source Section */}
        <SectionHeader title="SOURCE" />
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              cursor: 'pointer',
              backgroundColor: selection.type === 'source' ? '#1a1a1a' : (sourceHovering ? '#0f0f0f' : 'transparent'),
              border: selection.type === 'source' ? '1px solid #444' : (sourceHovering ? '1px solid #333' : '1px solid #222'),
              padding: '12px',
              marginTop: '12px',
              transition: 'all 0.12s ease'
            }}
            onClick={onSelectSource}
            onMouseEnter={() => setSourceHovering(true)}
            onMouseLeave={() => setSourceHovering(false)}
          >
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '8px'
            }}>
              {/* Thumbnail */}
              <div style={{
                width: '56px',
                height: '56px',
                backgroundColor: '#111',
                border: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
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
        </div>

        {/* Composition Section */}
        <SectionHeader title="COMPOSITION" />
        <div style={{ padding: '0 16px 16px' }}>
          {/* Background item - fixed height */}
          <div
            style={{
              marginTop: '12px',
              marginBottom: '8px',
              backgroundColor: selection.type === 'background' ? '#1a1a1a' : '#000',
              border: selection.type === 'background' ? '1px solid #444' : (bgHovering ? '1px solid #333' : '1px solid #222'),
              transition: 'all 0.12s ease',
              cursor: 'pointer',
              flexShrink: 0
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
              draggable={true}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, i)}
              onToggleLock={() => onToggleLayerLock(i)}
            />
          ))}

          {/* Add Layer button */}
          {layers.length < 10 && (
            <Button onClick={onAddLayer} style={{ marginTop: '8px' }}>
              + ADD LAYER
            </Button>
          )}
        </div>
      </div>

      {/* Palette Section - Fixed at bottom */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid #222',
        backgroundColor: '#0a0a0a'
      }}>
        <SectionHeader title="PALETTE" />
        <div style={{ padding: '0 16px 16px' }}>
          {/* Color swatches in 4x2 grid filling full width */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              marginTop: '12px',
              marginBottom: '12px'
            }}>
            {colorKeys.map((key, idx) => {
              const isUsed = usedColorKeys.has(key);
              const isHovering = hoveringSwatchKey === key;
              const swatchOpacity = (isUsed || isHovering) ? 1 : 0.5;

              return (
                <div
                  key={key}
                  style={{
                    height: '32px',
                    opacity: swatchOpacity,
                    transition: 'opacity 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={() => setHoveringSwatchKey(key)}
                  onMouseLeave={() => setHoveringSwatchKey(null)}
                >
                  <SwatchWithPicker
                    color={palette[key]?.hex || '#000000'}
                    onChange={(newHex) => onUpdatePaletteColor(key, newHex)}
                    size="100%"
                  />
                  {/* Lock button removed - using layer locking instead */}
                </div>
              );
            })}
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
            Click swatches to edit • Lock to preserve
          </p>
        </div>
      </div>
    </div>
  );
}

