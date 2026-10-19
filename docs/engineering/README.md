# 前端工程：从源码到稳定交付

页面能运行之后，还要回答：代码怎样构建，需求怎样拆分，为什么变慢，线上出错如何恢复。本目录围绕这四个问题组织知识笔记，参考资料保留在 `__reference__/`，正式阅读从这里开始。

## 阅读顺序

| 阶段        | 阅读入口                                   | 要建立的理解                     |
| ----------- | ------------------------------------------ | -------------------------------- |
| 1. 工程化   | [构建与交付](tooling/pipeline.md)          | 源码怎样变成可部署、可复现的产物 |
| 2. 应用架构 | [边界与数据流](architecture/boundaries.md) | 状态归谁，请求和变化如何穿过模块 |
| 3. 性能     | [测量与优化](perf/measurement.md)          | 从用户感受定位具体瓶颈           |
| 4. 监控     | [发现与恢复](monitoring/model.md)          | 用版本、事件和链路证据还原故障   |

初学者先读构建链路、模块图、架构边界、状态、性能指标与监控概览，再补工具细节和复杂场景。面试复习从[场景推演](interview.md)开始，遇到解释不清的机制再回到正文。

贯穿示例是一个订单后台：用户搜索订单、编辑表单并提交。示例用于解释设计，未提供独立运行的 demo，也不代表测量结果。

## 构建与交付

1. [构建链路与兼容目标](tooling/pipeline.md)：转换、打包、类型检查与 polyfill。
2. [模块图与打包原理](tooling/modules.md)：解析、循环依赖、chunk 与缓存失效。
3. [AST、Babel 与插件](tooling/transforms.md)：作用域、转换顺序与安全改写。
4. [Vite、Webpack 与工具选择](tooling/tools.md)：开发服务器、HMR 和插件边界。
5. [裁剪、分块与 Source Map](tooling/output.md)：体积、缓存和定位信息。
6. [依赖、Monorepo 与库发布](tooling/packages.md)：安装图、任务图与消费契约。
7. [质量检查与测试](tooling/quality.md)：各类检查分别提供什么证据。
8. [CI/CD 与安全更新](tooling/delivery.md)：不可变产物、灰度与回滚。

## 应用架构：把一次变化限制在合理范围

1. [目标、分层与模块边界](architecture/boundaries.md)：从约束决定结构。
2. [状态、缓存与并发](architecture/state.md)：谁拥有数据，旧结果何时失效。
3. [请求、路由与权限](architecture/requests.md)：沿一次导航划分职责。
4. [组件、表单与设计系统](architecture/components.md)：公共 API 与编辑过程。
5. [配置、离线与可靠性](architecture/resilience.md)：失败时仍能解释当前状态。
6. [平台化、迁移与评审](architecture/evolution.md)：何时值得增加复杂度。

## 性能：从用户的等待找到成本

1. [测量、指标与定位方法](perf/measurement.md)：实验室、RUM、分位数与 DevTools。
2. [首屏、资源与传输](perf/loading.md)：关键路径、图片、字体、JS 与缓存。
3. [主线程、渲染与内存](perf/runtime.md)：卡顿、虚拟列表、Worker 和泄漏。
4. [渲染策略、第三方与性能预算](perf/strategy.md)：用架构和门禁维持收益。

## 前端监控：从发现异常到恢复用户

1. [监控模型与事件上下文](monitoring/model.md)：错误、日志、指标和 trace 的分工。
2. [异常、资源失败与白屏](monitoring/collection.md)：采集范围与判断边界。
3. [SDK、上报与数据最小化](monitoring/sdk.md)：可靠性、开销和脱敏。
4. [版本、告警与故障响应](monitoring/operations.md)：从聚合证据走到缓解和复盘。

## 与其他目录的边界

语言与运行时细节可继续读 [Node 模块与包](../node/modules/index.md)；渲染机制见[浏览器渲染](../browser/rendering/rendering.md)，资源更新见 [CDN](../network/delivery-optimization/cdn.md)，权限边界见[安全工程](../security/engineering/testing-response.md)。本目录关注这些机制如何参与工程决策，避免重复展开底层知识。
