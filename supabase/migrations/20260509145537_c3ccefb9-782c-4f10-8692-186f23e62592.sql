
CREATE TABLE public.sidebar_menu_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('student','teacher','admin')),
  menu_key TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID,
  UNIQUE (role, menu_key)
);

ALTER TABLE public.sidebar_menu_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read menu visibility"
ON public.sidebar_menu_visibility
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert menu visibility"
ON public.sidebar_menu_visibility
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update menu visibility"
ON public.sidebar_menu_visibility
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete menu visibility"
ON public.sidebar_menu_visibility
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
