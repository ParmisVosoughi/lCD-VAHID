import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Trash2, Edit2, X, Save, Search, ArrowUp, ArrowDown, Download, Printer, ListPlus, Pencil } from 'lucide-react';
import { ProductLinksSection } from '@/components/ProductLinksSection';
import { CurrencyConverter, OldPriceCalculator } from '@/components/CurrencyTools';
import { isValidHttpUrl } from '@/lib/urlUtils';
import { useVariantPreset } from '@/hooks/useVariantPreset';
import { VariantPresetDialog } from '@/components/VariantPresetDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useManualProducts, ManualProduct, ManualVariant } from '@/hooks/useManualProducts';
import { CATEGORIES, CategoryKey, DEFAULT_CATEGORY, getCategoryLabel } from '@/lib/categories';
import { SearchReplaceVariants } from '@/components/SearchReplaceVariants';

const DEFAULT_BG_COLOR = '#ffffff';
const DEFAULT_TEXT_COLOR = '#000000';

// Standard column order used for Export/Print. Independent from the (editable) preset.
const SUGGESTED_VARIANT_NAMES = [
  'TFT',
  'Mechanic',
  'Oled N/F',
  'Oled W/F',
  'Pack N/F',
  'Pack W/F',
  'Org 100%',
];

const newVariant = (name = ''): ManualVariant => ({
  id: crypto.randomUUID(),
  name,
  price: 0,
  color: DEFAULT_BG_COLOR,
  textColor: DEFAULT_TEXT_COLOR,
});

const formatPrice = (n: number) =>
  Number.isFinite(n) && n > 0 ? n.toLocaleString('en-US') : '';

