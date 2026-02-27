'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type PipelineStage = 'NOT_STARTED' | 'AWAITING' | 'FOLLOW_UP_DUE' | 'RESPONDED' | 'DONE' | 'OPT_OUT';

interface PipelinePartner {
  id: string;
  name: string;
  region: string;
  partnerType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactTitle: string | null;
  status: string;
  stage: PipelineStage;
  lastSentAt: string | null;
  lastInboundAt: string | null;
  daysSinceContact: number | null;
  followUpCount: number;
  totalSent: number;
}

interface PipelineData {
  stages: Record<PipelineStage, PipelinePartner[]>;
  counts: Record<PipelineStage, number>;
}

const STAGE_META: Record<PipelineStage, { label: string; color: string; bg: string; border: string; icon: string; desc: string }> = {
  FOLLOW_UP_DUE: { label: 'Follow-up Due',  color: '#b85c00', bg: '#fff8ec', border: '#f0d080', icon: '⏰', desc: 'No reply after 7+ days (14 for CN)' },
  AWAITING:      { label: 'Awaiting Reply', color: '#1a56db', bg: '#eef3ff', border: '#b8ccf0', icon: '📤', desc: 'Sent within the last 7 days' },
  RESPONDED:     { label: 'Responded',      color: '#1a6b1a', bg: '#efffef', border: '#99d499', icon: '💬', desc: 'Reply received' },
  NOT_STARTED:   { label: 'Not Started',    color: '#555',    bg: '#f5f5f5', border: '#ddd',    icon: '🆕', desc: 'No outreach sent yet' },
  DONE:          { label: 'Done',           color: '#777',    bg: '#f9f9f9', border: '#ddd',    icon: '✅', desc: 'Conversation closed' },
  OPT_OUT:       { label: 'Opted Out',      color: '#c00',    bg: '#fff0f0', border: '#f0aaaa', icon: '🚫', desc: 'Partner opted out' },
};

const TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  PHARMA:   { color: '#1a56db', bg: '#eef3ff' },
  BIOTECH:  { color: '#0e7c6b', bg: '#edfaf7' },
  INVESTOR: { color: '#7c3aed', bg: '#f5f0ff' },
  OTHER:    { color: '#555',    bg: '#f4f4f4' },
};

const REGION_FLAG: Record<string, string> = { US: '🇺🇸', EU: '🇪🇺', CN: '🇨🇳' };

// Which stages to show by default (collapsed or expanded)
const DEFAULT_EXPANDED: PipelineStage[] = ['FOLLOW_UP_DUE', 'RESPONDED', 'AWAITING'];

// Display order
const STAGE_ORDER: PipelineStage[] = ['FOLLOW_UP_DUE', 'AWAITING', 'RESPONDED', 'NOT_STARTED', 'DONE', 'OPT_OUT'];

