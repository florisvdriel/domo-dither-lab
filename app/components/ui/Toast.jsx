'use client';

import { useEffect, memo } from 'react';

export default memo(function Toast({ message, visible, onHide }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
      backgroundColor: '#fff',
      color: '#000',
      padding: '12px 24px',
      fontSize: '11px',
      fontFamily: 'monospace',
      letterSpacing: '0.05em',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s ease',
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      {message}
    </div>
  );
});


