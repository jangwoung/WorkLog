'use client';

import { useLanguage } from '@/app/context/LanguageContext';

export default function PolicyPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('policy.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {t('policy.description')}
      </p>
      <div
        style={{
          padding: '1rem',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('policy.rulesOn')}</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
          MVP uses static risk rules (security/compliance keywords → Med/High). Toggles for rule ON/OFF will be added in a future release.
        </p>
      </div>
    </div>
  );
}
