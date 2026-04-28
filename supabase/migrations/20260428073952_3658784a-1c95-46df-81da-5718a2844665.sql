ALTER TYPE public.content_type ADD VALUE IF NOT EXISTS 'media_package';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.media_package_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.course_contents(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  caption TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_package_items_content
  ON public.media_package_items(content_id, order_index);

ALTER TABLE public.media_package_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view media package items"
ON public.media_package_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_contents cc
    JOIN public.enrollments e ON e.course_id = cc.course_id AND e.user_id = auth.uid()
    WHERE cc.id = media_package_items.content_id
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers and admins manage media package items"
ON public.media_package_items
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);

CREATE TRIGGER update_media_package_items_updated_at
BEFORE UPDATE ON public.media_package_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();