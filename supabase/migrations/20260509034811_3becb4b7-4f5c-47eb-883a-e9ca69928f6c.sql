
-- ============================================
-- METAM 리브랜딩: 샘플 데이터 교체 (BPO/콘택트센터)
-- ============================================

-- 1) 기존 샘플 코스 일괄 삭제 (course_contents/enrollments 등은 CASCADE)
DELETE FROM public.attendance WHERE course_id IS NOT NULL;
DELETE FROM public.courses;

-- 2) 카테고리 교체
DELETE FROM public.categories;
INSERT INTO public.categories (id, name, slug, description, display_order) VALUES
  ('11111111-1111-1111-1111-000000000001', '상담 응대',     'consultation', '고객상담 응대 매너·화법·CS 기본', 1),
  ('11111111-1111-1111-1111-000000000002', 'AICC·디지털',   'aicc-digital', 'AI 챗봇·음성봇·디지털 채널 운영', 2),
  ('11111111-1111-1111-1111-000000000003', 'IPCC·시스템',   'ipcc-system',  'IPCC 상담시스템·KMS 활용 실무',  3),
  ('11111111-1111-1111-1111-000000000004', '품질·VOC',      'quality-voc',  '상담 QA·VOC 분석·CX 개선',       4),
  ('11111111-1111-1111-1111-000000000005', '컴플라이언스',  'compliance',   '개인정보보호·정보보안·컴플라이언스', 5),
  ('11111111-1111-1111-1111-000000000006', '신입 온보딩',   'onboarding',   '신입 상담사 입문 교육',          6),
  ('11111111-1111-1111-1111-000000000007', '리더십',        'leadership',   '센터장·팀장 리더십',             7),
  ('11111111-1111-1111-1111-000000000008', '직무 교양',     'general',      '감정노동·트렌드·자기계발',       8);

