
CREATE OR REPLACE FUNCTION public.set_learning_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.learning_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content_id UUID NOT NULL,
  course_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_notes_user_content ON public.learning_notes(user_id, content_id);
CREATE INDEX IF NOT EXISTS idx_learning_notes_user_course ON public.learning_notes(user_id, course_id);

ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notes" ON public.learning_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.learning_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.learning_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.learning_notes
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all notes" ON public.learning_notes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_learning_notes_updated_at
  BEFORE UPDATE ON public.learning_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_learning_notes_updated_at();
