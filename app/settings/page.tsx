'use client';

import { useEffect, useState } from 'react';

interface Config {
  company: string;
  sender: string;
  senderTitle: string;
  indication: string;
  stage: string;
  programType: string;
  emailScope: string;
  goalDescription: string;
  forbiddenTopics: string;
  clinicalContext: string;
  marketContext: string;
  partnerHook: string;
  investorPitch: string;
  investorMarketHook: string;
  investorMilestones: string;
}

type SectionKey = 'identity' | 'program' | 'intelligence' | 'investor' | 'guardrails';

const SECTIONS: { key: SectionKey; title: string; subtitle: string; fields: { key: keyof Config; label: string; hint: string; multiline?: boolean; rows?: number }[] }[] = [
  {
    key: 'identity',
    title: '👤 Sender Identity',
    subtitle: 'Who is writing the email',
    fields: [
      { key: 'company',      label: 'Company Name',  hint: 'e.g. COARE Holdings' },
      { key: 'sender',       label: 'Your Name',     hint: 'e.g. Eddie Bannerman-Menson' },
      { key: 'senderTitle',  label: 'Your Title',    hint: 'e.g. Executive Vice President, Business Development' },
    ],
  },
  {
    key: 'program',
    title: '🔬 Program Details',
    subtitle: 'The asset you are licensing or partnering',
    fields: [
      { key: 'indication',      label: 'Indication / Disease',  hint: 'Be specific — e.g. High-Grade Serous Ovarian Cancer (HGSOC), not just "ovarian cancer"' },
      { key: 'stage',           label: 'Development Stage',     hint: 'e.g. Preclinical, Phase 1, Phase 2, IND-enabling' },
      { key: 'programType',     label: 'Program / Asset Type',  hint: 'e.g. Combination therapy, Small molecule, ADC, Bispecific' },
      { key: 'goalDescription', label: 'BD Objective',          hint: 'e.g. Identify potential licensing, co-development, or regional partnership discussions' },
      { key: 'emailScope',      label: 'Email Opening Anchor',  hint: 'One sentence: the core pitch the AI must stay consistent with in every email', multiline: true, rows: 2 },
    ],
  },
  {
    key: 'intelligence',
    title: '📊 Clinical & Market Intelligence',
    subtitle: 'Facts the AI weaves in to make emails commercially compelling',
    fields: [
      { key: 'clinicalContext', label: 'Clinical Context', hint: 'Disease burden, unmet need, relapse rates, survival data. The AI picks 1–2 facts per email — not all of them.', multiline: true, rows: 4 },
      { key: 'marketContext',   label: 'Market Context',   hint: 'Patient numbers, market size, regional data, competitive landscape. Used to frame commercial opportunity.', multiline: true, rows: 4 },
      { key: 'partnerHook',     label: 'Partner Relevance Guidance', hint: 'How should the AI connect COARE\'s program to partners with different therapeutic focuses?', multiline: true, rows: 3 },
    ],
  },
  {
    key: 'investor',
    title: '💼 Investor Pitch',
    subtitle: 'Used when emailing VCs and investment firms — different tone, different hooks',
    fields: [
      { key: 'investorPitch',       label: 'Investment Thesis',     hint: 'Why is this a compelling investment? Capital efficiency, differentiated mechanism, validated biology.', multiline: true, rows: 4 },
      { key: 'investorMarketHook',  label: 'Market & Exit Context', hint: 'M&A backdrop, patent cliffs, strategic acquirer appetite, market growth. 1–2 points per email.', multiline: true, rows: 3 },
      { key: 'investorMilestones',  label: 'Value Inflection Points', hint: 'Near-term catalysts that de-risk the asset and create value: IND, POC readout, first-in-human, etc.', multiline: true, rows: 3 },
    ],
  },
  {
    key: 'guardrails',
    title: '🚧 Guardrails',
    subtitle: 'Topics the AI must never include — GPCE compliance',
    fields: [
      { key: 'forbiddenTopics', label: 'Off-limits Topics', hint: 'Comma-separated. These are hard stops — the AI will never include them regardless of partner profile.', multiline: true, rows: 3 },
    ],
  },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(setConfig);
  }, []);

  function update(key: keyof Config, value: string) {
    setConfig(prev => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <p style={{ padding: '2rem' }}>Loading…</p>;

  return (
    <main style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <a href="/" style={{ fontSize: '0.88rem', color: '#555', textDecoration: 'none' }}>← Back</a>

      <h1 style={{ marginTop: '0.75rem', marginBottom: '0.2rem', fontSize: '1.4rem' }}>⚙️ Program Settings</h1>
      <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '2rem', lineHeight: '1.5' }}>
        Everything the AI reads before writing an outreach email. Update the indication, add new clinical data, or sharpen the pitch — the next email you generate reflects it immediately.
      </p>

      {SECTIONS.map(section => (
        <div key={section.key} style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '2px solid #e8e8e8', paddingBottom: '0.4rem', marginBottom: '1.1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>{section.title}</h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#777' }}>{section.subtitle}</p>
          </div>

          {section.fields.map(({ key, label, hint, multiline, rows }) => (
            <div key={key} style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.28rem', color: '#222' }}>
                {label}
              </label>
              {multiline ? (
                <textarea
                  value={config[key]}
                  onChange={e => update(key, e.target.value)}
                  rows={rows || 3}
                  style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #ccc', borderRadius: '5px', fontSize: '0.88rem', lineHeight: '1.55', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
              ) : (
                <input
                  value={config[key]}
                  onChange={e => update(key, e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.6rem', border: '1px solid #ccc', borderRadius: '5px', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              )}
              <p style={{ fontSize: '0.76rem', color: '#888', margin: '0.2rem 0 0', lineHeight: '1.4' }}>{hint}</p>
            </div>
          ))}
        </div>
      ))}

      {error && (
        <div style={{ padding: '0.6rem 0.875rem', background: '#fff0f0', border: '1px solid #f0aaaa', borderRadius: '5px', color: '#c00', fontSize: '0.88rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '0.65rem 1.75rem',
            background: saving ? '#aaa' : '#1a56db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : '💾 Save Changes'}
        </button>
        {saved && (
          <span style={{ color: '#1a6b1a', fontSize: '0.88rem' }}>
            ✅ Saved — next generated email will use these settings
          </span>
        )}
      </div>
    </main>
  );
}
