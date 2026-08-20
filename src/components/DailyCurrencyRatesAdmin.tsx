import React, { useMemo, useState } from 'react';
import { Coins, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/NumericInput';
import { parseFormattedNumber } from '@/lib/numberFormat';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CURRENCIES, CurrencyCode } from '@/lib/currencies';
import { useCurrencyRates, todayISO } from '@/hooks/useCurrencyRates';


const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('en-US') : '');

/** نرخ ارز روزانه — the single shared source of currency rates. */
export function DailyCurrencyRatesAdmin() {
  const { rates, latestByCurrency, saveRate, isSaving } = useCurrencyRates();
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [drafts, setDrafts] = useState<Partial<Record<CurrencyCode, string>>>({});

  const rowsForDate = useMemo(() => {
    const map: Partial<Record<CurrencyCode, number>> = {};
    rates.filter(r => r.rate_date === date).forEach(r => { map[r.currency] = r.rate; });
    return map;
  }, [rates, date]);

  const history = useMemo(
    () => [...rates].sort((a, b) => (a.rate_date < b.rate_date ? 1 : -1)).slice(0, 12),
    [rates],
  );

  const handleSave = async (currency: CurrencyCode) => {
    const raw = drafts[currency] ?? '';
    const value = parseFormattedNumber(raw);

    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: 'نرخ معتبر وارد کنید.', variant: 'destructive' });
      return;
    }
    const ok = await saveRate(currency, value, date);
    toast({
      title: ok ? 'نرخ ارز ذخیره شد.' : 'ذخیره نرخ ارز ناموفق بود.',
      variant: ok ? undefined : 'destructive',
    });
    if (ok) setDrafts(d => ({ ...d, [currency]: '' }));
  };

  return (
    <div dir="rtl" className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">نرخ ارز روزانه</h3>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground whitespace-nowrap">تاریخ</label>
        <Input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="h-8 w-40 text-sm"
        />
      </div>

      <div className="space-y-2">
        {CURRENCIES.map(c => (
          <div key={c.code} className="flex items-center gap-2">
            <span className="text-sm w-16 shrink-0">{c.label}</span>
            <NumericInput
              placeholder={
                rowsForDate[c.code] !== undefined
                  ? `${fmt(rowsForDate[c.code]!)} ریال`
                  : 'نرخ به ریال'
              }
              value={drafts[c.code] ?? ''}
              onChange={raw => setDrafts(d => ({ ...d, [c.code]: raw }))}
              className="h-8 text-sm flex-1 min-w-0"
            />

            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={isSaving}
              onClick={() => handleSave(c.code)}
            >
              <Save className="h-3.5 w-3.5 ml-1" /> ذخیره
            </Button>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="font-medium">آخرین نرخ‌های ثبت‌شده</div>
        {CURRENCIES.map(c => {
          const r = latestByCurrency[c.code];
          return (
            <div key={c.code} className="flex justify-between">
              <span>{c.label}</span>
              <span>{r ? `${fmt(r.rate)} ریال — ${r.rate_date}` : 'ثبت نشده'}</span>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">تاریخچه نرخ‌ها</summary>
          <div className="mt-2 space-y-1">
            {history.map(r => (
              <div key={r.id} className="flex justify-between">
                <span>{CURRENCIES.find(c => c.code === r.currency)?.label ?? r.currency}</span>
                <span>{fmt(r.rate)} ریال</span>
                <span className="opacity-60">{r.rate_date}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
