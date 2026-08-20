import React, { useState } from 'react';
import { Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useManualProducts } from '@/hooks/useManualProducts';
import { ROUNDING_UNITS } from '@/lib/currencies';

interface Props {
  /** Category whose variants are affected in the database (all matching rows, not only visible ones). */
  category: string;
}

export function ApplyPercentageButton({ category }: Props) {
  const { applyPercentageToCategory } = useManualProducts();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [percent, setPercent] = useState('');
  const [unit, setUnit] = useState('1000');
  const [manualUnit, setManualUnit] = useState('');
  const [busy, setBusy] = useState(false);

  const value = Number(percent.replace(/[^\d.]/g, ''));
  const roundUnit = unit === 'manual'
    ? Math.max(0, Math.floor(Number(manualUnit.replace(/[^\d]/g, '')) || 0))
    : Number(unit);
  const valid = Number.isFinite(value) && value > 0 && (unit !== 'manual' || manualUnit.trim() !== '');

  const handleApply = async () => {
    if (!valid) return;
    setBusy(true);
    const res = await applyPercentageToCategory(category, direction, value, roundUnit);

    setBusy(false);
    if (res.ok) {
      toast({ title: `${res.updated ?? 0} قیمت با موفقیت به‌روزرسانی شد.` });
      setOpen(false);
      setPercent('');
    } else {
      toast({ title: `خطا در اعمال درصد: ${res.error ?? 'نامشخص'}`, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 shrink-0">
          <Percent className="h-4 w-4" />
          <span className="text-xs">اعمال درصد</span>
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-right">اعمال درصد روی کل محصولات</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">عملیات</label>
            <Select value={direction} onValueChange={(v: 'increase' | 'decrease') => setDirection(v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">افزایش</SelectItem>
                <SelectItem value="decrease">کاهش</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">درصد</label>
            <Input
              inputMode="decimal"
              value={percent}
              onChange={e => setPercent(e.target.value)}
              placeholder="مثال: ۱۰"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">واحد رند کردن (رو به بالا)</label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROUNDING_UNITS.map(u => (
                  <SelectItem key={u} value={String(u)}>
                    {u === 0 ? '۰ (بدون رند کردن)' : `${u.toLocaleString('en-US')} ریال`}
                  </SelectItem>
                ))}
                <SelectItem value="manual">دستی</SelectItem>
              </SelectContent>
            </Select>
            {unit === 'manual' && (
              <Input
                inputMode="numeric"
                value={manualUnit}
                onChange={e => setManualUnit(e.target.value)}
                placeholder="واحد رند کردن دلخواه (ریال)"
                className="h-9 text-sm mt-2"
              />
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            این عملیات روی تمام قیمت‌های ذخیره‌شده این دسته در پایگاه داده اعمال می‌شود، نه فقط موارد نمایش‌داده‌شده.
          </p>
        </div>

        <DialogFooter className="flex-row-reverse sm:flex-row-reverse sm:justify-start gap-2">
          <Button onClick={handleApply} disabled={!valid || busy}>
            {busy ? 'در حال اعمال…' : 'تأیید و اعمال'}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>انصراف</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
