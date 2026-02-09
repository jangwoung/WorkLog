'use client';

import { useState } from 'react';
import { useLanguage } from '@/app/context/LanguageContext';

export default function AuditPage() {
  const { t } = useLanguage();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [scope, setScope] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [successMetric, setSuccessMetric] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!from.trim() || !to.trim()) {
      setError('From and To are required (e.g. 2026-01-01T00:00:00.000Z)');
      return;
    }
    setLoading(true);
    setError(null);
    setMarkdown('');
    setSuccessMetric(null);
    try {
      const params = new URLSearchParams({ from: from.trim(), to: to.trim() });
      if (scope.trim()) params.set('scope', scope.trim());
      const res = await fetch(`/api/audit/report?${params}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || res.statusText);
      }
      const data = await res.json();
      setMarkdown(data.markdown ?? '');
      setSuccessMetric(data.successMetric ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('audit.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {t('audit.description')}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.875rem' }}>
          {t('audit.from')}
          <input
            type="text"
            placeholder="2026-01-01T00:00:00.000Z"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '220px' }}
          />
        </label>
        <label style={{ fontSize: '0.875rem' }}>
          {t('audit.to')}
          <input
            type="text"
            placeholder="2026-02-08T23:59:59.999Z"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '220px' }}
          />
        </label>
        <label style={{ fontSize: '0.875rem' }}>
          {t('audit.scope')}
          <input
            type="text"
            placeholder="owner/repo"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '160px' }}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleGenerate}
        style={{
          padding: '0.5rem 1rem',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
        }}
      >
        {loading ? t('audit.generating') : t('audit.generate')}
      </button>
      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}
      {successMetric !== null && (
        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          Report success metric: <strong>{successMetric}</strong> (1 = no missing links)
        </p>
      )}
      {markdown && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{t('audit.report')}</h2>
          <pre
            style={{
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              overflow: 'auto',
              fontSize: '0.8125rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
