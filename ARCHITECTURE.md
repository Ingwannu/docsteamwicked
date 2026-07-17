# Architecture

## 구조와 책임

- `app.py`: Flask 라우팅, 관리자 인증, CSRF/보안 헤더, SQLAlchemy 모델, 문서 검색·피드백·AI 작성 API를 담당합니다.
- `templates/`: 공개 문서 화면과 관리자 편집 화면의 Jinja 템플릿입니다.
- `static/`: 공개/관리자 스타일, 문서 검색·탐색 스크립트, 로고를 포함합니다.
- `instance/docs.db`: 운영 문서와 버전·피드백을 보관하는 SQLite DB입니다. 런타임 데이터이므로 Git에 포함하지 않습니다.
- `.env`: 관리자 인증과 Flask 세션, TeamWicked AI API 설정을 보관합니다. 비밀 파일이므로 Git에 포함하지 않습니다.

## 데이터 흐름

1. 사용자가 `docs.teamwicked.me`에 접속하면 Cloudflare `teamwicked-management` Tunnel이 요청을 Oracle connector로 전달합니다.
2. connector는 node2 WireGuard 주소 `10.200.2.2:50156`의 Gunicorn으로 요청을 전달합니다.
3. Flask가 `instance/docs.db`에서 문서·카테고리·버전을 조회하고 Jinja 템플릿으로 응답합니다.
4. 관리자 AI 작성 요청은 서버의 `TEAMWICKED_API_KEY`를 사용해 `api.teamwicked.me`로 전달됩니다. 키는 브라우저나 Git 저장소에 노출하지 않습니다.

## 기술 선택

- Flask/Jinja: 작은 문서 앱을 단일 프로세스 구조로 유지하기 쉽고 서버 렌더링이 단순합니다.
- SQLAlchemy/SQLite: 별도 DB 서버 없이 문서·버전 데이터를 영속화합니다. 단일 서버에는 적합하지만 다중 writer 확장에는 PostgreSQL이 더 적합합니다.
- Gunicorn: Flask 개발 서버 대신 여러 worker와 요청 timeout을 제공하는 운영 WSGI 서버입니다.
- Cloudflare Tunnel + WireGuard origin: origin 공인 주소를 노출하지 않고 Oracle에서 node2까지 사설 경로를 사용합니다.

## 실행과 검증

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
ADMIN_USERNAME=admin ADMIN_PASSWORD=test SECRET_KEY=test \
  .venv/bin/python -m flask --app app init-db
.venv/bin/python -m compileall -q app.py
```

Pterodactyl 운영 시작 명령은 저장소 동기화 후 의존성을 설치하고 `flask init-db`를 한 번 실행한 다음 Gunicorn을 시작해야 합니다.

[Decision Log]
- 목적과 의도: 코드 배포와 운영 데이터 수명을 분리한다.
- 기존 구현 및 제약 조건: Pterodactyl의 한 볼륨에 소스, `.env`, SQLite DB가 함께 있다.
- 검토한 주요 대안: DB까지 Git에 저장, 매 시작 시 전체 디렉터리 삭제 후 clone, runtime 파일을 보존하는 Git reset.
- 선택한 방식: 소스만 추적하고 `.env`와 `instance/`를 무시한 상태에서 tracked 파일만 reset한다.
- 다른 대안 대신 이 방식을 선택한 이유: Git 이력에 비밀값과 변경되는 DB를 넣지 않으면서 결정적인 코드 배포가 가능하다.
- 장점, 단점 및 영향: 운영 데이터는 안전하게 유지되지만 DB 백업은 Git과 별도의 Pterodactyl 백업 정책이 필요하다.
