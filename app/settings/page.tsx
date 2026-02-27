'use client';

import { useEffect, useState } from 'react';

interface Config {
  company: string;
  sender: string;
  indication: string;
  stage: string;
  programType: string;
  emailScope: string;
  goalDescription: string;
  forbiddenTopics: string;
}

const FIELD_META: { key: keyof Config; label: string; hint: string; multiline?: boolean }[] = [
  { key: 'company',         label: 'Company Name',         hint: 'e.g. COARE Holdings' },
  { key: 'sender',          label: 'Sender Name',          hint: 'e.g. Eddie Bannerman-Menson' },
  { key: 'indication',      label: 'Indication / Disease', hint: 'e.g. High-Grade Serous Ovarian Cancer (HGSOC)' },
  { key: 'stage',           label: 'Development Stage',    hint: 'e.g. Preclinical, Phase 1, Phase 2' },
  { key: 'programType',     label: 'Program Type',         hint: 'e.g. Combination therapy, Small molecule, ADC' },
  { key: 'emailScope',      label: 'Email Scope / Pitch',  hint: 'One sentence that anchors what the email is about. This directly shapes the AI output.', multiline: true },
  { key: 'goalDescription', label: 'Partnership Goal',     hint: 'e.g. Identify potential licensing, co-development, or partnership discussions' },
  { key: 'forbiddenTopics', label: 'Off-limits Topics',   hint: 'Comma-separated topics the AI must never include in emails', multiline: true },
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
    <main style={{ padding: '2rem', maxWidth: '680px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <a href="/" style={{ fontSize: '0.88rem', color: '#555', textDecoration: 'none' }}>← Back</a>

      <h1 style={{ marginTop: '0.75rem', marginBottom: '0.25rem', fontSize: '1.4rem' }}>⚙️ Program Settings</h1>
      <p style={{ color: '#666', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
        These values control what the AI writes in every outreach email. Update them whenever your program name, indication, or pitch evolves.
      </p>

      {FIELD_META.map(({ key, label, hint, multiline }) => (
        <div key={key} style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.3rem', color: '#222' }}>
            {label}
          </label>
          {multiline ? (
            <textarea
              value={config[key]}
              onChange={e => update(key, e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px', fontSize: '0.9rem', lineHeight: '1.5', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          ) : (
            <input
              value={config[key]}
              onChange={e => update(key, e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '5px', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          )}
          <p style={{ fontSize: '0.78rem', color: '#888', margin: '0.2rem 0 0' }}>{hint}</p>
        </div>
      ))}

      {error && (
        <div style={{ padding: '0.6rem 0.875rem', background: '#fff0f0', border: '1px solid #f0aaaa', borderRadius: '5px', color: '#c00', fontSize: '0.88rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '0.6rem 1.5rem',
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
        {saved && <span style={{ color: '#1a6b1a', fontSize: '0.88rem' }}>✅ Saved — next generated email will use these settings</span>}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9f9f9', border: '1px solid #e8e8e8', borderRadius: '6px', fontSize: '0.83rem', color: '#555' }}>
        <strong>How this works:</strong> Every time you click "Generate Outreach Email" on a partner page, the AI reads these settings fresh. Change them here and the very next email will reflect the update — no server restart needed.
      </div>
    </main>
  );
}