const parsePrice = (s: string) => {
  const digits = s.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

interface FormState {
  id: string | null;
  title: string;
  category: CategoryKey;
  variants: ManualVariant[];
  websiteProductUrl: string;
  thumbnailUrl: string;
  showThumbnail: boolean;
}

const emptyForm = (): FormState => ({
  id: null,
  title: '',
  category: DEFAULT_CATEGORY,
  variants: [],
  websiteProductUrl: '',
  thumbnailUrl: '',
  showThumbnail: false,
});

interface ManualProductsAdminProps {
  initialEditId?: string | null;
  onAfterSave?: () => void;
}

export function ManualProductsAdmin({ initialEditId, onAfterSave }: ManualProductsAdminProps = {}) {
  const { products, createProduct, updateProduct, deleteProduct } = useManualProducts();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManualProduct | null>(null);
  const [search, setSearch] = useState('');
  const [exportPickerOpen, setExportPickerOpen] = useState(false);
  const [printPickerOpen, setPrintPickerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<CategoryKey>(DEFAULT_CATEGORY);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const { presets: variantPresets } = useVariantPreset();
  const titleRef = useRef<HTMLInputElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const autoLoadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (form.id === null) titleRef.current?.focus();
  }, [form.id]);

  const isValid = useMemo(() => {
    if (!form.title.trim()) return false;
    if (!form.category) return false;
    if (form.variants.length === 0) return false;
    return form.variants.every(v => v.name.trim() && v.price > 0);
  }, [form]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.title.toLowerCase().includes(q));
  }, [products, search]);

  const updateVariant = useCallback((id: string, patch: Partial<ManualVariant>) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map(v => (v.id === id ? { ...v, ...patch } : v)),
    }));
  }, []);

  const addVariant = useCallback(() => {
    setForm(f => ({ ...f, variants: [...f.variants, newVariant()] }));
  }, []);

  const insertDefaultVariants = useCallback(() => {
    if (variantPresets.length === 0) {
      toast({ title: 'Preset is empty — edit it first' });
      return;
    }
    setForm(f => ({
      ...f,
      variants: [
        ...f.variants,
        ...variantPresets.map(p => ({
          ...newVariant(p.name),
          color: p.badgeColor,
          textColor: p.textColor,
        })),
      ],
    }));
  }, [variantPresets, toast]);

  const removeVariant = useCallback((id: string) => {
    setForm(f => ({ ...f, variants: f.variants.filter(v => v.id !== id) }));
  }, []);

  const moveVariant = useCallback((id: string, dir: -1 | 1) => {
    setForm(f => {
      const idx = f.variants.findIndex(v => v.id === id);
      if (idx < 0) return f;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= f.variants.length) return f;
      const next = [...f.variants];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return { ...f, variants: next };
    });
  }, []);

  const startEdit = useCallback((p: ManualProduct) => {
    setForm({
      id: p.id,
      title: p.title,
      category: p.category,
      websiteProductUrl: p.websiteProductUrl ?? '',
      thumbnailUrl: p.thumbnailUrl ?? '',
      showThumbnail: !!p.showThumbnail,
      variants: p.variants.length
        ? p.variants.map(v => ({ ...v, id: v.id || crypto.randomUUID() }))
        : [newVariant()],
    });
    requestAnimationFrame(() => {
      formContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleRef.current?.focus();
      titleRef.current?.select();
    });
  }, []);

  const cancelEdit = useCallback(() => setForm(emptyForm()), []);

  useEffect(() => {
    if (!initialEditId) {
      autoLoadedIdRef.current = null;
      return;
    }
    if (autoLoadedIdRef.current === initialEditId) return;
    const p = products.find(x => x.id === initialEditId);
    if (p) {
      autoLoadedIdRef.current = initialEditId;
      startEdit(p);
    }
  }, [initialEditId, products, startEdit]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;
    setSaving(true);
    const cleanVariants = form.variants.map(v => ({
      id: v.id,
      name: v.name.trim(),
      price: v.price,
      color: v.color,
      textColor: v.textColor,
    }));
    const websiteUrl = form.websiteProductUrl.trim();
    const thumbUrl = form.thumbnailUrl.trim();
    const links = {
      websiteProductUrl: isValidHttpUrl(websiteUrl) ? websiteUrl : null,
      thumbnailUrl: isValidHttpUrl(thumbUrl) ? thumbUrl : null,
      showThumbnail: isValidHttpUrl(thumbUrl) ? form.showThumbnail : false,
    };
    const result = form.id
      ? await updateProduct(form.id, form.title.trim(), form.category, cleanVariants, links)
      : await createProduct(form.title.trim(), form.category, cleanVariants, links);
    setSaving(false);
    if (result) {
      toast({ title: form.id ? 'Product updated' : 'Product saved' });
      setForm(emptyForm());
      onAfterSave?.();
    } else {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  }, [form, isValid, createProduct, updateProduct, toast, onAfterSave]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteProduct(deleteTarget.id);
    toast({
      title: ok ? 'Product deleted' : 'Delete failed',
      variant: ok ? undefined : 'destructive',
    });
    if (ok && form.id === deleteTarget.id) setForm(emptyForm());
    setDeleteTarget(null);
  }, [deleteTarget, deleteProduct, form.id, toast]);

  const STANDARD_COLUMNS = SUGGESTED_VARIANT_NAMES;
  const normalize = (s: string) => s.trim().toLowerCase();

  // ---- Export / Print ----
  const buildCategoryRows = (category: CategoryKey) => {
    const list = products.filter(p => p.category === category);
    const standardSet = new Set(STANDARD_COLUMNS.map(normalize));
    const extraOrder: string[] = [];
    const extraSeen = new Set<string>();
    list.forEach(p => {
      p.variants.forEach(v => {
        const key = normalize(v.name);
        if (!key) return;
        if (!standardSet.has(key) && !extraSeen.has(key)) {
          extraSeen.add(key);
          extraOrder.push(v.name.trim());
        }
      });
    });
    return { list, extraOrder };
  };

  const handleExportCategory = useCallback(
    (category: CategoryKey) => {
      const { list, extraOrder } = buildCategoryRows(category);
      if (list.length === 0) {
        toast({ title: `No manual products in ${getCategoryLabel(category)}`, variant: 'destructive' });
        return;
      }
      const headers = ['Product Title', 'Category', ...STANDARD_COLUMNS, ...extraOrder];
      const rows = list.map(p => {
        const priceByName = new Map<string, number>();
        p.variants.forEach(v => {
          const key = normalize(v.name);
          if (key) priceByName.set(key, v.price);
        });
        const row: (string | number)[] = [p.title, getCategoryLabel(p.category)];
        STANDARD_COLUMNS.forEach(col => {
          const price = priceByName.get(normalize(col));
          row.push(price && price > 0 ? price : '');
        });
        extraOrder.forEach(col => {
          const price = priceByName.get(normalize(col));
          row.push(price && price > 0 ? price : '');
        });
        return row;
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map((h, i) => ({
        wch: i === 0 ? 28 : Math.max(12, h.length + 2),
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, getCategoryLabel(category).slice(0, 31));
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `manual-products-${category}-${stamp}.xlsx`, {
        bookType: 'xlsx',
        compression: true,
      });
      toast({ title: `Exported ${list.length} product${list.length === 1 ? '' : 's'}` });
    },
    [products, toast],
  );

  const handlePrintCategory = useCallback(
    (category: CategoryKey) => {
      const list = products.filter(p => p.category === category);
      if (list.length === 0) {
        toast({ title: `No manual products in ${getCategoryLabel(category)}`, variant: 'destructive' });
        return;
      }
      const dateStr = new Date().toLocaleDateString();
      const escape = (s: string) =>
        String(s).replace(/[&<>"']/g, ch =>
          ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;',
        );
      const bodyRows = list
        .map(p => {
          const priceByName = new Map<string, number>();
          p.variants.forEach(v => {
            const k = normalize(v.name);
            if (k) priceByName.set(k, v.price);
          });
          const cells = STANDARD_COLUMNS.map(col => {
            const price = priceByName.get(normalize(col));
            return `<td>${price && price > 0 ? price.toLocaleString('en-US') : ''}</td>`;
          }).join('');
          return `<tr><td class="title">${escape(p.title)}</td>${cells}</tr>`;
        })
        .join('');
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>LCD-Vahid Price List — ${escape(getCategoryLabel(category))}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #000; background: #fff; margin: 0; }
  header { margin-bottom: 14px; border-bottom: 2px solid #000; padding-bottom: 8px; }
  h1 { margin: 0 0 4px; font-size: 18pt; }
  .meta { display: flex; justify-content: space-between; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th, td { border: 1px solid #000; padding: 6px 8px; text-align: center; }
  th { background: #f0f0f0; font-weight: 700; }
  td.title { text-align: left; font-weight: 600; }
</style></head><body>
<header>
  <h1>LCD-Vahid</h1>
  <div class="meta"><span>Category: <strong>${escape(getCategoryLabel(category))}</strong></span><span>${escape(dateStr)}</span></div>
</header>
<table>
  <thead><tr>
    <th>Product Title</th>
    ${STANDARD_COLUMNS.map(c => `<th>${escape(c)}</th>`).join('')}
  </tr></thead>
  <tbody>${bodyRows}</tbody>
</table>
<script>window.onload = () => { setTimeout(() => { window.print(); }, 150); };</script>
</body></html>`;
      const w = window.open('', '_blank');
      if (!w) {
        toast({ title: 'Popup blocked — please allow popups', variant: 'destructive' });
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    },
    [products, toast],
  );

  const handleFormKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON') return;
      if ((target as HTMLInputElement).type === 'color') return;
      e.preventDefault();
      const container = formContainerRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'input:not([type="color"]):not([disabled]), button:not([disabled])',
        ),
      ).filter(el => el.offsetParent !== null);
      const idx = focusables.indexOf(target);
      if (idx >= 0 && idx + 1 < focusables.length) {
        focusables[idx + 1].focus();
      } else if (isValid) {
        handleSave();
      }
    },
    [isValid, handleSave],
  );

  return (
    <div className="space-y-6">
      <SearchReplaceVariants />
      {/* Form Card */}
      <div
        ref={formContainerRef}
        className="border rounded-lg p-4 space-y-4"
        onKeyDown={handleFormKeyDown}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{form.id ? 'Edit Product' : 'Add Product'}</h3>
          {form.id && (
            <Button variant="ghost" size="sm" onClick={cancelEdit}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          )}
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Product Title *</label>
          <Input
            ref={titleRef}
            autoFocus
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. LCD iPhone 13"
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Category *</label>
          <Select
            value={form.category}
            onValueChange={(val: CategoryKey) => setForm(f => ({ ...f, category: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Determines which website page this product appears on.
          </p>
        </div>

        <ProductLinksSection
          websiteProductUrl={form.websiteProductUrl}
          thumbnailUrl={form.thumbnailUrl}
          showThumbnail={form.showThumbnail}
          onChange={patch => setForm(f => ({ ...f, ...patch }))}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={insertDefaultVariants}>
            <ListPlus className="h-4 w-4 mr-1" /> Insert Default Variants
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPresetDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit Default Variant Preset
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium block">Variants *</label>
          {form.variants.length === 0 && (
            <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3 text-center">
              No variants yet. Click "Insert Default Variants" above, or add one manually.
            </p>
          )}
          {form.variants.map((v, idx) => (
            <div
              key={v.id}
              className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveVariant(v.id, -1)}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveVariant(v.id, 1)}
                  disabled={idx === form.variants.length - 1}
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <input
                  type="color"
                  value={v.color}
                  onChange={e => updateVariant(v.id, { color: e.target.value })}
                  className="h-6 w-6 rounded border cursor-pointer p-0"
                  title="Background color"
                />
                <input
                  type="color"
                  value={v.textColor}
                  onChange={e => updateVariant(v.id, { textColor: e.target.value })}
                  className="h-6 w-6 rounded border cursor-pointer p-0"
                  title="Text color"
                />
              </div>
              <span
                className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono text-muted-foreground shrink-0"
                title="Key Number"
              >
                {v.keyNumber ? `#${v.keyNumber}` : '—'}
              </span>
              <span
                className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0 border"
                style={{ backgroundColor: v.color, color: v.textColor }}
                title="Preview"
              >
                {v.name || 'Aa'}
              </span>
              <Input
                value={v.name}
                onChange={e => updateVariant(v.id, { name: e.target.value })}
                placeholder={`Variant ${idx + 1} name`}
                className="flex-1 h-9"
              />
              <Input
                value={formatPrice(v.price)}
                onChange={e => updateVariant(v.id, { price: parsePrice(e.target.value) })}
                placeholder="Price"
                inputMode="numeric"
                className="w-28 h-9"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive shrink-0"
                onClick={() => removeVariant(v.id)}
                title="Delete variant"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addVariant} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Variant
          </Button>
        </div>

        {(form.title.trim() || form.variants.some(v => v.name || v.price)) && (
          <div className="border rounded-lg p-3 bg-background">
            <p className="text-xs text-muted-foreground mb-2">
              Live Preview · {getCategoryLabel(form.category)}
            </p>
            <div className="font-semibold mb-2">{form.title || 'Product Title'}</div>
            <div className="space-y-1.5">
              {form.variants.map(v => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 text-sm rounded-md px-3 py-1.5"
                  style={{ backgroundColor: v.color, color: v.textColor }}
                >
                  <span className="font-medium truncate">{v.name || '—'}:</span>
                  <span className="font-mono tabular-nums">{formatPrice(v.price) || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={!isValid || saving} className="w-full">
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : form.id ? 'Update Product' : 'Save Product'}
        </Button>
      </div>

      {/* مبدل مبلغ + محاسبه گر قیمت قدیم */}
      <div className="space-y-3">
        <CurrencyConverter productId={form.id} />
        <OldPriceCalculator />
      </div>


      {/* Manual Products List + Search + Export/Print */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold">
            Manual Products ({filteredProducts.length}/{products.length})
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPickerCategory(DEFAULT_CATEGORY);
                setExportPickerOpen(true);
              }}
              disabled={products.length === 0}
              title="Export manual products to Excel"
            >
              <Download className="h-4 w-4 mr-1" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPickerCategory(DEFAULT_CATEGORY);
                setPrintPickerOpen(true);
              }}
              disabled={products.length === 0}
              title="Print manual products"
            >
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products by title..."
            className="pl-8"
          />
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            {products.length === 0 ? 'No manual products yet' : 'No products match your search'}
          </p>
        ) : (
          filteredProducts.map(p => (
            <div
              key={p.id}
              className="border rounded-lg p-3 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => startEdit(p)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startEdit(p);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {getCategoryLabel(p.category)}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {p.variants.map(v => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between gap-3 text-xs rounded px-2 py-1"
                        style={{ backgroundColor: v.color, color: v.textColor }}
                      >
                        <span className="truncate font-medium">{v.name}</span>
                        <span className="font-mono tabular-nums">{formatPrice(v.price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(p)} title="Edit">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(p)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Category Picker */}
      <Dialog open={exportPickerOpen} onOpenChange={setExportPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
          </DialogHeader>
          <Select value={pickerCategory} onValueChange={(v: CategoryKey) => setPickerCategory(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setExportPickerOpen(false);
                handleExportCategory(pickerCategory);
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Category Picker */}
      <Dialog open={printPickerOpen} onOpenChange={setPrintPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
          </DialogHeader>
          <Select value={pickerCategory} onValueChange={(v: CategoryKey) => setPickerCategory(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintPickerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setPrintPickerOpen(false);
                handlePrintCategory(pickerCategory);
              }}
            >
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <VariantPresetDialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen} />
    </div>
  );
}
