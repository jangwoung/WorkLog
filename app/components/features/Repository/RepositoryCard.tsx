'use client';

import type { RepositoryItem } from '@/app/hooks/useRepositories';
import { Button } from '@/app/components/common/Button';
import { useLanguage } from '@/app/context/LanguageContext';

interface RepositoryCardProps {
  repo: RepositoryItem;
  onDisconnect: (repositoryId: string) => void;
  disconnecting?: boolean;
}

export function RepositoryCard({ repo, onDisconnect, disconnecting }: RepositoryCardProps) {
  const { t } = useLanguage();
  const canDisconnect = repo.connectionStatus === 'connected';

  return (
    <div
      style={{
        padding: '1rem',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{repo.fullName}</div>
        <div
          style={{
            fontSize: '0.75rem',
            color: repo.connectionStatus === 'connected' ? '#16a34a' : '#64748b',
            marginTop: '0.25rem',
          }}
        >
          {repo.connectionStatus === 'connected' ? t('repositories.connected') : repo.connectionStatus}
        </div>
      </div>
      {canDisconnect && (
        <Button
          variant="secondary"
          onClick={() => onDisconnect(repo.repositoryId)}
          disabled={disconnecting}
        >
          {disconnecting ? t('repositories.disconnecting') : t('repositories.disconnect')}
        </Button>
      )}
    </div>
  );
}
