'use client';

import { useState } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import Tooltip from './Tooltip';

export default function AlgorithmSelect({ value, onChange, includeNone = false }) {
  const [hovering, setHovering] = useState(false);
  const algoInfo = DITHER_ALGORITHMS[value];
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ color: '#666', fontSize: '10px', fontFamily: 'monospace' }}>PATTERN</label>
        {algoInfo?.description && (
          <Tooltip text={algoInfo.description}>
            <span style={{ marginLeft: '6px', color: '#444', fontSize: '10px', cursor: 'help' }}>ⓘ</span>
          </Tooltip>
        )}
      </div>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{ 
          width: '100%', 
          padding: '8px', 
          backgroundColor: '#000', 
          border: hovering ? '1px solid #444' : '1px solid #333', 
          color: '#fff', 
          fontSize: '10px', 
          fontFamily: 'monospace',
          cursor: 'pointer',
          transition: 'border-color 0.12s ease'
        }}
      >
        {includeNone && <option value="none">NONE</option>}
        <optgroup label="HALFTONE">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'halftone').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
        <optgroup label="ORDERED">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'ordered').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
        <optgroup label="DIFFUSION">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'diffusion').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
        <optgroup label="ORGANIC">
          {Object.entries(DITHER_ALGORITHMS).filter(([,v]) => v.category === 'other').map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </optgroup>
      </select>
    </div>
  );
}

