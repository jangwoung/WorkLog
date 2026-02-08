'use client';

import { useEffect, useState } from 'react';
import { useRepositories } from '@/app/hooks/useRepositories';
import { RepositoryList } from '@/app/components/features/Repository/RepositoryList';
import { Button } from '@/app/components/common/Button';
import { Input } from '@/app/components/common/Input';
import { Modal } from '@/app/components/common/Modal';
import { useLanguage } from '@/app/context/LanguageContext';

export default function RepositoriesPage() {
  const { t } = useLanguage();
  const {
    repositories,
    loading,
    error,
    fetchRepositories,
    connectRepository,
    disconnectRepository,
  } = useRepositories();
  const [modalOpen, setModalOpen] = useState(false);
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleConnect = async () => {
    const o = owner.trim();
    const n = name.trim();
    if (!o || !n) return;
    setConnecting(true);
    try {
      await connectRepository(o, n);
      setModalOpen(false);
      setOwner('');
      setName('');
    } catch {
      // error set by hook
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (repositoryId: string) => {
    setDisconnectingId(repositoryId);
    try {
      await disconnectRepository(repositoryId);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>{t('repositories.title')}</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        {t('repositories.description')}
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

      <div style={{ marginBottom: '1.5rem' }}>
        <Button onClick={() => setModalOpen(true)}>{t('repositories.connect')}</Button>
      </div>

      {loading && !repositories.length ? (
        <p style={{ color: '#64748b' }}>{t('inbox.loading')}</p>
      ) : (
        <RepositoryList
          repositories={repositories}
          onDisconnect={handleDisconnect}
          disconnectingId={disconnectingId}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !connecting && setModalOpen(false)}
        title={t('repositories.connectModal')}
      >
        <Input
          label={t('repositories.ownerLabel')}
          placeholder={t('repositories.ownerPlaceholder')}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <Input
          label={t('repositories.nameLabel')}
          placeholder={t('repositories.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={connecting}>
            {t('repositories.cancel')}
          </Button>
          <Button onClick={handleConnect} disabled={connecting || !owner.trim() || !name.trim()}>
            {connecting ? t('repositories.connecting') : t('repositories.connectSubmit')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
