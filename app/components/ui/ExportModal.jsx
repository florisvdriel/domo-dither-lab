'use client';

import { useState } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';
import { EXPORT_RESOLUTIONS } from '../../constants';
import Button from './Button';
import CustomSelect from './CustomSelect';

export default function ExportModal({
    isOpen,
    onClose,
    onExportPNG,
    onExportSVG,
    onExportLayersZip,
    exportResolution,
    onExportResolutionChange
}) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: COLORS.bg.secondary,
                    border: `1px solid ${COLORS.border.default}`,
                    padding: '24px',
                    zIndex: 1001,
                    minWidth: '320px',
                    maxWidth: '400px'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: `1px solid ${COLORS.border.default}`
                }}>
                    <h2 style={{
                        fontSize: '11px',
                        fontFamily: FONTS.ui,
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        color: COLORS.text.primary,
                        margin: 0
                    }}>
                        EXPORT
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: COLORS.text.tertiary,
                            fontSize: '16px',
                            cursor: 'pointer',
                            padding: '4px',
                            lineHeight: 1
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Resolution Selector */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        letterSpacing: '0.05em',
                        color: COLORS.text.secondary,
                        marginBottom: '8px'
                    }}>
                        RESOLUTION
                    </label>
                    <CustomSelect
                        value={exportResolution}
                        onChange={onExportResolutionChange}
                        options={Object.entries(EXPORT_RESOLUTIONS).map(([key, { label }]) => ({
                            value: key,
                            label
                        }))}
                    />
                </div>

                {/* Export Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Button
                        onClick={() => {
                            onExportPNG();
                            onClose();
                        }}
                        style={{ width: '100%', fontSize: '9px' }}
                    >
                        EXPORT PNG
                    </Button>
                    <Button
                        onClick={() => {
                            onExportSVG();
                            onClose();
                        }}
                        style={{ width: '100%', fontSize: '9px' }}
                    >
                        EXPORT SVG
                    </Button>
                    <Button
                        onClick={() => {
                            onExportLayersZip();
                            onClose();
                        }}
                        style={{ width: '100%', fontSize: '9px' }}
                    >
                        EXPORT LAYERS (ZIP)
                    </Button>
                </div>

                {/* Cancel */}
                <div style={{ marginTop: '12px' }}>
                    <Button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            fontSize: '9px',
                            backgroundColor: 'transparent',
                            color: COLORS.text.tertiary,
                            border: `1px solid ${COLORS.border.default}`
                        }}
                    >
                        CANCEL
                    </Button>
                </div>
            </div>
        </>
    );
}
