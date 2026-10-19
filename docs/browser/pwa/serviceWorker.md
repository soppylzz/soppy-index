# Service Worker：控制、事件与版本一致性

## 1. 角色与运行条件

Service Worker 是浏览器管理的事件驱动 worker。它可以在页面运行前参与导航请求，也可在没有打开页面时处理获准触发的后台事件；它没有 DOM，不是某个标签页的常驻后台线程。[Service Workers 标准](https://www.w3.org/TR/service-workers/)

注册需要安全上下文，同源脚本 URL、有效的脚本响应与允许的作用域。HTTPS 是常见部署方式，本地可信地址可用于开发；判断依据是浏览器安全上下文与来源规则，不应只检查 URL 字符串。私密模式、嵌入场景、存储分区与策略限制仍可能影响可用性。

| 对象 | 表示什么 | 生命周期 |
| --- | --- | --- |
| ServiceWorkerRegistration | 某个 scope 的注册与 installing / waiting / active 槽位 | 可跨页面关闭与重新打开保留 |
| ServiceWorker | 一个脚本版本及其状态 | 可经历安装、激活、废弃 |
| worker 全局环境 | 某次执行时的全局对象与内存 | 浏览器可终止，后续事件可重新启动 |
| client / controller | 被控制的页面等客户端与控制者 | 与客户端和控制关系相关 |

注册记录、脚本版本和一次内存执行不是同一个东西。Cache Storage / IndexedDB 可以独立保留，而全局 Map、计数器或定时器不能承担持久业务状态。

## 2. 注册、作用域与页面控制

下面是页面端的 API 关系示意，未提供对应 sw.js，也不构成可运行 demo；省略异常处理、注册时机与业务 UI：

```js
const registration = await navigator.serviceWorker.register("/app/sw.js", {
  scope: "/app/",
})
const activeRegistration = await navigator.serviceWorker.ready
const controller = navigator.serviceWorker.controller
```

三个结果分别表示注册调用完成、有 active 注册、当前页面是否受控，不能互相替代。ready 可能一直等待，没有 active worker 时不应把它作为一定很快完成的页面加载前提；它 resolve 也不证明当前页面 controller 非 null。[register 文档](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)、[ready 文档](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready)

默认 scope 是 worker 脚本所在目录。`/app/sw.js` 默认覆盖 `/app/`，显式申请更宽范围通常还需脚本响应的 Service-Worker-Allowed 标头授权；这个标头不是跨源授权。多个注册存在时按客户端 URL 的最具体匹配范围选择控制关系，避免无意重叠作用域。

scope 主要限制可控制的客户端，不是仅拦截“请求 URL 位于这个目录”的过滤器。受控页面请求其他路径乃至跨源资源也可能进入 fetch 事件；业务仍应按请求方法、来源、目的与路径筛选。代理不能绕过 CORS、身份认证或响应类型限制。

首次注册通常不会自动接管已经加载的页面。新导航可由 active worker 控制；`clients.claim()` 可让已激活 worker 接管符合条件的客户端，并引发 controllerchange，但不会倒带重放接管前完成的请求。[生命周期官方说明](https://web.dev/articles/service-worker-lifecycle)

## 3. 安装、等待与激活

| 阶段 | 典型工作 | 失败 / 交接边界 |
| --- | --- | --- |
| 下载、解析、执行 | 获取脚本，注册顶层事件监听 | 脚本无法获取或执行失败，无法形成可用新版本 |
| installing / install | 预备本版本必需资源 | waitUntil 的任务失败可导致安装失败 |
| installed，进入 waiting 槽位 | 等待旧版不再控制客户端 | waiting 是注册的槽位 / 阶段，不是 state 的字面值 |
| activating / activate | 迁移与清理，准备接管 | 不应将破坏性清理先于版本可用性确认 |
| activated | 响应 fetch、message 等功能事件 | 执行环境仍可能随时结束 |
| redundant | 失败、被替代或废弃的版本 | 不再作为可用版本处理新工作 |

首次没有旧版本时通常可直接走向激活；更新时新版本可先安装并等待，旧版本继续服务现有页面。刷新时新旧客户端可能短暂重叠，因此“按一次刷新就必定激活更新”不是保证。

安装阶段只绑定关键依赖，避免可选图片失败阻断整次版本安装。关键资源预缓存失败时应保留旧版可用路径；安装失败也不自动回滚已进行的所有外部写入，缓存与数据库操作需要自己的设计。

## 4. waitUntil 与 respondWith 的职责

`event.waitUntil(promise)` 将工作纳入事件生命周期；在 install / activate 中还能影响安装与激活推进。应在事件有效的分发期间建立生命周期任务，不能等事件处理结束后再任意补挂。它不是无限执行权，浏览器仍可设置时限或结束异常任务。[waitUntil 文档](https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil)

`event.respondWith(responsePromise)` 决定 fetch 请求用哪个响应，需在监听器同步执行期间调用；Promise 的解析可以异步。不要先 await 网络，再调用 respondWith。返回值必须是与请求模式等条件相容的 Response，返回 undefined 不是自动网络回退。[respondWith 文档](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith)

例如以下仅示意“登记响应与额外工作”的位置；handleRequest、recordResult 由应用定义，未给出完整请求策略：

```js
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  const responsePromise = handleRequest(event.request)
  event.respondWith(responsePromise)
  event.waitUntil(recordResult(responsePromise))
})
```

没有调用 respondWith 的请求按正常获取流程继续。需要返回缓存后做后台更新时，在事件有效期内为更新建立 waitUntil；只写一个脱离生命周期的 Promise，页面离开或 worker 终止时可能完不成。

worker 内部调用 fetch 会走其网络获取路径，可利用 HTTP cache，不会通过同一 fetch 处理器无限递归。网络链路、HTTP cache 和 Cache Storage 的组合见 [缓存笔记](./cacheStorage.md)。

## 5. 请求策略与离线边界

Service Worker 负责接住符合条件的请求事件，并登记响应与额外工作的生命周期。顺着上一节的示意代码看，处理顺序是：

```text
fetch 事件 -> 按方法、来源、目的和路径筛选
             ├─ 不接管 -> 保持正常获取流程
             └─ 接管 -> 同步调用 respondWith，登记响应 Promise
                         ├─ 按应用策略取得缓存或网络响应
                         └─ 若有后台工作，在有效期内登记 waitUntil
```

handleRequest 负责选择并产出合适的 Response，respondWith 本身不会自动补上离线回退。cache first、network first 等策略的返回路径、适用资源与失败责任集中在 [Cache Storage](./cacheStorage.md#5-http-新鲜度与脚本策略分开)；它们是应用算法，需要自行实现匹配、更新和淘汰。HTTP 错误的处理也不能仅靠 fetch 的 catch，详见 [fetch 与取消](../network/fetch.md#promise-兑现不等于-http-成功)。

不要给所有 fetch 无条件返回 app shell：脚本、样式、API、图片请求收到 HTML 会出现难以定位的错误。导航回退应限定 request.mode / 路由，预备真正可用的离线文档与必要依赖。

离线首访如果设备从未缓存该站点，无法凭空获得其应用壳。已经安装图标也不证明所有页面、数据和登录态准备好；应定义“哪些功能在什么准备条件下可离线”。

POST 等写操作需要另外定义在线失败或离线排队行为，不能用返回一个缓存响应冒充提交完成。持久队列、账号验证、冲突处理及幂等的职责见 [Cache Storage 的离线写入说明](./cacheStorage.md#6-版本新鲜度与账号隔离)。

导航预加载可在 worker 启动时并行获取导航响应，处理器需消费 preloadResponse，避免又发一次重复网络请求。它是独立优化，需检测支持并结合真实 trace 评估，不改变离线策略本身。

## 6. 更新、接管与回滚

浏览器会在相关导航和事件等时机检查更新，也可由 registration.update 发起检查；调度和节流不等于定时轮询承诺。更新涉及脚本及其依赖的获取与比较，不是改了 cache name 就更新 worker。通常保留稳定的 worker URL，通过资源内容与版本契约发布。

updateViaCache 控制更新检查中 worker 脚本及其导入脚本如何使用 HTTP cache，不控制普通页面资源的缓存策略。默认 imports 与 all / none 的区别见 [register 的 updateViaCache](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#updateviacache)。

`skipWaiting()` 请求新 worker 跳过等待；`clients.claim()` 建立客户端控制关系。它们不会刷新页面上的 JavaScript，也不能自动保证旧页面、新 worker、新 API 与数据库 schema 兼容。不要把两者无条件拼进所有项目的模板。

可以用以下版本协议组织交接，属于应用设计而非标准自动完成的事务：

1. 新 worker 在独立版本缓存中准备关键资源，保留旧版。
2. 页面发现 waiting 版本，向用户提示，并先保存编辑状态。
3. 确认切换后通知 waiting worker；worker 校验消息，再调用 skipWaiting。
4. 页面监听 controllerchange，按本次升级标记只刷新一次，避免刷新循环。
5. 确认仍在使用的前端版本与缓存 / 数据 schema 兼容后，再清理不需要的旧版本。

强制切换时多个旧标签页仍可能继续运行旧 JS；不能激活后立刻删光旧 chunk，再期待旧页面的动态 import 正常。数据库不可逆迁移也可能使“回滚脚本”失去意义，需要提前定义向前 / 向后兼容窗口。

卸载注册不会自动删除 Cache Storage 或 IndexedDB，也不等于立即解除所有现有页面的控制。清理和应急恢复需要区分注册、受控客户端、HTTP cache 与应用数据；生产环境还需可获取的新 worker 处理修复，不能只删除服务端 sw.js 期待客户端立即恢复。[unregister 文档](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/unregister)

## 7. 后台能力与定位问题

Push、Notification、Background Sync 等有各自权限、支持和调度条件，不能因为 worker 注册成功就认为后台能力全部可用。同步请求被登记不代表已经执行，更不代表服务端提交成功；浏览器关闭、系统省电和网络条件都可能影响触发。离线队列通常需要 [IndexedDB](../storage/indexedDB/indexedDB.md)、稳定 request id、用户身份隔离和服务端幂等。

排查时分别看 Application 中注册 / state / controller、Cache Storage 内容、Network 响应来源以及服务器请求。Disable cache 通常针对 HTTP cache，不是关闭 Cache Storage 代理；Update on reload、Bypass for network 等开发工具设置会改变路径，不应当作生产默认。

以下为复核场景，不是本仓库本次实测：首次在线加载是否受控；受控后的离线导航；已有 v1 多标签时发布 v2；新版本关键资源失败；旧标签动态导入旧 chunk；账号切换；配额失败；数据清理后再次离线。每项记录 worker / 页面 / 资源版本及请求证据，不能只记录一条“注册成功”。
