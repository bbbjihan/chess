# chess.jihan.kr 구축 순서 체크리스트

## 0. 결정 완료 사항
- 앱 이름: chess
- 도메인: jihan.kr
- production URL: `chess.jihan.kr`
- preview URL: `pr-<n>.chess.jihan.kr`
- FE: React + Vite
- package manager: pnpm
- deploy root: `/opt/vibecoding`
- runner host: Mac mini
- proxy: Caddy
- DNS: Cloudflare

## 1. GitHub 저장소 준비
- [ ] `chess` repository 생성
- [ ] 기본 branch를 `main`으로 설정
- [ ] issue / PR template 필요 여부 결정
- [ ] self-hosted runner labels 확정 (`self-hosted`, `mac-mini`, `vibecoding`)

## 2. 앱 초기화
- [ ] `pnpm create vite chess --template react`
- [ ] 기본 실행 확인
- [ ] `pnpm build` 성공 확인
- [ ] `.nvmrc` 또는 Node 버전 고정 여부 결정

## 3. Mac mini 디렉터리 준비
- [ ] `/opt/vibecoding/chess/prod/releases`
- [ ] `/opt/vibecoding/chess/previews`
- [ ] `/opt/vibecoding/chess/artifacts`
- [ ] `/opt/vibecoding/chess/logs`
- [ ] 권한/소유자 정리

## 4. Caddy 설치 및 production 연결
- [ ] Caddy 설치
- [ ] `chess.jihan.kr` -> `/opt/vibecoding/chess/prod/current`
- [ ] 정적 파일 서비스 확인
- [ ] HTTPS 확인

## 5. Cloudflare DNS 연결
- [ ] `chess.jihan.kr` 레코드 생성
- [ ] `*.chess.jihan.kr` 와일드카드 레코드 생성
- [ ] 프록시 사용 여부 결정
- [ ] 외부 접속 테스트

## 6. GitHub self-hosted runner 연결
- [ ] runner 설치
- [ ] 해당 repo 또는 org에 연결
- [ ] labels 설정
- [ ] actions 테스트 워크플로우 1회 실행

## 7. Production 배포 자동화
- [ ] `push: main` workflow 작성
- [ ] `pnpm install` / `pnpm build`
- [ ] release timestamp 디렉터리 배포
- [ ] `current` symlink 교체
- [ ] 배포 후 health 확인

## 8. Preview 배포 자동화
- [ ] `pull_request` workflow 작성
- [ ] PR 번호 기반 preview path 생성
- [ ] PR별 explicit Caddy snippet 생성
- [ ] Caddy validate/reload
- [ ] preview URL PR comment 기록

## 9. Preview cleanup 자동화
- [ ] `pull_request.closed` 처리
- [ ] preview directory 삭제
- [ ] PR별 Caddy snippet 삭제
- [ ] Caddy validate/reload

## 10. 운영 프로세스 정리
- [ ] Discord 요청 템플릿 정리
- [ ] issue 제목 규칙 정리
- [ ] branch 명명 규칙 정리
- [ ] PR 승인/머지 기준 정리
- [ ] 운영 반영은 명시 승인 후 진행 규칙 재확인

## 11. 이후 개선 후보
- [ ] preview 자동 만료 정책
- [ ] Lighthouse / basic QA 자동화
- [ ] Discord 알림 자동화
- [ ] issue 생성 자동화
- [ ] merge queue 검토
