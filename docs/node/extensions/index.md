# WASM 与原生扩展：实验走查

[知识导航与运行命令](./README.md) · [完整实现](./index.ts)

什么时候值得离开纯 JavaScript？

读完笔记后，先预测再运行入口。日志中的关键事件是 `actual-wasm-execution`。

实例化已知 WASM 模块并计算 42；nativeAddonBuilt 为 false。

没有编译 native addon，也没有验证跨平台发布；加法微例不证明性能优势。

按本组入口复核当前行为；预期与示例输出不代替实际运行记录。
