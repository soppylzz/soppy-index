> 英文原文：[Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/session_history.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="session-history"></a>

# 会话历史

浏览器的会话历史记录每个标签页中的导航，用于支持前进、后退和会话恢复。它不同于 `chrome://history` 一类“浏览历史”：后者记录某个用户配置文件存续期间，在任意标签页访问过的主帧 URL。

Chromium 使用 NavigationController 跟踪各标签页的会话历史，以 NavigationEntry 列表表示联合会话历史条目。每个帧在导航时创建自己的会话历史条目；一个联合会话历史条目包含页面各帧在某一时刻的状态，例如 URL、尚未填完的表单数据、滚动位置等。每个 NavigationEntry 使用 FrameNavigationEntry 树跟踪这些状态。

- [裁剪前进历史](#pruning-forward-navigations)
- [子帧导航](#subframe-navigations)
- [替换式导航](#navigating-with-replacement)
- [区分同文档与跨文档导航](#identifying-same--and-cross-document-navigations)
- [导航分类](#classifying-navigations)
- [持久化](#persistence)
- [不变量](#invariants)
- [注意事项](#caveats)

<a id="pruning-forward-navigations"></a>

## 裁剪前进历史

用户后退后又提交新的导航，相当于令联合会话历史产生分叉。但联合历史以列表而非树存储，因此之前的前进历史会被“裁剪”并遗忘。所有新导航都会执行这种裁剪，除非它以替换方式提交。

<a id="subframe-navigations"></a>

## 子帧导航

文档中新建子帧发生首次提交时，会成为已有联合历史条目的一部分，称为“自动子帧导航”（auto subframe navigation）。用户无法后退到该子帧提交之前的状态。

子帧之后的导航会创建新的联合历史条目，称为“手动子帧导航”（manual subframe navigation）；因此点击后退时，可能是在该子帧内后退。

<a id="navigating-with-replacement"></a>

## 替换式导航

某些导航会替换帧之前提交的联合历史条目，而不创建新条目，包括：

- `location.replace`：通常跨文档，片段导航除外。
- `history.replaceState`：始终是同文档操作。
- 客户端重定向。
- 初始空文档之后的第一个非空白 URL；但如果创建帧时显式使用 `about:blank` URL，则不适用这一条。

<a id="identifying-same--and-cross-document-navigations"></a>

## 区分同文档与跨文档导航

每个 FrameNavigationEntry 都包含条目序列号（item sequence number，ISN）和文档序列号（document sequence number，DSN）。同文档导航创建新的会话历史条目但不更换文档，因此 ISN 改变、DSN 不变；跨文档导航则产生新的 ISN 和 DSN。

NavigationController 在会话历史导航中，根据这些序列号判断哪些帧需要导航，具体通过 `FindFramesToNavigate` 递归遍历帧树。

<a id="classifying-navigations"></a>

## 导航分类

NavigationController 的大量复杂性来自导航提交时的状态记账：同文档或跨文档、主帧或子帧、是否替换等。这些类型决定是创建新的 NavigationEntry、更新或替换已有条目，以及向观察者暴露哪些事件。

`ClassifyNavigation` 负责这项分类，决定提交导航时使用哪个 `RendererDidNavigate` 辅助方法。

<a id="persistence"></a>

## 持久化

标签页的联合会话历史会持久化，以便在 Chromium 重启、关闭标签页之后，或另一台设备上恢复。需要用 PageState 及其他元数据，序列化每个 NavigationEntry 及其 FrameNavigationEntry 树中的状态。

如何安全加入需要保存和恢复的新值，参见[修改会话历史序列化](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/modifying_session_history_serialization.md)。

NavigationEntry 并非所有内容都持久化。NavigationEntryImpl 和 FrameNavigationEntry 的每个成员都应注明：提交后是否保留，以及是否需要持久化。

复制标签页，或在新标签页中执行前进、后退、刷新，例如中键点击相应按钮，也可以克隆会话历史。这是直接克隆 NavigationEntry，不是先持久化再恢复。

<a id="invariants"></a>

## 不变量

- `pending_entry_index_` 要么为 -1，要么是 `entries_` 的有效索引。如果存在 `pending_entry_` 且索引为 -1，表示新导航；如果索引有效，则 `pending_entry_` 必须指向该条目，且该导航属于会话历史导航。
- 新标签页的 NavigationController 将 `is_initial_navigation_` 设为 true。但从其他标签页克隆历史时，首次提交前也可能已有 `last_committed_entry_index_`；此时 `pending_entry_index_` 表示初始导航将恢复哪个条目。
- 当前会话中已经提交的每个 FrameNavigationEntry 都必须有 SiteInstance；从持久化状态恢复的条目不在此列。
- 渲染器进程只能更新属于该进程中 SiteInstance 的 FrameNavigationEntry。尤其要约束 PageState 等攻击者可控数据，将其加载到其他站点进程可能产生危险。
- 任何跨 SiteInstance 导航都应产生新的 NavigationEntry，并以替换方式提交，而不是更新已有 NavigationEntry。

<a id="caveats"></a>

## 注意事项

- 并非每个 NavigationRequest 都有待提交的 NavigationEntry。例如子帧导航没有；渲染器发起的主帧导航也可能通过 PendingEntryRef 清除已有、由浏览器发起的 pending NavigationEntry，却不创建新的替代条目。因此，NavigationRequest 更适合可靠地跟踪待提交导航的相关状态。
- 某些子帧文档在提交后可能没有对应的 FrameNavigationEntry，例如[问题 608402](https://crbug.com/608402)。
