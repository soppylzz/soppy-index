# Web Storage 实验走查

[实验页面](demo/lib/page.ts) 由 Next.js 提供一个实验页面，逻辑全部在浏览器端执行，按页面上的步骤操作即可：

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
pnpm install --frozen-lockfile
pnpm --filter web-storage-next-lab dev
```

在浏览器打开 <http://127.0.0.1:4000>。刷新和停止服务不会自动清除已存数据；需要重置时使用页面操作或 DevTools 清理当前 origin。

Next CLI 输出服务地址；操作步骤见本文，结果在页面与浏览器 Console 观察。生产服务不保证逐条打印访问日志。服务只监听本机，HTML 使用 `no-store`。端口被占用时可切换：

```bash
pnpm --filter web-storage-next-lab exec next dev -H 127.0.0.1 -p 5005
```

切换端口会改变 origin，因此浏览器存储也会随之隔离。

下表为实验预期；实际结果需结合浏览器策略观察。

| 实验 | 操作 | 现象 | 对应差异 |
| --- | --- | --- | --- |
| 1 | 向两种存储各写一条 | 写入成功后，两张表格由操作函数主动更新 | 读写方法相同，本页更新不是收到 storage 事件 |
| 2 | 点击「重新加载本页」 | 两者都保留 | sessionStorage 的生命周期是页面会话而非页面 |
| 3 | 点击「打开第二个标签页」 | 新标签可见共享 localStorage，不继承旧页 sessionStorage 的业务项；新页会生成自身 tabId | 隔离范围：origin vs origin + 页面会话 |
| 4 | 在标签 A 写入，切到标签 B | 仅 localStorage 触发 `storage` 事件，A 自己收不到 | 跨标签同步 + 事件只发给其他文档 |
| 5 | 结束页面会话后重新访问 | 未恢复旧会话时 sessionStorage 通常为空；未被清理时 localStorage 通常仍在 | 会话恢复、隐私模式及清理策略影响结果 |

页面另有一个「尝试较大写入」按钮，尝试写入 6291456 个 ASCII 字符，观察成功或捕获到的异常。它不是精确容量测量：字符与字节计量、现有数据及浏览器限制都影响结果，不能保证点击后一定抛 QuotaExceededError。源码 testQuota 使用随机临时 key，写入成功后立即删除；以实际日志为准，不把按钮名称或标称大小当作错误已经发生及当前可用配额的证据。

> 实验需要两个真实标签页，请在 Chrome/Firefox 中打开。页面按钮使用 `noopener`，避免新页复制 opener 的 sessionStorage。手动保留 opener 打开页面时仍需考虑[知识笔记中的页面会话复制语义](./webStorage.md)；会话恢复行为也受浏览器策略影响。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。

## 实现怎样控制实验条件

完整实现见 [实验页面](demo/lib/page.ts)。以下片段按源码流程精简，并将展示文字改为英文，用于解释实验输入和观察边界。

下面对应 [实验页面](demo/lib/page.ts) 的存储读写与开新页操作，省略表格更新和错误日志；`key`、`value` 由输入框取得，完整 demo 在 try/catch 中处理不可写情况：

```js
localStorage.setItem(key, value)
sessionStorage.setItem(key, value)
window.open(location.href, "_blank", "noopener")

window.addEventListener("storage", (event) => {
  const area = event.storageArea === localStorage ? "localStorage" : "sessionStorage"
  log(`${area} event from another document: ${event.key} ${event.oldValue} -> ${event.newValue}`)
  render()
})
```

`log` 和 `render` 是源码中的有界日志与表格辅助函数；新页通过 sessionStorage 生成自己的 tabId。监听会记录真正的 storage 事件，写入页的表格则由操作函数主动更新，两者不能混为一谈。request id / ack 的设计边界见[通信机制](../../communication/cross-context-communication.md)。

## 构建后运行

```bash
pnpm --filter web-storage-next-lab build
pnpm --filter web-storage-next-lab start
```

停止服务或重新构建不会清理浏览器数据。比较实验结果时保持相同的 host 与端口；修改端口会改变 origin。
