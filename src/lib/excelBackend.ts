import { supabase } from "@/integrations/supabase/client";

export type ExcelPageKey = "lcd" | "misc" | "goshi";

function getErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

export async function uploadExcelFile(params: {
  file: File;
  pageKey: ExcelPageKey;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("pageKey", params.pageKey);
    formData.append("note", params.note ?? "");

    const { data, error } = await supabase.functions.invoke("excel-upload", {
      body: formData,
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }

    if (!data?.ok) {
      return { ok: false as const, error: data?.details || data?.error || "Upload failed" };
    }

    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: getErrorMessage(e) };
  }
}

export async function deleteExcelLog(params: {
  logId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("excel-delete", {
      body: { logId: params.logId },
    });

    if (error) {
      return { ok: false as const, error: error.message };
    }

    if (!data?.ok) {
      return { ok: false as const, error: data?.details || data?.error || "Delete failed" };
    }

    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: getErrorMessage(e) };
  }
}

export async function saveExcelFile(params: {
  file: File;
  pageKey: ExcelPageKey;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("pageKey", params.pageKey);

    const { data, error } = await supabase.functions.invoke("excel-save", {
      body: formData,
    });

    if (error) return { ok: false as const, error: error.message };
    if (!data?.ok) return { ok: false as const, error: data?.details || data?.error || "Save failed" };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: getErrorMessage(e) };
  }
}

