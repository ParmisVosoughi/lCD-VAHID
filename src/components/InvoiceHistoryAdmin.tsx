import React, { useMemo, useState } from 'react';
import { Eye, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import { formatMoney, toFaDigits } from '@/lib/invoiceUtils';
import { printInvoice, getPrintFormatLabel } from '@/lib/printInvoice';

const PAGE_SIZE = 15;

export function InvoiceHistoryAdmin() {
  const { invoices, isLoading } = useInvoices();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return invoices.filter(inv => {
      if (query && !inv.invoice_number.toLowerCase().includes(query)
        && !inv.customer_name.toLowerCase().includes(query)) return false;
      if (from && inv.jalali_date < from) return false;
      if (to && inv.jalali_date > to) return false;
      return true;
    });
  }, [invoices, q, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="جستجو شماره فاکتور یا نام مشتری"
            className="pr-9"
          />
        </div>
        <Input
          placeholder="از تاریخ شمسی (1403/01/01)"
          value={from}
          onChange={e => { setFrom(e.target.value); setPage(1); }}
        />
        <Input
          placeholder="تا تاریخ شمسی (1403/12/29)"
          value={to}
          onChange={e => { setTo(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-6">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-6">فاکتوری یافت نشد</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2">شماره فاکتور</th>
                <th className="p-2">نام مشتری</th>
                <th className="p-2">تاریخ شمسی</th>
                <th className="p-2">ساعت</th>
                <th className="p-2">روش پرداخت</th>
                <th className="p-2">مبلغ کل</th>
                <th className="p-2">تعداد اقلام</th>
                <th className="p-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(inv => (
                <tr key={inv.id} className="border-t">
                  <td className="p-2 text-center">{inv.invoice_number}</td>
                  <td className="p-2">{inv.customer_name}</td>
                  <td className="p-2 text-center">{toFaDigits(inv.jalali_date)}</td>
                  <td className="p-2 text-center">{toFaDigits(inv.printed_time)}</td>
                  <td className="p-2 text-center">{inv.payment_method?.trim() || '—'}</td>
                  <td className="p-2 text-center">{formatMoney(inv.total_amount)} ریال</td>
                  <td className="p-2 text-center">{toFaDigits(inv.invoice_items?.length ?? 0)}</td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setDetail(inv)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => printInvoice(inv, inv.print_copies || 1)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}>قبلی</Button>
          <span className="text-sm py-2">
            صفحه {toFaDigits(page)} از {toFaDigits(pageCount)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount}
            onClick={() => setPage(p => p + 1)}>بعدی</Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات فاکتور {detail?.invoice_number}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><b>نام مشتری:</b> {detail.customer_name}</div>
                <div><b>تاریخ شمسی:</b> {toFaDigits(detail.jalali_date)}</div>
                <div><b>تاریخ میلادی:</b> {detail.gregorian_date}</div>
                <div><b>ساعت:</b> {toFaDigits(detail.printed_time)}</div>
                <div><b>تعداد چاپ:</b> {toFaDigits(detail.print_copies)}</div>
                <div><b>نوع چاپ:</b> {getPrintFormatLabel(detail.print_format)}</div>
                <div><b>روش پرداخت:</b> {detail.payment_method?.trim() || '—'}</div>
              </div>
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2">ردیف</th>
                      <th className="p-2">نام محصول</th>
                      <th className="p-2">ویژگی</th>
                      <th className="p-2">تعداد</th>
                      <th className="p-2">قیمت واحد</th>
                      <th className="p-2">مبلغ کل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.invoice_items ?? [])
                      .slice()
                      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                      .map((it, i) => (
                      <tr key={it.id ?? i} className="border-t">
                        <td className="p-2 text-center">{toFaDigits(i + 1)}</td>
                        <td className="p-2">{it.product_title}</td>
                        <td className="p-2">{it.variant_name}</td>
                        <td className="p-2 text-center">{toFaDigits(it.quantity)}</td>
                        <td className="p-2 text-center">{formatMoney(it.invoice_unit_price)} ریال</td>
                        <td className="p-2 text-center">{formatMoney(it.line_total)} ریال</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-left font-bold">
                جمع کل فاکتور: {formatMoney(detail.total_amount)} ریال
              </div>
              <div className="flex justify-end">
                <Button onClick={() => printInvoice(detail, detail.print_copies || 1)}>
                  <Printer className="h-4 w-4 ml-1" />
                  چاپ مجدد
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
