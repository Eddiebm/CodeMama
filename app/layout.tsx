export const metadata = {
  title: 'GPCE Command Center',
  description: 'Global Partner Continuity Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'monospace', background: '#f9f9f9' }}>
        {children}
      </body>
    </html>
  );
}
