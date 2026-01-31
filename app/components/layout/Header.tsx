'use client';

import Link from 'next/link';
import { useAuth } from '@/app/hooks/useAuth';

const nav = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/library', label: 'Library' },
  { href: '/repositories', label: 'Repositories' },
  { href: '/export', label: 'Export' },
];

export function Header() {
  const { signOut } = useAuth();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid #e2e8f0',
        background: '#fff',
      }}
    >
      <Link href="/inbox" style={{ fontWeight: 600, fontSize: '1.125rem', color: '#0f172a' }}>
        WorkLog
      </Link>
      <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {nav.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{ color: '#475569', fontSize: '0.875rem' }}
          >
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => signOut()}
          style={{
            padding: '0.375rem 0.75rem',
            fontSize: '0.875rem',
            color: '#64748b',
            background: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
