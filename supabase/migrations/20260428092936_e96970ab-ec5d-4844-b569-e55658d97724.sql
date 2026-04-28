ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS description_en text;

ALTER TABLE public.survey_questions
  ADD COLUMN IF NOT EXISTS question_text_en text,
  ADD COLUMN IF NOT EXISTS options_en jsonb;