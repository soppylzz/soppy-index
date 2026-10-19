# WebRTC、NAT、STUN、TURN 与 ICE

## WebRTC 要解决的不止传输

浏览器要在不同网络中的两个对等端之间传媒体或数据，必须先交换会话信息，找到可通的网络路径，再建立加密媒体/数据通道。WebRTC 并不规定你的业务信令服务器怎样实现；WebSocket、HTTP 等都可传递 SDP offer/answer 与 ICE candidate。SDP 描述媒体能力与传输参数，不能把它当成“视频数据”。

```text
A ──offer / ICE candidate──> Signaling service ──> B
A <──answer / ICE candidate── Signaling service <── B
A <========== ICE selected path (direct or TURN) ==========> B
```

媒体通常用 DTLS-SRTP 协商密钥后以 SRTP/SRTCP 保护；DataChannel 通常用 SCTP over DTLS。媒体自身并不是简单地塞进普通 TLS/TCP。信令服务要认证房间成员并授权交换信息，否则能窃取或注入连接元数据。加密也不免除信令安全。

## 为什么 NAT 阻碍 P2P

内网地址不能直接在公网路由。对端需要知道“从外面能打到我的哪个地址与端口”，但 NAT 映射可能依赖目标地址/端口，过滤规则也可能只允许已联系过的端点。防火墙、运营商 NAT、双层 NAT、企业代理会进一步改变路径。

旧术语常把 NAT 叫全锥型、受限锥型、端口受限锥型、对称型。更精确地分开两件事：

- **映射行为**：同一内网端点访问不同远端，外侧地址/端口是否保持不变？endpoint-independent mapping 有利于候选地址复用；address/port-dependent mapping 可能让 STUN 看到的地址与访问对端时不同。
- **过滤行为**：映射存在后，哪些外部源可以发包进来？endpoint-independent、address-dependent、address-and-port-dependent 是不同约束。

映射与过滤可以组合，不能靠一个四类标签精确推断成功率。实际必须测候选对的连通性；即使双方都能通过 STUN 获得公网映射，也不保证互通。

### 面试里的四种 NAT 名称怎样理解

旧式分类把映射与过滤合在一个标签里。以下是传统模型的直观解释，主要用于理解 UDP 穿透，不应当成所有设备的完整规格。

全锥型通常表示端点无关映射与端点无关过滤：内部端点建立映射后，外部端点可向该映射发送。受限锥型通常仍复用映射，但要求内网设备先给对应外部 IP 发过包；该 IP 的不同端口可以回复。端口受限锥型进一步要求外部 IP 和端口都匹配此前联系的端点。

对称型通常指映射随远端 IP/端口改变，传统模型中还配合较严格的过滤。因此从 STUN 服务器获得的映射不一定适用于真正对端。映射是否变化、外部包是否获准进入，要分别观察，不要只根据一个标签判断。

### 打洞的“洞”究竟是什么

假设双方 NAT 都能为不同远端复用外侧映射：

```text
A private: 192.168.1.8:50000 → NAT A public: 203.0.113.10:41000
B private: 10.0.0.8:50000    → NAT B public: 198.51.100.20:42000
```

A、B 先与 STUN 服务器通信，获知服务器看到的映射，通过信令把候选地址交给对方。随后双方从相应端点主动向对方候选发连通性检查。主动出站流量建立或刷新 NAT 状态，使对方的检查或回应有机会被允许进入。开始几包可能丢失，因此不是发一个包就必定成功。

这个“洞”不是修改防火墙配置，更不是 STUN 命令 NAT 永久开放端口，而是利用已有映射与过滤规则完成双向通信。如果映射对远端敏感、路径有多层 NAT、UDP 被禁或候选已过期，就可能失败。常见方案需保活，并在网络改变时重新检查或重启 ICE；不能承诺“两边同时发包就一定成功”。

## STUN、TURN、ICE 各做什么

- **STUN**：客户端向 STUN 服务器发送 Binding 请求，从响应中得知服务器观察到的映射地址，也用于 ICE 连通性检查。它提供发现与检测，不负责转发全部媒体。
- **TURN**：客户端从中继服务器分配 relay 地址；无法直连时，双方经中继转发数据。中继消耗带宽、增加路径成本，但在受限网络中很重要；要鉴权、限流与监控。TURN 服务与业务信令服务角色不同。
- **ICE**：收集候选、从信令通道交换、对候选对发 STUN 检查，选出有效路径，并在网络变化时处理连接状态。ICE 可能选择直连，也可能选择 TURN 中继；不是简单地“先 STUN 失败再开 TURN”。

| candidate 类型 | 地址来自            | 意义                            |
| -------------- | ------------------- | ------------------------------- |
| host           | 本机接口            | 本机路径候选                    |
| srflx          | STUN 观察的公网映射 | 可尝试 NAT 穿透；不保证路径可用 |
| relay          | TURN 分配的中继地址 | 受限路径的中继选项              |

host 候选适合可直接路由的路径；浏览器也可能用 mDNS 名称保护本地 IP。候选可逐步产生并通过 trickle ICE 边收集边交换。浏览器的 ICE 状态如 `checking`、`connected`、`failed` 反映连接检查进度，不等于业务层音视频一定可播放；还要看权限、轨道、编解码与媒体统计。

ICE 还可能在检查过程中发现 peer-reflexive（prflx）候选，不一定所有地址都预先从信令获得。TURN 中继也不意味着客户端到中继只能用 UDP；可按环境使用 UDP、TCP 或 TLS 连接 TURN，但相应支持、端口和转发路径仍需配置。中继能改善可达性，不保证服务永远可用。

## 最小浏览器片段：观察候选

```js
const peer = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.example.org:3478" }],
})

peer.addEventListener("icecandidate", ({ candidate }) => {
  if (candidate) signaling.send({ type: "candidate", candidate })
})
peer.addEventListener("iceconnectionstatechange", () => {
  console.log(peer.iceConnectionState)
})

const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
stream.getTracks().forEach((track) => peer.addTrack(track, stream))
const offer = await peer.createOffer()
await peer.setLocalDescription(offer)
signaling.send({ type: "offer", sdp: peer.localDescription })
```

这是概念片段：`signaling` 和 STUN 地址需由应用提供；真实应用还要处理远端 answer、候选到达顺序、权限拒绝、连接失败、关闭时停止轨道及清理资源。对端收到 offer 后设置 remote description、创建 answer，并交换剩余 candidate。仅有这段代码不会自动连上另一台设备。浏览器 `chrome://webrtc-internals` 或类似工具可看候选对与统计；真正的外网测试需要两个不同网络环境。

## 面试重点与排障

- WebRTC 与 WebSocket 不互相替代：WebSocket 常用于信令，媒体走 WebRTC 选中的路径。
- TURN 地址能连通不代表双方直接连通；在日志里区分 relay 与 srflx/host 候选对。
- `getUserMedia` 需用户授权和安全上下文；权限通过也不代表 NAT 路径成功。
- 若 ICE 始终 failed，依次核对信令是否完整、STUN/TURN 凭据与 UDP/TCP 可达性、候选对与防火墙；若 ICE connected 但无画面，再查 track、方向、编解码与播放策略。

资料：[RFC 8445（ICE）](https://www.rfc-editor.org/rfc/rfc8445)、[RFC 8489（STUN）](https://www.rfc-editor.org/rfc/rfc8489)、[RFC 8656（TURN）](https://www.rfc-editor.org/rfc/rfc8656)、[RFC 4787（NAT 行为）](https://www.rfc-editor.org/rfc/rfc4787)、[W3C WebRTC](https://www.w3.org/TR/webrtc/)。
