<h1 align="center"><img width="60%" src="./assets/wordmark.png" alt="soppy-index" /></h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?logo=node.js&amp;logoColor=white" alt="Node.js >= 22.18" />
</p>

<div align="center">

[English](README.md) | [简体中文](README.zh-cn.md)

</div>

Frontend learning notes, runnable browser and Node.js labs, and coding exercises for understanding mechanisms and preparing for interviews. The teaching notes are in Simplified Chinese; demo interfaces, source comments, and console output use English.

## Features

- Learn how CSS layout, browser scheduling, networking, security, and delivery work through focused explanations.
- Compare predictions with observable browser behavior and bounded Node.js experiments.
- Practice algorithms, TypeScript types, JavaScript utilities, React, and Vue alongside local demos and tests.

## Installation

Use Node.js **>= 22.18** and the pnpm version declared in the root [package manifest](package.json) (`^11.18.0`). Install dependencies once at the repository root:

```bash
pnpm install --frozen-lockfile
```

## Start learning

Choose a question, read the mechanism, predict an example, then run the matching experiment or test. Topic notes explain the concepts; experiment guides provide setup and observations. Chromium readings describe fixed implementation snapshots, while Web-platform notes distinguish specification guarantees from browser behavior.

Run a short Node.js experiment from the repository root:

```bash
node docs/node/run.ts runtime
```

The runner checks its assertions and prints `lab-complete` on success. Use `node docs/node/run.ts --list` to list the CLI lessons. Browser labs have separate startup commands, URLs, and shutdown instructions in their experiment guides; they are not part of this runner.

| Area | Entry |
| --- | --- |
| CSS and browser fundamentals | [Box model](docs/css/box/box-model.md) · [DOM](docs/browser/dom/dom.md) · [Rendering](docs/browser/rendering/rendering.md) · [Event loop](docs/browser/event-loop/event-loop.md) |
| Runtime and protocols | [Node.js labs](docs/node/run.ts) · [Networking](docs/network/README.md) |
| Application boundaries | [Security](docs/security/foundations/trust-boundaries.md) · [Engineering](docs/engineering/README.md) |
| Browser implementation | [Chromium reading guide](docs/chromium/README.md) |
| Algorithms and types | [Structures](coding/structure/) · [Algorithms](coding/algorithm/) · [Hot 100](coding/hot100/) · [Type challenges](coding/type-challenges/README.md) |
| JavaScript mechanisms | [Functions](coding/function/function.md) · [Objects](coding/object/README.md) · [Arrays](coding/array/README.md) · [Promise](coding/promise/README.md) · [Scheduling](coding/schedule/README.md) · [Utilities](coding/utils/README.md) |
| Local UI demos | [CSS](coding/css/README.md) · [React](coding/react/README.md) · [Vue](coding/vue/README.md) · [Streaming](coding/stream/README.md) |
| Compiler stages | [Compiler walkthrough](packages/compiler/index.md) |

## Workspace commands

Run project tasks inside their workspace, for example `pnpm test` in `coding/utils/` or `pnpm build` in `packages/compiler/`. Run these repository-wide checks from the root:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

The root type check covers source using the shared TypeScript configuration, then invokes workspaces with their own `typecheck` script, including React, Vue, and streaming demos. Vitest runs the configured unit-test projects; HTTP integration tests and built-entry checks use the commands in their respective guides. Passing unit tests does not establish browser layout, focus, or production behavior.

## License

[MIT](LICENSE). Referenced upstream material retains its own notices; Chromium translations document their sources and versions separately.
