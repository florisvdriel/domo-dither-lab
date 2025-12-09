'use client';

import Button from './Button';
import Slider from './Slider';
import Section from './Section';

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
  onReset
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
      </Section>
    </div>
  );
}

