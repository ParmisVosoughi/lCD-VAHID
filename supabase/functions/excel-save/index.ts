import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";
import { corsHeaders } from "../_shared/cors.ts";

type PageKey = "lcd" | "misc" | "goshi";

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
    const form = await req.formData();
    const file = form.get("file");
    const pageKeyRaw = String(form.get("pageKey") ?? "");

    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, { status: 400 });
    }
    if (pageKeyRaw !== "lcd" && pageKeyRaw !== "misc" && pageKeyRaw !== "goshi") {
      return json({ error: "Invalid pageKey" }, { status: 400 });
    }
    const pageKey = pageKeyRaw as PageKey;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Find currently active file for this page
    const { data: active, error: activeError } = await admin
      .from("upload_logs")
      .select("id, storage_path, file_name")
      .eq("page_key", pageKey)
      .eq("is_active", true)
      .maybeSingle();

    if (activeError) {
      return json({ error: "Lookup failed", details: activeError.message }, { status: 400 });
    }
    if (!active) {
      return json({ error: "No active file to overwrite" }, { status: 404 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("excel-files")
      .upload(active.storage_path, bytes, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
        cacheControl: "0",
      });

    if (uploadError) {
      return json(
        { error: "Save failed", details: uploadError.message },
        { status: 400 },
      );
    }

    // Touch the log so clients can detect new version (uploaded_at changes)
    await admin
      .from("upload_logs")
      .update({ uploaded_at: new Date().toISOString() })
      .eq("id", active.id);

    return json({ ok: true, storagePath: active.storage_path });
  } catch (e) {
    return json(
      { error: "Unexpected error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
});
