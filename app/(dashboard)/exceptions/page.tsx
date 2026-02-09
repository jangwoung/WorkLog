'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';

interface ExceptionItem {
  type: string;
  eventId: string;
  intentId?: string;
  runId?: string;
  actorId: string;
  resolution?: string;
  createdAt: string;
}

interface ExpiredApprovalItem {
  approvalId: string;
  intentId: string;
  validTo: string;
  approverId: string;
}

export default function ExceptionsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [expiredApprovals, setExpiredApprovals] = useState<ExpiredApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    fetch(`/api/exceptions/inbox?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          setExpiredApprovals(data.expiredApprovals ?? []);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [typeFilter]);

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('exceptions.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
        {t('exceptions.description')}
      </p>
      <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem' }}>
        Type:{' '}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '0.25rem 0.5rem' }}
        >
          <option value="">All</option>
          <option value="unapproved_attempt">Unapproved attempt</option>
          <option value="break_glass">Break-glass</option>
          <option value="approval_expired">Approval expired</option>
        </select>
      </label>
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
      {loading ? (
        <p style={{ color: '#64748b' }}>{t('exceptions.loading')}</p>
      ) : (
        <>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Exception events</h2>
          {items.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{t('exceptions.empty')}</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {items.map((item) => (
                <li
                  key={item.eventId}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                >
                  <strong>{item.type}</strong> · {item.actorId}
                  {item.intentId && ` · intent ${item.intentId}`}
                  {item.runId && ` · run ${item.runId}`}
                  <br />
                  <span style={{ color: '#64748b' }}>{new Date(item.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{t('exceptions.expiredApprovals')}</h2>
          {expiredApprovals.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>None</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {expiredApprovals.map((a) => (
                <li
                  key={a.approvalId}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    background: '#fef2f2',
                  }}
                >
                  Approval {a.approvalId} · Intent {a.intentId} · validTo {new Date(a.validTo).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
