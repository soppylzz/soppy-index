> 英文原文：[本地副本](../en/overview/source_tree_overview.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/source_tree_overview.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="chromium-source-tree-overview"></a>

# Chromium 源码目录概览

本文从整体上介绍 Chromium 源码，说明主要顶层目录的用途。

<a id="core-application-logic"></a>

### 应用核心逻辑

- `//chrome`：Chrome 浏览器应用本身的代码。它将底层组件整合为最终产品，包括 UI、浏览器特有功能和应用逻辑。
- `//components`：提供特定功能的可复用模块，例如自动填充、书签、登录和策略。这些模块设计为构建在 `//content` 之上，并尽量减少相互依赖。

<a id="core-abstraction-layers"></a>

### 核心抽象层

- `//content`：多进程渲染引擎的核心抽象，封装沙箱及浏览器进程、渲染器进程模型。大多数功能构建在 Content API 之上，该层位于 `//chrome` 之下。
- `//third_party/blink`：Blink 渲染引擎，在沙箱内的渲染器进程中实现开放 Web 平台，例如 DOM、CSS 和 JavaScript API。

<a id="foundational-libraries"></a>

### 基础库

- `//base`：Chromium 的基础构件，包括 C++ 工具、数据结构、线程相关基础设施（`base::Callback`、`base::TaskRunner`）和平台抽象。大多数其他代码依赖此目录。
- `//net`：网络栈，实现从 HTTP 到 QUIC 的网络协议，并提供网络请求抽象。
- `//mojo`：用于进程和服务之间通信的核心 IPC（进程间通信）库。
- `//services`：独立服务的集合。这些服务通常在自己的进程中运行，通过 Mojo 接口通信。

<a id="ui-toolkits"></a>

### UI 工具包

- `//ui`：构建用户界面的基础工具包。
- `//ui/views`：构建跨平台桌面 UI（Windows、Linux、ChromeOS）的主要框架，提供基于控件的系统，用于创建具有原生体验的界面。
