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

const CACHE_KEY = 'gpce_partners_v2';
const CACHE_TTL = 20_000; // 20 seconds

function readCache(): any[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return data;
    return null;
  } catch { return null; }
}

function writeCache(data: any[]) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

export default function Partners() {
  const [partners, setPartners]           = useState<any[]>([]);
  const [skelLoading, setSkelLoading]     = useState(true);
  const [search, setSearch]               = useState('');
  const [name, setName]                   = useState('');
  const [region, setRegion]               = useState('US');
  const [interest, setInterest]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [addError, setAddError]           = useState('');
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState<any>(null);
  const [showAdd, setShowAdd]             = useState(false);
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [bulkResult, setBulkResult]       = useState<any>(null);
  const [seeding, setSeeding]             = useState(false);
  const [seedResult, setSeedResult]       = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Load (cache-first → instant render, then network refresh) ─────────────
  async function loadPartners(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        setPartners(cached);
        setSkelLoading(false);
        return;
      }
    }
    try {
      const data = await fetch('/api/partners').then(r => r.json());
      setPartners(Array.isArray(data) ? data : []);
      writeCache(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load partners', e);
    } finally {
      setSkelLoading(false);
    }
  }

  useEffect(() => { loadPartners(); }, []);

  // ── Add partner ────────────────────────────────────────────────────────────
  async function addPartner(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAddError('');
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, region, interest }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddError(data.error || 'Something went wrong.');
      setLoading(false);
      return;
    }
    clearCache();
    setPartners(prev => [data, ...prev]);
    setName(''); setInterest(''); setLoading(false); setShowAdd(false); setAddError('');
  }

  // ── Import CSV / Excel ─────────────────────────────────────────────────────
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/partners/import', { method: 'POST', body: form });
    const result = await res.json();
    setImportResult(result);
    clearCache();
    await loadPartners(true);
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Bulk verify ────────────────────────────────────────────────────────────
  async function bulkVerify() {
    setBulkVerifying(true);
    setBulkResult(null);
    try {
      const res = await fetch('/api/partners/verify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      });
      const data = await res.json();
      setBulkResult(data);
      clearCache();
      await loadPartners(true);
    } catch (e: any) {
      setBulkResult({ error: e.message });
    } finally {
      setBulkVerifying(false);
    }
  }

  // ── Seed Chinese companies ─────────────────────────────────────────────────
  async function seedChina() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/seed/china', { method: 'POST' });
      const data = await res.json();
      setSeedResult(data);
      clearCache();
      await loadPartners(true);
    } catch (e: any) {
      setSeedResult({ error: e.message });
    } finally {
      setSeeding(false);
    }
  }

  const filtered = partners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.contactName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.contactEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Skeleton ───────────────────────────────────────────────────────────────
  const SkeletonList = () => (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', padding: '0.85rem 1.25rem',
          borderBottom: i < 7 ? '1px solid #f0f0f0' : 'none', gap: '1rem',
        }}>
          <div style={skel(60, 20)} />
          <div style={{ flex: 1 }}>
            <div style={{ ...skel('40%', 14), marginBottom: 6 }} />
            <div style={skel('25%', 11)} />
          </div>
          <div style={skel(24, 20)} />
          <div style={skel(50, 20, 10)} />
        </div>
      ))}
    </div>
  );

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f8fc' }}>
      <Nav />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e', fontWeight: 700 }}>Partners</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.88rem' }}>
              {skelLoading ? 'Loading…' : `${partners.length} total`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>

            <label style={{
              padding: '0.5rem 1rem', background: '#fff', border: '1px solid #ddd',
              borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', color: '#444', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              {importing ? '⏳ Importing...' : '📤 Import CSV / Excel'}
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={importFile} disabled={importing} style={{ display: 'none' }} />
            </label>

            <button
              onClick={seedChina}
              disabled={seeding}
              title="One-click: add 50 top Chinese oncology pharma & biotech companies"
              style={{
                padding: '0.5rem 1rem', background: seeding ? '#ccc' : '#000',
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: seeding ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              {seeding ? '🇨🇳 Seeding…' : '🇨🇳 Seed CN Companies'}
            </button>

            <button
              onClick={bulkVerify}
              disabled={bulkVerifying}
              style={{
                padding: '0.5rem 1rem', background: bulkVerifying ? '#ccc' : '#000', color: '#fff',
                border: 'none', borderRadius: '8px', cursor: bulkVerifying ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              {bulkVerifying ? '🔄 Verifying…' : '🔍 Verify Employment (20)'}
            </button>

            <button onClick={() => setShowAdd(!showAdd)} style={{
              padding: '0.5rem 1rem', background: '#000', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
            }}>
              + Add Partner
            </button>
          </div>
        </div>

        {/* Banners */}
        {seedResult && (
          <Banner color="blue" error={seedResult.error}>
            {seedResult.error ? `⚠️ ${seedResult.error}` :
              `🇨🇳 Seeded ${seedResult.created} Chinese oncology companies${seedResult.duplicates > 0 ? ` · ${seedResult.duplicates} already existed` : ''}`}
          </Banner>
        )}
        {bulkResult && (
          <Banner color="green" error={bulkResult.error}>
            {bulkResult.error ? `⚠️ ${bulkResult.error}` : (
              `🔍 Verified ${bulkResult.checked} contacts — ${bulkResult.confirmed} confirmed` +
              (bulkResult.moved > 0 ? ` · 🚨 ${bulkResult.moved} moved` : '') +
              (bulkResult.notFound > 0 ? ` · ${bulkResult.notFound} not found` : '')
            )}
          </Banner>
        )}
        {importResult && (
          <Banner color="green">
            {`✅ ${importResult.created} partner${importResult.created !== 1 ? 's' : ''} imported` +
              (importResult.duplicates > 0 ? ` · ${importResult.duplicates} duplicates skipped` : '') +
              (importResult.skipped > 0 ? ` · ${importResult.skipped} blank rows ignored` : '')}
          </Banner>
        )}

        {/* Add form */}
        {showAdd && (
          <form onSubmit={addPartner} style={{
            background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px',
            padding: '1.25rem', marginBottom: '1.5rem',
            display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end',
          }}>
            <div style={{ flex: 2, minWidth: '180px' }}>
              <label style={labelSt}>Company Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Pfizer" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)} style={selectSt}>
                <option value="US">🇺🇸 US</option>
                <option value="EU">🇪🇺 EU</option>
                <option value="CN">🇨🇳 CN</option>
              </select>
            </div>
            <div style={{ flex: 3, minWidth: '200px' }}>
              <label style={labelSt}>Focus / Interest</label>
              <input value={interest} onChange={e => setInterest(e.target.value)} required placeholder="e.g. Oncology licensing" style={inputSt} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="submit" disabled={loading} style={{
                padding: '0.6rem 1.25rem', background: '#1a1a2e', color: '#fff',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
              }}>
                {loading ? 'Adding...' : 'Add'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setAddError(''); }} style={{
                padding: '0.6rem 1rem', background: '#f3f4f6', color: '#666',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.88rem',
              }}>Cancel</button>
              {addError && <span style={{ fontSize: '0.83rem', color: '#c00' }}>⚠️ {addError}</span>}
            </div>
          </form>
        )}

        {/* Search */}
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search partners, contacts, emails..."
            style={{ width: '100%', padding: '0.65rem 0.75rem 0.65rem 2.25rem', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        {/* List */}
        {skelLoading ? <SkeletonList /> : (
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
                    padding: '0.15rem 0.5rem', borderRadius: '4px', minWidth: '60px', textAlign: 'center',
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

                  {p.employmentStatus === 'CONFIRMED' && <span title="Still at company" style={{ fontSize: '0.7rem' }}>✅</span>}
                  {p.employmentStatus === 'MOVED' && <span title="May have moved" style={{ fontSize: '0.7rem' }}>🚨</span>}
                  {p.employmentStatus === 'NOT_FOUND' && <span title="Not found on LinkedIn" style={{ fontSize: '0.7rem' }}>❓</span>}

                  <span style={{ color: '#ddd' }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!skelLoading && filtered.length > 0 && (
          <p style={{ textAlign: 'center', color: '#bbb', fontSize: '0.8rem', marginTop: '1rem' }}>
            Showing {filtered.length} of {partners.length} partners
          </p>
        )}
      </div>
    </main>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────

function Banner({ children, color, error }: { children: React.ReactNode; color?: string; error?: any }) {
  const isError = !!error;
  return (
    <div style={{
      borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem',
      background: isError ? '#fff0f0' : color === 'blue' ? '#eff6ff' : '#f0fdf4',
      border: `1px solid ${isError ? '#f0aaaa' : color === 'blue' ? '#bfdbfe' : '#bbf7d0'}`,
      color: isError ? '#c00' : color === 'blue' ? '#1e40af' : '#166534',
    }}>
      {children}
    </div>
  );
}

function skel(w: number | string, h: number, radius = 4): React.CSSProperties {
  return { width: w, height: h, borderRadius: radius, background: '#f0f0f0', animation: 'pulse 1.4s ease-in-out infinite' };
}

const labelSt: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', color: '#888',
  marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #ddd',
  borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box',
};
const selectSt: React.CSSProperties = {
  padding: '0.6rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem',
};
