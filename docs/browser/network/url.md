# URL 与查询参数：先解析结构，再设置数据

把搜索词直接拼进 `?q=` 后面，为什么 `&` 会把一个值变成两个参数？因为 URL 本身有路径、查询和片段等结构，而用户输入里的字符可能被解释为分隔符。应先建立 URL 对象，再通过 `searchParams` 设置参数，让序列化过程负责相应编码。

## 相对路径需要一个基准地址

```js
const url = new URL("/api/search", "https://example.com/app/page")
url.searchParams.set("q", "space & symbols")
console.log(url.pathname, url.searchParams.get("q"))
```

以 `/` 开头的路径从来源根路径解析；`./search` 则相对于基准地址所在目录。浏览器代码可以使用 `window.location.href` 作为基准。创建 URL 对象不会自动请求资源，它先解决地址结构和序列化问题。

参数应传入原始值。若先调用 `encodeURIComponent()`，再交给 `searchParams.set()`，其中的百分号会被再次编码，通常得不到想要的参数值。URL 与查询参数的解析、序列化规则见 [URL Standard](https://url.spec.whatwg.org/#urlsearchparams)。

## 重复参数是序列，不是唯一键字典

```js
url.searchParams.append("tag", "browser")
url.searchParams.append("tag", "network")
console.log(url.searchParams.getAll("tag"))

url.searchParams.set("tag", "platform")
console.log(url.searchParams.getAll("tag"))
```

`append()` 增加一项，因此第一次读取保留两个 tag；`set()` 则更新该名称对应的值并移除同名的其他项，所以第二次只剩 platform。`get()` 只读取第一项，不能用它证明请求里没有重复参数。

选择方法取决于业务模型：单个分页值可以用 set，多选筛选条件可以用 append / getAll；接收端也要约定重复参数如何解释。

## 能解析，不代表业务允许访问

URL 解析成功只说明地址满足解析条件，不说明它是允许的跳转目标，也不说明资源可达。处理不可信跳转地址时，应在解析之后检查 `protocol`、`origin` 等业务条件，不能用字符串前缀判断可信来源。

URL 决定请求目的地；请求是否成功、响应体是否可读，继续见 [fetch 与取消](./fetch.md)。这两类结果不能用一次 URL 构造成功替代。

## 在实验中观察编码往返

`/tools` 的 URL 按钮使用当前页面作为基准，设置包含中文、空格和 `&` 的 q，并追加两个 tag。应同时检查序列化后的 href 和通过 searchParams 读回的值：编码后的字符串与原始参数表示不同层次的数据。

上面的片段只构造和读取 URL，不能据此证明网络请求或服务端参数处理成功。
