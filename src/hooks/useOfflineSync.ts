import { useEffect, useState, useCallback, useRef } from "react";
import {
  enqueueOperation, updateOperation, getPendingOperations, getAllOperations,
  pruneSyncedOlderThan, newClientOperationId, type QueuedOperation,
} from "@/lib/offlineDb";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_HEADER = "x-admin-password";
const ADMIN_PW_KEY = "admin_password_v1"; // cached admin password (locally)
const MAX_RETRIES = 3;

export type SyncPhase =
  | "idle"
  | "offline"
  | "syncing"
  | "success"
  | "failed";

function getAdminPassword(): string | null {
  try {
    return localStorage.getItem(ADMIN_PW_KEY) || "6890";
  } catch { return "6890"; }
}

export function setAdminPassword(pw: string) {
  try { localStorage.setItem(ADMIN_PW_KEY, pw); } catch { /* ignore */ }
}

async function invokeSync(ops: QueuedOperation[]): Promise<Record<string, { status: "completed" | "failed"; result?: unknown; error?: string }>> {
  const adminPw = getAdminPassword();
  if (!adminPw) throw new Error("رمز مدیر تنظیم نشده است");

  const { data, error } = await supabase.functions.invoke("sync-offline-data", {
    body: { operations: ops.map(o => ({
      client_operation_id: o.client_operation_id,
      operation_type: o.operation_type,
      payload: o.payload,
    })) },
    headers: { [ADMIN_HEADER]: adminPw },
  });
  if (error) throw error;
  const results = (data?.results ?? []) as Array<{
    client_operation_id: string; status: "completed" | "failed"; result?: unknown; error?: string;
  }>;
  const map: Record<string, { status: "completed" | "failed"; result?: unknown; error?: string }> = {};
  for (const r of results) map[r.client_operation_id] = r;
  return map;
}

export function useOfflineSync() {
  const [online, setOnline] = useState<boolean>(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const refreshPending = useCallback(async () => {
    const p = await getPendingOperations();
    setPendingCount(p.length);
  }, []);

  const processQueue = useCallback(async () => {
    if (runningRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const ops = await getPendingOperations();
    if (!ops.length) return;
    runningRef.current = true;
    setPhase("syncing");
    setLastError(null);
    try {
      // Skip ops that have exceeded max retries; leave them for manual retry.
      const attempt = ops.filter(o => (o.retry_count ?? 0) < MAX_RETRIES);
      if (!attempt.length) { setPhase("failed"); return; }
      for (const o of attempt) await updateOperation(o.client_operation_id, { status: "syncing" });

      const results = await invokeSync(attempt);
      let anyFail = false;
      for (const o of attempt) {
        const r = results[o.client_operation_id];
        if (r?.status === "completed") {
          await updateOperation(o.client_operation_id, {
            status: "synced",
            synced_at: new Date().toISOString(),
            server_result: r.result,
            last_error: undefined,
          });
        } else {
          anyFail = true;
          await updateOperation(o.client_operation_id, {
            status: "failed",
            retry_count: (o.retry_count ?? 0) + 1,
            last_error: r?.error ?? "sync failed",
          });
        }
      }
      setPhase(anyFail ? "failed" : "success");
      if (anyFail) setLastError("برخی موارد همگام نشدند");
    } catch (e) {
      setPhase("failed");
      setLastError(e instanceof Error ? e.message : "خطای همگام‌سازی");
      // Mark syncing ones back to failed for retry.
      const still = await getPendingOperations();
      for (const o of still) {
        if (o.status === "syncing") {
          await updateOperation(o.client_operation_id, {
            status: "failed",
            retry_count: (o.retry_count ?? 0) + 1,
            last_error: e instanceof Error ? e.message : "sync failed",
          });
        }
      }
    } finally {
      runningRef.current = false;
      await refreshPending();
      await pruneSyncedOlderThan(30);
    }
  }, [refreshPending]);

  // Retry on interval with backoff-ish behaviour (simple: try every 15s when pending).
  useEffect(() => {
    const goOnline = () => { setOnline(true); processQueue(); };
    const goOffline = () => { setOnline(false); setPhase("offline"); };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [processQueue]);

  useEffect(() => {
    refreshPending();
    if (online) processQueue();
    const t = setInterval(() => {
      if (navigator.onLine) processQueue();
    }, 15000);
    return () => clearInterval(t);
  }, [online, processQueue, refreshPending]);

  const queueInvoice = useCallback(async (payload: unknown) => {
    const op = await enqueueOperation({
      client_operation_id: newClientOperationId(),
      operation_type: "create_invoice",
      payload,
    });
    await refreshPending();
    if (navigator.onLine) processQueue();
    return op;
  }, [processQueue, refreshPending]);

  return {
    online,
    phase,
    pendingCount,
    lastError,
    queueInvoice,
    processQueue,
    getAllOperations,
  };
}
