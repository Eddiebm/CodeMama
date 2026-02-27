'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Nav from '@/app/components/Nav';

const TYPE_COLORS: Record<string, string> = {
  PHARMA:   '#1a56db',
  BIOTECH:  '#0e9f6e',
  INVESTOR: '#7c3aed',
  OTHER:    '#6b7280',
};

export default function Partners() {
  const [partners, setPartners]         = useState<any[]>([]);
  const [search, setSearch]             = useState('');
  const [name, setName]                 = useState('');
  const [region, setRegion]             = useState('US');
  const [interest, setInterest]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showAdd, setShowAdd]           = useState(false);
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
    setName(''); setInterest(''); setLoading(false); setShowAdd(false);
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/partners/import', { method: 'POST', body: form });
    const result = await res.json();
    setImportResult(result);
    loadPartners();
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const filtered = partners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.contactEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f8fc' }}>
      <Nav />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e', fontWeight: 700 }}>Partners</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.88rem' }}>{partners.length} total</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label style={{
              padding: '0.5rem 1rem', background: '#fff', border: '1px solid #ddd',
              borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', color: '#444', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              {importing ? '⏳ Importing...' : '📤 Import Excel / CSV'}
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={importFile} disabled={importing} style={{ display: 'none' }} />
            </label>
            <button onClick={() => setShowAdd(!showAdd)} style={{
              padding: '0.5rem 1rem', background: '#1a1a2e', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}>
              + Add Partner
            </button>
          </div>
        </div>

        {/* Import result */}
        {importResult && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#166534' }}>
            ✅ {importResult.created} partners imported{importResult.skipped > 0 && ` · ${importResult.skipped} skipped`}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <form onSubmit={addPartner} style={{
            background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px',
            padding: '1.25rem', marginBottom: '1.5rem',
            display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end',
          }}>
            <div style={{ flex: 2, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Pfizer"
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' }}>
                <option value="US">🇺🇸 US</option>
                <option value="EU">🇪🇺 EU</option>
                <option value="CN">🇨🇳 CN</option>
              </select>
            </div>
            <div style={{ flex: 3, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Focus / Interest</label>
              <input value={interest} onChange={e => setInterest(e.target.value)} required placeholder="e.g. Oncology licensing"
                style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={loading} style={{
                padding: '0.6rem 1.25rem', background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
              }}>
                {loading ? 'Adding...' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} style={{
                padding: '0.6rem 1rem', background: '#f3f4f6', color: '#666',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem',
              }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Search */}
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search partners, contacts, emails..."
            style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }} />
        </div>

        {/* List */}
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
              {search ? `No partners matching "${search}"` : 'No partners yet'}
            </div>
          ) : filtered.map((p, i) => (
            <Link key={p.id} href={`/partners/${p.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: i < filtered.length - 1 ? '1px solid #f0f0f0' : 'none', gap: '1rem' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.03em',
                  color: TYPE_COLORS[p.partnerType] || '#6b7280',
                  background: (TYPE_COLORS[p.partnerType] || '#6b7280') + '18',
                  padding: '0.15rem 0.5rem', borderRadius: '4px',
                  minWidth: '60px', textAlign: 'center',
                }}>{p.partnerType}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a1a2e' }}>{p.name}</div>
                  {p.contactName && (
                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '0.1rem' }}>
                      {p.contactName}{p.contactTitle ? ` · ${p.contactTitle}` : ''}
                    </div>
                  )}
                </div>

                <span style={{ fontSize: '0.82rem' }}>
                  {p.region === 'US' ? '🇺🇸' : p.region === 'EU' ? '🇪🇺' : p.region === 'CN' ? '🇨🇳' : p.region}
                </span>

                <span style={{
                  fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '10px',
                  background: p.status === 'ACTIVE' ? '#f0fdf4' : '#f9fafb',
                  color: p.status === 'ACTIVE' ? '#166534' : '#9ca3af', fontWeight: 500,
                }}>{p.status}</span>

                <span style={{ color: '#ddd' }}>›</span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length > 0 && (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: '0.8rem', marginTop: '1rem' }}>
            Showing {filtered.length} of {partners.length} partners
          </p>
        )}
      </div>
    </main>
  );
}
