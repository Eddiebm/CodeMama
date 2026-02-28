'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Incorrect password. Try again.');
        setPassword('');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '360px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧬</div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#000', letterSpacing: '0.05em' }}>GPCE</div>
          <div style={{ color: '#666', fontSize: '0.82rem', marginTop: '0.25rem' }}>Global Partner Continuity Engine</div>
          <div style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '0.15rem' }}>COARE Holdings · Internal Tool</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#555', fontSize: '0.78rem', marginBottom: '0.4rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              placeholder="Enter access password"
              style={{
                width: '100%', padding: '0.75rem 1rem',
                background: '#fafafa', border: '1px solid #e0e0e0',
                borderRadius: '8px', color: '#000', fontSize: '0.95rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #eecece',
              borderRadius: '6px', padding: '0.6rem 0.8rem',
              color: '#c00', fontSize: '0.83rem', marginBottom: '1rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%', padding: '0.8rem',
              background: loading || !password ? '#ccc' : '#000',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '0.95rem', fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </main>
  );
}
