'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '3rem auto' }}>
      <h2 style={{ color: '#c00', marginTop: 0, fontSize: '1.2rem' }}>Something went wrong</h2>
      <p style={{ color: '#444', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
        <strong>{error.message || 'An unexpected error occurred'}</strong>
      </p>
      {error.digest && (
        <p style={{ color: '#999', fontSize: '0.78rem', fontFamily: 'monospace', marginBottom: '1.25rem' }}>
          Ref: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        style={{
          padding: '0.5rem 1.25rem',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Try again
      </button>
    </div>
  );
}
