# 编译器实验工作区

这里保存合法输入、诊断用例、直接调用编译器 API 的脚本，以及真实 Vite 集成。学习阶段走查见[编译教程](../../packages/compiler/index.md)，插件的处理边界见 [Vite 集成](../../packages/compiler/docs/vite.md)。

`.mini.ts` 预转换插件只处理自包含示例，调用手写编译器并返回 ESM 与 Source Map；它不替代 Vite 的完整模块解析和生产打包。产物写入策略也在此工作区实现，编译器核心只返回生成结果。

在仓库根目录安装依赖后，进入本目录执行：

```bash
pnpm hello
pnpm modules:cjs
pnpm test
pnpm dev
```

开发页为 <http://127.0.0.1:5178/>。`pnpm build` 构建后，用 `pnpm preview` 在 <http://127.0.0.1:5179/> 预览；`Ctrl+C` 停止服务，端口冲突会明确失败。

实验输出位于本目录的 `dist/output/`，Vite 产物位于 `dist/vite/`。输出策略与 Vite 集成用例位于 `__test__/`；测试通过不代表已验证真实浏览器断点或编辑器声明跳转。
