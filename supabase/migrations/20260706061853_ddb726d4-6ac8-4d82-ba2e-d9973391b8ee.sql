
-- sync_queue
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_operation_id uuid NOT NULL UNIQUE,
  operation_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  user_id uuid,
  CONSTRAINT sync_queue_status_check CHECK (status IN ('pending','processing','completed','failed'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON public.sync_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_client_op ON public.sync_queue(client_operation_id);

GRANT ALL ON public.sync_queue TO service_role;

ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Locked: only service_role (via edge function) can access.
CREATE POLICY "sync_queue_no_public_access"
  ON public.sync_queue
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- backup_snapshots
CREATE TABLE IF NOT EXISTS public.backup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL,
  snapshot_data jsonb NOT NULL,
  record_counts jsonb,
  size_bytes integer,
  status text NOT NULL DEFAULT 'completed',
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT backup_snapshots_type_check CHECK (snapshot_type IN ('manual','automatic')),
  CONSTRAINT backup_snapshots_status_check CHECK (status IN ('completed','failed','in_progress'))
);

CREATE INDEX IF NOT EXISTS idx_backup_snapshots_created_at ON public.backup_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_snapshots_type ON public.backup_snapshots(snapshot_type);

GRANT ALL ON public.backup_snapshots TO service_role;

ALTER TABLE public.backup_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backup_snapshots_no_public_access"
  ON public.backup_snapshots
  FOR ALL
  USING (false)
  WITH CHECK (false);
