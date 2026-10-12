# 兼容策略与能力检测

[本组导航](./README.md)

先提供可用基础内容，再通过 `@supports` / `CSS.supports()` 增强。它们检查实现是否接受相关语法，不能证明实现没有缺陷或用户设备适合效果。复杂行为需最小实际用例，不以 UA 名称推导所有子能力。

Transpile 改语法，polyfill 补运行时 API，ponyfill 提供显式调用而不改全局。CSS parser 不接受的规则不能靠 JS API polyfill 自动获得相同渲染。Browserslist 定义目标，Autoprefixer 根据兼容数据处理必要前缀，PostCSS 是插件转换平台；这些不是浏览器原生运行步骤。

前缀、值语法与支持范围随版本演进，手写所有前缀会过时。UA 检测限已知缺陷规避等明确用途，准备新版本与伪装的默认路径。锁定目标矩阵并用真实浏览器/设备检查关键交互。

## 样式示例与推导

```css
#enhanced {
  display: block;
}
@supports (display: grid) {
  #enhanced {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

基础布局先用 `display: block` 保证内容可用；支持 Grid 语法的浏览器再应用双列布局。`@supports` 成立只说明解析器接受该条件，不能单独证明效果、性能或全部子功能。

依据 [CSS Conditional Rules 3](https://www.w3.org/TR/css-conditional-3/)。
