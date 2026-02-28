'use client';

import { useState } from 'react';
import Nav from '@/app/components/Nav';

// ── Preset filters ──────────────────────────────────────────────────────────

const TITLE_PRESETS: Record<string, string[]> = {
  'BD / Licensing': [
    'Business Development', 'VP Business Development', 'SVP Business Development',
    'Head of Business Development', 'Director Business Development',
    'Licensing', 'Alliance Management', 'Corporate Development',
    'Partnerships', 'Head of Licensing', 'BD Director',
  ],
  'Commercial': [
    'Chief Commercial Officer', 'CCO', 'Commercial Director',
    'VP Commercial', 'Head of Commercial',
  ],
  'R&D / Science': [
    'Chief Scientific Officer', 'CSO', 'Head of Oncology',
    'VP Oncology', 'Medical Director', 'CMO', 'Chief Medical Officer',
  ],
  'Executive': [
    'CEO', 'Chief Executive Officer', 'President', 'COO', 'CFO',
  ],
};

const INDUSTRY_PRESETS = [
  'Biotechnology',
  'Pharmaceuticals',
  'Biopharmaceuticals',
  'Drug Development',
  'Medical Device',
  'Life Sciences',
  'Healthcare',
  'Oncology',
];

const REGION_PRESETS: Record<string, string[]> = {
  'US': ['United States'],
  'EU': ['Germany', 'France', 'United Kingdom', 'Switzerland', 'Sweden', 'Netherlands', 'Denmark'],
  'CN': ['China', 'Hong Kong', 'Singapore', 'Taiwan'],
  'All': [],
};

// ── Types ───────────────────────────────────────────────────────────────────

