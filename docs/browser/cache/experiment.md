# HTTP 缓存实验

[HTTP 缓存原理](./http-cache.md)解释直接复用、条件验证与完整获取。这里说明实验启动方式，以及可以用实验理解的面试常考点。

## 运行 Next.js 实验

需要 Node >= 22.18 与 pnpm。首次在仓库根目录安装依赖，再构建和运行：

```bash
pnpm install --frozen-lockfile
pnpm --filter http-cache-next-lab build
pnpm --filter http-cache-next-lab start
```

打开 <http://127.0.0.1:5003/>，按 `Ctrl+C` 停止。端口被占用时明确更换：

```bash
pnpm --filter http-cache-next-lab exec next start --hostname 127.0.0.1 --port 5007
```

正式对照采用 build / start；`pnpm --filter http-cache-next-lab dev` 用于修改页面，不以开发模式的行为代替生产模式缓存验证。不要混用 localhost、127.0.0.1 或不同端口，它们会改变本实验的 origin。

## 控制观察条件

保持资源 URL 不变，取消 DevTools 的 Disable cache，并排除同源 Service Worker。页面加载时不会预先请求实验资源。选择资源和请求 cache mode 后，点击 Send request；要重新测试未命中，可使用尚未请求过的资源、新浏览器配置或明确清理缓存。

fresh.svg 的新鲜期为 5 秒，short-fresh.svg 为 1 秒，便于快速对比新鲜期内直接复用与过期后的条件验证。

服务端版本与最近 80 条资源请求保存在单个 Node 进程内，重启后重置；浏览器缓存不会随之清除。实验不适用于多进程或 serverless 部署，也不模拟 CDN、跨站缓存分区和授权响应。

## 面试常考点

回答缓存问题时，先判断有没有匹配条目、能否直接复用，再说明验证与完整获取的条件。不要把“强缓存”和“协商缓存”解释成两个独立仓库。

| 常考问题 | 应说明的机制 | 如何用实验观察 |
| --- | --- | --- |
| 服务器更新了文件，为什么还是旧内容？ | 新鲜响应可直接复用；服务端改版不会主动清除浏览器缓存 | 对 fresh.svg 点击 Change server version，再比较 force-cache 与 no-cache 的正文版本 |
| 过期后一定下载完整文件吗？ | 有验证器时可以发条件请求；内容未变返回 304，复用已有正文 | 对 short-fresh.svg 先 reload，等超过一秒后 default，查看服务端状态与条件头 |
| no-cache 和 no-store 有什么区别？ | 前者允许存储、复用前验证；后者不允许存储该响应 | 重复 default 请求 no-cache.svg 与 no-store.svg，对比 304 和完整 200 |
| ETag 和 Last-Modified 怎么选择？ | 一个验证表示标识，一个验证修改时间；两种条件同时出现时 If-None-Match 优先 | 比较 no-cache.svg 与 last-modified.svg 的请求头；日期采用固定基准加版本秒数，便于观察 |
| fetch 返回 200，能证明没走缓存吗？ | 不能；直接复用或验证后合并缓存正文，都可能得到可读的 200 | 对照正文版本、实际到达服务端的请求和 Network，不能只看 Response.status |
| 上线时怎样兼顾更新及时与缓存收益？ | HTML 可要求验证，带内容哈希的静态资源使用较长新鲜期；先上传资源，再切换 HTML，并保留旧资源 | 本实验保持 URL 不变，用于理解旧响应为何继续有效；完整部署策略见原理文档 |

页面只显示当前资源的响应策略、验证器和服务端版本，以及最近 10 次请求结果。先用 default 请求两次，再点击 Change server version，比较 default/force-cache 与 no-cache 的返回版本。结果表中的 Server response 来自请求前后的服务端记录差值：有请求时显示真实状态及条件头名称，没有时显示 No new request；其他标签页也可能贡献这些记录。

请求的 cache mode 与响应的 Cache-Control 指令要分开理解。请求 no-store 不等于清除历史缓存；only-if-cached 要求 same-origin，未命中可能返回 504 或使 fetch 拒绝。页面不自动预热缓存，可以对尚未请求的资源选择 only-if-cached 观察未命中。

## 代码入口

- [页面交互](./demo/app/cache-lab.tsx)：在浏览器发起原生 fetch，对照正文版本、fetch 状态与服务端实际响应。
- [资源 Route Handler](./demo/app/assets/[name]/route.ts)与[缓存响应逻辑](./demo/lib/cache.ts)：生成五类响应头、处理条件请求并记录真正到达服务端的请求。
- [版本与请求记录](./demo/lib/state.ts)：页面查询和资源接口共用单进程状态。

资源仅通过原生 fetch 请求固定地址，不使用图片预览或图片优化服务。资源路由动态执行，并显式返回 Cache-Control；版本与记录接口使用 no-store。Next.js 页面、Data Cache 和浏览器 HTTP 缓存是不同层次，本实验关注最后一层。[Route Handlers 文档](https://nextjs.org/docs/app/getting-started/route-handlers)

修改后可运行：

```bash
pnpm --filter http-cache-next-lab test
pnpm --filter http-cache-next-lab typecheck
pnpm --filter http-cache-next-lab build
```

## UI 与测试

React 页面使用 HeroUI 3.2.6 控件；隐藏协议字段与被测资源保留原生语义。测试放在本实验的 `demo/__test__/`。构建完成后可执行 `pnpm --filter http-cache-next-lab test:ui` 检查生产 HTML 与样式，组件交互仍需真实浏览器复核。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
