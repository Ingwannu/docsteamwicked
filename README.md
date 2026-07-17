# Wickedhost Docs

TeamWicked의 공개 문서와 운영 편집 화면을 한 애플리케이션에서 제공하는 Next.js 문서 시스템입니다. 기존 SQLite 문서 데이터를 그대로 사용하면서 TeamWicked 웹사이트의 타이포그래피, 흰색·올리브·라임 색상 체계, 둥근 표면과 모바일 내비게이션을 적용했습니다.

## 주요 기능

### 공개 문서

- 서버 렌더링 문서, 카테고리 사이드바, 현재 문서 목차
- 제목·설명·본문을 대상으로 하는 실시간 검색 (`/` 단축키)
- 라이트/다크 테마, 모바일 메뉴·목차·하단 도크
- GFM 마크다운, 제목 앵커, 표, 코드 복사
- 이전·다음 문서 이동과 도움 여부 피드백

### 관리자

- 문서·공개 상태·조회·피드백 통계를 보여 주는 대시보드
- 카테고리와 문서 생성·편집·삭제
- 마크다운 편집, 공개 여부·순서·추천 문서 설정
- 문서 버전 기록과 이전 버전 복원
- TeamWicked AI API를 통한 작성·개선·목차·FAQ·문제 해결 초안 생성

## 로컬 실행

요구 사항은 Node.js 22 이상입니다.

```bash
npm ci
cp .env.example .env
npm run dev
```

- 공개 사이트: `http://localhost:3000`
- 관리자: `http://localhost:3000/admin/login`
- 데이터베이스: 기본값 `instance/docs.db`

운영 데이터와 비밀값을 덮어쓰지 않도록 `.env`와 `instance/`는 Git에서 제외됩니다. 새 데이터베이스는 앱 최초 접근 시 기존 Flask 버전과 호환되는 스키마로 자동 초기화됩니다.

## 환경 변수

| 변수 | 역할 |
| --- | --- |
| `SECRET_KEY` | 관리자 세션 서명 키. 운영에서는 충분히 긴 무작위 값이 필요합니다. |
| `ADMIN_USERNAME` | 관리자 아이디 |
| `ADMIN_PASSWORD` | 관리자 비밀번호 |
| `AI_API_URL` | OpenAI 호환 TeamWicked AI API 기본 URL |
| `AI_MODEL` | 문서 작성에 사용할 모델 이름 |
| `TEAMWICKED_API_KEY` | 서버에서만 사용하는 AI API 키 |
| `SITE_NAME` | 사이트 표시 이름 |
| `SITE_URL` | 공개 기준 URL |
| `DOCS_DB_PATH` | SQLite 파일 경로. 기본값은 `./instance/docs.db`입니다. |
| `SERVER_PORT` | Pterodactyl이 할당한 내부 수신 포트 |

## 품질 검증

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`tests/deployment.test.mjs`는 Pterodactyl 시작 스크립트가 패키지 잠금 파일과 Git 커밋을 기준으로 설치·빌드를 캐시하고, 런타임 파일을 건드리지 않는지 확인합니다.

## 프로덕션 배포

운영은 Pterodactyl server ID `269`에서 Node.js 22 이미지로 실행됩니다. 서버 시작 명령은 `main`을 shallow fetch/reset한 뒤 다음 스크립트를 실행합니다.

```bash
npm run pterodactyl:start
```

`scripts/pterodactyl-start.mjs`의 동작은 다음과 같습니다.

1. `package-lock.json` 해시가 달라졌을 때만 `npm ci`를 수행합니다.
2. 현재 Git 커밋이 달라졌을 때만 `next build`를 수행합니다.
3. Pterodactyl의 `SERVER_PORT`로 `next start`를 실행합니다.
4. 배포 캐시는 `.deploy/`에 두며 `.env`와 `instance/docs.db`는 수정하지 않습니다.

공개 요청 흐름은 `docs.teamwicked.me` → Cloudflare `teamwicked-management` Tunnel → node2 WireGuard `10.200.2.2:50156` → Next.js입니다. 데이터베이스 백업은 Git 배포와 별도로 유지해야 합니다.

## 저장소 구조

```text
docsteamwicked/
├── design/concepts/         # 승인된 공개·모바일·관리자 화면 콘셉트
├── public/                  # TeamWicked 로고와 로컬 브랜드 폰트
├── scripts/
│   └── pterodactyl-start.mjs
├── src/
│   ├── app/                 # Next.js 라우트, API, 관리자 Server Actions
│   ├── components/          # 공개 문서·관리자·공용 UI
│   └── lib/                 # 인증, SQLite, 검증, 마크다운, HTTP 보안
├── tests/                   # 배포 스크립트 회귀 테스트
├── ARCHITECTURE.md          # 구조·데이터 흐름·기술 결정
└── DESIGN_SYSTEM.md         # TeamWicked 디자인 적용 규칙과 QA 기준
```

## 운영 결정 기록

[Decision Log]
- 목적과 의도: Pterodactyl 재시작만으로 검증된 GitHub `main`을 배포하고, 운영 문서와 비밀값은 계속 보존한다.
- 기존 구현 및 제약 조건: 같은 볼륨에 소스, `.env`, SQLite DB가 있으며 Cloudflare Tunnel origin 포트는 유지해야 한다.
- 검토한 주요 대안: 서버 파일 수동 업로드, 매 시작 전체 재설치, 컨테이너 이미지 빌드, Git 동기화와 변경 감지 빌드.
- 선택한 방식: 시작 명령에서 저장소를 동기화하고 잠금 파일·커밋 기반 캐시를 적용한 Node 시작 스크립트를 사용한다.
- 다른 대안 대신 이 방식을 선택한 이유: 현재 Pterodactyl 운영 방식을 유지하면서 배포 시간을 줄이고, 추적하지 않는 런타임 파일을 안전하게 분리할 수 있다.
- 장점, 단점 및 영향: 재시작 배포가 단순하고 재현 가능하지만 `main`의 품질이 곧 운영 품질이므로 push 전 네 가지 검증 명령이 필수다.
