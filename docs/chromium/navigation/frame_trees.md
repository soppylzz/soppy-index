> 英文原文：[本地副本](../en/navigation/frame_trees.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/frame_trees.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="demystifying-frametree-concepts"></a>

# 理解 FrameTree 概念

<a id="what-are-frame-trees"></a>

## 什么是帧树？

渲染网页时存在两种 FrameTree 表示：

- Blink 的 [FrameTree](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/page/frame_tree.h)。
- Content 的 [FrameTree](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/content/browser/renderer_host/frame_tree.h)。

两者非常相似，但 Content 一侧可以在帧树中放置一个占位的 [FrameTreeNode](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/content/browser/renderer_host/frame_tree_node.h)，用来承载另一棵帧树。该节点当前的 RenderFrameHost 会持有一个有效的 `RenderFrameHostImpl::inner_tree_main_frame_tree_node_id`，指向内部帧树的节点 ID。

渲染器一侧的 Blink 帧树没有这个占位概念；其结构与 Web 暴露的 [window.frames](https://developer.mozilla.org/en-US/docs/Web/API/Window/frames) 所呈现的结构一致。

<a id="why-do-we-nest-frame-trees"></a>

## 为什么要嵌套帧树？

某些嵌套文档的功能需要比 iframe 更强的边界，阻止信息跨越边界暴露。这可能出于隐私考虑，例如 fenced frame 对 Web 文档间通信施加限制；边界也可能位于 Web 内容与使用 Web 技术实现的用户代理功能之间，例如 Chrome PDF 查看器、webview 标签。

<a id="what-are-outermost-main-frames"></a>

## 什么是最外层主帧？

一棵 `FrameTree` 可以嵌入另一棵 `FrameTree`，并存在多层嵌套。在此基础上，`OutermostMainFrame` 指没有嵌入其他帧树的那棵帧树的主帧，也就是根节点。[参见脚注 1。](#footnote_1)

因此，用户看到的一个标签页中可以存在多个主帧。例如 fenced frame 的内部 `FrameTree` 有自己的主帧，但它不是 `OutermostMainFrame`。

通常使用 `RenderFrameHost::GetParent` 判断是否为主帧；相应地，使用 `RenderFrameHost::GetParentOrOuterDocument` 判断是否为最外层主帧。

```
Example Frame Tree:
    A
     B (iframe)
     C (fenced frame - placeholder frame) [See footnote 2.]
      C* (main frame in fenced frame).

    C* GetParent returns null.
    C* GetParentOrOuterDocument returns A.
    C GetParent & GetParentOrOuterDocument returns A.
    B GetParent & GetParentOrOuterDocument returns A.
    A GetParent & GetParentOrOuterDocument returns nullptr.
```

<a id="can-i-have-multiple-outermost-main-frames"></a>

## 可以有多个最外层主帧吗？

预渲染和 BFCache 等功能会让一个 `WebContents` 中存在其他最外层主帧。

<a id="what-are-pages"></a>

## 什么是 Page？

“页面”一词可能有多种含义，这里明确指两个类：

- Blink 的 [Page](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/third_party/blink/renderer/core/page/page.h)。
- Content 的 [Page](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/content/public/browser/page.h)。

两者用途相近，本质上都是表示一棵帧树状态的对象。由于帧可能为隔离而分布在不同渲染器中，Content 的一个 Page 可以对应多个 Blink Page：每个参与渲染的渲染器各持有一个。

<a id="what-is-the-primary-page"></a>

## 什么是 Primary Page？

一个 `WebContents` 在任一时刻只有一个 Primary Page。它的主帧是最外层主帧，并且正在标签页中显示。

Primary Page 会随时间变化，参见 `WebContentsObserver::PrimaryPageChanged`。导航、从 `BackForwardCache` 恢复 Page，或激活预渲染页面，都可能导致 Primary Page 改变。

<a id="relationships-between-core-classes-in-content"></a>

## content/ 中核心类的关系

WebContents 表示一个标签页，拥有一棵用于当前显示内容的“主要帧树”（primary frame tree）。它也可能为预渲染等功能间接拥有其他 FrameTree。

FrameTree 由 FrameTreeNode 构成，每个节点包含 RenderFrameHost。FrameTreeNode 反映渲染器中的帧结构；RenderFrameHost 大致表示帧中加载的文档，[具体见脚注 3](#footnote_3)。帧导航时，RenderFrameHost 可能改变，但 FrameTreeNode 保持不变。

对于嵌套帧树，宿主文档对应的 RenderFrameHost 拥有内部 FrameTree。有时会通过中间对象持有，例如 `content::FencedFrame`。

<a id="mparch"></a>

## “MPArch”

MPArch 是 Multiple Page Architecture（多页面架构）的缩写，也是让单个 WebContents 支持多棵 FrameTree 的项目名称。

代码注释中还会用 MPArch 描述依赖多帧树的功能，例如“忽略来自 MPArch 页面的导航”。这些说法指上文的非主要帧树。

更多信息见最初的[设计文档](https://docs.google.com/document/d/1NginQ8k0w3znuwTiJ5qjYmBKgZDekvEPC22q0I4swxQ/edit?usp=sharing)。

<a id="footnotes"></a>

## 脚注

<a name="footnote_1"></a>1：GuestView，即一个 WebContents 内嵌另一个 WebContents，也被视为嵌入式 FrameTree。但对于 OutermostMainFrame 的判定，例如 GetParentOrOuterDocument、Primary Page，由于这种逻辑嵌入边界，判定不会越过 WebContents 边界。

<a name="footnote_2"></a>2：占位 RenderFrameHost 通常不会暴露到 content 边界之外。ForEachRenderFrameHost 等遍历 API 不会访问这个节点。

<a name="footnote_3"></a>3：RenderFrameHost 与渲染器内的文档不是一一对应关系，参见 [RenderDocument](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/render_document.md)。
