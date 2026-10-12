# tsconfig、模块解析与声明文件

## 1. 编译器做三件不同的事

`tsc` 检查类型、按配置转换语法并输出文件；也可 `noEmit` 只检查。它不会替你运行代码，也不保证打包后的模块在目标环境能解析。`target` 决定部分语法降级；`lib` 决定可见的标准 API 类型；`module` 与 `moduleResolution` 决定导入/导出的生成与查找方式。`lib: ["DOM"]` 让编译器认识浏览器 API，不会让 Node 运行时拥有 DOM。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true
  }
}
```

这是独立示意，不能直接覆盖本仓库配置。`NodeNext` 按 Node 的 ESM/CJS 规则检查，源文件里的相对导入扩展名也要与产物/运行方式兼容；bundler 模式可能允许的写法不一定能由 Node 直接运行。先决定执行环境，再选解析策略。

## 2. 值导入和类型导入

`import type` 只用于类型，会从输出中移除。普通导入是否有运行时效果取决于使用方式、编译选项与打包工具。循环依赖在运行时依旧存在；把某个 import 改成类型导入可去掉一条运行时边，但不能修复实际值的循环依赖。`paths` 提供给编译器/工具的解析映射，Node 不会因此自动认识别名。

## 3. 声明文件 `.d.ts`

声明文件描述已存在的运行时 API，不实现它。为无类型 JS 包补声明时，先写实际导出、参数和返回值，再逐步收紧 `any`；发布包需要让声明路径、模块格式和实际入口一致。全局声明会影响整个程序，优先模块化、限定作用域。第三方声明写错时，类型检查通过也不能改变运行时行为。

## 4. 渐进迁移

从 `allowJs`/`checkJs` 或边界文件开始，打开 `strict` 并逐步收紧。优先修外部数据、公共 API 和 `any` 扩散点，避免先投入极复杂的工具类型。`skipLibCheck` 只是跳过声明文件的部分检查，不能保证依赖声明正确。`@ts-expect-error` 应说明为何暂时需要，并随着错误消失而触发失败；长期的宽泛 `@ts-ignore` 容易遮蔽新问题。

资料：[TSConfig Reference](https://www.typescriptlang.org/tsconfig/)、[Module Resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html)、[Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)。
