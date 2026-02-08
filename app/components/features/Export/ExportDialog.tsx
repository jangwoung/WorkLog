'use client';

import { useState } from 'react';
import type { AssetCardItem } from '@/app/hooks/useAssetCards';
import { Button } from '@/app/components/common/Button';
import { Modal } from '@/app/components/common/Modal';
import { useLanguage } from '@/app/context/LanguageContext';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  libraryCards: AssetCardItem[];
  onExport: (assetCardIds: string[], format: 'readme' | 'resume') => Promise<{ content: string } | null>;
  lastResult?: { content: string; format: string } | null;
}

export function ExportDialog({
  isOpen,
  onClose,
  libraryCards,
  onExport,
  lastResult,
}: ExportDialogProps) {
  const { t } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'readme' | 'resume'>('readme');
  const [loading, setLoading] = useState(false);
  const [exportedContent, setExportedContent] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === libraryCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(libraryCards.map((c) => c.assetCardId)));
    }
  };

  const handleExport = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setLoading(true);
    setExportedContent(null);
    try {
      const result = await onExport(ids, format);
      if (result) setExportedContent(result.content);
    } finally {
      setLoading(false);
    }
  };

  const displayContent = exportedContent ?? lastResult?.content ?? null;

  const handleCopy = () => {
    if (!displayContent) return;
    void navigator.clipboard.writeText(displayContent);
  };

  const handleDownload = () => {
    if (!displayContent) return;
    const ext = format === 'readme' ? 'md' : 'txt';
    const blob = new Blob([displayContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('export.dialogTitle')}>
      {libraryCards.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          {t('export.empty')}
        </p>
      ) : (
        <>
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                fontSize: '0.8125rem',
                color: '#475569',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {selectedIds.size === libraryCards.length ? t('export.deselectAll') : t('export.selectAll')}
            </button>
          </div>
          <ul
            style={{
              listStyle: 'none',
              maxHeight: '12rem',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            {libraryCards.map((card) => (
              <li key={card.assetCardId} style={{ marginBottom: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(card.assetCardId)}
                    onChange={() => toggle(card.assetCardId)}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8125rem' }}>{t('export.format')}</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'readme' | 'resume')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            >
              <option value="readme">{t('export.formatReadme')}</option>
              <option value="resume">{t('export.formatResume')}</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: displayContent ? '1rem' : 0 }}>
            <Button
              onClick={handleExport}
              disabled={loading || selectedIds.size === 0}
            >
              {loading ? t('export.exporting') : t('export.export')}
            </Button>
          </div>
          {displayContent && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem' }}>{t('export.output')}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="secondary" onClick={handleCopy}>
                    {t('export.copy')}
                  </Button>
                  <Button variant="secondary" onClick={handleDownload}>
                    {t('export.download')}
                  </Button>
                </div>
              </div>
              <pre
                style={{
                  padding: '0.75rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  overflow: 'auto',
                  maxHeight: '14rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {displayContent}
              </pre>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
