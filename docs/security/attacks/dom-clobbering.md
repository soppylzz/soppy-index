# DOM Clobbering：标签怎样改变脚本读到的对象

过滤器禁止了 script 标签，是否就不会影响代码执行？若仍允许不受约束的 HTML，命名访问可能让合法脚本读到攻击者准备的元素。

## DOM Clobbering 借用的是命名查找

HTML 中元素的 `id`/`name` 可能在某些 DOM 命名访问场景中暴露为全局或表单属性。若攻击者能注入 HTML 标记但不能直接注入脚本，仍可能构造元素覆盖代码期望的对象/属性，改变后续脚本的数据流。例如代码依赖 `window.config`，而页面里有攻击者可控的 `<a id="config">`，在没有显式属性等条件下，命名访问可能返回元素而非预期配置。若合法脚本继续把它转换成 URL 并交给危险 sink，标记注入就可能影响代码行为；仅出现同名 id 并不保证任意局部变量都会被覆盖。

主防线是不要把未清理的 HTML 放入页面，也不要通过 `window.someName`、`document.someName` 或表单的动态命名属性获取安全关键对象。使用模块局部变量、显式 `getElementById` 后检查类型，并对富文本做合适清理。显式查询也只解决引用来源，不保证查到的内容可信；仍需校验元素类型和读取值。CSP 可限制最终脚本执行，但不能修复所有 DOM 命名冲突导致的逻辑误用。

DOM Clobbering 可能先劫持引用，再由合法脚本触发危险行为；XSS 关注不可信数据最终变成代码执行。单纯有同名元素不代表一定形成漏洞，还要看后续值如何使用。

## 清理后的 HTML 为什么还要关注重新解析

mutation XSS 利用清理器与浏览器解析、序列化或命名空间处理的差异，让原本看似无害的输出在后续处理时形成危险结构。它与命名属性覆盖不是同一机制，但都说明“过滤 script 标签”不足以保证安全。

应使用持续维护、适配目标上下文的 sanitizer，避免清理后再次拼接不可信内容，并对实际插入路径做回归。不要用自写标签黑名单替代 HTML 解析与清理。

参考：[OWASP DOM Clobbering Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)。
