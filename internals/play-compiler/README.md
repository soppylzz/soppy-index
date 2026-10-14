# @soppy-index/play-compiler

Runnable compiler experiments and a real Vite 7.3.1 integration.

Contains valid examples, diagnostic fixtures, a CLI experiment runner, and a pre-transform plugin for self-contained `.mini.ts` files. The plugin calls the handwritten compiler and returns ESM with a source map; Vite handles loading and bundling.

From the repository root:

```bash
pnpm compiler:hello
pnpm compiler:modules:cjs
pnpm play:compiler
pnpm play:compiler:build
pnpm play:compiler:preview
```

Development: <http://127.0.0.1:5178>. Preview after build: <http://127.0.0.1:5179>. Stop with `Ctrl+C`; port conflicts fail explicitly. CLI artifacts are in `dist/output/`, Vite output in `dist/vite/`, relative to this workspace.

See the [Chinese walkthrough](../../packages/compiler/index.md) and [Vite integration notes](../../packages/compiler/docs/vite.md).
