> 英文原文：[Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/navigation.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="life-of-a-navigation"></a>

# 一次导航的生命周期

导航是浏览器的主要功能之一，让用户在文档内或文档间移动，也可能跨越来源等安全上下文。

本文跟踪从地址栏输入 URL 到网页完全加载的过程。这只是许多导航类型中的一种；其他导航可能从不同位置开始，例如渲染器进程。

另请参阅：

- Chrome University 的 [Life of a Navigation 技术分享](https://youtu.be/mX7jQsGCF6E)及[幻灯片](https://docs.google.com/presentation/d/1YVqDmbXI0cllpfXD7TuewiexDNZYfwk6fRdmoXJbBlM/edit)。
- [导航概念](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/navigation_concepts.md)：Chromium 导航相关概念说明。
- [会话历史](session_history.md)：前进、后退导航。
- [特殊 URL](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/special_case_urls.md)：导航行为特殊、需要额外考虑的 URL。

- [BeforeUnload](#beforeunload)
- [网络请求与响应](#network-request-and-response)
- [提交](#commit)
- [加载](#loading)
- [WebContentsObserver](#webcontentsobserver)
  - [导航](#navigation)
  - [加载](#loading-1)
- [NavigationThrottle](#navigationthrottles)

<a id="beforeunload"></a>

## BeforeUnload

输入 URL 后，如果已有文档加载，导航首先执行旧文档的 beforeunload 处理器。它允许旧文档询问用户是否离开，避免丢失尚未保存的数据。用户可以取消导航，此时不再继续后续工作。

<a id="network-request-and-response"></a>

## 网络请求与响应

如果没有注册 beforeunload 处理器，或用户同意继续，下一步是请求指定 URL，获取待渲染文档的内容。并非所有导航都会访问真实网络，例如 Service Worker、WebUI、缓存、data: 等情况。

假定没有 DNS 解析失败、socket 连接超时等网络错误，服务器会返回数据，其中响应头先到达。解析后的响应头提供足够的信息来决定下一步。

HTTP 状态码使浏览器进程能够区分：

- 成功响应：2xx。
- 重定向：3xx。
- HTTP 层错误：4xx、5xx。

有两种情况下，导航网络请求可以完成，却不渲染新文档。第一种是 HTTP 204 或 205：响应成功但没有后续内容，当前文档继续保持活动。第二种是 `Content-Disposition` 指示将响应作为下载处理，而不是导航。

如果响应是重定向，Chromium 根据状态码和 Location 头发起下一次请求，不断跟随，直到遇到错误或成功响应。

重定向结束后，网络栈判断是否需要 MIME 类型嗅探，以识别响应类型。原文描述的条件是：不是 204/205 或下载，没有 `Content-Type`，也没有 `X-Content-Type-Options: nosniff`。需要嗅探时，网络栈在继续提交前先读取一小块实际响应数据。

<a id="commit"></a>

## 提交

此时网络栈将响应交给浏览器进程，用于渲染新文档。浏览器根据响应的来源、响应头、当前进程模型和隔离策略，为新文档选择合适的渲染器进程。响应头也可能影响来源，例如 `Content-Security-Policy: sandbox;` 会使文档具有不透明来源。

随后浏览器通过“commit” IPC 将响应发送给选定进程，等待它创建文档并通过 Mojo 回调确认。浏览器收到该确认，是导航具有权威性的提交时刻：此时浏览器更新安全状态以反映新文档，并为旧文档创建会话历史条目。

创建新文档时需要卸载旧文档。如果导航保留在同一渲染器进程，Blink 会在创建新文档前卸载旧文档，包括执行已注册的 unload 处理器。跨进程导航中，旧文档进程执行 unload，与新进程创建新文档并发进行。

新文档创建完成，且浏览器进程收到渲染器的提交消息后，导航即告完成。

> 译注：本节翻译的是原文所选的导航流程。BFCache、预渲染激活及 unload 策略会带来不同路径，不能据此断言每次导航都会销毁旧文档或执行 unload；结合 [BFCache](bfcache.md) 阅读。

<a id="loading"></a>

## 加载

导航完成时，用户通常还看不到新页面。日常使用“导航”指从一页到另一页的整个过程，但 Chromium 将其分为两个阶段：前面描述的是导航阶段，提交后进入加载阶段。

加载包括继续读取服务器响应、解析数据、渲染文档以供用户查看、执行脚本，以及加载文档指定的子资源。

这样划分的主要原因是，提交前后的错误处理不同。服务器返回 HTTP 错误时，浏览器仍提交新文档，但内容是错误页面，可能按状态码生成，也可能来自服务器响应体。

如果成功导航已经提交真实文档并进入加载阶段，后续仍可能遇到连接终止或超时。此时浏览器尽可能显示新文档中已获得的内容，而不改为错误页面。

<a id="webcontentsobserver"></a>

## WebContentsObserver

Chromium 通过 [WebContentsObserver] 接口中的方法暴露导航和文档加载的各个阶段。

<a id="navigation"></a>

### 导航

- `DidStartNavigation`：执行 beforeunload 之后、首次网络请求之前调用。
- `DidRedirectNavigation`：每次遇到服务器重定向时调用。
- `ReadyToCommitNavigation`：浏览器已决定提交并选择渲染器，但尚未将导航发送给渲染器时调用。同文档导航不会调用。
- `DidFinishNavigation`：原文以已提交路径说明此回调；提交结果可以是错误页，也可以是成功文档。

> 译注：接口本身也会在未提交的失败或取消导航结束时通知 `DidFinishNavigation`。调用方应检查 NavigationHandle 的提交状态，而不能仅凭收到回调就认定提交成功；参见文末接口源码中的 `NavigationHandle::HasCommitted()` 说明。

<a id="loading-1"></a>

### 加载

- `DidStartLoading`：每个 WebContents 触发，在 beforeunload 之后、导航即将开始时调用，相当于浏览器 UI 开始显示加载指示器；它早于该导航的 DidStartNavigation。
- `DOMContentLoaded`：按 RenderFrameHost 通知，文档本身完成加载，但子资源可能尚未完成。
- `DidFinishLoad`：按 RenderFrameHost 通知，文档及其子资源已加载完成。
- `DidStopLoading`：按 WebContents 通知，顶层文档、其子资源、所有子帧及其子资源全部加载完成，相当于浏览器 UI 停止显示加载指示器。
- `DidFailLoad`：按 RenderFrameHost 通知加载失败，例如在读完响应数据前网络连接终止。

<a id="navigationthrottles"></a>

## NavigationThrottle

NavigationThrottle 可以观察、延迟、阻止或取消一次导航。通常不应借此修改导航，例如模拟重定向，原因见[导航概念](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/navigation_concepts.md#rules-for-canceling-navigations)。它们通常在 `NavigationThrottleRegistryImpl::RegisterNavigationThrottles` 或 `ContentBrowserClient::CreateThrottlesForNavigation` 中注册。

最常用的事件是 `WillStartRequest`、`WillRedirectRequest`、`WillProcessResponse`，分别可在网络请求发送前、重定向过程中、收到响应后进行拦截。这些事件只适用于需要 URLLoader 的导航，参见 `NavigationRequest::NeedsUrlLoader`。

如需拦截不使用 URLLoader 的导航，例如同文档导航、about:blank，应在 `NavigationThrottleRegistryImpl::RegisterNavigationThrottlesForCommitWithoutUrlLoader` 注册，并接收单个 `WillCommitWithoutUrlLoader`，而不是完整的网络请求相关事件组。

页面激活导航，例如激活预渲染页面或从 BFCache 恢复，会完全跳过 NavigationThrottle。

[WebContentsObserver]: https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/content/public/browser/web_contents_observer.h
