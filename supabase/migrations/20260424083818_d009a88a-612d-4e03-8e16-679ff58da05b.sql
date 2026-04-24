-- 1. board_posts에 타겟팅 컬럼 추가
ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS target_countries text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_branch_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS target_course_ids uuid[] DEFAULT '{}'::uuid[];

-- 2. announcements에 타겟팅 컬럼 추가
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_countries text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_branch_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS target_course_ids uuid[] DEFAULT '{}'::uuid[];

-- 3. departments에 country 코드 추가 (지점별 국가 매핑용)
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS country text;

-- 4. 학생이 게시글/공지를 볼 수 있는지 판별하는 보안 함수
CREATE OR REPLACE FUNCTION public.user_can_view_targeted_post(
  _user_id uuid,
  _target_countries text[],
  _target_branch_ids uuid[],
  _target_course_ids uuid[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- 타겟이 모두 비어있으면 전체 공개
    (
      (_target_countries IS NULL OR array_length(_target_countries, 1) IS NULL)
      AND (_target_branch_ids IS NULL OR array_length(_target_branch_ids, 1) IS NULL)
      AND (_target_course_ids IS NULL OR array_length(_target_course_ids, 1) IS NULL)
    )
    -- 또는 사용자의 지점이 타겟 지점에 포함됨
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.department_id = ANY(COALESCE(_target_branch_ids, '{}'::uuid[]))
    )
    -- 또는 사용자의 지점 국가가 타겟 국가에 포함됨
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.user_id = _user_id
        AND d.country = ANY(COALESCE(_target_countries, '{}'::text[]))
    )
    -- 또는 사용자가 타겟 강의 중 하나에 등록(승인)됨
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = _user_id
        AND e.course_id = ANY(COALESCE(_target_course_ids, '{}'::uuid[]))
        AND e.status = 'approved'
    );
$$;

-- 5. board_posts SELECT 정책 갱신 (기존 정책 교체)
DROP POLICY IF EXISTS "Anyone can view published board posts" ON public.board_posts;

CREATE POLICY "Users can view targeted board posts"
ON public.board_posts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR (
    is_published = true
    AND public.user_can_view_targeted_post(
      auth.uid(),
      target_countries,
      target_branch_ids,
      target_course_ids
    )
  )
);

-- 6. announcements SELECT 정책 갱신
DROP POLICY IF EXISTS "Anyone authenticated can view published announcements" ON public.announcements;

CREATE POLICY "Users can view targeted announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR (
    is_published = true
    AND public.user_can_view_targeted_post(
      auth.uid(),
      target_countries,
      target_branch_ids,
      target_course_ids
    )
  )
);

-- 7. 인덱스 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_board_posts_target_branches ON public.board_posts USING GIN(target_branch_ids);
CREATE INDEX IF NOT EXISTS idx_board_posts_target_courses ON public.board_posts USING GIN(target_course_ids);
CREATE INDEX IF NOT EXISTS idx_announcements_target_branches ON public.announcements USING GIN(target_branch_ids);
CREATE INDEX IF NOT EXISTS idx_announcements_target_courses ON public.announcements USING GIN(target_course_ids);
