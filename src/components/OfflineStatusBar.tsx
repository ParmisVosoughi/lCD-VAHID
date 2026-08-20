import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineStatusBar({ className }: { className?: string }) {
  const { online, phase, pendingCount, lastError } = useOfflineSync();

  let label = "";
  let Icon = Cloud;
  let tone = "bg-muted text-muted-foreground";

  if (!online) { label = "آفلاین"; Icon = CloudOff; tone = "bg-amber-500/15 text-amber-600 dark:text-amber-400"; }
  else if (phase === "syncing") { label = "در حال همگام‌سازی"; Icon = Loader2; tone = "bg-primary/10 text-primary"; }
  else if (phase === "failed") { label = lastError ?? "همگام‌سازی ناموفق بود؛ اطلاعات محلی محفوظ است"; Icon = AlertTriangle; tone = "bg-destructive/10 text-destructive"; }
  else if (pendingCount > 0) { label = `در انتظار همگام‌سازی: ${pendingCount}`; Icon = Cloud; tone = "bg-primary/10 text-primary"; }
  else if (phase === "success") { label = "همگام‌سازی کامل شد"; Icon = CheckCircle2; tone = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"; }
  else return null;

  return (
    <div
      dir="rtl"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", phase === "syncing" && "animate-spin")} />
      <span>{label}</span>
    </div>
  );
}
