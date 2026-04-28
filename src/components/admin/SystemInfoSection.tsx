import { Info, Layers, Server, Cloud, Shield, FileText, Database, Globe, Cpu, Lock, Languages, KeyRound, ShieldCheck, FileCheck2, GitBranch, Boxes } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SpecRow {
  name: string;
  desc: string;
}

interface SpecGroup {
  title: string;
  icon: React.ElementType;
  rows: SpecRow[];
}

const techStack: SpecGroup[] = [
  {
    title: "프론트엔드 (Frontend)",
    icon: Layers,
    rows: [
      { name: "React 18", desc: "Meta(Facebook)에서 개발한 글로벌 표준 UI 라이브러리. 전 세계 상위 10만 웹사이트의 40% 이상이 채택." },
      { name: "TypeScript 5", desc: "Microsoft 개발. 정적 타입 검사로 런타임 오류를 사전 방지하는 엔터프라이즈급 언어." },
      { name: "Vite 5", desc: "차세대 번들러. 빠른 빌드와 코드 분할(Code Splitting)로 초기 로딩 최적화." },
      { name: "Tailwind CSS v3", desc: "유틸리티 우선 CSS 프레임워크. 디자인 시스템(시맨틱 토큰) 기반 일관된 UI 구현." },
      { name: "shadcn/ui · Radix UI", desc: "WAI-ARIA 준수 접근성 컴포넌트 라이브러리. 키보드 내비게이션·스크린리더 완벽 대응." },
      { name: "React Query (TanStack)", desc: "서버 상태 관리 라이브러리. 5분 캐싱 / 15분 메모리 보존으로 9천명 동시접속 부하 분산." },
      { name: "React Router v6", desc: "선언적 클라이언트 라우팅. 코드 스플리팅 기반 페이지 단위 lazy loading 지원." },
      { name: "i18next", desc: "국제 표준 다국어(i18n) 라이브러리. 한국어/영어 동시 운영, 자동 번역 파이프라인 연동." },
      { name: "PWA (Progressive Web App)", desc: "Service Worker 기반 오프라인 지원. 모바일 홈화면 설치 및 네이티브 앱 수준 UX 제공." },
    ],
  },
  {
    title: "백엔드 (Backend)",
    icon: Server,
    rows: [
      { name: "PostgreSQL 15", desc: "오픈소스 관계형 DB의 표준. Apple, Instagram, Reddit 등 대규모 서비스에서 검증." },
      { name: "Row Level Security (RLS)", desc: "DB 레벨 행 단위 접근 제어. 애플리케이션 코드 우회 공격 차단, 멀티테넌시 데이터 격리." },
      { name: "Edge Functions (Deno)", desc: "서버리스 함수 런타임. 결제 검증, 동영상 토큰 발급, 다국어 자동 번역 등 보안 민감 로직 격리." },
      { name: "JWT 기반 인증", desc: "업계 표준(RFC 7519) 토큰 인증. HTTPS 전구간 암호화, refresh token 회전(rotation)." },
      { name: "Realtime (WebSocket)", desc: "PostgreSQL Replication 기반 실시간 데이터 동기화. 알림·게시판 즉시 반영." },
      { name: "Object Storage", desc: "S3 호환 파일 저장소. 과제 첨부파일·아바타·자료실 파일 안전 보관 및 CDN 자동 연동." },
      { name: "Database Migrations", desc: "버전 관리되는 SQL 마이그레이션. 스키마 변경 이력 추적 및 롤백 가능." },
    ],
  },
  {
    title: "인프라 및 외부 서비스",
    icon: Cloud,
    rows: [
      { name: "Cloudflare CDN", desc: "글로벌 CDN. DDoS 방어 및 정적 자산 전 세계 엣지 캐싱." },
      { name: "Global CDN (동영상)", desc: "고성능 동영상 스트리밍 CDN. 9천명 동시접속·6GB+ 라이브러리 대응, 전 세계 엣지 노드 배포." },
      { name: "Kollus VOD", desc: "엔터프라이즈 동영상 플랫폼 연동. JWT 서명 토큰 기반 iframe 임베드, 무단 다운로드 방지." },
      { name: "Google Gemini API", desc: "다국어 자동 번역 엔진. 강의·차시·평가 콘텐츠 한↔영 실시간 변환." },
      { name: "Web Push (FCM/APNs)", desc: "표준 웹 푸시 프로토콜. 학습 알림·과제 마감·공지 실시간 전달." },
      { name: "SMTP 이메일", desc: "비밀번호 재설정·계정 인증 메일. 커스텀 도메인 및 SPF/DKIM 인증 지원." },
    ],
  },
  {
    title: "모니터링 및 운영",
    icon: Cpu,
    rows: [
      { name: "트래픽 모니터링", desc: "실시간 동시접속자/페이지뷰 집계. 10초 배치 로그로 DB 부하 최소화." },
      { name: "Error Tracking", desc: "프론트엔드/엣지 함수 오류 자동 수집 및 스택 트레이스 분석." },
      { name: "감사 로그(Audit Log)", desc: "로그인·권한 변경·민감 데이터 접근 이력 기록. 컴플라이언스 대응." },
      { name: "자동 백업", desc: "PostgreSQL Point-in-Time Recovery (PITR) 7일 보관. 데이터 손실 방지." },
    ],
  },
];

