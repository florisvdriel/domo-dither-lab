'use client';

import { useEffect, useRef } from 'react';
import { COLORS, FONTS } from '../../constants/design';
import { getCommandsByCategory, formatShortcut } from '../../utils/commands';

export default function KeyboardShortcutsDialog({ onClose }) {
  const dialogRef = useRef(null);
  const commandsByCategory = getCommandsByCategory();

  // Focus trap and ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus the dialog
    dialogRef.current?.focus();

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent clicks inside dialog from closing it
  const handleDialogClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          backgroundColor: COLORS.bg.primary,
          border: `1px solid ${COLORS.border.default}`,
          borderRadius: '8px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
        onClick={handleDialogClick}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `2px solid ${COLORS.ink.coral}`,
            background: `linear-gradient(180deg, ${COLORS.bg.primary} 0%, ${COLORS.bg.secondary} 100%)`
          }}
        >
          <h2
            id="shortcuts-title"
            style={{
              fontSize: '14px',
              letterSpacing: '0.1em',
              fontWeight: 600,
              margin: 0,
              color: COLORS.text.primary,
              fontFamily: FONTS.ui
            }}
          >
            KEYBOARD SHORTCUTS
          </h2>
          <p
            style={{
              fontSize: '9px',
              color: COLORS.text.tertiary,
              margin: '4px 0 0 0',
              letterSpacing: '0.05em',
              fontFamily: FONTS.data
            }}
          >
            Press ESC to close
          </p>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}
        >
          {Object.entries(commandsByCategory).map(([category, commands]) => (
            <div key={category} style={{ marginBottom: '32px' }}>
              <h3
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  color: COLORS.text.secondary,
                  fontFamily: FONTS.ui,
                  fontWeight: 600,
                  marginBottom: '16px',
                  borderBottom: `1px solid ${COLORS.border.subtle}`,
                  paddingBottom: '8px'
                }}
              >
                {category.toUpperCase()}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {commands.map(command => (
                  <div
                    key={command.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: COLORS.bg.secondary,
                      border: `1px solid ${COLORS.border.subtle}`,
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '10px',
                          color: COLORS.text.primary,
                          fontFamily: FONTS.ui,
                          fontWeight: 500,
                          marginBottom: '2px'
                        }}
                      >
                        {command.name}
                      </div>
                      <div
                        style={{
                          fontSize: '9px',
                          color: COLORS.text.tertiary,
                          fontFamily: FONTS.data
                        }}
                      >
                        {command.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                      {command.shortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: COLORS.bg.tertiary,
                            border: `1px solid ${COLORS.border.default}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: FONTS.data,
                            color: COLORS.text.primary,
                            fontWeight: 600,
                            minWidth: '40px',
                            textAlign: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          {formatShortcut(shortcut)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.border.subtle}`,
            backgroundColor: COLORS.bg.secondary,
            textAlign: 'center'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              backgroundColor: COLORS.bg.primary,
              color: COLORS.text.primary,
              border: `1px solid ${COLORS.border.default}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontFamily: FONTS.ui,
              fontWeight: 600,
              letterSpacing: '0.05em',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = COLORS.bg.tertiary;
              e.target.style.borderColor = COLORS.border.strong;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = COLORS.bg.primary;
              e.target.style.borderColor = COLORS.border.default;
            }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
