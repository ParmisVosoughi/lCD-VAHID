import React, { useMemo, useState } from 'react';
import { useAnalyticsData, PriceHistoryRow } from '@/hooks/useAnalyticsData';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, Package, Layers, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

const CATEGORIES: Record<string, string> = {
  lcd: 'LCD',
  mobile: 'Mobile Phone',
  misc: 'Miscellaneous',
};

type CategoryFilter = 'all' | 'lcd' | 'mobile' | 'misc';
type RangeFilter = '7' | '30' | 'all';

export function AnalyticsDashboard() {
  const { products, variants, history, isLoading } = useAnalyticsData();
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [range, setRange] = useState<RangeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('all');

  const productById = useMemo(() => {
    const m = new Map<string, typeof products[number]>();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  const rangeStart = useMemo(() => {
    if (range === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range, 10));
    return d;
  }, [range]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, category, search]);

  const filteredProductIds = useMemo(
    () => new Set(filteredProducts.map(p => p.id)),
    [filteredProducts]
  );

  const filteredVariants = useMemo(
    () => variants.filter(v => filteredProductIds.has(v.product_id)),
    [variants, filteredProductIds]
  );

  const filteredHistory = useMemo(() => {
    return history.filter(h => {
      if (!filteredProductIds.has(h.product_id)) return false;
      if (rangeStart && new Date(h.changed_at) < rangeStart) return false;
      return true;
    });
  }, [history, filteredProductIds, rangeStart]);

  // Overview metrics
  const totalProducts = filteredProducts.length;
  const totalVariants = filteredVariants.length;
  const avgPrice = useMemo(() => {
    const priced = filteredVariants.filter(v => v.price > 0);
    if (!priced.length) return 0;
    return priced.reduce((s, v) => s + Number(v.price), 0) / priced.length;
  }, [filteredVariants]);
  const totalChanges = filteredHistory.filter(h => h.old_price !== null).length;

  // Per category
  const categoryStats = useMemo(() => {
    return Object.keys(CATEGORIES).map(catKey => {
      const catProducts = filteredProducts.filter(p => p.category === catKey);
      const catPIds = new Set(catProducts.map(p => p.id));
      const catVariants = filteredVariants.filter(v => catPIds.has(v.product_id));
      const priced = catVariants.filter(v => v.price > 0);
      const avg = priced.length ? priced.reduce((s, v) => s + Number(v.price), 0) / priced.length : 0;
      const volatility = filteredHistory
        .filter(h => catPIds.has(h.product_id) && h.percentage_change !== null)
        .reduce((s, h) => s + Math.abs(Number(h.percentage_change)), 0);
      return {
        key: catKey,
        label: CATEGORIES[catKey],
        productCount: catProducts.length,
        avgPrice: avg,
        volatility,
      };
    });
  }, [filteredProducts, filteredVariants, filteredHistory]);

  // Aggregate latest change per variant for top movers
  const latestChangePerVariant = useMemo(() => {
    const map = new Map<string, PriceHistoryRow>();
    // history is already ordered desc by changed_at
    for (const h of filteredHistory) {
      if (h.percentage_change === null) continue;
      const key = h.variant_id ?? `${h.product_id}:${h.variant_name}`;
      if (!map.has(key)) map.set(key, h);
    }
    return Array.from(map.values());
  }, [filteredHistory]);

  const topIncreasing = useMemo(
    () => [...latestChangePerVariant]
      .filter(h => Number(h.percentage_change) > 0)
      .sort((a, b) => Number(b.percentage_change) - Number(a.percentage_change))
      .slice(0, 10),
    [latestChangePerVariant]
  );

  const topDecreasing = useMemo(
    () => [...latestChangePerVariant]
      .filter(h => Number(h.percentage_change) < 0)
      .sort((a, b) => Number(a.percentage_change) - Number(b.percentage_change))
      .slice(0, 10),
    [latestChangePerVariant]
  );

  // Volatility per variant
  const volatilityList = useMemo(() => {
    const scores = new Map<string, { productId: string; variantName: string; score: number }>();
    for (const h of filteredHistory) {
      if (h.percentage_change === null) continue;
      const key = h.variant_id ?? `${h.product_id}:${h.variant_name}`;
      const prev = scores.get(key);
      const add = Math.abs(Number(h.percentage_change));
      if (prev) prev.score += add;
      else scores.set(key, { productId: h.product_id, variantName: h.variant_name, score: add });
    }
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [filteredHistory]);

  // Price trend for selected product
  const trendData = useMemo(() => {
    if (!selectedProductId) return [];
    const rows = filteredHistory
      .filter(h => h.product_id === selectedProductId)
      .filter(h => selectedVariant === 'all' || h.variant_name === selectedVariant)
      .slice()
      .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());
    return rows.map(r => ({
      date: format(new Date(r.changed_at), 'MM-dd HH:mm'),
      price: Number(r.new_price),
      variant: r.variant_name,
    }));
  }, [selectedProductId, selectedVariant, filteredHistory]);

  const trendDirection = useMemo(() => {
    if (trendData.length < 2) return 'stable';
    const first = trendData[0].price;
    const last = trendData[trendData.length - 1].price;
    if (last > first * 1.02) return 'up';
    if (last < first * 0.98) return 'down';
    return 'stable';
  }, [trendData]);

  const selectedProductVariants = useMemo(() => {
    if (!selectedProductId) return [];
    return Array.from(new Set(
      variants.filter(v => v.product_id === selectedProductId).map(v => v.variant_name)
    ));
  }, [selectedProductId, variants]);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading analytics…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select value={category} onValueChange={(v) => setCategory(v as CategoryFilter)}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="lcd">LCD</SelectItem>
            <SelectItem value="mobile">Mobile Phone</SelectItem>
            <SelectItem value="misc">Miscellaneous</SelectItem>
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as RangeFilter)}>
          <SelectTrigger><SelectValue placeholder="Range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={<Package className="h-4 w-4" />} label="Total Products" value={totalProducts} />
        <MetricCard icon={<Layers className="h-4 w-4" />} label="Total Variants" value={totalVariants} />
        <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Average Price" value={avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
        <MetricCard icon={<Activity className="h-4 w-4" />} label="Price Changes" value={totalChanges} />
      </div>

      {/* Category analytics */}
      <Section title="Category Analytics">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {categoryStats.map(c => (
            <div key={c.key} className="border rounded-lg p-3">
              <div className="font-medium">{c.label}</div>
              <div className="text-sm text-muted-foreground mt-1">Products: {c.productCount}</div>
              <div className="text-sm text-muted-foreground">Avg price: {c.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="text-sm text-muted-foreground">Volatility: {c.volatility.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Top increasing */}
      <Section title="Top Increasing Products" icon={<TrendingUp className="h-4 w-4 text-green-600" />}>
        <MoverList items={topIncreasing} productById={productById} positive />
      </Section>

      {/* Top decreasing */}
      <Section title="Top Decreasing Products" icon={<TrendingDown className="h-4 w-4 text-red-600" />}>
        <MoverList items={topDecreasing} productById={productById} />
      </Section>

      {/* Volatility */}
      <Section title="Most Volatile Products" icon={<Activity className="h-4 w-4" />}>
        {volatilityList.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="space-y-1">
            {volatilityList.map((v, i) => (
              <div key={i} className="flex items-center justify-between border rounded p-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{productById.get(v.productId)?.title ?? '—'}</div>
                  <div className="text-xs text-muted-foreground">{v.variantName}</div>
                </div>
                <div className="font-mono">{v.score.toFixed(1)}%</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Price trend */}
      <Section title="Price Trend">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <Select
            value={selectedProductId}
            onValueChange={(v) => { setSelectedProductId(v); setSelectedVariant('all'); }}
          >
            <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
            <SelectContent>
              {filteredProducts.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedVariant} onValueChange={setSelectedVariant} disabled={!selectedProductId}>
            <SelectTrigger><SelectValue placeholder="Variant" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All variants</SelectItem>
              {selectedProductVariants.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProductId ? (
          trendData.length ? (
            <>
              <div className="flex items-center gap-2 text-sm mb-2">
                Trend:
                {trendDirection === 'up' && <span className="text-green-600 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Increasing</span>}
                {trendDirection === 'down' && <span className="text-red-600 flex items-center gap-1"><TrendingDown className="h-4 w-4" /> Decreasing</span>}
                {trendDirection === 'stable' && <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-4 w-4" /> Stable</span>}
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No price history for this selection.</div>
          )
        ) : (
          <div className="text-sm text-muted-foreground">Select a product to view its trend.</div>
        )}
      </Section>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}

function EmptyRow() {
  return <div className="text-sm text-muted-foreground">No data yet.</div>;
}

function MoverList({
  items,
  productById,
  positive,
}: {
  items: PriceHistoryRow[];
  productById: Map<string, { title: string }>;
  positive?: boolean;
}) {
  if (!items.length) return <EmptyRow />;
  return (
    <div className="space-y-1">
      {items.map((h) => {
        const pct = Number(h.percentage_change);
        return (
          <div key={h.id} className="flex items-center justify-between border rounded p-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{productById.get(h.product_id)?.title ?? '—'}</div>
              <div className="text-xs text-muted-foreground">{h.variant_name} · latest {Number(h.new_price).toLocaleString()}</div>
            </div>
            <div className={`font-mono ${positive ? 'text-green-600' : 'text-red-600'}`}>
              {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
