-- Create upload_logs table for tracking Excel uploads
CREATE TABLE public.upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  page_key TEXT NOT NULL CHECK (page_key IN ('lcd', 'misc')),
  note TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- Public can read active files (for download)
CREATE POLICY "Anyone can read active uploads"
ON public.upload_logs
FOR SELECT
USING (is_active = true);

-- Create storage bucket for Excel files
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-files', 'excel-files', true);

-- Allow public to read files (for download)
CREATE POLICY "Public can read Excel files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'excel-files');

-- Allow authenticated/service role to upload
CREATE POLICY "Service can upload Excel files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'excel-files');

-- Allow service to update/delete
CREATE POLICY "Service can update Excel files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'excel-files');

CREATE POLICY "Service can delete Excel files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'excel-files');