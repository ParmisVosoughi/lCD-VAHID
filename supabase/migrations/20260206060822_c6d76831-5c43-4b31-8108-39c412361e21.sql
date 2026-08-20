-- Add storage policies for excel-files bucket to allow uploads
CREATE POLICY "Allow public uploads to excel-files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'excel-files');

CREATE POLICY "Allow public reads from excel-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'excel-files');

-- Add RLS policies to upload_logs table for INSERT and UPDATE
CREATE POLICY "Allow insert to upload_logs"
ON public.upload_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update to upload_logs"
ON public.upload_logs FOR UPDATE
USING (true)
WITH CHECK (true);

-- Update existing SELECT policy to allow reading all logs (for admin panel)
DROP POLICY IF EXISTS "Anyone can read active uploads" ON public.upload_logs;

CREATE POLICY "Allow read all upload_logs"
ON public.upload_logs FOR SELECT
USING (true);