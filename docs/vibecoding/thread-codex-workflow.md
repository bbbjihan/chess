# Discord Thread + Hermes + Codex Workflow

## 목표

Discord 스레드 하나를 하나의 작업방으로 보고, 그 스레드에 대응하는 Hermes 세션이 로컬 Codex 작업 세션을 관리한다. 각 작업은 독립된 git worktree와 branch에서 진행하여 여러 스레드가 동시에 작업해도 로컬 working directory 충돌이 나지 않게 한다.

```text
Discord thread
  -> Hermes gateway session
  -> /opt/vibecoding/chess/sessions/thread-<id>/state.json
  -> /opt/vibecoding/chess/worktrees/thread-<id>
  -> branch vibe/thread-<id>-<slug>
  -> Codex exec/tmux session
  -> GitHub PR
  -> https://pr-<number>.chess.jihan.kr
```

## 역할 분담

| 구성 요소 | 책임 |
| --- | --- |
| Discord thread | 요청, 구체화 질문, 의사결정, 승인 기록 |
| Hermes | 오케스트레이션, 상태 관리, lock, Codex 지시, 검증, PR/preview 보고 |
| Codex | 해당 worktree 안에서 코드 구현/수정/테스트 보조 |
| GitHub | branch, commit, PR, CI, preview workflow의 source of truth |
| Caddy/GitHub Actions | PR별 preview 배포와 cleanup |

## 운영 원칙

1. **공유 checkout에서 직접 작업하지 않는다.** 모든 기능/버그 작업은 `worktrees/thread-<id>`에서 진행한다.
2. **스레드 하나에 worktree 하나.** 같은 스레드의 후속 요청은 같은 worktree/branch를 이어서 쓴다.
3. **스레드별 lock을 둔다.** 같은 스레드에 동시에 두 작업을 실행하지 않는다. 다른 스레드는 병렬 실행 가능하다.
4. **결정이 필요한 순간에는 멈추고 Discord에서 확인한다.** 예: UI 문구, 범위 축소/확대, 데이터 손실 가능성, production 변경, destructive command.
5. **작업 완료는 PR + preview URL로 보고한다.** production 반영은 별도 명시 승인 후 진행한다.

## 기본 명령

아래 명령은 repo root(`/opt/vibecoding/chess/repo`)에서 실행한다.

### 1. 스레드 작업 세션 생성

```bash
python scripts/vibecoding/thread_session.py init \
  --thread-id 1504370055520059402 \
  --slug mobile-board-layout \
  --request "모바일에서 체스판 레이아웃을 개선"
```

생성되는 항목:

- state: `/opt/vibecoding/chess/sessions/thread-1504370055520059402/state.json`
- prompt: `/opt/vibecoding/chess/sessions/thread-1504370055520059402/codex-prompt.md`
- worktree: `/opt/vibecoding/chess/worktrees/thread-1504370055520059402`
- branch: `vibe/thread-1504370055520059402-mobile-board-layout`

### 2. 상태 확인

```bash
python scripts/vibecoding/thread_session.py status \
  --thread-id 1504370055520059402
```

### 3. Codex에게 구현 위임

```bash
python scripts/vibecoding/thread_session.py run-codex \
  --thread-id 1504370055520059402 \
  --request "모바일 480px 이하에서 보드와 사이드 패널이 겹치지 않도록 수정"
```

기본값은 `codex exec --full-auto`다. 더 보수적으로 실행하려면:

```bash
python scripts/vibecoding/thread_session.py run-codex \
  --thread-id 1504370055520059402 \
  --auto none \
  --request "..."
```

Codex prompt에는 다음 안전 규칙이 포함된다.

- worktree 밖을 수정하지 않기
- production deploy path 또는 production deploy command를 건드리지 않기
- `pnpm` 사용
- 의사결정이 필요한 경우 작업을 멈추고 Hermes가 Discord에서 물어볼 질문을 남기기

### 4. Hermes 검증

Codex 작업 후 Hermes가 worktree에서 직접 확인한다.

```bash
cd /opt/vibecoding/chess/worktrees/thread-1504370055520059402
pnpm test
pnpm build
git diff --stat origin/main...HEAD
git status --short
```

실패하면 Hermes가 원인을 정리하고 Codex에게 재작업을 맡기거나, 사용자의 결정이 필요하면 Discord 스레드에서 확인한다.

### 5. PR 생성 및 preview URL 보고

```bash
python /opt/vibecoding/chess/repo/scripts/vibecoding/thread_session.py create-pr \
  --thread-id 1504370055520059402 \
  --title "feat: improve mobile board layout"
```

출력 예:

```json
{
  "pr_url": "https://github.com/bbbjihan/chess/pull/12",
  "preview_url": "https://pr-12.chess.jihan.kr"
}
```

기존 `.github/workflows/chess-preview.yml`이 PR opened/synchronize 이벤트에서 preview를 배포한다.

## Hermes가 기능 요청을 처리하는 방식

기능 관련 요청이 들어오면 Hermes는 다음 순서로 진행한다.

1. 요청을 한 문장 목표와 acceptance criteria로 정리한다.
2. 불명확하거나 사용자 취향/제품 결정이 필요한 항목을 Discord 스레드에서 먼저 확인한다.
3. 결정 없이 진행 가능한 부분은 thread session을 만들고 Codex에게 위임한다.
4. Codex가 질문/중단 신호를 남기면 Hermes가 이를 정리해 Discord 스레드에서 확인한다.
5. 테스트/빌드/diff를 Hermes가 직접 검증한다.
6. PR을 만들고 preview URL을 스레드에 제공한다.
7. production 배포 또는 destructive action은 명시 승인이 있을 때만 수행한다.

## 병렬성 보장 범위

이 구조가 방지하는 것:

- 여러 Codex 세션이 같은 로컬 파일을 동시에 수정하는 문제
- 한 작업의 `git checkout`/`git reset`이 다른 작업을 방해하는 문제
- PR preview 산출물이 서로 덮어쓰는 문제

여전히 GitHub 단계에서 발생 가능한 것:

- 두 PR이 같은 코드 영역을 수정했을 때 main merge/rebase 중 생기는 일반적인 merge conflict

즉, 로컬 working directory 충돌은 worktree로 분리하고, 코드 의미 충돌은 PR/rebase 단계에서 관리한다.
