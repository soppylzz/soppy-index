# Next.js 身份、安全与 OAuth 实验

同一个 Next.js App Router 应用展示本地 Session、逐资源授权及四类 OAuth 场景。应用实例运行在 3000，教学身份提供方运行在 3001；两个实例使用独立构建目录与进程内状态。

## 运行

需要 Node >= 22.18，使用仓库锁文件中的 Next.js 16.4.0、React 19.2.0。在仓库根目录安装依赖：

```bash
pnpm install --frozen-lockfile
```

两个终端分别运行：

```bash
pnpm --dir docs/security/demo dev
```

```bash
pnpm --dir docs/security/demo dev:provider
```

等待各自成功启动后，访问 <http://127.0.0.1:3000/>。每个终端按 `Ctrl+C` 停止对应进程。端口被占用会启动失败，应先处理占用；本实验固定回调地址与可信 issuer，不自动换端口。不要混用 localhost 与 127.0.0.1。

本地账号：`alice@example.test`、`bob@example.test`，共同演示密码为 `correct-horse-battery-staple`。这些是公开教学凭据，不能用于其他系统。只观察本地会话时不需要启动提供方。

[实验走查](index.md)按机制说明操作和预期，[验证记录](validation.md)区分已执行检查与未覆盖部分。具体任务使用该 demo 子包中的脚本执行。

## 检查

```bash
pnpm --dir docs/security/demo typecheck
pnpm --filter security-next-lab test
```

启动两个实例后可运行 HTTP 集成检查：

```bash
pnpm --filter security-next-lab test:http
```

单应用构建可用 `pnpm --filter security-next-lab build`。教学会话与提供方状态只适用于单实例开发运行；构建成功不代表内存状态可以跨进程、Serverless 实例或重启保持。

## 教学范围

本实验保留清晰的协议步骤，使用 Node crypto 与浏览器 Web Crypto 执行真实 RS256 签名验证。提供方只实现固定客户端、固定 scope、单 issuer 和单 audience 的受限协议子集，增加的 `kind` 声明仅用于本实验区分 token 用途，不能代替标准化 token profile。

它没有 Discovery、UserInfo、生产账号存储、密钥轮换、refresh token、全局登出、限速或完整 OIDC 合规验证。正式集成应使用维护良好的客户端库与身份提供方，按其协议元数据和验证规则配置。HTTP 仅用于本机实验；生产应使用 HTTPS，并正确配置 Secure Cookie、密钥、可信代理与共享状态。

## UI 与测试

React 页面使用 HeroUI 3.2.6 控件；隐藏协议字段与被测资源保留原生语义。测试放在本实验的 `./__test__/`。构建完成后可执行 `pnpm --filter security-next-lab test:ui` 检查生产 HTML 与样式，组件交互仍需真实浏览器复核。

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
