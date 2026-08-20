import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, Minus,
  DollarSign, Euro, Coins, CircleDollarSign, AlertTriangle, Wifi, WifiOff,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMarketRates, useMarketHistory, MarketRate } from '@/hooks/useMarketRates';

const TEHRAN_TZ = 'Asia/Tehran';

function faNum(n: number | null | undefined, opts: Intl.NumberFormatOptions = {}) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fa-IR', opts).format(n);
}
function faDateTime(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      timeZone: TEHRAN_TZ,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch { return '—'; }
}
function faTime(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      timeZone: TEHRAN_TZ, timeStyle: 'short',
    }).format(new Date(iso));
  } catch { return '—'; }
}

const ASSET_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  USD: DollarSign,
  EUR: Euro,
  AED: CircleDollarSign,
  CNY: CircleDollarSign,
  GOLD: Coins,
  SILVER: Coins,
};
const ASSET_ORDER = ['USD', 'AED', 'CNY', 'EUR', 'GOLD', 'SILVER'];

const ASSET_TINT: Record<string, string> = {
  USD: 'from-emerald-500/15 to-emerald-500/0 text-emerald-500',
  EUR: 'from-blue-500/15 to-blue-500/0 text-blue-500',
  AED: 'from-teal-500/15 to-teal-500/0 text-teal-500',
  CNY: 'from-rose-500/15 to-rose-500/0 text-rose-500',
  GOLD: 'from-amber-500/20 to-amber-500/0 text-amber-500',
  SILVER: 'from-slate-400/20 to-slate-400/0 text-slate-400',
};

function ChangeBadge({ amount, percent }: { amount: number | null; percent: number | null }) {
  if (amount === null || percent === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        <Minus className="h-3 w-3" /> بدون سابقه
      </span>
    );
  }
  if (amount === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        <Minus className="h-3 w-3" /> بدون تغییر
      </span>
    );
  }
  const up = amount > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        up ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
           : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{faNum(percent, { maximumFractionDigits: 2 })}%
    </span>
  );
}

