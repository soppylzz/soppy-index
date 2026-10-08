# 公共 Demo 接入验证

[返回公共接口](./README.md)

## 环境与方法

2026-10-08，在 macOS、Node v22.23.2、Google Chrome 153.0.8010.48 Headless 下验证。浏览器自动化使用仓库外已有 Playwright，临时脚本、截图和原始日志位于 `/tmp/demo-shared-validation`，浏览器 profile 由 Playwright 创建于系统临时目录；没有新增项目依赖。截图按 1280 × 1000 和 390 × 844 两种 viewport 检查；计算样式覆盖全部 11 个 HTTP demo，截图只抽查 DOM 与 cookie 页面。

为避免影响开发服务，本轮通过环境变量使用以下端口；仓库默认端口保持原值。双源实验仍分别绑定 `127.0.0.1`，cookie 页面保留 `localhost` 与 `127.0.0.1` 的站点对照。

| 实验               | 本轮端口      |
| ------------------ | ------------- |
| API                | 15113 / 15114 |
| DOM                | 15115         |
| Observer           | 15110         |
| Communication      | 15108 / 15109 |
| Loading            | 15104         |
| LifeCycle          | 15106         |
| HTTP Cache         | 15103         |
| Web Storage        | 15400         |
| IndexedDB          | 15102         |
| Storage Management | 15101         |
| Cookie             | 15300 / 15301 |

## 实际观测

| 检查          | 本轮结果                                                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 公共资源      | 14 个监听地址都返回与源码一致的 CSS / JS，MIME 正确且 no-store；HEAD 无正文，POST 为 405，server.ts 不对浏览器公开，返回 404                                                                                                           |
| 页面样式      | 11 组页面的 body 背景均为 rgb(244, 246, 250)，字体 16px，main 的 max-width 为 1000px；卡片圆角 12px、padding 20px                                                                                                                      |
| Logger        | 列表与 pre 按条数上限保留最新记录；HTML 样式的测试消息仍作为文本显示，没有创建 img；UTC、相对时间、上下文身份及错误选项检查通过                                                                                                        |
| DOM           | 布局对象仍为 content-box，clientWidth=220、offsetWidth=226；事件派发日志正常                                                                                                                                                           |
| Observer      | MutationObserver 连续修改返回 3 条记录，takeRecords 返回 4 条；ResizeObserver border-box 宽度从 272 变为 296，content 宽度保持 240                                                                                                     |
| API           | ArrayBuffer 转移后源长度为 0，接收副本长度为 8、首字节为 42；真实 fetch、iframe 合法 ack 和非法结构拒绝均有浏览器日志                                                                                                                  |
| Communication | 双页面 BroadcastChannel、storage 和 SharedWorker 收到业务 ack；window 合法 ack 与 origin/source/schema 拒绝均被观察到；MessageChannel 完成握手、buffer 转移、业务 ack、不处理时的超时和断开清理                                        |
| Storage       | 第二页面收到真实 storage 事件；IndexedDB 出现 request 成功与 transaction complete 两阶段日志，含函数的值触发 DataCloneError；OPFS 草稿实际写入、读出并清理                                                                             |
| HTTP Cache    | no-cache fetch 探针记录实际读取的最终 HTTP 200，与服务端版本查询共同完成页面展示                                                                                                                                                       |
| Loading       | classic、css-only、css-defer 均记录真实 DOMContentLoaded 和 load；classic 在后方 DOM 创建前执行；css-only 的 DOMContentLoaded 早于样式响应完成，css-defer 晚于或等于样式响应完成；三个页面均未新增 /demo/ 资源请求                     |
| LifeCycle     | 刷新后 executionId 改变，同一标签的历史 journal 保留并追加 pageshow；BFCache 返回时实际观察到 persisted=true 和相同执行身份（自动化启动时移除了禁用 BFCache 的默认参数）                                                               |
| 端口与错误    | 14 个地址分别制造端口占用，进程均非零退出且不打印成功引导；双源第二端口失败后，第一个端口可以重新绑定；11 个入口拒绝非法端口，3 个双源入口拒绝重复端口，6 个支持 PORT=0 的入口正确输出实际地址；同步绑定异常与异步冲突均清理临时监听器 |
| CLI           | 启动、上述请求与端口冲突输出均检查为 ASCII 英文；cookie 收款人包含中文与换行时被转义，生命周期非法 JSON 请求返回 400；HTTP 日志只作为服务端证据                                                                                        |
| 浏览器异常    | 上述自动化流程没有捕获到 pageerror；有意拒绝消息和克隆失败通过实验自身的日志报告                                                                                                                                                       |

公共模块接入时的静态检查也已通过：根 TypeScript 检查、全部变更源码 ESLint、变更文件 Prettier；检查 54 份 Markdown 的 447 个相对链接目标与 28 个标题锚点，67 个 JS / TS 代码块语法通过（未执行这些文档片段）。

这些是本轮特定环境的观测。固定盒尺寸是实验的 CSS 配置，事件和消息结果来自真实浏览器；毫秒值、调度次序及不同浏览器的策略不由公共基础模块保证。

## 知识与 demo 的对应复核

下表对应正式知识文档与实际入口，不以 reference 作为权威。知识文档的范围可以大于 demo；没有实现的案例明确保留为原理分析或手动扩展。

