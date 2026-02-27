import { db } from '@/lib/db';

export default async function PartnerDetail({ params }: { params: { id: string } }) {
  const partner = await db.partner.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: 'asc' } }, drafts: true },
  });

  if (!partner) return <p style={{ padding: '2rem' }}>Partner not found.</p>;

  return (
    <main style={{ padding: '2rem' }}>
      <a href="/partners" style={{ fontSize: '0.9rem' }}>← Back to Partners</a>
      <h1 style={{ marginTop: '1rem' }}>{partner.name}</h1>
      <p>Region: <strong>{partner.region}</strong> | Status: <strong>{partner.status}</strong></p>
      {partner.humanRequired && <p style={{ color: 'red' }}>⚠️ HUMAN REQUIRED</p>}

      {(partner.contactName || partner.contactEmail) && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff', border: '1px solid #eee', display: 'inline-block' }}>
          <strong>Contact</strong><br />
          {partner.contactName && <span>{partner.contactName}</span>}
          {partner.contactTitle && <span style={{ color: '#666' }}> — {partner.contactTitle}</span>}
          {partner.contactEmail && (
            <><br /><a href={`mailto:${partner.contactEmail}`}>{partner.contactEmail}</a></>
          )}
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Messages</h2>
      {partner.messages.length === 0 && <p>No messages yet.</p>}
      {partner.messages.map(m => (
        <div key={m.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#fff', border: '1px solid #eee' }}>
          <strong>[{m.direction}]</strong> {m.body}
          <span style={{ color: '#999', marginLeft: '1rem', fontSize: '0.8rem' }}>
            {new Date(m.createdAt).toLocaleString()}
          </span>
        </div>
      ))}

      <h2 style={{ marginTop: '2rem' }}>Drafts</h2>
      {partner.drafts.length === 0 && <p>No drafts.</p>}
      {partner.drafts.map(d => (
        <div key={d.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#fff', border: '1px solid #eee' }}>
          <strong>[{d.category}]</strong> {d.body} — <em>{d.status}</em>
        </div>
      ))}
    </main>
  );
}
