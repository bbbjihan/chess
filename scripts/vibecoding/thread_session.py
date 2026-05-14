#!/usr/bin/env python3
"""Manage Discord-thread-scoped vibe-coding work sessions.

This script keeps each Discord thread isolated in its own git branch and
worktree, then gives Hermes a repeatable way to hand coding work to Codex and
open a GitHub PR whose preview is deployed by the existing PR workflow.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_APP_NAME = "chess"
DEFAULT_DEPLOY_ROOT = Path("/opt/vibecoding")
DEFAULT_BASE_BRANCH = "main"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if check and proc.returncode != 0:
        location = f" in {cwd}" if cwd else ""
        raise SystemExit(f"Command failed{location}: {' '.join(cmd)}\n{proc.stdout}")
    return proc


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9가-힣._-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-._")
    return value[:48] or "task"


def safe_thread_id(value: str) -> str:
    value = value.strip()
    if not re.fullmatch(r"[A-Za-z0-9._:-]+", value):
        raise SystemExit("thread-id may contain only letters, numbers, '.', '_', ':' and '-'")
    return value


def ensure_git_repo(repo_dir: Path) -> None:
    if not (repo_dir / ".git").exists():
        raise SystemExit(f"Not a git repository: {repo_dir}")
    run(["git", "rev-parse", "--git-dir"], cwd=repo_dir)


def paths(args: argparse.Namespace) -> dict[str, Path]:
    deploy_root = Path(args.deploy_root).expanduser().resolve()
    app_root = deploy_root / args.app_name
    thread_id = safe_thread_id(args.thread_id)
    state_dir = app_root / "sessions" / f"thread-{thread_id}"
    return {
        "deploy_root": deploy_root,
        "app_root": app_root,
        "sessions_root": app_root / "sessions",
        "worktrees_root": app_root / "worktrees",
        "state_dir": state_dir,
        "state_file": state_dir / "state.json",
        "prompt_file": state_dir / "codex-prompt.md",
        "lock_dir": state_dir / ".lock",
    }


def load_state(state_file: Path) -> dict[str, Any]:
    if not state_file.exists():
        raise SystemExit(f"No session state found: {state_file}. Run init first.")
    return json.loads(state_file.read_text())


def save_state(state_file: Path, state: dict[str, Any]) -> None:
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state["updated_at"] = now_iso()
    tmp = state_file.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    tmp.replace(state_file)


@contextmanager
def session_lock(lock_dir: Path):
    try:
        lock_dir.mkdir(parents=True)
        (lock_dir / "created_at").write_text(now_iso() + "\n")
        yield
    except FileExistsError:
        raise SystemExit(f"Session is already locked: {lock_dir}")
    finally:
        if lock_dir.exists():
            shutil.rmtree(lock_dir)


def render_codex_prompt(state: dict[str, Any], extra_request: str = "") -> str:
    preview = state.get("preview_url") or "created after PR opens"
    request = extra_request.strip() or state.get("request", "")
    return f"""You are Codex, the coding worker for a Discord-thread-scoped vibe-coding task.

Context:
- App: {state['app_name']}
- Repo: {state['repo_dir']}
- Worktree: {state['worktree']}
- Branch: {state['branch']}
- Discord thread id: {state['thread_id']}
- Preview URL: {preview}

Rules:
1. Work only inside the listed worktree.
2. Do not touch production deploy paths or run production deploy commands.
3. Use pnpm for install/test/build commands.
4. If product decisions, UI copy, scope trade-offs, destructive actions, or production changes are needed, stop and write a clear question for Hermes to ask in the Discord thread.
5. Prefer small commits with conventional commit messages.
6. Before finishing, run the relevant tests and build when practical.

