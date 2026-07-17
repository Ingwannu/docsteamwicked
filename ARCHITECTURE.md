# Architecture

## 시스템 경계

Wickedhost Docs는 Next.js 16 App Router 기반 단일 애플리케이션입니다. 공개 문서 읽기, 관리자 편집, SQLite 영속화, TeamWicked AI API 프록시를 한 런타임에 두되 비밀값과 DB 파일은 Git 배포 생명주기에서 분리합니다.

## 모듈과 책임

- `src/app/`: 페이지, Route Handler, 관리자 Server Action의 진입점입니다. 공개 페이지는 기본적으로 Server Component로 렌더링합니다.
- `src/components/docs/`: 검색·테마·모바일 시트처럼 상호작용이 필요한 부분만 Client Component로 분리한 공개 문서 UI입니다.
- `src/components/admin/`: 로그인, 대시보드, 문서 편집, 버전 복원 UI입니다.
- `src/lib/db.ts`: SQLite 연결, 기존 Flask 스키마 호환 초기화, 조회·검색·CRUD·버전·피드백 트랜잭션을 담당합니다.
- `src/lib/auth.ts`: `SECRET_KEY`로 서명한 HTTP-only 관리자 세션을 생성하고 검증합니다.
- `src/lib/http.ts`: Server Action의 same-origin 검사 등 요청 경계 보안을 담당합니다.
- `src/lib/validators.ts`: 외부 입력을 Zod 스키마로 검증합니다.
- `src/lib/markdown.ts`: GFM, 제목 ID, 자동 앵커를 포함한 마크다운 파이프라인을 정의합니다.
- `scripts/pterodactyl-start.mjs`: 의존성·빌드 캐시와 `SERVER_PORT` 바인딩을 관리하는 운영 엔트리포인트입니다.
- `instance/docs.db`: 문서, 카테고리, 버전, 피드백을 저장하는 운영 파일입니다. Git에 포함하지 않습니다.

## 요청과 데이터 흐름

### 공개 문서

1. 브라우저 요청이 Cloudflare Tunnel을 거쳐 `10.200.2.2:50156`의 Next.js 프로세스에 도착합니다.
2. `/doc/[slug]` Server Component가 `src/lib/db.ts`를 통해 문서와 내비게이션을 읽습니다.
3. 서버가 완성된 문서 HTML을 응답하고, 검색·테마·모바일 내비게이션에 필요한 작은 Client Component만 hydrate됩니다.
4. 검색은 `/api/search`, 평가는 `/api/feedback` Route Handler가 입력 검증 후 SQLite에 반영합니다.

### 관리자 편집

1. `/admin/login`이 환경 변수의 관리자 자격 증명을 비교하고 서명된 HTTP-only 쿠키를 발급합니다.
2. `/admin` 이하 레이아웃은 모든 요청에서 세션을 검증합니다.
3. 편집 Server Action은 same-origin 확인과 Zod 검증 뒤 트랜잭션으로 문서와 버전을 저장합니다.
4. AI 요청은 서버에서만 `TEAMWICKED_API_KEY`를 읽어 `AI_API_URL`로 전달하므로 API 키가 브라우저 번들에 포함되지 않습니다.

### 배포

1. Pterodactyl 시작 명령이 GitHub `main`을 현재 서버 볼륨에 fetch/reset합니다.
2. `scripts/pterodactyl-start.mjs`가 잠금 파일 해시를 비교해 필요한 경우에만 `npm ci`를 수행합니다.
3. Git 커밋이 바뀐 경우에만 Next.js 프로덕션 빌드를 생성합니다.
4. `next start`가 Pterodactyl의 `SERVER_PORT`에 바인딩합니다.
5. `.env`, `instance/docs.db`, `.deploy/`는 Git reset의 영향을 받지 않습니다.

## 기술 선택과 트레이드오프

