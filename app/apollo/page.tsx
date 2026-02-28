'use client';

import { useState } from 'react';
import Nav from '@/app/components/Nav';

const TITLE_PRESETS: Record<string, string[]> = {
  'BD / Licensing': ['Business Development', 'VP Business Development', 'SVP Business Development', 'Head of Business Development', 'Director Business Development', 'Licensing', 'Alliance Management', 'Corporate Development', 'Partnerships', 'Head of Licensing', 'BD Director'],
  'Commercial':     ['Chief Commercial Officer', 'CCO', 'Commercial Director', 'VP Commercial', 'Head of Commercial'],
  'R&D / Science':  ['Chief Scientific Officer', 'CSO', 'Head of Oncology', 'VP Oncology', 'Medical Director', 'CMO', 'Chief Medical Officer'],
  'Executive':      ['CEO', 'Chief Executive Officer', 'President', 'COO', 'CFO'],
};

const INDUSTRY_PRESETS = ['Biotechnology', 'Pharmaceuticals', 'Biopharmaceuticals', 'Drug Development', 'Medical Device', 'Life Sciences', 'Healthcare', 'Oncology'];

const REGION_PRESETS: Record<string, string[]> = {
  'US': ['United States'],
  'EU': ['Germany', 'France', 'United Kingdom', 'Switzerland', 'Sweden', 'Netherlands', 'Denmark'],
  'CN': ['China', 'Hong Kong', 'Singapore', 'Taiwan'],
  'All': [],
};

interface ApolloPerson {
  id: string; name: string; first_name: string; last_name: string; title: string;
  email?: string; linkedin_url?: string;
  organization?: { name: string; website_url?: string; industry?: string };
  city?: string; state?: string; country?: string; photo_url?: string;
}

