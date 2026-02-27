'use client';

import { useEffect, useState, useCallback } from 'react';
import Nav from '@/app/components/Nav';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

type IndustryTopic = 'all' | 'partnerships' | 'mna' | 'clinical' | 'ovarian';

const TOPIC_LABELS: Record<IndustryTopic, string> = {
  all:          '🌐 All Oncology',
  partnerships: '🤝 Partnerships',
  mna:          '💰 M&A',
  clinical:     '🔬 Clinical',
  ovarian:      '🎯 Ovarian Cancer',
};

const TOPIC_DESCRIPTIONS: Record<IndustryTopic, string> = {
  all:          'Broad solid tumor oncology: deals, data, and company moves',
  partnerships: 'Licensing deals, co-development agreements, and collaborations',
  mna:          'Acquisitions, mergers, and strategic transactions',
  clinical:     'Trial readouts, approvals, and breakthrough designations',
  ovarian:      'HGSOC, ovarian, and gynecologic oncology specifically',
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '0.9rem 1rem',
        borderBottom: '1px solid #f0f0f0',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f9f9fc')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e', lineHeight: '1.4', marginBottom: '0.25rem' }}>
        {item.title}
      </div>
      {item.snippet && (
        <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: '1.5', marginBottom: '0.35rem' }}>
          {item.snippet}
        </div>
      )}
      <div style={{ fontSize: '0.74rem', color: '#999', display: 'flex', gap: '0.75rem' }}>
        <span>{item.source}</span>
        <span>·</span>
        <span>{timeAgo(item.pubDate)}</span>
      </div>
    </a>
  );
}

function NewsSection({
  title,
  items,
  loading,
  error,
}: {
  title: string;
  items: NewsItem[];
  loading: boolean;
  error: string;
}) {
  if (loading) return <p style={{ padding: '1rem', color: '#888', fontSize: '0.88rem' }}>Loading…</p>;
  if (error)   return <p style={{ padding: '1rem', color: '#c00', fontSize: '0.88rem' }}>⚠️ {error}</p>;
  if (!items.length) return <p style={{ padding: '1rem', color: '#888', fontSize: '0.88rem' }}>No articles found.</p>;
  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
      {items.map((item, i) => <NewsCard key={i} item={item} />)}
    </div>
  );
}

