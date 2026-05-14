# Chess

React + Vite chess app deployed to `chess.jihan.kr` through the self-hosted vibe-coding pipeline.

## Vibe-coding workflow

Feature work requested from Discord should use a thread-scoped Hermes/Codex session:

1. Create or reuse a thread session with `scripts/vibecoding/thread_session.py init`.
2. Run Codex only inside the generated worktree under `/opt/vibecoding/chess/worktrees/thread-<id>`.
3. Ask for product/scope/destructive-operation decisions in the same Discord thread before proceeding.
4. Verify with `pnpm test` and `pnpm build`.
5. Open a PR and provide `https://pr-<number>.chess.jihan.kr` as the preview URL.

See [`docs/vibecoding/thread-codex-workflow.md`](docs/vibecoding/thread-codex-workflow.md) for the full operating procedure.

## React + Vite

This app uses a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
