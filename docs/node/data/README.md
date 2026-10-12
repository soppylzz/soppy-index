# 字节、编码与文件边界

[Node 导航](../README.md) · [验证记录](../validation.md)

先把字符与字节分开，再把路径字符串、文件 URL 和已打开的句柄分开。

- [Buffer](./buffer.md)：字节数、共享视图与增量解码。
- [文件与路径](./fsPathUrl.md)：路径解析、URL 转换与句柄清理。

[实验走查](./index.md) · [完整入口](./index.ts)

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/node/data/index.ts
```

终端显示实际事件；脚本完成后自然退出，也可用 `Ctrl+C` 停止。按走查中的问题先预测再核对，具体耗时和跨来源顺序以当次输出为准。
