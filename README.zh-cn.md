<h1 align="center"><img width="60%" src="./assets/wordmark.png" alt="soppy-index" /></h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?logo=node.js&amp;logoColor=white" alt="Node.js >= 22.18" />
</p>

<div align="center">

[English](README.md) | [简体中文](README.zh-cn.md)

</div>

面向机制理解与面试准备的前端学习笔记、浏览器和 Node.js 实验，以及编程练习。教程使用简体中文，演示界面、源码注释与 Console 输出使用英文。

## 特性

- 通过专题解释 CSS 布局、浏览器调度、网络、安全与工程交付的原理。
- 用真实浏览器行为和有界的 Node.js 实验核对自己的预测。
- 结合本地演示与测试，练习算法、TypeScript 类型、JavaScript 工具函数、React 和 Vue。

## 安装

使用 Node.js **>= 22.18**，以及根目录[包清单](package.json)声明的 pnpm 版本（`^11.18.0`）。在仓库根目录统一安装依赖：

```bash
pnpm install --frozen-lockfile
```

## 开始学习

先选一个问题，阅读原理并预测示例结果，再运行对应实验或测试。专题文档负责完整解释，实验说明负责启动与观察。Chromium 选读描述固定版本的实现，Web 平台笔记则区分规范保证与浏览器行为。

在仓库根目录运行一个简短的 Node.js 实验：

```bash
node docs/node/run.ts runtime
```

运行器执行断言，成功时输出 `lab-complete`。`node docs/node/run.ts --list` 列出 CLI 实验；浏览器实验另有启动命令、地址和停止说明，不在这个运行器中执行。

| 领域 | 入口 |
| --- | --- |
| CSS 与浏览器基础 | [盒模型](docs/css/box/box-model.md) · [DOM](docs/browser/dom/dom.md) · [渲染](docs/browser/rendering/rendering.md) · [事件循环](docs/browser/event-loop/event-loop.md) |
| 运行时与协议 | [Node.js 实验](docs/node/run.ts) · [网络](docs/network/README.md) |
| 应用边界 | [安全](docs/security/foundations/trust-boundaries.md) · [工程化](docs/engineering/README.md) |
| 浏览器实现 | [Chromium 阅读指南](docs/chromium/README.md) |
| 算法与类型 | [数据结构](coding/structure/) · [算法](coding/algorithm/) · [Hot 100](coding/hot100/) · [类型挑战](coding/type-challenges/README.md) |
| JavaScript 机制 | [函数](coding/function/function.md) · [对象](coding/object/README.md) · [数组](coding/array/README.md) · [Promise](coding/promise/README.md) · [调度](coding/schedule/README.md) · [工具函数](coding/utils/README.md) |
| 本地界面演示 | [CSS](coding/css/README.md) · [React](coding/react/README.md) · [Vue](coding/vue/README.md) · [流式通信](coding/stream/README.md) |
| 编译阶段 | [编译器走查](packages/compiler/index.md) |

## 工作区命令

具体任务进入对应工作区执行，例如在 `coding/utils/` 运行 `pnpm test`，在 `packages/compiler/` 运行 `pnpm build`。以下全仓库检查在根目录执行：

```bash
pnpm typecheck
pnpm lint
pnpm test
```

根类型检查先覆盖使用共享 TypeScript 配置的源码，再调用提供独立 `typecheck` 脚本的工作区，包括 React、Vue 与流式演示。Vitest 执行已配置的单元测试项目；HTTP 集成测试和构建产物入口检查使用各自说明中的命令。单元测试通过不能证明真实浏览器布局、焦点或生产行为。

## 许可证

[MIT](LICENSE)。引用的上游材料保留各自声明；Chromium 译文另行标注来源与版本。
