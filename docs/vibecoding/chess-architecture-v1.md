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
    repo/                     # 선택: runner가 checkout/workspace로 사용할 기준 위치
    prod/
      releases/
        20260423-173500/
      current -> /opt/vibecoding/chess/prod/releases/20260423-173500
    previews/
      pr-23/
      pr-24/
    artifacts/
      pr-23.tgz
      prod-20260423-173500.tgz
    logs/
```

## Caddy 구조

Caddy는 host 기준으로 production/preview를 라우팅한다.

### Production
- `chess.jihan.kr` -> `/opt/vibecoding/chess/prod/current`

### Preview
- `pr-23.chess.jihan.kr` -> `/opt/vibecoding/chess/previews/pr-23`

방법은 두 가지가 있다.

1. **정적 개별 사이트 블록 생성**
   - PR마다 Caddy 설정 파일 생성/삭제
   - 직관적이지만 관리 파일 수가 늘어남

2. **와일드카드 + 동적 root 매핑**
   - host에서 `pr-번호`를 파싱해 디렉터리로 매핑
   - 더 우아하지만 Caddy 설정이 약간 더 정교해야 함

v1에서는 운영 단순성을 위해 **개별 설정 파일 생성 방식**을 추천한다.

## GitHub Actions 흐름

### 1) PR opened / synchronize / reopened
- 의존성 설치
- Vite build
- 결과물을 `/opt/vibecoding/chess/previews/pr-<n>`에 배포
- 필요 시 Caddy preview site config 생성
- Caddy reload
- PR comment에 preview URL 기록

### 2) PR closed
- `/opt/vibecoding/chess/previews/pr-<n>` 삭제
- preview용 Caddy config 제거
- Caddy reload

### 3) push to main
- 의존성 설치
- production build
- timestamp release 디렉터리 생성
- 빌드 결과물 업로드
- `prod/current` 심볼릭 링크 교체
- Caddy reload는 보통 불필요하나 정책상 포함 가능

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

## 실제 구축 순서

1. chess repo 생성
2. React + Vite + pnpm 초기화
3. Mac mini에 `/opt/vibecoding/chess` 구조 준비
4. Caddy 설치 및 production site 설정
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
