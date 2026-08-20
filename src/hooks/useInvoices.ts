import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string;
  variant_name: string;
  quantity: number;
  original_product_price: number;
  invoice_unit_price: number;
  line_total: number;
  item_category?: string | null;
  display_order?: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total_amount: number;
  jalali_date: string;
  gregorian_date: string;
  printed_time: string;
  print_copies: number;
  print_format?: string | null;
  payment_method?: string | null;
  status: string;
  created_at: string;
  invoice_items?: InvoiceItem[];
}

const KEY = ['invoices'] as const;

async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices' as never)
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Invoice[];
}

export function useInvoices() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: fetchInvoices,
    staleTime: 10_000,
  });

  const create = useMutation({
    mutationFn: async (payload: {
      invoice_number: string;
      customer_name: string;
      total_amount: number;
      jalali_date: string;
      gregorian_date: string;
      printed_time: string;
      print_copies: number;
      print_format: string;
      payment_method: string | null;
      items: InvoiceItem[];
    }): Promise<Invoice> => {
      const { items, ...header } = payload;
      const { data: inv, error: e1 } = await supabase
        .from('invoices' as never)
        .insert(header as never)
        .select('*')
        .single();
      if (e1 || !inv) throw e1 ?? new Error('insert failed');
      const invoice = inv as unknown as Invoice;

      if (items.length) {
        const rows = items.map((it, i) => ({
          invoice_id: invoice.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          product_title: it.product_title,
          variant_name: it.variant_name,
          quantity: it.quantity,
          original_product_price: it.original_product_price,
          invoice_unit_price: it.invoice_unit_price,
          line_total: it.line_total,
          item_category: it.item_category ?? null,
          display_order: i,
        }));
        const { data: itemsData, error: e2 } = await supabase
          .from('invoice_items' as never)
          .insert(rows as never)
          .select('*');
        if (e2) {
          await supabase.from('invoices' as never).delete().eq('id', invoice.id);
          throw e2;
        }
        invoice.invoice_items = (itemsData ?? []) as unknown as InvoiceItem[];
      } else {
        invoice.invoice_items = [];
      }
      return invoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices' as never).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
    createInvoice: create.mutateAsync,
    isCreating: create.isPending,
    deleteInvoice: remove.mutateAsync,
  };
}
