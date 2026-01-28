'use client';

import type { AssetCardItem } from '@/app/hooks/useAssetCards';

interface AssetCardDetailProps {
  card: AssetCardItem;
}

export function AssetCardDetail({ card }: AssetCardDetailProps) {
  return (
    <div
      style={{
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        background: '#fff',
      }}
    >
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>{card.title}</h2>
      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#475569' }}>
        {card.description}
      </p>
      {card.impact && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem' }}>
          <strong>Impact:</strong> {card.impact}
        </p>
      )}
      {card.technologies && card.technologies.length > 0 && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem' }}>
          <strong>Technologies:</strong> {card.technologies.join(', ')}
        </p>
      )}
      {card.contributions && card.contributions.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <strong style={{ fontSize: '0.8125rem' }}>Contributions:</strong>
          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8125rem' }}>
            {card.contributions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {card.metrics && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem' }}>
          <strong>Metrics:</strong> {card.metrics}
        </p>
      )}
    </div>
  );
}
