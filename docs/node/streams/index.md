# 流与背压：实验走查

消费者处理不过来时，生产者怎样停下来？

掌握字节后，把整块读取改成分块传递。用 write(false) 理解暂停，再区分 finish、close 和 destroy，最后看 pipeline 的失败与取消传播。

- [Stream 与 pipeline](./stream.md)：水位、drain、结束和销毁。

## 运行

在仓库根目录使用 Node >= 22.18：

```bash
node docs/node/streams/index.ts
```

成功以 `lab-complete` 和退出码 0 结束；完整实现见 [index.ts](./index.ts)。

## 观察重点

先读相应笔记并预测，再运行完整入口。下表的“应看到”是这个实验控制条件下的检查点，具体结果以当前运行输出为准。

| 问题 | 看哪里 | 应看到与原因 |
| --- | --- | --- |
| `write(false)` 是失败吗？ | 向水位 4 字节的慢消费者写 4 字节块 | 当前块已接受；等待 `drain` 后再继续生产。 |
| 何时算写入结束？ | 调用 `end()` 并等待 `finish` | 三块共 12 字节由 Writable 处理完成；不据此推断磁盘持久或远端业务完成。 |
| 中间段报错会怎样？ | 运行失败的 Transform | `pipeline` 拒绝，并按其错误路径销毁各段。 |
| 取消会怎样？ | 用 AbortController 取消另一条流水线 | 得到 `AbortError`，相关流进入销毁路径。 |

慢消费者只是有界异步回调；未测生产大文件吞吐、HTTP 半关闭、对象模式或 Web Stream 桥接。
