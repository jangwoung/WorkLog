'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';

interface InboxItem {
  intentId: string;
  goal: string;
  riskLevel: 'Med' | 'High';
  createdAt: string;
}

export default function ApprovalsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [validToDays, setValidToDays] = useState(7);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/approvals/inbox');
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  const submitApproval = async (intentId: string, status: 'approved' | 'rejected' | 'sent_back') => {
    setSubmitting(true);
    setError(null);
    const validTo = new Date();
    validTo.setDate(validTo.getDate() + validToDays);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId,
          status,
          templateAnswers: {},
          validTo: validTo.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || res.statusText);
      }
      setItems((prev) => prev.filter((i) => i.intentId !== intentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('approvals.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
        {t('approvals.description')}
      </p>
      <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem' }}>
        {t('approvals.validToDays')}:{' '}
        <input
          type="number"
          min={1}
          max={365}
          value={validToDays}
          onChange={(e) => setValidToDays(parseInt(e.target.value, 10) || 7)}
          style={{ width: '4rem', padding: '0.25rem' }}
        />
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
        <p style={{ color: '#64748b' }}>{t('approvals.loading')}</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{t('approvals.empty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item) => (
            <li
              key={item.intentId}
              style={{
                padding: '1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: '#fff',
              }}
            >
              <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{item.goal}</p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                {item.riskLevel} · {new Date(item.createdAt).toLocaleString()}
              </p>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitApproval(item.intentId, 'approved')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  {t('approvals.approve')}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitApproval(item.intentId, 'rejected')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  {t('approvals.reject')}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitApproval(item.intentId, 'sent_back')}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#64748b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  {t('approvals.sendBack')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
