'use client';

import { signIn } from 'next-auth/react';
import { useLanguage } from '@/app/context/LanguageContext';

export function SignIn() {
  const { t } = useLanguage();
  const handleSignIn = () => {
    signIn('github', { callbackUrl: '/inbox' });
  };

  return (
    <button
      onClick={handleSignIn}
      style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        backgroundColor: '#24292e',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '500',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = '#1a1e22';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = '#24292e';
      }}
    >
      {t('auth.signIn')}
    </button>
  );
}
