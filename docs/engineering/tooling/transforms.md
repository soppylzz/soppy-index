# AST 与 Babel：怎样改代码而不误改变量

把源码里的 `oldApi` 全替换成 `newApi`，可能连字符串、对象键和局部同名变量一起改掉。安全转换需要理解语法结构和词法绑定。

## 从字符到语法树

Tokenizer 将字符变成 token，parser 按语法组织节点。CST 更接近完整语法形式，AST 省略部分标点和排版，突出程序结构。`Program` 下可以有声明和语句，表达式负责产生值；具体节点分类依 AST 规范而异。

Babel 的 parser 解析、traverse 遍历、types 构造节点、generator 生成代码。Node 是语法数据，NodePath 提供树中位置和修改方法，Scope/Binding 用于区分声明及其引用。

```js
const value = 1
function read(value) {
  return value
}
```

外层 `value` 和参数 `value` 是不同绑定。重命名外层变量时，函数参数及其返回引用不应变化。只匹配 Identifier 文本仍不够，插件必须检查绑定来自哪个声明或导入。

## Visitor 与转换顺序

Visitor 的 enter 在子节点前执行，exit 在子节点后执行。替换时要满足父节点的语法约束；新节点若再次命中同一规则，还可能无限转换。Codemod 应设计成重复运行不继续变化，并把无法确定语义的位置留给人工判断。

Syntax plugin 只让解析器认识语法，transform plugin 才改写 AST；preset 是插件与配置组合。Babel 官方描述 plugins 按声明顺序、presets 逆序展开，但 visitor 可能合并在遍历中，不能据此认定每个插件都独立跑完一轮完整 AST。见 [Babel 插件顺序](https://babeljs.io/docs/plugins/)。

`preset-env` 根据 targets 选择转换；core-js 可参与 API polyfill，runtime helper 则用于复用辅助代码。二者不是同一个问题，具体 polyfill 配置还应核对所用 Babel 主版本。

## Polyfill 策略与转换假设

Babel 7 的 `useBuiltIns: 'entry'` 按 targets 拆分指定 polyfill 入口，`'usage'` 根据分析到的用法注入；后者不保证覆盖所有动态调用或未被分析的第三方代码。Babel 8 已移除 preset-env 的 `useBuiltIns/corejs` 配置入口，改用专门的 polyfill 插件，见 [preset-env 版本说明](https://babeljs.io/docs/babel-preset-env)。

`@babel/plugin-transform-runtime` 主要复用 helper，不能把 helper 去重与全局 API 补齐视为同一能力。其 polyfill 相关选项同样要核对主版本，库还应明确是否允许修改消费方全局环境。

Assumptions 表示允许编译器基于额外前提简化输出，可能改变边缘行为；历史 `loose` 模式也有类似取舍。应先确认输入满足假设，再比较体积和速度，不能只因输出更小就启用。见 [Babel assumptions](https://babeljs.io/docs/assumptions)。

## 配置与插件的单文件生命周期

项目级 `babel.config.*` 与文件相对 `.babelrc.*` 的查找范围不同；Monorepo 要明确 root、overrides 与忽略边界。缓存应覆盖源码、实际配置、targets、插件版本和影响结果的环境，不能只按文件内容复用。

插件的 pre 适合初始化单文件状态，visitor 改写节点，post 汇总结果，options 通常从 `state.opts` 读取。删除声明前检查仍存引用和初始化副作用，不能因为变量未读就连带删除有副作用的调用。Lint rule 主要报告问题，codemod 修改源码，compiler transform 生成目标代码，三者可共享 AST 分析但目的不同。

## 转换结果怎样验证

先查看最小输入的 AST，再核对输出。测试重点是遮蔽、嵌套、副作用、重复执行，以及输出能否再次解析，不能只看快照排版是否一致。

AST 不保留全部空白，重新生成通常无法还原原始排版。ESTree、Babel 和 TypeScript AST 字段也不完全相同，插件不能随意混用。位置变化还必须传递 Source Map，见[产物定位](output.md)。

Monorepo 中转换异常时，先查看目标文件实际加载了哪份配置，再检查 package 边界、忽略规则和插件顺序。
