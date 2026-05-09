-- Sequence for human-readable certificate numbers
CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.certificate_number_seq');
  RETURN 'MTM-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$$;

-- Trigger: auto-issue certificate when enrollment.completed_at becomes non-null
CREATE OR REPLACE FUNCTION public.auto_issue_certificate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.completed_at IS DISTINCT FROM NEW.completed_at)
  THEN
    INSERT INTO public.certificates (user_id, course_id, certificate_number, issued_at)
    SELECT NEW.user_id, NEW.course_id, public.generate_certificate_number(), NEW.completed_at
    WHERE NOT EXISTS (
      SELECT 1 FROM public.certificates c
      WHERE c.user_id = NEW.user_id AND c.course_id = NEW.course_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_enrollment_completed_issue_cert ON public.enrollments;
CREATE TRIGGER on_enrollment_completed_issue_cert
AFTER INSERT OR UPDATE OF completed_at ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.auto_issue_certificate();

-- Backfill: issue certificates for already-completed enrollments
INSERT INTO public.certificates (user_id, course_id, certificate_number, issued_at)
SELECT e.user_id, e.course_id, public.generate_certificate_number(), e.completed_at
FROM public.enrollments e
WHERE e.completed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.certificates c
    WHERE c.user_id = e.user_id AND c.course_id = e.course_id
  );