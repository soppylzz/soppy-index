# Observer 浏览器实验走查

[运行与导航](./README.md) · [机制与代码片段](./observer.md) · [服务入口](./index.ts) · [浏览器逻辑](./assets/lab.js)

## 1. 准备与证据

Node >= 22.18，在仓库根目录运行：

```bash
node docs/browser/observer/index.ts
```

等待终端成功启动指引后打开 <http://127.0.0.1:5010/>，选择独立路由；`PORT=5012` 可覆盖端口，`Ctrl+C` 停止。三个实验无需多标签、iframe 或 worker，变化都发生在当前文档。

保持页面可见，等待“已连接”，逐步点击并观察页面日志；DevTools Console 用于查看浏览器错误。连接只说明注册完成。“操作”“同步修改完成”是应用发起变化的证据，“回调”是浏览器交付的证据，`takeRecords` 是应用主动读取队列的证据。终端 GET 日志只证明 HTTP 请求完成。

日志最多 100 条，按追加顺序排列，含 UTC 时间与本次文档的随机身份；回调内记录 IO 的 sampleTime 属于性能时间轴，不能直接与 UTC 数字相减。不要以同一个毫秒显示为由推断同步执行。

响应使用 `Cache-Control: no-cache`，需要复用 HTTP 缓存时先验证，不等于关闭 BFCache。页面返回是否恢复取决于浏览器策略；身份相同且发生恢复重连与新身份重新加载应分别解释。服务不强制缓存命中，DevTools 与自动化参数也可能影响结果。

## 2. `/mutation`：批量、队列与丢弃

先刷新恢复初始状态，按顺序操作。下表是预期，实测另列。

| 操作                       | 预期观察                                                              | 原因                                     |
| -------------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| 点击同步连续修改           | 同步完成在前，回调在后；记录包含 attributes、characterData、childList | 当前同步执行完成后才交付通知             |
| 再次连续修改               | 可能多一条 childList 删除记录                                         | 实验替换上次追加的节点；不是每次固定三条 |
| 点击修改后立即 takeRecords | 同步读到 records，之后不再由回调交付这一批                            | 读取并清空队列，不是调用回调             |
| 点击修改后立即 disconnect  | 状态变为断开，这次排队记录没有被回调交付                              | disconnect 丢弃待交付记录                |
| 断开后继续修改             | 目标仍改变，但没有新增观察回调                                        | 断开期间没有记录回放                     |
| 连接 / 重连后修改          | 再次收到真实回调                                                      | 重新注册观察目标                         |

