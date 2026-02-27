'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DailyPartner {
  id: string;
  name: string;
  region: string;
  interest: string;
  partnerType: string;
  contactName: string | null;
  contactEmail: string | null;
  contactTitle: string | null;
  status: string;
  emailStatus: string | null;
  score: number;
  reasons: string[];
}

interface DailyStats {
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  email: { withEmail: number; verified: number; invalid: number; unchecked: number };
}

interface DailyData {
  date: string;
  totalPartners: number;
  totalEligible: number;
  recommendations: DailyPartner[];
  stats: DailyStats;
}

const TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  PHARMA:   { color: '#1a56db', bg: '#eef3ff' },
  BIOTECH:  { color: '#0e7c6b', bg: '#edfaf7' },
  INVESTOR: { color: '#7c3aed', bg: '#f5f0ff' },
  OTHER:    { color: '#555',    bg: '#f4f4f4' },
};

const REGION_FLAG: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', CN: '🇨🇳',
};

function ScoreDot({ score }: { score: number }) {
  const color = score >= 150 ? '#1a6b1a' : score >= 100 ? '#1a56db' : '#b85c00';
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: color,
      marginRight: 5,
      verticalAlign: 'middle',
    }} />
  );
}

export default function Home() {
  const [daily, setDaily]       = useState<DailyData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadDaily(dailyLimit);
  }, [dailyLimit]);

  async function loadDaily(limit: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach/daily?limit=${limit}`);
      const data = await res.json();
      setDaily(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f8fc' }}>

      {/* ── Top nav bar ── */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.02em' }}>🧬 GPCE</span>
          <span style={{ color: '#aaa', marginLeft: '0.5rem', fontSize: '0.88rem' }}>Global Partner Continuity Engine</span>
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', fontSize: '0.88rem' }}>
          <Link href="/partners" style={{ color: '#ccd', textDecoration: 'none' }}>👥 Partners</Link>
          <Link href="/news"     style={{ color: '#ccd', textDecoration: 'none' }}>📰 Intelligence</Link>
          <Link href="/drafts"   style={{ color: '#ccd', textDecoration: 'none' }}>📬 Drafts</Link>
          <Link href="/settings" style={{ color: '#ccd', textDecoration: 'none' }}>⚙️ Settings</Link>
        </nav>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1a1a2e' }}>Good morning, Eddie 👋</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>{today}</p>
        </div>

        {/* ── Stats row ── */}
        {daily && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Partners', value: daily.totalPartners, color: '#1a1a2e' },
              { label: 'Ready to Contact', value: daily.totalEligible, color: '#1a56db' },
              { label: 'Emails Verified', value: daily.stats.email.verified, color: '#1a6b1a' },
              { label: 'Investors', value: daily.stats.byType.INVESTOR || 0, color: '#7c3aed' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Today's Outreach ── */}
        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1a1a2e' }}>🎯 Today's Outreach</h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#888' }}>
                Prioritized by engagement score — diversified across partner type and region
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                value={dailyLimit}
                onChange={e => setDailyLimit(parseInt(e.target.value))}
                style={{ padding: '0.35rem 0.6rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.82rem', background: '#fff' }}
              >
                {[5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n} today</option>)}
              </select>
              <button
                onClick={() => loadDaily(dailyLimit)}
                disabled={loading}
                style={{ padding: '0.35rem 0.8rem', border: '1px solid #ddd', borderRadius: '5px', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', color: '#555' }}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {loading && <p style={{ padding: '1.5rem', color: '#888', fontSize: '0.9rem' }}>Loading recommendations…</p>}

          {!loading && daily && daily.recommendations.length === 0 && (
            <p style={{ padding: '1.5rem', color: '#888', fontSize: '0.9rem' }}>
              No eligible partners found. Make sure partners have contact emails in the database.
            </p>
          )}

          {!loading && daily && daily.recommendations.map((p, i) => {
            const ts = TYPE_STYLE[p.partnerType] || TYPE_STYLE.OTHER;
            const isOpen = expanded === p.id;

            return (
              <div key={p.id} style={{ borderBottom: i < daily.recommendations.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.9rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    background: isOpen ? '#fafbff' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = '#f9f9fc'; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Rank */}
                  <span style={{ minWidth: 22, fontSize: '0.8rem', color: '#aaa', fontWeight: 600 }}>#{i + 1}</span>

                  {/* Type badge */}
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: ts.bg, color: ts.color, whiteSpace: 'nowrap' }}>
                    {p.partnerType}
                  </span>

                  {/* Company + contact */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.93rem', color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    {p.contactName && (
                      <div style={{ fontSize: '0.78rem', color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.contactName}{p.contactTitle ? ` — ${p.contactTitle}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Region */}
                  <span style={{ fontSize: '0.85rem' }}>{REGION_FLAG[p.region] || p.region}</span>

                  {/* Score */}
                  <div style={{ textAlign: 'right', minWidth: 60 }}>
                    <ScoreDot score={p.score} />
                    <span style={{ fontSize: '0.8rem', color: '#777' }}>{p.score}</span>
                  </div>

                  {/* Chevron */}
                  <span style={{ color: '#ccc', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: '0.75rem 1.5rem 1.1rem 3.5rem', background: '#fafbff', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                        <div style={{ fontSize: '0.88rem', color: '#333' }}>
                          {p.contactEmail || <em style={{ color: '#bbb' }}>No email</em>}
                          {p.emailStatus === 'VALID' && <span style={{ color: '#1a6b1a', marginLeft: 5, fontSize: '0.78rem' }}>✓ verified</span>}
                          {p.emailStatus === 'INVALID' && <span style={{ color: '#c00', marginLeft: 5, fontSize: '0.78rem' }}>✗ invalid</span>}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interest</span>
                        <div style={{ fontSize: '0.85rem', color: '#444', maxWidth: 260 }}>{p.interest}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why today</span>
                        <div style={{ fontSize: '0.82rem', color: '#555' }}>
                          {p.reasons.slice(0, 3).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <Link
                        href={`/partners/${p.id}`}
                        style={{
                          padding: '0.4rem 1rem',
                          background: '#1a56db',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        ✨ Open &amp; Generate Email
                      </Link>
                      <Link
                        href={`/partners/${p.id}`}
                        style={{
                          padding: '0.4rem 1rem',
                          background: '#fff',
                          color: '#555',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                        }}
                      >
                        📋 View Profile
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Quick links ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { href: '/news', icon: '📰', title: 'Intelligence Feed', desc: 'Industry news, oncology deals, M&A, and partner company updates' },
            { href: '/partners', icon: '👥', title: 'Partner Database', desc: '562 pharma, biotech, and investor contacts from the LSN database' },
            { href: '/drafts', icon: '📬', title: 'Pending Drafts', desc: 'Review and approve outreach emails before they are sent' },
          ].map(card => (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  borderRadius: '10px',
                  padding: '1.1rem 1.25rem',
                  transition: 'box-shadow 0.12s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{card.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1a2e', marginBottom: '0.3rem' }}>{card.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#777', lineHeight: '1.45' }}>{card.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
