'use client';

import { useState } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import { BLEND_MODES } from '../../constants';
import { COLORS, FONTS } from '../../constants/design';
import { ColorSwatch } from './ColorPicker';
import AlgorithmSelect from './AlgorithmSelect';
import Slider from './CustomSlider';
import Button from './Button';
import CustomSelect from './CustomSelect';
import Toggle from './Toggle';

export default function LayerPropertiesPanel({
  layer,
  index,
  totalLayers,
  onUpdate,
  onRemove,
  onDuplicate,
  canRemove,
  palette,
  colorKeys,
  onExport
}) {
  const algoInfo = DITHER_ALGORITHMS[layer.ditherType];
  const isHalftone = algoInfo?.category === 'halftone';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${COLORS.border.default}`
        }}>
          <h3 style={{
            fontSize: '10px',
            fontFamily: FONTS.ui,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: COLORS.text.secondary,
            margin: 0
          }}>
            LAYER SETTINGS
          </h3>
        </div>

        {/* Color */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: COLORS.text.tertiary,
            fontSize: '9px',
            marginBottom: '8px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            COLOR
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
            {colorKeys.map((key) => {
              const color = palette[key];
              if (!color) return null;
              return (
                <ColorSwatch
                  key={key}
                  color={color.hex}
                  selected={layer.colorKey === key}
                  onClick={() => onUpdate({ ...layer, colorKey: key })}
                  size="100%"
                  style={{ aspectRatio: '1/1' }}
                />
              );
            })}
          </div>
        </div>

        {/* Pattern */}
        <div style={{ marginBottom: '16px' }}>
          <AlgorithmSelect
            value={layer.ditherType}
            onChange={(v) => onUpdate({ ...layer, ditherType: v })}
          />
        </div>

        {/* Size */}
        {(algoInfo?.hasScale || isHalftone) && (
          <div style={{ marginBottom: '16px' }}>
            <Slider
              label={`SIZE ${layer.scale}px`}
              value={layer.scale}
              min={isHalftone ? 2 : 1}
              max={64}
              step={1}
              onChange={(v) => onUpdate({ ...layer, scale: v })}
              debounceMs={50}
            />
          </div>
        )}

        {/* Channel */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: COLORS.text.tertiary,
            fontSize: '9px',
            marginBottom: '6px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            CHANNEL
          </label>
          <CustomSelect
            value={layer.channel || 'gray'}
            onChange={(value) => onUpdate({ ...layer, channel: value })}
            options={[
              { value: 'gray', label: 'Greyscale' },
              { value: 'red', label: 'Red' },
              { value: 'green', label: 'Green' },
              { value: 'blue', label: 'Blue' },
              { value: 'cyan', label: 'Cyan' },
              { value: 'magenta', label: 'Magenta' },
              { value: 'yellow', label: 'Yellow' },
              { value: 'black', label: 'Black (K)' },
            ]}
          />
        </div>

        {/* Opacity */}
        <div style={{ marginBottom: '16px' }}>
          <Slider
            label={`OPACITY ${Math.round(layer.opacity * 100)}%`}
            value={layer.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => onUpdate({ ...layer, opacity: v })}
            debounceMs={30}
          />
        </div>

        {/* Blend Mode */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: COLORS.text.tertiary,
            fontSize: '9px',
            marginBottom: '6px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            BLEND MODE
          </label>
          <CustomSelect
            value={layer.blendMode}
            onChange={(value) => onUpdate({ ...layer, blendMode: value })}
            options={Object.entries(BLEND_MODES).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>

        {/* Knockout Toggle */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: COLORS.text.tertiary,
            fontSize: '9px',
            marginBottom: '6px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            KNOCKOUT
          </label>
          <Toggle
            checked={layer.knockout || false}
            onChange={(checked) => onUpdate({ ...layer, knockout: checked })}
          />
        </div>

        {/* Invert Toggle */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: COLORS.text.tertiary,
            fontSize: '9px',
            marginBottom: '6px',
            fontFamily: 'monospace',
            letterSpacing: '0.05em'
          }}>
            INVERT
          </label>
          <Toggle
            checked={layer.invert || false}
            onChange={(checked) => onUpdate({ ...layer, invert: checked })}
          />
        </div>

        {/* Adjustments Section */}
        <div style={{
          marginTop: '24px',
          marginBottom: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${COLORS.border.default}`
        }}>
          <h3 style={{
            fontSize: '10px',
            fontFamily: FONTS.ui,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: COLORS.text.secondary,
            margin: '0 0 16px 0'
          }}>
            ADJUSTMENTS
          </h3>

          {/* Gamma */}
          <div style={{ marginBottom: '16px' }}>
            <Slider
              label={`GAMMA ${(layer.gamma === undefined ? 1 : layer.gamma).toFixed(2)}`}
              value={layer.gamma === undefined ? 1 : layer.gamma}
              min={0.1}
              max={3}
              step={0.05}
              onChange={(v) => onUpdate({ ...layer, gamma: v })}
              debounceMs={50}
            />
          </div>

          {/* Brightness */}
          <div style={{ marginBottom: '16px' }}>
            <Slider
              label={`BRIGHTNESS ${layer.brightness > 0 ? '+' : ''}${layer.brightness || 0}`}
              value={layer.brightness || 0}
              min={-100}
              max={100}
              step={1}
              onChange={(v) => onUpdate({ ...layer, brightness: v })}
              debounceMs={50}
            />
          </div>

          {/* Contrast */}
          <div style={{ marginBottom: '16px' }}>
            <Slider
              label={`CONTRAST ${layer.contrast > 0 ? '+' : ''}${layer.contrast || 0}`}
              value={layer.contrast || 0}
              min={-100}
              max={100}
              step={1}
              onChange={(v) => onUpdate({ ...layer, contrast: v })}
              debounceMs={50}
            />
          </div>

          {/* Noise */}
          <div style={{ marginBottom: '16px' }}>
            <Slider
              label={`NOISE ${Math.round((layer.noise || 0) * 100)}`}
              value={layer.noise || 0}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => onUpdate({ ...layer, noise: v })}
              debounceMs={150}
            />
          </div>

          {/* Clamp (Halftone only) */}
          {isHalftone && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <Slider
                label={`CLAMP ${Math.round((layer.clampMin || 0) * 100)}`}
                value={layer.clampMin || 0}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ ...layer, clampMin: v })}
                debounceMs={50}
              />
              <Slider
                label={`${Math.round((layer.clampMax ?? 1) * 100)}`}
                value={layer.clampMax ?? 1}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => onUpdate({ ...layer, clampMax: v })}
                debounceMs={50}
              />
            </div>
          )}

          {/* Blur */}
          <div style={{ marginBottom: '16px' }}>
            <Slider
              label={`BLUR ${layer.preBlur || 0}px`}
              value={layer.preBlur || 0}
              min={0}
              max={20}
              step={1}
              onChange={(v) => onUpdate({ ...layer, preBlur: v })}
              debounceMs={150}
            />
          </div>
        </div>
      </div>

      {/* Fixed Export Button */}
      <div style={{
        padding: '16px',
        borderTop: `1px solid ${COLORS.border.default}`,
        backgroundColor: COLORS.bg.secondary
      }}>
        <Button
          onClick={onExport}
          style={{
            width: '100%',
            fontSize: '9px',
            padding: '12px'
          }}
        >
          EXPORT
        </Button>
      </div>
    </div>
  );
}
