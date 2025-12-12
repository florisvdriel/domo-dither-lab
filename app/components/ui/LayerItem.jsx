'use client';

import { useState } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import IconButton from './IconButton';

export default function LayerItem({
  layer,
  index,
  totalLayers,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onRemove,
  canRemove,
  palette,
  isSelected,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleLock
}) {
  const [hovering, setHovering] = useState(false);
  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
  const isVisible = layer.visible !== false;
  const isLocked = layer.locked === true;
  const layerColor = palette[layer.colorKey]?.hex || '#fff';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        marginBottom: '4px',
        backgroundColor: isSelected ? '#1a1a1a' : '#000',
        border: isSelected ? '1px solid #444' : (hovering ? '1px solid #333' : '1px solid #222'),
        transition: 'all 0.12s ease',
        opacity: isVisible ? 1 : 0.5,
        cursor: 'grab'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onSelect}
    >
      <div style={{ display: 'flex' }}>
        {/* Color indicator stripe */}
        <div style={{
          width: '4px',
          flexShrink: 0,
          backgroundColor: layerColor
        }} />

        {/* Drag Handle */}
        <div style={{
          width: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#333',
          borderRight: '1px solid #1a1a1a',
          cursor: 'grab',
          fontSize: '14px',
          lineHeight: 1
        }}>
          ⋮
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          gap: '8px'
        }}>
          {/* Lock toggle */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            title={isLocked ? "Unlock layer" : "Lock layer"}
            style={{ color: isLocked ? '#fff' : '#444' }}
          >
            {isLocked ? '🔒' : '🔓'}
          </IconButton>

          {/* Visibility toggle */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            title={isVisible ? "Hide layer" : "Show layer"}
          >
            {isVisible ? '◉' : '○'}
          </IconButton>

          {/* Layer info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '10px',
              color: '#888',
              fontFamily: 'monospace',
              display: 'flex',
              gap: '4px',
              alignItems: 'baseline'
            }}>
              <span style={{ color: '#666' }}>LAYER {index + 1}</span>
            </div>
            <div style={{
              fontSize: '9px',
              color: '#555',
              fontFamily: 'monospace',
              marginTop: '2px',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {algoInfo?.name || 'UNKNOWN'}
            </div>
          </div>

          {/* Actions (only visible on hover or when selected) */}
          <div style={{
            display: 'flex',
            gap: '2px',
            opacity: hovering || isSelected ? 1 : 0,
            transition: 'opacity 0.12s ease'
          }}>
            <IconButton
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              title="Duplicate"
              style={{ fontSize: '10px' }}
            >
              ⧉
            </IconButton>
            {canRemove && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                title="Remove"
                style={{ fontSize: '10px' }}
              >
                ×
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




