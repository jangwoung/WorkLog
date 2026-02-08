'use client';

import { useEffect } from 'react';
import { useAssetCards } from '@/app/hooks/useAssetCards';
import { AssetCardDetail } from '@/app/components/features/AssetCard/AssetCardDetail';
import Link from 'next/link';
import { useLanguage } from '@/app/context/LanguageContext';

export default function LibraryPage() {
  const { t } = useLanguage();
  const { libraryCards, loading, error, fetchLibrary } = useAssetCards();

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('library.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {t('library.description')}
      </p>

      {error && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {loading && !libraryCards.length ? (
        <p style={{ color: '#64748b' }}>{t('library.loading')}</p>
      ) : !libraryCards.length ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          {t('library.empty')}
        </p>
      ) : (
        <>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            <Link href="/export" style={{ color: '#0f172a', textDecoration: 'underline' }}>
              {t('library.exportLink')}
            </Link>
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {libraryCards.map((card) => (
              <li key={card.assetCardId}>
                <AssetCardDetail card={card} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