export default function ApolloPage() {
  const [titlePreset, setTitlePreset]   = useState<string>('BD / Licensing');
  const [customTitles, setCustomTitles] = useState('');
  const [industries, setIndustries]     = useState<string[]>(['Biotechnology', 'Pharmaceuticals', 'Biopharmaceuticals']);
  const [regionPreset, setRegionPreset] = useState<string>('US');
  const [keywords, setKeywords]         = useState('');
  const [page, setPage]                 = useState(1);
  const [results, setResults]           = useState<ApolloPerson[]>([]);
  const [pagination, setPagination]     = useState<any>(null);
  const [searching, setSearching]       = useState(false);
  const [searchError, setSearchError]   = useState('');
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  function toggleIndustry(ind: string) {
    setIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  }
  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function selectAll()    { setSelected(new Set(results.map(p => p.id))); }
  function clearSelection(){ setSelected(new Set()); }
  function buildTitles()  { return [...(TITLE_PRESETS[titlePreset] ?? []), ...customTitles.split(',').map(t => t.trim()).filter(Boolean)]; }

  async function doSearch(pageNum = 1) {
    setSearching(true); setSearchError(''); setImportResult(null);
    const locations = REGION_PRESETS[regionPreset] ?? [];
    try {
      const res = await fetch('/api/apollo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles: buildTitles(), industries, locations: locations.length ? locations : undefined, keywords: keywords.trim() || undefined, page: pageNum, perPage: 25 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.people ?? []); setPagination(data.pagination ?? null);
      setPage(pageNum); setSelected(new Set());
    } catch (e: any) { setSearchError(e.message); }
    finally { setSearching(false); }
  }

  async function importSelected() {
    const people = results.filter(p => selected.has(p.id));
    if (!people.length) return;
    setImporting(true); setImportResult(null);
    try {
      const res = await fetch('/api/apollo/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ people }) });
      setImportResult(await res.json());
      clearSelection();
    } catch (e: any) { setImportResult({ error: e.message }); }
    finally { setImporting(false); }
  }

  const emailVisible = (email?: string) => email && !email.includes('email_not_unlocked');

  const filterChip = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.7rem', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
    background: active ? '#000' : '#f5f5f5', color: active ? '#fff' : '#555',
    border: `1px solid ${active ? '#000' : '#e0e0e0'}`,
  });

  return (
    <>
      <Nav />
      <main style={{ background: '#f5f5f5', minHeight: '100vh', padding: '2rem', color: '#111', fontFamily: 'system-ui, sans-serif' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#000' }}>Apollo Contact Sourcing</h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#777' }}>
            Search pharma/biotech BD executives via Apollo.io and import them directly into GPCE.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Filters panel */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e5e5' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '0.78rem', fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>FILTERS</h2>

            <label style={labelSt}>Title Focus</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
              {Object.keys(TITLE_PRESETS).map(p => (
                <button key={p} onClick={() => setTitlePreset(p)} style={filterChip(titlePreset === p)}>{p}</button>
              ))}
            </div>

            <label style={labelSt}>Extra Titles (comma-separated)</label>
            <input value={customTitles} onChange={e => setCustomTitles(e.target.value)} placeholder="e.g. Head of Oncology, CMO" style={inputSt} />

            <label style={{ ...labelSt, marginTop: '0.75rem' }}>Industries</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {INDUSTRY_PRESETS.map(ind => (
                <button key={ind} onClick={() => toggleIndustry(ind)} style={{ ...filterChip(industries.includes(ind)), padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}>{ind}</button>
              ))}
            </div>

            <label style={labelSt}>Region</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {Object.keys(REGION_PRESETS).map(r => (
                <button key={r} onClick={() => setRegionPreset(r)} style={{ ...filterChip(regionPreset === r), padding: '0.2rem 0.7rem' }}>{r}</button>
              ))}
            </div>

            <label style={labelSt}>Keywords (optional)</label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. oncology, ovarian cancer" style={inputSt} />

            <button onClick={() => doSearch(1)} disabled={searching} style={{ width: '100%', marginTop: '1.25rem', padding: '0.65rem', background: searching ? '#ccc' : '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: searching ? 'not-allowed' : 'pointer' }}>
              {searching ? 'Searching…' : 'Search Apollo'}
            </button>

            {searchError && (
              <p style={{ marginTop: '0.75rem', color: '#c00', fontSize: '0.8rem' }}>
                {searchError.includes('APOLLO_API_KEY') ? <>⚠️ Add <code>APOLLO_API_KEY</code> to Vercel env vars. <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" style={{ color: '#000' }}>Get key →</a></> : searchError}
              </p>
            )}
          </div>

          {/* Results */}
          <div>
            {results.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#777' }}>
                  {pagination && <>Showing {results.length} of {pagination.total_entries.toLocaleString()} · Page {pagination.page} / {pagination.total_pages}</>}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <button onClick={selectAll}    style={smallBtn}>Select All</button>
                  <button onClick={clearSelection} style={smallBtn}>Clear</button>
                  {selected.size > 0 && (
                    <button onClick={importSelected} disabled={importing} style={{ ...smallBtn, background: '#000', color: '#fff', border: '1px solid #000', fontWeight: 600 }}>
                      {importing ? 'Importing…' : `⬇ Import ${selected.size} to GPCE`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {importResult && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', background: importResult.error ? '#fff5f5' : '#f5f5f5', border: `1px solid ${importResult.error ? '#eecece' : '#e0e0e0'}`, color: importResult.error ? '#c00' : '#333', fontSize: '0.85rem' }}>
                {importResult.error ? `❌ ${importResult.error}` : `✅ Imported ${importResult.created} new partner${importResult.created !== 1 ? 's' : ''}${importResult.duplicates ? ` · ${importResult.duplicates} already existed` : ''}`}
              </div>
            )}

            {results.length === 0 && !searching && (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', color: '#aaa' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔭</div>
                <p style={{ margin: 0 }}>Use the filters on the left and click <strong style={{ color: '#000' }}>Search Apollo</strong> to find BD contacts.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {results.map(person => {
                const isSelected = selected.has(person.id);
                const hasEmail = emailVisible(person.email);
                return (
                  <div key={person.id} onClick={() => toggleSelect(person.id)} style={{ display: 'grid', gridTemplateColumns: '2rem 2.5rem 1fr auto', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', background: isSelected ? '#f0f0f0' : '#fff', border: `1px solid ${isSelected ? '#000' : '#e5e5e5'}`, borderRadius: '10px', cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? '#000' : '#ccc'}`, background: isSelected ? '#000' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: '0.7rem' }}>✓</span>}
                    </div>
                    {person.photo_url
                      ? <img src={person.photo_url} alt={person.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#777', fontWeight: 700 }}>{person.first_name?.[0]}{person.last_name?.[0]}</div>
                    }
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111' }}>{person.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#555', marginTop: '0.1rem' }}>
                        {person.title}{person.organization?.name && <> · <span style={{ color: '#000' }}>{person.organization.name}</span></>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.15rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {person.city && <span>📍 {person.city}{person.state ? `, ${person.state}` : ''}{person.country ? `, ${person.country}` : ''}</span>}
                        {hasEmail && <span>✉ {person.email}</span>}
                        {!hasEmail && <span style={{ color: '#ccc' }}>✉ email locked</span>}
                        {person.linkedin_url && <a href={person.linkedin_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#555', textDecoration: 'underline' }}>LinkedIn ↗</a>}
                      </div>
                    </div>
                    {person.organization?.industry && (
                      <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: '#f0f0f0', color: '#666', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        {person.organization.industry}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {pagination && pagination.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button disabled={page <= 1 || searching} onClick={() => doSearch(page - 1)} style={{ ...smallBtn, opacity: page <= 1 ? 0.4 : 1 }}>← Prev</button>
                <span style={{ padding: '0.35rem 0.75rem', color: '#888', fontSize: '0.85rem' }}>{page} / {pagination.total_pages}</span>
                <button disabled={page >= pagination.total_pages || searching} onClick={() => doSearch(page + 1)} style={{ ...smallBtn, opacity: page >= pagination.total_pages ? 0.4 : 1 }}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' };
const inputSt: React.CSSProperties = { width: '100%', padding: '0.45rem 0.65rem', background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#111', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', marginBottom: '0.6rem' };
const smallBtn: React.CSSProperties = { padding: '0.3rem 0.75rem', fontSize: '0.8rem', background: '#fff', border: '1px solid #ccc', color: '#555', borderRadius: '6px', cursor: 'pointer' };
