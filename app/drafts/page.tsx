'use client';
import { useEffect, useState } from 'react';

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
    <main style={{ padding: '2rem' }}>
      <h1>Pending Drafts</h1>
      <a href="/" style={{ fontSize: '0.9rem' }}>← Back</a>
      {drafts.length === 0 && <p style={{ marginTop: '1rem' }}>No drafts awaiting review.</p>}
      {drafts.map(d => (
        <div key={d.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem', background: '#fff' }}>
          <p><strong>Partner:</strong> {d.Partner?.name} ({d.region})</p>
          <p><strong>Category:</strong> {d.category}</p>
          <p><strong>Draft:</strong> {d.body}</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button onClick={() => review(d.id, 'APPROVE')} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>✅ Approve</button>
            <button onClick={() => review(d.id, 'REJECT')} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>❌ Reject</button>
          </div>
        </div>
      ))}
    </main>
  );
}
