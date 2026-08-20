// Sync offline operations queued from the browser to Supabase.
// Gated by ADMIN_PASSWORD header. Idempotent via client_operation_id.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type OpType = "create_invoice";
interface Operation {
  client_operation_id: string;
  operation_type: OpType;
  payload: Record<string, unknown>;
}
interface OpResult {
  client_operation_id: string;
  status: "completed" | "failed";
  result?: unknown;
  error?: string;
}

function isUuid(s: unknown): s is string {
  return typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function validateCreateInvoicePayload(p: any): string | null {
  if (!p || typeof p !== "object") return "invalid payload";
  const required = [
    "invoice_number", "customer_name", "total_amount",
    "jalali_date", "gregorian_date", "printed_time", "print_copies", "items",
  ];
  for (const k of required) if (!(k in p)) return `missing field: ${k}`;
  if (!Array.isArray(p.items)) return "items must be an array";
  if (typeof p.customer_name !== "string" || !p.customer_name.trim()) return "invalid customer_name";
  if (typeof p.invoice_number !== "string" || !p.invoice_number.trim()) return "invalid invoice_number";
  if (typeof p.total_amount !== "number" || !Number.isFinite(p.total_amount)) return "invalid total_amount";
  if (typeof p.print_copies !== "number" || p.print_copies < 1) return "invalid print_copies";
  for (const [i, it] of p.items.entries()) {
    if (!it || typeof it !== "object") return `items[${i}] invalid`;
    if (typeof it.product_title !== "string") return `items[${i}].product_title invalid`;
    if (typeof it.variant_name !== "string") return `items[${i}].variant_name invalid`;
    if (typeof it.quantity !== "number" || it.quantity < 1) return `items[${i}].quantity invalid`;
    if (typeof it.invoice_unit_price !== "number") return `items[${i}].invoice_unit_price invalid`;
    if (typeof it.line_total !== "number") return `items[${i}].line_total invalid`;
  }
  return null;
}

async function processCreateInvoice(sb: ReturnType<typeof createClient>, payload: any) {
  const { items, ...header } = payload;
  const { data: inv, error: e1 } = await sb
    .from("invoices")
    .insert(header)
    .select("*")
    .single();
  if (e1 || !inv) throw new Error(e1?.message ?? "insert failed");

  if (items.length) {
    const rows = items.map((it: any, i: number) => ({
      invoice_id: inv.id,
      product_id: it.product_id ?? null,
      variant_id: it.variant_id ?? null,
      product_title: it.product_title,
      variant_name: it.variant_name,
      quantity: it.quantity,
      original_product_price: it.original_product_price ?? it.invoice_unit_price,
      invoice_unit_price: it.invoice_unit_price,
      line_total: it.line_total,
      item_category: it.item_category ?? null,
      display_order: i,
    }));
    const { error: e2 } = await sb.from("invoice_items").insert(rows);
    if (e2) {
      // Roll back the invoice header atomically
      await sb.from("invoices").delete().eq("id", inv.id);
      throw new Error(e2.message);
    }
  }
  return { invoice_id: inv.id, invoice_number: inv.invoice_number };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminHeader = req.headers.get("x-admin-password") ?? "";
  if (!ADMIN_PASSWORD || adminHeader !== ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { operations?: Operation[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ops = Array.isArray(body?.operations) ? body.operations : [];
  if (!ops.length) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: OpResult[] = [];

  for (const op of ops) {
    if (!isUuid(op?.client_operation_id)) {
      results.push({ client_operation_id: String(op?.client_operation_id ?? ""), status: "failed", error: "invalid client_operation_id" });
      continue;
    }

    // Idempotency: if we already completed this op, return prior result.
    const { data: existing } = await sb
      .from("sync_queue")
      .select("id,status,result,error_message")
      .eq("client_operation_id", op.client_operation_id)
      .maybeSingle();

    if (existing?.status === "completed") {
      results.push({
        client_operation_id: op.client_operation_id,
        status: "completed",
        result: existing.result,
      });
      continue;
    }

    // Upsert as processing
    let queueId: string;
    if (existing) {
      queueId = existing.id as string;
      await sb.from("sync_queue")
        .update({ status: "processing", retry_count: 0, error_message: null })
        .eq("id", queueId);
    } else {
      const { data: q, error: qe } = await sb.from("sync_queue")
        .insert({
          client_operation_id: op.client_operation_id,
          operation_type: op.operation_type,
          payload: op.payload,
          status: "processing",
        })
        .select("id")
        .single();
      if (qe || !q) {
        results.push({ client_operation_id: op.client_operation_id, status: "failed", error: "queue insert failed" });
        continue;
      }
      queueId = q.id as string;
    }

    try {
      if (op.operation_type !== "create_invoice") {
        throw new Error(`unsupported operation_type: ${op.operation_type}`);
      }
      const err = validateCreateInvoicePayload(op.payload);
      if (err) throw new Error(err);

      const result = await processCreateInvoice(sb, op.payload);

      await sb.from("sync_queue").update({
        status: "completed",
        result,
        processed_at: new Date().toISOString(),
      }).eq("id", queueId);

      results.push({ client_operation_id: op.client_operation_id, status: "completed", result });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      await sb.from("sync_queue").update({
        status: "failed",
        error_message: msg,
        retry_count: ((existing?.retry_count as number) ?? 0) + 1,
        processed_at: new Date().toISOString(),
      }).eq("id", queueId);
      // Do NOT leak internal details beyond a short message.
      results.push({ client_operation_id: op.client_operation_id, status: "failed", error: msg });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
