'use client';

import { useState, useEffect } from 'react';
import type { AssetCardItem } from '@/app/hooks/useAssetCards';
import { Button } from '@/app/components/common/Button';

interface AssetCardEditorProps {
  card: AssetCardItem;
  onSave: (assetCardId: string, patch: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function AssetCardEditor({ card, onSave, onCancel }: AssetCardEditorProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [impact, setImpact] = useState(card.impact || '');
  const [technologies, setTechnologies] = useState((card.technologies || []).join(', '));
  const [contributions, setContributions] = useState((card.contributions || []).join('\n'));
  const [metrics, setMetrics] = useState(card.metrics || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
    setImpact(card.impact || '');
    setTechnologies((card.technologies || []).join(', '));
    setContributions((card.contributions || []).join('\n'));
    setMetrics(card.metrics || '');
  }, [card]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(card.assetCardId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        impact: impact.trim() || undefined,
        technologies: technologies
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        contributions: contributions
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean),
        metrics: metrics.trim() || undefined,
      });
      onCancel();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        background: '#fff',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
          maxLength={100}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
          maxLength={500}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>Impact</label>
        <input
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
          maxLength={300}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
          Technologies (comma-separated)
        </label>
        <input
          value={technologies}
          onChange={(e) => setTechnologies(e.target.value)}
          placeholder="e.g. React, TypeScript"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>
          Contributions (one per line)
        </label>
        <textarea
          value={contributions}
          onChange={(e) => setContributions(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
        />
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>Metrics</label>
        <input
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}
          maxLength={200}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
