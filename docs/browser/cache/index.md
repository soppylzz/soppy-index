# HTTP 缓存实验走查

[运行方式](./README.md) · [知识笔记](./httpCache.md) · [实现](./index.ts)

公共模块迁移后的知识 / demo 对应复核与实际运行记录见[集中验证](../../demo/validation.md)；下方早期记录保留各自的环境与覆盖边界。

运行 `node docs/browser/cache/index.ts`，打开默认 <http://localhost:5003/>。取消 DevTools 的 Disable cache；需要重新开始时清除该源缓存并移除干扰的 Service Worker，或使用独立浏览器配置。不要修改资源 URL 来“刷新缓存”，否则比较的是另一个缓存 key。

## 1. 三种结果与观察位置

| 结果             | 服务器终端                                     | 浏览器可见结果                            |
| ---------------- | ---------------------------------------------- | ----------------------------------------- |
| 直接复用本地响应 | 此次资源请求没有到达服务                       | fetch 通常为 200，正文来自已有条目        |
| 条件验证后复用   | 带 If-None-Match / If-Modified-Since，返回 304 | fetch 通常暴露合并后的 200 和完整缓存正文 |
| 新响应           | 返回 200，传输完整资源                         | 读取新的正文与版本                        |

Resource Timing 的 transferSize 和 encodedBodySize 是辅助证据，不直接等于网络状态码。验证后 bodySize 可以仍是缓存正文的大小，不能用“body 为 0”判定 304。页面只提示本地复用迹象或存在网络传输，网络 200/304 以服务端日志及 Network 为准。定义见 [Resource Timing](https://www.w3.org/TR/resource-timing/#dom-performanceresourcetiming-transfersize)。

每次 probe 只匹配本次 fetch 的时间范围与 URL；表格展示各资源最近一次时序，可能由图片加载或 fetch 产生。日志按时间追加，最多 50 条；不把旧图片时序冒充本次请求结果。

## 2. 新鲜度与服务端改版

选择 fresh.svg，使用 default 请求，确认当前正文版本。点对应改版按钮后，在 60 秒 freshness lifetime 内依次比较 force-cache 与 no-cache。

预期 force-cache 使用已有条目，可能仍读到旧版；no-cache 要求验证，旧 ETag 不再匹配时拿到新 200。服务端改版不会主动清除客户端条目。随后 default 可以复用刚更新的条目。

选择 short-fresh.svg，先用 reload 获取一份新响应，立即 default，再等超过一秒 default：过期后预期携带验证器，内容未变则服务器返回 304。不要把精确秒数、内存或磁盘归属写成跨浏览器保证。

## 3. ETag 与 Last-Modified

选择 no-cache.svg，重复 default，观察终端的 If-None-Match 与 304；改版后再请求，观察新 200。选择 last-modified.svg 重复操作，观察 If-Modified-Since。

short-fresh.svg 同时提供两种验证器。手动构造条件请求时 If-None-Match 优先，不能在 ETag 不匹配时又因为旧日期条件而错误返回 304。该优先级由服务端实现，可用 HTTP 客户端独立检查；不要求浏览器每次都同时发送两种头。

## 4. no-store 与 fetch cache mode

选择 no-store.svg，连续 default，预期每次到达服务并返回完整 200。

| cache mode     | 对照重点                                               |
| -------------- | ------------------------------------------------------ |
| default        | 按当前请求与响应缓存规则处理                           |
| no-cache       | 使用条目前验证，包括 fresh 条目                        |
| reload         | 绕过已有条目，请求新响应，并按响应策略更新缓存         |
| no-store       | 不使用 HTTP 缓存，也不将此次响应写入其中               |
| force-cache    | 优先使用匹配条目，包括 stale 条目；没有条目则请求网络  |
| only-if-cached | 只查缓存；实验同时设置 same-origin，未命中可能得到 504 |

only-if-cached 未命中的测试需要先清除条目；页面图片已加载的 fresh.svg 通常不是未命中条件。请求模式定义见 [Fetch Standard](https://fetch.spec.whatwg.org/#concept-request-cache-mode)。

普通刷新、硬刷新和 DevTools 设置另行对照，它们可能改变请求头和缓存模式；主实验使用明确的 fetch 选项减少变量。

## 5. 实验边界

服务器版本只是本地进程状态；重启后旧的 fresh 响应仍可能继续复用。相同源下的缓存与 Service Worker 也可能干扰结果。实验没有实现所有 HTTP 缓存规则，不用这些简化路由模拟 CDN 或授权响应。

## 6. 验证记录

2026-10-08，macOS、Node v22.23.2、Headless Chrome 153.0.8010.48，使用独立临时配置与 DevTools Protocol，验证脚本位于仓库外。

| 验证项                     | 实际结果                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| fresh 默认复用             | 请求未到达服务器                                                                          |
| 服务端改版                 | force-cache 继续读取 v1；no-cache 获取 v2，新响应为 200                                   |
| 内容不变时再次验证         | 服务端返回 304，fetch 最终状态为 200                                                      |
| 同次验证的 Resource Timing | transferSize=300、encodedBodySize=310、responseStatus=200，证明非零 bodySize 不能排除 304 |
| ETag / Last-Modified       | 两种条件请求均观察到 304；ETag 不匹配时优先返回 200                                       |
| 短新鲜期 / no-store        | 超过一秒后验证；no-store 连续两次均完整 200                                               |
| only-if-cached             | 已有条目时读取 v2；未命中情况仍需单独复现                                                 |
| 路由与启动                 | HEAD、404/405、非法资源 400、动态端口、占用端口失败提示均通过；旧实验路由返回 404         |
| 浏览器异常                 | 未捕获 Runtime.exceptionThrown                                                            |

表中的字节数只记录此次响应，不是所有浏览器或资源的固定值。未验证其他浏览器、CDN 和 Service Worker 场景。
