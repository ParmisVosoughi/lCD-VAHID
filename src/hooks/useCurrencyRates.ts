import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CurrencyCode } from '@/lib/currencies';

export interface DailyCurrencyRate {
  id: string;
  currency: CurrencyCode;
  rate: number;
  rate_date: string; // yyyy-mm-dd
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['daily_currency_rates'] as const;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Single shared source of daily currency rates, used by:
 * مبدل مبلغ / محاسبه گر قیمت قدیم / Show Data price comparison.
 */
export function useCurrencyRates() {
  const qc = useQueryClient();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<DailyCurrencyRate[]> => {
      const { data, error } = await supabase
        .from('daily_currency_rates' as never)
        .select('*')
        .order('rate_date', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as DailyCurrencyRate[]).map(r => ({
        ...r,
        rate: Number(r.rate),
      }));
    },
    staleTime: 30_000,
  });

  /** Most recent saved rate per currency. */
  const latestByCurrency = useMemo(() => {
    const map: Partial<Record<CurrencyCode, DailyCurrencyRate>> = {};
    // rates are sorted date desc; first occurrence wins
    rates.forEach(r => {
      if (!map[r.currency]) map[r.currency] = r;
    });
    return map;
  }, [rates]);

  const getCurrentRate = useCallback(
    (currency: CurrencyCode | null | undefined): number | null => {
      if (!currency) return null;
      const r = latestByCurrency[currency];
      return r && r.rate > 0 ? r.rate : null;
    },
    [latestByCurrency],
  );

  /** Rate saved for a specific historical date (exact date, else closest earlier one). */
  const getRateForDate = useCallback(
    (currency: CurrencyCode | null | undefined, date: string): number | null => {
      if (!currency || !date) return null;
      const exact = rates.find(r => r.currency === currency && r.rate_date === date);
      if (exact) return exact.rate;
      const earlier = rates
        .filter(r => r.currency === currency && r.rate_date <= date)
        .sort((a, b) => (a.rate_date < b.rate_date ? 1 : -1))[0];
      return earlier ? earlier.rate : null;
    },
    [rates],
  );

  const datesForCurrency = useCallback(
    (currency: CurrencyCode) =>
      rates.filter(r => r.currency === currency).map(r => r.rate_date),
    [rates],
  );

  const saveMutation = useMutation({
    mutationFn: async ({
      currency,
      rate,
      date,
    }: {
      currency: CurrencyCode;
      rate: number;
      date: string;
    }) => {
      // Historical rows for other dates are never touched — only same-day is upserted.
      const { error } = await supabase
        .from('daily_currency_rates' as never)
        .upsert(
          { currency, rate, rate_date: date } as never,
          { onConflict: 'currency,rate_date' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const saveRate = useCallback(
    async (currency: CurrencyCode, rate: number, date: string) => {
      try {
        await saveMutation.mutateAsync({ currency, rate, date });
        return true;
      } catch {
        return false;
      }
    },
    [saveMutation],
  );

  /**
   * Pull the freshest market rates (same source as «نرخ بازار»), store them as
   * today's daily rates and refresh the local cache.
   */
  const refreshFromMarket = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke('fetch-market-rates', {
        body: { source: 'converter' },
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: QUERY_KEY });
      return true;
    } catch {
      return false;
    }
  }, [qc]);

  return {
    rates,
    isLoading,
    latestByCurrency,
    getCurrentRate,
    getRateForDate,
    datesForCurrency,
    saveRate,
    refreshFromMarket,
    isSaving: saveMutation.isPending,
  };
}
