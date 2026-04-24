-- Announcement i18n
CREATE TABLE public.announcement_i18n (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, language_code)
);

ALTER TABLE public.announcement_i18n ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and teachers manage announcement i18n"
ON public.announcement_i18n FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Authenticated can view announcement i18n"
ON public.announcement_i18n FOR SELECT TO authenticated
USING (true);

CREATE INDEX idx_announcement_i18n_ann ON public.announcement_i18n(announcement_id);

-- Board post i18n
CREATE TABLE public.board_post_i18n (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, language_code)
);

ALTER TABLE public.board_post_i18n ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and teachers manage board post i18n"
ON public.board_post_i18n FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Authenticated can view board post i18n"
ON public.board_post_i18n FOR SELECT TO authenticated
USING (true);

CREATE INDEX idx_board_post_i18n_post ON public.board_post_i18n(post_id);