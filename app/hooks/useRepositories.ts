'use client';

import { useCallback, useState } from 'react';

export interface RepositoryItem {
  repositoryId: string;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  connectionStatus: string;
  connectedAt: string;
  lastSyncTimestamp: string | null;
}

export function useRepositories() {
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepositories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/repositories');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRepositories(data.repositories ?? []);
      return data.repositories ?? [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const connectRepository = useCallback(async (owner: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      const repo = await res.json();
      await fetchRepositories();
      return repo;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [fetchRepositories]);

  const disconnectRepository = useCallback(async (repositoryId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      await fetchRepositories();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [fetchRepositories]);

  return {
    repositories,
    loading,
    error,
    fetchRepositories,
    connectRepository,
    disconnectRepository,
  };
}