function Sparkline({ assetCode }: { assetCode: string }) {
  const { data } = useMarketHistory(assetCode, 24 * 60 * 60 * 1000);
  const points = (data ?? []).map((p) => ({ t: p.fetched_at, v: Number(p.rate_in_rial) }));
  if (points.length < 2) {
    return <div className="h-10 flex items-center justify-center text-[10px] text-muted-foreground/60">در انتظار سابقه</div>;
  }
  return (
    <div className="h-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${assetCode}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} fill={`url(#spark-${assetCode})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RateCard({ rate }: { rate: MarketRate }) {
  const Icon = ASSET_ICON[rate.asset_code] ?? Coins;
  const tint = ASSET_TINT[rate.asset_code] ?? 'from-primary/15 to-primary/0 text-primary';
  return (
    <Card className="relative overflow-hidden border-border/60 hover:border-border transition-all shadow-sm hover:shadow-md">
      <div className={`absolute inset-0 bg-gradient-to-bl ${tint.split(' ').slice(0, 2).join(' ')} pointer-events-none`} />
      <div className="relative p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`h-10 w-10 rounded-xl bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center ${tint.split(' ').slice(2).join(' ')}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">{rate.asset_name}</div>
              <div className="text-[11px] text-muted-foreground">{rate.asset_code} · {rate.unit_label}</div>
            </div>
          </div>
          <ChangeBadge amount={rate.change_amount} percent={rate.change_percent} />
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {faNum(Number(rate.rate_in_rial), { maximumFractionDigits: 0 })}
          </span>
          <span className="text-xs text-muted-foreground">ریال</span>
        </div>

        <Sparkline assetCode={rate.asset_code} />

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
          <span>منبع: {rate.source_name}</span>
          <span>به‌روزرسانی: {faTime(rate.fetched_at)}</span>
        </div>
      </div>
    </Card>
  );
}

const RANGES = [
  { key: '24h', label: '۲۴ ساعت', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '۷ روز', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '۳۰ روز', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'همه', ms: null as number | null },
];

function TrendChart({ rates }: { rates: MarketRate[] }) {
  const [asset, setAsset] = useState<string>('USD');
  const [rangeKey, setRangeKey] = useState<string>('7d');
  const range = RANGES.find((r) => r.key === rangeKey)!;
  const { data, isLoading } = useMarketHistory(asset, range.ms);
  const rate = rates.find((r) => r.asset_code === asset);

  const chartData = (data ?? []).map((p) => ({
    t: new Date(p.fetched_at).getTime(),
    v: Number(p.rate_in_rial),
    label: faDateTime(p.fetched_at),
  }));

  return (
    <Card className="p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold">نمودار تغییرات بازار</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {rate ? `${rate.asset_name} · ${rate.unit_label}` : 'یک دارایی انتخاب کنید'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={asset} onValueChange={setAsset}>
            <TabsList className="h-8">
              {ASSET_ORDER.map((c) => {
                const r = rates.find((x) => x.asset_code === c);
                return <TabsTrigger key={c} value={c} className="text-xs px-2.5">{r?.asset_name ?? c}</TabsTrigger>;
              })}
            </TabsList>
          </Tabs>
          <Tabs value={rangeKey} onValueChange={setRangeKey}>
            <TabsList className="h-8">
              {RANGES.map((r) => (
                <TabsTrigger key={r.key} value={r.key} className="text-xs px-2.5">{r.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : chartData.length < 2 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            سابقه کافی برای نمایش نمودار وجود ندارد
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => new Intl.DateTimeFormat('fa-IR', { timeZone: TEHRAN_TZ, month: 'short', day: 'numeric', hour: '2-digit' }).format(new Date(v))}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => faNum(v, { notation: 'compact', maximumFractionDigits: 1 })}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => faDateTime(new Date(v as number).toISOString())}
                formatter={(v: any) => [`${faNum(Number(v))} ریال`, rate?.asset_name ?? asset]}
              />
              <Line type="monotone" dataKey="v" stroke="url(#trendLine)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function MarketSummary({ rates, isStale }: { rates: MarketRate[]; isStale: boolean }) {
  const withChange = rates.filter((r) => r.change_percent !== null);
  const topUp = [...withChange].sort((a, b) => (b.change_percent ?? 0) - (a.change_percent ?? 0))[0];
  const topDown = [...withChange].sort((a, b) => (a.change_percent ?? 0) - (b.change_percent ?? 0))[0];
  const latest = rates.reduce<MarketRate | null>((acc, r) => {
    if (!acc) return r;
    return new Date(r.fetched_at) > new Date(acc.fetched_at) ? r : acc;
  }, null);
  const sources = new Set(rates.map((r) => r.source_name));

  const items = [
    {
      title: 'بیشترین افزایش امروز',
      value: topUp && (topUp.change_percent ?? 0) > 0 ? `${topUp.asset_name}` : '—',
      sub: topUp && (topUp.change_percent ?? 0) > 0 ? `+${faNum(topUp.change_percent, { maximumFractionDigits: 2 })}%` : 'بدون تغییر مثبت',
      tone: 'text-emerald-500',
    },
    {
      title: 'بیشترین کاهش امروز',
      value: topDown && (topDown.change_percent ?? 0) < 0 ? `${topDown.asset_name}` : '—',
      sub: topDown && (topDown.change_percent ?? 0) < 0 ? `${faNum(topDown.change_percent, { maximumFractionDigits: 2 })}%` : 'بدون تغییر منفی',
      tone: 'text-rose-500',
    },
    { title: 'آخرین به‌روزرسانی', value: faTime(latest?.fetched_at ?? null), sub: faDateTime(latest?.fetched_at ?? null), tone: 'text-foreground' },
    { title: 'منابع فعال', value: String(sources.size), sub: Array.from(sources).join('، ') || '—', tone: 'text-foreground' },
    {
      title: 'وضعیت اتصال داده',
      value: isStale ? 'داده قدیمی' : 'متصل',
      sub: isStale ? 'نرخ به‌روز نیست' : 'در حال دریافت زنده',
      tone: isStale ? 'text-amber-500' : 'text-emerald-500',
      icon: isStale ? WifiOff : Wifi,
    },
  ];

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold mb-4">خلاصه بازار</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map((it, i) => {
          const Icon = (it as any).icon;
          return (
            <div key={i} className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                {Icon && <Icon className="h-3 w-3" />} {it.title}
              </div>
              <div className={`text-base font-bold ${it.tone}`}>{it.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{it.sub}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function MarketRates() {
  const navigate = useNavigate();
  const { rates, isLoading, isRefreshing, refresh, latestFetchedAt, isStale, lastRefreshError } = useMarketRates();

  const ordered = useMemo(() => {
    return [...rates].sort(
      (a, b) => ASSET_ORDER.indexOf(a.asset_code) - ASSET_ORDER.indexOf(b.asset_code),
    );
  }, [rates]);

  return (
    <div dir="rtl" className="min-h-dvh bg-background">
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/')} aria-label="بازگشت">
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">نرخ لحظه‌ای بازار</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                آخرین به‌روزرسانی: {faDateTime(latestFetchedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-[11px] text-muted-foreground">
              به‌روزرسانی خودکار هر ۵ دقیقه
            </span>
            <Button onClick={refresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'در حال دریافت…' : 'به‌روزرسانی'}
            </Button>
          </div>
        </div>

        {/* Stale / error warning */}
        {(isStale || (lastRefreshError && rates.length === 0)) && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>نرخ به‌روز نیست — آخرین مقدار ذخیره‌شده نمایش داده می‌شود.</span>
          </div>
        )}

        {/* Rate cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {isLoading && rates.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)
            : ordered.length === 0
            ? (
              <Card className="col-span-full p-10 text-center text-sm text-muted-foreground">
                هنوز نرخی دریافت نشده است. برای اولین دریافت روی «به‌روزرسانی» بزنید.
              </Card>
            )
            : ordered.map((r) => <RateCard key={r.asset_code} rate={r} />)
          }
        </div>

        {/* Trend chart */}
        {ordered.length > 0 && (
          <div className="mb-6">
            <TrendChart rates={ordered} />
          </div>
        )}

        {/* Summary */}
        {ordered.length > 0 && <MarketSummary rates={ordered} isStale={isStale} />}
      </div>
    </div>
  );
}
