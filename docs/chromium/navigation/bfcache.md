> 英文原文：[本地副本](../en/navigation/bfcache.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/bfcache.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="bfcache-overview"></a>

# BFCache 概览

<a id="tldr"></a>

## 概要

不使用前进/后退缓存（back/forward cache，BFCache）时，浏览器离开页面会丢弃 DOM 和整个 JavaScript 上下文。再次返回时，即使每项资源都来自 HTTP 缓存，也必须从头解析，并在新的 JavaScript 上下文中执行脚本。

有了 BFCache，浏览器离开页面时可能只是将其暂停，完整保留页面状态。返回时只需恢复执行，就能显著提升用户体验。

<a id="contact"></a>

## 联系方式

如需建议，请联系 [bfcache-dev@chromium.org](mailto:bfcache-dev@chromium.org)。

<a id="your-feature-and-bfcache"></a>

## 你的功能与 BFCache

忽略 BFCache 可能造成严重的隐私问题。BFCache 带来的性能收益非常大，因此不能先发布功能，再来考虑 BFCache。TAG、隐私团队和 API 负责人都会关注那些没有充分考虑 BFCache 的 API。

一些既有功能与 BFCache 不兼容。有些在现有 API 或用户体验设计下根本无法兼容；另一些可能兼容，只是出现得比 Chrome 的 BFCache 更早。我们确保这些功能处于活动状态时禁用 BFCache，以性能为代价避免隐私问题。我们不希望再增加这类功能。

<a id="specs"></a>

### 规范

如果功能属于 Web 平台，应确保规范考虑 BFCache，以及预渲染等其他非完全活动（non-fully-active）状态。

主要需要阅读两份文档：

- https://www.w3.org/TR/design-principles/#support-non-fully-active
- https://w3ctag.github.io/bfcache-guide/

所有新的 Web 平台功能都必须阅读它们。TAG 评审使用的安全与隐私问卷包含非完全活动状态行为的章节。Chrome 隐私团队也要求在隐私评审中专门考虑 BFCache 和其他非完全活动文档。

<a id="implementation"></a>

### 实现

即使功能只属于浏览器内部，也仍然可能需要考虑 BFCache。如果它与页面交互，或响应页面事件、导航，就可能需要处理一个事实：导航发生时，页面不一定销毁。“导航会销毁页面”这个假设曾经成立了几十年。

[这份文档](https://docs.google.com/document/d/1kR9QHWXXpoXsP3Y6JEDpIgZ5p7EgTTvdDN2kIrYdXcg/edit?tab=t.0#heading=h.b5k2sf3jhu99) 提供让功能与 BFCache 良好协作的建议。进行 explainer、设计或代码评审时，也欢迎[联系我们](mailto:bfcache-dev@chromium.org)。
