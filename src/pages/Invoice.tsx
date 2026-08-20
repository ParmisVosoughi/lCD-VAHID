import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Minus, Trash2, Printer, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/NumericInput';
import { parseFormattedNumber } from '@/lib/numberFormat';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useManualProducts, ManualProduct, ManualVariant } from '@/hooks/useManualProducts';
import { useInvoices, InvoiceItem } from '@/hooks/useInvoices';
import { getCategoryLabel } from '@/lib/categories';
import { useToast } from '@/hooks/use-toast';
import {
  formatMoney, toFaDigits, nowInTehran, toJalali, gregorianISO,
  formatTime, generateInvoiceNumber,
} from '@/lib/invoiceUtils';
import { printInvoice, PRINT_FORMATS, DEFAULT_PRINT_FORMAT, PrintFormat } from '@/lib/printInvoice';
import { PAYMENT_METHODS, PAYMENT_CUSTOM_LABEL } from '@/lib/paymentMethods';
import { OfflineStatusBar } from '@/components/OfflineStatusBar';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import vgtelLogo from '@/assets/vgtel-logo.svg';

interface CartItem extends InvoiceItem {
  key: string; // productId::variantId (or fallbacks)
}

const Invoice = () => {
  const navigate = useNavigate();
  const { products, isLoading } = useManualProducts();
  const { createInvoice, isCreating } = useInvoices();
  const { online, queueInvoice } = useOfflineSync();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [copies, setCopies] = useState(1);
  const [printFormat, setPrintFormat] = useState<PrintFormat>(DEFAULT_PRINT_FORMAT);
  const [paymentChoice, setPaymentChoice] = useState<string>('none');
  const [customPayment, setCustomPayment] = useState('');
  const [saving, setSaving] = useState(false);

  const paymentMethod = useMemo(() => {
    if (paymentChoice === 'none') return null;
    if (paymentChoice === 'custom') return customPayment.trim() || null;
    return paymentChoice;
  }, [paymentChoice, customPayment]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: { product: ManualProduct; variant: ManualVariant }[] = [];
    for (const p of products) {
      const titleMatch = p.title.toLowerCase().includes(q);
      for (const v of p.variants) {
        if (titleMatch || v.name.toLowerCase().includes(q)) {
          out.push({ product: p, variant: v });
        }
      }
    }
    return out.slice(0, 40);
  }, [products, query]);

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.line_total, 0),
    [cart],
  );

  const addToCart = (p: ManualProduct, v: ManualVariant) => {
    const key = `${p.id}::${v.id}`;
    setCart(prev => {
      const idx = prev.findIndex(i => i.key === key);
      if (idx >= 0) {
        const next = [...prev];
        const q = next[idx].quantity + 1;
        next[idx] = { ...next[idx], quantity: q, line_total: q * next[idx].invoice_unit_price };
        return next;
      }
      return [
        ...prev,
        {
          key,
          product_id: p.id,
          variant_id: v.id,
          product_title: p.title,
          variant_name: v.name,
          quantity: 1,
          original_product_price: v.price,
          invoice_unit_price: v.price,
          line_total: v.price,
        },
      ];
    });
  };

  const updateQty = (key: string, qty: number) => {
    if (qty < 1) qty = 1;
    setCart(prev => prev.map(i => i.key === key
      ? { ...i, quantity: qty, line_total: qty * i.invoice_unit_price }
      : i));
  };

  const updatePrice = (key: string, price: number) => {
    if (!Number.isFinite(price) || price < 0) price = 0;
    setCart(prev => prev.map(i => i.key === key
      ? { ...i, invoice_unit_price: price, line_total: i.quantity * price }
      : i));
  };

  const removeItem = (key: string) => {
    setCart(prev => prev.filter(i => i.key !== key));
  };

  const updateItemCategory = (key: string, value: string | null) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, item_category: value } : i));
  };

  const openConfirm = () => {
    if (!cart.length) return;
    setCustomer('');
    setCopies(1);
    setPrintFormat(DEFAULT_PRINT_FORMAT);
    setConfirmOpen(true);
  };

  const handleConfirmPrint = async () => {
    if (saving || isCreating) return;
    const name = customer.trim();
    if (!name) {
      toast({ title: 'نام مشتری الزامی است', variant: 'destructive' });
      return;
    }
    const c = Math.max(1, Math.floor(copies) || 0);
    if (c < 1) {
      toast({ title: 'تعداد چاپ باید حداقل ۱ باشد', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const now = nowInTehran();
      const payload = {
        invoice_number: generateInvoiceNumber(now),
        customer_name: name,
        total_amount: total,
        jalali_date: toJalali(now),
        gregorian_date: gregorianISO(now),
        printed_time: formatTime(now),
        print_copies: c,
        print_format: printFormat,
        payment_method: paymentMethod,
        items: cart.map(({ key, ...rest }) => rest),
      };

      // Offline: queue locally and print from local snapshot.
      if (!online || !navigator.onLine) {
        await queueInvoice(payload);
        const localInvoice = {
          id: `local-${Date.now()}`,
          created_at: now.toISOString(),
          status: 'pending_sync',
          ...payload,
          invoice_items: payload.items.map((it, i) => ({ ...it, display_order: i })),
        } as unknown as Parameters<typeof printInvoice>[0];
        toast({ title: 'فاکتور آفلاین ذخیره شد', description: 'پس از اتصال، همگام‌سازی می‌شود.' });
        setConfirmOpen(false);
        setCart([]);
        printInvoice(localInvoice, c);
        return;
      }

      try {
        const invoice = await createInvoice(payload);
        toast({ title: 'فاکتور با موفقیت ذخیره شد', description: invoice.invoice_number });
        setConfirmOpen(false);
        setCart([]);
        printInvoice(invoice, c);
      } catch (netErr) {
        // Server unreachable: fall back to offline queue so no data is lost.
        await queueInvoice(payload);
        const localInvoice = {
          id: `local-${Date.now()}`,
          created_at: now.toISOString(),
          status: 'pending_sync',
          ...payload,
          invoice_items: payload.items.map((it, i) => ({ ...it, display_order: i })),
        } as unknown as Parameters<typeof printInvoice>[0];
        toast({
          title: 'ذخیره‌سازی آفلاین شد',
          description: netErr instanceof Error ? netErr.message : 'پس از اتصال همگام‌سازی می‌شود.',
        });
        setConfirmOpen(false);
        setCart([]);
        printInvoice(localInvoice, c);
      }
    } catch (e) {
      toast({
        title: 'خطا در ذخیره فاکتور',
        description: e instanceof Error ? e.message : 'دوباره تلاش کنید',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-card" dir="rtl">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="ml-1"
            >
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <img src={vgtelLogo} alt="LCD-Vahid" className="h-8 w-auto" />
            <h1 className="text-lg font-bold">چاپ فاکتور</h1>
          </div>
          <OfflineStatusBar />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="جستجوی محصول یا ویژگی..."
            className="pr-10"
          />
        </div>

        {/* Search results */}
        {query.trim() && (
          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin" /> در حال بارگذاری...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                نتیجه‌ای یافت نشد
              </div>
            ) : (
              results.map(({ product, variant }) => (
                <button
                  key={`${product.id}-${variant.id}`}
                  type="button"
                  onClick={() => addToCart(product, variant)}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent text-right"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.title}</div>
                    <div className="text-xs text-muted-foreground flex gap-2">
                      <span>{variant.name}</span>
                      <span>•</span>
                      <span>{getCategoryLabel(product.category)}</span>
                      <span>•</span>
                      <span>{formatMoney(variant.price)} ریال</span>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-primary shrink-0" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Cart table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-3 py-2 font-semibold text-sm">اقلام فاکتور</div>
          {cart.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              هنوز محصولی اضافه نشده است.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2">ردیف</th>
                    <th className="p-2">نام محصول</th>
                    <th className="p-2">ویژگی</th>
                    <th className="p-2">دسته بندی</th>
                    <th className="p-2">روش پرداخت</th>
                    <th className="p-2">تعداد</th>
                    <th className="p-2">قیمت واحد فاکتور</th>
                    <th className="p-2">مبلغ کل</th>
                    <th className="p-2">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((it, i) => {
                    const cat = (it.item_category ?? '').trim();
                    const displayName = cat ? `${cat} ${it.product_title}` : it.product_title;
                    const preset = !cat ? 'none' : (cat === 'LCD' || cat === 'Battery') ? cat : 'custom';
                    return (
                    <tr key={it.key} className="border-t">
                      <td className="p-2 text-center">{toFaDigits(i + 1)}</td>
                      <td className="p-2">{displayName}</td>
                      <td className="p-2">{it.variant_name}</td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1 items-stretch">
                          <Select
                            value={preset}
                            onValueChange={(v) => {
                              if (v === 'none') updateItemCategory(it.key, null);
                              else if (v === 'LCD' || v === 'Battery') updateItemCategory(it.key, v);
                              else updateItemCategory(it.key, cat && preset === 'custom' ? cat : '');
                            }}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="LCD">LCD</SelectItem>
                              <SelectItem value="Battery">Battery</SelectItem>
                              <SelectItem value="custom">+ Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          {preset === 'custom' && (
                            <Input
                              value={cat}
                              onChange={e => updateItemCategory(it.key, e.target.value)}
                              placeholder="Custom"
                              className="h-7 w-28 text-xs px-2"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1 items-stretch">
                          <Select
                            value={paymentChoice}
                            onValueChange={(v) => {
                              setPaymentChoice(v);
                              if (v !== 'custom') setCustomPayment('');
                            }}
                          >
                            <SelectTrigger className="h-7 w-36 text-xs px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {PAYMENT_METHODS.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                              <SelectItem value="custom">{PAYMENT_CUSTOM_LABEL}</SelectItem>
                            </SelectContent>
                          </Select>
                          {paymentChoice === 'custom' && (
                            <Input
                              value={customPayment}
                              onChange={e => setCustomPayment(e.target.value)}
                              placeholder="روش پرداخت جدید"
                              className="h-7 w-36 text-xs px-2"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon" variant="outline" className="h-7 w-7"
                            onClick={() => updateQty(it.key, it.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number" min={1} value={it.quantity}
                            onChange={e => updateQty(it.key, parseInt(e.target.value, 10) || 1)}
                            className="w-14 h-7 text-center px-1"
                          />
                          <Button
                            size="icon" variant="outline" className="h-7 w-7"
                            onClick={() => updateQty(it.key, it.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-2">
                        <NumericInput
                          value={String(it.invoice_unit_price ?? '')}
                          onChange={raw => updatePrice(it.key, parseFormattedNumber(raw))}
                          className="w-28 h-7 text-center"
                        />

                      </td>
                      <td className="p-2 text-center font-medium">
                        {formatMoney(it.line_total)} ریال
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(it.key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t p-3 flex items-center justify-between bg-muted/30">
            <div className="font-bold">
              جمع کل فاکتور: {formatMoney(total)} ریال
            </div>
            <Button onClick={openConfirm} disabled={cart.length === 0}>
              <Printer className="h-4 w-4 ml-1" />
              چاپ فاکتور
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={o => !saving && setConfirmOpen(o)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تأیید چاپ فاکتور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">نام مشتری</label>
              <Input
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                placeholder="نام مشتری را وارد کنید"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">نوع چاپ *</label>
              <Select value={printFormat} onValueChange={(v: PrintFormat) => setPrintFormat(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRINT_FORMATS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">تعداد چاپ</label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon" variant="outline" className="h-9 w-9"
                  onClick={() => setCopies(c => Math.max(1, c - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number" min={1} value={copies}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setCopies(Number.isFinite(v) && v >= 1 ? v : 1);
                  }}
                  className="w-24 text-center"
                />
                <Button
                  size="icon" variant="outline" className="h-9 w-9"
                  onClick={() => setCopies(c => c + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              انصراف
            </Button>
            <Button onClick={handleConfirmPrint} disabled={saving || !customer.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Printer className="h-4 w-4 ml-1" />}
              چاپ فاکتور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoice;
