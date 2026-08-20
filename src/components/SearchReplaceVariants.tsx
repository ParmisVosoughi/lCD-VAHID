import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, Search, Replace as ReplaceIcon, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useManualProducts } from '@/hooks/useManualProducts';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORIES, CategoryKey } from '@/lib/categories';

type ScopeType = 'all' | 'category' | 'product';

interface PreviewRow {
  variant_id: string;
  product_id: string;
  product_title: string;
  old_name: string;
  new_name: string;
}

export function SearchReplaceVariants() {
  const { toast } = useToast();
  const { products } = useManualProducts();
  const qc = useQueryClient();

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [scopeCategory, setScopeCategory] = useState<CategoryKey>(CATEGORIES[0].key);
  const [scopeProduct, setScopeProduct] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const scopeValue = useMemo(() => {
    if (scopeType === 'category') return scopeCategory;
    if (scopeType === 'product') return scopeProduct;
    return null;
  }, [scopeType, scopeCategory, scopeProduct]);

  const canRun = findText.trim().length > 0 &&
    (scopeType !== 'product' || !!scopeProduct);

  const runPreview = useCallback(async () => {
    if (!canRun) return;
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> }).rpc('preview_variant_replace', {
        p_old: findText,
        p_new: replaceText,
        p_case_sensitive: caseSensitive,
        p_scope_type: scopeType,
        p_scope_value: scopeValue,
      });
      if (error) throw error;
      setPreview((data ?? []) as PreviewRow[]);
    } catch (e) {
      toast({
        title: 'Preview failed',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [findText, replaceText, caseSensitive, scopeType, scopeValue, canRun, toast]);

  const openConfirm = useCallback(async () => {
    if (!canRun) return;
    if (showPreview && !preview) {
      await runPreview();
    }
    setConfirmOpen(true);
  }, [canRun, showPreview, preview, runPreview]);

  const applyReplace = useCallback(async () => {
    setApplying(true);
    try {
      const { data, error } = await (supabase as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> }).rpc('apply_variant_replace', {
        p_old: findText,
        p_new: replaceText,
        p_case_sensitive: caseSensitive,
        p_scope_type: scopeType,
        p_scope_value: scopeValue,
      });
      if (error) throw error;
      const affected = Number(data ?? 0);

      await supabase.from('variant_replace_logs' as never).insert({
        old_text: findText,
        new_text: replaceText,
        scope_type: scopeType,
        scope_value: scopeValue,
        case_sensitive: caseSensitive,
        affected_count: affected,
        admin_user: 'admin',
      } as never);

      toast({ title: `${affected.toLocaleString('en-US')} مورد با موفقیت تغییر کرد` });
      setPreview(null);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ['manual_products'] });
    } catch (e) {
      toast({
        title: 'Replace failed',
        description: e instanceof Error ? e.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  }, [findText, replaceText, caseSensitive, scopeType, scopeValue, toast, qc]);

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <div className="flex items-center gap-2">
        <ReplaceIcon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">جستجو و جایگزینی (Search &amp; Replace)</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">متن قدیمی (Find) *</label>
          <Input
            value={findText}
            onChange={e => { setFindText(e.target.value); setPreview(null); }}
            placeholder="e.g. Flat Power"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">متن جدید (Replace With) *</label>
          <Input
            value={replaceText}
            onChange={e => { setReplaceText(e.target.value); setPreview(null); }}
            placeholder="e.g. Flat Finger"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">Scope</label>
          <Select value={scopeType} onValueChange={(v: ScopeType) => { setScopeType(v); setPreview(null); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="category">Selected Category</SelectItem>
              <SelectItem value="product">Selected Product Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {scopeType === 'category' && (
          <div>
            <label className="text-sm font-medium block mb-1">Category</label>
            <Select value={scopeCategory} onValueChange={(v: CategoryKey) => { setScopeCategory(v); setPreview(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        {scopeType === 'product' && (
          <div>
            <label className="text-sm font-medium block mb-1">Product</label>
            <Select value={scopeProduct} onValueChange={(v) => { setScopeProduct(v); setPreview(null); }}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={caseSensitive} onCheckedChange={setCaseSensitive} />
          Case-sensitive
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showPreview} onCheckedChange={setShowPreview} />
          پیش‌نمایش تغییرات
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={runPreview} disabled={!canRun || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
          Preview
        </Button>
        <Button onClick={openConfirm} disabled={!canRun || loading}>
          <Search className="h-4 w-4 mr-1" />
          Replace
        </Button>
      </div>

      {preview && (
        <div className="border rounded-md overflow-hidden">
          <div className="bg-muted px-3 py-2 text-sm font-medium">
            {preview.length.toLocaleString('en-US')} variant{preview.length === 1 ? '' : 's'} affected
          </div>
          {preview.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Before</th>
                    <th className="p-2 text-left">After</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(r => (
                    <tr key={r.variant_id} className="border-t">
                      <td className="p-2">{r.product_title}</td>
                      <td className="p-2 text-muted-foreground line-through">{r.old_name}</td>
                      <td className="p-2 font-medium text-primary">{r.new_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={o => !applying && setConfirmOpen(o)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید جایگزینی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید؟ این تغییر روی{' '}
              <strong>{(preview?.length ?? '?').toString()}</strong> مورد اعمال می‌شود.
              <br />
              <span className="text-xs">
                "{findText}" → "{replaceText}"
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>خیر</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); applyReplace(); }} disabled={applying}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              بله، اعمال کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
