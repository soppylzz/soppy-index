# 模块、包边界与原生 TypeScript

[Node 导航](../README.md) · [验证记录](../validation.md)

先区分模块格式与身份，再看包如何公开入口；原生 TypeScript 只改变可直接执行的语法范围。

- [CJS 与 ESM](./modules.md)：求值、缓存与 live binding。
- [包解析](./packages.md)：`exports`、条件与公开边界。
- [类型擦除](./typescript.md)：执行与类型检查分离。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/modules/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
