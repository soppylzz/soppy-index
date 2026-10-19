# PWA、Service Worker 与离线存储

PWA（Progressive Web App）是一组渐进增强的 Web 应用能力与体验：可访问的网页基础之上，按平台能力增加安装入口、离线回退和系统集成。它没有一套适用于所有浏览器的固定技术勾选表。

本模块只提供知识文档，不新增实验服务。按以下顺序阅读：

- [Service Worker](./serviceWorker.md)：注册与控制、生命周期、请求代理、更新、多标签一致性和故障恢复。
- [Cache Storage](./cacheStorage.md)：Request / Response 模型、匹配、写入限制、流复制、缓存策略与清理。
- [Web App Manifest](./webAppManifest.md)：应用身份、启动地址、显示范围、安装入口与平台差异。

## 三种能力分别解决什么

| 能力             | 主要职责                         | 不能据此推断                           |
| ---------------- | -------------------------------- | -------------------------------------- |
| Service Worker   | 事件驱动的请求代理与后台能力入口 | 页面已经受控、worker 永久运行          |
| Cache Storage    | 脚本管理请求 / 响应副本          | 自动过期、永不回收、所有请求均离线可用 |
| Web App Manifest | 描述应用身份、启动与呈现         | 已安装、离线可用、获得所有系统权限     |

离线可用性需要资源与数据策略，可安装性由浏览器和操作系统的入口、政策与用户选择共同决定；安装状态、Service Worker 控制状态和离线数据就绪状态应分别判断。

## 与已有模块的关系

- [HTTP Cache](../cache/http-cache.md) 讲协议层 freshness、验证与请求 cache mode；本模块解释其与脚本缓存的组合。
- [存储管理](../storage/storageManagement/storageManagement.md) 讲配额、持久化与回收，Cache Storage 同样需要处理写入失败和数据丢失。
- [IndexedDB](../storage/indexedDB/indexedDB.md) 适合结构化离线数据与待同步记录；Cache Storage 不替代事务数据库。
- [页面生命周期](../lifecycle/page-lifecycle.md) 讲页面自身的隐藏、离开与恢复；Service Worker 有独立且可被终止的执行上下文。

文档依据标准和官方资料整理，核实日期为 2026-10-08；兼容性、安装界面与后台调度仍需按目标平台复核。本次没有执行 PWA 安装、离线或更新的真实浏览器实验，不将文中的场景推演写成实测。
