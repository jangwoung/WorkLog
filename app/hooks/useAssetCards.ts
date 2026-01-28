'use client';

import { useCallback, useState } from 'react';

export interface AssetCardItem {
  assetCardId: string;
  userId?: string;
  prEventId: string;
  repositoryId: string;
  status: string;
  title: string;
  description: string;
  impact: string;
  technologies: string[];
  contributions: string[];
  metrics?: string | null;
  validationErrors?: string[];
  generatedAt: string;
  approvedAt?: string | null;
  editedAt?: string | null;
  exportedAt?: string | null;
  editHistory?: unknown;
  [key: string]: unknown;
}

export interface InboxResult {
  assetCards: AssetCardItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LibraryResult {
  assetCards: AssetCardItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useAssetCards() {
  const [inboxCards, setInboxCards] = useState<AssetCardItem[]>([]);
  const [libraryCards, setLibraryCards] = useState<AssetCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInbox = useCallback(async (limit = 20, cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      const res = await fetch(`/api/assets/inbox?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      const data: InboxResult = await res.json();
      setInboxCards(data.assetCards ?? []);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return { assetCards: [], nextCursor: null, hasMore: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLibrary = useCallback(async (limit = 20, cursor?: string, status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      if (status) params.set('status', status);
      const res = await fetch(`/api/assets/library?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      const data: LibraryResult = await res.json();
      setLibraryCards(data.assetCards ?? []);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return { assetCards: [], nextCursor: null, hasMore: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(async (assetCardId: string) => {
    setError(null);
    const res = await fetch(`/api/assets/${assetCardId}/approve`, { method: 'POST' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  const edit = useCallback(async (assetCardId: string, patch: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(`/api/assets/${assetCardId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  }, []);

  const reject = useCallback(async (assetCardId: string) => {
    setError(null);
    const res = await fetch(`/api/assets/${assetCardId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
  }, []);

  return {
    inboxCards,
    libraryCards,
    setInboxCards,
    setLibraryCards,
    loading,
    error,
    setError,
    fetchInbox,
    fetchLibrary,
    approve,
    edit,
    reject,
  };
}