interface ApolloPerson {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  title: string;
  email?: string;
  linkedin_url?: string;
  organization?: { name: string; website_url?: string; industry?: string };
  city?: string;
  state?: string;
  country?: string;
  photo_url?: string;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ApolloPage() {
  // Filters
  const [titlePreset, setTitlePreset]     = useState<string>('BD / Licensing');
  const [customTitles, setCustomTitles]   = useState('');
  const [industries, setIndustries]       = useState<string[]>(['Biotechnology', 'Pharmaceuticals', 'Biopharmaceuticals']);
  const [regionPreset, setRegionPreset]   = useState<string>('US');
  const [keywords, setKeywords]           = useState('');
  const [page, setPage]                   = useState(1);

  // Results
  const [results, setResults]             = useState<ApolloPerson[]>([]);
  const [pagination, setPagination]       = useState<any>(null);
  const [searching, setSearching]         = useState(false);
  const [searchError, setSearchError]     = useState('');

  // Selection + import
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [importing, setImporting]         = useState(false);
  const [importResult, setImportResult]   = useState<any>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleIndustry(ind: string) {
    setIndustries(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(results.map(p => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function buildTitles(): string[] {
    const preset = TITLE_PRESETS[titlePreset] ?? [];
    const custom = customTitles.split(',').map(t => t.trim()).filter(Boolean);
    return [...preset, ...custom];
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  async function doSearch(pageNum = 1) {
    setSearching(true);
    setSearchError('');
    setImportResult(null);

    const locations = REGION_PRESETS[regionPreset] ?? [];

    try {
      const res = await fetch('/api/apollo/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titles: buildTitles(),
          industries,
          locations: locations.length ? locations : undefined,
          keywords: keywords.trim() || undefined,
          page: pageNum,
          perPage: 25,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.people ?? []);
      setPagination(data.pagination ?? null);
      setPage(pageNum);
      setSelected(new Set());
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setSearching(false);
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  async function importSelected() {
    const people = results.filter(p => selected.has(p.id));
    if (!people.length) return;

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/apollo/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people }),
      });
      const data = await res.json();
      setImportResult(data);
      clearSelection();
    } catch (e: any) {
      setImportResult({ error: e.message });
    } finally {
      setImporting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const emailVisible = (email?: string) =>
    email && !email.includes('email_not_unlocked');

  return (
    <>
      <Nav />
      <main style={{ background: '#0f0f1a', minHeight: '100vh', padding: '2rem', color: '#e8eaf0' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            🔭 Apollo Contact Sourcing
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#667' }}>
            Search pharma/biotech BD executives via Apollo.io and import them directly into GPCE.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* ── Left panel: Filters ── */}
          <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '1.25rem', border: '1px solid #2a2a4a' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#a0aacc' }}>
              FILTERS
            </h2>

            {/* Title preset */}
            <label style={labelStyle}>Title Focus</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
              {Object.keys(TITLE_PRESETS).map(preset => (
                <button
                  key={preset}
                  onClick={() => setTitlePreset(preset)}
                  style={{
                    ...chipBtn,
                    background: titlePreset === preset ? '#2563eb' : '#12122a',
                    color: titlePreset === preset ? '#fff' : '#8899bb',
                    border: `1px solid ${titlePreset === preset ? '#2563eb' : '#2a2a4a'}`,
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom titles */}
            <label style={labelStyle}>Extra Titles (comma-separated)</label>
            <input
              value={customTitles}
              onChange={e => setCustomTitles(e.target.value)}
              placeholder="e.g. Head of Oncology, CMO"
              style={inputStyle}
            />

            {/* Industries */}
            <label style={{ ...labelStyle, marginTop: '0.75rem' }}>Industries</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {INDUSTRY_PRESETS.map(ind => (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  style={{
                    ...chipBtn,
                    padding: '0.2rem 0.55rem',
                    fontSize: '0.75rem',
                    background: industries.includes(ind) ? '#0e9f6e22' : '#12122a',
                    color: industries.includes(ind) ? '#0e9f6e' : '#667',
                    border: `1px solid ${industries.includes(ind) ? '#0e9f6e' : '#2a2a4a'}`,
                  }}
                >
                  {ind}
                </button>
              ))}
            </div>

            {/* Region */}
            <label style={labelStyle}>Region</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {Object.keys(REGION_PRESETS).map(r => (
                <button
                  key={r}
                  onClick={() => setRegionPreset(r)}
                  style={{
                    ...chipBtn,
                    padding: '0.2rem 0.7rem',
                    background: regionPreset === r ? '#7c3aed33' : '#12122a',
                    color: regionPreset === r ? '#a78bfa' : '#667',
                    border: `1px solid ${regionPreset === r ? '#7c3aed' : '#2a2a4a'}`,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Keywords */}
            <label style={labelStyle}>Keywords (optional)</label>
            <input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. oncology, ovarian cancer"
              style={inputStyle}
            />

            {/* Search button */}
            <button
              onClick={() => doSearch(1)}
              disabled={searching}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                padding: '0.65rem',
                background: searching ? '#1e3a5f' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: searching ? 'not-allowed' : 'pointer',
              }}
            >
              {searching ? '🔍 Searching…' : '🔍 Search Apollo'}
            </button>

            {searchError && (
              <p style={{ marginTop: '0.75rem', color: '#f87171', fontSize: '0.8rem' }}>
                {searchError.includes('APOLLO_API_KEY') ? (
                  <>
                    ⚠️ Add <code>APOLLO_API_KEY</code> to your <code>.env</code> and redeploy.<br />
                    <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" style={{ color: '#60a5fa' }}>
                      Get key →
                    </a>
                  </>
                ) : searchError}
              </p>
            )}
          </div>

          {/* ── Right panel: Results ── */}
          <div>
            {/* Toolbar */}
            {results.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                marginBottom: '1rem', flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.85rem', color: '#667' }}>
                  {pagination && (
                    <>
                      Showing {results.length} of {pagination.total_entries.toLocaleString()} results
                      &nbsp;·&nbsp; Page {pagination.page} / {pagination.total_pages}
                    </>
                  )}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
                  <button onClick={selectAll} style={smallBtn}>Select All</button>
                  <button onClick={clearSelection} style={smallBtn}>Clear</button>

                  {selected.size > 0 && (
                    <button
                      onClick={importSelected}
                      disabled={importing}
                      style={{
                        ...smallBtn,
                        background: '#0e9f6e',
                        color: '#fff',
                        border: '1px solid #0e9f6e',
                        fontWeight: 600,
                      }}
                    >
                      {importing ? 'Importing…' : `⬇ Import ${selected.size} to GPCE`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Import result banner */}
            {importResult && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: importResult.error ? '#7f1d1d22' : '#052e1622',
                border: `1px solid ${importResult.error ? '#7f1d1d' : '#065f46'}`,
                color: importResult.error ? '#f87171' : '#6ee7b7',
                fontSize: '0.85rem',
              }}>
                {importResult.error
                  ? `❌ ${importResult.error}`
                  : `✅ Imported ${importResult.created} new partner${importResult.created !== 1 ? 's' : ''}` +
                    (importResult.duplicates ? ` · ${importResult.duplicates} already existed` : '')
                }
              </div>
            )}

            {/* Result cards */}
            {results.length === 0 && !searching && (
              <div style={{
                textAlign: 'center', padding: '4rem 2rem',
                background: '#1a1a2e', borderRadius: '12px', border: '1px solid #2a2a4a',
                color: '#444',
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔭</div>
                <p>Use the filters on the left and click <strong>Search Apollo</strong> to find BD contacts.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {results.map(person => {
                const isSelected = selected.has(person.id);
                const hasEmail   = emailVisible(person.email);
                return (
                  <div
                    key={person.id}
                    onClick={() => toggleSelect(person.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2rem 2.5rem 1fr auto',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.9rem 1rem',
                      background: isSelected ? '#1e2d4a' : '#1a1a2e',
                      border: `1px solid ${isSelected ? '#2563eb' : '#2a2a4a'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '18px', height: '18px',
                      borderRadius: '4px',
                      border: `2px solid ${isSelected ? '#2563eb' : '#2a2a4a'}`,
                      background: isSelected ? '#2563eb' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: '0.7rem', lineHeight: 1 }}>✓</span>}
                    </div>

                    {/* Avatar */}
                    {person.photo_url ? (
                      <img
                        src={person.photo_url}
                        alt={person.name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#2a2a4a', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.85rem', color: '#667',
                      }}>
                        {person.first_name?.[0]}{person.last_name?.[0]}
                      </div>
                    )}

                    {/* Name + details */}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e8eaf0' }}>
                        {person.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#8899bb', marginTop: '0.1rem' }}>
                        {person.title}
                        {person.organization?.name && (
                          <> · <span style={{ color: '#60a5fa' }}>{person.organization.name}</span></>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.15rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {person.city && <span>📍 {person.city}{person.state ? `, ${person.state}` : ''}{person.country ? `, ${person.country}` : ''}</span>}
                        {hasEmail && <span>✉ {person.email}</span>}
                        {!hasEmail && <span style={{ color: '#3a3a5a' }}>✉ email locked</span>}
                        {person.linkedin_url && (
                          <a
                            href={person.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ color: '#60a5fa', textDecoration: 'none' }}
                          >
                            LinkedIn ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Industry badge */}
                    {person.organization?.industry && (
                      <span style={{
                        fontSize: '0.72rem', padding: '0.2rem 0.5rem',
                        background: '#0e9f6e22', color: '#0e9f6e',
                        borderRadius: '4px', whiteSpace: 'nowrap',
                      }}>
                        {person.organization.industry}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  disabled={page <= 1 || searching}
                  onClick={() => doSearch(page - 1)}
                  style={{ ...smallBtn, opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ← Prev
                </button>
                <span style={{ padding: '0.35rem 0.75rem', color: '#667', fontSize: '0.85rem' }}>
                  {page} / {pagination.total_pages}
                </span>
                <button
                  disabled={page >= pagination.total_pages || searching}
                  onClick={() => doSearch(page + 1)}
                  style={{ ...smallBtn, opacity: page >= pagination.total_pages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: '#556',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.4rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.65rem',
  background: '#12122a',
  border: '1px solid #2a2a4a',
  borderRadius: '6px',
  color: '#e8eaf0',
  fontSize: '0.82rem',
  outline: 'none',
  boxSizing: 'border-box',
  marginBottom: '0.6rem',
};

const chipBtn: React.CSSProperties = {
  padding: '0.3rem 0.7rem',
  fontSize: '0.8rem',
  borderRadius: '6px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.1s',
};

const smallBtn: React.CSSProperties = {
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  background: '#12122a',
  border: '1px solid #2a2a4a',
  color: '#8899bb',
  borderRadius: '6px',
  cursor: 'pointer',
};
