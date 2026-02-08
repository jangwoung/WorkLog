'use client';

import { useLanguage } from '@/app/context/LanguageContext';
import { SignIn } from '@/app/components/auth/SignIn';

export function LoginContent() {
  const { t } = useLanguage();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}
    >
      <h1 style={{ marginBottom: '2rem' }}>{t('app.title')}</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>{t('app.tagline')}</p>
      <SignIn />
    </div>
  );
}
