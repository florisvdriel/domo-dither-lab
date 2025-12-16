'use client';

import { useState } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';
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
        marginBottom: '6px',
        backgroundColor: isSelected ? COLORS.bg.tertiary : COLORS.bg.secondary,
        border: isSelected ? `1px solid ${COLORS.border.strong}` : (hovering ? `1px solid ${COLORS.border.default}` : `1px solid ${COLORS.border.subtle}`),
        borderRadius: '6px',
        transition: TRANSITIONS.fast,
        opacity: isVisible ? 1 : 0.5,
        cursor: 'grab',
        boxShadow: hovering ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onSelect}
    >
      <div style={{ display: 'flex' }}>
        {/* Color indicator stripe */}
        <div style={{
          width: '6px',
          flexShrink: 0,
          backgroundColor: layerColor,
          borderTopLeftRadius: '6px',
          borderBottomLeftRadius: '6px',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.3)'
        }} />

        {/* Drag Handle */}
        <div style={{
          width: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.text.tertiary,
          borderRight: `1px solid ${COLORS.border.subtle}`,
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
          padding: '12px 14px',
          gap: '10px'
        }}>
          {/* Lock toggle */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            title={isLocked ? "Unlock layer" : "Lock layer"}
            active={isLocked}
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
            active={isVisible}
          >
            {isVisible ? '◉' : '○'}
          </IconButton>

          {/* Layer info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '10px',
              color: COLORS.text.secondary,
              fontFamily: FONTS.ui,
              fontWeight: 500,
              display: 'flex',
              gap: '4px',
              alignItems: 'baseline'
            }}>
              <span style={{ color: COLORS.text.tertiary }}>LAYER {index + 1}</span>
            </div>
            <div style={{
              fontSize: '9px',
              color: COLORS.text.tertiary,
              fontFamily: FONTS.data,
              marginTop: '3px',
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em'
            }}>
              {algoInfo?.name || 'UNKNOWN'}
            </div>
          </div>

          {/* Actions (only visible on hover or when selected) */}
          <div style={{
            display: 'flex',
            gap: '2px',
            opacity: hovering || isSelected ? 1 : 0,
            transition: TRANSITIONS.fast
          }}>
            <IconButton
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
              title="Duplicate"
            >
              ⧉
            </IconButton>
            {canRemove && (
              <IconButton
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                title="Remove"
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