| 知识入口                                                                        | demo 入口                                                                        | 对应内容与边界                                                                                 |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [DOM / 事件](../browser/dom/README.md)                                          | /tree、/layout、/events                                                          | 集合、表单状态、尺寸、传播与清理；Vue invoker 固定分析 3.5.22 源码，不声称原生 demo 加载了 Vue |
| [Web API](../browser/api/README.md)                                             | /tools、/files、/components、/iframe                                             | 克隆与转移、取消、文件、Shadow DOM、双源消息；权限 API 与 closed root 留为知识边界             |
| [Observer](../browser/observer/observer.md)                                     | /mutation、/intersection、/resize                                                | 真实记录 / 交叉 / 盒尺寸通知；几何交叉不作为真实曝光证据，loop 错误不作为必现顺序              |
| [Communication](../browser/communication/crossContextCommunication.md)          | / 与 /frame，双源双标签                                                          | 五种机制、发送与确认、拒绝、超时、清理；分区策略有讲解，但端口不同的本地双源不等于跨站分区实验 |
| [Script Loading](../browser/core/loading/README.md)                             | /experiment、/hints                                                              | parser、资源与执行的控制对照；网络日志不代替执行日志，公共样式内联避免新的阻塞资源             |
| [LifeCycle / History](../browser/core/lifeCycle/README.md)                      | /loading、/visibility、/bfcache、/leave、/report、/freeze、/history、/navigation | 各话题独立路由；BFCache 命中需身份与 persisted 证据，生命周期上报不保证最终交付                |
| [HTTP Cache](../browser/cache/httpCache.md)                                     | /、/assets/_、/api/_                                                             | freshness、validator、fetch cache 模式；浏览器合并后的响应与服务端 304 分别观察                |
| [Web Storage](../browser/storage/webStorage/webStorage.md)                      | /，双标签                                                                        | local/session 隔离、真实 storage 事件；本页主动更新表格不冒充自己收到事件                      |
| [IndexedDB](../browser/storage/indexedDB/indexedDB.md)                          | /                                                                                | request 与事务完成、索引、clone、升级；请求成功不冒充事务持久化保证                            |
| [Storage Management](../browser/storage/storageManagement/storageManagement.md) | /                                                                                | estimate、persist、OPFS、有限压力实验；配额不是固定值，压力上限不是浏览器容量测量              |
| [Cookie](../browser/storage/cookie/cookie.md)                                   | bank / evil 双站点                                                               | Cookie 属性与浏览器策略、CSRF/XSS 对照；会话与转账是教学业务，不是生产认证实现                 |
| [Event Loop](../browser/core/eventLoop/eventLoop.md)                            | simulator.ts                                                                     | 虚拟时钟解释模型；不能据模拟输出声称浏览器实际顺序                                             |

本次提交前额外复跑默认配置的 API / DOM 全套走查（包括组件、文件、iframe 和 BFCache）、Observer 全套走查、通信拒绝与清理矩阵，并通过 Chrome DevTools Protocol 验证生命周期的后台 hidden、主动暂停轮询、freeze / resume、BFCache 与上报接收。环境仍为上述 Node / Chrome，临时文件位于 `/tmp/browser-review`；它们是提交前追加实测，不覆盖下方列出的其他浏览器等限制。Observer 的 direct 反馈在 window error 中记录 3 次 loop 错误，实验处理后未形成未捕获 pageerror。Vue 3.5.22 的 invoker / modifier 解释重新对照官方仓库对应版本的源码核实。

复核也修正了页面教学文案：Web Storage 明确区分共享文档与独立标签，不再把会话清理或配额错误写成必然结果；较大写入按钮准确标明尝试写入的字符数。定向实测中，空 localStorage 的 clear 没有让对端新增事件，有数据时写入产生真实对端事件；6291456 个 ASCII 字符写入在本次 Chrome 中抛出 QuotaExceededError，临时 key 未遗留。IndexedDB 两阶段记录先后到达，完成日志明确表示事务提交而非强制刷盘。Cookie 页改为说明 Lax 对跨站非安全方法和子资源的限制、顶层安全导航及浏览器策略；这些修正分别对照 [storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)、[IDBTransaction durability](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)、[SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)。

## 检查命令与手动复核

从仓库根目录执行类型检查，并对变更的源码和受支持文件分别执行 ESLint 与 Prettier；相对链接检查同时覆盖公共文档、harness 和 browser 导航。

```bash
npx --no-install tsc --noEmit
npx --no-install eslint docs/demo/server.ts docs/demo/browser.js
npx --no-install prettier --check docs/demo
```

手动复核时，先按各模块 README 启动服务，确认引导打印后再打开页面。对照 DOM / cookie 的卡片、按钮、表格和窄屏排版；在 Network 查看 `/demo/styles.css` 和 `/demo/browser.js`，确认来自当前页面的 origin。加载和生命周期页面改为内联公共样式，不能因未请求这两个资源就判定接入失败。

在 DOM 页面持续点击控件，确认日志超过 120 条后移除最早记录；在通信页面打开两个标签，分别操作广播、storage、worker、合法 window 请求和拒绝按钮，并查看对应发送 / 接收页面。关闭连接后重连，再次发送。端口冲突可在某 demo 正运行时，再用相同命令启动一次；第二进程应报告冲突，原进程继续提供页面，结束后可再次启动。

## 未覆盖范围

本轮没有验证 Firefox / Safari、真实移动设备、浏览器强制冻结或进程丢弃、所有缓存策略组合、cookie 的完整攻击矩阵，以及配额压力测试。修改集中在共享外观和基础工具，本记录不能替代各实验原有走查，也不能证明这些未执行的路径已通过。截图检查不等于全页面视觉回归测试。
