# 类型挑战导航：先解释类型关系，再看编译器反馈

类型题的“运行结果”主要体现为类型是否可赋值、推断结果是否符合断言，以及预期错误是否出现。它与 JavaScript 工具函数不同，通常不需要通过执行生成的代码来验证。

[easy/](./easy/) 和 [medium/](./medium/) 保存练习文件，[MARKED.md](./MARKED.md) 是人工维护的待复习记录。清单中的条目不等于当前编译失败，也不应因为一次编译通过就自动删除；还需要能解释推导过程。

## 按类型机制复习

| 机制 | 先关注的问题 | 可定位的练习 |
| --- | --- | --- |
| 索引访问与键集合 | 在操作对象的键，还是键对应的值？ | [Pick](./easy/00004-easy-pick.ts)、[Tuple to Object](./easy/00011-easy-tuple-to-object.ts) |
| 映射类型 | 遍历哪些键，要如何改变修饰符？ | [Readonly](./easy/00007-easy-readonly.ts)、[PartialByKeys](./medium/02757-medium-partialbykeys.ts) |
| 条件类型 | 这里判断的是可赋值关系，还是值是否相等？ | [Exclude](./easy/00043-easy-exclude.ts)、[If](./easy/00268-easy-if.ts) |
| infer 与元组 | 需要从函数、元组或其他结构中提取哪一部分？ | [Parameters](./easy/03312-easy-parameters.ts)、[Pop](./medium/00016-medium-pop.ts) |
| 联合类型 | 条件是逐成员处理，还是把整个联合一起处理？ | [IsUnion](./medium/01097-medium-isunion.ts)、[IsNever](./medium/01042-medium-isnever.ts) |
| 模板字面量类型 | 字符串怎样拆成前缀、后缀和剩余部分？ | [Trim](./medium/00108-medium-trim.ts)、[KebabCase](./medium/00612-medium-kebabcase.ts) |
| 递归类型 | 每一步如何缩小问题，何时停止？ | [Flatten](./medium/00459-medium-flatten.ts)、[FlattenDepth](./medium/03243-medium-flattendepth.ts) |
| 函数关系与推断 | 参数位置和返回值位置的约束有何差异？ | [contravariance.ts](./contravariance.ts)、[GetReturnType](./medium/00002-medium-get-return-type.ts) |
| 多种机制组合 | 保留的是数组元素联合，还是每个元组位置？ | [PromiseAll](./medium/00020-medium-promise-all.hard.ts) |

## 先辨认输入的形状

数组与元组都能表示一组元素，但元组保留具体位置与长度信息。只看元素联合会丢失位置；只按非空元组递归又可能遗漏普通数组、readonly 或空元组。先列出题目实际要求哪些输入形状，再解释自己的约束覆盖了什么。

对象题同样要分清键集合、属性值、可选性和 readonly。映射类型改变的是一组属性的类型结构，不是运行时遍历对象；键重映射也不会替你在 JavaScript 中生成新对象。[TypeScript 映射类型](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)

## 条件类型最容易误读的部分

extends 在条件类型中测试可赋值关系，不是 JavaScript 的运行时继承判断。条件左侧为裸类型参数时，联合输入可能触发分布式处理；套入其他结构后，则可能变成整体判断。要先确定当前题目需要哪一种语义，再决定写法。[TypeScript 条件类型与分布性](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)

never、unknown、any 的行为不能按普通具体类型直觉推导，尤其涉及分布、条件分支和相等性断言时。一个最小反例往往比加入更多嵌套更容易定位误解。不要只把编辑器展开显示不同，直接等同于类型关系一定不同。

infer 是在结构匹配位置引入待推断类型，不是一次运行时取值。递归类型也没有运行时循环；它受编译器实例化深度和复杂度限制，不能把类型计算的体验与普通函数的时间复杂度直接等同。

## 如何使用断言和错误用例

先读题目现有的 cases，预测每一项的期望，再检查实现。Equal/Expect 等工具是编译期断言，不会因为运行文件而打印测试结果。带有 declare 的声明也可能完全没有运行时实现，直接执行文件反而可能报引用错误。

有些题目还包含预期错误用例。它们是否真正生效，需要结合 TypeScript 的检查结果判断；不要为了让检查通过而删除断言、放宽约束或移动错误标记。完成一题后，应能说明哪些例子区分了正确与错误的方案，而不仅是记住最终别名。

## 检查入口

本目录复用根 tsconfig，不维护重复的类型配置和 typecheck 脚本。在仓库根目录运行 `pnpm typecheck`。这个命令同时检查其他工作区，报错时按文件路径定位本题。

若只为检查某个文件直接把文件名交给 tsc，TypeScript 不会按同样方式加载 tsconfig；缺省选项不同可能造成误判。因此日常验证沿用项目配置，编辑器则用于查看局部推断结果。[TypeScript 项目配置规则](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
