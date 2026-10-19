# 模块与包边界

[Node 实验总入口](../run.ts)

一个文件为什么执行一次，导入的值又为什么会变化？

先读 CJS 与 ESM 的模块身份和求值，再读包公开入口，最后看 TypeScript 类型擦除。模块格式、包解析与类型检查是三个不同问题。

- [CJS 与 ESM](./modules.md)：缓存、求值与 live binding。
- [包解析](./packages.md)：exports、条件入口与内部映射。
- [原生 TypeScript](./typescript.md)：执行与类型检查分离。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/modules/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