- **Next.js App Router / React 19**: 공개 페이지의 서버 렌더링, 관리자 mutation, API를 한 타입 시스템 안에서 관리합니다. 프레임워크 런타임 비용은 있지만 기존 Flask 템플릿보다 컴포넌트 재사용과 반응형 UI 유지보수가 쉽습니다.
- **Server Components 우선**: DB 내용을 서버에서 바로 읽고 불필요한 클라이언트 JavaScript를 줄입니다. 브라우저 상태가 필요한 검색·테마·편집기만 명시적으로 클라이언트 경계에 둡니다.
- **better-sqlite3**: 기존 `instance/docs.db` 스키마와 데이터를 변환 없이 유지하며 동기 트랜잭션을 단순하게 만듭니다. 단일 Pterodactyl 인스턴스에는 적합하지만 다중 writer 확장 시 PostgreSQL 전환이 필요합니다.
- **TeamWicked 폰트 배선 공유**: 실제 TeamWicked UI와 동일하게 `next/font/google`의 Geist/Geist Mono를 CSS 변수로 주입합니다. 영어 글꼴은 두 사이트가 일치하고 한글은 시스템 폴백을 쓰지만, 프로덕션 빌드에서 Google Fonts 메타데이터를 가져올 네트워크가 필요합니다.
- **서명 쿠키 인증**: 별도 사용자 DB 없이 기존 단일 관리자 운영 모델을 유지합니다. 여러 관리자와 권한 분리가 필요해지면 사용자 테이블과 역할 기반 접근 제어로 확장해야 합니다.
- **Cloudflare Tunnel + WireGuard origin**: origin 공인 주소를 노출하지 않습니다. 애플리케이션은 프록시의 `Host`/`X-Forwarded-Host`를 고려해 same-origin을 판정합니다.

## 운영 불변 조건

- `.env`와 `instance/docs.db`를 저장소에 추가하거나 Git reset 대상으로 만들지 않습니다.
- AI API 키와 관리자 비밀번호는 Server Component/Server Action/Route Handler 밖으로 전달하지 않습니다.
- SQLite 경로를 변경할 때는 기존 DB 백업과 쓰기 권한을 먼저 확인합니다.
- `main` push 전 `typecheck`, `lint`, `test`, `build`를 모두 통과시킵니다.
- Node.js 22 이상과 Pterodactyl 할당 포트 사용을 유지합니다.

## 검증

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

화면 회귀 검증은 1440×1000 데스크톱과 390×844 모바일에서 공개 문서, 검색, 테마, 모바일 목차, 관리자 로그인·저장·버전 복원을 확인합니다. 기준 콘셉트는 `design/concepts/`에 보존합니다.

[Decision Log]
- 목적과 의도: 기존 운영 데이터를 잃지 않고 Flask/Jinja 문서 앱을 TeamWicked 디자인 시스템의 Next.js 앱으로 교체한다.
- 기존 구현 및 제약 조건: SQLite 스키마, 관리자 환경 변수, 외부 origin 포트, 재시작 기반 Git 배포를 그대로 유지해야 한다.
- 검토한 주요 대안: Flask 템플릿만 재디자인, 별도 SPA와 API 서버, Next.js full-stack 전환.
- 선택한 방식: App Router Server Components와 Server Actions를 중심으로 한 단일 Next.js 애플리케이션을 사용한다.
- 다른 대안 대신 이 방식을 선택한 이유: 서버 렌더링과 SEO를 유지하면서 공개·관리자 UI를 같은 디자인 토큰과 타입으로 구성하고, 별도 API 프로세스 없이 Pterodactyl 단일 포트에서 운영할 수 있다.
- 장점, 단점 및 영향: UI 일관성과 타입 안전성이 높아지고 클라이언트 번들을 제한할 수 있지만 Node native 모듈 빌드가 필요하므로 Node 22 이미지와 잠금 파일 기반 설치가 운영 전제다.
