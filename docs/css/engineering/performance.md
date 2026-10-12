# CSS 性能：证据与优化闭环

[本组导航](./README.md)

样式变化可能触发 style、layout、paint、composite 的部分阶段；浏览器增量复用和分层由实现决定。不要把 reflow 等同于“整页重绘”，也不要把 transform 等同于保证 GPU 加速。流程关联 [浏览器渲染](../../browser/core/rendering.md)。

修改布局相关样式后立即读 offsetWidth/rect，浏览器为给正确答案可能同步更新 style/layout。循环读写交错会反复打断批处理；先读一批，再写一批通常更容易减少这些依赖。若后一项确实依赖前一项写入，不能随意重排改变业务语义。

优先控制 DOM 规模、无界测量、高频大范围失效、动画绘制区域与字体/图片布局位移。只在 trace 显示 style matching 是瓶颈时优化选择器，而不是凭 selector 长短下结论。

一次 JS 耗时包含测量开销、JIT 与调度噪声；不同操作后的布局脏状态也可能不同。应在同条件下重复录制，观察 Recalculate Style、Layout、调用栈与帧预算，避免用一次耗时写通用倍数结论。

## 判断方法

排查时先提出可验证的假设：若脚本反复“改宽度 → 读几何 → 再改宽度”，每次读取都可能要求浏览器同步结算待处理的样式与布局。把可独立的读取放在一起、写入放在一起，再用同样输入录制 Performance trace，比较实际 Style、Layout 与调用栈。业务若依赖前一次写入结果，就不能为了批处理擅自改变顺序。

测量步骤参阅 [Chrome DevTools Performance 官方文档](https://developer.chrome.com/docs/devtools/performance)。
