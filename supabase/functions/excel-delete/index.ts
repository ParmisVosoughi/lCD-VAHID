import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";
import { corsHeaders } from "../_shared/cors.ts";

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const payload = await req.json().catch(() => null) as null | { logId?: unknown };
    const logId = typeof payload?.logId === "string" ? payload.logId.trim() : "";

    if (!logId) {
      return json({ error: "Missing logId" }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch record to find storage path.
    const { data: log, error: findError } = await admin
      .from("upload_logs")
      .select("id, storage_path")
      .eq("id", logId)
      .maybeSingle();

    if (findError) {
      console.error("excel-delete: find log error", findError);
      return json({ error: "Failed to find log", details: findError.message }, { status: 400 });
    }

    if (!log) {
      return json({ error: "Log not found" }, { status: 404 });
    }

    // 1) Delete the file from storage (must succeed).
    const { error: storageError } = await admin
      .storage
      .from("excel-files")
      .remove([log.storage_path]);

    if (storageError) {
      console.error("excel-delete: storage remove error", storageError);
      return json({
        error: "Failed to delete file from storage",
        details: storageError.message,
      }, { status: 400 });
    }

    // 2) Delete the DB record (must succeed).
    const { data: deletedRows, error: deleteError } = await admin
      .from("upload_logs")
      .delete()
      .eq("id", logId)
      .select("id");

    if (deleteError) {
      console.error("excel-delete: db delete error", deleteError);
      return json({ error: "Failed to delete log", details: deleteError.message }, { status: 400 });
    }

    if (!deletedRows || deletedRows.length !== 1) {
      // Should never happen with service role, but avoids "fake success".
      return json({ error: "Delete did not complete" }, { status: 409 });
    }

    return json({ ok: true, logId });
  } catch (e) {
    console.error("excel-delete: unexpected error", e);
    return json(
      { error: "Unexpected error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
});
