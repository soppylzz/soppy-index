> 英文原文：[本地副本](../en/overview/mojo_and_services.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/mojo_and_services.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="intro-to-mojo-amp-services"></a>

# Mojo 与服务入门

- [概述](#overview)
- [Mojo 术语](#mojo-terminology)
- [示例：定义新的 Frame 接口](#example-defining-a-new-frame-interface)
  - [定义接口](#defining-the-interface)
  - [创建管道](#creating-the-pipe)
  - [发送消息](#sending-a-message)
  - [将 PendingReceiver 发送到浏览器](#sending-a-pendingreceiver-to-the-browser)
  - [实现接口](#implementing-the-interface)
- [服务概述与术语](#services-overview-amp-terminology)
- [示例：构建简单的进程外服务](#example-building-a-simple-out-of-process-service)
  - [定义服务](#defining-the-service)
  - [接入服务实现](#hooking-up-the-service-implementation)
  - [启动服务](#launching-the-service)
  - [指定沙箱](#specifying-a-sandbox)
- [Content 层服务概览](#content-layer-services-overview)
  - [Interface Broker](#interface-brokers)
  - [与导航关联的接口](#navigation-associated-interfaces)
- [获取更多支持](#additional-support)

<a id="overview"></a>

## 概述

本文提供在 Chromium 中有效使用 Mojo 所需的基础知识，包括 Mojo 接口的使用、服务的定义和接入，以及 Content 层核心服务的简要介绍。更多入门指南和 API 参考见 [Mojo 与服务文档](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/README.md#Mojo-Services)。

<a id="mojo-terminology"></a>

## Mojo 术语

**Message pipe（消息管道）**由一对 endpoint（端点）组成。每个端点有一个接收消息的队列；向一个端点写入消息，相当于把消息放入另一个端点，即 peer 的队列。因此消息管道是双向的。

**mojom 文件**描述接口，即强类型消息的集合。熟悉 Google protobuf 的读者可以把每条接口消息粗略类比为一个 proto message。

给定 mojom 接口和消息管道，可以将一个端点指定为 `Remote`，用于发送接口定义的消息；另一端指定为 `Receiver`，用于接收消息。

> 这种说明做了一些简化。管道仍然是双向的，mojom 消息可以要求回复；回复由 `Receiver` 端发送，由 `Remote` 端接收。

`Receiver` 必须关联，也就是绑定到 mojom 接口的实现，才能处理消息。收到的消息作为调度任务分派，调用实现对象上对应的接口方法。

也可以这样理解：**`Remote` 调用与对端 `Receiver` 关联的远程接口实现。**

<a id="example-defining-a-new-frame-interface"></a>

## 示例：定义新的 Frame 接口

假设要从渲染器中的 frame 向浏览器进程对应的 `RenderFrameHostImpl` 发送 Ping 消息。我们需要定义 mojom 接口、创建使用该接口的管道，并将一个端点送到正确位置，以便接收、处理消息。下面逐步实现。

<a id="defining-the-interface"></a>

### 定义接口

首先创建包含接口定义的 `.mojom` 文件：

```cpp
// src/example/public/mojom/pingable.mojom
module example.mojom;

interface Pingable {
  // Receives a "Ping" and responds with a random integer.
  Ping() => (int32 random);
};
```

为其添加生成 C++ bindings 的构建规则：

```python
# src/example/public/mojom/BUILD.gn
import("//mojo/public/tools/bindings/mojom.gni")
mojom("mojom") {
  sources = [ "pingable.mojom" ]
}
```

<a id="creating-the-pipe"></a>

### 创建管道

通常由接口客户端，即 `Remote` 一侧创建新管道。这很方便，因为无需等待另一端传输或绑定完成，就能通过 `Remote` 开始发送消息。

以下代码放在渲染器中：

```cpp
// src/third_party/blink/example/public/pingable.h
mojo::Remote<example::mojom::Pingable> pingable;
mojo::PendingReceiver<example::mojom::Pingable> receiver =
    pingable.BindNewPipeAndPassReceiver();
```

`pingable` 是 `Remote`；`receiver` 是 `PendingReceiver`，之后会成为 `Receiver`。最常用的创建方式是 `BindNewPipeAndPassReceiver`，其返回值就是 `PendingReceiver`。

> `PendingReceiver` 本身不会执行操作，只是持有一个消息管道端点。它提供编译期的强类型约束，表示该端点应绑定到相同接口类型的 `Receiver`。

<a id="sending-a-message"></a>

### 发送消息

调用 `Remote` 上的 `Ping()`：

```cpp
// src/third_party/blink/example/public/pingable.h
pingable->Ping(base::BindOnce(&OnPong));
```

> 要接收回复，必须让 `pingable` 存活到 `OnPong` 被调用。它拥有管道端点；对象销毁时端点也被销毁，就没有接收回复的对象了。

现在，原本“如何跨进程发送消息”的问题，转化为“如何把 `receiver` 传给浏览器进程，并在那里将它变成可分派消息的 `Receiver`”。

<a id="sending-a-pendingreceiver-to-the-browser"></a>

### 将 PendingReceiver 发送到浏览器

`PendingReceiver` 和其他消息管道端点都可以通过 mojom 消息传输。最常见的方式，是将它作为参数传给另一个已经连接的接口。

渲染器的 `RenderFrameImpl` 与浏览器进程对应的 `RenderFrameHostImpl` 之间，始终连接着 [`BrowserInterfaceBroker`](https://cs.chromium.org/chromium/src/third_party/blink/public/mojom/browser_interface_broker.mojom)。它是获取其他接口的工厂。`GetInterface` 接收 `GenericPendingReceiver`，允许传入任意接口的 receiver。

```cpp
interface BrowserInterfaceBroker {
  GetInterface(mojo_base.mojom.GenericPendingReceiver receiver);
}
```

任意具体的 `PendingReceiver` 都可以隐式构造为 `GenericPendingReceiver`，因此可直接传入此前创建的对象：

```cpp
RenderFrame* my_frame = GetMyFrame();
my_frame->GetBrowserInterfaceBroker().GetInterface(std::move(receiver));
```

这会将端点转移到浏览器进程，由对应的 `BrowserInterfaceBroker` 实现接收。

<a id="implementing-the-interface"></a>

### 实现接口

在浏览器端实现 `Pingable`：

```cpp
#include "example/public/mojom/pingable.mojom.h"

class PingableImpl : example::mojom::Pingable {
 public:
  explicit PingableImpl(mojo::PendingReceiver<example::mojom::Pingable> receiver)
      : receiver_(this, std::move(receiver)) {}
  PingableImpl(const PingableImpl&) = delete;
  PingableImpl& operator=(const PingableImpl&) = delete;

  // example::mojom::Pingable:
  void Ping(PingCallback callback) override {
    // Respond with a random 4, chosen by fair dice roll.
    std::move(callback).Run(4);
  }

 private:
  mojo::Receiver<example::mojom::Pingable> receiver_;
};
```

`RenderFrameHostImpl` 拥有 `BrowserInterfaceBroker` 的一个实现。收到 `GetInterface` 调用时，它会调用为特定接口预先注册的处理函数。

```cpp
// render_frame_host_impl.h
class RenderFrameHostImpl
  ...
  void GetPingable(mojo::PendingReceiver<example::mojom::Pingable> receiver);
  ...
 private:
  ...
  std::unique_ptr<PingableImpl> pingable_;
  ...
};

// render_frame_host_impl.cc
void RenderFrameHostImpl::GetPingable(
    mojo::PendingReceiver<example::mojom::Pingable> receiver) {
  pingable_ = std::make_unique<PingableImpl>(std::move(receiver));
}

// browser_interface_binders.cc
void PopulateFrameBinders(RenderFrameHostImpl* host,
                          mojo::BinderMap* map) {
...
  // Register the handler for Pingable.
  map->Add<example::mojom::Pingable>(base::BindRepeating(
    &RenderFrameHostImpl::GetPingable, base::Unretained(host)));
}
```

这样就建立了 renderer frame 与浏览器端 host 之间的新接口连接。只要渲染器中的 `pingable` 存活足够久，最终就会收到 `OnPong` 回调，其值是上面浏览器端实现选取的 `4`。

<a id="services-overview-amp-terminology"></a>

## 服务概述与术语

Mojo 的用途远不止渲染器与浏览器之间的消息传递。虽然这可能是按代码量计最常见的用法，Chromium 也在逐步拆分为更细粒度的服务，超越传统 Content 的 browser / renderer / gpu / utility 进程划分。

**服务**是一个自包含代码库，实现一组相关功能或行为，与外部代码的交互完全通过 Mojo 接口连接完成，通常由浏览器进程牵线。每个服务定义并实现一个主 Mojo 接口，浏览器通过它管理服务实例。

<a id="example-building-a-simple-out-of-process-service"></a>

## 示例：构建简单的进程外服务

通常需要三步：定义主接口及实现；将实现接入进程外代码；编写浏览器逻辑启动服务进程。下面简要说明，更完整的概念及 API 文档见 [Mojo](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/mojo/README.md)。

<a id="defining-the-service"></a>

### 定义服务

服务一般放在源码顶层或某个子目录的 `services` 目录中。本例供 Chrome 专用，因此放在 `//chrome/services`。

先创建 mojom 相关文件：

```cpp
// src/chrome/services/math/public/mojom/math_service.mojom
module math.mojom;

interface MathService {
  Divide(int32 dividend, int32 divisor) => (int32 quotient);
};
```

```python
# src/chrome/services/math/public/mojom/BUILD.gn
import("//mojo/public/tools/bindings/mojom.gni")

mojom("mojom") {
  sources = [
    "math_service.mojom",
  ]
}
```

再编写 `MathService` 实现：

```cpp
// src/chrome/services/math/math_service.h
#include "chrome/services/math/public/mojom/math_service.mojom.h"

namespace math {

class MathService : public mojom::MathService {
 public:
  explicit MathService(mojo::PendingReceiver<mojom::MathService> receiver);
  MathService(const MathService&) = delete;
  MathService& operator=(const MathService&) = delete;
  ~MathService() override;

 private:
  // mojom::MathService:
  void Divide(int32_t dividend,
              int32_t divisor,
              DivideCallback callback) override;

  mojo::Receiver<mojom::MathService> receiver_;
};

}  // namespace math
```

```cpp
// src/chrome/services/math/math_service.cc
#include "chrome/services/math/math_service.h"

namespace math {

MathService::MathService(mojo::PendingReceiver<mojom::MathService> receiver)
    : receiver_(this, std::move(receiver)) {}

MathService::~MathService() = default;

void MathService::Divide(int32_t dividend,
                         int32_t divisor,
                         DivideCallback callback) {
  // Respond with the quotient!
  std::move(callback).Run(dividend / divisor);
}

}  // namespace math
```

```python
# src/chrome/services/math/BUILD.gn

source_set("math") {
  sources = [
    "math_service.cc",
    "math_service.h",
  ]

  deps = [
    "//base",
    "//chrome/services/math/public/mojom",
  ]
}
```

现在已有完整的 `MathService`，可以在进程内或进程外使用。

<a id="hooking-up-the-service-implementation"></a>

### 接入服务实现

对于进程外 Chrome 服务，只需在 [`//chrome/utility/services.cc`](https://cs.chromium.org/chromium/src/chrome/utility/services.cc) 注册工厂函数：

```cpp
auto RunMathService(mojo::PendingReceiver<math::mojom::MathService> receiver) {
  return std::make_unique<math::MathService>(std::move(receiver));
}

void RegisterMainThreadServices(mojo::ServiceFactory& services) {
  // Existing services...
  services.Add(RunFilePatcher);
  services.Add(RunUnzipper);

  // We add our own factory to this list
  services.Add(RunMathService);
  //...
```

浏览器进程现在可以启动新的进程外 MathService 实例。

<a id="launching-the-service"></a>

### 启动服务

进程内服务可以像普通对象一样实例化，也可以通过 Mojo Remote 与它通信，如同它运行在另一个进程。

完成上述接入后，通过 Content 的 [`ServiceProcessHost`](https://cs.chromium.org/chromium/src/content/public/browser/service_process_host.h?rcl=e7a1f6c9a24f3151c875598174a05167fb12c5d5&l=47) 启动进程外实例：

```cpp
mojo::Remote<math::mojom::MathService> math_service =
    content::ServiceProcessHost::Launch<math::mojom::MathService>(
        content::ServiceProcessHost::Options()
            .WithDisplayName("Math!")
            .Pass());
```

除崩溃情况外，启动的进程会随 `math_service` 一同存活。因此销毁或 reset `math_service` 可以强制结束该进程。

现在可在进程外执行除法：

```cpp
// NOTE: As a client, we do not have to wait for any acknowledgement or
// confirmation of a connection. We can start queueing messages immediately and
// they will be delivered as soon as the service is up and running.
math_service->Divide(
    42, 6, base::BindOnce([](int32_t quotient) { LOG(INFO) << quotient; }));
```

> 要执行响应回调，必须保持 `mojo::Remote<math::mojom::MathService>` 存活。见[端点生命周期与回调](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/mojo/public/cpp/bindings/README.md#A-Note-About-Endpoint-Lifetime-and-Callbacks)及前面的[发送消息](#sending-a-message)。

<a id="specifying-a-sandbox"></a>

### 指定沙箱

所有服务都必须指定沙箱。理想情况下使用 `kService` 进程沙箱，除非需要访问操作系统资源。需要自定义沙箱时，应与 security-dev@chromium.org 协商定义新的沙箱类型。

推荐在 `.mojom` 的 `interface {}` 上声明 `[ServiceSandbox=type]`：

```
import "sandbox/policy/mojom/sandbox.mojom";
[ServiceSandbox=sandbox.mojom.Sandbox.kService]
interface FakeService {
  ...
};
```

可用值见 [`//sandbox/policy/mojom/sandbox.mojom`](https://cs.chromium.org/chromium/src/sandbox/policy/mojom/sandbox.mojom)。只有通过 `content::ServiceProcessHost::Launch()` 在进程外启动接口时，该沙箱才生效。

实在需要时，也可以动态地或根据 feature 映射到底层平台沙箱，但需通过 ContentBrowserClient 接入，例如 `ShouldSandboxNetworkService()`。

<a id="content-layer-services-overview"></a>

## Content 层服务概览

<a id="interface-brokers"></a>

### Interface Broker

渲染器的 frame 对象与浏览器中对应的 `RenderFrameHostImpl` 之间，通过显式的 mojom 接口建立持久连接，即 [`BrowserInterfaceBroker`](https://cs.chromium.org/chromium/src/third_party/blink/public/mojom/browser_interface_broker.mojom?rcl=09aa5ae71649974cae8ad4f889d7cd093637ccdb&l=11)。使用时先在 `RenderFrameHostImpl` 添加方法：

```cpp
void RenderFrameHostImpl::GetGoatTeleporter(
    mojo::PendingReceiver<magic::mojom::GoatTeleporter> receiver) {
  goat_teleporter_receiver_.Bind(std::move(receiver));
}
```

再于 `browser_interface_binders.cc` 的 `PopulateFrameBinders` 中注册，将接口映射到相应 host 上的处理函数：

```cpp
// //content/browser/browser_interface_binders.cc
void PopulateFrameBinders(RenderFrameHostImpl* host,
                          mojo::BinderMap* map) {
...
  map->Add<magic::mojom::GoatTeleporter>(base::BindRepeating(
      &RenderFrameHostImpl::GetGoatTeleporter, base::Unretained(host)));
}
```

指定 task runner 还可将接口绑定到另一个 sequence：

```cpp
// //content/browser/browser_interface_binders.cc
void PopulateFrameBinders(RenderFrameHostImpl* host,
                          mojo::BinderMap* map) {
...
  map->Add<magic::mojom::GoatTeleporter>(base::BindRepeating(
      &RenderFrameHostImpl::GetGoatTeleporter, base::Unretained(host)),
      GetIOThreadTaskRunner({}));
}
```

Worker 同样通过 `BrowserInterfaceBroker` 连接渲染器与浏览器进程中的对应实现。添加 worker 专属接口的流程类似，区别如下：

- Dedicated Worker：在 [`DedicatedWorkerHost`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/worker_host/dedicated_worker_host.h) 添加方法，注册到 [`PopulateDedicatedWorkerBinders`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/browser_interface_binders.cc;l=1126;drc=e24e0a914ff0da18e78044ebad7518afe9e13847)。
- Shared Worker：在 [`SharedWorkerHost`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/worker_host/shared_worker_host.h) 添加方法，注册到 [`PopulateSharedWorkerBinders`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/browser_interface_binders.cc;l=1232;drc=e24e0a914ff0da18e78044ebad7518afe9e13847)。
- Service Worker：在 [`ServiceWorkerHost`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/service_worker/service_worker_host.h) 添加方法，注册到 [`PopulateServiceWorkerBinders`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/browser_interface_binders.cc;l=1326;drc=e24e0a914ff0da18e78044ebad7518afe9e13847)。

也可在进程级别添加接口：使用 renderer 中 Blink `Platform` 与 browser 中 `RenderProcessHost` 之间的 `BrowserInterfaceBroker`。这样渲染器中任意线程，包括 frame 和 worker 线程，都能访问，但 broker 实现必须线程安全，会引入额外开销。

具体方法是在 `RenderProcessHostImpl` 添加方法，并在 [`RenderProcessHostImpl::RegisterMojoInterfaces`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/renderer_host/render_process_host_impl.cc;l=2317;drc=a817d852ea2f2085624d64154ad847dfa3faaeb6) 中调用 [`AddUIThreadInterface`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/renderer_host/render_process_host_impl.h;l=918;drc=ec5eaba0e021b757d5cbbf2c27ac8f06809d81e9) 注册。渲染器端通过 [`Platform::GetBrowserInterfaceBroker`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/public/platform/platform.h;l=781;drc=ee1482552c4c97b40f15605fe6a52565cfe74548) 获取 broker，再调用 `GetInterface`。

要绑定嵌入方专属、文档作用域的接口，重写 [`ContentBrowserClient::RegisterBrowserInterfaceBindersForFrame()`](https://cs.chromium.org/chromium/src/content/public/browser/content_browser_client.h?rcl=3eb14ce219e383daa0cd8d743f475f9d9ce8c81a&l=999)，把 binder 加入提供的 map。

> 找不到所请求接口的 binder 时，broker 会调用相应 context host 的 `ReportNoBinderForInterface()`，继而在 host 的 receiver 上调用 `ReportBadMessage()`，其后果之一是终止 renderer。测试中的 content_shell 可能未绑定 Chrome 专属接口，但 renderer 仍请求它们；可用 `browser_interface_binders.cc` 中的 [`EmptyBinderForFrame`](https://cs.chromium.org/chromium/src/content/browser/browser_interface_binders.cc?rcl=12e73e76a6898cb6df6a361a98320a8936f37949&l=407) 避免这种崩溃。不过仍推荐尽量保持 browser 与 renderer 两侧一致。

<a id="navigation-associated-interfaces"></a>

### 与导航关联的接口

如果不同 frame 的消息顺序很重要，并且需要与实现导航的消息正确排序，可以使用 navigation-associated interface。它利用各 frame 与相应 `RenderFrameHostImpl` 的连接，将消息放在导航消息使用的同一 FIFO 管道中。因此导航之后发送的消息保证在导航相关消息之后到达浏览器进程，同一文档的不同 frame 发出的消息顺序也会保留。

添加这种接口时，在 `RenderFrameHostImpl` 增加方法，并在 [`SetUpMojoConnection`](https://source.chromium.org/chromium/chromium/src/+/main:content/browser/renderer_host/render_frame_host_impl.cc;l=8365;drc=a817d852ea2f2085624d64154ad847dfa3faaeb6) 中通过 `associated_registry_->AddInterface` 注册。

渲染器端通过 [`LocalFrame::GetRemoteNavigationAssociatedInterfaces`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/frame/local_frame.h;l=409;drc=19f17a30e102f811bc90a13f79e8ad39193a6403) 获取对象并调用 `GetInterface`。这类似于 broker 的同名方法，但参数是 [pending associated receiver](https://chromium.googlesource.com/chromium/src/+/main/mojo/public/cpp/bindings/README.md#associated-interfaces)，不是普通 pending receiver。

<a id="additional-support"></a>

## 获取更多支持

如果本文未能解决问题，可以向 [chromium-mojo@chromium.org](https://groups.google.com/a/chromium.org/forum/#!forum/chromium-mojo) 或 [services-dev@chromium.org](https://groups.google.com/a/chromium.org/forum/#!forum/services-dev) 邮件列表提问。
