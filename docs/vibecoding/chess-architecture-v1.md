# chess.jihan.kr 아키텍처 v1

## 목표

Discord를 요청/승인 인터페이스로 사용하고, GitHub를 단일 작업 기준으로 삼아 `chess.jihan.kr`의 production/preview 배포를 self-hosted로 운영한다.

## 핵심 원칙

- Discord: 요청, 조율, 승인
- GitHub: issue, branch, PR, history의 단일 기준
- Mac mini: self-hosted runner + deploy host
- preview: PR 단위 분리 배포
- production: `main` 기준만 반영
- main 머지, 운영 반영, 파괴적 작업은 명시 승인 후 진행

## 기술 선택

- FE: React + Vite
- Package manager: pnpm
- Reverse proxy / TLS: Caddy
- CI/CD: GitHub Actions + self-hosted runner
- DNS / edge: Cloudflare
- Deploy root: `/opt/vibecoding`

## 도메인 구조

### Production
- `chess.jihan.kr`

### Preview
권장 규칙:
- `pr-<number>.chess.jihan.kr`
- 예: `pr-23.chess.jihan.kr`

이 규칙을 쓰면 앱 기준으로 preview가 명확하고, PR 번호 추적도 쉽다.

## DNS 구조

Cloudflare에서 다음 레코드를 준비한다.

- `A chess.jihan.kr -> <Mac mini public IP or tunnel target>`
- `A *.chess.jihan.kr -> <same target>`

대안:
- 공인 IP 대신 Cloudflare Tunnel 사용 가능
- 초기 v1은 구성 단순화를 위해 `A` 레코드 + Caddy를 우선 추천

## 서버 디렉터리 구조

```text
/opt/vibecoding/
  chess/
    prod/
      releases/
        20260423-173500/
      current -> /opt/vibecoding/chess/prod/releases/20260423-173500
    previews/
      pr-1/
      pr-23/
      pr-24/
    artifacts/
    logs/
```

## Caddy 구조

Caddy는 **한 번만 설정**하고, 이후 Actions는 `/opt/vibecoding` 아래 파일만 갱신한다.

### Production
- `chess.jihan.kr` -> `/opt/vibecoding/chess/prod/current`

### Preview
- `pr-23.chess.jihan.kr` -> `/opt/vibecoding/chess/previews/pr-23`

v1에서는 **PR마다 명시적 Caddy snippet을 생성**한다.
Caddy의 메인 설정은 `/opt/vibecoding/chess/caddy/previews/*.caddy`를 import하고, GitHub Actions가 PR별 snippet을 생성/삭제한 뒤 Caddy를 reload한다.

이 구조의 장점:
- wildcard 인증서가 필요 없음
- 각 preview host가 일반 ACME HTTP/TLS-ALPN challenge로 인증서 발급 가능
- GitHub runner는 `/opt/vibecoding/chess/caddy/previews` 아래 snippet만 조작
- preview cleanup 시 snippet과 정적 파일을 함께 정리

## GitHub Actions 흐름

### 1) PR opened / synchronize / reopened
- 의존성 설치
- Vite build
- 결과물을 `/opt/vibecoding/chess/previews/pr-<n>`에 배포
- PR comment에 preview URL 기록

### 2) PR closed
- `/opt/vibecoding/chess/previews/pr-<n>` 삭제

### 3) push to main
- 의존성 설치
- production build
- timestamp release 디렉터리 생성
- 빌드 결과물 업로드
- `prod/current` 심볼릭 링크 교체

## Public repo 안전 규칙

- fork PR은 self-hosted runner에서 배포하지 않음
- fork PR은 GitHub-hosted runner에서 build만 수행
- same-repo PR만 self-hosted preview deploy 허용
- production deploy는 `main` push 또는 수동 실행만 허용

## Git 브랜치 규칙

- issue 기반 branch 생성
- 예: `feat/23-chess-board-ui`
- hotfix가 필요하면 `fix/<issue>-<slug>`

## GitHub 운영 규칙

- Discord 요청 -> issue 생성
- issue -> branch
- branch -> PR
- PR -> preview URL 자동 생성
- 사용자 확인 후 승인
- 승인된 PR만 `main` merge
- `main` merge 후 production 자동 반영

## 보안 / 운영 메모

- self-hosted runner는 전용 레이블 사용 권장
  - 예: `self-hosted`, `mac-mini`, `vibecoding`
- deploy 스크립트는 `/opt/vibecoding` 하위만 조작하도록 제한
- destructive cleanup은 PR close 이벤트에서만 수행
- production deploy는 `main` push로만 허용
- GitHub repository secrets 최소화
- Cloudflare API를 직접 만질 필요가 없다면 초기에 넣지 않는다

## 추천 v1 결정사항

- preview URL: `pr-<n>.chess.jihan.kr`
- reverse proxy: Caddy
- deploy 방식: 빌드 결과물 정적 파일 복사
- production release 방식: timestamp release + symlink 전환
- preview cleanup: PR close 시 자동 삭제
- runner 위치: Mac mini 로컬 설치
- Caddy 변경: 1회 수동 설정

## 실제 구축 순서

1. chess repo 생성
2. React + Vite + pnpm 초기화
3. Mac mini에 `/opt/vibecoding/chess` 구조 준비
4. Caddy 설치 및 production/preview host 설정
5. Cloudflare DNS에 `chess.jihan.kr`, `*.chess.jihan.kr` 연결
6. GitHub self-hosted runner 연결
7. main deploy workflow 작성
8. PR preview deploy workflow 작성
9. PR close cleanup workflow 작성
10. Discord 요청 -> issue 생성 운영 루틴 정리

## 이후 확장

장기적으로 Next / Nest / MySQL 구조로 전환 시에도 이 모델을 유지할 수 있다.

- `app.jihan.kr` -> public FE
- `api.internal` 또는 private network -> Nest
- DB는 외부 비공개 네트워크에 배치
- preview도 PR 단위 앱/백엔드 조합으로 확장 가능

v1은 프론트 정적 배포에 집중하고, 이후 백엔드는 별도 서비스 계층으로 분리하는 것이 좋다.
