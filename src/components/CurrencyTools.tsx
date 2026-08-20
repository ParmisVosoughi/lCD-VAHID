import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, ArrowLeftRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/NumericInput';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CURRENCIES, CurrencyCode, getCurrencyLabel } from '@/lib/currencies';
import { useCurrencyRates, todayISO } from '@/hooks/useCurrencyRates';
import { useManualProducts } from '@/hooks/useManualProducts';
import { parseFormattedNumber } from '@/lib/numberFormat';

const fmt = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '';

const parseNum = (s: string) => parseFormattedNumber(s);

/** مبدل مبلغ — foreign-currency purchase price → final Rial price for one variant. */
export function CurrencyConverter({ productId }: { productId?: string | null }) {
  const { products, applyVariantPurchase } = useManualProducts();
  const { getCurrentRate, refreshFromMarket } = useCurrencyRates();
  const { toast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [variantId, setVariantId] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [shipping, setShipping] = useState('');
  const [profitPercent, setProfitPercent] = useState('');
  const [applying, setApplying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Manual override of «نرخ روز». Empty = use the automatic/API rate. */
  const [manualRate, setManualRate] = useState('');


  useEffect(() => {
    if (productId) {
      setSelectedProductId(productId);
      setVariantId('');
    }
  }, [productId]);

  // Always start from the freshest daily exchange rate — no manual entry needed.
  useEffect(() => {
    let alive = true;
    setRefreshing(true);
    refreshFromMarket().finally(() => { if (alive) setRefreshing(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshRate = async () => {
    setRefreshing(true);
    const ok = await refreshFromMarket();
    setRefreshing(false);
    // A fresh API rate replaces the previous manual value; the user may edit it again.
    if (ok) setManualRate('');
    if (!ok) toast({ title: 'به‌روزرسانی نرخ ارز ناموفق بود.', variant: 'destructive' });
  };


  const product = useMemo(
    () => products.find(p => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  // Variants list is always derived live from the currently selected product.
  const variants = product?.variants ?? [];

  useEffect(() => {
    if (variantId && !variants.some(v => v.id === variantId)) setVariantId('');
  }, [variants, variantId]);

  const apiRate = getCurrentRate(currency) ?? 0;
  // Manually typed rate always wins for the current calculation.
  const effectiveRate = manualRate.trim() !== '' ? parseNum(manualRate) : apiRate;

  const purchase = parseNum(purchasePrice);
  const shippingRial = parseNum(shipping);
  const profit = parseNum(profitPercent);
  const hasProfit = profitPercent.trim() !== '' && profit > 0;

  const converted = purchase * effectiveRate;
  const baseAmount = converted + shippingRial; // کرایه در نرخ ارز ضرب نمی‌شود
  const profitAmount = hasProfit ? baseAmount * (profit / 100) : 0;
  const finalAmount = baseAmount + profitAmount; // سود روی مبلغ نهایی اعمال می‌شود

  const canApply = !!variantId && effectiveRate > 0 && purchase > 0 && finalAmount > 0;

  const handleApply = async () => {
    if (!canApply) return;
    setApplying(true);
    const res = await applyVariantPurchase(variantId, Math.round(finalAmount), {
      currency,
      purchasePrice: purchase,
      exchangeRate: effectiveRate,
      shippingCost: shippingRial,
    });
    setApplying(false);
    if (res.ok) {
      toast({ title: `مبلغ ${fmt(finalAmount)} ریال با موفقیت روی ویژگی انتخاب‌شده ذخیره شد.` });
    } else {
      toast({ title: `خطا در ذخیره مبلغ: ${res.error ?? 'نامشخص'}`, variant: 'destructive' });
    }
  };

  return (
    <div dir="rtl" className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">مبدل مبلغ</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">محصول</label>
          <Select value={selectedProductId} onValueChange={v => { setSelectedProductId(v); setVariantId(''); }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="انتخاب محصول" /></SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">انتخاب ویژگی</label>
          <Select value={variantId} onValueChange={setVariantId} disabled={!product}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={product ? 'انتخاب ویژگی' : 'ابتدا محصول را انتخاب کنید'} />
            </SelectTrigger>
            <SelectContent>
              {variants.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}{v.keyNumber ? ` — #${v.keyNumber}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">نوع ارز</label>
          <Select value={currency} onValueChange={(v: CurrencyCode) => setCurrency(v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">قیمت خرید ({getCurrencyLabel(currency)})</label>
          <NumericInput
            value={purchasePrice}
            onChange={setPurchasePrice}
            placeholder="مثال: 10"
            className="h-9 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">نرخ ارز روز (ریال)</label>
          <div className="flex items-center gap-2">
            <NumericInput
              value={manualRate.trim() !== '' ? manualRate : (apiRate > 0 ? String(apiRate) : '')}
              onChange={setManualRate}
              placeholder={refreshing ? 'در حال دریافت نرخ روز…' : 'نرخ روز را وارد کنید'}
              className="h-9 text-sm font-mono"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              onClick={handleRefreshRate}
              disabled={refreshing}
              title="به‌روزرسانی نرخ روز"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            نرخ به‌صورت خودکار دریافت می‌شود؛ می‌توانید آن را دستی هم ویرایش کنید.
          </p>
        </div>


        <div>
          <label className="text-xs text-muted-foreground block mb-1">کرایه (ریال)</label>
          <NumericInput
            value={shipping}
            onChange={setShipping}
            placeholder="مثال: 1,000,000"
            className="h-9 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">سود (٪)</label>
          <NumericInput
            value={profitPercent}
            onChange={setProfitPercent}
            placeholder="مثال: 12.5"
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            هر درصد دلخواهی را می‌توانید وارد کنید.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">مبلغ تبدیل‌شده</span>
          <span className="font-mono">{fmt(converted)} ریال</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">کرایه</span>
          <span className="font-mono">{fmt(shippingRial)} ریال</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">مبلغ پایه (بدون سود)</span>
          <span className="font-mono">{fmt(baseAmount)} ریال</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">سود ({hasProfit ? `${profit}%` : '۰٪'})</span>
          <span className="font-mono">{fmt(profitAmount)} ریال</span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-1">
          <span>مبلغ نهایی</span>
          <span className="font-mono">{fmt(finalAmount)} ریال</span>
        </div>
      </div>

      {!hasProfit && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>شما سودی اضافه نکرده‌اید</span>
        </div>
      )}

      <Button size="sm" disabled={!canApply || applying} onClick={handleApply}>
        <Calculator className="h-4 w-4 ml-1" /> اعمال
      </Button>
      {!canApply && (
        <p className="text-[11px] text-muted-foreground">
          برای اعمال، محصول، ویژگی، قیمت خرید و نرخ ارز باید مشخص باشند.
        </p>
      )}
    </div>
  );
}

/** محاسبه گر قیمت قدیم — informational only, never writes to the DB. */
export function OldPriceCalculator() {
  const { getCurrentRate, getRateForDate, datesForCurrency } = useCurrencyRates();
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [oldPrice, setOldPrice] = useState('');
  const [oldDate, setOldDate] = useState(todayISO());
  const [oldRateOverride, setOldRateOverride] = useState('');

  const savedOldRate = getRateForDate(currency, oldDate);
  const oldRate = oldRateOverride.trim() ? parseNum(oldRateOverride) : savedOldRate ?? 0;
  const currentRate = getCurrentRate(currency) ?? 0;
  const prev = parseNum(oldPrice);

  const valid = prev > 0 && oldRate > 0 && currentRate > 0;
  const changePercent = valid ? ((currentRate - oldRate) / oldRate) * 100 : null;
  const newPrice = valid ? prev * (currentRate / oldRate) : null;
  const knownDates = datesForCurrency(currency);

  return (
    <div dir="rtl" className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">محاسبه گر قیمت قدیم</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">قیمت قبلی (ریال)</label>
          <Input
            inputMode="numeric"
            value={oldPrice}
            onChange={e => setOldPrice(e.target.value)}
            placeholder="مثال: ۱۲,۰۰۰,۰۰۰"
            className="h-9 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">ارز</label>
          <Select value={currency} onValueChange={(v: CurrencyCode) => setCurrency(v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">تاریخ نرخ قبلی</label>
          <Input
            type="date"
            value={oldDate}
            onChange={e => setOldDate(e.target.value)}
            className="h-9 text-sm"
          />
          {knownDates.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              تاریخ‌های ثبت‌شده: {knownDates.slice(0, 4).join('، ')}
            </p>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">نرخ ارز قبلی (ریال)</label>
          <Input
            inputMode="numeric"
            value={oldRateOverride}
            onChange={e => setOldRateOverride(e.target.value)}
            placeholder={savedOldRate ? `${fmt(savedOldRate)} (ثبت‌شده)` : 'نرخ ثبت نشده — دستی وارد کنید'}
            className="h-9 text-sm"
          />
        </div>
      </div>

      {valid ? (
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">قیمت قبلی</span><span className="font-mono">{fmt(prev)} ریال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">ارز</span><span>{getCurrencyLabel(currency)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">نرخ ارز قبلی</span><span className="font-mono">{fmt(oldRate)} ریال</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">نرخ ارز فعلی</span><span className="font-mono">{fmt(currentRate)} ریال</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">درصد تغییر</span>
            <span className={`font-mono ${changePercent! >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {changePercent!.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>قیمت محاسبه‌شده فعلی</span>
            <span className="font-mono">{fmt(newPrice!)} ریال</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          برای مقایسه، قیمت قبلی، نرخ ارز قبلی و نرخ ارز فعلی باید موجود و معتبر باشند.
        </p>
      )}
      <p className="text-[11px] text-muted-foreground">این محاسبه فقط اطلاعاتی است و قیمت واقعی ویژگی را تغییر نمی‌دهد.</p>
    </div>
  );
}
