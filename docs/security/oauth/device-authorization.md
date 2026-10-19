# Device Authorization：电视和 CLI 怎样让用户完成授权

电视不方便输入密码，CLI 也未必有可接收浏览器回调的界面。Device Authorization 把发起请求的设备与用户认证页面分开：设备保留长随机 device code，用户在另一页面输入较短 user code。

## 两个 code 服务不同参与方

设备向 device authorization 端点申请，得到 device code、user code、verification URI、有效期和轮询间隔。用户在可信验证页面登录并确认授权，设备则按间隔向 token 端点轮询。

user code 用于让用户选择正在批准的设备交易，device code 是设备向 token 端点出示的高熵凭据。不能把 device code 放到让别人扫码或输入的位置，也不能仅凭知道 user code 就向任意请求方发 token。

## 轮询是一台有失败分支的状态机

| 响应                    | 含义                   | 客户端行为               |
| ----------------------- | ---------------------- | ------------------------ |
| `authorization_pending` | 用户尚未完成批准       | 保持间隔继续轮询         |
| `slow_down`             | 请求过于频繁           | 增加后续轮询间隔         |
| `access_denied`         | 用户拒绝               | 停止该交易               |
| `expired_token`         | device code 已过期     | 停止轮询，需要时重新开始 |
| access token            | 用户已批准且 code 有效 | 停止轮询并访问获授权资源 |

拒绝或过期不能用无限重试“修好”，成功后也不能继续兑换同一个 code。网络超时与协议拒绝是不同结果，设备还需要有界退避与取消操作。

实验使用浏览器页面扮演设备，手动点击轮询以便观察上述响应；它不是原生电视或 CLI。另一标签页完成认证和批准，提供方一次性发出代表该用户的 access token。设备授权本身不是 OIDC 身份断言，实验不发 ID token，也不把资源 token 当作本站登录证明。

## 用户批准的到底是哪台设备

攻击者可能诱导用户在正规提供方输入攻击者的 code，从而批准攻击者设备。验证页面必须让用户理解客户端和交易；用户不应输入来自陌生消息的 code。TLS、限速、短有效期和用户确认各解决不同条件下的问题。教学提供方展示基本状态机，没有实现生产级防钓鱼、风控与速率限制。

参考：[RFC 8628](https://www.rfc-editor.org/rfc/rfc8628.html)。
