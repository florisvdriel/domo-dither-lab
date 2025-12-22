'use client';

import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import { BLEND_MODES } from '../../constants';
import { LayerColorDropdown } from './ColorPicker';
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
  palette,
  onUpdatePaletteColor
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
          <LayerColorDropdown
            value={layer.colorKey}
            onChange={(k) => onUpdate({ ...layer, colorKey: k })}
            palette={palette}
            onUpdatePaletteColor={onUpdatePaletteColor}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px', marginBottom: '8px' }}>
          <Slider
            label={`BRIGHT ${layer.brightness > 0 ? '+' : ''}${Math.round((layer.brightness || 0) * 100)}`}
            value={layer.brightness || 0}
            min={-0.5}
            max={0.5}
            step={0.05}
            onChange={(v) => onUpdate({ ...layer, brightness: v })}
            debounceMs={50}
          />
          <Slider
            label={`CONTRAST ${layer.contrast > 0 ? '+' : ''}${Math.round((layer.contrast || 0) * 100)}`}
            value={layer.contrast || 0}
            min={-0.5}
            max={0.5}
            step={0.05}
            onChange={(v) => onUpdate({ ...layer, contrast: v })}
            debounceMs={50}
          />
        </div>

        {/* Size (if applicable) */}
        {/* Standard Size (Non-Halftone) */}
        {algoInfo?.hasScale && algoInfo.category !== 'halftone' && (
          <Slider
            label={`SIZE ${layer.scale}px`}
            value={layer.scale}
            min={1}
            max={64}
            step={1}
            onChange={(v) => onUpdate({ ...layer, scale: v })}
            debounceMs={50}
          />
        )}

        {/* --- HALFTONE SPECIFIC CONTROLS --- */}
        {algoInfo?.category === 'halftone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>

            {/* 1. CHANNEL SELECTOR */}
            <div>
              <label style={{
                display: 'block',
                color: '#666',
                fontSize: '9px',
                marginBottom: '6px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}>
                CHANNEL
              </label>
              <select
                value={layer.channel || 'gray'}
                onChange={(e) => onUpdate({ ...layer, channel: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  cursor: 'pointer'
                }}
              >
                <option value="gray">GRAYSCALE</option>
                <option value="red">RED</option>
                <option value="green">GREEN</option>
                <option value="blue">BLUE</option>
                <option value="cyan">CYAN</option>
                <option value="magenta">MAGENTA</option>
                <option value="yellow">YELLOW</option>
                <option value="black">BLACK (K)</option>
              </select>
            </div>

            {/* 2. GRID CONTROLS */}
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
              <label style={{ display: 'block', color: '#444', fontSize: '9px', marginBottom: '8px' }}>GRID</label>

              {/* Type */}
              <select
                value={layer.gridType || 'square'}
                onChange={(e) => onUpdate({ ...layer, gridType: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px',
                  backgroundColor: '#000',
                  border: '1px solid #333',
                  color: '#fff',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  marginBottom: '8px',
                  cursor: 'pointer'
                }}
              >
                <option value="square">SQUARE</option>
                <option value="hex">HEXAGONAL</option>
                <option value="radial">RADIAL</option>
              </select>

              <Slider
                label={`SIZE ${layer.scale}px`}
                value={layer.scale}
                min={2}
                max={64}
                step={1}
                onChange={(v) => onUpdate({ ...layer, scale: v })}
                debounceMs={50}
              />
              <Slider
                label={`ROTATION ${layer.angle}°`}
                value={layer.angle}
                min={0}
                max={180}
                step={1}
                onChange={(v) => onUpdate({ ...layer, angle: v })}
                debounceMs={50}
              />
            </div>

            {/* 3. DOT CONTROLS */}
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
              <label style={{ display: 'block', color: '#444', fontSize: '9px', marginBottom: '8px' }}>DOTS</label>

              <Slider
                label={`SCALE MIN ${Math.round((layer.dotScaleMin ?? 0.1) * 100)}%`}
                value={layer.dotScaleMin ?? 0.1}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ ...layer, dotScaleMin: v })}
                debounceMs={50}
              />
              <Slider
                label={`SCALE MAX ${Math.round((layer.dotScaleMax ?? 1) * 100)}%`}
                value={layer.dotScaleMax ?? 1}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => onUpdate({ ...layer, dotScaleMax: v })}
                debounceMs={50}
              />
              <Slider
                label={`HARDNESS ${Math.round((layer.hardness ?? 1) * 100)}%`}
                value={layer.hardness ?? 1}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ ...layer, hardness: v })}
                debounceMs={50}
              />
            </div>

            {/* 4. PRE-PROCESS */}
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px' }}>
              <label style={{ display: 'block', color: '#444', fontSize: '9px', marginBottom: '8px' }}>INPUT ADJUST</label>

              <Slider
                label={`PRE-BLUR ${layer.preBlur || 0}px`}
                value={layer.preBlur || 0}
                min={0}
                max={20}
                step={1}
                onChange={(v) => onUpdate({ ...layer, preBlur: v })}
                debounceMs={50}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <Slider
                  label={`CLAMP LO ${Math.round((layer.clampMin || 0) * 100)}`}
                  value={layer.clampMin || 0}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => onUpdate({ ...layer, clampMin: v })}
                  debounceMs={50}
                />
                <Slider
                  label={`CLAMP HI ${Math.round((layer.clampMax ?? 1) * 100)}`}
                  value={layer.clampMax ?? 1}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) => onUpdate({ ...layer, clampMax: v })}
                  debounceMs={50}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <Button
                  onClick={() => onUpdate({ ...layer, invert: !layer.invert })}
                  style={{
                    width: '100%',
                    backgroundColor: layer.invert ? '#fff' : '#000',
                    color: layer.invert ? '#000' : '#fff',
                    border: '1px solid #333'
                  }}
                >
                  {layer.invert ? 'INVERTED' : 'INVERT INPUT'}
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* Standard Angle (Non-Halftone) */}
        {algoInfo?.hasAngle && algoInfo.category !== 'halftone' && (
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







