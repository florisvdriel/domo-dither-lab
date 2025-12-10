'use client';

import { useState } from 'react';
import { PRESETS } from '../../constants/presets';
import { EXPORT_RESOLUTIONS } from '../../constants';
import Button from './Button';
import Slider from './Slider';
import Tooltip from './Tooltip';
import IconButton from './IconButton';
import { ColorSwatch } from './ColorPicker';
import Section from './Section';

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

  return (
    <div>
      {/* Presets Section */}
      <Section title="PRESETS" defaultOpen={true}>
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

        {/* Randomize Button */}
        <Button onClick={() => onApplyPreset('random')} style={{ marginBottom: '12px' }}>
          ↻ RANDOMIZE
        </Button>

        {presetTab === 'default' ? (
          /* Default Presets Grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <Tooltip key={key} text={preset.description}>
                <Button onClick={() => onApplyPreset(key)} style={{ fontSize: '9px' }}>
                  {preset.name}
                </Button>
              </Tooltip>
            ))}
          </div>
        ) : (
          /* Custom Presets */
          <div>
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
      </Section>

      {/* Analog Effects Section */}
      <Section title="ANALOG EFFECTS" defaultOpen={true}>
        <div style={{ marginBottom: '16px' }}>
          <Button onClick={() => onInkBleedChange(!inkBleed)} active={inkBleed} style={{ marginBottom: inkBleed ? '12px' : '0' }}>
            {inkBleed ? '● INK BLEED' : '○ INK BLEED'}
          </Button>
          {inkBleed && (
            <>
              <Slider 
                label={`SPREAD ${Math.round(inkBleedAmount * 100)}%`} 
                value={inkBleedAmount} min={0.1} max={1} step={0.05} onChange={onInkBleedAmountChange} 
              />
              <Slider 
                label={`ROUGHNESS ${Math.round(inkBleedRoughness * 100)}%`} 
                value={inkBleedRoughness} min={0} max={1} step={0.05} onChange={onInkBleedRoughnessChange} 
              />
            </>
          )}
        </div>
        
        <Button onClick={() => onPaperTextureChange(!paperTexture)} active={paperTexture}>
          {paperTexture ? '● PAPER MODE' : '○ PAPER MODE'}
        </Button>
      </Section>

      {/* Export Section */}
      <Section title="EXPORT" defaultOpen={true}>
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
        <div style={{ 
          display: 'flex', 
          gap: '6px', 
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Palette colors */}
          {colorKeys.map(key => (
            <ColorSwatch
              key={key}
              color={palette[key]?.hex || '#000000'}
              selected={backgroundColor === palette[key]?.hex}
              onClick={() => onBackgroundColorChange(palette[key]?.hex)}
              size={28}
            />
          ))}
          {/* Black and white */}
          <ColorSwatch
            color="#000000"
            selected={backgroundColor === '#000000'}
            onClick={() => onBackgroundColorChange('#000000')}
            size={28}
          />
          <ColorSwatch
            color="#FFFFFF"
            selected={backgroundColor === '#FFFFFF' || backgroundColor === '#ffffff'}
            onClick={() => onBackgroundColorChange('#FFFFFF')}
            size={28}
          />
        </div>
        
        <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', fontFamily: 'monospace' }}>
          RESOLUTION
        </label>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {Object.entries(EXPORT_RESOLUTIONS).map(([key, { label }]) => (
            <Button key={key} onClick={() => onExportResolutionChange(key)} active={exportResolution === key} style={{ flex: 1, fontSize: '8px' }}>
              {label}
            </Button>
          ))}
        </div>
        
        {hasImage && (
          <>
            <Button primary onClick={onExportPNG} style={{ marginBottom: '8px' }}>EXPORT PNG</Button>
            
            {/* SVG Export Options */}
            <label style={{ display: 'block', color: '#666', fontSize: '10px', marginBottom: '8px', marginTop: '16px', fontFamily: 'monospace' }}>
              SVG EXPORT
            </label>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <Tooltip text="Single SVG with all layers as groups">
                <Button 
                  onClick={onExportSVGCombined} 
                  style={{ flex: 1, fontSize: '9px' }}
                >
                  SINGLE FILE
                </Button>
              </Tooltip>
              <Tooltip text="ZIP file with separate SVG per layer">
                <Button 
                  onClick={onExportSVGLayers}
                  style={{ flex: 1, fontSize: '9px' }}
                >
                  SEPARATE LAYERS (ZIP)
                </Button>
              </Tooltip>
            </div>
            <Button onClick={onExportSVGCombined} style={{ marginTop: '8px' }}>
              EXPORT SVG
            </Button>
          </>
        )}
      </Section>
    </div>
  );
}


