'use client';

import { useRef, useState, useEffect } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import { BLEND_MODES } from '../../constants';
import { LayerColorDropdown } from './ColorPicker';
import AlgorithmSelect from './AlgorithmSelect';
import Slider from './Slider';
import Button from './Button';
import { Accordion, AccordionSection } from './Accordion';

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
  const isHalftone = algoInfo?.category === 'halftone';
  const isDitherOrOrganic = algoInfo?.category === 'ordered' || algoInfo?.category === 'diffusion' || algoInfo?.category === 'other';

  // Per-layer accordion persistence
  const openByLayerIdRef = useRef(new Map());
  const [openSectionId, setOpenSectionId] = useState('layer-settings');

  // Restore open section when layer changes
  useEffect(() => {
    const saved = openByLayerIdRef.current.get(layer.id);
    if (saved) {
      // Check if saved section exists for current algorithm category
      const validSections = ['layer-settings', 'extra-actions', 'image-adjustments', 'image-effects', 'offset', 'blending', 'actions'];
      if (isHalftone) {
        validSections.push('grid-settings', 'pattern-settings');
      }
      setOpenSectionId(validSections.includes(saved) ? saved : 'layer-settings');
    } else {
      setOpenSectionId('layer-settings');
    }
  }, [layer.id, isHalftone]);

  const handleSectionChange = (sectionId) => {
    setOpenSectionId(sectionId);
    openByLayerIdRef.current.set(layer.id, sectionId);
  };

  // Helper: Channel selector (shared across all patterns)
  const renderChannelSelector = () => (
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
  );

  // Helper: Toggle button
  const ToggleButton = ({ active, onClick, children }) => {
    const [hovering, setHovering] = useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-pressed={active}
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: active ? '#fff' : (hovering ? '#111' : '#000'),
          color: active ? '#000' : '#fff',
          border: '1px solid #333',
          fontSize: '9px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          letterSpacing: '0.05em',
          transition: 'all 0.15s ease'
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <div>
      <Accordion value={openSectionId} onChange={handleSectionChange}>

        {/* 1. LAYER SETTINGS */}
        <AccordionSection
          id="layer-settings"
          title="LAYER SETTINGS"
          isOpen={openSectionId === 'layer-settings'}
          onToggle={() => handleSectionChange('layer-settings')}
        >
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

          {/* Pattern */}
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

          {/* Channel */}
          {(isDitherOrOrganic || isHalftone) && (
            <div style={{ marginTop: '16px' }}>
              {renderChannelSelector()}
            </div>
          )}

          {/* Size (for dither patterns and noise) */}
          {algoInfo?.hasScale && !isHalftone && (
            <div style={{ marginTop: '16px' }}>
              <Slider
                label={`SIZE ${layer.scale}px`}
                value={layer.scale}
                min={1}
                max={64}
                step={1}
                onChange={(v) => onUpdate({ ...layer, scale: v })}
                debounceMs={50}
              />
            </div>
          )}
        </AccordionSection>

        {/* 2. EXTRA ACTIONS */}
        <AccordionSection
          id="extra-actions"
          title="EXTRA ACTIONS"
          isOpen={openSectionId === 'extra-actions'}
          onToggle={() => handleSectionChange('extra-actions')}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Knockout */}
            <div>
              <label style={{
                display: 'block',
                color: '#666',
                fontSize: '9px',
                marginBottom: '6px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}>
                KNOCKOUT
              </label>
              <ToggleButton
                active={layer.knockout}
                onClick={() => onUpdate({ ...layer, knockout: !layer.knockout })}
              >
                {layer.knockout ? 'KNOCKOUT ON' : 'KNOCKOUT OFF'}
              </ToggleButton>
              <p style={{
                fontSize: '9px',
                color: '#444',
                margin: '6px 0 0 0'
              }}>
                Punches through inks below to the background where this layer prints.
              </p>
            </div>

            {/* Invert */}
            <div>
              <label style={{
                display: 'block',
                color: '#666',
                fontSize: '9px',
                marginBottom: '6px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}>
                INVERT IMAGE
              </label>
              <ToggleButton
                active={layer.invert}
                onClick={() => onUpdate({ ...layer, invert: !layer.invert })}
              >
                {layer.invert ? 'INVERTED' : 'NORMAL'}
              </ToggleButton>
            </div>
          </div>
        </AccordionSection>

        {/* 3. GRID SETTINGS (Halftone only) */}
        {isHalftone && (
          <AccordionSection
            id="grid-settings"
            title="GRID SETTINGS"
            isOpen={openSectionId === 'grid-settings'}
            onToggle={() => handleSectionChange('grid-settings')}
          >
            {/* Grid Type */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                color: '#666',
                fontSize: '9px',
                marginBottom: '6px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em'
              }}>
                GRID KIND
              </label>
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
                  cursor: 'pointer'
                }}
              >
                <option value="square">SQUARE</option>
                <option value="hex">HEXAGONAL</option>
                <option value="radial">RADIAL</option>
              </select>
            </div>

            {/* Size */}
            <Slider
              label={`SIZE ${layer.scale}px`}
              value={layer.scale}
              min={2}
              max={64}
              step={1}
              onChange={(v) => onUpdate({ ...layer, scale: v })}
              debounceMs={50}
            />

            {/* Rotation */}
            <Slider
              label={`ROTATION ${layer.angle}°`}
              value={layer.angle}
              min={0}
              max={180}
              step={1}
              onChange={(v) => onUpdate({ ...layer, angle: v })}
              debounceMs={50}
            />
          </AccordionSection>
        )}

        {/* 4. PATTERN SETTINGS (Halftone only) */}
        {isHalftone && (
          <AccordionSection
            id="pattern-settings"
            title="PATTERN SETTINGS"
            isOpen={openSectionId === 'pattern-settings'}
            onToggle={() => handleSectionChange('pattern-settings')}
          >
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
          </AccordionSection>
        )}

        {/* 5. IMAGE ADJUSTMENTS */}
        <AccordionSection
          id="image-adjustments"
          title="IMAGE ADJUSTMENTS"
          isOpen={openSectionId === 'image-adjustments'}
          onToggle={() => handleSectionChange('image-adjustments')}
        >
          {/* Brightness & Contrast */}
          <Slider
            label={`BRIGHTNESS ${layer.brightness > 0 ? '+' : ''}${layer.brightness || 0}`}
            value={layer.brightness || 0}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => onUpdate({ ...layer, brightness: v })}
            debounceMs={50}
          />
          <Slider
            label={`CONTRAST ${layer.contrast > 0 ? '+' : ''}${layer.contrast || 0}`}
            value={layer.contrast || 0}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => onUpdate({ ...layer, contrast: v })}
            debounceMs={50}
          />

          {/* Tone Adjustments */}
          {(isDitherOrOrganic || isHalftone) && (
            <>
              <div style={{ borderTop: '1px solid #222', margin: '12px 0', paddingTop: '12px' }}>
                <Slider
                  label={`SHADOWS ${layer.shadows > 0 ? '+' : ''}${Math.round((layer.shadows || 0) * 100)}`}
                  value={layer.shadows || 0}
                  min={-1}
                  max={1}
                  step={0.05}
                  onChange={(v) => onUpdate({ ...layer, shadows: v })}
                  debounceMs={150}
                />
                <Slider
                  label={`MIDTONES ${layer.midtones > 0 ? '+' : ''}${Math.round((layer.midtones || 0) * 100)}`}
                  value={layer.midtones || 0}
                  min={-1}
                  max={1}
                  step={0.05}
                  onChange={(v) => onUpdate({ ...layer, midtones: v })}
                  debounceMs={150}
                />
                <Slider
                  label={`HIGHLIGHTS ${layer.highlights > 0 ? '+' : ''}${Math.round((layer.highlights || 0) * 100)}`}
                  value={layer.highlights || 0}
                  min={-1}
                  max={1}
                  step={0.05}
                  onChange={(v) => onUpdate({ ...layer, highlights: v })}
                  debounceMs={150}
                />
              </div>
            </>
          )}

          {/* Clamp (Halftone only) */}
          {isHalftone && (
            <div style={{ borderTop: '1px solid #222', margin: '12px 0', paddingTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
            </div>
          )}
        </AccordionSection>

        {/* 6. IMAGE EFFECTS */}
        <AccordionSection
          id="image-effects"
          title="IMAGE EFFECTS"
          isOpen={openSectionId === 'image-effects'}
          onToggle={() => handleSectionChange('image-effects')}
        >
          {/* Sharpen */}
          {(isDitherOrOrganic || isHalftone) && (
            <>
              <Slider
                label={`SHARPEN ${layer.sharpen || 0}`}
                value={layer.sharpen || 0}
                min={0}
                max={10}
                step={0.5}
                onChange={(v) => onUpdate({ ...layer, sharpen: v })}
                debounceMs={150}
              />
              <Slider
                label={`SHARPEN RADIUS ${layer.sharpenRadius || 1}px`}
                value={layer.sharpenRadius || 1}
                min={1}
                max={20}
                step={1}
                onChange={(v) => onUpdate({ ...layer, sharpenRadius: v })}
                debounceMs={150}
              />
            </>
          )}

          {/* Blur */}
          {(isDitherOrOrganic || isHalftone) && (
            <Slider
              label={`BLUR ${layer.preBlur || 0}px`}
              value={layer.preBlur || 0}
              min={0}
              max={20}
              step={1}
              onChange={(v) => onUpdate({ ...layer, preBlur: v })}
              debounceMs={150}
            />
          )}

          {/* Noise */}
          {(isDitherOrOrganic || isHalftone) && (
            <Slider
              label={`NOISE ${Math.round((layer.noise || 0) * 100)}%`}
              value={layer.noise || 0}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => onUpdate({ ...layer, noise: v })}
              debounceMs={150}
            />
          )}

          {/* Denoise */}
          {(isDitherOrOrganic || isHalftone) && (
            <Slider
              label={`DENOISE ${Math.round((layer.denoise || 0) * 100)}%`}
              value={layer.denoise || 0}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => onUpdate({ ...layer, denoise: v })}
              debounceMs={150}
            />
          )}
        </AccordionSection>

        {/* 7. OFFSET */}
        <AccordionSection
          id="offset"
          title="OFFSET"
          isOpen={openSectionId === 'offset'}
          onToggle={() => handleSectionChange('offset')}
        >
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
        </AccordionSection>

        {/* 8. BLENDING */}
        <AccordionSection
          id="blending"
          title="BLENDING"
          isOpen={openSectionId === 'blending'}
          onToggle={() => handleSectionChange('blending')}
        >
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
        </AccordionSection>

        {/* 9. ACTIONS */}
        <AccordionSection
          id="actions"
          title="ACTIONS"
          isOpen={openSectionId === 'actions'}
          onToggle={() => handleSectionChange('actions')}
        >
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
        </AccordionSection>

      </Accordion>
    </div>
  );
}
