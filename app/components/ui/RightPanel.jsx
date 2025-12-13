'use client';

import ProjectPropertiesPanel from './ProjectPropertiesPanel';
import ImagePropertiesPanel from './ImagePropertiesPanel';
import LayerPropertiesPanel from './LayerPropertiesPanel';
import BackgroundPropertiesPanel from './BackgroundPropertiesPanel';

export default function RightPanel({
  selection,
  // Project properties
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
  hasImage,
  // Image properties
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
  onResetImageAdjustments,
  // Layer properties
  selectedLayer,
  selectedLayerIndex,
  totalLayers,
  onUpdateLayer,
  onRemoveLayer,
  onDuplicateLayer,
  activePalette,
  onUpdatePaletteColor,
  backgroundColorKey
}) {
  const getPanelTitle = () => {
    switch (selection.type) {
      case 'source':
        return 'IMAGE PROPERTIES';
      case 'layer':
        return `LAYER ${selectedLayerIndex + 1} PROPERTIES`;
      case 'background':
        return 'BACKGROUND PROPERTIES';
      default:
        return 'PROJECT PROPERTIES';
    }
  };

  const renderPanel = () => {
    switch (selection.type) {
      case 'source':
        return (
          <ImagePropertiesPanel
            imageScale={imageScale}
            onImageScaleChange={onImageScaleChange}
            preBlur={preBlur}
            onPreBlurChange={onPreBlurChange}
            brightness={brightness}
            onBrightnessChange={onBrightnessChange}
            contrast={contrast}
            onContrastChange={onContrastChange}
            invert={invert}
            onInvertChange={onInvertChange}
            onReset={onResetImageAdjustments}
          />
        );
      case 'layer':
        return selectedLayer ? (
          <LayerPropertiesPanel
            layer={selectedLayer}
            index={selectedLayerIndex}
            totalLayers={totalLayers}
            onUpdate={onUpdateLayer}
            onRemove={onRemoveLayer}
            onDuplicate={onDuplicateLayer}
            canRemove={totalLayers > 1}
            palette={activePalette}
            onUpdatePaletteColor={onUpdatePaletteColor}
          />
        ) : null;
      case 'background':
        return (
          <BackgroundPropertiesPanel
            backgroundColor={backgroundColor}
            onBackgroundColorChange={onBackgroundColorChange}
            backgroundColorKey={backgroundColorKey}
            palette={palette}
            colorKeys={colorKeys}
            onUpdatePaletteColor={onUpdatePaletteColor}
          />
        );
      default:
        return (
          <ProjectPropertiesPanel
            customPresets={customPresets}
            onApplyPreset={onApplyPreset}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
            onExportPresets={onExportPresets}
            onImportPresets={onImportPresets}
            presetImportRef={presetImportRef}
            inkBleed={inkBleed}
            onInkBleedChange={onInkBleedChange}
            inkBleedAmount={inkBleedAmount}
            onInkBleedAmountChange={onInkBleedAmountChange}
            inkBleedRoughness={inkBleedRoughness}
            onInkBleedRoughnessChange={onInkBleedRoughnessChange}
            paperTexture={paperTexture}
            onPaperTextureChange={onPaperTextureChange}
            backgroundColor={backgroundColor}
            onBackgroundColorChange={onBackgroundColorChange}
            exportResolution={exportResolution}
            onExportResolutionChange={onExportResolutionChange}
            onExportPNG={onExportPNG}
            onExportSVGCombined={onExportSVGCombined}
            onExportSVGLayers={onExportSVGLayers}
            palette={palette}
            colorKeys={colorKeys}
            hasImage={hasImage}
          />
        );
    }
  };

  return (
    <div style={{
      width: '320px',
      backgroundColor: '#0a0a0a',
      borderLeft: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* Panel Header */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #222'
      }}>
        <h2 style={{
          fontSize: '11px',
          letterSpacing: '0.2em',
          margin: 0,
          fontWeight: 400,
          color: '#fff'
        }}>
          {getPanelTitle()}
        </h2>
      </div>

      {/* Panel Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderPanel()}
      </div>
    </div>
  );
}






