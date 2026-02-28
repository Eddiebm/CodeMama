'use client';

import { useState } from 'react';
import Nav from '@/app/components/Nav';

interface DealContact { name: string; title: string; company: string; }
interface DealArticle { title: string; url: string; pubDate: string; source: string; contacts: DealContact[]; dealSummary: string; error?: string; }

function contactKey(articleUrl: string, contact: DealContact) { return `${articleUrl}::${contact.name}`; }

const QUERY_PRESETS = [
  { label: 'Oncology Licensing (default)', q: '"licensing agreement" OR "license agreement" oncology (biotech OR pharma) site:businesswire.com OR site:prnewswire.com' },
  { label: 'Ovarian Cancer Deals',         q: '"licensing" "ovarian cancer" (pharma OR biotech) site:businesswire.com OR site:prnewswire.com' },
  { label: 'Combination Therapy',          q: '"licensing agreement" "combination therapy" oncology site:businesswire.com OR site:prnewswire.com' },
  { label: 'BD Partnership Announcements', q: '"business development" "partnership" "oncology" (licensing OR collaboration) site:businesswire.com OR site:prnewswire.com' },
];

export default function DealsPage() {
  const [query, setQuery]             = useState(QUERY_PRESETS[0].q);
  const [maxArticles, setMaxArticles] = useState(8);
  const [mining, setMining]           = useState(false);
  const [articles, setArticles]       = useState<DealArticle[]>([]);
  const [mineError, setMineError]     = useState('');
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  function toggleContact(articleUrl: string, contact: DealContact) {
    const key = contactKey(articleUrl, contact);
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function selectAllContacts() {
    const all = new Set<string>();
    articles.forEach(a => a.contacts.forEach(c => all.add(contactKey(a.url, c))));
    setSelected(all);
  }
  function clearSelection() { setSelected(new Set()); }

  async function runMine() {
    setMining(true); setMineError(''); setArticles([]); setSelected(new Set()); setImportResult(null);
    try {
      const res = await fetch('/api/deals/mine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, maxArticles }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mining failed');
      setArticles(data.articles || []);
    } catch (e: any) { setMineError(e.message); }
    finally { setMining(false); }
  }

  async function importSelected() {
    const people: any[] = [];
    articles.forEach(article => article.contacts.forEach(contact => {
      if (selected.has(contactKey(article.url, contact))) {
        people.push({ name: contact.name, title: contact.title, organization: { name: contact.company } });
      }
    }));
    if (!people.length) return;
    setImporting(true); setImportResult(null);
    try {
      const res = await fetch('/api/apollo/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ people }) });
      setImportResult(await res.json());
      clearSelection();
    } catch (e: any) { setImportResult({ error: e.message }); }
    finally { setImporting(false); }
  }

  function fmtDate(d: string) {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
  }

  const allContactCount = articles.reduce((n, a) => n + a.contacts.length, 0);

  return (
    <>
      <Nav />
      <main style={{ background: '#f5f5f5', minHeight: '100vh', padding: '2rem', color: '#111', fontFamily: 'system-ui, sans-serif' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#000' }}>Deal Announcement Mining</h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#777' }}>
            Scans BusinessWire &amp; PRNewswire · AI extracts named BD executives · import to GPCE.
          </p>
        </div>

        {/* Controls */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e5e5', marginBottom: '1.5rem' }}>
          <label style={labelSt}>Query Preset</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {QUERY_PRESETS.map(p => (
              <button key={p.label} onClick={() => setQuery(p.q)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${query === p.q ? '#000' : '#e0e0e0'}`, background: query === p.q ? '#000' : '#f5f5f5', color: query === p.q ? '#fff' : '#555' }}>
                {p.label}
              </button>
            ))}
          </div>

          <label style={labelSt}>Search Query</label>
          <textarea value={query} onChange={e => setQuery(e.target.value)} rows={2} style={{ width: '100%', padding: '0.5rem 0.75rem', background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#111', fontSize: '0.82rem', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ ...labelSt, margin: 0 }}>Articles to scan:</label>
              <select value={maxArticles} onChange={e => setMaxArticles(Number(e.target.value))} style={{ padding: '0.3rem 0.5rem', background: '#fafafa', border: '1px solid #e0e0e0', borderRadius: '6px', color: '#111', fontSize: '0.82rem' }}>
                {[5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#aaa' }}>~{maxArticles * 3}s · ~{maxArticles} AI calls</span>
            <button onClick={runMine} disabled={mining || !query.trim()} style={{ marginLeft: 'auto', padding: '0.6rem 1.5rem', background: mining ? '#ccc' : '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: mining ? 'not-allowed' : 'pointer' }}>
              {mining ? 'Mining…' : 'Mine Deals'}
            </button>
          </div>

          {mineError && <p style={{ marginTop: '0.75rem', color: '#c00', fontSize: '0.82rem' }}>❌ {mineError}</p>}
        </div>

        {/* Spinner */}
        {mining && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⛏</div>
            <p style={{ color: '#777', margin: 0 }}>Scanning press releases and extracting BD leads with AI…<br /><span style={{ fontSize: '0.8rem', color: '#bbb' }}>This takes 30–60 seconds</span></p>
          </div>
        )}

        {/* Toolbar */}
        {articles.length > 0 && !mining && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#777' }}>
              <strong style={{ color: '#111' }}>{articles.length}</strong> articles · <strong style={{ color: '#111' }}>{allContactCount}</strong> named contacts
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button onClick={selectAllContacts} style={smallBtn}>Select All ({allContactCount})</button>
              <button onClick={clearSelection}    style={smallBtn}>Clear</button>
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
            {importResult.error ? `❌ ${importResult.error}` : `✅ Imported ${importResult.created} new partner${importResult.created !== 1 ? 's' : ''}${importResult.duplicates ? ` · ${importResult.duplicates} already existed` : ''} — find them in Partners.`}
          </div>
        )}

        {/* Article cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {articles.map(article => {
            const articleSelectedCount = article.contacts.filter(c => selected.has(contactKey(article.url, c))).length;
            return (
              <div key={article.url} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <a href={article.url} target="_blank" rel="noreferrer" style={{ color: '#000', textDecoration: 'underline', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4 }}>
                        {article.title} ↗
                      </a>
                      {article.dealSummary && <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#666' }}>{article.dealSummary}</p>}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                        {article.pubDate && <span style={{ fontSize: '0.75rem', color: '#aaa' }}>📅 {fmtDate(article.pubDate)}</span>}
                        {article.error && <span style={{ fontSize: '0.75rem', color: '#c00' }}>⚠ {article.error}</span>}
                      </div>
                    </div>
                    {article.contacts.length > 0 && (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#f0f0f0', color: '#555', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {articleSelectedCount}/{article.contacts.length} selected
                      </span>
                    )}
                  </div>
                </div>

                {article.contacts.length === 0
                  ? <div style={{ padding: '0.9rem 1.25rem', color: '#bbb', fontSize: '0.82rem', fontStyle: 'italic' }}>No named BD contacts found in this article</div>
                  : <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {article.contacts.map((contact, i) => {
                        const key = contactKey(article.url, contact);
                        const isSel = selected.has(key);
                        return (
                          <div key={i} onClick={() => toggleContact(article.url, contact)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', background: isSel ? '#f0f0f0' : 'transparent', border: `1px solid ${isSel ? '#ccc' : 'transparent'}`, cursor: 'pointer' }}>
                            <div style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 4, border: `2px solid ${isSel ? '#000' : '#ccc'}`, background: isSel ? '#000' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isSel && <span style={{ color: '#fff', fontSize: '0.65rem' }}>✓</span>}
                            </div>
                            <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#555', fontWeight: 700 }}>
                              {contact.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111' }}>{contact.name}</span>
                              {contact.title   && <span style={{ color: '#666', fontSize: '0.82rem' }}> · {contact.title}</span>}
                              {contact.company && <span style={{ color: '#333', fontSize: '0.82rem', fontWeight: 500 }}> · {contact.company}</span>}
                            </div>
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: '#f0f0f0', color: '#666', borderRadius: '4px', whiteSpace: 'nowrap' }}>Active dealmaker</span>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
            );
          })}
        </div>

        {articles.length === 0 && !mining && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', color: '#bbb' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📰</div>
            <p style={{ margin: 0 }}>Click <strong style={{ color: '#000' }}>Mine Deals</strong> to scan recent licensing announcements<br />and automatically extract named BD executives.</p>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#ccc' }}>Sources: BusinessWire · PRNewswire · Google News RSS</p>
          </div>
        )}
      </main>
    </>
  );
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' };
const smallBtn: React.CSSProperties = { padding: '0.3rem 0.75rem', fontSize: '0.8rem', background: '#fff', border: '1px solid #ccc', color: '#555', borderRadius: '6px', cursor: 'pointer' };
