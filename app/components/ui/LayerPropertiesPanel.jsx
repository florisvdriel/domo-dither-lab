'use client';

import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import { BLEND_MODES } from '../../constants';
import { CompactColorPicker } from './ColorPicker';
import AlgorithmSelect from './AlgorithmSelect';
import Slider from './Slider';
import Button from './Button';
import Section from './Section';

export default function LayerPropertiesPanel({
  layer,
  index,
  totalLayers,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
  palette
}) {
  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];

  return (
    <div>
      {/* Layer Settings Section */}
      <Section title="LAYER SETTINGS" defaultOpen={true}>
        {/* Color */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            color: '#666', 
            fontSize: '10px', 
            marginBottom: '8px', 
            fontFamily: 'monospace', 
            letterSpacing: '0.05em' 
          }}>
            COLOR
          </label>
          <CompactColorPicker 
            value={layer.colorKey} 
            onChange={(k) => onUpdate({ ...layer, colorKey: k })} 
            palette={palette} 
          />
        </div>
        
        {/* Algorithm */}
        <AlgorithmSelect 
          value={layer.ditherType} 
          onChange={(v) => onUpdate({ ...layer, ditherType: v })} 
        />
        
        {/* Density */}
        <Slider 
          label={`DENSITY ${Math.round(layer.threshold * 100)}%`} 
          value={layer.threshold} 
          min={0} 
          max={1} 
          step={0.01} 
          onChange={(v) => onUpdate({ ...layer, threshold: v })} 
          debounceMs={50} 
        />
        
        {/* Size (if applicable) */}
        {algoInfo?.hasScale && (
          <Slider 
            label={`SIZE ${layer.scale}px`} 
            value={layer.scale} 
            min={2} 
            max={32} 
            step={1} 
            onChange={(v) => onUpdate({ ...layer, scale: v })} 
            debounceMs={50} 
          />
        )}
        
        {/* Angle (if applicable) */}
        {algoInfo?.hasAngle && (
          <Slider 
            label={`ANGLE ${layer.angle}°`} 
            value={layer.angle} 
            min={0} 
            max={180} 
            step={5} 
            onChange={(v) => onUpdate({ ...layer, angle: v })} 
            debounceMs={50} 
          />
        )}
      </Section>

      {/* Offset Section */}
      <Section title="OFFSET" defaultOpen={true}>
        <p style={{ 
          fontSize: '9px', 
          color: '#444', 
          margin: '0 0 12px 0'
        }}>
          Misregistration effect
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Slider 
            label={`X ${layer.offsetX}px`} 
            value={layer.offsetX} 
            min={-50} 
            max={50} 
            step={1} 
            onChange={(v) => onUpdate({ ...layer, offsetX: v })} 
            debounceMs={30} 
          />
          <Slider 
            label={`Y ${layer.offsetY}px`} 
            value={layer.offsetY} 
            min={-50} 
            max={50} 
            step={1} 
            onChange={(v) => onUpdate({ ...layer, offsetY: v })} 
            debounceMs={30} 
          />
        </div>
      </Section>

      {/* Blending Section */}
      <Section title="BLENDING" defaultOpen={true}>
        <label style={{ 
          display: 'block', 
          color: '#666', 
          fontSize: '10px', 
          marginBottom: '8px', 
          fontFamily: 'monospace' 
        }}>
          BLEND MODE
        </label>
        <select 
          value={layer.blendMode} 
          onChange={(e) => onUpdate({ ...layer, blendMode: e.target.value })} 
          style={{ 
            width: '100%', 
            padding: '8px', 
            backgroundColor: '#000', 
            border: '1px solid #333', 
            color: '#fff', 
            fontSize: '10px', 
            fontFamily: 'monospace', 
            marginBottom: '16px', 
            cursor: 'pointer' 
          }}
        >
          {Object.entries(BLEND_MODES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        
        <Slider 
          label={`OPACITY ${Math.round(layer.opacity * 100)}%`} 
          value={layer.opacity} 
          min={0} 
          max={1} 
          step={0.01} 
          onChange={(v) => onUpdate({ ...layer, opacity: v })} 
          debounceMs={30} 
        />
      </Section>

      {/* Layer Actions */}
      <Section title="ACTIONS" defaultOpen={true}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={onDuplicate} style={{ flex: 1, fontSize: '9px' }}>
            DUPLICATE
          </Button>
          {canRemove && (
            <Button onClick={onRemove} style={{ flex: 1, fontSize: '9px', color: '#ff6b6b' }}>
              DELETE
            </Button>
          )}
        </div>
      </Section>
    </div>
  );
}




