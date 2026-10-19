# 字节、编码与文件

[Node 实验总入口](../run.ts)

字符串长度、网络字节数和文件路径为什么不能混用？

先理解 Buffer 持有字节，再处理分块解码，最后理解路径、file URL 和句柄。它们是流和 HTTP 请求体的基础。

- [Buffer 与编码](./buffer.md)：字节、共享视图与增量解码。
- [文件与路径](./paths.md)：URL 转换、路径边界与句柄清理。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/files/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
