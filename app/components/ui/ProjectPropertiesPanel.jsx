'use client';

import { useState } from 'react';
import { PRESETS } from '../../constants/presets';
import { EXPORT_RESOLUTIONS } from '../../constants';
import Button from './Button';
import Slider from './CustomSlider';
import Tooltip from './CustomTooltip';
import IconButton from './IconButton';
import { ColorSwatch } from './ColorPicker';

// Simple section header (non-collapsible)
function SectionHeader({ title }) {
  return (
    <h3 style={{
      fontSize: '10px',
      color: '#666',
      fontFamily: 'monospace',
      letterSpacing: '0.1em',
      marginBottom: '12px',
      textTransform: 'uppercase'
    }}>
      {title}
    </h3>
  );
}

// Selector button component for resolution and SVG mode
function SelectorButton({ selected, onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        backgroundColor: 'transparent',
        border: selected ? 'none' : '1px solid #333',
        outline: selected ? '1px solid #fff' : 'none',
        color: selected ? '#fff' : '#666',
        fontSize: '9px',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        letterSpacing: '0.05em',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.target.style.borderColor = '#555';
          e.target.style.color = '#888';
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.target.style.borderColor = '#333';
          e.target.style.color = '#666';
        }
      }}
    >
      {children}
    </button>
  );
}

