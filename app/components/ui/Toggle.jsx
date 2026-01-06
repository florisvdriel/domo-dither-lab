'use client';

import { useState } from 'react';
import { COLORS, TRANSITIONS } from '../../constants/design';

export default function Toggle({
    checked,
    onChange,
    label,
    disabled = false
}) {
    const [hovering, setHovering] = useState(false);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{
                    position: 'relative',
                    width: '32px',
                    height: '16px',
                    backgroundColor: checked ? COLORS.ink.coral : (hovering ? '#222' : '#111'),
                    border: `1px solid ${checked ? COLORS.ink.coral : COLORS.border.default}`,
                    borderRadius: 0,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: TRANSITIONS.fast,
                    padding: 0,
                    opacity: disabled ? 0.5 : 1
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: '1px',
                        left: checked ? '15px' : '1px',
                        width: '12px',
                        height: '12px',
                        backgroundColor: checked ? COLORS.bg.primary : COLORS.text.primary,
                        transition: TRANSITIONS.fast
                    }}
                />
            </button>
            {label && (
                <span style={{
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    letterSpacing: '0.05em',
                    color: COLORS.text.secondary,
                    userSelect: 'none'
                }}>
                    {label}
                </span>
            )}
        </div>
    );
}
