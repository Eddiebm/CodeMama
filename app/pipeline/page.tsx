'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/app/components/Nav';

type PipelineStage = 'NOT_STARTED' | 'AWAITING' | 'FOLLOW_UP_DUE' | 'RESPONDED' | 'DONE' | 'OPT_OUT';

interface PipelinePartner {
  id: string; name: string; region: string; partnerType: string;
  contactName: string | null; contactEmail: string | null; contactTitle: string | null;
  status: string; stage: PipelineStage;
  lastSentAt: string | null; lastInboundAt: string | null;
  daysSinceContact: number | null; followUpCount: number; totalSent: number;
}

interface PipelineData {
  stages: Record<PipelineStage, PipelinePartner[]>;
  counts: Record<PipelineStage, number>;
}

const STAGE_META: Record<PipelineStage, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  FOLLOW_UP_DUE: { label: 'Follow-up Due',  color: '#111', bg: '#f0f0f0', border: '#ccc',   icon: '⏰', desc: 'No reply after 7+ days (14 for CN)' },
  AWAITING:      { label: 'Awaiting Reply', color: '#444', bg: '#fafafa', border: '#e0e0e0', icon: '📤', desc: 'Sent within the last 7 days' },
  RESPONDED:     { label: 'Responded',      color: '#111', bg: '#f5f5f5', border: '#ccc',   icon: '💬', desc: 'Reply received' },
  NOT_STARTED:   { label: 'Not Started',    color: '#666', bg: '#fafafa', border: '#e5e5e5', icon: '🆕', desc: 'No outreach sent yet' },
  DONE:          { label: 'Done',           color: '#888', bg: '#fafafa', border: '#e5e5e5', icon: '✅', desc: 'Conversation closed' },
  OPT_OUT:       { label: 'Opted Out',      color: '#999', bg: '#fafafa', border: '#e5e5e5', icon: '🚫', desc: 'Partner opted out' },
};

const REGION_FLAG: Record<string, string> = { US: '🇺🇸', EU: '🇪🇺', CN: '🇨🇳' };
const DEFAULT_EXPANDED: PipelineStage[] = ['FOLLOW_UP_DUE', 'RESPONDED', 'AWAITING'];
const STAGE_ORDER: PipelineStage[] = ['FOLLOW_UP_DUE', 'AWAITING', 'RESPONDED', 'NOT_STARTED', 'DONE', 'OPT_OUT'];

function timeAgo(isoDate: string | null): string {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function PartnerRow({ p, stageMeta }: { p: PipelinePartner; stageMeta: typeof STAGE_META[PipelineStage] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: '#f0f0f0', color: '#555', whiteSpace: 'nowrap', minWidth: 56, textAlign: 'center' }}>
        {p.partnerType}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
        {p.contactName && (
          <div style={{ fontSize: '0.75rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.contactName}{p.contactTitle ? ` — ${p.contactTitle}` : ''}
          </div>
        )}
      </div>
      <span style={{ fontSize: '0.8rem' }}>{REGION_FLAG[p.region] || p.region}</span>
      <div style={{ textAlign: 'right', minWidth: 80, fontSize: '0.78rem', color: '#999' }}>
        {p.stage === 'RESPONDED' && p.lastInboundAt
          ? <span style={{ color: '#333' }}>replied {timeAgo(p.lastInboundAt)}</span>
          : p.lastSentAt
            ? <span style={{ color: p.stage === 'FOLLOW_UP_DUE' ? '#111' : '#999' }}>sent {timeAgo(p.lastSentAt)}</span>
            : null}
        {p.followUpCount > 0 && <div style={{ fontSize: '0.7rem', color: '#bbb' }}>{p.followUpCount} follow-up{p.followUpCount > 1 ? 's' : ''}</div>}
      </div>
      <Link href={`/partners/${p.id}`} style={{ padding: '0.3rem 0.8rem', border: '1px solid #ccc', borderRadius: '5px', background: '#fff', color: '#333', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        {p.stage === 'FOLLOW_UP_DUE' ? '↩ Follow Up' : p.stage === 'RESPONDED' ? '💬 Reply' : p.stage === 'NOT_STARTED' ? '✨ Start' : '→ Open'}
      </Link>
    </div>
  );
}

function StageSection({ stage, partners, defaultExpanded }: { stage: PipelineStage; partners: PipelinePartner[]; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const meta = STAGE_META[stage];
  return (
    <div style={{ marginBottom: '1rem', border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', background: meta.bg, border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: meta.color }}>{meta.label}</span>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: meta.color }}>({partners.length})</span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#aaa', fontStyle: 'italic' }}>{meta.desc}</span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#bbb' }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div>
          {partners.length === 0
            ? <p style={{ padding: '0.75rem 1rem', color: '#bbb', fontSize: '0.85rem', margin: 0, background: '#fff' }}>No partners in this stage.</p>
            : partners.map(p => <PartnerRow key={p.id} p={p} stageMeta={meta} />)}
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const [data, setData]       = useState<PipelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState<string>('ALL');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/outreach/pipeline');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const actionable = data ? (data.counts.FOLLOW_UP_DUE ?? 0) + (data.counts.RESPONDED ?? 0) : 0;

  return (
    <>
      <Nav />
      <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#000', fontWeight: 700 }}>Outreach Pipeline</h1>
              <p style={{ margin: '0.2rem 0 0', color: '#777', fontSize: '0.88rem' }}>Track who you&apos;ve contacted, who replied, and who needs a follow-up.</p>
            </div>
            <button onClick={load} disabled={loading} style={{ padding: '0.45rem 1rem', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}>
              {loading ? '⏳' : '↻ Refresh'}
            </button>
          </div>

          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Total Partners', value: total },
                { label: 'Follow-up Due',  value: data.counts.FOLLOW_UP_DUE ?? 0 },
                { label: 'Awaiting Reply', value: data.counts.AWAITING ?? 0 },
                { label: 'Responded',      value: data.counts.RESPONDED ?? 0 },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#000' }}>{s.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {['ALL', 'PHARMA', 'BIOTECH', 'INVESTOR'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.3rem 0.85rem', border: '1px solid #ccc', borderRadius: '20px', background: filter === f ? '#000' : '#fff', color: filter === f ? '#fff' : '#555', fontSize: '0.8rem', cursor: 'pointer', fontWeight: filter === f ? 600 : 400 }}>
                {f === 'ALL' ? 'All' : f}
              </button>
            ))}
          </div>

          {error && <p style={{ color: '#c00' }}>⚠️ {error}</p>}
          {loading && <p style={{ color: '#888' }}>Loading pipeline…</p>}

          {data && !loading && STAGE_ORDER.map(stage => {
            const partners = filter === 'ALL' ? data.stages[stage] : data.stages[stage].filter(p => p.partnerType === filter);
            return <StageSection key={stage} stage={stage} partners={partners} defaultExpanded={DEFAULT_EXPANDED.includes(stage)} />;
          })}

          {data && !loading && actionable > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '0.9rem 1.25rem', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '8px', fontSize: '0.88rem', color: '#333' }}>
              <strong>⏰ {actionable} action{actionable > 1 ? 's' : ''} need your attention</strong>
              {data.counts.FOLLOW_UP_DUE > 0 && <span> — {data.counts.FOLLOW_UP_DUE} follow-up{data.counts.FOLLOW_UP_DUE > 1 ? 's' : ''} overdue</span>}
              {data.counts.RESPONDED > 0 && <span> · {data.counts.RESPONDED} partner{data.counts.RESPONDED > 1 ? 's' : ''} responded</span>}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
