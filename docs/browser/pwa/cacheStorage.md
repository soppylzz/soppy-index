# Cache Storage：由应用管理的请求与响应副本

## 1. 存储模型与隔离

CacheStorage 是入口 caches，管理多个命名 Cache；每个 Cache 保存 Request 与 Response 的匹配关系。它不是 HTTP cache 的脚本接口，也不是所有浏览器存储的总称。安全上下文中可在受支持的 Window 或 worker 使用，不必先注册 Service Worker。[Cache 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

```text
CacheStorage（caches）
  ├─ notes-static-v3
  │    ├─ GET /app.a1.css -> Response
  │    └─ GET /app.b2.js  -> Response
  └─ notes-public-data-v1
       └─ GET /catalog?lang=zh -> Response
```

cache name 是应用命名空间，不是 URL 路径，也不自动按 Service Worker scope 隔离。同一存储分区下，同源多个模块可能共享这组命名缓存；清理必须限定自己的名称前缀。

浏览器通常按来源管理站点数据，但在第三方嵌入、隐私策略与分区环境中不能只用 origin 推断可见性。缓存不保证永远存在，也不能假定隐私窗口与普通窗口行为一致。配额、estimate / persist 与回收见 [存储管理](../storage/storageManagement/storageManagement.md)。

## 2. API 各自操作哪一层

| API                          | 职责                    | 返回 / 注意                    |
| ---------------------------- | ----------------------- | ------------------------------ |
| caches.open(name)            | 打开或创建命名 Cache    | Promise<Cache>；可失败         |
| cache.match(request)         | 在指定 Cache 查匹配项   | 未命中得到 undefined           |
| cache.put(request, response) | 保存 / 替换一项         | 消费传入响应体，不自动 fetch   |
| cache.add / addAll           | fetch 后保存一项 / 一批 | 有额外成功状态检查             |
| cache.delete(request)        | 删除指定条目            | boolean 结果，非删除整个 Cache |
| cache.keys()                 | 列出缓存中的 Request    | 与 caches.keys 名称列表不同    |
| caches.keys()                | 列出命名 Cache          | 不等于资源 URL 列表            |
| caches.delete(name)          | 删除整个命名 Cache      | 不注销 worker                  |

caches.match 可跨命名 Cache 查找，多个版本含同一 URL 时可能命中不期望版本；版本化策略通常应明确打开并查询所需 Cache，而非默认在所有缓存里搜索。[CacheStorage 文档](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)

## 3. 匹配规则不是随意字符串索引

默认匹配会考虑请求 URL（含 query）、方法及已存响应的 Vary 要求。URL fragment 不作为区分条目的业务键；需要业务版本时用明确 URL 或独立元数据。

| 选项         | 默认  | 放宽后的风险                                 |
| ------------ | ----- | -------------------------------------------- |
| ignoreSearch | false | 不同 query 的分页、语言、过滤结果混用        |
| ignoreMethod | false | 放宽查询检查，不意味着可以把 POST 存进 Cache |
| ignoreVary   | false | 不同请求标头对应的响应混用                   |

不要用 ignoreSearch 解决“带随机参数命不中”的表面问题，也不要靠忽略 Vary 简化内容协商。Authorization / Cookie 并不是自动可靠的账号缓存隔离键，URL 相同不代表响应属于同一个用户。[Cache.match 文档](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match)

## 4. 写入限制、批量与响应流

Cache.put 接受 http / https 的 GET 请求，响应不能是 206、Vary:*，body 也不能已经被消费或锁定。它可保存某些非成功 HTTP 响应和 opaque 响应，不能把“put resolve”解读为业务成功。[put 文档](https://developer.mozilla.org/en-US/docs/Web/API/Cache/put)

add / addAll 会自行获取资源，并要求合适的成功响应；opaque 的 status 为 0，不能按 addAll 的成功条件通过。addAll 中一个请求失败会使该次调用 reject，不能理解为已经逐项完成可用预缓存。一次批量写入也不是整个应用安装、数据库迁移与旧缓存删除的跨系统事务。[addAll 文档](https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll)

Response.body 是流，不是随意反复读取的字符串。写缓存和返回调用者需要独立消费分支，通常在未消费前 clone：

```js
async function fetchAndStore(request, cache) {
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
  }
  return response
}
```

此为解释流所有权的片段：request、cache 来自调用方，省略方法 / 来源筛选、写入异常处理和并发控制，不是完整策略。若缓存写入只是优化，应单独捕获配额等错误，避免可用网络响应因非关键缓存失败而整体丢失。

clone 底层分叉响应流，不意味着大文件可以免费复制；两路消费速度不同时较慢分支可能积压数据，需考虑内存与背压。[Response.clone 文档](https://developer.mozilla.org/en-US/docs/Web/API/Response/clone)

opaque 响应的状态、标头和 body 对脚本不可读，仍可能作为整体保存；这不等于能确认内容正确。放入 cache first 后可能长期复用无法验证的错误内容，需限定来源、更新和容量策略。

## 5. HTTP 新鲜度与脚本策略分开

Cache Storage 不自动按 Cache-Control 的 max-age 到期，也不在 match 时自动使用 ETag 发起验证。no-store 等 HTTP 缓存标头不能代替脚本的“不写入 Cache Storage”规则；敏感数据应在应用策略中明确排除。[Cache 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/Cache)

```text
受控请求 -> Service Worker
              ├─ cache.match -> Cache Storage 副本
              └─ fetch       -> 网络获取流程，可能复用 / 验证 HTTP cache
```

一次所谓“后台网络更新”仍可能获得 HTTP cache 中的响应，未必真正访问源站。需要 revalidation 时选择合理的 fetch cache mode 与服务端标头，结合 Network 和服务器证据判断，详见 [HTTP Cache](../cache/http-cache.md)。

下表集中比较应用如何读取、更新和淘汰响应副本。示例场景只是选型起点，最终取决于业务可接受的新鲜度及失败反馈：

| 策略 | 返回路径 | 可考虑的场景 | 更新与失败责任 |
| --- | --- | --- | --- |
| cache first | 命中缓存即返回，否则 fetch | 带内容哈希的静态资源 | 版本与淘汰；未命中处理，旧页面仍需旧资源 |
| network first | 先 fetch，失败 / 超时按规则回退缓存 | 希望优先获取新内容的页面导航 | 区分网络、HTTP、业务错误，预备合适的离线文档 |
| stale-while-revalidate | 命中时先返回，同时更新 | 可容忍短时旧值的数据 | 处理更新失败与并发覆盖；在 worker 中登记后台工作寿命 |
| network only | 不使用 Cache Storage | 强实时数据，或明确排除持久副本的请求 | fetch 仍可能使用 HTTP cache，需另定请求缓存模式；离线时明确不可用 |
| cache only | 仅查询本地 | 已明确准备好的离线资源 | 未命中需明确响应，不返回 undefined 给 respondWith |

Cache API 只提供副本操作，不会替应用选择表中算法。由 Service Worker 承载策略时，响应如何登记、后台更新如何纳入事件生命周期见 [waitUntil 与 respondWith](./serviceWorker.md#4-waituntil-与-respondwith-的职责)。这里的 stale-while-revalidate 是应用算法，与 HTTP Cache-Control 的同名扩展属于不同层，不能混为浏览器自动执行的同一流程。

## 6. 版本、新鲜度与账号隔离

静态文件适合带内容哈希的 URL，加上应用前缀和版本化 cache name。接口数据则需定义有效期、刷新时机和允许陈旧程度；写入时间可维护在独立元数据中，响应 Date 并不等价于本地写入时间。

多个并发更新可能出现旧请求较晚返回并覆盖新值。需要按数据版本、序号或串行协调决定是否写入；Cache API 没有为业务自动处理这种“后返回覆盖”问题。

个性化响应原则上先明确是否允许持久缓存，再设计用户命名空间、权限变化、退出清理与过期；仅按 URL 缓存会让同设备后续账号读到前一账号的数据。缓存命名本身不是安全隔离，页面脚本处于同源权限范围仍可能访问其他命名 Cache。

Cache Storage 不保存任意方法请求的待重放队列。离线写入通常用 [IndexedDB](../storage/indexedDB/indexedDB.md) 保存任务，结合稳定 request id、当前账号验证、冲突处理与服务端幂等；“进入本地队列”和“服务器业务成功”分开显示。

## 7. 清理与失败后的降级

只删除明确属于本应用且不再需要的缓存，不能沿用“删除所有非当前名字”的示例而误删同源其他模块。以下说明名称范围筛选，不代表已解决旧标签页仍需旧资源的问题：

```js
const prefix = "notes-static-"
const retained = new Set(["notes-static-v2", "notes-static-v3"])
const names = await caches.keys()
await Promise.all(
  names
    .filter((name) => name.startsWith(prefix) && !retained.has(name))
    .map((name) => caches.delete(name))
)
```

保留版本集合由仍在运行的客户端与部署协议决定，不应固定假设“只留两版”就总足够。强制激活后旧页面的动态导入尤其需要考虑，见 [Service Worker 更新](./serviceWorker.md)。

写入可能遭遇配额、不可用环境或浏览器回收。能力检测只说明接口存在，open / match / put 都仍需要异常路径；缓存非关键时退回网络，真正离线时则报告能力受限或明确 fallback，不伪造成功。

不能依赖统一 LRU 或固定容量，也不能用 persist 的请求或结果承诺所有数据永久存在。用户清理站点数据、浏览器策略与存储压力均需纳入恢复设计；不应把 Cache Storage 当作业务数据唯一副本。
