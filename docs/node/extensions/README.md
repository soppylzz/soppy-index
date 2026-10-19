# WASM 与原生扩展

[Node 实验总入口](../run.ts)

什么时候值得离开纯 JavaScript？

这是进阶选读：在理解 Worker 与进程隔离后，比较 WASM、Node-API 与本地编译的适用边界。先确认系统库需求与平台成本，再通过真实负载评估收益。

- [扩展方式取舍](./native.md)：Node-API、WASM 与二进制平台边界。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/extensions/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
