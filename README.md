# Interview Notes

Personal interview preparation: Chinese study notes paired with runnable examples, TypeScript algorithm practice, and type challenges.

## Browse

| Area                  | Entry                                                                            | Contents                                                                              |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Browser core          | [Rendering, scheduling, and loading](docs/browser/core/README.md)                | Rendering, event loop, script loading, page lifecycle, History navigation and BFCache |
| Browser storage       | [Storage labs](docs/browser/storage/README.md)                                   | Cookies, Web Storage, IndexedDB, storage management                                   |
| Browser cache         | [Cache labs](docs/browser/cache/README.md)                                       | HTTP response caching, freshness, and validation                                      |
| Browser communication | [Communication labs](docs/browser/communication/README.md)                       | BroadcastChannel, storage events, SharedWorker, window and channel messaging          |
| Browser observers     | [Observer labs](docs/browser/observer/README.md)                                 | DOM mutations, intersection thresholds, box resizing and cleanup                      |
| Browser APIs          | [Web API labs](docs/browser/api/README.md)                                       | URL, cloning, abortable fetch, files, Web Components and iframe                       |
| Browser DOM           | [DOM labs](docs/browser/dom/README.md)                                           | Nodes, collections, form state, layout reads and event propagation                    |
| Browser PWA           | [PWA notes](docs/browser/pwa/README.md)                                          | Service Worker lifecycle, Cache Storage, manifest and installation                    |
| Chromium              | [Official docs in Chinese and English](docs/chromium/README.md)                  | Architecture, rendering, navigation, WebUI and a frontend learning path               |
| CSS                   | [CSS notes](docs/css/README.md)                                                  | Cascade, flow, layout, typography, responsive design, effects and engineering         |
| Node.js               | [Node notes and labs](docs/node/README.md)                                       | Runtime, modules, async context, buffers, streams, HTTP, workers and diagnostics      |
| Network               | [Network course](docs/network/README.md)                                         | IP, TCP/UDP, DNS, TLS, HTTP, QUIC, WebRTC and packet analysis                         |
| Security              | [Frontend security](docs/security/README.md)                                     | Browser boundaries, XSS, CSRF, sessions, headers and engineering risks                |
| JavaScript            | [JavaScript deep dives](docs/javascript/README.md)                               | Values, scope, prototypes, promises, modules and runtime behavior                     |
| TypeScript            | [TypeScript course](docs/typescript/README.md)                                   | Modeling, narrowing, generics, type operations and compiler configuration             |
| Auth                  | [Authentication and login lab](docs/auth/README.md)                              | Sessions, OAuth/OIDC, JWT and a Next.js SSR login experiment                          |
| Demo infrastructure   | [Shared styles and helpers](docs/demo/README.md)                                 | Shared browser lab styling, port binding, bounded logs and agent integration          |
| Algorithms            | [Data structures](algorithm/structure/) and [special topics](algorithm/special/) | A README and runnable `index.ts` for each topic; links below                          |
| Interview practice    | [Hot 100](algorithm/hot100/)                                                     | Solutions grouped by problem type                                                     |
| TypeScript practice   | [Type challenges](handwrite/type-challenges/)                                    | Compile-time exercises                                                                |

Material in `__reference__/` is source material rather than the maintained learning entrypoint.

## Run examples

Use Node >= 22.18 (`.nvmrc` selects Node 22) for native execution of erasable TypeScript. Run commands from the repository root:

```bash
node algorithm/structure/heap/index.ts
node docs/browser/core/eventLoop/simulator.ts
node docs/browser/core/loading/index.ts
node docs/browser/communication/index.ts
node docs/browser/observer/index.ts
node docs/browser/api/index.ts
node docs/browser/dom/index.ts
node docs/node/runtime/index.ts
node docs/node/http/index.ts
node docs/network/lab/index.ts
```

The loading lab opens at <http://localhost:5004>. Browser labs start HTTP servers; use their README for the URL, experiments, and browser requirements, and stop them with `Ctrl+C`. Self-contained algorithm demos print results and exit. Hot 100 files with extensionless imports may require a separate runtime setup even if type checking passes.

Install development dependencies for validation:

```bash
npm ci
npx --no-install tsc --noEmit
npx --no-install eslint docs/browser/core/loading/index.ts
npx --no-install prettier --check docs/browser/core/loading
```

The root TypeScript configuration includes `code/`, `algorithm/`, and `docs/`; type challenges have their own exercise context. `npm run lint` checks the whole repository. Use targeted formatting for normal edits: `npm run format` rewrites the entire repository.

## Algorithm topics

| Data structures and techniques                                                                              | Method notes                                     |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [Heap](algorithm/structure/heap/README.md) · [PriorityQueue](algorithm/structure/priorityQueue/README.md)   | [LIS](algorithm/special/lis/README.md)           |
| [Deque](algorithm/structure/deque/README.md) · [MonoStack](algorithm/structure/monoStack/README.md)         | [LCS](algorithm/special/lcs/README.md)           |
| [FenwickTree](algorithm/structure/fenwickTree/README.md) · [SegTree](algorithm/structure/segTree/README.md) | [Manacher](algorithm/special/manacher/README.md) |
| [Trie](algorithm/structure/trie/README.md) · [SkipList](algorithm/structure/skipList/README.md)             | [TopoSort](algorithm/special/topoSort/README.md) |
| [UnionFind](algorithm/structure/unionFind/README.md) · [Knapsack](algorithm/structure/knapsack/README.md)   |                                                  |

## Agent guidance

Read [AGENTS.md](AGENTS.md) for shared instructions and [.agents/README.md](.agents/README.md) for the harness structure. Rules and skills live in `.agents/`; `CLAUDE.md` imports shared guidance for Claude Code, and `.claude/` contains client settings.
