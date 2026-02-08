'use client';

import { useEffect, useState } from 'react';
import { useAssetCards } from '@/app/hooks/useAssetCards';
import type { AssetCardItem } from '@/app/hooks/useAssetCards';
import { AssetCardItem as AssetCardItemComponent } from '@/app/components/features/AssetCard/AssetCardItem';
import { AssetCardEditor } from '@/app/components/features/AssetCard/AssetCardEditor';
import { Modal } from '@/app/components/common/Modal';
import { useLanguage } from '@/app/context/LanguageContext';

export default function InboxPage() {
  const {
    inboxCards,
    setInboxCards,
    loading,
    error,
    setError,
    fetchInbox,
    approve,
    edit,
    reject,
  } = useAssetCards();
  const { t } = useLanguage();
  const [actionLoading, setActionLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<AssetCardItem | null>(null);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await approve(id);
      setInboxCards((prev) => prev.filter((c) => c.assetCardId !== id));
    } catch {
      // error set by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSave = async (assetCardId: string, patch: Record<string, unknown>) => {
    setActionLoading(true);
    setError(null);
    try {
      await edit(assetCardId, patch);
      setEditingCard(null);
      setInboxCards((prev) => prev.filter((c) => c.assetCardId !== assetCardId));
    } catch {
      // error set by hook
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm(t('inbox.rejectConfirm'))) return;
    setActionLoading(true);
    setError(null);
    try {
      await reject(id);
      setInboxCards((prev) => prev.filter((c) => c.assetCardId !== id));
    } catch {
      // error set by hook
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('inbox.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {t('inbox.description')}
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

      {loading && !inboxCards.length ? (
        <p style={{ color: '#64748b' }}>{t('inbox.loading')}</p>
      ) : !inboxCards.length ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{t('inbox.empty')}</p>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {inboxCards.map((card) => (
            <li key={card.assetCardId}>
              <AssetCardItemComponent
                card={card}
                onApprove={handleApprove}
                onEdit={(id) => setEditingCard(inboxCards.find((c) => c.assetCardId === id) ?? null)}
                onReject={handleReject}
                loading={actionLoading}
              />
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={!!editingCard}
        onClose={() => !actionLoading && setEditingCard(null)}
        title={t('inbox.editModal')}
      >
        {editingCard && (
          <AssetCardEditor
            card={editingCard}
            onSave={handleEditSave}
            onCancel={() => setEditingCard(null)}
          />
        )}
      </Modal>
    </div>
  );
}