export default function ProjectPropertiesPanel({
  customPresets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
  presetImportRef,
  inkBleed,
  onInkBleedChange,
  inkBleedAmount,
  onInkBleedAmountChange,
  inkBleedRoughness,
  onInkBleedRoughnessChange,
  paperTexture,
  onPaperTextureChange,
  backgroundColor,
  onBackgroundColorChange,
  exportResolution,
  onExportResolutionChange,
  onExportPNG,
  onExportSVGCombined,
  onExportSVGLayers,
  palette,
  colorKeys,
  hasImage
}) {
  const [presetTab, setPresetTab] = useState('default');
  const [svgMode, setSvgMode] = useState('single'); // 'single' or 'separate'

  // Get preset entries as array
  const presetEntries = Object.entries(PRESETS);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable Middle Section (Presets + Analog Effects) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Presets Section */}
        <SectionHeader title="PRESETS" />

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '12px', borderBottom: '1px solid #222' }}>
          <button
            onClick={() => setPresetTab('default')}
            style={{
              flex: 1,
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: presetTab === 'default' ? '1px solid #fff' : '1px solid transparent',
              color: presetTab === 'default' ? '#fff' : '#666',
              fontSize: '10px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            DEFAULT
          </button>
          <button
            onClick={() => setPresetTab('custom')}
            style={{
              flex: 1,
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderBottom: presetTab === 'custom' ? '1px solid #fff' : '1px solid transparent',
              color: presetTab === 'custom' ? '#fff' : '#666',
              fontSize: '10px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            CUSTOM
          </button>
        </div>

        {/* Randomize Button - Full width with icon */}
        <Button
          onClick={() => onApplyPreset('random')}
          style={{
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px'
          }}
        >
          <span>RANDOMIZE</span>
          <span style={{ fontSize: '14px' }}>⤭</span>
        </Button>

        {presetTab === 'default' ? (
          /* Default Presets Grid - 4 columns */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '24px'
          }}>
            {presetEntries.map(([key, preset], index) => {
              // If we have exactly 5 presets and this is the 5th, span 2 columns
              // If we have 6 presets and this is the 5th or 6th, span 2 columns each
              const totalPresets = presetEntries.length;
              const remainder = totalPresets % 4;
              const isLastRow = index >= totalPresets - remainder && remainder > 0;

              let gridColumn = 'auto';
              if (isLastRow) {
                if (remainder === 1) {
                  // Single item in last row - span all 4
                  gridColumn = 'span 4';
                } else if (remainder === 2) {
                  // Two items in last row - span 2 each
                  gridColumn = 'span 2';
                } else if (remainder === 3) {
                  // Three items - first spans 2, others span 1
                  // Actually let's just leave them as-is for 3
                  gridColumn = 'auto';
                }
              }

              return (
                <Tooltip key={key} text={preset.description}>
                  <Button
                    onClick={() => onApplyPreset(key)}
                    style={{
                      fontSize: '9px',
                      gridColumn
                    }}
                  >
                    {preset.name}
                  </Button>
                </Tooltip>
              );
            })}
          </div>
        ) : (
          /* Custom Presets */
          <div style={{ marginBottom: '24px' }}>
            {Object.keys(customPresets).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                {Object.entries(customPresets).map(([key, preset]) => (
                  <div key={key} style={{ display: 'flex', gap: '4px' }}>
                    <Button onClick={() => onApplyPreset(key, true)} style={{ flex: 1, fontSize: '9px' }}>
                      {preset.name}
                    </Button>
                    <IconButton onClick={() => onDeletePreset(key)} title="Delete">×</IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '9px', color: '#444', margin: '0 0 16px 0', textAlign: 'center' }}>
                No custom presets saved
              </p>
            )}

            <Button onClick={onSavePreset} style={{ marginBottom: '12px' }}>
              + SAVE CURRENT AS PRESET
            </Button>

            {/* Export/Import */}
            <div style={{ borderTop: '1px solid #222', paddingTop: '12px', marginTop: '4px' }}>
              <input
                ref={presetImportRef}
                type="file"
                accept=".json"
                onChange={onImportPresets}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: '4px' }}>
                <Tooltip text="Export all saved presets as JSON">
                  <Button
                    onClick={onExportPresets}
                    style={{ flex: 1, fontSize: '9px', opacity: Object.keys(customPresets).length > 0 ? 1 : 0.4 }}
                  >
                    EXPORT
                  </Button>
                </Tooltip>
                <Tooltip text="Import presets from JSON file">
                  <Button
                    onClick={() => presetImportRef.current?.click()}
                    style={{ flex: 1, fontSize: '9px' }}
                  >
                    IMPORT
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Analog Effects Section */}
        <SectionHeader title="ANALOG EFFECTS" />

        <div style={{ marginBottom: '16px' }}>
          <Button
            onClick={() => onInkBleedChange(!inkBleed)}
            active={inkBleed}
            style={{ marginBottom: inkBleed ? '12px' : '0' }}
          >
            INK BLEED
          </Button>
          {inkBleed && (
            <>
              <Slider
                label={`SPREAD ${Math.round(inkBleedAmount * 100)}%`}
                value={inkBleedAmount}
                min={0.1}
                max={1}
                step={0.05}
                onChange={onInkBleedAmountChange}
              />
              <Slider
                label={`ROUGHNESSS ${Math.round(inkBleedRoughness * 100)}%`}
                value={inkBleedRoughness}
                min={0}
                max={1}
                step={0.05}
                onChange={onInkBleedRoughnessChange}
              />
            </>
          )}
        </div>

        <Button onClick={() => onPaperTextureChange(!paperTexture)} active={paperTexture}>
          PAPER MODE
        </Button>
      </div>

      {/* Fixed Bottom Export Section */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid #222',
        padding: '16px',
        backgroundColor: '#000'
      }}>
        <SectionHeader title="EXPORT" />

        {/* Background Color Label */}
        <label style={{
          display: 'block',
          color: '#666',
          fontSize: '10px',
          marginBottom: '8px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          BACKGROUND
        </label>

        {/* Palette colors - 4 columns - pass key so background follows palette changes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '6px'
          }}>
          {colorKeys.map((key) => (
            <ColorSwatch
              key={key}
              color={palette[key]?.hex || '#000000'}
              selected={backgroundColor === palette[key]?.hex}
              onClick={() => onBackgroundColorChange(key)}
              size="100%"
              style={{ aspectRatio: '1', maxHeight: '32px' }}
            />
          ))}
        </div>

        {/* Black & White - 2 columns, full width */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            marginBottom: '16px'
          }}>
          <ColorSwatch
            color="#000000"
            selected={backgroundColor === '#000000'}
            onClick={() => onBackgroundColorChange('#000000')}
            size="100%"
            style={{ aspectRatio: '2.5', maxHeight: '32px' }}
          />
          <ColorSwatch
            color="#FFFFFF"
            selected={backgroundColor === '#FFFFFF' || backgroundColor === '#ffffff'}
            onClick={() => onBackgroundColorChange('#FFFFFF')}
            size="100%"
            style={{ aspectRatio: '2.5', maxHeight: '32px' }}
          />
        </div>

        {/* Resolution Label */}
        <label style={{
          display: 'block',
          color: '#666',
          fontSize: '10px',
          marginBottom: '8px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          RESOLUTION
        </label>

        {/* Resolution Selectors */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {Object.entries(EXPORT_RESOLUTIONS).map(([key, { label }]) => (
            <SelectorButton
              key={key}
              selected={exportResolution === key}
              onClick={() => onExportResolutionChange(key)}
            >
              {label}
            </SelectorButton>
          ))}
        </div>

        {/* Export PNG Button */}
        <Button
          primary
          onClick={onExportPNG}
          disabled={!hasImage}
          style={{
            marginBottom: '16px',
            opacity: hasImage ? 1 : 0.4
          }}
        >
          EXPORT PNG
        </Button>

        {/* SVG Export Label */}
        <label style={{
          display: 'block',
          color: '#666',
          fontSize: '10px',
          marginBottom: '8px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em'
        }}>
          SVG EXPORT
        </label>

        {/* SVG Mode Selectors */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <SelectorButton
            selected={svgMode === 'single'}
            onClick={() => setSvgMode('single')}
          >
            SINGLE FILE
          </SelectorButton>
          <SelectorButton
            selected={svgMode === 'separate'}
            onClick={() => setSvgMode('separate')}
          >
            SEPARATE LAYERS (ZIP)
          </SelectorButton>
        </div>

        {/* Export SVG Button */}
        <Button
          onClick={svgMode === 'single' ? onExportSVGCombined : onExportSVGLayers}
          disabled={!hasImage}
          style={{ opacity: hasImage ? 1 : 0.4 }}
        >
          EXPORT SVG
        </Button>
      </div>
    </div>
  );
}