-- 3) 부서(센터) 구조 재정비
-- 기존 부서 정리 (FK 없음을 가정 - profiles는 department_id 컬럼 없이 team_name만 사용)
DELETE FROM public.user_department_roles;
DELETE FROM public.departments;
INSERT INTO public.departments (id, name, code, parent_department_id, display_order, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', '본사',         'HQ',  NULL, 1, true),
  ('22222222-0000-0000-0000-000000000002', '서울센터',     'SEL', NULL, 2, true),
  ('22222222-0000-0000-0000-000000000003', '부산센터',     'BUS', NULL, 3, true),
  ('22222222-0000-0000-0000-000000000004', '대구센터',     'DAG', NULL, 4, true),
  ('22222222-0000-0000-0000-000000000005', '광주센터',     'GWJ', NULL, 5, true),
  ('22222222-0000-0000-0000-000000000006', '대전센터',     'DJN', NULL, 6, true);

INSERT INTO public.departments (id, name, parent_department_id, display_order, is_active) VALUES
  ('22222222-0000-0000-0000-000000000011', '교육운영팀',   '22222222-0000-0000-0000-000000000001', 1, true),
  ('22222222-0000-0000-0000-000000000012', 'AICC운영팀',   '22222222-0000-0000-0000-000000000001', 2, true),
  ('22222222-0000-0000-0000-000000000013', '품질관리팀',   '22222222-0000-0000-0000-000000000001', 3, true),
  ('22222222-0000-0000-0000-000000000014', '경영지원팀',   '22222222-0000-0000-0000-000000000001', 4, true);

-- 4) 샘플 강의 12개 + 차시 4개씩 일괄 생성
DO $$
DECLARE
  c1 uuid := '11111111-1111-1111-1111-000000000001'; -- 상담응대
  c2 uuid := '11111111-1111-1111-1111-000000000002'; -- AICC
  c3 uuid := '11111111-1111-1111-1111-000000000003'; -- IPCC
  c4 uuid := '11111111-1111-1111-1111-000000000004'; -- VOC
  c5 uuid := '11111111-1111-1111-1111-000000000005'; -- 컴플
  c6 uuid := '11111111-1111-1111-1111-000000000006'; -- 온보딩
  c7 uuid := '11111111-1111-1111-1111-000000000007'; -- 리더십
  c8 uuid := '11111111-1111-1111-1111-000000000008'; -- 교양
  v_course_id uuid;
  v_courses jsonb := '[
    {"title":"AICC 챗봇 운영 실무",         "cat":"c2", "level":"intermediate", "hours":6,  "lessons":["AICC 개요와 메타엠 도입 사례","챗봇 시나리오 설계와 인텐트 분류","상담사 핸드오프 & 폴백 처리","챗봇 운영 KPI와 품질 개선 루프"]},
    {"title":"IPCC 상담 시스템 마스터",       "cat":"c3", "level":"beginner",     "hours":4,  "lessons":["IPCC 아키텍처와 메타엠 표준","CTI·라우팅·스킬 그룹 설정","상담 이력 조회와 후처리(ACW)","장애 대응 및 우회 절차"]},
    {"title":"KMS 지식관리시스템 활용",       "cat":"c3", "level":"beginner",     "hours":3,  "lessons":["메타엠 KMS 구조 한눈에 보기","빠른 검색을 위한 키워드 전략","FAQ·매뉴얼 작성과 승인 절차","상담 중 KMS 실시간 활용 팁"]},
    {"title":"신입 상담사 온보딩",          "cat":"c6", "level":"beginner",     "hours":8,  "lessons":["메타엠 소개와 BPO 산업 이해","고객상담 채널과 업무 흐름","기본 응대 매너와 인사말","첫 상담을 위한 셀프 체크리스트"]},
    {"title":"프리미엄 고객 응대 매너",       "cat":"c1", "level":"intermediate", "hours":4,  "lessons":["프리미엄 고객의 기대 수준","공감적 경청과 질문 기술","감사 표현과 마무리 응대","사례 분석: 우수 응대 vs 개선 필요"]},
    {"title":"보이스 트레이닝 & 상담 화법",   "cat":"c1", "level":"beginner",     "hours":3,  "lessons":["발성·발음·호흡의 기초","음성 톤·속도 조절 실습","쿠션어와 긍정 표현 활용","녹취 셀프 진단 워크북"]},
    {"title":"컴플레인 처리 & 위기 대응",     "cat":"c1", "level":"advanced",     "hours":5,  "lessons":["컴플레인 단계별 응대 모델","감정 격앙 고객 진정 기법","에스컬레이션 의사결정 기준","사후 관리와 재발 방지 리포트"]},
    {"title":"VOC 분석과 CX 개선",            "cat":"c4", "level":"intermediate", "hours":4,  "lessons":["VOC 데이터 수집 채널","텍스트 마이닝 기초","우선순위 도출과 개선 과제 정의","개선 성과 측정과 공유"]},
    {"title":"상담 품질관리(QA) 실무",        "cat":"c4", "level":"intermediate", "hours":5,  "lessons":["메타엠 QA 평가표 이해","녹취 모니터링 진행 방식","코칭 피드백 작성법","월간 QA 리포트와 개선 액션"]},
    {"title":"개인정보보호법 실무",           "cat":"c5", "level":"beginner",     "hours":3,  "lessons":["개인정보보호법 핵심 조항","상담 중 개인정보 처리 원칙","유출·오·남용 사고 예방","위반 사례와 사내 처리 절차"]},
    {"title":"상담사 멘탈케어 & 감정노동 관리","cat":"c8", "level":"beginner",    "hours":3,  "lessons":["감정노동의 이해","근무 중 스트레스 자가진단","호흡·이완·마인드풀니스 실습","팀 단위 회복탄력성 강화"]},
    {"title":"디지털 BPO 트렌드 2026",        "cat":"c8", "level":"intermediate","hours":3,  "lessons":["AI·자동화가 바꾸는 BPO","옴니채널 상담 전략","데이터 기반 운영 의사결정","메타엠이 준비하는 미래 컨택센터"]}
  ]'::jsonb;
  v_row jsonb;
  v_lesson text;
  v_idx int;
  v_cat uuid;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(v_courses)
  LOOP
    v_cat := CASE v_row->>'cat'
      WHEN 'c1' THEN c1 WHEN 'c2' THEN c2 WHEN 'c3' THEN c3 WHEN 'c4' THEN c4
      WHEN 'c5' THEN c5 WHEN 'c6' THEN c6 WHEN 'c7' THEN c7 ELSE c8 END;

    INSERT INTO public.courses (title, description, category_id, status, difficulty_level, estimated_duration_hours)
    VALUES (
      v_row->>'title',
      '메타엠(METAM) 콘택트센터 현장에 바로 적용 가능한 ' || (v_row->>'title') || ' 과정입니다.',
      v_cat,
      'published',
      v_row->>'level',
      (v_row->>'hours')::int
    ) RETURNING id INTO v_course_id;

    v_idx := 0;
    FOR v_lesson IN SELECT jsonb_array_elements_text(v_row->'lessons')
    LOOP
      v_idx := v_idx + 1;
      INSERT INTO public.course_contents (course_id, title, description, content_type, duration_minutes, order_index, is_published)
      VALUES (
        v_course_id,
        v_idx || '차시. ' || v_lesson,
        v_lesson || ' — 학습 목표와 핵심 포인트, 현장 사례를 함께 제공합니다.',
        'video',
        15,
        v_idx,
        true
      );
    END LOOP;
  END LOOP;
END $$;

-- 5) 기존 5명 학습자 프로필을 메타엠(METAM) 페르소나로 업데이트
UPDATE public.profiles SET full_name='최본부', position='본부장',  team_name='본사'           WHERE user_id='8863eba0-2ec9-4bb6-b73b-ab57d041934d';
UPDATE public.profiles SET full_name='이정현', position='매니저',  team_name='교육운영팀'     WHERE user_id='2b578b30-3110-48eb-907b-01ef5cba9878';
UPDATE public.profiles SET full_name='송예린', position='과장',    team_name='품질관리팀'     WHERE user_id='df1644bc-110a-473e-b7b2-4e18d44e97d5';
UPDATE public.profiles SET full_name='김상담', position='상담사',  team_name='서울센터 1팀'   WHERE user_id='ea2ff340-3e39-4614-9700-7334113ed8c0';
UPDATE public.profiles SET full_name='박지민', position='상담사',  team_name='부산센터 2팀'   WHERE user_id='a5b87a3d-351b-4274-8f13-05c6621b4fa2';
