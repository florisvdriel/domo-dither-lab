'use client';

import { useMemo } from 'react';
import { DITHER_ALGORITHMS } from '../../constants/ditherAlgorithms';
import Tooltip from './CustomTooltip';
import CustomSelect from './CustomSelect';

export default function AlgorithmSelect({ value, onChange, includeNone = false }) {
  const algoInfo = DITHER_ALGORITHMS[value];

  // Transform DITHER_ALGORITHMS into grouped options format
  const options = useMemo(() => {
    const categoryToGroup = {
      'halftone': 'HALFTONE',
      'ordered': 'ORDERED',
      'diffusion': 'DIFFUSION',
      'other': 'ORGANIC',
    };

    const groupedOptions = Object.entries(DITHER_ALGORITHMS).map(([key, algo]) => ({
      value: key,
      label: algo.name,
      group: categoryToGroup[algo.category] || 'OTHER',
    }));

    // Add "NONE" option at the beginning if includeNone is true
    if (includeNone) {
      groupedOptions.unshift({
        value: 'none',
        label: 'NONE',
        group: undefined, // No group for NONE option
      });
    }

    return groupedOptions;
  }, [includeNone]);

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
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Select pattern..."
      />
    </div>
  );
}
