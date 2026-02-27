'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type PartnerType = 'PHARMA' | 'BIOTECH' | 'INVESTOR' | 'OTHER';

interface Partner {
  id: string;
  name: string;
  region: string;
  status: string;
  interest: string;
  partnerType: PartnerType;
  humanRequired: boolean;
  contactName?: string;
  contactEmail?: string;
  contactTitle?: string;
  lastContactAt?: string;
  messages: { id: string; direction: string; body: string; createdAt: string }[];
  drafts: { id: string; category: string; subject?: string; body: string; status: string; createdAt: string; sentAt?: string }[];
}

const TYPE_META: Record<PartnerType, { label: string; color: string; bg: string; description: string }> = {
  PHARMA:   { label: 'Pharma',    color: '#1a56db', bg: '#eef3ff', description: 'BD/licensing-focused email — therapeutic alignment & pipeline fit' },
  BIOTECH:  { label: 'Biotech',   color: '#0e7c6b', bg: '#edfaf7', description: 'BD/licensing-focused email — therapeutic alignment & pipeline fit' },
  INVESTOR: { label: 'Investor',  color: '#7c3aed', bg: '#f5f0ff', description: 'VC/investor-focused email — market opportunity, milestones & capital efficiency' },
  OTHER:    { label: 'Other',     color: '#555',    bg: '#f4f4f4', description: 'Standard outreach email' },
};

type EmailStatus = 'UNCHECKED' | 'VALID' | 'INVALID' | 'NO_EMAIL' | 'CHECKING';

