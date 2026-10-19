# 编译阶段路线：每一步增加什么能力

当前采用 pnpm monorepo，语言主体仍是一个 `packages/compiler` 包，`src/` 按阶段分层，`docs/` 放中文讲解。测试按职责放在 compiler 与 playground 各自的 `__test__/`，共享 runner/helper 保留在 `internals/test`；examples、fixtures 与 Vite 实验迁到 `internals/play-compiler`；实验脚本与产物写入位于 `internals/play-compiler/src`。开发工具链与手写编译器分离，核心不调用第三方 parser、checker、transformer 或 generator。

| 阶段 | 依赖 | 实现与验收 |
| --- | --- | --- |
| P0 | 无 | 公共位置、诊断、AST、选项与结果；pnpm 安装、共享 base 与各包 TS 配置 |
| P1 | P0 | 手写 scanner / parser；Token、AST 可观察，非法输入有范围 |
| P2 | P1 | 独立 binder / checker；作用域、闭包、重复和前向引用诊断、基本类型 |
| P3 | P2 | 类型擦除、箭头降级、const 降级、模块转换独立 pass；直接 API 实验、TS / JS 实际输出 |
| P4 | P3 | printer 采集生成位置和来源；标准 map、查询标识符 / 表达式 / 调用 |
| P5 | P4 | 无环模块图、导入导出签名、ESM / CJS 可执行；保守副作用分析与固定点裁剪 |
| P6 | P5 | 从符号与类型输出导出声明、声明映射及查询 |
| P7 | P6 | 固定 Vite 7.3.1，pre transform 调用手写链路；dev / build 与 map 传递验证、固定真实源码索引 |

语言子集只支持 const、原始值、显式参数类型、表达式箭头、调用、括号、加法及 console.log；模块阶段只增加静态具名导入、副作用导入和 export const。TS 模式检查类型；JS 模式禁止类型标注并检查绑定，参数类型不做推断。无前向引用、递归、循环依赖、自动分号插入或 polyfill。选项分开控制语法目标和模块格式。

这张表用于解释阶段依赖，不是待执行的工作清单。学习时按 Token/AST → 符号与类型 → 独立转换 → 映射 → 模块与声明的顺序扩展，每次都对照相应语义测试。已有能力与排除项以[语言说明](language.md)为准。
