'use client';

import type { AssetCardItem as AssetCardItemType } from '@/app/hooks/useAssetCards';

interface AssetCardItemProps {
  card: AssetCardItemType;
  onApprove?: (id: string) => void;
  onEdit?: (id: string) => void;
  onReject?: (id: string) => void;
  loading?: boolean;
}

export function AssetCardItem({ card, onApprove, onEdit, onReject, loading }: AssetCardItemProps) {
  const isFlagged = card.status === 'flagged';

  return (
    <div
      style={{
        padding: '1rem',
        border: `1px solid ${isFlagged ? '#fde047' : '#e2e8f0'}`,
        borderRadius: '8px',
        background: isFlagged ? '#fffbeb' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{card.title}</span>
            {isFlagged && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  padding: '0.125rem 0.375rem',
                  background: '#fde047',
                  borderRadius: '4px',
                  fontWeight: 500,
                }}
              >
                Flagged
              </span>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              color: '#64748b',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {card.description}
          </p>
          {isFlagged && card.validationErrors && card.validationErrors.length > 0 && (
            <ul
              style={{
                margin: '0.5rem 0 0',
                paddingLeft: '1.25rem',
                fontSize: '0.75rem',
                color: '#b45309',
              }}
            >
              {card.validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {onApprove && (
            <button
              type="button"
              onClick={() => onApprove(card.assetCardId)}
              disabled={loading}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Approve
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(card.assetCardId)}
              disabled={loading}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Edit
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={() => onReject(card.assetCardId)}
              disabled={loading}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                background: 'transparent',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