export default function PartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('UNCHECKED');
  const [emailStatusReason, setEmailStatusReason] = useState('');

  // Outreach state
  const [generating, setGenerating] = useState(false);
  const [activeDraft, setActiveDraft] = useState<{ draftId: string; subject: string; body: string } | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [includeDeck, setIncludeDeck] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const [typeChanging, setTypeChanging] = useState(false);

  // News state
  const [newsItems, setNewsItems]   = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsError, setNewsError]   = useState('');

  useEffect(() => {
    if (id) fetchPartner();
  }, [id]);

  async function fetchPartner() {
    const res = await fetch(`/api/partners/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPartner(data);
    }
  }

  async function changeType(newType: PartnerType) {
    setTypeChanging(true);
    await fetch(`/api/partners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerType: newType }),
    });
    await fetchPartner();
    setTypeChanging(false);
  }

  async function checkEmail() {
    setEmailStatus('CHECKING');
    setEmailStatusReason('');
    const res = await fetch(`/api/partners/${id}/validate-email`, { method: 'POST' });
    const data = await res.json();
    setEmailStatus(data.status || 'INVALID');
    setEmailStatusReason(data.reason || '');
  }

  async function generateEmail() {
    setGenerating(true);
    setError('');
    setActiveDraft(null);
    setSentMessage('');
    try {
      const res = await fetch(`/api/partners/${id}/generate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setActiveDraft({ draftId: data.draftId, subject: data.subject, body: data.body });
      setEditedSubject(data.subject);
      setEditedBody(data.body);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function sendEmail() {
    if (!activeDraft) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/partners/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: activeDraft.draftId, includeDeck }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setSentMessage(`✅ Email sent to ${partner?.contactEmail}`);
      setActiveDraft(null);
      fetchPartner();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  async function loadNews() {
    if (!partner) return;
    setNewsLoading(true);
    setNewsError('');
    try {
      const res = await fetch(`/api/news?type=company&name=${encodeURIComponent(partner.name)}&max=6`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewsItems(data.items || []);
      setNewsLoaded(true);
    } catch (e: any) {
      setNewsError(e.message);
    } finally {
      setNewsLoading(false);
    }
  }

  async function discardDraft() {
    if (!activeDraft) return;
    await fetch(`/api/drafts/${activeDraft.draftId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'REJECT' }),
    });
    setActiveDraft(null);
    setError('');
  }

  if (!partner) return <p style={{ padding: '2rem' }}>Loading…</p>;

  const pType = (partner.partnerType || 'PHARMA') as PartnerType;
  const typeMeta = TYPE_META[pType];

  const emailBadge: Record<EmailStatus, { label: string; color: string }> = {
    UNCHECKED: { label: '⚪ Not checked', color: '#888' },
    CHECKING:  { label: '🔄 Checking…',   color: '#888' },
    VALID:     { label: '✅ Valid',         color: '#1a6b1a' },
    INVALID:   { label: '❌ Invalid',       color: '#c00' },
    NO_EMAIL:  { label: '⚠️ No email',     color: '#b85c00' },
  };

  const canSend = emailStatus === 'VALID' && !!activeDraft && !sending;
  const alreadySent = partner.drafts.some(d => d.category === 'OUTREACH' && d.status === 'SENT');

  return (
    <main style={{ padding: '2rem', maxWidth: '780px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <a href="/partners" style={{ fontSize: '0.88rem', color: '#555', textDecoration: 'none' }}>← Back to Partners</a>

      <h1 style={{ marginTop: '0.75rem', marginBottom: '0.25rem', fontSize: '1.5rem' }}>{partner.name}</h1>
      <p style={{ color: '#555', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
        Region: <strong>{partner.region}</strong> &nbsp;·&nbsp; Status: <strong>{partner.status}</strong>
        {partner.lastContactAt && (
          <span> &nbsp;·&nbsp; Last contact: {new Date(partner.lastContactAt).toLocaleDateString()}</span>
        )}
      </p>
      {/* Partner Type Badge + Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.6rem 0 0.25rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: '#666' }}>Type:</span>
        {(['PHARMA', 'BIOTECH', 'INVESTOR', 'OTHER'] as PartnerType[]).map(t => (
          <button
            key={t}
            onClick={() => changeType(t)}
            disabled={typeChanging}
            style={{
              padding: '3px 10px',
              fontSize: '0.78rem',
              fontWeight: pType === t ? 700 : 400,
              border: `1px solid ${pType === t ? TYPE_META[t].color : '#ccc'}`,
              borderRadius: '12px',
              background: pType === t ? TYPE_META[t].bg : '#fff',
              color: pType === t ? TYPE_META[t].color : '#777',
              cursor: typeChanging ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {TYPE_META[t].label}
          </button>
        ))}
        <span style={{ fontSize: '0.76rem', color: '#888', marginLeft: '0.25rem' }}>
          — {typeMeta.description}
        </span>
      </div>

      {partner.humanRequired && (
        <p style={{ color: 'red', fontWeight: 'bold', margin: '0.5rem 0' }}>⚠️ HUMAN REQUIRED — escalated</p>
      )}

      {/* Contact Card */}
      {(partner.contactName || partner.contactEmail) && (
        <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '6px', display: 'inline-block', minWidth: '300px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</div>
          {partner.contactName && (
            <div style={{ fontSize: '0.95rem' }}>
              {partner.contactName}
              {partner.contactTitle && <span style={{ color: '#666', fontSize: '0.88rem' }}> — {partner.contactTitle}</span>}
            </div>
          )}
          {partner.contactEmail && (
            <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <a href={`mailto:${partner.contactEmail}`} style={{ fontSize: '0.9rem', color: '#0066cc' }}>
                {partner.contactEmail}
              </a>
              <button
                onClick={checkEmail}
                disabled={emailStatus === 'CHECKING'}
                style={{ fontSize: '0.75rem', padding: '2px 8px', cursor: 'pointer', border: '1px solid #bbb', borderRadius: '4px', background: '#fff' }}
              >
                Check
              </button>
              <span style={{ fontSize: '0.8rem', color: emailBadge[emailStatus].color }}>
                {emailBadge[emailStatus].label}
              </span>
            </div>
          )}
          {emailStatusReason && emailStatus === 'INVALID' && (
            <div style={{ fontSize: '0.78rem', color: '#c00', marginTop: '4px' }}>{emailStatusReason}</div>
          )}
        </div>
      )}

      {/* ── OUTREACH SECTION ── */}
      <div style={{ marginTop: '2rem', borderTop: '2px solid #e8e8e8', paddingTop: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📧 Outreach Email</h2>

        {sentMessage && (
          <div style={{ padding: '0.75rem 1rem', background: '#efffef', border: '1px solid #99d499', borderRadius: '6px', marginBottom: '1rem', color: '#1a6b1a', fontSize: '0.9rem' }}>
            {sentMessage}
          </div>
        )}

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: '#fff0f0', border: '1px solid #f0aaaa', borderRadius: '6px', marginBottom: '1rem', color: '#c00', fontSize: '0.9rem' }}>
            ⚠️ {error}
          </div>
        )}

        {alreadySent && !activeDraft && !sentMessage && (
          <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            ✅ An outreach email has already been sent to this contact.
          </p>
        )}

        {!activeDraft && (
          <>
            <button
              onClick={generateEmail}
              disabled={generating || !partner.contactEmail}
              style={{
                padding: '0.6rem 1.4rem',
                background: generating ? '#aaa' : '#1a56db',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                cursor: generating || !partner.contactEmail ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {generating ? '⏳ Researching & Generating…' : alreadySent ? '🔁 Generate New Draft' : '✨ Generate Outreach Email'}
            </button>
            {!partner.contactEmail && (
              <p style={{ color: '#b85c00', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠️ No contact email on record — cannot send outreach.
              </p>
            )}
          </>
        )}

        {/* Draft Preview & Edit */}
        {activeDraft && (
          <div style={{ marginTop: '1.25rem', border: '1px solid #b8ccf0', borderRadius: '8px', background: '#f5f8ff', padding: '1.25rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#1a3c7a', fontSize: '0.95rem' }}>
              📝 Review &amp; Edit Draft
              <span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#555', marginLeft: '0.5rem' }}>
                — you must approve before anything is sent
              </span>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem', color: '#444' }}>Subject</label>
            <input
              value={editedSubject}
              onChange={e => setEditedSubject(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.92rem', marginBottom: '0.875rem', boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem', color: '#444' }}>Email Body</label>
            <textarea
              value={editedBody}
              onChange={e => setEditedBody(e.target.value)}
              rows={15}
              style={{ width: '100%', padding: '0.6rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.88rem', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="deck" checked={includeDeck} onChange={e => setIncludeDeck(e.target.checked)} />
              <label htmlFor="deck" style={{ fontSize: '0.88rem', cursor: 'pointer', color: '#444' }}>
                📎 Attach COARE Holdings deck (PDF)
              </label>
            </div>

            {emailStatus !== 'VALID' && (
              <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#fff8ec', border: '1px solid #f0d080', borderRadius: '4px', fontSize: '0.83rem', color: '#7a4a00' }}>
                ⚠️ Click "Check" above to validate the email address before sending.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={sendEmail}
                disabled={!canSend}
                style={{
                  padding: '0.6rem 1.4rem',
                  background: canSend ? '#1a6b1a' : '#aaa',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                {sending ? '📤 Sending…' : '✅ Approve & Send'}
              </button>
              <button
                onClick={discardDraft}
                disabled={sending}
                style={{ padding: '0.6rem 1.2rem', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.92rem', cursor: 'pointer', color: '#555' }}
              >
                🗑️ Discard
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message History */}
      <h2 style={{ marginTop: '2rem', fontSize: '1.05rem' }}>Message History</h2>
      {partner.messages.length === 0 ? (
        <p style={{ color: '#999', fontSize: '0.88rem' }}>No messages yet.</p>
      ) : (
        partner.messages.map(m => (
          <div key={m.id} style={{ marginBottom: '0.4rem', padding: '0.55rem 0.75rem', background: m.direction === 'OUTBOUND' ? '#f0f7ff' : '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: m.direction === 'OUTBOUND' ? '#1a56db' : '#666' }}>[{m.direction}]</span>{' '}
            <span style={{ fontSize: '0.88rem' }}>{m.body.slice(0, 150)}{m.body.length > 150 ? '…' : ''}</span>
            <span style={{ float: 'right', color: '#bbb', fontSize: '0.75rem' }}>{new Date(m.createdAt).toLocaleString()}</span>
          </div>
        ))
      )}

      {/* All Drafts */}
      <h2 style={{ marginTop: '2rem', fontSize: '1.05rem' }}>Draft History</h2>
      {partner.drafts.length === 0 ? (
        <p style={{ color: '#999', fontSize: '0.88rem' }}>No drafts.</p>
      ) : (
        partner.drafts.map(d => (
          <div key={d.id} style={{ marginBottom: '0.4rem', padding: '0.55rem 0.75rem', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: '4px', fontSize: '0.88rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.78rem', background: '#eee', padding: '1px 6px', borderRadius: '3px' }}>{d.category}</span>
            {d.subject && <span style={{ marginLeft: '0.5rem', color: '#333' }}>{d.subject}</span>}
            <span style={{ marginLeft: '0.75rem', color: d.status === 'SENT' ? '#1a6b1a' : d.status === 'PENDING' ? '#b85c00' : '#999', fontSize: '0.8rem' }}>
              {d.status}{d.sentAt ? ` · ${new Date(d.sentAt).toLocaleDateString()}` : ''}
            </span>
          </div>
        ))
      )}

      {/* ── NEWS SECTION ── */}
      <div style={{ marginTop: '2.5rem', borderTop: '2px solid #e8e8e8', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>📰 Latest News</h2>
          <button
            onClick={loadNews}
            disabled={newsLoading}
            style={{
              padding: '0.35rem 0.9rem',
              border: '1px solid #ddd',
              borderRadius: '5px',
              background: '#fff',
              fontSize: '0.82rem',
              cursor: newsLoading ? 'not-allowed' : 'pointer',
              color: '#444',
            }}
          >
            {newsLoading ? '⏳ Loading…' : newsLoaded ? '↻ Refresh' : '🔍 Load News'}
          </button>
        </div>

        {!newsLoaded && !newsLoading && (
          <p style={{ color: '#aaa', fontSize: '0.85rem' }}>
            Click "Load News" to pull recent articles about {partner.name} — useful for pre-call research.
          </p>
        )}

        {newsError && (
          <p style={{ color: '#c00', fontSize: '0.85rem' }}>⚠️ {newsError}</p>
        )}

        {newsLoaded && newsItems.length === 0 && !newsLoading && (
          <p style={{ color: '#888', fontSize: '0.85rem' }}>No recent news found for {partner.name}.</p>
        )}

        {newsItems.length > 0 && (
          <div style={{ border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
            {newsItems.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '0.85rem 1rem',
                  borderBottom: i < newsItems.length - 1 ? '1px solid #f0f0f0' : 'none',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9f9fc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a1a2e', lineHeight: '1.4', marginBottom: '0.2rem' }}>
                  {item.title}
                </div>
                {item.snippet && (
                  <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: '1.45', marginBottom: '0.3rem' }}>
                    {item.snippet}
                  </div>
                )}
                <div style={{ fontSize: '0.72rem', color: '#aaa', display: 'flex', gap: '0.6rem' }}>
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{timeAgo(item.pubDate)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
