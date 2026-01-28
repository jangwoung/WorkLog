'use client';

import { useCallback, useState } from 'react';

export interface ExportResult {
  format: 'readme' | 'resume';
  content: string;
  exportedAssetCardIds: string[];
  exportedAt: string;
}

export function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  const exportAssets = useCallback(async (
    assetCardIds: string[],
    format: 'readme' | 'resume'
  ): Promise<ExportResult | null> => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetCardIds, format }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      const data: ExportResult = await res.json();
      setLastResult(data);
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, lastResult, exportAssets };
}
