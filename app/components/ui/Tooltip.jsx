'use client';

import { useState } from 'react';

export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#222',
          color: '#aaa',
          padding: '8px 12px',
          fontSize: '9px',
          fontFamily: 'monospace',
          marginBottom: '8px',
          zIndex: 100,
          maxWidth: '200px',
          whiteSpace: 'normal',
          lineHeight: 1.4
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

