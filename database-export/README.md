# Database export — LCD-Vahid

Taken: see file timestamps (UTC).

## Contents
- `*.json` — full row dump of every application table.
- `restore-data.sql` — INSERT statements for all tables (idempotent, `ON CONFLICT (id) DO NOTHING`).

## Restore order
1. Apply the schema first: `supabase/migrations/*.sql` (16 migration files, run in filename order).
2. Then run `restore-data.sql`.

## Row counts
products 650, product_variants 1318, product_price_history 7060, invoices 12,
invoice_items 14, daily_currency_rates 0, market_rates 6, market_rate_history 930,
variant_presets 1, variant_replace_logs 4, upload_logs 19.

Not included: `backup_snapshots` and `sync_queue` (internal backup/queue tables),
Storage bucket `excel-files` (download Excel files from the Admin Panel).
