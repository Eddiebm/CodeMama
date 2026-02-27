'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/app/components/Nav';

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
  isToday: boolean;
  totalPartners: number;
  totalEligible: number;
  recommendations: DailyPartner[];
  stats: DailyStats;
}

// ---- date helpers --------------------------------------------------------
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
  const today  = todayStr();
  const tomorrow = offsetDate(today, 1);
  const yesterday = offsetDate(today, -1);
  if (dateStr === today)     return 'Today';
  if (dateStr === tomorrow)  return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const MAX_FUTURE_DAYS = 14;
const MAX_PAST_DAYS   = 30;

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
  const [daily, setDaily]           = useState<DailyData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [expanded, setExpanded]     = useState<string | null>(null);

  useEffect(() => {
    loadDaily(dailyLimit, selectedDate);
  }, [dailyLimit, selectedDate]);

  async function loadDaily(limit: number, date: string) {
    setLoading(true);
    setExpanded(null);
    try {
      const res = await fetch(`/api/outreach/daily?limit=${limit}&date=${date}`);
      const data = await res.json();
      setDaily(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function navigate(days: number) {
    const next = offsetDate(selectedDate, days);
    const today = todayStr();
    const minDate = offsetDate(today, -MAX_PAST_DAYS);
    const maxDate = offsetDate(today, MAX_FUTURE_DAYS);
    if (next >= minDate && next <= maxDate) setSelectedDate(next);
  }

  const today = todayStr();
  const canGoBack    = selectedDate > offsetDate(today, -MAX_PAST_DAYS);
  const canGoForward = selectedDate < offsetDate(today, MAX_FUTURE_DAYS);
  const isToday      = selectedDate === today;

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f7f8fc' }}>

      <Nav />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1a1a2e' }}>Good morning, Eddie 👋</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>{formatFullDate(todayStr())}</p>
        </div>

        {/* ── Stats row ── */}
        {daily && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Partners', value: daily.totalPartners, color: '#1a1a2e' },
              { label: 'Ready to Contact', value: daily.totalEligible, color: '#1a56db' },
              { label: 'Emails Verified', value: daily.stats?.email?.verified ?? 0, color: '#1a6b1a' },
              { label: 'Investors', value: daily.stats?.byType?.INVESTOR ?? 0, color: '#7c3aed' },
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
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#1a1a2e' }}>🎯 Outreach List</h2>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', color: '#888' }}>
                  Scored · diversified · rotated daily
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <select
                  value={dailyLimit}
                  onChange={e => setDailyLimit(parseInt(e.target.value))}
                  style={{ padding: '0.35rem 0.6rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.82rem', background: '#fff' }}
                >
                  {[5, 8, 10, 15, 20].map(n => <option key={n} value={n}>{n} per day</option>)}
                </select>
                <button
                  onClick={() => loadDaily(dailyLimit, selectedDate)}
                  disabled={loading}
                  style={{ padding: '0.35rem 0.8rem', border: '1px solid #ddd', borderRadius: '5px', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', color: '#555' }}
                >
                  ↻
                </button>
              </div>
            </div>

            {/* Date navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => navigate(-1)}
                disabled={!canGoBack}
                style={{
                  padding: '0.3rem 0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  background: '#fff',
                  fontSize: '0.82rem',
                  cursor: canGoBack ? 'pointer' : 'not-allowed',
                  color: canGoBack ? '#333' : '#ccc',
                }}
              >
                ← Prev
              </button>

              <div style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.3rem 0.75rem',
                border: `1px solid ${isToday ? '#1a56db' : '#ddd'}`,
                borderRadius: '5px',
                background: isToday ? '#eef3ff' : '#fafafa',
                fontSize: '0.88rem',
                fontWeight: isToday ? 700 : 500,
                color: isToday ? '#1a56db' : '#444',
              }}>
                {formatDateLabel(selectedDate)}
                {!isToday && (
                  <span style={{ fontSize: '0.76rem', color: '#aaa', marginLeft: '0.4rem' }}>
                    ({selectedDate})
                  </span>
                )}
              </div>

              {!isToday && (
                <button
                  onClick={() => setSelectedDate(todayStr())}
                  style={{
                    padding: '0.3rem 0.75rem',
                    border: '1px solid #1a56db',
                    borderRadius: '5px',
                    background: '#eef3ff',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    color: '#1a56db',
                    fontWeight: 600,
                  }}
                >
                  Today
                </button>
              )}

              <button
                onClick={() => navigate(1)}
                disabled={!canGoForward}
                style={{
                  padding: '0.3rem 0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  background: '#fff',
                  fontSize: '0.82rem',
                  cursor: canGoForward ? 'pointer' : 'not-allowed',
                  color: canGoForward ? '#333' : '#ccc',
                }}
              >
                Next →
              </button>
            </div>

            {/* Non-today label */}
            {!isToday && (
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: '#999', fontStyle: 'italic' }}>
                {selectedDate < today
                  ? '📅 Past batch — showing the rotation that was queued for this date'
                  : '🔮 Future preview — this is who will surface if you haven\'t reached them yet'}
              </p>
            )}
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
