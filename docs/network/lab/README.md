# TCP 字节流与 UDP 数据报实验

从仓库根目录运行（Node >= 22.18）：

```bash
node docs/network/lab/index.ts
```

实验只在 `127.0.0.1` 上使用系统分配的临时 TCP/UDP 端口，执行完自动关闭。若环境异常卡住，可按 `Ctrl+C` 停止。程序会打印实际绑定端口；想抓包时选择本机 loopback 网卡（macOS 常为 `lo0`，Linux 常为 `lo`），以输出的端口过滤。具体预测与解释见 [实验讲解](index.md)。