// ---- Company search -------------------------------------------------------
function CompanySearchPanel() {
  const [query, setQuery]       = useState('');
  const [searched, setSearched] = useState('');
  const [items, setItems]       = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(query.trim());
    try {
      const res = await fetch(`/api/news?type=company&name=${encodeURIComponent(query.trim())}&max=10`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="e.g. AstraZeneca, Roche, Pfizer…"
          style={{
            flex: 1,
            padding: '0.55rem 0.75rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.9rem',
          }}
        />
        <button
          onClick={search}
          disabled={loading}
          style={{
            padding: '0.55rem 1.25rem',
            background: loading ? '#aaa' : '#1a56db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
      {searched && (
        <div style={{ marginBottom: '0.5rem', fontSize: '0.82rem', color: '#666' }}>
          News results for <strong>{searched}</strong>
        </div>
      )}
      <NewsSection title="" items={items} loading={false} error={error} />
    </div>
  );
}

// ---- Partner news (from DB) -----------------------------------------------
interface PartnerRow {
  id: string;
  name: string;
  partnerType: string;
  region: string;
  contactName: string | null;
}

function PartnerNewsPanel() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [items, setItems]       = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [loadingPartners, setLoadingPartners] = useState(true);

  useEffect(() => {
    fetch('/api/partners')
      .then(r => r.json())
      .then((data: any[]) => {
        const list: PartnerRow[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          partnerType: p.partnerType,
          region: p.region,
          contactName: p.contactName,
        }));
        // Sort alphabetically for easy scanning
        list.sort((a, b) => a.name.localeCompare(b.name));
        setPartners(list);
      })
      .catch(console.error)
      .finally(() => setLoadingPartners(false));
  }, []);

  async function fetchForPartner(name: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/news?type=company&name=${encodeURIComponent(name)}&max=8`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelected(val);
    setItems([]);
    if (val) fetchForPartner(val);
  }

  if (loadingPartners) return <p style={{ color: '#888', fontSize: '0.88rem' }}>Loading partners…</p>;

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <select
          value={selected}
          onChange={handleSelect}
          style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            fontSize: '0.9rem',
            background: '#fff',
          }}
        >
          <option value="">— Select a partner to see their news —</option>
          {partners.map(p => (
            <option key={p.id} value={p.name}>
              {p.name}  ({p.partnerType} · {p.region})
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div style={{ fontSize: '0.82rem', color: '#666', marginBottom: '0.5rem' }}>
          News for <strong>{selected}</strong>
        </div>
      )}
      <NewsSection title="" items={items} loading={loading} error={error} />
    </div>
  );
}

// ---- Main page ------------------------------------------------------------
type Tab = 'industry' | 'partner' | 'search';

export default function NewsPage() {
  const [tab, setTab]             = useState<Tab>('industry');
  const [topic, setTopic]         = useState<IndustryTopic>('all');
  const [industryItems, setIndustryItems] = useState<NewsItem[]>([]);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [industryError, setIndustryError]     = useState('');

  const loadIndustry = useCallback(async (t: IndustryTopic) => {
    setIndustryLoading(true);
    setIndustryError('');
    try {
      const res = await fetch(`/api/news?type=industry&topic=${t}&max=12`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIndustryItems(data.items || []);
    } catch (e: any) {
      setIndustryError(e.message);
    } finally {
      setIndustryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIndustry(topic);
  }, [topic, loadIndustry]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1.1rem',
    border: 'none',
    borderBottom: active ? '2px solid #1a56db' : '2px solid transparent',
    background: 'transparent',
    color: active ? '#1a56db' : '#555',
    fontWeight: active ? 700 : 400,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'color 0.1s',
  });

  return (
    <>
    <Nav />
    <main style={{ padding: '2rem', maxWidth: '820px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginTop: '0.75rem', marginBottom: '0.15rem', fontSize: '1.4rem' }}>📰 Intelligence Feed</h1>
      <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
        Stay current on your partner companies, track solid tumor oncology deals, and spot new partnership opportunities.
      </p>

      {/* Tab nav */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e8e8e8', marginBottom: '1.5rem', gap: '0.25rem' }}>
        <button style={tabStyle(tab === 'industry')} onClick={() => setTab('industry')}>🌐 Industry News</button>
        <button style={tabStyle(tab === 'partner')}  onClick={() => setTab('partner')}>🏢 Partner Profile News</button>
        <button style={tabStyle(tab === 'search')}   onClick={() => setTab('search')}>🔍 Company Search</button>
      </div>

      {/* Industry News tab */}
      {tab === 'industry' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(Object.keys(TOPIC_LABELS) as IndustryTopic[]).map(t => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                style={{
                  padding: '0.35rem 0.9rem',
                  border: `1px solid ${topic === t ? '#1a56db' : '#ddd'}`,
                  borderRadius: '20px',
                  background: topic === t ? '#1a56db' : '#fff',
                  color: topic === t ? '#fff' : '#444',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: topic === t ? 600 : 400,
                  transition: 'all 0.12s',
                }}
              >
                {TOPIC_LABELS[t]}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#777', marginBottom: '0.75rem', fontStyle: 'italic' }}>
            {TOPIC_DESCRIPTIONS[topic]}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
              {industryItems.length > 0 && `${industryItems.length} articles · refreshes every 5 min`}
            </span>
            <button
              onClick={() => loadIndustry(topic)}
              disabled={industryLoading}
              style={{
                padding: '0.3rem 0.75rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                background: '#fff',
                fontSize: '0.78rem',
                cursor: 'pointer',
                color: '#555',
              }}
            >
              {industryLoading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>

          <NewsSection title="" items={industryItems} loading={industryLoading} error={industryError} />
        </div>
      )}

      {/* Partner Profile News tab */}
      {tab === 'partner' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Select any partner from your database to see their latest news. Great for pre-call research before reaching out.
          </p>
          <PartnerNewsPanel />
        </div>
      )}

      {/* Company Search tab */}
      {tab === 'search' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Search for any company by name — including companies not yet in your database — to check for recent news before adding them.
          </p>
          <CompanySearchPanel />
        </div>
      )}
    </main>
    </>
  );
}
