# Cookie

[返回存储目录](../README.md) · [仓库首页](../../../../README.md) · [公共样式与工具](../../../demo/README.md)

- [知识笔记](./cookie.md)：机制、边界和对应 demo 的核心代码。
- [实验走查](./index.md)：启动、操作步骤、预期与验证边界。
- [实验服务](./index.ts)：零依赖本地 HTTP 服务。

## 运行

在仓库根目录使用 Node >= 22.18 运行：

```bash
node docs/browser/storage/cookie/index.ts
```

等待 CLI 输出成功监听指引，打开 <http://localhost:3000/> 与 <http://127.0.0.1:3001/>，按 `Ctrl+C` 停止。端口覆盖、主机选择、清理方式及浏览器条件见[实验走查](./index.md)。
