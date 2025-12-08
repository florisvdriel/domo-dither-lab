'use client';

import { useState } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import { BLEND_MODES } from '../../constants';
import { DEFAULT_PALETTE } from '../../constants/palette';
import IconButton from './IconButton';
import { CompactColorPicker } from './ColorPicker';
import AlgorithmSelect from './AlgorithmSelect';
import Slider from './Slider';

export default function LayerPanel({ layer, index, totalLayers, onUpdate, onRemove, onDuplicate, onMoveUp, onMoveDown, canRemove, palette = null }) {
  const [expanded, setExpanded] = useState(true);
  const [hovering, setHovering] = useState(false);
  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
  const isVisible = layer.visible !== false; // Default to true if not set
  
  // Use provided palette or fall back to DEFAULT_PALETTE
  const activePalette = palette || DEFAULT_PALETTE;
  
  return (
    <div 
      style={{ 
        marginBottom: '8px', 
        backgroundColor: '#000', 
        border: hovering ? '1px solid #444' : '1px solid #2a2a2a',
        transition: 'border-color 0.12s ease',
        opacity: isVisible ? 1 : 0.5
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{ display: 'flex' }}>
        <div style={{ width: '4px', flexShrink: 0, backgroundColor: activePalette[layer.colorKey]?.hex || '#fff' }} />
        <div style={{ flex: 1 }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px 12px', 
              borderBottom: expanded ? '1px solid #222' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setExpanded(!expanded)}
          >
            {/* Visibility toggle (eye icon) */}
            <IconButton 
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...layer, visible: !isVisible }); }} 
              title={isVisible ? "Hide layer" : "Show layer"}
            >
              {isVisible ? '👁' : '👁‍🗨'}
            </IconButton>
            <span style={{ fontSize: '10px', color: '#888', fontFamily: 'monospace', marginLeft: '8px' }}>LAYER {index + 1}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <IconButton onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">⧉</IconButton>
              <IconButton onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0} title="Move up">↑</IconButton>
              <IconButton onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === totalLayers - 1} title="Move down">↓</IconButton>
              {canRemove && <IconButton onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove">×</IconButton>}
            </div>
          </div>
          
          {expanded && (
            <div style={{ padding: '12px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>COLOR</label>
                <CompactColorPicker value={layer.colorKey} onChange={(k) => onUpdate({ ...layer, colorKey: k })} palette={activePalette} />
              </div>
              
              <AlgorithmSelect value={layer.ditherType} onChange={(v) => onUpdate({ ...layer, ditherType: v })} />
              
              <Slider label={`DENSITY ${Math.round(layer.threshold * 100)}%`} value={layer.threshold} min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...layer, threshold: v })} debounceMs={50} />
              
              {algoInfo?.hasScale && (
                <Slider label={`SIZE ${layer.scale}px`} value={layer.scale} min={2} max={32} step={1} onChange={(v) => onUpdate({ ...layer, scale: v })} debounceMs={50} />
              )}
              
              {algoInfo?.hasAngle && (
                <Slider label={`ANGLE ${layer.angle}°`} value={layer.angle} min={0} max={180} step={5} onChange={(v) => onUpdate({ ...layer, angle: v })} debounceMs={50} />
              )}
              
              {/* X/Y Offset sliders - prominent for misregistered screenprint look */}
              <div style={{ 
                borderTop: '1px solid #222', 
                paddingTop: '12px', 
                marginTop: '8px',
                marginBottom: '12px'
              }}>
                <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
                  OFFSET (misregistration)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Slider label={`X ${layer.offsetX}px`} value={layer.offsetX} min={-50} max={50} step={1} onChange={(v) => onUpdate({ ...layer, offsetX: v })} debounceMs={30} />
                  <Slider label={`Y ${layer.offsetY}px`} value={layer.offsetY} min={-50} max={50} step={1} onChange={(v) => onUpdate({ ...layer, offsetY: v })} debounceMs={30} />
                </div>
              </div>
              
              <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>BLEND</label>
              <select 
                value={layer.blendMode} 
                onChange={(e) => onUpdate({ ...layer, blendMode: e.target.value })} 
                style={{ width: '100%', padding: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', fontSize: '10px', fontFamily: 'monospace', marginBottom: '16px', cursor: 'pointer' }}
              >
                {Object.entries(BLEND_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              
              <Slider label={`OPACITY ${Math.round(layer.opacity * 100)}%`} value={layer.opacity} min={0} max={1} step={0.01} onChange={(v) => onUpdate({ ...layer, opacity: v })} debounceMs={30} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


