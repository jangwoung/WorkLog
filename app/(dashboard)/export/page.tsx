'use client';

import { useEffect, useState } from 'react';
import { useAssetCards } from '@/app/hooks/useAssetCards';
import { useExport } from '@/app/hooks/useExport';
import { Button } from '@/app/components/common/Button';
import { ExportDialog } from '@/app/components/features/Export/ExportDialog';
import { useLanguage } from '@/app/context/LanguageContext';

export default function ExportPage() {
  const { t } = useLanguage();
  const { libraryCards, fetchLibrary } = useAssetCards();
  const { loading: exportLoading, error: exportError, lastResult, exportAssets } = useExport();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleExport = async (assetCardIds: string[], format: 'readme' | 'resume') => {
    const result = await exportAssets(assetCardIds, format);
    return result ? { content: result.content } : null;
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('export.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {t('export.description')}
      </p>

      {exportError && (
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
          {exportError}
        </div>
      )}

      <Button onClick={() => setDialogOpen(true)}>
        {t('export.openDialog')}
      </Button>

      <ExportDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        libraryCards={libraryCards}
        onExport={handleExport}
        lastResult={lastResult ?? undefined}
      />
    </div>
  );
}
