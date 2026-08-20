import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, DatabaseBackup, RefreshCw, Download, Trash2, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getAllOperations } from "@/lib/offlineDb";
import type { QueuedOperation } from "@/lib/offlineDb";

interface Snapshot {
  id: string;
  snapshot_type: "manual" | "automatic";
  record_counts: Record<string, number> | null;
  size_bytes: number | null;
  status: string;
  created_at: string;
}

const ADMIN_HEADER = "x-admin-password";
const ADMIN_PW_KEY = "admin_password_v1";

function fmtBytes(n: number | null | undefined): string {
  if (!n) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function BackupAdmin() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [ops, setOps] = useState<QueuedOperation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { toast } = useToast();

  const adminPw = (() => { try { return localStorage.getItem(ADMIN_PW_KEY) || "6890"; } catch { return "6890"; } })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-snapshots", {
        body: { action: "list" },
        headers: { [ADMIN_HEADER]: adminPw },
      });
      if (error) throw error;
      setSnapshots((data?.snapshots ?? []) as Snapshot[]);
    } catch (e) {
      toast({ title: "خطا در دریافت نسخه‌های پشتیبان", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [adminPw, toast]);

  const loadOps = useCallback(async () => {
    setOps(await getAllOperations());
  }, []);

  useEffect(() => { load(); loadOps(); }, [load, loadOps]);

  const createBackup = useCallback(async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-snapshots", {
        body: { type: "manual" },
        headers: { [ADMIN_HEADER]: adminPw },
      });
      if (error) throw error;
      if (!data?.snapshot?.id) throw new Error("پاسخ نامعتبر از سرور");
      toast({ title: "نسخه پشتیبان ایجاد شد", description: `کد: ${data.snapshot.id.slice(0, 8)}` });
      await load();
    } catch (e) {
      toast({ title: "خطا در ایجاد نسخه پشتیبان", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [adminPw, load, toast]);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("backup-snapshots", {
      body,
      headers: { [ADMIN_HEADER]: adminPw },
    });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data;
  }, [adminPw]);

  const setActive = useCallback(async (s: Snapshot, active: boolean) => {
    setBusyId(s.id);
    try {
      await call({ action: active ? "activate" : "deactivate", id: s.id });
      toast({ title: active ? "نسخه پشتیبان فعال شد" : "نسخه پشتیبان غیرفعال شد" });
      await load();
    } catch (e) {
      toast({ title: "خطا در تغییر وضعیت", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusyId(null); }
  }, [call, load, toast]);

  const removeSnapshot = useCallback(async (s: Snapshot) => {
    if (!window.confirm("این نسخه پشتیبان برای همیشه حذف شود؟")) return;
    setBusyId(s.id);
    try {
      await call({ action: "delete", id: s.id });
      toast({ title: "نسخه پشتیبان حذف شد" });
      await load();
    } catch (e) {
      toast({ title: "خطا در حذف نسخه پشتیبان", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusyId(null); }
  }, [call, load, toast]);

  const downloadSnapshot = useCallback(async (s: Snapshot) => {
    setBusyId(s.id);
    try {
      const data = await call({ action: "download", id: s.id }) as { snapshot?: unknown };
      if (!data?.snapshot) throw new Error("پاسخ نامعتبر از سرور");
      const blob = new Blob([JSON.stringify(data.snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${format(new Date(s.created_at), "yyyy-MM-dd-HHmm")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "دانلود نسخه پشتیبان آغاز شد" });
    } catch (e) {
      toast({ title: "خطا در دانلود نسخه پشتیبان", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setBusyId(null); }
  }, [call, toast]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Button onClick={createBackup} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <DatabaseBackup className="h-4 w-4 ml-1" />}
          ایجاد نسخه پشتیبان
        </Button>
        <Button variant="outline" onClick={() => { load(); loadOps(); }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} />
          بارگذاری مجدد
        </Button>
      </div>

      <div>
        <h3 className="font-semibold mb-2">نسخه‌های پشتیبان</h3>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز نسخه‌ای وجود ندارد.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-right">تاریخ</th>
                  <th className="p-2 text-right">نوع</th>
                  <th className="p-2 text-right">تعداد رکورد</th>
                  <th className="p-2 text-right">حجم</th>
                  <th className="p-2 text-right">وضعیت</th>
                  <th className="p-2 text-right">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map(s => {
                  const totalRecs = s.record_counts ? Object.values(s.record_counts).reduce((a, b) => a + b, 0) : 0;
                  const isActive = s.status === "active";
                  const busy = busyId === s.id;
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2">{format(new Date(s.created_at), "yyyy-MM-dd HH:mm")}</td>
                      <td className="p-2">{s.snapshot_type === "manual" ? "دستی" : "خودکار"}</td>
                      <td className="p-2">{totalRecs}</td>
                      <td className="p-2">{fmtBytes(s.size_bytes)}</td>
                      <td className="p-2">{isActive ? "فعال" : s.status}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm" variant={isActive ? "secondary" : "outline"} className="h-7 text-xs"
                            disabled={busy}
                            onClick={() => setActive(s, !isActive)}
                          >
                            {isActive ? <PowerOff className="h-3.5 w-3.5 ml-1" /> : <Power className="h-3.5 w-3.5 ml-1" />}
                            {isActive ? "غیرفعال" : "فعال"}
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs"
                            disabled={busy}
                            onClick={() => downloadSnapshot(s)}
                          >
                            <Download className="h-3.5 w-3.5 ml-1" /> دانلود
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs text-destructive"
                            disabled={busy}
                            onClick={() => removeSnapshot(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5 ml-1" /> حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      <div>
        <h3 className="font-semibold mb-2">صف عملیات آفلاین</h3>
        {ops.length === 0 ? (
          <p className="text-sm text-muted-foreground">صف خالی است.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-right">تاریخ</th>
                  <th className="p-2 text-right">نوع</th>
                  <th className="p-2 text-right">وضعیت</th>
                  <th className="p-2 text-right">تلاش‌ها</th>
                  <th className="p-2 text-right">خطا</th>
                </tr>
              </thead>
              <tbody>
                {ops.map(o => (
                  <tr key={o.client_operation_id} className="border-t">
                    <td className="p-2">{format(new Date(o.created_at), "yyyy-MM-dd HH:mm")}</td>
                    <td className="p-2">{o.operation_type}</td>
                    <td className="p-2">{o.status}</td>
                    <td className="p-2">{o.retry_count}</td>
                    <td className="p-2 text-destructive text-xs">{o.last_error ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