const securityWhitepaper: SpecGroup[] = [
  {
    title: "인증 및 접근 제어",
    icon: KeyRound,
    rows: [
      { name: "다중 역할 권한 모델", desc: "Super Admin · Admin · 강사 · 학습자 4단계 역할 분리. 별도 user_roles 테이블에 저장하여 권한 상승 공격(Privilege Escalation) 차단." },
      { name: "JWT 토큰 인증", desc: "RFC 7519 표준. Access Token 1시간 / Refresh Token 7일, 자동 회전(rotation)으로 탈취 위험 최소화." },
      { name: "이메일 인증", desc: "신규 가입 시 이메일 검증 필수. 관리자 일괄 등록 시에만 엣지 함수로 우회(서버 검증된 안전 경로)." },
      { name: "비밀번호 정책", desc: "최소 8자 이상, bcrypt 해시 저장. 평문 비밀번호 DB 미저장." },
      { name: "세션 관리", desc: "HttpOnly · Secure · SameSite 쿠키. XSS·CSRF 공격 방어." },
    ],
  },
  {
    title: "데이터 보호",
    icon: ShieldCheck,
    rows: [
      { name: "Row Level Security (RLS)", desc: "모든 테이블 RLS 정책 적용. 사용자는 본인 데이터만 조회·수정 가능, 관리자도 정책 함수(SECURITY DEFINER) 통해서만 접근." },
      { name: "전송 구간 암호화", desc: "TLS 1.3 / HTTPS 강제. HSTS 적용으로 다운그레이드 공격 차단." },
      { name: "저장 데이터 암호화", desc: "DB 파일·백업 AES-256 암호화. 디스크 분실 시에도 데이터 보호." },
      { name: "민감 정보 분리", desc: "API 키·토큰은 Edge Function 환경 변수로 격리. 클라이언트 코드에 노출 없음." },
      { name: "동영상 무단접근 방지", desc: "JWT 서명 토큰 기반 임베드. 직접 URL 접근 차단, 시청 권한 검증 후에만 재생." },
    ],
  },
  {
    title: "취약점 대응",
    icon: Shield,
    rows: [
      { name: "SQL Injection", desc: "Parameterized Query 강제. ORM 레벨에서 원천 차단." },
      { name: "XSS (크로스사이트 스크립팅)", desc: "React 자동 이스케이프 + CSP(Content Security Policy) 헤더 적용." },
      { name: "CSRF (크로스사이트 요청 위조)", desc: "SameSite 쿠키 + Origin 검증으로 차단." },
      { name: "DDoS 방어", desc: "Cloudflare WAF · Rate Limiting · Bot 차단으로 다층 방어." },
      { name: "의존성 취약점", desc: "npm audit 자동 스캔, 보안 패치 정기 적용." },
    ],
  },
  {
    title: "컴플라이언스 및 감사",
    icon: FileCheck2,
    rows: [
      { name: "개인정보보호법 준수", desc: "최소 수집 원칙. 회원 탈퇴 시 개인정보 즉시 파기, 학습 이력은 익명화 후 통계 활용." },
      { name: "감사 로그(Audit Log)", desc: "로그인·권한 변경·관리자 작업 전체 기록. 침해사고 대응 및 내부 감사 자료." },
      { name: "데이터 백업 정책", desc: "Point-in-Time Recovery 7일 / 일일 풀백업 30일 보관. RTO 1시간, RPO 5분." },
      { name: "접근 권한 검토", desc: "관리자 권한 부여 이력 추적, 정기 권한 검토 가능 (감사 로그 기반)." },
      { name: "소스코드 이관", desc: "Git 기반 형상관리. 고객사 요청 시 전체 소스코드 및 마이그레이션 스크립트 인계 가능." },
    ],
  },
];

const SpecCard = ({ group }: { group: SpecGroup }) => {
  const Icon = group.icon;
  return (
    <div className="stat-card !p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b-2 border-border/80 bg-muted/30">
        <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
      </div>
      <div className="divide-y divide-border">
        {group.rows.map((row) => (
          <div key={row.name} className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-1 md:gap-6 px-5 py-3">
            <div className="text-sm font-medium text-foreground">{row.name}</div>
            <div className="text-xs text-muted-foreground leading-relaxed">{row.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SystemInfoSection = () => {
  return (
    <div className="space-y-6">
      <div className="stat-card">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-foreground" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">시스템 정보</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          본 플랫폼의 기술 스택, 보안 정책, 소스코드 이관 절차를 안내합니다. 고객사 감사 및 보안 검토 자료로 활용할 수 있습니다.
        </p>
      </div>

      <Tabs defaultValue="stack" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stack" className="gap-2"><Boxes className="h-3.5 w-3.5" /> 기술 스택</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="h-3.5 w-3.5" /> 보안 백서</TabsTrigger>
        </TabsList>

        <TabsContent value="stack" className="space-y-4">
          {techStack.map((g) => <SpecCard key={g.title} group={g} />)}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          {securityWhitepaper.map((g) => <SpecCard key={g.title} group={g} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemInfoSection;