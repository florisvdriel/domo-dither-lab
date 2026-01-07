'use client';

import { useState } from 'react';
import { EXPORT_RESOLUTIONS } from '../../constants';
import Button from './Button';

// Selector button component for resolution and SVG mode
function SelectorButton({ selected, onClick, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 12px',
        backgroundColor: selected ? '#fff' : 'transparent',
        border: '1px solid',
        borderColor: selected ? '#fff' : '#333',
        color: selected ? '#000' : '#666',
        fontSize: '9px',
        fontFamily: 'monospace',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        letterSpacing: '0.05em',
        fontWeight: selected ? '600' : '400',
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

export default function ExportControls({
  exportResolution,
  onExportResolutionChange,
  onExportPNG,
  onExportSVGCombined,
  onExportSVGLayers,
  hasImage
}) {
  const [svgMode, setSvgMode] = useState('single'); // 'single' or 'separate'

  return (
    <div>
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
        EXPORT
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
  );
}
