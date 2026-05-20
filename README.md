# React + Vite

## Online play environment

Supabase Realtime invite-link play is enabled at build time with Vite public environment variables:

```sh
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For GitHub Actions preview/production deployments, configure them as repository secrets with the same names:

```sh
gh secret set VITE_SUPABASE_URL --repo bbbjihan/chess --body 'https://your-project-ref.supabase.co'
gh secret set VITE_SUPABASE_ANON_KEY --repo bbbjihan/chess --body 'your-supabase-anon-key'
```

If either value is missing, the app still builds and local/offline chess remains available, but the online panel reports that Supabase Realtime is unavailable.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
