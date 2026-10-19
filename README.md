<h1 align="center"><img width="60%" src="./assets/wordmark.png" alt="soppy-index" /></h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?logo=node.js&amp;logoColor=white" alt="Node.js >= 22.18" />
</p>

<div align="center">

[English](README.md) | [简体中文](README.zh-cn.md)

</div>

Frontend learning notes, runnable experiments, and coding exercises. This project is under active development.

## Features

- **Study notes** — Chinese explanations of frontend concepts and their underlying mechanisms.
- **Observable experiments** — browser and Node.js labs connecting theory to actual behavior.
- **Coding practice** — data structures, algorithms, and TypeScript type exercises.

## Learning material

| Area | Entry |
| --- | --- |
| Browser | [Rendering](docs/browser/rendering/rendering.md) · [Event Loop](docs/browser/event-loop/event-loop.md) · [Loading](docs/browser/loading/experiment.md) · [Lifecycle](docs/browser/lifecycle/experiment.md) · [Navigation](docs/browser/navigation/experiment.md) · [Storage](docs/browser/storage/webStorage/index.md) · [Cache](docs/browser/cache/experiment.md) · [Communication](docs/browser/communication/cross-context-communication.md) · [Observers](docs/browser/observer/index.md) |
| Browser APIs | [Network](docs/browser/network/fetch.md) · [Files](docs/browser/files/files.md) · [Environment](docs/browser/environment/environment.md) · [Web Components](docs/browser/web-components/web-components.md) · [iframe](docs/browser/iframe/iframe.md) · [DOM](docs/browser/dom/dom.md) · [PWA](docs/browser/pwa/serviceWorker.md) · [Chromium](docs/chromium/README.md) |
| Languages and runtime | [Node.js labs](docs/node/run.ts) |
| Web foundations | [CSS](docs/css/box/box-model.md) · [Network](docs/network/README.md) · [Security](docs/security/foundations/trust-boundaries.md) |
| Engineering | [Build, architecture, performance, and monitoring](docs/engineering/README.md) |
| Coding practice | [Structures](coding/structure/) · [Algorithms](coding/algorithm/) · [Hot 100](coding/hot100/) · [Type challenges](coding/type-challenges/README.md) |
| Handwritten JavaScript | [Functions](coding/function/) · [Objects](coding/object/README.md) · [Arrays](coding/array/README.md) · [Utilities](coding/utils/README.md) |
| Async and events | [Promise](coding/promise/README.md) · [Scheduling](coding/schedule/README.md) · [Frontend design patterns](coding/design-pattern/README.md) |
| CSS practice | [Layouts, text, shapes and interactions](coding/css/README.md) |

Lab READMEs provide prerequisites, run commands, observations, and shutdown instructions. Each demo keeps its UI assets, route handlers, and tests locally.

## Workspace commands

Install dependencies at the repository root with `pnpm install --frozen-lockfile`. Run project-specific tasks inside their workspace, such as `pnpm test` in `coding/utils/` or `pnpm build` in `packages/compiler/`. The root keeps repository-wide checks and version-management scripts.

All top-level `coding/` directories are workspace packages and reuse the root `tsconfig.json`. Run `pnpm typecheck` at the repository root; coding packages do not duplicate that script. Workspaces with separate TypeScript configurations keep their own type checks, which the root command also runs.

## License

[MIT](LICENSE).
