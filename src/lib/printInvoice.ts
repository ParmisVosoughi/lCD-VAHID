import { Invoice, InvoiceItem } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney, toFaDigits } from './invoiceUtils';

const ADDRESS = 'اصفهان، میدان احمد آباد، خیابان احمد آباد، کوچه شماره ۵۴، موبایل وحید';

export type PrintFormat = 'a4' | 'a5' | 'thermal80';

export const PRINT_FORMATS: { value: PrintFormat; label: string }[] = [
  { value: 'a4', label: 'A4' },
  { value: 'a5', label: 'A5' },
  { value: 'thermal80', label: 'رسید حرارتی ۸ سانتی‌متر' },
];

export const DEFAULT_PRINT_FORMAT: PrintFormat = 'thermal80';

export const getPrintFormatLabel = (v: string | null | undefined): string =>
  PRINT_FORMATS.find(f => f.value === v)?.label ?? PRINT_FORMATS[2].label;

function normalizeFormat(v: string | null | undefined): PrintFormat {
  return v === 'a4' || v === 'a5' || v === 'thermal80' ? v : DEFAULT_PRINT_FORMAT;
}

function escapeHtml(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function itemName(it: InvoiceItem): string {
  const cat = (it.item_category ?? '').trim();
  return cat ? `${cat} ${it.product_title}` : it.product_title;
}

/* ------------------------- A4 / A5 (table layout) ------------------------ */

function buildPagedCopy(invoice: Invoice, items: InvoiceItem[]): string {
  const rowsHtml = items
    .map((it, i) => `
      <tr>
        <td>${toFaDigits(i + 1)}</td>
        <td>${escapeHtml(itemName(it))}</td>
        <td>${escapeHtml(it.variant_name)}</td>
        <td>${toFaDigits(it.quantity)}</td>
        <td>${formatMoney(it.invoice_unit_price)} ریال</td>
        <td>${formatMoney(it.line_total)} ریال</td>
      </tr>`)
    .join('');

  const payment = (invoice.payment_method ?? '').trim();

  return `
    <section class="invoice-copy">
      <header class="invoice-header">
        <h1>فاکتور فروش</h1>
        <div class="meta">
          <div>تاریخ شمسی: ${toFaDigits(invoice.jalali_date)}</div>
          <div>تاریخ میلادی: ${escapeHtml(invoice.gregorian_date)}</div>
          <div>ساعت: ${toFaDigits(invoice.printed_time)}</div>
        </div>
        <div class="address">${ADDRESS}</div>
        <div class="invoice-number">شماره فاکتور: ${escapeHtml(invoice.invoice_number)}</div>
        <hr />
        <div class="customer">نام خریدار: ${escapeHtml(invoice.customer_name)}</div>
        ${payment ? `<div class="customer">روش پرداخت: ${escapeHtml(payment)}</div>` : ''}
      </header>
      <table class="invoice-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>نام محصول</th>
            <th>ویژگی</th>
            <th>تعداد</th>
            <th>قیمت واحد</th>
            <th>مبلغ کل</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="grand-total">جمع کل فاکتور: ${formatMoney(invoice.total_amount)} ریال</div>
    </section>
  `;
}

function pagedStyles(format: 'a4' | 'a5'): string {
  const isA4 = format === 'a4';
  return `
  @page { size: ${isA4 ? 'A4' : 'A5'} portrait; margin: ${isA4 ? '12mm' : '8mm'}; }
  * { box-sizing: border-box; }
  body {
    font-family: "B Nazanin", "IRANSans", "Tahoma", "Vazirmatn", sans-serif;
    color: #000; background: #fff; margin: 0; padding: 0;
    direction: rtl; font-size: ${isA4 ? '13pt' : '10pt'};
  }
  .invoice-copy { page-break-after: always; padding: ${isA4 ? '4mm' : '2mm'} 0; }
  .invoice-copy:last-child { page-break-after: auto; }
  .invoice-header { text-align: center; margin-bottom: ${isA4 ? '8mm' : '4mm'}; }
  .invoice-header h1 { font-size: ${isA4 ? '24pt' : '16pt'}; margin: 0 0 ${isA4 ? '4mm' : '2mm'}; font-weight: bold; }
  .invoice-header .meta { display: flex; justify-content: center; flex-wrap: wrap; gap: ${isA4 ? '10mm' : '5mm'}; font-size: ${isA4 ? '12pt' : '9pt'}; margin-bottom: 2mm; }
  .invoice-header .address { font-size: ${isA4 ? '12pt' : '9pt'}; margin: 2mm 0; }
  .invoice-header .invoice-number { font-size: ${isA4 ? '11pt' : '9pt'}; margin-top: 1mm; }
  .invoice-header hr { border: none; border-top: 1px solid #000; margin: ${isA4 ? '4mm' : '2mm'} 0; }
  .invoice-header .customer { text-align: right; font-size: ${isA4 ? '13pt' : '10pt'}; font-weight: bold; }
  .invoice-table { width: 100%; border-collapse: collapse; margin-top: ${isA4 ? '4mm' : '2mm'}; font-size: ${isA4 ? '12pt' : '9pt'}; }
  .invoice-table th, .invoice-table td {
    border: 1px solid #000; padding: ${isA4 ? '6px 8px' : '3px 4px'}; text-align: center;
    page-break-inside: avoid; word-wrap: break-word; overflow-wrap: anywhere;
  }
  .invoice-table thead { display: table-header-group; }
  .invoice-table tr { page-break-inside: avoid; }
  .invoice-table th { background: #eee; font-weight: bold; }
  .grand-total {
    margin-top: ${isA4 ? '6mm' : '3mm'}; padding: ${isA4 ? '4mm' : '2mm'}; border: 2px solid #000;
    text-align: left; font-size: ${isA4 ? '14pt' : '11pt'}; font-weight: bold;
  }`;
}

/* --------------------------- Thermal 80mm ------------------------------- */

function buildThermalCopy(
  invoice: Invoice,
  items: InvoiceItem[],
  thumbs: Record<string, string> = {},
): string {
  const payment = (invoice.payment_method ?? '').trim();
  const blocks = items
    .map((it, i) => {
      const thumb = it.product_id ? thumbs[it.product_id] : undefined;
      return `
      <div class="r-item">
        <div class="r-item-head">
          ${thumb ? `<img class="r-thumb" src="${escapeHtml(thumb)}" alt="" onerror="this.style.display='none'" />` : ''}
          <div class="r-item-title">${toFaDigits(i + 1)}. ${escapeHtml(itemName(it))}${
            it.variant_name ? ` — ${escapeHtml(it.variant_name)}` : ''
          }</div>
        </div>
        <div class="r-item-line">
          <span>${toFaDigits(it.quantity)} × ${formatMoney(it.invoice_unit_price)}</span>
          <span>${formatMoney(it.line_total)} ریال</span>
        </div>
      </div>`;
    })
    .join('');

  return `
    <section class="receipt">
      <div class="r-title">فاکتور فروش</div>
      <div class="r-address">${ADDRESS}</div>
      <div class="r-sep"></div>
      <div class="r-line"><span>شماره فاکتور:</span><span>${escapeHtml(invoice.invoice_number)}</span></div>
      <div class="r-line"><span>تاریخ:</span><span>${toFaDigits(invoice.jalali_date)}</span></div>
      <div class="r-line"><span>ساعت:</span><span>${toFaDigits(invoice.printed_time)}</span></div>
      <div class="r-line"><span>نام مشتری:</span><span>${escapeHtml(invoice.customer_name)}</span></div>
      ${payment ? `<div class="r-line"><span>روش پرداخت:</span><span>${escapeHtml(payment)}</span></div>` : ''}
      <div class="r-sep"></div>
      ${blocks}
      <div class="r-sep"></div>
      <div class="r-total"><span>جمع کل:</span><span>${formatMoney(invoice.total_amount)} ریال</span></div>
      <div class="r-foot">با تشکر از خرید شما</div>
    </section>
  `;
}

const THERMAL_STYLES = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; max-width: 100%; }
  html, body { width: 100%; max-width: 100%; margin: 0; padding: 0; overflow-x: hidden; }
  body {
    font-family: "B Nazanin", "IRANSans", "Tahoma", "Vazirmatn", sans-serif;
    color: #000; background: #fff; direction: rtl; font-size: 10pt; line-height: 1.35;
    word-wrap: break-word; overflow-wrap: anywhere; word-break: break-word;
  }
  .receipt {
    width: 100%; max-width: 100%; overflow: hidden;
    padding: 0 0 3mm; page-break-after: always;
  }
  .receipt:last-child { page-break-after: auto; }
  .r-title { text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 0; }
  .r-address { text-align: center; font-size: 8pt; line-height: 1.25; }
  .r-sep { border-top: 1px dashed #000; margin: 0.5mm 0; width: 100%; }
  .r-line, .r-item-line, .r-total {
    display: flex; justify-content: space-between; gap: 2mm;
    width: 100%; max-width: 100%; font-size: 9.5pt;
  }
  .r-line { line-height: 1.25; }
  .r-line > span:first-child { flex: 0 0 auto; font-weight: bold; }
  .r-line > span:last-child { flex: 1 1 auto; text-align: left; overflow-wrap: anywhere; }
  .r-item { width: 100%; max-width: 100%; margin-bottom: 1.5mm; page-break-inside: avoid; }
  .r-item-head { display: flex; flex-direction: row-reverse; align-items: flex-start; gap: 1.5mm; width: 100%; max-width: 100%; }
  .r-thumb {
    flex: 0 0 44px; width: 44px; height: 44px; max-width: 44px;
    object-fit: contain; overflow: hidden; border: 1px solid #ccc; border-radius: 2px;
  }
  .r-item-title { flex: 1 1 auto; min-width: 0; font-size: 9.5pt; font-weight: bold; overflow-wrap: anywhere; }
  .r-item-line { font-size: 9pt; }
  .r-item-line > span { overflow-wrap: anywhere; }
  .r-total { font-size: 11pt; font-weight: bold; border-top: 1px solid #000; padding-top: 1.5mm; }
  .r-foot { text-align: center; font-size: 8.5pt; margin-top: 2mm; }
`;

/* ------------------------------ Entrypoint ------------------------------ */

export function printInvoice(invoice: Invoice, copies: number) {
  const format = normalizeFormat(invoice.print_format);
  const items = (invoice.invoice_items ?? []).slice().sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const copyCount = Math.max(1, Math.floor(copies) || 1);
  const styles = format === 'thermal80' ? THERMAL_STYLES : pagedStyles(format);

  const w = window.open('', '_blank');
  if (!w) {
    alert('لطفاً اجازه باز شدن پنجره جدید (Popup) را برای چاپ بدهید.');
    return;
  }

  const render = (thumbs: Record<string, string>) => {
    const copyBlocks = Array.from({ length: copyCount })
      .map(() =>
        format === 'thermal80'
          ? buildThermalCopy(invoice, items, thumbs)
          : buildPagedCopy(invoice, items),
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(invoice.invoice_number)}</title>
<style>${styles}</style>
</head>
<body>
${copyBlocks}
<script>
  window.onload = function () {
    setTimeout(function () { window.focus(); window.print(); }, 400);
  };
</script>
</body>
</html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const productIds = Array.from(
    new Set(items.map(i => i.product_id).filter((v): v is string => !!v)),
  );

  if (format !== 'thermal80' || productIds.length === 0) {
    render({});
    return;
  }

  // Thermal receipts show the product thumbnail; fetch only what the items need.
  supabase
    .from('products')
    .select('id, thumbnail_url, show_thumbnail')
    .in('id', productIds)
    .then(({ data }) => {
      const thumbs: Record<string, string> = {};
      (data ?? []).forEach((p: any) => {
        if (p.show_thumbnail && p.thumbnail_url) thumbs[p.id] = p.thumbnail_url;
      });
      render(thumbs);
    })
    .then(undefined, () => render({}));
}
