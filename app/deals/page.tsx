'use client';

import { useState } from 'react';
import Nav from '@/app/components/Nav';

// ── Types ───────────────────────────────────────────────────────────────────

interface DealContact {
  name: string;
  title: string;
  company: string;
}

interface DealArticle {
  title: string;
  url: string;
  pubDate: string;
  source: string;
  contacts: DealContact[];
  dealSummary: string;
  error?: string;
}

// Unique key per contact (article URL + name)
function contactKey(articleUrl: string, contact: DealContact) {
  return `${articleUrl}::${contact.name}`;
}

// ── Query presets ────────────────────────────────────────────────────────────

const QUERY_PRESETS = [
  {
    label: 'Oncology Licensing (default)',
    q: '"licensing agreement" OR "license agreement" oncology (biotech OR pharma) site:businesswire.com OR site:prnewswire.com',
  },
  {
    label: 'Ovarian Cancer Deals',
    q: '"licensing" "ovarian cancer" (pharma OR biotech) site:businesswire.com OR site:prnewswire.com',
  },
  {
    label: 'Combination Therapy',
    q: '"licensing agreement" "combination therapy" oncology site:businesswire.com OR site:prnewswire.com',
  },
  {
    label: 'BD Partnership Announcements',
    q: '"business development" "partnership" "oncology" (licensing OR collaboration) site:businesswire.com OR site:prnewswire.com',
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const [query, setQuery]             = useState(QUERY_PRESETS[0].q);
  const [maxArticles, setMaxArticles] = useState(8);
  const [mining, setMining]           = useState(false);
  const [articles, setArticles]       = useState<DealArticle[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [mineError, setMineError]     = useState('');

  // Selection: set of "articleUrl::contactName" keys
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleContact(articleUrl: string, contact: DealContact) {
    const key = contactKey(articleUrl, contact);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAllContacts() {
    const allKeys = new Set<string>();
    articles.forEach(a => a.contacts.forEach(c => allKeys.add(contactKey(a.url, c))));
    setSelected(allKeys);
  }

  function clearSelection() {
    setSelected(new Set());
  }

  // ── Mine ──────────────────────────────────────────────────────────────────

  async function runMine() {
    setMining(true);
    setMineError('');
    setArticles([]);
    setTotalContacts(0);
    setSelected(new Set());
    setImportResult(null);

    try {
      const res = await fetch('/api/deals/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxArticles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mining failed');
      setArticles(data.articles || []);
      setTotalContacts(data.totalContacts || 0);
    } catch (e: any) {
      setMineError(e.message);
    } finally {
      setMining(false);
    }
  }

  // ── Import ────────────────────────────────────────────────────────────────

  async function importSelected() {
    // Build the list of selected contacts as Apollo-like people objects
    const people: any[] = [];
    articles.forEach(article => {
      article.contacts.forEach(contact => {
        if (selected.has(contactKey(article.url, contact))) {
          people.push({
            name: contact.name,
            title: contact.title,
            organization: { name: contact.company },
            // No email available from press releases — will be blank
          });
        }
      });
    });

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

  // ── Format date ───────────────────────────────────────────────────────────

  function fmtDate(d: string) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const allContactCount = articles.reduce((n, a) => n + a.contacts.length, 0);

  return (
    <>
      <Nav />
      <main style={{ background: '#0f0f1a', minHeight: '100vh', padding: '2rem', color: '#e8eaf0' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            📰 Deal Announcement Mining
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: '#667' }}>
            Scans BusinessWire &amp; PRNewswire for licensing deals · uses AI to extract named BD executives · import directly to GPCE.
          </p>
        </div>

        {/* Controls */}
        <div style={{
          background: '#1a1a2e', borderRadius: '12px', padding: '1.25rem',
          border: '1px solid #2a2a4a', marginBottom: '1.5rem',
        }}>
          {/* Preset buttons */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Query Preset</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {QUERY_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setQuery(p.q)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: `1px solid ${query === p.q ? '#f59e0b' : '#2a2a4a'}`,
                    background: query === p.q ? '#f59e0b22' : '#12122a',
                    color: query === p.q ? '#f59e0b' : '#667',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Query input */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Search Query</label>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={2}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                background: '#12122a', border: '1px solid #2a2a4a',
                borderRadius: '8px', color: '#e8eaf0', fontSize: '0.82rem',
                fontFamily: 'monospace', resize: 'vertical', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Max articles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ ...labelStyle, margin: 0 }}>Articles to scan:</label>
              <select
                value={maxArticles}
                onChange={e => setMaxArticles(Number(e.target.value))}
                style={{
                  padding: '0.3rem 0.5rem',
                  background: '#12122a', border: '1px solid #2a2a4a',
                  borderRadius: '6px', color: '#e8eaf0', fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {[5, 8, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <p style={{ margin: 0, fontSize: '0.78rem', color: '#445' }}>
              ~{maxArticles * 3}s · ~{maxArticles} Claude calls · costs ~$0.0{maxArticles}
            </p>

            {/* Run button */}
            <button
              onClick={runMine}
              disabled={mining || !query.trim()}
              style={{
                marginLeft: 'auto',
                padding: '0.6rem 1.5rem',
                background: mining ? '#1e3a5f' : '#f59e0b',
                color: mining ? '#8899bb' : '#0f0f1a',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: mining ? 'not-allowed' : 'pointer',
              }}
            >
              {mining ? '⛏ Mining…' : '⛏ Mine Deals'}
            </button>
          </div>

          {mineError && (
            <p style={{ marginTop: '0.75rem', color: '#f87171', fontSize: '0.82rem' }}>
              ❌ {mineError}
            </p>
          )}
        </div>

        {/* Mining spinner */}
        {mining && (
          <div style={{
            textAlign: 'center', padding: '3rem',
            background: '#1a1a2e', borderRadius: '12px', border: '1px solid #2a2a4a',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'spin 1s linear infinite' }}>⛏</div>
            <p style={{ color: '#8899bb', margin: 0 }}>
              Scanning press releases and extracting BD leads with AI…<br />
              <span style={{ fontSize: '0.8rem', color: '#445' }}>This takes 30–60 seconds</span>
            </p>
          </div>
        )}

        {/* Results toolbar */}
        {articles.length > 0 && !mining && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#667' }}>
              Found <strong style={{ color: '#e8eaf0' }}>{articles.length}</strong> articles ·{' '}
              <strong style={{ color: '#e8eaf0' }}>{allContactCount}</strong> named contacts
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button onClick={selectAllContacts} style={smallBtn}>Select All ({allContactCount})</button>
              <button onClick={clearSelection} style={smallBtn}>Clear</button>
              {selected.size > 0 && (
                <button
                  onClick={importSelected}
                  disabled={importing}
                  style={{
                    ...smallBtn,
                    background: '#0e9f6e', color: '#fff',
                    border: '1px solid #0e9f6e', fontWeight: 600,
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
            marginBottom: '1rem', padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: importResult.error ? '#7f1d1d22' : '#052e1622',
            border: `1px solid ${importResult.error ? '#7f1d1d' : '#065f46'}`,
            color: importResult.error ? '#f87171' : '#6ee7b7',
            fontSize: '0.85rem',
          }}>
            {importResult.error
              ? `❌ ${importResult.error}`
              : `✅ Imported ${importResult.created} new partner${importResult.created !== 1 ? 's' : ''}` +
                (importResult.duplicates ? ` · ${importResult.duplicates} already existed` : '') +
                ' — find them in Partners to generate outreach emails.'
            }
          </div>
        )}

        {/* Article cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {articles.map(article => {
            const articleSelectedCount = article.contacts.filter(
              c => selected.has(contactKey(article.url, c))
            ).length;

            return (
              <div
                key={article.url}
                style={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                {/* Article header */}
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #2a2a4a' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.4 }}
                      >
                        {article.title} ↗
                      </a>
                      {article.dealSummary && (
                        <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#8899bb' }}>
                          {article.dealSummary}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                        {article.pubDate && (
                          <span style={{ fontSize: '0.75rem', color: '#445' }}>
                            📅 {fmtDate(article.pubDate)}
                          </span>
                        )}
                        {article.error && (
                          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                            ⚠ {article.error}
                          </span>
                        )}
                      </div>
                    </div>

                    {article.contacts.length > 0 && (
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '6px',
                        background: articleSelectedCount > 0 ? '#0e9f6e22' : '#12122a',
                        color: articleSelectedCount > 0 ? '#0e9f6e' : '#445',
                        fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {articleSelectedCount}/{article.contacts.length} selected
                      </span>
                    )}
                  </div>
                </div>

                {/* Contacts */}
                {article.contacts.length === 0 ? (
                  <div style={{ padding: '0.9rem 1.25rem', color: '#445', fontSize: '0.82rem', fontStyle: 'italic' }}>
                    No named BD contacts found in this article
                  </div>
                ) : (
                  <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {article.contacts.map((contact, i) => {
                      const key = contactKey(article.url, contact);
                      const isSelected = selected.has(key);
                      return (
                        <div
                          key={i}
                          onClick={() => toggleContact(article.url, contact)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            background: isSelected ? '#1e2d4a' : 'transparent',
                            border: `1px solid ${isSelected ? '#2563eb' : '#1a1a2e'}`,
                            cursor: 'pointer',
                            transition: 'all 0.1s',
                          }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width: '16px', height: '16px', flexShrink: 0,
                            borderRadius: '4px',
                            border: `2px solid ${isSelected ? '#2563eb' : '#2a2a4a'}`,
                            background: isSelected ? '#2563eb' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isSelected && <span style={{ color: '#fff', fontSize: '0.65rem' }}>✓</span>}
                          </div>

                          {/* Avatar initials */}
                          <div style={{
                            width: '32px', height: '32px', flexShrink: 0,
                            borderRadius: '50%', background: '#7c3aed33',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700,
                          }}>
                            {contact.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </div>

                          {/* Details */}
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#e8eaf0' }}>
                              {contact.name}
                            </span>
                            {contact.title && (
                              <span style={{ color: '#8899bb', fontSize: '0.82rem' }}>
                                {' · '}{contact.title}
                              </span>
                            )}
                            {contact.company && (
                              <span style={{ color: '#60a5fa', fontSize: '0.82rem' }}>
                                {' · '}{contact.company}
                              </span>
                            )}
                          </div>

                          {/* "Active dealmaker" badge */}
                          <span style={{
                            fontSize: '0.7rem', padding: '0.15rem 0.45rem',
                            background: '#f59e0b22', color: '#f59e0b',
                            borderRadius: '4px', whiteSpace: 'nowrap',
                          }}>
                            Active dealmaker
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {articles.length === 0 && !mining && (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: '#1a1a2e', borderRadius: '12px', border: '1px solid #2a2a4a',
            color: '#444',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📰</div>
            <p style={{ margin: 0 }}>
              Click <strong style={{ color: '#f59e0b' }}>⛏ Mine Deals</strong> to scan recent licensing announcements<br />
              and automatically extract named BD executives.
            </p>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#333' }}>
              Sources: BusinessWire · PRNewswire · Google News RSS
            </p>
          </div>
        )}

      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
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

const smallBtn: React.CSSProperties = {
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  background: '#12122a',
  border: '1px solid #2a2a4a',
  color: '#8899bb',
  borderRadius: '6px',
  cursor: 'pointer',
};
