export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>GPCE Command Center</h1>
      <nav style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem' }}>
        <a href="/partners">Partners</a>
        <a href="/drafts">Pending Drafts</a>
      </nav>
    </main>
  );
}
