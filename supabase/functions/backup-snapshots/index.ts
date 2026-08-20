// Create/list/activate/deactivate/delete/download backup snapshots.
// Gated by the ADMIN_PASSWORD header.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Every application table that must be present in a disaster-recovery backup. */
const BACKUP_TABLES = [
  "products",
  "product_variants",
  "product_price_history",
  "invoices",
  "invoice_items",
  "daily_currency_rates",
  "market_rates",
  "market_rate_history",
  "variant_presets",
  "variant_replace_logs",
  "upload_logs",
  "sync_queue",
] as const;

const LIST_COLUMNS =
  "id, snapshot_type, record_counts, size_bytes, checksum, status, created_at";

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function sb() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

/** Full dump of every application table (paged so large tables are complete). */
async function buildSnapshot(client: ReturnType<typeof createClient>) {
  const data: Record<string, unknown> = { taken_at: new Date().toISOString() };
  const counts: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    const rows: unknown[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: page, error } = await client
        .from(table)
        .select("*")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(page ?? []));
      if (!page || page.length < pageSize) break;
    }
    data[table] = rows;
    counts[table] = rows.length;
  }

  return { data, counts };
}

async function createSnapshot(type: "manual" | "automatic") {
  const client = sb();
  const { data, counts } = await buildSnapshot(client);
  const serialized = JSON.stringify(data);
  const checksum = await sha256(serialized);
  const size_bytes = new TextEncoder().encode(serialized).length;

  const { data: rec, error } = await client.from("backup_snapshots").insert({
    snapshot_type: type,
    snapshot_data: data,
    record_counts: counts,
    size_bytes,
    checksum,
    status: "completed",
  }).select(LIST_COLUMNS).single();
  if (error) throw new Error(error.message);

  // Retention: keep newest 30 automatic backups (never drop an activated one).
  if (type === "automatic") {
    const { data: autos } = await client
      .from("backup_snapshots")
      .select("id, status")
      .eq("snapshot_type", "automatic")
      .order("created_at", { ascending: false });
    const excess = (autos ?? [])
      .slice(30)
      .filter(r => r.status !== "active")
      .map(r => r.id);
    if (excess.length) {
      await client.from("backup_snapshots").delete().in("id", excess);
    }
  }
  return rec;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminHeader = req.headers.get("x-admin-password") ?? "";
  if (!ADMIN_PASSWORD || adminHeader !== ADMIN_PASSWORD) {
    return json({ error: "دسترسی غیرمجاز: رمز مدیر نامعتبر است." }, 401);
  }

  const url = new URL(req.url);
  let bodyJson: Record<string, unknown> | null = null;
  try { bodyJson = await req.json(); } catch { /* no body */ }
  const action = String(bodyJson?.action ?? url.searchParams.get("action") ?? "create");
  const id = (bodyJson?.id ?? url.searchParams.get("id")) as string | null;

  try {
    const client = sb();

    if (action === "list") {
      const { data, error } = await client
        .from("backup_snapshots")
        .select(LIST_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return json({ snapshots: data ?? [] });
    }

    if (action === "download") {
      if (!id) throw new Error("شناسه نسخه پشتیبان ارسال نشده است.");
      const { data, error } = await client
        .from("backup_snapshots")
        .select("id, snapshot_type, snapshot_data, record_counts, checksum, created_at")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return json({ snapshot: data });
    }

    if (action === "delete") {
      if (!id) throw new Error("شناسه نسخه پشتیبان ارسال نشده است.");
      const { error } = await client.from("backup_snapshots").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true, id });
    }

    if (action === "activate" || action === "deactivate") {
      if (!id) throw new Error("شناسه نسخه پشتیبان ارسال نشده است.");
      if (action === "activate") {
        // Only one snapshot can be active at a time.
        const { error: clearErr } = await client
          .from("backup_snapshots")
          .update({ status: "completed" })
          .eq("status", "active");
        if (clearErr) throw new Error(clearErr.message);
      }
      const { error } = await client
        .from("backup_snapshots")
        .update({ status: action === "activate" ? "active" : "completed" })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return json({ ok: true, id, status: action === "activate" ? "active" : "completed" });
    }

    const type: "manual" | "automatic" = bodyJson?.type === "automatic" ? "automatic" : "manual";
    const rec = await createSnapshot(type);
    return json({ snapshot: rec });
  } catch (e) {
    const msg = `خطا در عملیات پشتیبان‌گیری: ${e instanceof Error ? e.message : "خطای ناشناخته"}`;
    return json({ error: msg }, 500);
  }
});
