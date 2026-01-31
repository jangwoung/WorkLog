'use client';

import { useEffect, useState } from 'react';
import { useAssetCards } from '@/app/hooks/useAssetCards';
import type { AssetCardItem } from '@/app/hooks/useAssetCards';
import { AssetCardItem as AssetCardItemComponent } from '@/app/components/features/AssetCard/AssetCardItem';
import { AssetCardEditor } from '@/app/components/features/AssetCard/AssetCardEditor';
import { Modal } from '@/app/components/common/Modal';

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
    if (!confirm('Reject and remove this AssetCard?')) return;
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
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Inbox</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Review and approve or edit AssetCards from your PRs. Flagged items need fixes before approval.
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
        <p style={{ color: '#64748b' }}>Loading…</p>
      ) : !inboxCards.length ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No pending AssetCards. New ones will appear here after PRs are processed.</p>
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
        title="Edit AssetCard"
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