User request:
{request}
"""


def cmd_init(args: argparse.Namespace) -> None:
    repo_dir = Path(args.repo_dir).expanduser().resolve()
    ensure_git_repo(repo_dir)
    p = paths(args)
    p["sessions_root"].mkdir(parents=True, exist_ok=True)
    p["worktrees_root"].mkdir(parents=True, exist_ok=True)

    thread_id = safe_thread_id(args.thread_id)
    slug = slugify(args.slug or args.thread_id)
    branch = args.branch or f"vibe/thread-{thread_id}-{slug}"
    worktree = p["worktrees_root"] / f"thread-{thread_id}"

    run(["git", "fetch", "origin", args.base_branch], cwd=repo_dir)
    branch_exists = run(["git", "rev-parse", "--verify", "--quiet", branch], cwd=repo_dir, check=False).returncode == 0
    if not branch_exists:
        run(["git", "branch", branch, f"origin/{args.base_branch}"], cwd=repo_dir)

    if not worktree.exists():
        run(["git", "worktree", "add", str(worktree), branch], cwd=repo_dir)
    else:
        ensure_git_repo(worktree)

    state = {
        "version": 1,
        "thread_id": thread_id,
        "app_name": args.app_name,
        "repo_dir": str(repo_dir),
        "base_branch": args.base_branch,
        "branch": branch,
        "worktree": str(worktree),
        "status": "ready",
        "request": args.request or "",
        "pr_number": None,
        "pr_url": None,
        "preview_url": None,
        "created_at": now_iso(),
    }
    save_state(p["state_file"], state)
    p["prompt_file"].write_text(render_codex_prompt(state))
    print(json.dumps(state, ensure_ascii=False, indent=2))
    print(f"Codex prompt: {p['prompt_file']}")


def cmd_status(args: argparse.Namespace) -> None:
    p = paths(args)
    state = load_state(p["state_file"])
    print(json.dumps(state, ensure_ascii=False, indent=2))


def cmd_prompt(args: argparse.Namespace) -> None:
    p = paths(args)
    state = load_state(p["state_file"])
    prompt = render_codex_prompt(state, args.request or "")
    p["prompt_file"].write_text(prompt)
    print(prompt)


def cmd_run_codex(args: argparse.Namespace) -> None:
    if not shutil.which("codex"):
        raise SystemExit("codex CLI not found. Install with: npm install -g @openai/codex")
    p = paths(args)
    state = load_state(p["state_file"])
    prompt = render_codex_prompt(state, args.request or "")
    worktree = Path(state["worktree"])
    with session_lock(p["lock_dir"]):
        state["status"] = "coding"
        save_state(p["state_file"], state)
        command = ["codex", "exec"]
        if args.auto == "full-auto":
            command.append("--full-auto")
        elif args.auto == "yolo":
            command.append("--yolo")
        command.append(prompt)
        proc = subprocess.run(command, cwd=worktree)
        state["status"] = "codex_complete" if proc.returncode == 0 else "codex_failed"
        state["last_codex_exit_code"] = proc.returncode
        save_state(p["state_file"], state)
        raise SystemExit(proc.returncode)


def cmd_create_pr(args: argparse.Namespace) -> None:
    if not shutil.which("gh"):
        raise SystemExit("gh CLI not found or not on PATH")
    p = paths(args)
    state = load_state(p["state_file"])
    worktree = Path(state["worktree"])
    title = args.title or f"feat: vibe coding task from thread {state['thread_id']}"
    body = args.body or (
        "## Summary\n"
        f"- Discord thread: `{state['thread_id']}`\n"
        "- Implemented via thread-scoped Hermes/Codex worktree flow.\n\n"
        "## Verification\n"
        "- [ ] pnpm test\n"
        "- [ ] pnpm build\n\n"
        "## Preview\n"
        "The preview workflow will publish this PR at "
        f"`https://pr-<number>.{state['app_name']}.jihan.kr`."
    )
    with session_lock(p["lock_dir"]):
        run(["git", "push", "-u", "origin", state["branch"]], cwd=worktree)
        existing = run(["gh", "pr", "view", "--json", "number,url", "--jq", "."], cwd=worktree, check=False)
        if existing.returncode == 0 and existing.stdout.strip():
            pr = json.loads(existing.stdout)
        else:
            created = run(["gh", "pr", "create", "--base", state["base_branch"], "--head", state["branch"], "--title", title, "--body", body], cwd=worktree)
            pr_url = created.stdout.strip().splitlines()[-1]
            viewed = run(["gh", "pr", "view", pr_url, "--json", "number,url", "--jq", "."], cwd=worktree)
            pr = json.loads(viewed.stdout)
        state["pr_number"] = pr["number"]
        state["pr_url"] = pr["url"]
        state["preview_url"] = f"https://pr-{pr['number']}.{state['app_name']}.jihan.kr"
        state["status"] = "pr_open"
        save_state(p["state_file"], state)
    print(json.dumps({"pr_url": state["pr_url"], "preview_url": state["preview_url"]}, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app-name", default=os.environ.get("APP_NAME", DEFAULT_APP_NAME))
    parser.add_argument("--deploy-root", default=os.environ.get("DEPLOY_ROOT", str(DEFAULT_DEPLOY_ROOT)))
    sub = parser.add_subparsers(dest="command", required=True)

    def add_thread_flags(p: argparse.ArgumentParser) -> None:
        p.add_argument("--thread-id", required=True)

    init = sub.add_parser("init", help="Create/reuse a thread-scoped branch and worktree")
    add_thread_flags(init)
    init.add_argument("--repo-dir", default=os.getcwd())
    init.add_argument("--base-branch", default=DEFAULT_BASE_BRANCH)
    init.add_argument("--slug", default="")
    init.add_argument("--branch", default="")
    init.add_argument("--request", default="")
    init.set_defaults(func=cmd_init)

    status = sub.add_parser("status", help="Print the stored session state")
    add_thread_flags(status)
    status.set_defaults(func=cmd_status)

    prompt = sub.add_parser("prompt", help="Render/update the Codex handoff prompt")
    add_thread_flags(prompt)
    prompt.add_argument("--request", default="")
    prompt.set_defaults(func=cmd_prompt)

    run_codex = sub.add_parser("run-codex", help="Run Codex in this thread's isolated worktree")
    add_thread_flags(run_codex)
    run_codex.add_argument("--request", default="")
    run_codex.add_argument("--auto", choices=["none", "full-auto", "yolo"], default="full-auto")
    run_codex.set_defaults(func=cmd_run_codex)

    pr = sub.add_parser("create-pr", help="Push the branch and create/reuse a GitHub PR")
    add_thread_flags(pr)
    pr.add_argument("--title", default="")
    pr.add_argument("--body", default="")
    pr.set_defaults(func=cmd_create_pr)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
