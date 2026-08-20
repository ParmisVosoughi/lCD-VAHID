// Local IndexedDB cache + offline operation queue.
// Supabase is the source of truth. This file only manages a temporary local queue
// and a read-only cache used when offline.
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "lcdvahid-offline";
const DB_VERSION = 1;

export type QueueStatus = "pending" | "syncing" | "synced" | "failed";

export interface QueuedOperation {
  client_operation_id: string;   // UUID
  operation_type: "create_invoice";
  payload: unknown;
  status: QueueStatus;
  retry_count: number;
  last_error?: string;
  created_at: string;           // ISO local time
  synced_at?: string;           // ISO
  server_result?: unknown;
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  updated_at: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("queue")) {
          const s = db.createObjectStore("queue", { keyPath: "client_operation_id" });
          s.createIndex("status", "status");
          s.createIndex("created_at", "created_at");
        }
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueOperation(op: Omit<QueuedOperation, "status" | "retry_count" | "created_at">) {
  const db = await getDb();
  const record: QueuedOperation = {
    ...op,
    status: "pending",
    retry_count: 0,
    created_at: new Date().toISOString(),
  };
  await db.put("queue", record);
  return record;
}

export async function updateOperation(id: string, patch: Partial<QueuedOperation>) {
  const db = await getDb();
  const existing = await db.get("queue", id);
  if (!existing) return;
  await db.put("queue", { ...existing, ...patch });
}

export async function getPendingOperations(): Promise<QueuedOperation[]> {
  const db = await getDb();
  const all = (await db.getAll("queue")) as QueuedOperation[];
  return all.filter(o => o.status === "pending" || o.status === "failed" || o.status === "syncing");
}

export async function getAllOperations(): Promise<QueuedOperation[]> {
  const db = await getDb();
  return (await db.getAll("queue")) as QueuedOperation[];
}

export async function pruneSyncedOlderThan(days: number) {
  const db = await getDb();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const all = (await db.getAll("queue")) as QueuedOperation[];
  for (const op of all) {
    if (op.status === "synced" && op.synced_at && new Date(op.synced_at).getTime() < cutoff) {
      await db.delete("queue", op.client_operation_id);
    }
  }
}

export async function setCache<T>(key: string, data: T) {
  const db = await getDb();
  await db.put("cache", { key, data, updated_at: new Date().toISOString() } as CacheEntry<T>);
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | undefined> {
  const db = await getDb();
  return (await db.get("cache", key)) as CacheEntry<T> | undefined;
}

// Prefer crypto.randomUUID; fall back to a v4 shim.
export function newClientOperationId(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    const v = ch === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
