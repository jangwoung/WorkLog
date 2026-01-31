'use client';

import { useEffect } from 'react';
import { useAssetCards } from '@/app/hooks/useAssetCards';
import { AssetCardDetail } from '@/app/components/features/AssetCard/AssetCardDetail';
import Link from 'next/link';

export default function LibraryPage() {
  const { libraryCards, loading, error, fetchLibrary } = useAssetCards();

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Library</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Approved and edited AssetCards. Use the Export page to copy or download them as README or resume format.
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
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : !libraryCards.length ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          No assets in your library yet. Approve or edit items from the Inbox to add them here.
        </p>
      ) : (
        <>
          <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
            <Link href="/export" style={{ color: '#0f172a', textDecoration: 'underline' }}>
              Export selected to README or resume →
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
