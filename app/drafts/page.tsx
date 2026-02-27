'use client';

import { useEffect, useState } from 'react';
import Nav from '@/app/components/Nav';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/drafts').then(r => r.json()).then(setDrafts);
  }, []);

  async function review(id: string, action: 'APPROVE' | 'REJECT') {
    await fetch(`/api/drafts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  return (
    <>
      <Nav />
      <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f8fc', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.4rem', color: '#1a1a2e', margin: '0 0 0.25rem' }}>📬 Pending Drafts</h1>
          <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Review and approve outreach drafts before they are sent.
          </p>

          {drafts.length === 0 && (
            <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '2rem', textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={{ fontSize: '0.95rem' }}>No drafts awaiting review.</div>
            </div>
          )}

          {drafts.map(d => (
            <div key={d.id} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e' }}>{d.Partner?.name || 'Unknown Partner'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.15rem' }}>
                    {d.category} · {d.region || '—'}
                  </div>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: '#fff8ec', color: '#b85c00', border: '1px solid #f0d080' }}>
                  PENDING
                </span>
              </div>
              <div style={{ background: '#f7f8fc', border: '1px solid #e8e8e8', borderRadius: '6px', padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {d.body}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => review(d.id, 'APPROVE')}
                  style={{ padding: '0.45rem 1.1rem', background: '#1a6b1a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => review(d.id, 'REJECT')}
                  style={{ padding: '0.45rem 1.1rem', background: '#fff', color: '#c00', border: '1px solid #f0aaaa', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
