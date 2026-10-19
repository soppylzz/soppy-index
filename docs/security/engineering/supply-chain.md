# 前端秘密、供应链与对象污染

后端配置一旦打包进前端，就不再处于服务端的保密边界内；第三方依赖一旦进入构建或页面，也获得相应执行权限。审查时要看数据和代码最终在哪里运行。

## 构建变量进入浏览器后就是公开数据

任何打包进 JS、HTML、source map 或公开网络请求的密钥都会被用户看到。公开的 API key 只能标识应用或配合域名/配额限制，不能当作真正的服务端秘密。客户端若需要调用高权限 API，让服务端代为调用并校验用户权限。不要把“环境变量”四个字当成保密机制：构建时注入前端包的变量仍是公开数据。

## 依赖与对象合并如何扩大输入的影响

依赖、构建脚本、CDN 脚本和 lockfile 都属于代码供应链；固定版本、审查更新、最小权限、来源验证与自动化告警可降低风险。lockfile 固定解析结果，不能证明某个已锁定版本没有恶意代码；安装脚本也可能在构建权限下执行。第三方脚本在页面同源环境下通常能接触 DOM 与非 HttpOnly 数据，不能只靠 HTTPS 信任它。可用 SRI 校验固定的跨源静态资源，但动态脚本更新需要另设流程。

将不可信对象深度合并时，`__proto__`、`constructor`、`prototype` 等键可能污染对象原型，影响授权判断或配置。优先用经过维护的合并库、限定 schema、拒绝危险键；不要只靠 `Object.freeze` 某个业务对象。

## 依赖风险不只来自已知漏洞

typosquatting 利用近似包名，dependency confusion 利用私有与公共源解析配置，维护者账号接管则可能把恶意代码带入原本可信的包。审查需要包括来源、安装脚本、发布内容和传递依赖，CI 使用锁文件、最小权限凭据并限制秘密暴露。

SBOM 帮助列出软件成分，SCA 帮助发现依赖风险，provenance 描述构建来源；它们提供证据，不保证代码没有恶意行为。Tag Manager 与分析 SDK 一旦在页面执行，也接近一方脚本权限，应明确责任人和紧急停用方式。SRI 能校验固定资源字节，不能限制被批准脚本的行为。

## 对象字典不要默认继承可用配置

原型污染可来自深合并、query parser 或动态属性路径写入。对允许字段做 schema 限制，拒绝危险路径；字典可使用 Map 或 Object.create(null)，读取安全关键字段时区分自身属性与继承属性。它们降低部分风险，但仍需修复污染入口，不能只冻结某个普通对象。

污染测试应在隔离进程或 realm 中执行，避免残留原型属性影响其他测试。只有找到下游权限判断、模板或 DOM 等可利用位置，才能解释污染如何产生实际危害。

## 浏览器密码学的边界是密钥与执行环境

压缩、混淆和 Base64 只改变表示，不提供密码学保密。Web Crypto 适合标准签名验证、加密与密钥派生，但密钥从哪里来、谁能调用它，比 API 名称更重要。安全随机值应使用 crypto.getRandomValues 等密码学随机源，不能用 Math.random 生成会话凭据。

端到端或口令派生加密可针对服务端存储泄漏等威胁保护内容，但页面若已被恶意脚本控制，解密后的明文或密钥操作仍可能被借用。TLS 保护传输，应用层加密针对其他边界，二者都不能替代身份与资源授权。

参考：[OWASP Third Party JavaScript](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html)、[Prototype Pollution](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)。
