'use client';

import type { RepositoryItem } from '@/app/hooks/useRepositories';
import { RepositoryCard } from './RepositoryCard';

interface RepositoryListProps {
  repositories: RepositoryItem[];
  onDisconnect: (repositoryId: string) => void;
  disconnectingId?: string | null;
}

export function RepositoryList({
  repositories,
  onDisconnect,
  disconnectingId,
}: RepositoryListProps) {
  if (repositories.length === 0) {
    return (
      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
        No repositories connected. Connect one below to start tracking PRs.
      </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {repositories.map((repo) => (
        <li key={repo.repositoryId}>
          <RepositoryCard
            repo={repo}
            onDisconnect={onDisconnect}
            disconnecting={disconnectingId === repo.repositoryId}
          />
        </li>
      ))}
    </ul>
  );
}
