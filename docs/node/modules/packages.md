# 包解析、条件与封装

bare specifier通常沿importer位置向上解析node_modules；不是按终端cwd搜索所有依赖。包管理器链接布局、symlink选项和exports条件也影响身份。node:前缀明确内置模块。

| 字段    | 职责                                       |
| ------- | ------------------------------------------ |
| type    | 包内.js模块格式                            |
| main    | 传统默认入口                               |
| exports | 公开入口、子路径和条件，存在时优先相应规则 |
| imports | 本包内部#映射                              |

exports未公开子路径时会拒绝包specifer访问，这不是文件系统安全沙箱：知道绝对路径仍可能直接读取。条件键按对象顺序匹配，具体条件由消费者给出；browser并非所有Node消费者自动启用的标准条件。

包自引用按自己的name和exports解析。import/require指向两套状态实现可能产生dual package hazard；避免让一个应用同时得到两套单例。排查记录specifier、importer、条件、真实URL与加载格式。

## 解析一个包名时依次问

先确定导入者所在位置，再找到包；随后看包的 `exports` 是否公开所请求的入口，最后按消费方式选择条件。比如同一个包名在 `import` 与 `require` 下可能指向两个文件；若两边各维护状态，应用同时使用时就可能得到两份状态。`exports` 负责包入口约定，不是文件系统权限控制。

## 对应源码与实验

以下片段来自 [index.ts](./index.ts) 或同目录辅助文件；完整断言和清理路径见源码。

```ts
import { value } from "node-lesson-package"
import { value as internalValue } from "#value"
const require = createRequire(import.meta.url)
const required = require("node-lesson-package")
```

以上实际位于 fixtures/package/probe.mjs，附近 package.json 定义条件与#映射，无需安装自己为依赖。未公开private.mjs路径被ERR_PACKAGE_PATH_NOT_EXPORTED拒绝，直接相对路径不是本实验的封装检查。

## 依据与版本

以 [Node 22.18 官方 packages 文档](https://nodejs.org/download/release/v22.18.0/docs/api/packages.html) 核对 API 合约；实际输出与运行环境需在执行时核对。
