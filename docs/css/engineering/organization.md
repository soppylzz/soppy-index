# 样式组织：归属、覆盖关系与主题状态

组件加一个状态就要追加更长选择器，通常说明覆盖关系不清楚。组织 CSS 要让读者知道规则属于谁、允许谁覆盖，以及变化会影响什么范围。

## 先区分命名、作用域与优先级

| 手段           | 主要解决什么                 | 不自动解决什么               |
| -------------- | ---------------------------- | ---------------------------- |
| BEM 等命名约定 | 组件与状态归属               | 浏览器级样式隔离             |
| CSS Modules    | 构建时类名映射，减少名称碰撞 | 所有继承、全局规则与层叠问题 |
| 原生 @scope    | 选择器应用范围               | Shadow DOM 式封装            |
| @layer         | 不同来源规则的覆盖层次       | 命名冲突、继承边界           |
| 自定义属性     | 运行时主题与组件参数         | 选择器匹配范围               |

Reset 倾向重设默认样式，Normalize 类方案倾向保留有用默认并协调差异。选择后仍应保留焦点、列表和表单等必要语义表现，不能为了统一一律清空。

## 用层表达系统允许的覆盖顺序

```css
@layer reset, base, components, utilities;
@layer components {
  .button {
    color: var(--button-text, white);
    background: var(--button-surface, #2455a4);
  }
}
@layer utilities {
  .muted {
    opacity: 0.7;
  }
}
```

层先于 specificity 比较，低权重 utility 也可覆盖前层普通声明。未分层普通声明又高于所有分层普通声明，important 的层顺序相反；所以引入第三方 CSS 时也要安排层，而不是只给自己分层。完整规则见[层叠](../properties/cascade.md)。

## 主题使用语义参数，而非散落颜色

```css
:root {
  --surface: white;
  --text: #17212b;
}
:root[data-theme="dark"] {
  --surface: #17212b;
  --text: #f4f7fa;
}
.panel {
  background: var(--surface);
  color: var(--text);
}
```

Surface/text 表达用途，组件可以消费主题而不关心当前配色。全局令牌定义系统默认，组件变量表达局部接口；不要把每个像素都变成无法追溯的变量链。

系统配色偏好可以提供默认值，用户选择则应有稳定优先级，避免启动时反复闪烁。变量参与层叠与继承的细节沿用[自定义属性](../properties/custom-properties.md)。

## 构建工具与原生机制各有位置

Sass/Less 在构建阶段展开变量、mixin 等；原生变量在浏览器中参与继承和求值，两者不能按“都叫变量”视为等价。PostCSS 是转换平台，实际能力由插件决定。

CSS-in-JS 也有运行时生成、编译提取等不同方案；SSR、样式顺序、缓存和资源成本要按实现判断。选择工具前先确定组件边界与覆盖约定，工具不能修复所有随意加 important 的规则。
