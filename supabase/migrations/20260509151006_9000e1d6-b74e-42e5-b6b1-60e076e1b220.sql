ALTER TABLE public.video_assets ADD COLUMN IF NOT EXISTS file_hash text;
CREATE INDEX IF NOT EXISTS idx_video_assets_file_hash ON public.video_assets(file_hash);