<h1 align="center"><img width="60%" src="./assets/wordmark.png" alt="soppy-index" /></h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?logo=node.js&amp;logoColor=white" alt="Node.js >= 22.18" />
</p>

<div align="center">

[English](README.md) | [简体中文](README.zh-cn.md)

</div>

前端学习笔记、可运行实验与编程练习。项目正在持续开发中。

## 特性

- **学习笔记** — 用中文解释前端概念及其底层机制。
- **可观察实验** — 通过浏览器和 Node.js 实验，将理论与实际行为联系起来。
- **编程练习** — 数据结构、算法与 TypeScript 类型练习。

## 学习材料

| 领域 | 入口 |
| --- | --- |
| 浏览器 | [渲染](docs/browser/rendering/rendering.md) · [事件循环](docs/browser/event-loop/event-loop.md) · [加载](docs/browser/loading/experiment.md) · [生命周期](docs/browser/lifecycle/experiment.md) · [导航](docs/browser/navigation/experiment.md) · [存储](docs/browser/storage/webStorage/index.md) · [缓存](docs/browser/cache/experiment.md) · [通信](docs/browser/communication/cross-context-communication.md) · [观察器](docs/browser/observer/index.md) |
| 浏览器 API | [网络请求](docs/browser/network/fetch.md) · [文件](docs/browser/files/files.md) · [环境能力](docs/browser/environment/environment.md) · [Web Components](docs/browser/web-components/web-components.md) · [iframe](docs/browser/iframe/iframe.md) · [DOM](docs/browser/dom/dom.md) · [PWA](docs/browser/pwa/serviceWorker.md) · [Chromium](docs/chromium/README.md) |
| 语言与运行时 | [Node.js 实验](docs/node/run.ts) |
| Web 基础 | [CSS](docs/css/box/box-model.md) · [网络](docs/network/README.md) · [安全](docs/security/foundations/trust-boundaries.md) |
| 工程化 | [构建、架构、性能与监控](docs/engineering/README.md) |
| 编程练习 | [数据结构](coding/structure/) · [算法](coding/algorithm/) · [Hot 100](coding/hot100/) · [类型挑战](coding/type-challenges/README.md) |
| JavaScript 手写 | [函数](coding/function/) · [对象](coding/object/README.md) · [数组](coding/array/README.md) · [工具函数](coding/utils/README.md) |
| 异步与事件 | [Promise](coding/promise/README.md) · [调度](coding/schedule/README.md) · [前端设计模式](coding/design-pattern/README.md) |
| CSS 手写 | [布局、文本、图形与交互](coding/css/README.md) |

各实验 README 提供前置条件、运行命令、观察位置与停止方式。各 demo 自行维护页面资源、路由和测试。

## 工作区命令

在仓库根目录运行 `pnpm install --frozen-lockfile` 安装依赖。具体任务进入对应子包执行，例如在 `coding/utils/` 运行 `pnpm test`，在 `packages/compiler/` 运行 `pnpm build`。根目录保留全仓库检查和版本管理脚本。

`coding/` 的所有一级目录均为 workspace 子包，统一复用根 `tsconfig.json`，不重复提供 typecheck 脚本。在仓库根目录运行 `pnpm typecheck` 即可；有独立 TypeScript 配置的工作区保留各自的检查脚本，由根命令一并调用。

## 许可证

[MIT](LICENSE)。
