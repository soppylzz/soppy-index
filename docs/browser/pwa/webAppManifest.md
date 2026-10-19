# Web App Manifest 与安装机制

## 1. Manifest 描述应用，不执行离线逻辑

Web App Manifest 是 JSON 元数据，浏览器通过页面的 link rel="manifest" 发现它，用来描述应用名称、身份、图标、启动地址和显示偏好。它不是 worker 脚本，也不会自动缓存页面、请求系统权限或启动后台同步。[Web Application Manifest 标准](https://www.w3.org/TR/appmanifest/)

以下为字段示意，不提供对应 HTML、图标、资源或安装 demo；路径和名称需由实际项目实现：

```json
{
  "id": "/notes/",
  "name": "离线笔记",
  "short_name": "笔记",
  "start_url": "/notes/?source=installed",
  "scope": "/notes/",
  "display": "standalone",
  "theme_color": "#185caa",
  "background_color": "#f4f6fa",
  "icons": [
    {
      "src": "/icons/app-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/app-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/app-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

这些图标尺寸只是常见资源组合，不能当作所有平台的永久安装门槛。声明 sizes / type / purpose 不会改变图像真实内容，仍需提供对应有效资源并验证裁剪效果。

## 2. 身份、启动与范围

| 字段 | 含义 | 注意 |
| --- | --- | --- |
| id | 稳定应用身份 | 避免随跟踪参数、部署版本变化；遵循同源和解析规则 |
| start_url | 从应用入口启动时的目标 | 不是应用唯一可访问 URL，也不保证离线有副本 |
| scope | 应用导航体验范围 | 越界导航的 UI / 打开方式由浏览器处理，不是网络权限边界 |
| name / short_name | 应用完整名称与紧凑名称 | 平台可按空间选择，不控制网页 title |
| display | browser / standalone 等显示偏好 | 不支持的模式可回退；不等同于 Fullscreen API 授权 |
| theme_color / background_color | 界面 / 启动画面颜色提示 | 采用方式与时机依平台不同 |
| icons | 图标资源及用途 | maskable 需按安全区域设计，不只是换一个 purpose 值 |

显式稳定 id 可让 start_url 调整跟踪参数时不改变应用身份。省略 id 时可能回退到 start_url 形成身份，改变启动 URL 可能影响后续安装识别；跨源 id 不会成为突破同源约束的手段。[id 官方说明](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/id)

start_url 与 scope 存在同源及包含关系约束，缺失或无效时有默认处理。相对 URL 的基准按字段处理规则确定；不要把所有字段都当作相对当前 HTML 路径。显式同源绝对路径配合结尾斜线，通常更易核对。[scope 官方说明](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/scope)

Manifest scope 与 Service Worker scope 是两套独立机制：前者定义应用呈现的导航范围，后者限制控制客户端的范围。设置前者不会创建后者，也不会赋予跨源 DOM、存储或网络权限。

## 3. 可安装、安装入口与用户选择

可安装性、是否展示提示、是否允许手动安装是不同问题。浏览器可以为一般网站提供菜单安装 / 添加入口；自动提示或推广入口又可能要求有效 Manifest、安全来源、交互等额外条件。具体平台未必提供相同流程。[MDN 安装指南](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)

不要把“必须有 Service Worker 才能安装”写成跨平台标准。Service Worker 常用于可靠性与离线能力，但安装条件由当前浏览器与平台决定；反过来，已注册 worker 的普通网页也不必安装才能使用离线策略。

beforeinstallprompt 是部分浏览器提供的安装入口能力，不是所有平台的通用事件。可以在支持时保存事件、由明确用户操作触发安装提示，并处理接受 / 拒绝；没有事件时不能据此判定永远不可安装，应提供符合该平台的操作说明。[安装提示指南](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt)

应用显示为 standalone，可用 display-mode 媒体条件等观察当前呈现方式，但这不是所有平台的完整“是否已安装”查询，也不代表用户一定从安装图标启动。业务状态和显示模式不要绑定成单一布尔值。

## 4. 安装、更新与离线分别验收

| 验收问题 | 需要的证据 | 不能替代它的信号 |
| --- | --- | --- |
| Manifest 是否有效 | 成功获取、字段处理、图标可用及浏览器诊断 | link 元素存在 |
| 是否可从系统入口启动 | 目标平台实际安装 / 添加与再次启动 | beforeinstallprompt 曾触发 |
| 页面是否受控 | 当前 controller、对应 worker 版本 | 安装图标出现 |
| 哪些功能可离线 | 数据已就绪后实际断网访问、业务失败反馈 | standalone 模式、Cache 中有几个条目 |
| 新版本是否生效 | 页面 / worker / 缓存 / 服务端版本一致性 | 改了 Manifest 或刷新一次 |

安装后的 Manifest 元数据、图标与系统集成更新有各自平台流程，不应承诺改 JSON 就立即更新系统图标。应用内容更新则通常仍走 Web 资源与 Service Worker 生命周期，详见 [更新机制](./serviceWorker.md)。

## 5. 渐进增强与适用范围

先保证普通浏览器中的核心访问、路由、可访问性与错误处理，再为支持环境增加安装和离线功能。不支持安装、用户拒绝安装或存储受限时，仍应保留合理的网页路径。

适合考虑 PWA 的场景包括内容阅读、轻量工具和可定义离线模型的业务应用。强实时或高敏感业务也可以采用部分能力，但要明确旧数据、认证过期、离线写冲突与本地副本管理，而非统一改成 cache first。

本页是机制与验收说明，未实测具体设备上的安装流程。浏览器版本、OS、隐私模式、系统策略和用户选择均需在实际发布环境分别验证；文档中的字段示意与能力表不作为兼容性保证。
