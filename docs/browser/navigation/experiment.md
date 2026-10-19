# History 与 Location 实验走查

本实验复用生命周期服务，打开 `/history` 或 `/navigation`。先打开 `/loading` 观察新文档的 executionId，再比较导航时文档身份是否变化；页面日志、实际事件与 HTTP 请求是不同证据。

## 运行导航实验

导航需要观察文档加载与恢复，因此复用[生命周期实验服务](../lifecycle/demo/lib/handler.ts)，不另外复制服务器。在仓库根目录运行：

```bash
pnpm --filter lifecycle-next-lab dev
```

打开 <http://127.0.0.1:5006/history> 或 <http://127.0.0.1:5006/navigation>，按下文操作。需要 Node >= 22.18；端口占用时用 `pnpm --filter lifecycle-next-lab exec next dev -H 127.0.0.1 -p 5007` 指定新端口，按 `Ctrl+C` 停止。

服务仅对 `/history/view/a` 和 `/history/view/b` 提供 History fallback，未知子路径、脚本和 API 不回退为 HTML。保持 host 与端口一致，避免把 origin 变化混入导航实验。

## 1. History 与同文档路由

打开 `/history`，先与页面交互，记下 executionId、length 和事件计数。

1. 点击 pushState：URL 变为 `/history/view/a`，UI 更新，length 相对增加；执行 ID 不变，没有新文档 GET，也没有由调用直接触发的 popstate/hashchange。
2. 点击 replaceState：URL 变为 `/history/view/b`，length 不再增加。后退回 `/history`，前进到 B；A 已被 B 替换。
3. 点击 pushState 修改 hash：URL 有新 fragment，调用本身不触发 hashchange。
4. 点击 location.hash 新值：看真实 hashchange；再重复当前 hash，观察没有额外变化事件。popstate 是否出现还要检查实际 state 激活，不从按钮名字推断。
5. 点击两个拒绝按钮，观察真实 catch 中的 SecurityError 与 DataCloneError；URL 不因失败调用跳转。
6. 刷新 `/history/view/a` 或把地址粘贴到新标签：服务端返回同一 History 入口，视图从 pathname 恢复；刷新创建新 executionId。

页面初始化仅在 history.state 为 null 时使用 replaceState 填充 initial 状态，不计入按钮的 replace 计数。length 包含进入实验前的记录，不能用绝对值推断游标。push 后再创建新条目可能使原来的前进分支不可达，请按顺序分别测试。

## 2. Location 文档导航

每组先从 `/loading` 通过页面导航栏进入 `/navigation`。

| 操作             | 再在目标页点击 back 的预期              |
| ---------------- | --------------------------------------- |
| location.assign  | 回到 `/navigation` 操作页               |
| location.replace | 跳过被替换的操作页，回到此前 `/loading` |

目标路径为 `/navigation/target?via=assign` 或 `?via=replace`，用 URL 与新 executionId 核对。回操作页可能恢复 BFCache，所以“回到同一个 ID”不表示 assign 没有产生文档导航。

分别点击 reload 与 history.go(0)，比较加载流程和新 ID。这里的目标为不同路径，没有用 fragment-only 导航代替文档重建。边界见 [History 笔记](./history.md)。

## 历史验证记录

以下摘自迁移前 2026-10-08 的验证，环境为 macOS、Node 22.23.2、Chrome 153.0.8010.48，不代表本次重新验证了全部浏览器行为。

| 验证项 | 当次实际结果 |
| --- | --- |
| push / replace | URL 与 UI 同步改变，executionId 不变；当次 length 从 11 到 12，replace 后仍为 12，按钮操作没有文档请求 |
| History 遍历 | 后退回 `/history`、前进到 B，真实 popstate 更新计数，ID 保持 |
| hash 对照 | pushState 改 hash 不增加 hashchange；location.hash 新值产生真实事件；重复当前值后 150ms 内事件计数不变 |
| 拒绝路径 | 实际捕获跨源 URL 的 SecurityError、函数 state 的 DataCloneError |
| 子路径刷新 | 直接打开 `/history/view/a` 恢复 A 视图；刷新后新 executionId |
| Location | assign 目标页后退到 `/navigation`；replace 目标页后退跳过操作页到 `/loading`；reload 与 go(0) 均生成新 ID |

全部 HTML 入口支持 GET/HEAD；仅已知 History 子路径返回应用入口，未知子路径仍为 404。滚动恢复、其他浏览器及移动端不在上述验证范围内。
