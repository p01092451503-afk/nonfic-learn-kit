ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS instructions_en text;