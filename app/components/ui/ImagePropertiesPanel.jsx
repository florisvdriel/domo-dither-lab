'use client';

import Button from './Button';
import Slider from './CustomSlider';
import Section from './CustomSection';

export default function ImagePropertiesPanel({
  imageScale,
  onImageScaleChange,
  preBlur,
  onPreBlurChange,
  brightness,
  onBrightnessChange,
  contrast,
  onContrastChange,
  invert,
  onInvertChange,
  onReset,
  onClearCache,
  // Phase 4: Preprocessing cache controls
  onClearAllCaches,
  cacheStats
}) {
  return (
    <div>
      {/* Adjustments Section */}
      <Section title="ADJUSTMENTS" defaultOpen={true}>
        <Slider 
          label={`SCALE ${Math.round(imageScale * 100)}%`} 
          value={imageScale} 
          min={0.5} 
          max={2} 
          step={0.05} 
          onChange={onImageScaleChange} 
        />
        
        <Slider 
          label={`PRE BLUR ${Math.round(preBlur)}px`} 
          value={preBlur} 
          min={0} 
          max={20} 
          step={0.5} 
          onChange={onPreBlurChange} 
        />
        
        <Slider 
          label={`BRIGHTNESS ${brightness >= 0 ? '+' : ''}${Math.round(brightness * 100)}`} 
          value={brightness} 
          min={-0.5} 
          max={0.5} 
          step={0.01} 
          onChange={onBrightnessChange} 
        />
        
        <Slider 
          label={`CONTRAST ${contrast >= 0 ? '+' : ''}${Math.round(contrast * 100)}`} 
          value={contrast} 
          min={-0.5} 
          max={0.5} 
          step={0.01} 
          onChange={onContrastChange} 
        />
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <Button onClick={() => onInvertChange(!invert)} active={invert} style={{ flex: 1 }}>
            {invert ? '◐ INVERTED' : '◑ INVERT'}
          </Button>
          <Button onClick={onReset} style={{ flex: 1, color: '#666' }}>
            RESET
          </Button>
        </div>

        {/* Phase 3/4: Cache escape hatch (dev mode only) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #333', borderRadius: '4px' }}>
            <div style={{ fontSize: '9px', color: '#666', marginBottom: '8px' }}>DEV: CACHE CONTROLS</div>

            {/* Phase 4: Cache statistics */}
            {cacheStats && (
              <div style={{ fontSize: '8px', color: '#555', marginBottom: '8px', fontFamily: 'monospace' }}>
                Layer cache: {cacheStats.layerCacheSize} entries<br/>
                Preprocess cache: {cacheStats.preprocessCacheSize} entries
              </div>
            )}

            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
              <Button onClick={onClearCache} style={{ width: '100%', fontSize: '9px', color: '#888' }}>
                CLEAR LAYER CACHE
              </Button>
              {/* Phase 4: Clear all caches button */}
              {onClearAllCaches && (
                <Button onClick={onClearAllCaches} style={{ width: '100%', fontSize: '9px', color: '#c66' }}>
                  CLEAR ALL CACHES
                </Button>
              )}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}









