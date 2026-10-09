> 英文原文：[本地副本](en/webui_explainer.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/webui_explainer.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="webui-explainer"></a>

# WebUI 详解

- [什么是 WebUI？](#what-is-webui)
- [与普通网页有何不同？](#whats-different-from-a-web-page)
- [chrome: URL 如何工作](#how-chrome-urls-work)
  - [chrome: 协议](#chrome-protocol)
  - [chrome: Host](#chrome-hosts)
- [C++ 类](#c-classes)
  - [WebUI](#webui)
  - [WebUIConfig](#webuiconfig)
  - [WebUIController](#webuicontroller)
  - [WebUIDataSource](#webuidatasource)
  - [WebUIMessageHandler](#webuimessagehandler)
- [数据源](#data-sources)
  - [WebUIDataSource::CreateAndAdd()](#webuidatasourcecreateandadd)
  - [WebUIDataSource::AddLocalizedString()](#webuidatasourceaddlocalizedstring)
  - [WebUIDataSource::AddLocalizedStrings()](#webuidatasourceaddlocalizedstrings)
  - [WebUIDataSource::AddResourcePath()](#webuidatasourceaddresourcepath)
  - [WebUIDataSource::AddResourcePaths()](#webuidatasourceaddresourcepaths)
  - [WebUIDataSource::AddBoolean()](#webuidatasourceaddboolean)
- [数据源辅助工具](#webui-utils-for-working-with-data-sources)
  - [webui::SetupWebUIDataSource()](#webuisetupwebuidatasource)
- [Browser（C++）与 Renderer（JS）通信](#browser-c-and-renderer-js-communication)
  - [Mojo](#mojo)
    - [定义 Mojo 接口](#mojo-interface-definition)
    - [BUILD.gn 中的 Mojo 目标](#buildgn-mojo-target)
    - [配置 C++ bindings](#setting-up-c-bindings)
    - [使用 C++ bindings 通信](#using-c-bindings-for-communication)
    - [配置 TypeScript bindings](#setting-up-typescript-bindings)
    - [使用 TypeScript bindings 通信](#using-typescript-bindings-for-communication)
  - [Mojo 之前的方案：chrome.send() / WebUIMessageHandler](#pre-mojo-alternative-chromesendwebuimessagehandler)
    - [WebUIMessageHandler::AllowJavascript()](#webuimessagehandlerallowjavascript)
    - [WebUIMessageHandler::CallJavascriptFunction()](#webuimessagehandlercalljavascriptfunction)
    - [WebUIMessageHandler::FireWebUIListener()](#webuimessagehandlerfirewebuilistener)
    - [WebUIMessageHandler::OnJavascriptAllowed()](#webuimessagehandleronjavascriptallowed)
    - [WebUIMessageHandler::OnJavascriptDisallowed()](#webuimessagehandleronjavascriptdisallowed)
    - [WebUIMessageHandler::RejectJavascriptCallback()](#webuimessagehandlerrejectjavascriptcallback)
    - [WebUIMessageHandler::ResolveJavascriptCallback()](#webuimessagehandlerresolvejavascriptcallback)
    - [chrome.send()](#chromesend)
    - [addWebUiListener()](#addwebuilistener)
    - [sendWithPromise()](#sendwithpromise)
- [安全注意事项](#security-considerations)
- [错误报告](#error-reporting)
  - [JavaScript 错误真的是崩溃吗？](#are-javascript-errors-actually-crashes)
  - [可选：JavaScript 错误使浏览器崩溃](#optionally-crash-the-browser-on-javascript-errors)
  - [错误影响有多大？](#how-much-impact-does-this-javascript-error-have)
  - [已知问题](#known-issues)
- [另请参阅](#see-also)

<a id="what-is-webui"></a>

## 什么是 WebUI？

WebUI 泛指**使用 HTML、CSS、JavaScript 等 Web 技术实现的 Chrome 界面**。例如设置 `chrome://settings`、历史记录 `chrome://history`、下载 `chrome://downloads`。

> Chrome 中基于 Web 的界面不一定都使用 `chrome://` URL。

本文介绍 WebUI 的工作方式。

<a id="whats-different-from-a-web-page"></a>
<a id="bindings"></a>

## 与普通网页有何不同？

WebUI 被授予管理 Chrome 自身的特殊能力。例如设置界面需要访问许多涉及隐私、安全的服务，而这些权限不会默认授予网页。只有特定 URL 才会通过子进程安全策略获得 WebUI bindings。

这些 bindings 允许 renderer 加载 [`chrome:`](#chrome_urls) URL，例如共享资源 `chrome://resources/`；允许 browser 通过 [`CallJavascriptFunction()`](#CallJavascriptFunction) 在 renderer 执行 JavaScript；允许 renderer 经 [`chrome.send()`](#chrome_send) 等接口与 browser 通信；并忽略关于显示图片、执行 JavaScript 的内容设置。

<a id="how-chrome-urls-work"></a>
<a id="chrome_urls"></a>

## chrome: URL 如何工作

URL 形式为 `<protocol>://<host>/<path>`。`chrome:` URL 可以从磁盘、内存加载文件，也可动态生成响应。

Chrome UI 通常需要访问整个浏览器，而非仅当前标签页，因此负责处理请求、执行操作的 C++ 多在 browser 进程。它比处于沙箱、没有文件访问权的 renderer 权限更高，所以仅向特定 URL 授予访问能力。

<a id="chrome-protocol"></a>

### chrome: 协议

Chrome 启动时注册一组特殊协议。原文举例：`devtools:`、`chrome-extensions:`、`chrome:`、`file:`、`view-source:`。

> 译注：原文示例写作 `chrome-extensions:`；扩展实际常用的 scheme 是 `chrome-extension:`。此处记录原文拼写差异。

本文主要讨论 chrome:，其他协议也可能获得 [WebUI bindings](#bindings) 或具有特殊属性。

<a id="chrome-hosts"></a>

### chrome: Host

注册协议后，会创建包含有效 host 名单的工厂，由有效 host 生成 controller。

Chrome: 工厂在 browser 生命周期早期注册。第一个 WebUIConfig 注册前会先创建 WebUIConfigMap，其构造函数创建、注册 WebUIConfigMapWebUIControllerFactory。该工厂查询全局 host 到 WebUIConfig 的映射，若找到处理 URL 的 config，就调用其方法创建 controller。

```c++
// ChromeBrowserMainParts::PreMainMessageLoopRunImpl():

// Legacy WebUIControllerFactory registration
content::WebUIControllerFactory::RegisterFactory(
   ChromeWebUIControllerFactory::GetInstance());

// Factory for all WebUIs using WebUIConfig will be created here.
RegisterChromeWebUIConfigs();
RegisterChromeUntrustedWebUIConfigs();
```

请求 URL 时，会创建用于加载它的 renderer，并在 browser 配置负责接收其消息的 RenderFrameHost。

```c++
auto* config = config_map_->GetConfig(browser_context, url);
if (!config)
  return nullptr;  // Not a known host; no special access.

return config->CreateWebUIController(web_ui, url);
```

在 `chrome_web_ui_configs.cc` 调用 `map.AddWebUIConfig()` 注册：

```c++
map.AddWebUIConfig(std::make_unique<donuts::DonutsUIConfig>());

```

如果工厂能处理 host，原文以返回 WebUIFactoryFunction 描述此判断，导航机制就通过子进程安全策略[授予 WebUI bindings](#bindings)。

```c++
// RenderFrameHostImpl::AllowBindings():
if (bindings_flags.Has(BindingsPolicyValue::kWebUi)) {
  ChildProcessSecurityPolicyImpl::GetInstance()->GrantWebUIBindings(
      GetProcess()->GetDeprecatedID());
}
```

工厂利用 config 为标签页创建 [WebUIController](#WebUIController)。以下使用 DefaultWebUIConfig：

```c++
class DonutsUI;

// This would go in chrome/common/webui_url_constants.cc
namespace chrome {
const char kChromeUIDonutsHost[] = "donuts";
}  // namespace chrome

// Config for chrome://donuts
class DonutsUIConfig : public content::DefaultWebUIConfig<DonutsUI> {
 public:
  DonutsUIConfig()
      : DefaultWebUIConfig(content::kChromeUIScheme,
                           chrome::kChromeUIDonutsHost) {}
};

// Controller for chrome://donuts.
class DonutsUI : public content::WebUIController {
 public:
  DonutsUI(content::WebUI* web_ui) : content::WebUIController(web_ui) {
    content::WebUIDataSource* source =
        content::WebUIDataSource::CreateAndAdd(
            web_ui->GetWebContents()->GetBrowserContext(),
            "donuts");  // "donuts" == hostname
    source->AddString("mmmDonuts", "Mmm, donuts!");  // Translations.
    source->SetDefaultResource(IDR_DONUTS_HTML);  // Home page.

    // Handles messages from JavaScript to C++ via chrome.send().
    web_ui->AddMessageHandler(std::make_unique<OvenHandler>());
  }
};
```

假设 `IDR_DONUTS_HTML` 的内容为：

```html
<h1>$i18n{mmmDonuts}</h1>
```

访问 `chrome://donuts` 后会看到标题 “Mmmm, donuts!”。

默认 `$i18n{}` 会对字符串进行 HTML 转义。含 HTML 的翻译可用 `$i18nRaw{}`，Polymer binding 可用 `$i18nPolymer{}`，见[说明](https://bugs.chromium.org/p/chromium/issues/detail?id=1010815#c1)。

<a id="c-classes"></a>

## C++ 类

<a id="webui"></a>
<a id="WebUI"></a>

### WebUI

WebUI 是高层类，几乎每个基于 HTML 的 Chrome UI 都有一个。它位于 browser，由 RenderFrameHost 持有；具体实现 WebUIImpl 在 content/，响应导航事件创建。

WebUI 对页面本身了解很少，创建后根据 URL host 设置它持有的 [WebUIController](#WebUIController)。它可自行处理消息，但通常委托给按主题划分的 [WebUIMessageHandler](#WebUIMessageHandler)。

WebUI 可推测性创建，通常较轻量。复杂初始化、访问有副作用的服务等工作更常放在 controller 或 handler 中。

响应 URL 请求时，在 UI 线程同步创建，导航之间尽可能复用，例如刷新。由于位于不同进程，且可能早于 renderer 创建，可靠通信需要特别处理就绪状态。

<a id="webuiconfig"></a>

### WebUIConfig

包含决定是否为 URL 创建特定 WebUIController 所需的最少逻辑与信息，包括 host、scheme（chrome:// 或 [chrome-untrusted://](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/chrome_untrusted.md)）。也可检查指定 BrowserContext、URL 下是否启用，例如 feature flag、路径合法性。

它可在 `CreateWebUIControllerForURL` 调用 controller 构造函数。Config 在启动注册工厂时创建，因此应保持轻量。

<a id="webuicontroller"></a>
<a id="WebUIController"></a>

### WebUIController

负责应用特定逻辑、翻译与资源配置、创建 message handler，以及可能的动态响应。复杂页面通常将逻辑拆到多个 handler，便于组织。

它归 [WebUI](#WebUI) 所有。当 URL 匹配 map 中的 config，或由 ChromeWebUIControllerFactory 检查 URL 确定类型后，创建并设置到已有 WebUI 上。例如 settings 使用通用 WebUI 加专属 controller。

<a id="webuidatasource"></a>

### WebUIDataSource

保存页面所需数据，包括从磁盘资源包读取的静态 HTML、翻译字符串、feature 是否开启等动态值。数据源在 browser 的 C++ 中配置，由 renderer 加载 URL 访问。

历史记录页面示例：

```c++
content::WebUIDataSource* source = content::WebUIDataSource::CreateAndAdd(
    Profile::FromWebUI(web_ui), "history");

source->AddResourcePath("sign_in_promo.svg", IDR_HISTORY_SIGN_IN_PROMO_SVG);
source->AddResourcePath("synced_tabs.html", IDR_HISTORY_SYNCED_TABS_HTML);

source->AddString("title", IDS_HISTORY_TITLE);
source->AddString("moreFromThisSite", IDS_HISTORY_MORE_FROM_THIS_SITE);

source->AddBoolean("showDateRanges",
    base::FeatureList::IsEnabled(features::kHistoryShowDateRanges));

webui::SetupWebUIDataSource(source, kHistoryResources, kGeneratedPath,
    IDR_HISTORY_HISTORY_HTML);
```

具体方法见[数据源](#DataSources)和[辅助工具](#WebUIDataSourceUtils)。

<a id="webuimessagehandler"></a>
<a id="WebUIMessageHandler"></a>

### WebUIMessageHandler

消息较多或共享发送代码时，常拆成独立 handler，响应指定 JavaScript 调用。下面的 C++：

```c++
void OvenHandler::RegisterMessages() {
  web_ui()->RegisterMessageCallback(
      "bakeDonuts",
      base::BindRepeating(&OvenHandler::HandleBakeDonuts,
                          base::Unretained(this)));
}

void OvenHandler::HandleBakeDonuts(const base::ListValue& args) {
  AllowJavascript();

  // IMPORTANT: Fully validate `args`.
  CHECK_EQ(1u, args.size());
  int num_donuts = args[0].GetInt();
  CHECK_GT(num_donuts, 0);
  GetOven()->BakeDonuts(num_donuts);
}
```

可由以下 JavaScript 触发：

```js
$('bakeDonutsButton').onclick = function() {
  chrome.send('bakeDonuts', [5]);  // bake 5 donuts!
};
```

<a id="data-sources"></a>
<a id="DataSources"></a>

## 数据源

<a id="webuidatasourcecreateandadd"></a>

### WebUIDataSource::CreateAndAdd()

创建并加入数据源的工厂方法，第一个参数为 browser context，第二个通常为页面 host。调用方不拥有返回对象。此方法会覆盖同名已有数据源。

> 调用 Add() 后继续保留 WebUIDataSource 引用是不安全的，不要这样做。

<a id="webuidatasourceaddlocalizedstring"></a>

### WebUIDataSource::AddLocalizedString()

使用以 IDS 开头、定义在 `.grd` / `.grdp` 的 grit 字符串整数 ID，为字符串设置 key。随后可用 `$i18n{}` 在请求时替换，或由 JavaScript 通过 `loadTimeData.getString()` / `getStringF()` 动态获取。

<a id="webuidatasourceaddlocalizedstrings"></a>

### WebUIDataSource::AddLocalizedStrings()

大量字符串用数组批量添加，避免重复调用单条方法：

```c++
  static constexpr webui::LocalizedString kStrings[] = {
      // Localized strings (alphabetical order).
      {"actionMenuDescription", IDS_HISTORY_ACTION_MENU_DESCRIPTION},
      {"ariaRoleDescription", IDS_HISTORY_ARIA_ROLE_DESCRIPTION},
      {"bookmarked", IDS_HISTORY_ENTRY_BOOKMARKED},
  };
  source->AddLocalizedStrings(kStrings);
```

<a id="webuidatasourceaddresourcepath"></a>

### WebUIDataSource::AddResourcePath()

使用以 IDR 开头、定义在 `.grd` / `.grdp` 的资源整数 ID，将资源加入指定路径。

通常应为空路径指定兜底资源，响应 `chrome://history`、`chrome://history/pathThatDoesNotExist`。但像 `chrome://history/file_that_does_not_exist.js` 这样看起来请求具体文件的地址，不返回兜底。这让用户输错子页面路径时回到主页面，同时使错误的源码 import 明确失败，便于定位。

<a id="webuidatasourceaddresourcepaths"></a>

### WebUIDataSource::AddResourcePaths()

批量添加资源路径，代替多次单条调用：

```c++
  static constexpr webui::ResourcePath kResources[] = {
      {"browser_api.js", IDR_BROWSER_API_JS},
      {"constants.js", IDR_CONSTANTS_JS},
      {"controller.js", IDR_CONTROLLER_JS},
  };
  source->AddResourcePaths(kResources);
```

也可以直接使用 grit 自动生成的资源映射数组。例如 `print_preview_resources_map.h` 中的 `webui::ResourcePath` 数组 `kPrintPreviewResources`：

```c++
  source->AddResourcePaths(kPrintPreviewResources);
```

<a id="webuidatasourceaddboolean"></a>

### WebUIDataSource::AddBoolean()

页面判断 feature 是否启用时可使用它，然后在 JavaScript 读取：

```js
if (loadTimeData.getBoolean('myFeatureIsEnabled')) {
  ...
}
```

> 刷新不会重建数据源，Chrome 运行期间变化的值可能过期。动态值更适合用 `sendWithPromise()` 初始化，再用 `FireWebUIListener()` 更新。若确实使用 AddBoolean，应在值变化时调用 `WebUIDataSource::Update()`。这些通信接口属于下文的旧方案；新页面遵循 Mojo 路径。

<a id="webui-utils-for-working-with-data-sources"></a>
<a id="WebUIDataSourceUtils"></a>

## 数据源辅助工具

`chrome/browser/ui/webui/webui_util.*` 提供简化常见配置的方法。

<a id="webuisetupwebuidatasource"></a>

### webui::SetupWebUIDataSource()

为使用 JS module 的 WebUI 执行通用配置，应复用而非重复实现。它设置 CSP，仅允许加载自身 host、chrome://resources、供测试使用的 chrome://webui-test；调用 `UseStringsJs()`、`EnableReplaceI18nInJS()` 启用 i18n 替换；加入测试 loader，使测试文件能作为 module 加载；配置空路径资源；加入 GritResourceMap 中全部资源。

<a id="browser-c-and-renderer-js-communication"></a>

## Browser（C++）与 Renderer（JS）通信

<a id="mojo"></a>

### Mojo

Chromium 广泛使用 [Mojo](https://chromium.googlesource.com/chromium/src/+/master/mojo/README.md) 进行 IPC，新 WebUI 应采用它连接 C++ 与 JS / TS。需要定义 mojom 接口，在 BUILD.gn 添加生成 C++、TypeScript bindings 的目标，在 C++ 绑定并实现收发方法，再将 TypeScript bindings 加入 `ts_library()` 并使用。

<a id="mojo-interface-definition"></a>

#### 定义 Mojo 接口

WebUI 的 mojom 通常与 C++ 同放在 `chrome/browser/ui/webui`。

`chrome/browser/ui/webui/donuts/donuts.mojom`：

```
module donuts.mojom;

// Factory ensures that the Page and PageHandler interfaces are always created
// together without requiring an initialization call from the WebUI to the
// handler.
interface PageHandlerFactory {
  CreatePageHandler(pending_remote<Page> page,
                    pending_receiver<PageHandler> handler);
};

// Called from TS side of chrome://donuts (Renderer -> Browser)
interface PageHandler {
  StartPilotLight();

  BakeDonuts(uint32 num_donuts);

  // Expects a response from the browser.
  GetNumberOfDonuts() => (uint32 num_donuts);
};

// Called from C++ side of chrome://donuts. (Browser -> Renderer)
interface Page {
  DonutsBaked(uint32 num_donuts);
};
```

<a id="buildgn-mojo-target"></a>

#### BUILD.gn 中的 Mojo 目标

`mojom()` 规则生成 bindings。

`chrome/browser/ui/webui/donuts/BUILD.gn`：

```python
import("//mojo/public/tools/bindings/mojom.gni")

mojom("mojo_bindings") {
  sources = [ "donuts.mojom" ]
  webui_module_path = "/"
}
```

<a id="setting-up-c-bindings"></a>

#### 配置 C++ bindings

Controller 应继承 `ui::MojoWebUIController` 和 mojom 定义的 PageHandlerFactory。

`chrome/browser/ui/webui/donuts/donuts_ui.h`：

```c++
class DonutsPageHandler;

class DonutsUI : public ui::MojoWebUIController,
                 public donuts::mojom::PageHandlerFactory {
 public:
  explicit DonutsUI(content::WebUI* web_ui);

  DonutsUI(const DonutsUI&) = delete;
  DonutsUI& operator=(const DonutsUI&) = delete;

  ~DonutsUI() override;

  // Instantiates the implementor of the mojom::PageHandlerFactory mojo
  // interface passing the pending receiver that will be internally bound.
  void BindInterface(
      mojo::PendingReceiver<donuts::mojom::PageHandlerFactory> receiver);

 private:
  // donuts::mojom::PageHandlerFactory:
  void CreatePageHandler(
      mojo::PendingRemote<donuts::mojom::Page> page,
      mojo::PendingReceiver<donuts::mojom::PageHandler> receiver) override;

  std::unique_ptr<DonutsPageHandler> page_handler_;

  mojo::Receiver<donuts::mojom::PageHandlerFactory> page_factory_receiver_{
      this};

  WEB_UI_CONTROLLER_TYPE_DECL();
};
```

`chrome/browser/ui/webui/donuts/donuts_ui.cc`：

```c++
DonutsUI::DonutsUI(content::WebUI* web_ui)
    : ui::MojoWebUIController(web_ui, true) {
  // Normal constructor steps (e.g. setting up data source) go here.
}

WEB_UI_CONTROLLER_TYPE_IMPL(DonutsUI)

DonutsUI::~DonutsUI() = default;

void DonutsUI::BindInterface(
    mojo::PendingReceiver<donuts::mojom::PageHandlerFactory> receiver) {
  page_factory_receiver_.reset();
  page_factory_receiver_.Bind(std::move(receiver));
}

void DonutsUI::CreatePageHandler(
    mojo::PendingRemote<donuts::mojom::Page> page,
    mojo::PendingReceiver<donuts::mojom::PageHandler> receiver) {
  DCHECK(page);
  page_handler_ = std::make_unique<DonutsPageHandler>(
      std::move(receiver), std::move(page));
}
```

还需在 `chrome/browser/chrome_browser_interface_binders_webui.cc` 或对应 `chrome_browser_interface_binders_webui_parts_foo.cc`，为 controller 注册 PageHandlerFactory：

```c++
RegisterWebUIControllerInterfaceBinder<donuts::mojom::PageHandlerFactory,
                                       DonutsUI>(map);
```

<a id="using-c-bindings-for-communication"></a>

#### 使用 C++ bindings 通信

Message handler 应继承 Mojo PageHandler。

`chrome/browser/ui/webui/donuts/donuts_page_handler.h`：

```c++
#include "chrome/browser/ui/webui/donuts/donuts.mojom.h"
#include "mojo/public/cpp/bindings/receiver.h"
#include "mojo/public/cpp/bindings/remote.h"

class DonutsPageHandler : public donuts::mojom::PageHandler {
 public:
  DonutsPageHandler(
      mojo::PendingReceiver<donuts::mojom::PageHandler> receiver,
      mojo::PendingRemote<donuts::mojom::Page> page);

  DonutsPageHandler(const DonutsPageHandler&) = delete;
  DonutsPageHandler& operator=(const DonutsPageHandler&) = delete;

  ~DonutsPageHandler() override;

  // Triggered by some outside event
  void OnBakingDonutsFinished(uint32_t num_donuts);

  // donuts::mojom::PageHandler:
  void StartPilotLight() override;
  void BakeDonuts(uint32_t num_donuts) override;
  void GetNumberOfDonuts(GetNumberOfDonutsCallback callback) override;

 private:
  mojo::Receiver<donuts::mojom::PageHandler> receiver_;
  mojo::Remote<donuts::mojom::Page> page_;
};
```

并实现 PageHandler 全部方法。

`chrome/browser/ui/webui/donuts/donuts_page_handler.cc`：

```c++
DonutsPageHandler::DonutsPageHandler(
    mojo::PendingReceiver<donuts::mojom::PageHandler> receiver,
    mojo::PendingRemote<donuts::mojom::Page> page)
    : receiver_(this, std::move(receiver)),
      page_(std::move(page)) {
}

DonutsPageHandler::~DonutsPageHandler() {
  GetOven()->TurnOffGas();
}

// Triggered by outside asynchronous event; sends information to the renderer.
void DonutsPageHandler::OnBakingDonutsFinished(uint32_t num_donuts) {
  page_->DonutsBaked(num_donuts);
}

// Triggered by startPilotLight() call in TS.
void DonutsPageHandler::StartPilotLight() {
  GetOven()->StartPilotLight();
}

// Triggered by bakeDonuts() call in TS.
void DonutsPageHandler::BakeDonuts(uint32_t num_donuts) {
  GetOven()->BakeDonuts();
}

// Triggered by getNumberOfDonuts() call in TS; sends a response back to the
// renderer.
void DonutsPageHandler::GetNumberOfDonuts(GetNumberOfDonutsCallback callback) {
  uint32_t result = GetOven()->GetNumberOfDonuts();
  std::move(callback).Run(result);
}
```

<a id="setting-up-typescript-bindings"></a>

#### 配置 TypeScript bindings

使用 `build_webui()` 时，加入下面的参数，将 bindings 编入并从根路径提供，例如 `chrome://donuts/donuts.mojom-webui.js`。

`chrome/browser/resources/donuts/BUILD.gn`：

```python
import("//ui/webui/resources/tools/build_webui.gni")

build_webui("build") {
  grd_prefix = "donuts"

  ts_files = [ "donuts.ts" ]

  ts_deps = [ "//ui/webui/resources/mojo:build_ts" ]

  mojo_files_deps =
      [ "//chrome/browser/ui/webui/donuts:mojo_bindings_ts__generator" ]
  mojo_files = [
    "$root_gen_dir/chrome/browser/ui/webui/donuts/donuts.mojom-webui.ts",
  ]
}
```

当 mojom 定义了创建 page handler 的 factory，例如 PageHandlerFactory 的 CreatePageHandler，生成的 `donuts.mojom-webui.ts` 会导出 `browserProxyFactory` 单例工厂和 BrowserProxy 接口。模板实现见 `ui/webui/resources/mojo/mojo_browser_proxy`。

原文根据是否声明 `Page {}` 区分单向、双向通信：有 Page 时，MojoBrowserProxy 同时有 handler 与 callbackRouter；没有 Page 时，MojoHandlerProxy 只有 handler。应用通过 `browserProxyFactory.getInstance()` 获取当前实例。

双向通信测试通过 `createForTest` 注入测试 handler，自动配置 callbackRouter，再将结果传给 `setInstance()`，也可在测试中访问 router。单向场景无需 router，直接用测试 handler 对应实例调用 `setInstance()`。

生成的 BrowserProxy 接口包含用于调用 C++ receiver 的 `.handler`，双向场景还包含接收 C++ 事件的 `.callbackRouter`。

> 译注：原文将只有 handler 的方向写成 browser → renderer，与紧接着的接口说明矛盾。结合 [Mojo browser proxy 源码](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/ui/webui/resources/mojo/mojo_browser_proxy.ts)核对，按这里的 PageHandlerRemote，handler 调用方向是 renderer → browser；PageCallbackRouter 才承接 browser → renderer 的主动通知。带响应的 handler 方法仍可异步返回结果，不等于有独立 Page 通知接口。

<a id="using-typescript-bindings-for-communication"></a>

#### 使用 TypeScript bindings 通信

PageCallbackRouter 用来监听 browser 发来的异步事件。PageHandlerRemote 用来从 renderer 向 browser 发消息；要求响应的方法返回 Promise，由 browser 回复兑现。

`chrome/browser/resources/donuts/donuts.ts`：

```ts
import {browserProxyFactory} from './donuts.mojom-webui.js';

let numDonutsBaked: number = 0;

window.onload = function() {
  // Other page initialization steps go here
  const proxy = browserProxyFactory.getInstance();
  // Tells the browser to start the pilot light.
  proxy.handler.startPilotLight();
  // Adds a listener for the asynchronous "donutsBaked" event.
  proxy.callbackRouter.donutsBaked.addListener(
    (numDonuts: number) => {
      numDonutsBaked += numDonuts;
    });
};

function CheckNumberOfDonuts() {
  // Requests the number of donuts from the browser, and alerts with the
  // response.
  browserProxyFactory.getInstance().handler.getNumberOfDonuts().then(
      (numDonuts: number) => {
        alert('Yay, there are ' + numDonuts + ' delicious donuts left!');
      });
}

function BakeDonuts(numDonuts: number) {
  // Tells the browser to bake |numDonuts| donuts.
  browserProxyFactory.getInstance().handler.bakeDonuts(numDonuts);
}
```

<a id="pre-mojo-alternative-chromesendwebuimessagehandler"></a>

### Mojo 之前的方案：chrome.send() / WebUIMessageHandler

**此方案已弃用，新页面必须使用 [Mojo](#mojo)。旧页面可以保留，但不应新增 chrome.send() 用法。**

许多 WebUI 早于 Mojo，因此使用这套旧模式。以下章节说明如何阅读与维护这些代码。

<a id="webuimessagehandlerallowjavascript"></a>
<a id="AllowJavascript"></a>

#### WebUIMessageHandler::AllowJavascript()

设置标签页可能刷新，或导航到外部来源。两种情况下都不应继续执行旧 C++ 回调：刷新后 JavaScript 可能尚未准备好；导航后则可能向不可信来源泄漏敏感信息。

每个 handler 因而维护 [javascript_allowed_](https://cs.chromium.org/search/?q=WebUIMessageHandler::javascript_allowed_)。应在处理 JS 请求时调用 AllowJavascript，因为该请求表明页面已准备好接收后续回调。见[设计文档](https://drive.google.com/open?id=1z1diKvwgMmn4YFzlW1kss0yHmo8yy68TN_FUhUzRz7Q)。刷新、导航时，[DisallowJavascript](https://cs.chromium.org/search/?q=WebUIMessageHandler::DisallowJavascript) 清除标志。

每次 C++ 回调前须检查 [IsJavascriptAllowed](https://cs.chromium.org/search/?q=WebUIMessageHandler::IsJavascriptAllowed)，为 false 就丢弃。此时调用 [ResolveJavascriptCallback](https://cs.chromium.org/search/?q=WebUIMessageHandler::ResolveJavascriptCallback) 会崩溃，见[设计说明](https://docs.google.com/document/d/1udXoW3aJL0-l5wrbsOg5bpYWB0qOCW5K7yXpv4tFeA8)。

还需注意 [ABA 问题](https://en.wikipedia.org/wiki/ABA_problem)：异步操作启动后页面刷新，用户又使用原 handler 发起新操作，标志重新为 true，但旧回调仍应丢弃。刷新设置 UI 不一定删除 handler 对象。因此可以重写 [OnJavascriptDisallowed](https://cs.chromium.org/search/?q=WebUIMessageHandler::OnJavascriptDisallowed) 取消待处理回调。

JavaScript：

```js
window.onload = function() {
  app.initialize();
  chrome.send('startPilotLight');
};
```

C++：

```c++
void OvenHandler::HandleStartPilotLight(const base::ListValue& /*args*/) {
  AllowJavascript();
  // CallJavascriptFunction() and FireWebUIListener() are now safe to do.
  GetOven()->StartPilotLight();
}
```

> load 事件或 browser 侧导航回调无法涵盖应用特定初始化，往往需要自定义 initialized 消息。

<a id="webuimessagehandlercalljavascriptfunction"></a>
<a id="CallJavascriptFunction"></a>

#### WebUIMessageHandler::CallJavascriptFunction()

Browser 可以用它通知事件或执行 renderer 中的代码，前提是[允许 JavaScript](#AllowJavascript)。

```c++
void OvenHandler::OnPilotLightExtinguished() {
  CallJavascriptFunction("app.pilotLightExtinguished");
}
```

它构造待执行字符串，将参数序列化为 JSON，包装为：

```c++
// See WebUI::GetJavascriptCall() for specifics:
"functionCallName(" + argumentsAsJson + ")"
```

原文通过 `FrameMsg_JavaScriptExecuteRequest` IPC 发给 renderer。

这要求全局方法存在，且允许任意参数调用任意方法，权限超出多数需求，因此使用减少。更合适的旧模式替代包括：[FireWebUIListener](#FireWebUIListener) 配合 [addWebUiListener](#addWebUiListener) 发送松耦合事件，无人处理也不会出错；[ResolveJavascriptCallback](#ResolveJavascriptCallback)、[RejectJavascriptCallback](#RejectJavascriptCallback) 则响应 JS 对 C++ 权威状态的查询，例如是否启用自动填充、是否隐身。

<a id="webuimessagehandlerfirewebuilistener"></a>
<a id="FireWebUIListener"></a>

#### WebUIMessageHandler::FireWebUIListener()

通知已注册监听者发生了事件，适合时间不可预测或由用户行为触发的变化。主题变化的 JS 示例：

```js
addWebUiListener("theme-changed", refreshThemeStyles);
```

C++ 触发：

```c++
void MyHandler::OnThemeChanged() {
  FireWebUIListener("theme-changed");
}
```

用户何时换主题、选什么主题不可预测，因此适合事件监听。若只需查询并返回结果，使用 [sendWithPromise](#sendWithPromise) 与 [ResolveJavascriptCallback](#ResolveJavascriptCallback)。

<a id="webuimessagehandleronjavascriptallowed"></a>

#### WebUIMessageHandler::OnJavascriptAllowed()

这是响应 [AllowJavascript](#AllowJavascript) 的生命周期方法，适合注册全局服务 observer 或其他不定时回调。

> 译注：原文此节正文误写成 OnJavascriptDisallowed；按标题、示例及 [WebUIMessageHandler 接口注释](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/content/public/browser/web_ui_message_handler.h)，应为 OnJavascriptAllowed。

下面的初始化方式不安全：

```c++
class MyHandler : public content::WebUIMessageHandler {
  MyHandler() {
    GetGlobalService()->AddObserver(this);  // <-- DON'T DO THIS.
  }
  void OnGlobalServiceEvent() {
    FireWebUIListener("global-thing-happened");
  }
};
```

Browser 侧 handler 早于 renderer 就绪，可能过早调用 FireWebUIListener，导致更新丢失，或向已导航到新 URL 的 renderer 执行 JS。更安全的方式是：

```c++
class MyHandler : public content::WebUIMessageHandler {
 public:
  void OnJavascriptAllowed() override {
    observation_.Observe(GetGlobalService());  // <-- DO THIS.
  }
  void OnJavascriptDisallowed() override {
    observation_.Reset();  // <-- AND THIS.
  }
  base::ScopedObservation<MyHandler, GlobalService> observation_{this};  // <-- ALSO HANDY.
```

等 renderer 创建、文档加载到能够主动告诉 C++ 已准备好时，再建立监听。

<a id="webuimessagehandleronjavascriptdisallowed"></a>

#### WebUIMessageHandler::OnJavascriptDisallowed()

无法确定向 renderer 发 JS 消息是否安全时，此生命周期方法用于处理状态变化。相关情况包括 renderer 尚不存在、尚未就绪、应用 JS 尚未就绪、刷新、renderer 崩溃。也可以程序化禁用 JavaScript，但通常不必主动这样做。

排队还是丢弃消息没有适合所有场景的统一策略，因此由应用通过这些生命周期方法自行决定。通常在此断开 observer：

```c++
void OvenHandler::OnJavascriptDisallowed() {
  scoped_oven_observation_.Reset()
}
```

不能保证 handler 析构前一定调用它，因此宜使用析构时自动退订、同时支持此处显式退订的 scoped observer。

<a id="webuimessagehandlerrejectjavascriptcallback"></a>
<a id="RejectJavascriptCallback"></a>

#### WebUIMessageHandler::RejectJavascriptCallback()

响应 [sendWithPromise](#sendWithPromise)，拒绝对应 Promise，使拒绝处理链，包括 [catch](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch)，得以执行。

```c++
void OvenHandler::HandleBakeDonuts(const base::ListValue& args) {
  AllowJavascript();
  if (!GetOven()->HasGas()) {
    RejectJavascriptCallback(args[0],
                             base::StringValue("need gas to cook the donuts!"));
  }
```

本质是 CallJavascriptFunction 的包装，以 success=false 调用全局 `cr.webUIResponse`：

```c++
// WebUIMessageHandler::RejectJavascriptCallback():
CallJavascriptFunction("cr.webUIResponse", callback_id, base::Value(false),
                       response);
```

另见 [ResolveJavascriptCallback](#ResolveJavascriptCallback)。

> 译注：原文把 Promise 的拒绝、兑现处理回调称为 executor 中的回调，术语不准确。Executor 是创建 Promise 时同步执行的函数；此处改变 Promise 状态，随后执行已注册的 reaction。

<a id="webuimessagehandlerresolvejavascriptcallback"></a>
<a id="ResolveJavascriptCallback"></a>

#### WebUIMessageHandler::ResolveJavascriptCallback()

响应 sendWithPromise，兑现 Promise，通常携带值，并触发相关兑现处理和 [then](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) 链。

TypeScript：

```js
sendWithPromise('bakeDonuts', [5]).then(function(numDonutsBaked: number) {
  shop.donuts += numDonutsBaked;
});
```

C++：

```c++
void OvenHandler::HandleBakeDonuts(const base::ListValue& args) {
  AllowJavascript();
  double num_donuts_baked = GetOven()->BakeDonuts();
  ResolveJavascriptCallback(args[0], base::Value(num_donuts_baked));
}
```

<a id="chromesend"></a>
<a id="chrome_send"></a>

#### chrome.send()

创建 JS window 对象时，检查 renderer 是否具有 [WebUI bindings](#bindings)：

```c++
// RenderFrameImpl::DidClearWindowObject():
if (enabled_bindings_.Has(BindingsPolicyValue::kWebUi))
  WebUIExtension::Install(frame_);
```

若具有，则暴露全局 chrome.send：

```c++
// WebUIExtension::Install():
v8::Local<v8::Object> chrome = GetOrCreateChromeObject(isolate, context);
chrome->Set(gin::StringToSymbol(isolate, "send"),
            gin::CreateFunctionTemplate(
                isolate,
                base::BindRepeating(&WebUIExtension::Send))->GetFunction());
```

它接受消息名和参数列表：

```js
chrome.send('messageName', [arg1, arg2, ...]);
```

原文中，消息名与参数序列化为 JSON，通过 `FrameHostMsg_WebUISend` IPC 从 renderer 发往 browser：

```c++
// In the renderer (WebUIExtension::Send()):
render_frame->Send(new FrameHostMsg_WebUISend(render_frame->GetRoutingID(),
                                              frame->GetDocument().Url(),
                                              message, *content));
```

```c++
// In the browser (WebUIImpl::OnMessageReceived()):
IPC_MESSAGE_HANDLER(FrameHostMsg_WebUISend, OnWebUISend)
```

Browser 按消息名查 map，将反序列化后的参数传给 callback：

```c++
// WebUIImpl::ProcessWebUIMessage():
message_callbacks_.find(message)->second.Run(&args);
```

<a id="addwebuilistener"></a>
<a id="addWebUiListener"></a>

#### addWebUiListener()

供 C++ 向 JS 通知事件。旧代码为通知、响应暴露许多全局方法，污染命名空间，也难以停止监听。因此在这套旧通信体系内，更推荐 addWebUiListener。

与 sendWithPromise 类似，它生成唯一 ID 并放入 JS map，可从 `chrome://resources/js/cr.js` 导入：

```js
// addWebUiListener():
webUIListenerMap[eventName] = webUIListenerMap[eventName] || {};
webUIListenerMap[eventName][createUid()] = callback;
```

C++ 调用全局 `cr.webUIListenerCallback`，传入事件名和可变数量参数：

```c++
// WebUIMessageHandler:
template <typename... Values>
void FireWebUIListener(const std::string& event_name, const Values&... values) {
  CallJavascriptFunction("cr.webUIListenerCallback", base::Value(event_name),
                         values...);
}
```

需要通知标签页时，handler 调用 FireWebUIListener：

```c++
void OvenHandler::OnBakingDonutsFinished(size_t num_donuts) {
  FireWebUIListener("donuts-baked", base::Value(num_donuts));
}
```

TypeScript 监听：

```js
let donutsReady: number = 0;
addWebUiListener('donuts-baked', function(numFreshlyBakedDonuts: number) {
  donutsReady += numFreshlyBakedDonuts;
});
```

<a id="sendwithpromise"></a>
<a id="sendWithPromise"></a>

#### sendWithPromise()

这是 chrome.send 的包装，用于需要响应的请求：

```js
chrome.send('getNumberOfDonuts');  // No easy way to get response!
```

旧页面为接收响应而暴露全局方法，不推荐这种方式：污染全局、难以关联具体请求，也不便于深层代码使用。采用 Promise 包装后可以写成：

```js
sendWithPromise('getNumberOfDonuts').then(function(numDonuts: number) {
  alert('Yay, there are ' + numDonuts + ' delicious donuts left!');
});
```

它可从 `chrome://resources/js/cr.js` 导入。C++ 注册类似 chrome.send，但参数列表第一个值是 callback ID，将它传给 ResolveJavascriptCallback，最终兑现 JS Promise 并触发 then：

```c++
void DonutHandler::HandleGetNumberOfDonuts(const base::ListValue& args) {
  AllowJavascript();

  const base::Value& callback_id = args[0];
  size_t num_donuts = GetOven()->GetNumberOfDonuts();
  ResolveJavascriptCallback(callback_id, base::Value(num_donuts));
}
```

内部在 JavaScript 保存 Promise map。Callback ID 是带命名空间的递增编号，创建时用于入表：

```js
// sendWithPromise():
var id = methodName + '_' + uidCounter++;
chromeSendResolverMap[id] = new PromiseResolver;
chrome.send(methodName, [id].concat(args));
```

结果已知时，用该 ID 查找并 reject / resolve：

```js
// cr.webUIResponse():
var resolver = chromeSendResolverMap[id];
if (success)
  resolver.resolve(response);
else
  resolver.reject(response);
```

仍需 C++ 调用全局方法，但只暴露一个 `cr.webUIResponse`，而非大量方法，也更容易支持多个同时在途请求的独立响应。

<a id="security-considerations"></a>

## 安全注意事项

WebUI 权限高，控制它有时足以逃出 Chrome 沙箱，因此常成为攻击目标。为安全使用特殊能力，WebUI 不能直接嵌入 HTTP(S) 资源，也不能发起 HTTP(S) fetch。

少数确需 Web 内容的场景，可用 iframe 利用进程隔离，但仍需防范跨源可访问的信息被恶意内容利用：WebUI 可以收到来自网页的 postMessage，必须验证不可信消息；嵌入内容可观察 frame tree 信息，包括 ancestor origins；它与 WebUI 使用同一 StoragePartition、Profile，例如默认或隐身 profile，所以相应凭据也可能可用，用户可能处于登录状态。

默认 CSP 禁止嵌入 frame。如需 iframe，必须修改策略，只放行已知来源，保持最小必要范围。

另一选择是桌面可用的 `<webview>`，它使用独立 StoragePartition、独立 frame tree，默认限制 postMessage 通信。

<a id="error-reporting"></a>

## 错误报告

默认情况下，WebUI 的 DevTools 错误会生成报告，出现在 Google 内部 [go/crash](http://go/crash)。此功能仅用于 Google Chrome 构建，不用于 Chromium 或其他衍生浏览器。

WebUI chrome:// 页面出现未捕获异常、未处理的 Promise 拒绝、`console.error()`，或其他 [error 级别 DevTools 消息](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/public/mojom/devtools/console_message.mojom;l=11;drc=047c7dc4ee1ce908d7fea38ca063fa2f80f92c77)，例如失败的 WebSocket，都会触发。

它们与其他崩溃一起显示，product data 类型为 [JavascriptError](https://crash.corp.google.com/browse?q=product_name%3D%27Chrome_Mac%27+AND+EXISTS+%28SELECT+1+FROM+UNNEST%28productdata%29+WHERE+key%3D%27type%27+AND+value%3D%27JavascriptError%27%29&stbtiq=&reportid=&index=0)，本地也可在 chrome://crashes 查看。

错误签名由消息和发生 URL 组成。例如 settings/lazy_load.js 抛出未捕获 TypeError，消息为 `Cannot read properties of null (reading 'select')`，签名为：

```
Uncaught TypeError: Cannot read properties of null (reading 'select') (chrome://settings)
```

避免泛滥，同一消息每小时最多生成一份报告。若是预期情况，例如 Wi-Fi 不可用且页面已向用户展示错误，应考虑将 console.error 改为 console.warn。

需要修改产品名或附加数据时，可用 `CrashReportPrivate.reportError()`，同时重写 `WebUIController::IsJavascriptErrorReportingEnabled()` 返回 false，避免重复报告。

<a id="are-javascript-errors-actually-crashes"></a>

### JavaScript 错误真的是崩溃吗？

默认不是 C++ 意义的崩溃，不会结束进程或显示 sad tab。某些工具沿用 crash 一词，只因它们经过原本用于 C++ 崩溃的同一上报流水线。可选择真正崩溃，见[下节](#optionally-crash-the-browser-on-javascript-errors)。

<a id="optionally-crash-the-browser-on-javascript-errors"></a>

### 可选：JavaScript 错误使浏览器崩溃

开发构建可启用此行为，帮助开发与自动化测试发现错误。官方 Canary / Dev / Beta / Stable 构建不会因此崩溃。

在 WebUIConfig 重写 [ShouldCrashOnJavascriptErrorInDevelopmentBuild](https://source.chromium.org/chromium/chromium/src/+/main:content/public/browser/webui_config.h;l=56;drc=202535bf687e3d52636f0722b529ff31962f2c05)，返回 true：

```cpp
class MyUIConfig : public content::WebUIConfig {
  ...
  bool ShouldCrashOnJavascriptErrorInDevelopmentBuild() const override {
    return true;
  }
};
```

开发构建需要暂时跳过时，启动参数加 `--disable-crash-on-webui-js-error`。

<a id="how-much-impact-does-this-javascript-error-have"></a>

### 错误影响有多大？

取决于具体错误。有些不影响用户，例如上述不可用 Wi-Fi 的日志；有些阻断关键操作，例如设置页原本需由 JS 显示某个变体，但在显示前发生未处理异常，导致空白、无法修改设置。

由于难以自动判断严重程度，原文在稳定性指标中将全部 JS 错误归为 WARNING。

<a id="known-issues"></a>

### 已知问题

1. Android 不支持此错误报告。
2. 仅支持创建 WebUI 对象的 chrome:// 页面，不包括 chrome://dino、chrome://network-error，也不支持 chrome-untrusted://、chrome-extension://。
3. 未处理 Promise rejection 缺少良好堆栈。
4. 堆栈行列号对应压缩后的 JS，而非原始源码。
5. 带动态字符串的错误不易聚合，例如包含网络名称时，每个名称形成不同签名。

<a id="see-also"></a>

## 另请参阅

- C++ 遵循 [Chromium C++ 风格指南](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/styleguide/c%2B%2B/c%2B%2B.md)。
- HTML / CSS / JS 遵循 [Web 开发风格指南](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/styleguide/web/web.md)和 [WebUI Lit 风格指南](webui_lit_style_guide.md)。
- 页面测试见 [Testing WebUI](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/webui/testing_webui.md)。
- 控件示例见 `chrome://webui-gallery`，[源码](https://source.chromium.org/chromium/chromium/src/+/main:chrome/browser/resources/webui_gallery/)。

> 译注：原文页首样式和页尾检查锚点的脚本用于原站文档展示，不属于 WebUI 示例。中文 Markdown 不内嵌执行这两段页面脚本，示例代码块均保留。
