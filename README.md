# docsteamwicked

GitBook 급의 호스팅 사이트 문서 시스템. Flask 기반으로 미학적 디자인, 다크모드, AI 글쓰기, 버전 히스토리 등을 제공합니다.

## ✨ 주요 기능

### 공개 문서 사이트
- **미학적 디자인** — GitBook 스타일의 깔끔한 타이포그래피와 레이아웃
- **다크모드** — 라이트/다크 테마 토글 (설정 저장)
- **3단 레이아웃** — 좌측 카테고리 사이드바 + 본문 + 우츠 목차(TOC)
- **읽기 진행도** — 상단 프로그레스 바
- **실시간 검색** — `/` 키로 검색 포커스, 실시간 결과
- **TOC 스크롤 스파이** — 우측 목차가 스크롤에 따라 활성화
- **코드 복사** — 원클릭 코드 블록 복사
- **콜아웃/어드모니션** — note, warning, tip, danger 블록
- **브레드크럼** — 문서 경로 표시
- **이전/다음 네비게이션** — 문서 간 이동
- **문서 평가** — 👍/👎 피드백
- **반응형** — 모바일 완벽 지원

### 관리자 페이지
- **대시보드** — 문서 수, 공개/초안, 조회수, 피드백 통계
- **드래그앤드롭 정렬** — 문서 순서를 드래그로 변경
- **카테고리 관리** — 아이콘과 함께 추가/삭제
- **마크다운 에디터** — 실시간 미리보기 분할 화면
- **버전 히스토리** — 수정 이력 관리, 이전 버전 복원, 버전 비교
- **문서 설명(메타)** — 검색/미리보기용 description
- **추천 문서** — ⭐ 표시로 중요 문서 강조
- **Ctrl/Cmd+S 저장** — 키보드 단축키

### AI 글쓰기 (teamwicked-mimo)
- **✍️ 글쓰기** — 주제 입력 시 전체 문서 자동 작성
- **🔄 개선하기** — 기존 내용을 더 명확하게 재작성
- **📋 목차 제안** — 주제에 대한 목차 생성
- **❓ FAQ 작성** — Q&A 형식 문서 생성
- **🔧 문제해결** — 트러블슈팅 가이드 생성
- 생성된 내용을 에디터에 바로 적용 또는 추가

## 빠른 시작

```bash
pip3 install -r requirements.txt
python3 app.py
```

접속:
- 공개 사이트: http://localhost:8080
- 관리자: http://localhost:8080/admin/login
- 관리자 계정: admin / (`.env` 파일 참조)

## 환경변수 (.env)

| 변수 | 설명 |
|------|------|
| `SECRET_KEY` | Flask 세션 암호화 키 |
| `ADMIN_USERNAME` | 관리자 아이디 |
| `ADMIN_PASSWORD` | 관리자 비밀번호 |
| `AI_API_URL` | AI API 엔드포인트 |
| `AI_MODEL` | AI 모델명 |
| `TEAMWICKED_API_KEY` | teamwicked API 키 |
| `SITE_NAME` | 사이트 이름 |

## 마크다운 확장

코드 블록, 표, 인용구 외에도 어드모니션(콜아웃)을 지원합니다:

```
!!! note
    이것은 노트 콜아웃입니다.

!!! warning
    주의가 필요한 내용입니다.

!!! tip
    유용한 팁입니다.

!!! danger
    위험한 내용입니다.
```

## 프로덕션 배포

```bash
pip3 install gunicorn
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

Nginx를 리버스 프록시로 사용하는 것을 권장합니다.

### TeamWicked Pterodactyl

운영 서버는 Pterodactyl server ID `269`이며 다음 변수로 이 저장소를 시작할 때마다 동기화합니다.

| 변수 | 값 |
|------|----|
| `GIT_ADDRESS` | `https://github.com/Ingwannu/docsteamwicked.git` |
| `BRANCH` | `main` |
| `AUTO_UPDATE` | `1` |
| `REQUIREMENTS_FILE` | `requirements.txt` |

시작 순서는 저장소 fetch/reset, Python 의존성 설치, `flask init-db`, Gunicorn 실행입니다. `.env`와 `instance/docs.db`는 `.gitignore`로 제외하므로 코드 동기화 후에도 운영 비밀값과 문서 데이터가 유지됩니다.

## 운영 결정 기록

[Decision Log]
- 목적과 의도: Pterodactyl을 재시작할 때 GitHub의 승인된 `main` 소스를 자동으로 배포한다.
- 기존 구현 및 제약 조건: 운영 앱 파일은 서버 볼륨에만 있었고, 같은 볼륨의 `.env`와 `instance/docs.db`는 배포 중 보존해야 한다.
- 검토한 주요 대안: 서버 파일 수동 업로드, Pterodactyl 재설치 스크립트, 시작 명령의 Git 동기화.
- 선택한 방식: 공개 Git 저장소와 서버 시작 명령의 shallow fetch/reset을 사용한다.
- 다른 대안 대신 이 방식을 선택한 이유: 별도 토큰 없이 재현 가능하고, 재설치 없이 매 재시작에 최신 코드를 보장한다.
- 장점, 단점 및 영향: 배포가 단순하고 결정적이지만 `main`의 잘못된 커밋도 다음 재시작에 즉시 반영되므로 push 전 검증이 필수다.

## 구조

```
docsteamwicked/
├── app.py                  # Flask 메인 앱
├── requirements.txt        # 의존성
├── .env                    # 환경변수
├── static/
│   ├── css/
│   │   ├── docs.css        # 공개 사이트 디자인 시스템
│   │   ├── admin.css       # 관리자 디자인 시스템
│   │   └── highlight.css   # 코드 하이라이팅
│   └── js/
│       ├── search.js       # 실시간 검색 + 단축키
│       └── docs.js         # 다크모드, TOC, 진행도, 복사, 피드백
└── templates/
    ├── base.html
    ├── index.html          # 공개 문서 페이지
    └── admin/
        ├── base.html
        ├── login.html      # 로그인
        ├── dashboard.html  # 대시보드 + 드래그앤드롭
        ├── editor.html     # 에디터 + AI 글쓰기
        └── versions.html   # 버전 히스토리
```

상세 구조와 데이터 흐름은 [`ARCHITECTURE.md`](ARCHITECTURE.md)를 참고합니다.
