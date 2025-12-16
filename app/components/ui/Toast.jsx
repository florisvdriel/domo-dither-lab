'use client';

import { useEffect, memo } from 'react';
import { COLORS, FONTS, TRANSITIONS } from '../../constants/design';

export default memo(function Toast({ message, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '28px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      backgroundColor: COLORS.bg.tertiary,
      color: COLORS.text.primary,
      padding: '14px 28px',
      fontSize: '11px',
      fontFamily: FONTS.ui,
      fontWeight: 500,
      letterSpacing: '0.02em',
      opacity: visible ? 1 : 0,
      transition: TRANSITIONS.medium,
      pointerEvents: 'none',
      zIndex: 1000,
      borderRadius: '6px',
      border: `1px solid ${COLORS.border.default}`,
      borderLeft: `4px solid ${COLORS.ink.coral}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)'
    }}>
      {message}
    </div>
  );
});
