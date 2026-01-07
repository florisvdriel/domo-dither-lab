'use client';

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import Button from './Button';
import ExportControls from './ExportControls';

export default function ExportDialog({
  open,
  onOpenChange,
  exportResolution,
  onExportResolutionChange,
  onExportPNG,
  onExportSVGCombined,
  onExportSVGLayers,
  hasImage
}) {
  const hasInitialized = useRef(false);

  // Set default resolution to '1x' only when modal first opens
  useEffect(() => {
    if (open && !hasInitialized.current) {
      hasInitialized.current = true;
      if (exportResolution !== '1x') {
        onExportResolutionChange('1x');
      }
    } else if (!open) {
      // Reset the flag when modal closes
      hasInitialized.current = false;
    }
  }, [open, exportResolution, onExportResolutionChange]);

  // Wrap export handlers to close modal after export
  const handleExportPNG = () => {
    onExportPNG();
    onOpenChange(false);
  };

  const handleExportSVGCombined = () => {
    onExportSVGCombined();
    onOpenChange(false);
  };

  const handleExportSVGLayers = async () => {
    await onExportSVGLayers();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 p-0 border-[#333] [&>button]:hidden rounded-none"
        style={{
          width: '320px',
          maxWidth: '320px',
          backgroundColor: '#111',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#333',
          borderRadius: 0,
        }}
      >
        <DialogHeader
          className="p-6 pb-4"
          style={{ padding: '24px 24px 16px' }}
        >
          <DialogTitle
            className="text-white font-mono font-semibold"
            style={{
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Export
          </DialogTitle>
        </DialogHeader>

        <div
          className="px-6 pb-4"
          style={{ padding: '0 24px 16px' }}
        >
          <ExportControls
            exportResolution={exportResolution}
            onExportResolutionChange={onExportResolutionChange}
            onExportPNG={handleExportPNG}
            onExportSVGCombined={handleExportSVGCombined}
            onExportSVGLayers={handleExportSVGLayers}
            hasImage={hasImage}
          />
        </div>

        <DialogFooter
          className="flex-row gap-2 px-6 pb-6"
          style={{ padding: '0 24px 24px' }}
        >
          <Button
            onClick={() => onOpenChange(false)}
            style={{ width: '100%' }}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
