# 字体：匹配、回退与加载后的布局变化

两个按钮都写 16px，为什么仍可能宽度不同？字号只定义尺度，字形推进宽度、字体度量和回退结果仍会影响布局。

## Font-family 是候选顺序，不是最终字体证明

```css
body {
  font-family: "Note Sans", system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.5;
}
```

浏览器结合 family、weight、style、stretch 等匹配可用字体；某个字形缺失时继续回退，同一行可能混用多种字体。最后的通用族提供兜底，不保证不同系统外观完全一致。

没有对应粗体或斜体时，浏览器可能合成。`font-synthesis` 可以限制合成，但限制后也可能没有预期的粗斜效果。font 简写还会重置相关长属性，不能只把它当成缩短 font-size 写法。

## 用 @font-face 描述资源与可用字形

```css
@font-face {
  font-family: "Note Sans";
  src: url("/fonts/note-sans.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

这条规则声明资源，不代表页面立即使用或下载全部字体；实际匹配、字形需求、缓存等共同决定。可变字体应按资源能力声明 weight 等范围，不能把普通单字重文件随意标成 100 900。

`unicode-range` 可让浏览器按所需字符选择相应子集，但不会替你裁切文件；要同时准备真正的子集资源。

## Font-display 管理等待与交换

| 策略     | 取舍                                           |
| -------- | ---------------------------------------------- |
| block    | 有阻塞期，期间文本可能不可见，之后可回退和交换 |
| swap     | 极短阻塞期后显示回退字体，允许后续交换         |
| fallback | 有限等待和交换窗口，减少很晚替换               |
| optional | 极短等待，浏览器可放弃本次交换                 |

具体等待时长和资源策略由浏览器决定，不应背成统一毫秒表。FOIT 指加载时文字不可见，FOUT 指先显示回退字体再变化，是现象而非两个 CSS 属性。

## 字体交换为什么会产生位移

回退字体与最终字体字宽不同，可能改变换行、按钮宽度和段落高度；相同 line-height 也不保证所有布局稳定。可优先选择接近的回退字体，必要时通过 size-adjust、ascent-override 等匹配度量，提前为关键区域留空间。

Preload 适合确定会使用的关键资源，需保持 URL、跨域模式等与实际请求一致；预加载所有字重反而可能争抢带宽。

`getComputedStyle().fontFamily` 只给候选列表。具体字形使用什么字体，应查看浏览器的字体检查工具；`document.fonts.ready` 也不保证未来新内容需要的字体已经全部加载。

匹配和加载规则见 [CSS Fonts 4](https://www.w3.org/TR/css-fonts-4/) 与 [CSS Font Loading 3](https://www.w3.org/TR/css-font-loading-3/)。
