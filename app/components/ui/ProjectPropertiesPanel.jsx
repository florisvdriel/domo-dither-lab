'use client';

import { useState } from 'react';
import { PRESETS } from '../../constants/presets/index';
import Button from './Button';
import Slider from './CustomSlider';
import Tooltip from './CustomTooltip';
import IconButton from './IconButton';

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
  onOpenExport,
  hasImage
}) {
  const [presetTab, setPresetTab] = useState('default');

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

        <Button
          primary
          onClick={onOpenExport}
          disabled={!hasImage}
          style={{
            opacity: hasImage ? 1 : 0.4
          }}
        >
          EXPORT
        </Button>
      </div>
    </div>
  );
}
