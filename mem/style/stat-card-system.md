---
name: Stat Card Visualization System
description: Unified stat card with sparkline trend + delta % for all dashboards
type: design
---
공통 통계카드 시스템:
- `src/components/ui/stat-card.tsx` — 라벨/값/아이콘/스파크라인/증감률 통합 카드 (tone: primary/success/warning/danger/info/neutral)
- `src/components/ui/sparkline.tsx` — 의존성 없는 순수 SVG 미니 차트 (gradient area + line + last dot)
- `src/hooks/useDashboardSparklines.ts` — 14일 시계열 단일 RPC 훅 + computeDelta 유틸
- DB RPC: `dashboard_sparklines(p_days)` — signups/enrollments/completions/sessions/pageviews/submissions/assessments 일별 집계

적용 페이지: AdminDashboard 상단 3개, AdminTraffic (RealtimeUsers/SiteSummary/TodayOps), AdminCourses, AdminAttendance, AdminEnrollments, AdminLearning, AdminUsers. 모든 통계 카드는 StatCard 컴포넌트로 통일.
