import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MarketRate {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  rate_in_rial: number;
  unit_label: string;
  source_name: string;
  fetched_at: string;
  previous_rate_in_rial: number | null;
  change_amount: number | null;
  change_percent: number | null;
  updated_at: string;
}

export interface MarketHistoryPoint {
  id: string;
  asset_code: string;
  rate_in_rial: number;
  unit_label: string;
  source_name: string;
  fetched_at: string;
}

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const MIN_MANUAL_MS = 15 * 1000; // throttle manual refresh
const STALE_MS = 10 * 60 * 1000; // 10 min => stale

export function useMarketRates() {
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshError, setLastRefreshError] = useState<string | null>(null);
  const lastManualRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const ratesQ = useQuery({
    queryKey: ['market_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_rates' as any)
        .select('*')
        .order('asset_code');
      if (error) throw error;
      return (data ?? []) as unknown as MarketRate[];
    },
    refetchInterval: 30_000,
  });

  const refresh = useCallback(async (manual = false) => {
    if (inFlightRef.current) return inFlightRef.current;
    if (manual) {
      const now = Date.now();
      if (now - lastManualRef.current < MIN_MANUAL_MS) return;
      lastManualRef.current = now;
    }
    setIsRefreshing(true);
    const p = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-market-rates', { body: {} });
        if (error) throw error;
        if (data && (data as any).ok === false) throw new Error((data as any).error || 'Fetch failed');
        setLastRefreshError(null);
        await qc.invalidateQueries({ queryKey: ['market_rates'] });
        await qc.invalidateQueries({ queryKey: ['market_history'] });
      } catch (e: any) {
        setLastRefreshError(e?.message || 'خطا در دریافت نرخ');
      } finally {
        setIsRefreshing(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = p;
    return p;
  }, [qc]);

  // Auto-refresh cycle
  useEffect(() => {
    // trigger first fetch shortly after mount (server-side) if data missing or stale
    const first = setTimeout(() => { void refresh(false); }, 500);
    const t = setInterval(() => { void refresh(false); }, REFRESH_MS);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [refresh]);

  const latestFetchedAt = (ratesQ.data ?? []).reduce<string | null>((acc, r) => {
    if (!acc) return r.fetched_at;
    return new Date(r.fetched_at) > new Date(acc) ? r.fetched_at : acc;
  }, null);

  const isStale =
    latestFetchedAt !== null && Date.now() - new Date(latestFetchedAt).getTime() > STALE_MS;

  return {
    rates: ratesQ.data ?? [],
    isLoading: ratesQ.isLoading,
    error: ratesQ.error as Error | null,
    isRefreshing,
    lastRefreshError,
    latestFetchedAt,
    isStale,
    refresh: () => refresh(true),
  };
}

export function useMarketHistory(assetCode: string | null, rangeMs: number | null) {
  return useQuery({
    queryKey: ['market_history', assetCode, rangeMs],
    enabled: !!assetCode,
    queryFn: async () => {
      let q = supabase
        .from('market_rate_history' as any)
        .select('*')
        .eq('asset_code', assetCode!)
        .order('fetched_at', { ascending: true });
      if (rangeMs) {
        const since = new Date(Date.now() - rangeMs).toISOString();
        q = q.gte('fetched_at', since);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MarketHistoryPoint[];
    },
    refetchInterval: 60_000,
  });
}
