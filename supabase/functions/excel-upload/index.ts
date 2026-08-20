import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";
import { corsHeaders } from "../_shared/cors.ts";

type PageKey = "lcd" | "misc";

function json(
  body: unknown,
  init: ResponseInit = {},
) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function sanitizeBaseName(name: string): string {
  // Keep it URL/path safe and predictable across platforms.
  // Preserve only [A-Za-z0-9_-] after normalization; collapse runs.
  const normalized = name.normalize("NFKD");
  const safe = normalized
    .replace(/\.[^/.]+$/, "") // strip extension
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return safe || "file";
}

function getExtension(fileName: string): ".xlsx" | ".xls" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xls")) return ".xls";
  return ".xlsx";
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
    const note = String(form.get("note") ?? "");

    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, { status: 400 });
    }

    if (pageKeyRaw !== "lcd" && pageKeyRaw !== "misc") {
      return json({ error: "Invalid pageKey" }, { status: 400 });
    }

    const pageKey = pageKeyRaw as PageKey;

    const originalFileName = file.name || `upload_${Date.now()}.xlsx`;
    const ext = getExtension(originalFileName);
    const base = sanitizeBaseName(originalFileName);

    const timestamp = Date.now();
    // Folder-per-page requirement (lcd/, misc/)
    const storagePath = `${pageKey}/${timestamp}_${base}${ext}`;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("excel-files")
      .upload(storagePath, bytes, {
        // Some platforms provide empty file.type; storage accepts it.
        contentType: file.type || undefined,
        // Never block uploads on rare name collisions.
        upsert: true,
      });

    if (uploadError) {
      return json(
        {
          error: "Upload failed",
          details: uploadError.message,
        },
        { status: 400 },
      );
    }

    // Insert new log entry first; if this fails we keep the previous active file intact.
    const { data: inserted, error: insertError } = await admin
      .from("upload_logs")
      .insert({
        file_name: originalFileName,
        storage_path: storagePath,
        page_key: pageKey,
        note,
        is_active: true,
      })
      .select("id")
      .maybeSingle();

    if (insertError || !inserted) {
      return json(
        { error: "Failed to create upload log", details: insertError?.message || "No row returned" },
        { status: 400 },
      );
    }

    // Deactivate previous active file(s) for this page.
    const { error: deactivateError } = await admin
      .from("upload_logs")
      .update({ is_active: false })
      .eq("page_key", pageKey)
      .neq("id", inserted.id)
      .eq("is_active", true);

    if (deactivateError) {
      return json(
        { error: "Failed to update active file", details: deactivateError.message },
        { status: 400 },
      );
    }

    return json({ ok: true, pageKey, storagePath, fileName: originalFileName });
  } catch (e) {
    return json(
      { error: "Unexpected error", details: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
});