function timeAgo(isoDate: string | null): string {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function PartnerRow({ p, stageMeta }: { p: PipelinePartner; stageMeta: typeof STAGE_META[PipelineStage] }) {
  const ts = TYPE_STYLE[p.partnerType] || TYPE_STYLE.OTHER;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.7rem 1rem',
      borderBottom: '1px solid #f5f5f5',
      background: '#fff',
    }}>
      {/* Type */}
      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', background: ts.bg, color: ts.color, whiteSpace: 'nowrap', minWidth: 56, textAlign: 'center' }}>
        {p.partnerType}
      </span>

      {/* Company + contact */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </div>
        {p.contactName && (
          <div style={{ fontSize: '0.75rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.contactName}{p.contactTitle ? ` — ${p.contactTitle}` : ''}
          </div>
        )}
      </div>

      {/* Region */}
      <span style={{ fontSize: '0.8rem' }}>{REGION_FLAG[p.region] || p.region}</span>

      {/* Timeline */}
      <div style={{ textAlign: 'right', minWidth: 80, fontSize: '0.78rem', color: '#999' }}>
        {p.stage === 'RESPONDED' && p.lastInboundAt ? (
          <span style={{ color: '#1a6b1a' }}>replied {timeAgo(p.lastInboundAt)}</span>
        ) : p.lastSentAt ? (
          <span style={{ color: p.stage === 'FOLLOW_UP_DUE' ? '#b85c00' : '#888' }}>
            sent {timeAgo(p.lastSentAt)}
          </span>
        ) : null}
        {p.followUpCount > 0 && (
          <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{p.followUpCount} follow-up{p.followUpCount > 1 ? 's' : ''} sent</div>
        )}
      </div>

      {/* Action button */}
      <Link
        href={`/partners/${p.id}`}
        style={{
          padding: '0.3rem 0.8rem',
          border: `1px solid ${stageMeta.border}`,
          borderRadius: '5px',
          background: stageMeta.bg,
          color: stageMeta.color,
          fontSize: '0.78rem',
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {p.stage === 'FOLLOW_UP_DUE' ? '↩ Follow Up' :
         p.stage === 'RESPONDED'     ? '💬 Reply'    :
         p.stage === 'NOT_STARTED'   ? '✨ Start'    :
                                       '→ Open'}
      </Link>
    </div>
  );
}

function StageSection({
  stage,
  partners,
  defaultExpanded,
}: {
  stage: PipelineStage;
  partners: PipelinePartner[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const meta = STAGE_META[stage];

  return (
    <div style={{ marginBottom: '1.25rem', border: `1px solid ${meta.border}`, borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.8rem 1rem',
          background: meta.bg,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>{meta.icon}</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: meta.color }}>{meta.label}</span>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: meta.color }}>
            ({partners.length})
          </span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.78rem', color: '#888', fontStyle: 'italic' }}>{meta.desc}</span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#aaa' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Rows */}
      {expanded && (
        <div>
          {partners.length === 0 ? (
            <p style={{ padding: '0.75rem 1rem', color: '#bbb', fontSize: '0.85rem', margin: 0, background: '#fff' }}>
              No partners in this stage.
            </p>
          ) : (
            partners.map(p => <PartnerRow key={p.id} p={p} stageMeta={meta} />)
          )}
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
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/outreach/pipeline');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const actionable = data ? (data.counts.FOLLOW_UP_DUE ?? 0) + (data.counts.RESPONDED ?? 0) : 0;

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f8fc' }}>
      {/* Nav */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.88rem' }}>🧬 GPCE</Link>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem' }}>
          <Link href="/partners"  style={{ color: '#ccd', textDecoration: 'none' }}>👥 Partners</Link>
          <Link href="/pipeline"  style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>🔄 Pipeline</Link>
          <Link href="/news"      style={{ color: '#ccd', textDecoration: 'none' }}>📰 Intelligence</Link>
          <Link href="/drafts"    style={{ color: '#ccd', textDecoration: 'none' }}>📬 Drafts</Link>
          <Link href="/settings"  style={{ color: '#ccd', textDecoration: 'none' }}>⚙️ Settings</Link>
        </nav>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a2e' }}>🔄 Outreach Pipeline</h1>
            <p style={{ margin: '0.2rem 0 0', color: '#777', fontSize: '0.88rem' }}>
              Track who you've contacted, who replied, and who needs a follow-up.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: '0.45rem 1rem', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '0.85rem', color: '#555' }}
          >
            {loading ? '⏳' : '↻ Refresh'}
          </button>
        </div>

        {/* KPI row */}
        {data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Partners', value: total, color: '#1a1a2e' },
              { label: 'Follow-up Due', value: data.counts.FOLLOW_UP_DUE ?? 0, color: '#b85c00' },
              { label: 'Awaiting Reply', value: data.counts.AWAITING ?? 0, color: '#1a56db' },
              { label: 'Responded', value: data.counts.RESPONDED ?? 0, color: '#1a6b1a' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Type filter */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {['ALL', 'PHARMA', 'BIOTECH', 'INVESTOR'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '0.3rem 0.85rem',
                border: `1px solid ${filter === f ? '#1a56db' : '#ddd'}`,
                borderRadius: '20px',
                background: filter === f ? '#1a56db' : '#fff',
                color: filter === f ? '#fff' : '#555',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f === 'ALL' ? '🌐 All' : f}
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#c00' }}>⚠️ {error}</p>}
        {loading && <p style={{ color: '#888' }}>Loading pipeline…</p>}

        {data && !loading && STAGE_ORDER.map(stage => {
          const partners = filter === 'ALL'
            ? data.stages[stage]
            : data.stages[stage].filter(p => p.partnerType === filter);
          return (
            <StageSection
              key={stage}
              stage={stage}
              partners={partners}
              defaultExpanded={DEFAULT_EXPANDED.includes(stage)}
            />
          );
        })}

        {data && !loading && actionable > 0 && (
          <div style={{ marginTop: '1.5rem', padding: '0.9rem 1.25rem', background: '#fff8ec', border: '1px solid #f0d080', borderRadius: '8px', fontSize: '0.88rem', color: '#7a4a00' }}>
            <strong>⏰ {actionable} action{actionable > 1 ? 's' : ''} need your attention</strong>
            {data.counts.FOLLOW_UP_DUE > 0 && (
              <span> — {data.counts.FOLLOW_UP_DUE} follow-up{data.counts.FOLLOW_UP_DUE > 1 ? 's' : ''} overdue</span>
            )}
            {data.counts.RESPONDED > 0 && (
              <span> · {data.counts.RESPONDED} partner{data.counts.RESPONDED > 1 ? 's' : ''} responded</span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
