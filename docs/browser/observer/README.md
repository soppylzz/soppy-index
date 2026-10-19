# Observer API

根据变化信号选择观察器：DOM 结构与属性用 MutationObserver，几何交叉用 IntersectionObserver，布局盒尺寸用 ResizeObserver。

- [机制笔记与核心代码](./observer.md)：观察范围、交付时机、记录、阈值、盒模型和反馈边界。
- [实验走查](./index.md)：独立路由、操作与预期、实测结果和未验证项。
- [HTTP 入口](demo/lib/handler.ts) · [浏览器实验脚本](demo/public/assets/lab.js) · [页面样式](demo/public/assets/style.css)。

## 运行

需要 Node >= 22.18。在仓库根目录执行：

```bash
pnpm install
pnpm --filter observer-next-lab dev
```

打开 <http://127.0.0.1:5010/>，按 `Ctrl+C` 停止。独立构建与生产运行：

```bash
pnpm --filter observer-next-lab build
pnpm --filter observer-next-lab start
```

端口由 Next CLI 管理；需要覆盖时执行 `pnpm --filter observer-next-lab exec next dev -H 127.0.0.1 -p 另一个端口`。使用稳定 origin，避免改变浏览器存储与页面身份的实验条件。

页面和接口由 [Next.js Route Handler](./demo/lib/handler.ts) 提供，浏览器机制由原生脚本执行。加载与生命周期页面使用独立 HTML 响应，避免 React hydration、客户端路由和热更新脚本改变被测时序。开发首次编译会影响耗时比较，时序实验优先使用构建后的生产模式。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
