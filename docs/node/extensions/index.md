# WASM 与原生扩展：实验走查

什么时候值得离开纯 JavaScript？

这是进阶选读：在理解 Worker 与进程隔离后，比较 WASM、Node-API 与本地编译的适用边界。先确认系统库需求与平台成本，再通过真实负载评估收益。

- [扩展方式取舍](./native.md)：Node-API、WASM 与二进制平台边界。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/extensions/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

读完笔记后，先预测再运行入口。日志中的关键事件是 `actual-wasm-execution`。

实例化已知 WASM 模块并计算 42；nativeAddonBuilt 为 false。

没有编译 native addon，也没有验证跨平台发布；加法微例不证明性能优势。
