'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_LINKS = [
  { href: '/partners',  label: 'Partners'      },
  { href: '/apollo',    label: 'Source'         },
  { href: '/deals',     label: 'Deals'          },
  { href: '/pipeline',  label: 'Pipeline'       },
  { href: '/news',      label: 'Intelligence'   },
  { href: '/drafts',    label: 'Drafts'         },
  { href: '/settings',  label: 'Settings'       },
];

export default function Nav() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div style={{
      background: '#000',
      color: '#fff',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '52px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid #222',
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🧬</span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', letterSpacing: '0.04em' }}>GPCE</span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                color: active ? '#fff' : '#888',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: active ? 600 : 400,
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                background: active ? '#333' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          background: 'transparent',
          border: '1px solid #333',
          color: '#888',
          fontSize: '0.78rem',
          padding: '0.25rem 0.7rem',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
