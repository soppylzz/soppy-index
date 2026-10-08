# Web Storage 实验走查

[主题目录](./README.md) · [知识笔记](./webStorage.md) · [实现](./index.ts)

[同目录的 `index.ts`](index.ts) 用零依赖的 `node:http` 提供一个实验页面，逻辑全部在浏览器端执行，按页面上的步骤操作即可：

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
node docs/browser/storage/webStorage/index.ts
```

在浏览器打开 <http://localhost:4000>。刷新和停止服务不会自动清除已存数据；需要重置时使用页面操作或 DevTools 清理当前 origin。

服务成功监听后，CLI 打印当前地址、实验步骤、观察位置及停止方式；终端记录 HTTP 请求与状态，页面和浏览器 Console 按发生顺序记录带时间戳的结果。服务只监听本机，HTML 使用 `no-store`。端口被占用时可切换：

```bash
PORT=5005 node docs/browser/storage/webStorage/index.ts
```

切换端口会改变 origin，因此浏览器存储也会随之隔离。

下表为实验预期；实际结果需结合浏览器策略观察。

| 实验 | 操作                      | 现象                                              | 对应差异                                    |
| ---- | ------------------------- | ------------------------------------------------- | ------------------------------------------- |
| 1    | 向两种存储各写一条        | 两张表格同步更新                                  | API 完全相同                                |
| 2    | 点击「重新加载本页」      | 两者都保留                                        | sessionStorage 的生命周期是页面会话而非页面 |
| 3    | 点击「打开第二个标签页」  | 新标签 localStorage 可见，sessionStorage 为空     | 隔离范围：origin vs origin + 页面会话       |
| 4    | 在标签 A 写入，切到标签 B | 仅 localStorage 触发 `storage` 事件，A 自己收不到 | 跨标签同步 + 事件只发给其他文档             |
| 5    | 关闭浏览器重新访问        | sessionStorage 清空，localStorage 仍在            | 生命周期                                    |

页面另有一个「写入 6MB」按钮，用于触发 `QuotaExceededError`，感受约 5MB 的配额量级。

> 实验需要两个真实标签页，请在 Chrome/Firefox 中打开。页面按钮使用 `noopener`，避免新页复制 opener 的 sessionStorage。手动保留 opener 打开页面时仍需考虑第 1 节的复制语义；会话恢复行为也受浏览器策略影响。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。
