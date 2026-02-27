import { db } from '@/lib/db';

export default async function Partners() {
  const partners = await db.partner.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Partners</h1>
      <a href="/" style={{ fontSize: '0.9rem' }}>← Back</a>
      {partners.length === 0 && <p style={{ marginTop: '1rem' }}>No partners yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {partners.map(p => (
          <li key={p.id} style={{ marginBottom: '0.75rem', padding: '0.75rem', border: '1px solid #ddd', background: '#fff' }}>
            <a href={`/partners/${p.id}`}><strong>{p.name}</strong></a>
            {' — '}{p.region}{' — '}{p.status}
            {p.humanRequired && <span style={{ color: 'red', marginLeft: '0.5rem' }}>⚠️ HUMAN REQUIRED</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
