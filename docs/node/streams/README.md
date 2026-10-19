# 流与背压

[Node 实验总入口](../run.ts)

消费者处理不过来时，生产者怎样停下来？

掌握字节后，把整块读取改成分块传递。用 write(false) 理解暂停，再区分 finish、close 和 destroy，最后看 pipeline 的失败与取消传播。

- [Stream 与 pipeline](./stream.md)：水位、drain、结束和销毁。

## 动手验证

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/streams/index.ts
```

先预测结果，再核对日志与断言；成功以 `lab-complete` 和退出码 0 结束。时间与跨来源顺序以当次观察为准。
