'use client';
import { useEffect, useState, useRef } from 'react';

export default function Partners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('US');
  const [interest, setInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadPartners() {
    fetch('/api/partners').then(r => r.json()).then(setPartners);
  }

  useEffect(() => { loadPartners(); }, []);

  async function addPartner(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, region, interest }),
    });
    const partner = await res.json();
    setPartners(prev => [partner, ...prev]);
    setName('');
    setInterest('');
    setLoading(false);
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/partners/import', { method: 'POST', body: form });
    const result = await res.json();
    setImportResult(result);
    loadPartners();
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <a href="/" style={{ fontSize: '0.9rem' }}>← Back</a>
      <h1>Partners</h1>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>

        {/* Add single partner */}
        <form onSubmit={addPartner} style={{ padding: '1rem', border: '1px solid #ccc', background: '#fff', width: '320px' }}>
          <h2 style={{ marginTop: 0 }}>Add Partner</h2>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              style={{ width: '100%', padding: '0.4rem', fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Region</label>
            <select value={region} onChange={e => setRegion(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', fontFamily: 'monospace' }}>
              <option value="US">US</option>
              <option value="EU">EU</option>
              <option value="CN">CN</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Interest</label>
            <input value={interest} onChange={e => setInterest(e.target.value)} required
              placeholder="e.g. Oncology licensing"
              style={{ width: '100%', padding: '0.4rem', fontFamily: 'monospace', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '0.5rem 1.5rem', cursor: 'pointer', fontFamily: 'monospace' }}>
            {loading ? 'Adding...' : 'Add Partner'}
          </button>
        </form>

        {/* Bulk import */}
        <div style={{ padding: '1rem', border: '1px solid #ccc', background: '#fff', width: '320px' }}>
          <h2 style={{ marginTop: 0 }}>Import from CSV / Excel</h2>
          <p style={{ fontSize: '0.85rem', color: '#555' }}>
            File must have columns: <strong>name</strong>, <strong>region</strong> (US/EU/CN), <strong>interest</strong>
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={importFile}
            disabled={importing}
            style={{ fontFamily: 'monospace', marginBottom: '0.75rem' }}
          />
          {importing && <p>Importing...</p>}
          {importResult && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <p style={{ color: 'green' }}>✅ {importResult.created} partner(s) created</p>
              {importResult.skipped > 0 && <p style={{ color: 'orange' }}>⚠️ {importResult.skipped} skipped</p>}
              {importResult.errors?.map((err: string, i: number) => (
                <p key={i} style={{ color: 'red' }}>{err}</p>
              ))}
            </div>
          )}
        </div>

      </div>

      <h2 style={{ marginTop: '2rem' }}>All Partners</h2>
      {partners.length === 0 && <p>No partners yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {partners.map(p => (
          <li key={p.id} style={{ marginBottom: '0.75rem', padding: '0.75rem', border: '1px solid #ddd', background: '#fff' }}>
            <a href={`/partners/${p.id}`}><strong>{p.name}</strong></a>
            {' — '}{p.region}{' — '}{p.status}
            {p.humanRequired && <span style={{ color: 'red', marginLeft: '0.5rem' }}>⚠️ HUMAN REQUIRED</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
