'use client';

import React from 'react';

/**
 * Error Boundary component for catching and displaying errors gracefully
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Clear any saved session that might be causing issues
    try {
      localStorage.removeItem('halftone-lab-session');
    } catch (e) {
      // Ignore storage errors
    }
    // Reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'monospace',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '24px', opacity: 0.5 }}>⚠</div>
          <h1 style={{ 
            fontSize: '14px', 
            letterSpacing: '0.2em', 
            marginBottom: '16px',
            fontWeight: 400 
          }}>
            SOMETHING WENT WRONG
          </h1>
          <p style={{ 
            fontSize: '11px', 
            color: '#666', 
            marginBottom: '24px',
            maxWidth: '400px',
            lineHeight: 1.6
          }}>
            An unexpected error occurred. This might be due to a corrupted session or browser issue.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              backgroundColor: '#222',
              border: '1px solid #444',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '11px',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#333';
              e.target.style.borderColor = '#555';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#222';
              e.target.style.borderColor = '#444';
            }}
          >
            RESET & RELOAD
          </button>
          {this.state.error && (
            <details style={{ 
              marginTop: '32px', 
              fontSize: '9px', 
              color: '#444',
              maxWidth: '500px',
              textAlign: 'left'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                Technical details
              </summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                backgroundColor: '#111',
                padding: '12px',
                borderRadius: '4px'
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

