> 英文原文：[本地副本](../en/overview/process_model_and_site_isolation.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/process_model_and_site_isolation.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="process-model-and-site-isolation"></a>

# 进程模型与站点隔离

随着早期 Web 发展，网站从简单文档变成主动运行的程序，浏览器也从文档渲染器变成了这些程序的操作系统。Chromium 等现代浏览器使用多个操作系统进程管理工作负载，以改善稳定性、安全性和性能。

Chromium 的**进程模型**决定如何将文档、worker 及其他 Web 内容划分到进程中。首先，需要判断 Web“程序”的哪些部分必须共处一个进程。Web 程序并不只是单个文档及其子资源，而是一组能够完整访问彼此内容、同源或来源相近的文档。确定这些不可拆分的组后，再决定哪些组共享进程，并根据平台、可用资源等调整隔离程度。

本文介绍进程模型的目标、设计及其使用方式，包括站点隔离。

> 译注：以下平台、内存阈值、开关和“当前”行为均按所收录原文翻译；它们是 Chromium 的版本化实现策略，不是 Web 标准保证，也不应直接推断为阅读当天所有浏览器产品的行为。尤其要区分 site、origin、进程隔离和 `crossOriginIsolated`。

- [目标](#goals)
- [抽象与实现](#abstractions-and-implementations)
- [模式与适用平台](#modes-and-availability)
  - [全站点隔离：site-per-process](#full-site-isolation-site-per-process)
  - [部分站点隔离](#partial-site-isolation)
  - [不进行站点隔离](#no-site-isolation)
  - [来源隔离](#origin-isolation)
  - [CrossOriginIsolated](#crossoriginisolated)
  - [历史模式](#historical-modes)
- [可视化](#visualizations)
- [进程复用](#process-reuse)
- [进程锁](#process-locks)
- [特殊情况](#special-cases)
- [视频](#videos)
- [延伸阅读](#further-reading)

<a id="goals"></a>

## 目标

总体上，Chromium 尽可能让不同的网站实例运行在不同进程中。**网站实例**是一组为满足跨文档脚本访问等需求而必须共享进程的文档或 worker，大致对应 HTML 标准的 [agent cluster](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-agent-cluster-formalism)，具体差异见后文。

从稳定性看，独立进程限制渲染器崩溃或挂起的影响范围，使其他内容继续工作。从性能看，它允许不同实例并行运行、改善响应，但每个进程都会带来额外内存开销。

从安全性看，为不同网站严格使用独立进程，能更有力地防御恶意网站。除将 Web 内容放在低权限[沙箱](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/design/sandbox.md)中、限制攻击者访问用户机器之外，多进程架构还支持[站点隔离](https://www.chromium.org/Home/chromium-security/site-isolation)，让每个 renderer 只能访问单个站点的数据。它包含：

- **锁定渲染器进程**：限制进程只承载一个 site 或 origin 的文档、worker，包括 iframe 中的文档。
- **浏览器强制执行限制**：高权限 browser 进程检查 renderer 发出的 IPC，限制行为和站点数据访问，例如 `ChildProcessSecurityPolicy::CanAccessDataForOrigin`。这可[阻止已被攻陷的 renderer](https://chromium.googlesource.com/chromium/src/+/main/docs/security/compromised-renderers.md)请求跨站数据、使用其他站点的权限等。Jail 检查确保锁定到特定站点的进程只能访问该站点数据；如果全部进程都锁定，这已足够。Citadel 检查确保未锁定进程不能访问要求专用进程的站点数据，补充保护无法全面隔离的平台，例如 Android。
- **限制网络响应**：确保锁定进程只能收到其站点或来源的敏感数据，例如 HTML、XML、JSON，同时为兼容性保留图片、媒体等跨源子资源加载。这通过 [CORB](https://www.chromium.org/Home/chromium-security/corb-for-developers) 或 [ORB](https://github.com/annevk/orb) 实现。

<a id="abstractions-and-implementations"></a>

## 抽象与实现

Chromium 用以下抽象跟踪哪些文档、worker 需要同步访问彼此，以约束进程选择。

**Security Principal（安全主体）**由 [SiteInfo](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/site_info.h;drc=c79153d6f931dbe2ce2c992962512eaca6766623;l=22) 实现。安全术语中的 principal 是具有特定权限的实体。Chromium 为文档、worker 等执行上下文关联安全主体，用于确定其进程可访问哪些数据。

主体通常是 [site](https://html.spec.whatwg.org/multipage/origin.html#site)，即 scheme 加 eTLD+1，例如 `https://example.com`。原因是页面历史上可以通过修改 `document.domain`，访问同站而不只是同源的其他文档。某些情况下主体是 origin，或更粗的粒度，例如 `file:`。`SiteInfo` 跟踪标识主体所需的全部值，`SecurityPrincipal` 接口则在 content/public API 中暴露其中一部分。

**Principal Instance（主体实例）**由 [SiteInstance](https://source.chromium.org/chromium/chromium/src/+/main:content/public/browser/site_instance.h;drc=858df4ab8b73f2418f51385954760f2154512029;l=32) 实现，是进程模型的核心单元。同一个 browsing context group 中主体相同的两个文档必须共处一个进程，因为它们能同步访问彼此内容，包括跨文档脚本和经 `SharedArrayBuffer` 等共享内存进行的同步通信。如果它们处于不同进程，同时访问共享 DOM 或 JavaScript 堆对象，就会产生数据竞争或死锁。

它大致对应标准的 [agent cluster](https://html.spec.whatwg.org/multipage/webappapis.html#integration-with-the-javascript-agent-cluster-formalism)，但并不完全一致：多个 agent cluster 有时共享主体实例，例如 `data:` URL 与创建者处于同一实例；主体还可能跟踪 [agent cluster key](https://html.spec.whatwg.org/multipage/webappapis.html#agent-cluster-key) 之外的信息，例如不同的 StoragePartition。

用户可能在无关联的标签页、即不同 browsing context group 中，访问同一主体的多个实例。这些实例不需要同步互访，可以安全地运行在不同进程中。

**Browsing Context Group（浏览上下文组）**由 [BrowsingInstance](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/browsing_instance.h;drc=df269acf8de952b68b2fbec49365457ff1f6266b;l=34) 实现。它是一组拥有相互引用的标签页和 frame，例如同一页面中的 frame、带 `window.opener` 引用的弹窗。组内文档可以按名称找到彼此，因此主体相同的文档必须在同一进程中。换言之，一个组内，每个主体只有一个主体实例。标签页在某些导航中可能改变所属组，例如受到 `Cross-Origin-Opener-Policy` 影响，或由浏览器发起跨站导航时。

实现上，Chromium 跟踪每个 `RenderFrameHost` 的 `SiteInstance`，决定其文档使用哪个 renderer。ServiceWorker、SharedWorkerHost 等 worker 也会跟踪 SiteInstance。

<a id="modes-and-availability"></a>

## 模式与适用平台

<a id="full-site-isolation-site-per-process"></a>

### 全站点隔离：site-per-process

原文适用平台：Windows、Mac、Linux、ChromeOS。

在一站点一进程模式下，每个进程锁定到单一 site 的文档。Site 为 scheme 加 eTLD+1，因为同站的不同 origin 历史上可通过双方修改 `document.domain` 获得同步访问。这为所有站点提供针对被攻陷 renderer 和 Spectre 类攻击的保护，同时维持向后兼容。

Android 可通过 `chrome://flags/#enable-site-per-process` 启用此模式。

<a id="partial-site-isolation"></a>

### 部分站点隔离

原文适用平台：内存至少约 2 GB 的 Chrome for Android。

Android 等资源受限平台仅对部分站点使用专用、锁定的进程，其余站点放在可供任意网站使用的未锁定进程中。原文指出，Android 支持任一级别的站点隔离都要求设备内存达到约 2 GB。

锁定进程只能访问自身站点数据；未锁定进程通常可访问所有不要求锁定进程的站点数据。Chromium 一般为每个 browsing context group 创建一个未锁定进程。

Chromium 使用启发式规则隔离最可能包含用户信息的站点。WebUI 等高权限页面始终隔离；此外，还隔离通常需要登录的网站，以及当前用户曾输入密码、通过 OAuth 登录、或遇到 COOP 响应头的站点。

<a id="no-site-isolation"></a>

### 不进行站点隔离

原文适用平台：内存不足 2 GB 的 Chrome for Android、Android WebView、Chrome for iOS。

受实现或资源约束，部分平台没有站点隔离：

- 小内存 Android 设备关闭隔离，避免一个标签页因进程外 iframe 而需要多个 renderer。主 frame 仍可能跨进程导航，例如浏览器发起跨站导航、组中没有其他页面时，可创建新的 browsing context group。
- 原文中的 Android WebView 尚不支持多个 renderer 或进程外 iframe。
- 原文中的 Chrome for iOS 使用 WebKit，而当时 WebKit 不支持进程外 iframe 或站点隔离。

<a id="origin-isolation"></a>

### 来源隔离

原文适用平台：桌面及内存至少约 2 GB 的 Chrome for Android。

支持站点隔离的平台还可选择按 origin 而非 site 锁定进程，但需要权衡兼容性，例如影响修改 `document.domain` 的页面。

- 内建指定：`//content` 嵌入方可通过 `ContentBrowserClient::GetOriginsRequiringDedicatedProcess` 指定必须与同站其他来源隔离的 origin。
- 配置：用户、管理员可通过 `--isolate-origins=...`、`chrome://flags#isolate-origins` 或[企业策略](https://support.google.com/chrome/a/answer/7581529)（[IsolateOrigins](https://chromeenterprise.google/policies/#IsolateOrigins)、[IsolateOriginsAndroid](https://chromeenterprise.google/policies/#IsolateOriginsAndroid)）指定来源。`chrome://flags/#origin-keyed-processes-by-default` 可对未退出的全部来源启用隔离。
- 主动声明：[Origin-Agent-Cluster](https://web.dev/origin-agent-cluster) 响应头提示浏览器可以使用锁定到 origin 的进程。这不是安全保证，也不一定被遵循，例如需保持同一组中同源文档一致时。但通常可获得更细粒度的隔离。原文指出 [OAC 已默认启用](https://github.com/mikewest/deprecating-document-domain)，除非通过响应头退出，否则修改 `document.domain` 不再生效。

<a id="crossoriginisolated"></a>

### CrossOriginIsolated

某些强大 Web 功能要求主动启用 [CrossOriginIsolated](https://web.dev/coop-coep/) 模式，确保跨源内容同意与使用这些功能的 origin 共处一个进程。内容包括文档、worker，以及媒体、脚本等子资源。

需要这种许可，是因为 `SharedArrayBuffer` 等功能可用于高精度计时，提高 Spectre 等瞬态执行攻击泄漏进程数据的能力。并非所有浏览器都支持跨源文档的进程外 iframe，也并非所有跨源子资源都能放到独立进程，因此该模式很重要。

主文档需要 COOP 和 COEP 响应头。它们约束页面或进程内加载的内容，例如子 frame 需要类似响应头，子资源需要 CORS、CORP 或 credentialless 模式。

<a id="historical-modes"></a>

### 历史模式

站点隔离之前，Chromium 支持过其他影响 renderer 数量的模型：

- Process-per-site-instance：最初默认模式。部分跨站导航（例如地址栏输入，而不是点击链接）或不同标签页访问同站不同实例时使用新进程。当时跨站子 frame 仍与父 frame 同进程。
- Process-per-site：将同一 profile 下一个站点的全部实例放进一个进程以减少进程数。但过多标签页共用一个进程时，可用性往往较差。目前仍用于新标签页等有限场景，以减少进程数和创建延迟；扩展也使用它，以便 background page 同步脚本访问其他页面。多 profile 或竞争等因素意味着“一个站点一个进程”并非绝对保证。
- Process-per-tab：每个 browsing context group 使用独立进程，可能包含多个关联标签页，跨站导航不主动切换进程。但 `chrome://` 等高权限页面仍要求切换。
- 单进程：browser 与 renderer 代码都在同一个操作系统进程执行。它无法使用沙箱，也无法承受 renderer 代码崩溃，通常不安全、不稳健，主要用于历史上的低资源 Android WebView，以及调试、测试。

<a id="visualizations"></a>

## 可视化

可以通过以下方式查看进程模型状态：

- Chromium 任务管理器：菜单“更多工具”中可查看实时资源使用，以及哪些文档、worker 位于同一进程。同组只有第一行显示 PID 和多数统计值，点击一行会高亮整组；双击尝试切换到关联标签页。默认排序，即点击 Task 列直到排序箭头消失时，会尽量把子 frame 进程放在对应标签页进程下面，但多个标签页的子 frame 共用进程时未必可行。
- `chrome://process-internals/#web-contents`：显示打开文档的 SiteInstance 与进程信息。
- `chrome://discards/graph`：可视化文档、worker 到进程的映射，点击节点查看详情。

<a id="process-reuse"></a>

## 进程复用

Chromium 在更多进程带来的并行性与更少进程节省的内存之间权衡。有些场景要求使用不同进程，例如启用站点隔离后的跨站页面；其他场景则通过启发式策略决定新建或复用。复用必须符合 profile、进程锁等限制，主要因素如下。

- 适用性：profile（含隐身状态）、StoragePartition、crossOriginIsolated 状态是进程级属性。不同 profile 或 StoragePartition 的文档不能共用 renderer；ProcessLock 也限制允许进入的文档。
- 软进程上限：桌面根据可用内存设置软上限，可以突破，例如站点隔离下打开站点数超过上限时。超过上限后会尝试随机复用同站进程。假设上限 100，已打开 50 个 `example.com` 标签页和 50 个 `example.org` 标签页，新 `example.com` 会复用一个现有同站进程，而 `chromium.org` 会创建第 101 个进程。Android 不设此软上限，而依靠操作系统丢弃进程。
- 积极复用：某些场景，包括 Android，会在未达到上限时就寻找同站进程。OOPIF 和 [fenced frame](https://developer.chrome.com/en/docs/privacy-sandbox/fenced-frame/) 如此：跨站页面中的 `example.com` iframe 可进入任何 browsing context group 中已有的同站进程。其依据是子 frame 通常比顶层文档资源需求少。ServiceWorker 通常也放入可能使用它的文档所在进程。
- 扩展：扩展不能彼此或与普通网页共享进程，但大量扩展也不能耗尽软上限、迫使网页挤入太少进程。扩展进程计数达到上限的[三分之一](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/extensions/chrome_content_browser_client_extensions_part.cc;drc=8d6a246c9be4f6b731dc7f6e680b7d5e13a512b5;l=454-458)后，后续扩展进程不再计入上限。
- Process-per-site：如前所述，新标签页和扩展将相同页面的全部实例放在同一进程。

<a id="process-locks"></a>

## 进程锁

Chromium 为部分或全部 `RenderProcessHost` 指定 [ProcessLock](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/process_lock.h;drc=47457a6923c0527261d0503998cbeb7de9bab489;l=19)，限制进程可加载的站点和可访问的数据。`RenderProcessHost` 是 browser 中代表 renderer 的对象；renderer 崩溃后重启时，该对象可复用。

部分锁定规则适用于所有平台，例如 `chrome://` 不与其他站点共享进程；其他取决于模式，例如完整隔离要求加载内容后的全部进程都被锁定。

锁的粒度可以是 site、origin、整个 scheme（如 `file://`），也可以是允许承载多个站点的特殊 allow-any-site 值；后者仍可能受到 crossOriginIsolated 等限制。指定锁之前，RenderProcessHost 处于 invalid 或未锁定状态。

ProcessLock 总是在 renderer 加载内容之前指定，可能是导航开始时，也可能是提交前的 `OnResponseStarted`。`about:blank` 等空文档可能先获得 allow-any-site 锁，首次真正提交内容时再收紧为特定站点。站点锁一旦指定，在 RenderProcessHost 整个生命周期中保持不变，即使 renderer 本身退出、重新创建。

是否允许内容进入锁定进程，也可依据其 origin：继承 `https://example.com` 来源的 `about:blank` 可进入锁定到该站点的进程。某些不透明来源也允许进入，例如该进程创建的 `data:` URL。

<a id="special-cases"></a>

## 特殊情况

这些特殊场景会影响不变量与功能设计：

- WebUI：`chrome://settings` 等页面属于 Chromium 自身，权限很高。所有平台均将它们与普通页面、其他 site 的 WebUI 严格隔离。除不断缩小的[允许名单](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/ui/webui/chrome_web_ui_controller_factory.cc;drc=3344b61f7c7f06cf96069751c3bd64d8ec3e3428;l=1405)外，通常不允许直接加载网络内容，而需使用独立、无特权的 `chrome-untrusted://` 文档。普通网页也不能导航到 WebUI，以增加提权攻击难度。
- 新标签页：桌面默认本地 NTP 是采用 process-per-site 的 WebUI，经 `chrome-untrusted://` iframe 加载网络内容。第三方 NTP 可加载权限有限的远程非 WebUI 网页。Android NTP 则是原生界面，没有高权限 renderer；显示期间 Chrome 会在后台创建未使用的 renderer，供下次打开页面使用。
- 扩展：桌面扩展文档和 worker 具有部分特权，运行在专用 renderer；content script 则与被修改网页共处低权限 renderer，因此应[降低对 content script 的信任](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/0ei-UCHNm34/m/lDaXwQhzBAAJ)。browser 会尽力验证 renderer 是否有权使用其请求的扩展 API 与能力。
- Hosted App：已弃用的扩展类型，允许普通网站使用特殊 renderer。例如 `https://example.com/app/` 的 effective URL 看起来像 `chrome-extension://`，因而在进程模型中区别处理。该支持可能最终移除。
- Chrome Web Store：[扩展商店](https://chromewebstore.google.com/)是少数拥有特权的 Web origin，Chrome 为它提供安装扩展的特殊 API。
- [Isolated Web App](https://github.com/WICG/isolated-web-apps/blob/main/README.md)：IWA 比普通 Web 应用有更严格的安全与隔离要求。每个 IWA 的 StoragePartition 与普通浏览默认分区以及其他 IWA 分开，要求严格 CSP、[CrossOriginIsolated](#crossoriginisolated) 和其他条件。这些上下文称为 [IsolatedContext](https://wicg.github.io/isolated-web-apps/isolated-contexts) 和 [IsolatedApplication](https://source.chromium.org/chromium/chromium/src/+/main:content/public/browser/web_exposed_isolation_level.h;l=62;drc=998312ac45f85e53257049c5891dff558f203c00)。
- GuestView：Chrome Apps 的 `<webview>`、MimeHandlerView、ExtensionOptionsGuest 在一个 WebContents 中嵌入另一个，嵌入内容采用严格站点隔离。`<webview>` 可加载普通网页和应用自身的 `data:`、`chrome-extension://`，不能加载其他扩展或应用的 URL。IWA 的 [`<controlledframe>`](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/chrome/common/controlled_frame/README.md) 基于该实现，只向满足安全、隔离要求的上下文开放，例如提供 IsolatedContext 的 IWA。见 [Isolated Contexts 规范](https://wicg.github.io/isolated-web-apps/isolated-contexts)。
- 沙箱 iframe：带 sandbox 且没有 `allow-same-origin` 的 iframe 或弹窗，可能与 parent / opener 同站，但来源不透明。原文指出，自 127.0.6483.0 起，桌面 Chromium 将其与 parent / opener 分进不同进程；Android 仅在 parent / opener 使用[部分隔离](#partial-site-isolation)时如此。扩展页面嵌入的沙箱 frame，若列入扩展 manifest 的 sandbox 节，则独立进程，否则与父 frame 同进程。
- `data:` URL：通常与创建它的站点同进程，因为创建者控制内容。恢复历史会话时例外，每个 `data:` 文档进入自己的进程。
- File URL：原文将全部 `file://` 视为同站。普通网页不能加载 file URL，renderer 仅通过文件选择器等方式获得特定文件的访问权，例如上传。进一步隔离的讨论见 [780770](https://crbug.com/780770)。
- 错误页：浏览器自身提供的错误页采用特殊的 process-per-site 进程，将此类页面集中；网站返回的 404 页面不在此列。原文仅对主 frame 错误页应用此规则。
- 备用进程：Chromium 常预先创建一个带有存活、未锁定 renderer 的 RenderProcessHost，在下一次需要时使用，以避免进程启动等待。
- Android WebView：虽然复用许多 Chromium 代码，但原文中大多数情况下仅支持一个 renderer。

<a id="videos"></a>

## 视频

- [What's Up with Site Isolation](https://youtu.be/OH-bt7spDgo?si=T_mL39Sxr_JPit0K)，2023 年 9 月，46:41：讨论目标与实现的访谈。
- [Chrome Security EDU: Site Isolation 101](https://youtu.be/-L-LwHiCl9E?si=wEv7gdc7lr_6yiAy)，2025 年 6 月，1:30：站点隔离如何保护浏览器。
- [Chrome Security EDU: Site Isolation 201](https://youtu.be/Als73-6bqD0?si=LajJlqJeXZe7RTIl)，2025 年 6 月，1:15：如何为其他 renderer 中的 frame 使用占位对象。
- [Chrome's Process Model and Site Isolation](https://youtu.be/2Ds_RIACLbk?si=kZWWF75slbRoZMa_)，2025 年 6 月，16:36：面向浏览器工程师深入讨论实现与进程选择的权衡。

<a id="further-reading"></a>

## 延伸阅读

以下学术论文讨论了 Chromium 的进程模型。

[Security Architecture of the Chromium Browser](https://crypto.stanford.edu/websec/chromium/)。Adam Barth、Collin Jackson、Charles Reis 和 Google Chrome 团队，Stanford 技术报告，2008 年 9 月。

摘要：当时多数浏览器采用整体式架构，把“用户”与“Web”放在同一个保护域。利用任意代码执行漏洞的攻击者可窃取敏感文件或安装恶意软件。论文介绍 Chromium 的安全架构：与操作系统交互的浏览器内核，以及在受限沙箱内运行的渲染引擎，分别位于不同保护域。该架构在不牺牲既有网站兼容性的前提下缓解严重攻击。论文定义浏览器漏洞利用的威胁模型，并评估这种架构对历史漏洞的缓解作用。

[Isolating Web Programs in Modern Browser Architectures](https://research.google.com/pubs/archive/34924.pdf)。Charles Reis、Steven D. Gribble（UW 与 Google），EuroSys，2009 年 4 月。

摘要：网站包含大量客户端代码，行为更像程序而非简单文档，由此对浏览器的稳健性与性能提出挑战。要提供稳健、响应迅速的平台，浏览器必须识别程序边界并提供隔离。论文有三项贡献：提出 Web 程序与程序实例的抽象，澄清组件交互及合理边界；识别划分 Web 内容时向后兼容的约束与权衡；提出隔离这些实例的多进程架构，改善容错、资源管理和性能。论文介绍其在 Google Chrome 中的实现，并定量评估收益与成本。

[Site Isolation: Process Separation for Web Sites within the Browser](https://www.usenix.org/conference/usenixsecurity19/presentation/reis)。Charles Reis、Alexander Moshchuk、Nasko Oskov，Google，USENIX Security，2019 年 8 月。

摘要：当时生产浏览器虽为多进程，却仍将不同网站放进同一个 renderer，已不足以应对威胁。网站保存的私人数据、renderer 被攻陷的风险，以及 Spectre、Meltdown 等通过微架构状态泄漏数据的瞬态执行攻击，使跨站文档共用进程不再安全。论文介绍向全部桌面 Chrome 用户成功部署站点隔离的过程：将每个 renderer 锁定到单站文档，并过滤某些跨站数据。作者克服性能与兼容性挑战，使生产浏览器采用新架构。尽管仍有限制，作者认为这是防御被攻陷 renderer 和同进程瞬态执行攻击的最佳途径；性能结果表明，在充分保留既有内容兼容性的同时部署这种隔离是可行的。最后讨论未来方向及如何解决现有限制。
