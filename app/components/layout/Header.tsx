'use client';

import Link from 'next/link';
import { useAuth } from '@/app/hooks/useAuth';
import { useLanguage } from '@/app/context/LanguageContext';
const navKeys: { href: string; key: string }[] = [
  { href: '/inbox', key: 'nav.inbox' },
  { href: '/library', key: 'nav.library' },
  { href: '/repositories', key: 'nav.repositories' },
  { href: '/export', key: 'nav.export' },
  { href: '/policy', key: 'nav.policy' },
  { href: '/approvals', key: 'nav.approvals' },
  { href: '/exceptions', key: 'nav.exceptions' },
  { href: '/audit', key: 'nav.audit' },
];

export function Header() {
  const { signOut } = useAuth();
  const { locale, setLocale, t } = useLanguage();

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
        {t('app.title')}
      </Link>
      <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {navKeys.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            style={{ color: '#475569', fontSize: '0.875rem' }}
          >
            {t(key)}
          </Link>
        ))}
        <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          <button
            type="button"
            onClick={() => setLocale('en')}
            style={{
              padding: '0.25rem 0.5rem',
              background: locale === 'en' ? '#e2e8f0' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: locale === 'en' ? 600 : 400,
            }}
          >
            EN
          </button>
          <span aria-hidden>|</span>
          <button
            type="button"
            onClick={() => setLocale('ja')}
            style={{
              padding: '0.25rem 0.5rem',
              background: locale === 'ja' ? '#e2e8f0' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: locale === 'ja' ? 600 : 400,
            }}
          >
            日本語
          </button>
        </span>
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
          {t('nav.signOut')}
        </button>
      </nav>
    </header>
  );
}
