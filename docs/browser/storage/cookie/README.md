# Cookie

- [知识笔记](./cookie.md)：机制、边界和对应 demo 的核心代码。
- [实验走查](./index.md)：启动、操作步骤、预期与验证边界。
- [实验服务](demo/lib/handler.ts)：Next.js 本地实验服务。

## 运行

需要 Node >= 22.18。在仓库根目录执行：

```bash
pnpm install
pnpm --filter cookie-next-lab dev
```

银行打开 <http://localhost:3000/>，按 `Ctrl+C` 停止。独立构建与生产运行：

```bash
pnpm --filter cookie-next-lab build
pnpm --filter cookie-next-lab start
```

Cookie 实验需要两个终端。银行使用上述命令，访问 <http://localhost:3000/>；攻击者站点在另一终端执行：

```bash
pnpm --filter cookie-next-lab dev:evil
```

攻击者访问 <http://127.0.0.1:3001/>，保持 `localhost` 与 `127.0.0.1` 的跨站差异。生产模式先构建银行，再执行 `LAB_ROLE=evil pnpm --filter cookie-next-lab build`；分别用 `start` 和 `start:evil` 启动，两者使用独立构建目录。

需要换端口时，同时在两个终端设置 `BANK_PORT/EVIL_PORT`，并通过 Next CLI 的 `--port` 指定对应监听端口；变量负责页面链接，CLI 参数负责监听，二者必须一致。

页面和接口由 [Next.js Route Handler](./demo/lib/handler.ts) 提供，浏览器机制由原生脚本执行。加载与生命周期页面使用独立 HTML 响应，避免 React hydration、客户端路由和热更新脚本改变被测时序。开发首次编译会影响耗时比较，时序实验优先使用构建后的生产模式。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
