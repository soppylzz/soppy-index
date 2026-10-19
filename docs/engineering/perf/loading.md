# 首屏资源：先缩短关键链，再减少无关工作

首屏图片只有 50 KB，却在打开页面几秒后才开始下载，继续压缩图片未必解决问题。先找浏览器什么时候知道它需要这张图片。

## 资源发现决定等待的起点

HTML 可以直接暴露图片和样式；如果先下载 JS，再请求数据，再生成图片，便多了串行依赖。图片类 LCP 可按首字节等待、资源加载延迟、资源传输、元素渲染延迟拆解，逐段判断。

普通经典 script 会阻塞解析；defer 在解析后按序执行；async 就绪后尽快执行、顺序不保证；module 默认延后执行并加载依赖图。详细机制见[浏览器加载](../../browser/loading/README.md)。

Preload 提前取当前页面必要资源，modulepreload 面向模块，preconnect 提前建连，prefetch 面向可能的后续使用。Fetchpriority 只是提示，过多高优先级会让资源互相竞争；URL、CORS 模式等不匹配还可能重复下载。

样式通常参与首次渲染的阻塞链，解析阶段的脚本还可能等待先前样式。关键 CSS 可以缩短首屏等待，非关键样式延后则要防闪烁、重复和顺序变化。`dns-prefetch` 只提前解析域名，不会完成 TLS 建连。

## 图片和字体不仅消耗字节

图片候选应匹配显示尺寸与设备像素比，用 srcset/sizes 描述大小，picture 处理格式或构图。JPEG、WebP、AVIF 等按压缩、质量和解码成本选择；SVG 适合矢量图形。

非首屏图片可懒加载，LCP 图片应尽早发现，通常不懒加载；提供 width/height 或 aspect-ratio 预留空间。背景图要等待样式发现，且不能直接获得 img 的语义和加载能力。

字体子集与 WOFF2 减少传输，font-display 决定等待期间如何显示。Swap 可先显示 fallback，但度量变化仍可能导致 CLS；匹配字体度量有助于减少切换位移。仅预加载首屏必需字体，变量字体是否省流量取决于使用字重和实际文件。

PNG 适合需要无损或透明像素的图像，`decoding` 可表达解码偏好，但不保证具体呈现时刻。格式、预加载与解码策略最终都要以真实视觉质量和时间线验证。

字体等待期间不可见称 FOIT，先显示 fallback 再切换称 FOUT。`font-display` 的 block、swap、fallback、optional 在等待与替换之间取舍，系统字体栈则省去字体下载；`unicode-range` 可按实际字形需求选择子集。Fallback 可用 `size-adjust` 与 ascent/descent/line-gap override 调整度量，仍需用真实文本验证换行与高度。

视频可通过 poster 提供占位，并按场景限制预加载；长视频的分段与自适应码率通常比一次传输完整大文件更合适。

## JS 与缓存的两类成本

传输压缩减少网络字节，不能消除解压后的解析、编译与执行。按路由和低频能力拆分，裁剪未用代码后仍应查看 CPU trace，避免只追求 gzip 数字。

HTML 要及时发现新版本，hash 资源可长期缓存；Brotli/gzip 由协商决定，已压缩媒体再次压缩收益有限。304 仍有网络往返，fresh cache 可直接复用。HTTP/2/3 复用后仍要考虑关键链和缓存，不能机械地合并全部资源或拆成很多域名。

CDN 减少回源与距离成本，浏览器缓存减少网络请求，Service Worker 提供程序化策略。后者要处理首次控制、waiting、更新与旧页兼容，不能假设安装后所有访问都会更快。

## 缓存策略要解释新鲜度与更新

Cache-first 优先命中速度，network-first 优先在线新鲜度，stale-while-revalidate 允许先返回旧值再后台更新；是否可用取决于业务允许的陈旧程度。HTTP 的同名缓存指令与 Service Worker 手写策略处在不同层，不能只配一处就假定全部一致。

Precache 准备构建时已知资源，runtime cache 随实际请求积累。两者都需要容量、过期和清理；立即 skipWaiting 可能让旧页被新策略接管，须配合版本与刷新体验。验证首次访问、更新、离线、旧页和缓存损坏，而不只测试“断网能打开”。

缓存观测区分浏览器复用、CDN hit/miss 和回源，必要时结合 Age 与重新验证记录；服务端请求减少不能单独证明所有用户命中率提高。

机制细节见 [HTTP 缓存](../../browser/cache/http-cache.md)、[Service Worker](../../browser/pwa/serviceWorker.md)，实践入口见 [LCP 优化](https://web.dev/articles/optimize-lcp)、[字体实践](https://web.dev/articles/font-best-practices)。