本页仅观察 data-count 属性、子树的子节点与字符数据；不是监听页面内所有变化。日志区不在目标树中；旧值记录与当前 DOM 值的区别见 [MutationObserver 笔记](./observer.md#2-mutationobserver记录变化而非订阅最终快照)。

## 3. `/intersection`：同一目标、不同根边界

root 高 220px；目标前有 320px 空白，目标高 100px。两个观察器的 margin 分别为 0 和 80px，共用阈值 `[0, 0.5, 1]`。每次操作后等对应回调，避免快速跳转漏过中间采样。

| 操作               | 预期观察                                       | 解释                       |
| ------------------ | ---------------------------------------------- | -------------------------- |
| 打开页面，保持顶部 | 两个 observer 初始均 false、ratio=0            | 初始通知并不要求已经进入   |
| 滚动到 60px        | margin=80 为 true；margin=0 仍未进入           | 扩大根交叉矩形可提前触发   |
| 滚动到 150px       | margin=0 约为 0.5；margin=80 可为 1            | 面积比例以目标为分母       |
| 滚动到 220px       | margin=0 达到 1                                | 目标完全位于可滚动 root 内 |
| 切换视觉遮挡       | 普通观察器可能不新增通知，已有几何状态仍为交叉 | 普通交叉不检测遮挡         |
| 滚动到 440px       | margin=0 离开；margin=80 仍可能交叉            | 扩展边界也影响离开时机     |
| 断开后滚动，再重连 | 断开时没有新采样通知；重连收到当前初始状态     | 新 observer 从当前几何开始 |

手动滚动同样有效；不是按钮伪造交叉 entry。边缘接触、零面积、rootMargin 的限制和曝光定义见 [交叉笔记](./observer.md#3-intersectionobserver交叉不等于曝光)。

## 4. `/resize`：盒模型与有限反馈

先刷新，避免上一实验的 width、padding 和 transform 干扰。目标采用 `box-sizing: content-box`，初始内容宽 240px、左右 padding 各 12px、左右 border 各 4px。

| 操作                 | 预期观察                                      | 解释                         |
| -------------------- | --------------------------------------------- | ---------------------------- |
| 等待初始回调         | content=240，border=272                       | 两个观察器均得到当前 entry   |
| 切换 padding 为 24px | 只有 border-box 回调，content=240，border=296 | 内容盒宽固定不变             |
| 再切换内容宽为 320px | 两个回调，content=320，border=376             | 两个盒均发生尺寸变化         |
| 切换 transform       | 视觉放大，短时无新 resize 回调                | transform 不改变观察的布局盒 |
| 回调内写尺寸         | 最多三次 direct 写入，可能收到真实 loop 错误  | 同轮布局反馈存在未交付通知   |
| 下一帧写尺寸         | 最多三次 next-frame 写入                      | 将写入推迟；停止依靠步数上限 |
| 断开，再修改宽度     | 目标改变但无新回调；重连得到当前尺寸          | 组件释放与重新观察           |

两个反馈按钮会重连并将内容宽复位到 240px，其他样式保持当前值。浏览器原始错误文本为英文，页面用中文前缀记录真实 ErrorEvent；不手动派发错误。rAF 不是通用防循环修复，详见 [尺寸笔记](./observer.md#4-resizeobserver观察哪个盒就按哪个盒判断变化)。

清理可额外比较：连接时点击实验目录，再使用浏览器后退；若命中 BFCache，同一文档身份保留，pagehide 清理后自动重连。先手动断开再做同样导航，恢复后应保持断开。若身份变了，是新文档加载，不能据此声称已验证 BFCache。

## 5. 本次实际验证

日期：2026-10-08（Asia/Shanghai）。环境：macOS、Node v22.23.2、Google Chrome 153.0.8010.48，Playwright 驱动 headless 真实浏览器，1280×1000 视口，隔离浏览器上下文，默认地址。验证 BFCache 时移除自动化默认的 `--disable-back-forward-cache` 参数；脚本、依赖和临时浏览器配置位于仓库外 `/tmp/observer-validation` 与 `/tmp/communication-validation`，不是模块依赖。

| 验证项                | 实际结果                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| MutationObserver 批量 | 第一次同步修改之后回调一次，records=3，含三类变化；第二次同步 takeRecords=4，含替换旧节点产生的删除记录                                     |
| 队列与断开            | takeRecords 后观察 250ms 未新增回调；立即 disconnect、断开期间修改各观察 250ms 无回调；重连修改再次交付                                     |
| 初始与 margin         | 初始两个 false；scrollTop=60 时 margin=80 为 true、ratio=0.4，margin=0 尚无进入记录                                                         |
| 阈值与离开            | margin=0 在 150px 为 0.5，在 220px 为 1，在 440px 为 false；margin=80 此时仍为 true、ratio=0.6                                              |
| 视觉遮挡              | 全块交叉后加遮挡，观察 300ms 未新增交叉通知；没有将它认作真实曝光                                                                           |
| IO 断开重连           | 断开后改变 scrollTop，250ms 内无新回调；重连两观察器交付当前状态                                                                            |
| 尺寸盒                | 初始 240/272；padding 后仅 border-box 通知，240/296；改变内容宽后两者通知，320/376                                                          |
| transform             | 视觉变换后观察 300ms，resize 回调数量未增加                                                                                                 |
| 有限反馈              | direct 三次写入，捕获三次真实 loop ErrorEvent；next-frame 三次写入后停止，此对照中未新增 loop 错误                                          |
| Resize 断开重连       | 断开后改宽，250ms 内无新回调；重连收到两种 box 当前尺寸                                                                                     |
| BFCache 与清理        | resize 页返回后文档身份相同，保留 pagehide 清理记录并重连；手动断开再离开返回仍保持断开                                                     |
| 有界日志与能力分支    | 多次真实 DOM 修改后日志保留 100 条；在隔离测试页移除 ResizeObserver 能力后显示不可用；这项只验证能力分支，不代表某个旧浏览器兼容性          |
| 浏览器异常            | 核心流程无未捕获 pageerror；有限 direct 实验的三次 loop 错误由真实 window error 事件记录                                                    |
| HTTP 与启动           | 全部 HTML、JS、CSS 的 GET/HEAD、MIME、no-cache、HEAD 空响应通过；favicon 204、未知路径 404、POST 405 / Allow 通过                           |
| 配置与 CLI            | 15190 覆盖端口可用，冲突非零退出且无成功引导；0、负数、65536、非数字拒绝；启动、请求、Unicode 路径、错误输出为英文 / ASCII；SIGINT 正常关闭 |
| 静态检查              | 根 TypeScript、变更源码 ESLint、变更文件 Prettier、相对链接和知识片段语法检查通过                                                           |

实际日志摘录如下，去掉时间与身份，不承诺固定毫秒或不同 observer 的回调顺序：

```text
同步修改完成 count=1；尚未证明回调执行
回调 MutationObserver records=3
同步 takeRecords（非回调） records=4
回调 IntersectionObserver margin=80 isIntersecting=true ratio=0.400
回调 ResizeObserver box=border-box content=240 border=296 devicePixel=240
反馈写入 direct step=1/3
浏览器错误：ResizeObserver loop completed with undelivered notifications.
```

短时未新增回调是本次观测，机制结论还依据笔记中的官方来源。原始实验中 no-store 响应未能恢复 BFCache，浏览器报告相关阻止原因；当前实现使用 no-cache 后验证了恢复。不能从该对照推导所有浏览器的缓存准入政策。

## 6. 未验证项与手动扩展

- 未覆盖 Firefox、Safari、移动端、隐私窗口、后台长时间节流与主线程长任务。请在目标浏览器按上述路由重复步骤，记录版本与实际差异。
- 未覆盖跨源 iframe 的交叉限制、嵌套滚动裁剪、零面积目标、边缘恰好接触、trackVisibility / scrollMargin 扩展；本页普通交叉实验不证明这些行为。
- 未覆盖竖排文字、分栏碎片、SVG、隐藏目标与高 DPI 变化；本次 devicePixel 值来自普通 DPR=1 目标的 entry，未以 device-pixel-content-box 建立观察。
- 只对 resize 页实测 BFCache 恢复；Mutation / Intersection 使用相同清理入口，但未分别验证恢复后的回调。可连接后离开再后退，比较身份与回调；强制关闭进程不能验证 pagehide 必达。
- 不运行无限尺寸循环，也不以三次 next-frame 对照宣称真实业务永远不会出现 resize loop。生产代码需要另外证明写入幂等或尺寸收敛。
