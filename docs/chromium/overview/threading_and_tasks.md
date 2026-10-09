> 英文原文：[本地副本](../en/overview/threading_and_tasks.md) · [Chromium 来源](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/threading_and_tasks.md)。对应本地源码提交 `f5a9dd28d9af`（2026-09-12）；翻译日期：2026-10-09。代码、标识符及源码注释保留原样，译者补充以“译注”标识。

<a id="threading-and-tasks-in-chrome"></a>

# Chrome 中的线程与任务

- [概述](#overview)
  - [快速入门](#quick-start-guide)
- [核心概念](#core-concepts)
- [线程术语](#threading-lexicon)
  - [线程](#threads)
  - [任务](#tasks)
  - [优先使用 Sequence，而非物理线程](#prefer-sequences-to-physical-threads)
- [投递并行任务](#posting-a-parallel-task)
  - [直接投递到线程池](#direct-posting-to-the-thread-pool)
  - [通过 TaskRunner 投递](#posting-via-a-taskrunner)
- [投递有序任务](#posting-a-sequenced-task)
  - [投递到新的 Sequence](#posting-to-a-new-sequence)
  - [投递到当前虚拟线程](#posting-to-the-current-virtual-thread)
- [使用 Sequence 代替锁](#using-sequences-instead-of-locks)
- [将多个任务投递到同一线程](#posting-multiple-tasks-to-the-same-thread)
  - [投递到浏览器进程的主线程或 IO 线程](#posting-to-the-main-thread-or-to-the-io-thread-in-the-browser-process)
  - [投递到渲染器进程的主线程](#posting-to-the-main-thread-in-a-renderer-process)
  - [投递到自定义 SingleThreadTaskRunner](#posting-to-a-custom-singlethreadtaskrunner)
  - [投递到当前线程](#posting-to-the-current-thread)
- [投递到 COM 单线程单元（STA）线程（Windows）](#posting-tasks-to-a-com-single-thread-apartment-sta-thread-windows)
- [已投递任务的内存顺序保证](#memory-ordering-guarantees-for-posted-tasks)
- [用 TaskTraits 标注任务](#annotating-tasks-with-tasktraits)
- [保持浏览器响应](#keeping-the-browser-responsive)
- [延迟投递任务](#posting-a-task-with-a-delay)
  - [延迟执行一次](#posting-a-one-off-task-with-a-delay)
  - [按间隔重复执行](#posting-a-repeating-task-with-a-delay)
- [取消任务](#cancelling-a-task)
  - [使用 base::WeakPtr](#using-baseweakptr)
  - [使用 base::CancelableTaskTracker](#using-basecancelabletasktracker)
- [投递并行 Job](#posting-a-job-to-run-in-parallel)
  - [向运行中的 Job 添加工作](#adding-additional-work-to-a-running-job)
- [测试](#testing)
- [在新进程中使用 ThreadPool](#using-threadpool-in-a-new-process)
- [TaskRunner 所有权：通常不需要依赖注入](#taskrunner-ownership-encourage-no-dependency-injection)
- [FAQ](#faq)
- [内部机制](#internals)
  - [SequenceManager](#sequencemanager)
  - [MessagePump](#messagepump)
  - [RunLoop](#runloop)
  - [任务重入](#task-reentrancy)
- [通用 API](#apis-for-general-use)
  - [SingleThreadTaskExecutor 与 TaskEnvironment](#singlethreadtaskexecutor-and-taskenvironment)
- [MessageLoop 与 MessageLoopCurrent](#messageloop-and-messageloopcurrent)

更多示例见[线程与任务 FAQ](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/threading_and_tasks_faq.md)。

<a id="overview"></a>

## 概述

Chrome 采用[多进程架构](https://www.chromium.org/developers/design-documents/multi-process-architecture)，各进程内部也大量使用线程。本文介绍各进程共用的基础线程系统。首要目标是让浏览器保持快速响应；在没有额外延迟或工作负载要求时，Chrome 追求的是[高度并发，而不一定并行](https://stackoverflow.com/questions/1050222/what-is-the-difference-between-concurrency-and-parallelism#:~:text=Concurrency%20is%20when%20two%20or,e.g.%2C%20on%20a%20multicore%20processor.)。

Chromium 并发机制，尤其是 Sequence 的入门介绍见[演示文稿](https://docs.google.com/presentation/d/1ujV8LjIUyPBmULzdT2aT9Izte8PDwbJi)。本文假定读者熟悉计算机科学中的[线程概念](<https://en.wikipedia.org/wiki/Thread_(computing)>)。

<a id="quick-start-guide"></a>

### 快速入门

- 不要在主线程（浏览器进程中也叫 UI 线程）或 IO 线程（各进程接收 IPC 的线程）执行昂贵计算或阻塞 IO。UI / IO 线程繁忙会造成用户可感知的延迟，应优先把这些工作交给[线程池](#direct-posting-to-the-thread-pool)。
- 避免从不同线程或 sequence 读写同一内存位置，否则会发生[数据竞争](https://en.wikipedia.org/wiki/Race_condition#Data_race)。优先在 sequence 之间传递消息，不推荐以锁等方式代替消息传递。
- 协调位于不同 sequence 的多个对象时，应特别注意对象生命周期。大多数类最好只在一个 sequence 上使用，并通过 [SEQUENCE_CHECKER][4] 或 [base::SequenceBound][5] 强制检查，避免意外的数据竞争。
- 一般应避免 [base::Unretained][1]，通常可以改用[弱指针][2]。
- 优先使用 `std::unique_ptr` 明确所有权。
- 对于跨 sequence、拥有多个所有者的对象，可以使用 [scoped_refptr][3]。不过这通常意味着设计方式不合适，不建议新代码采用。

[1]: https://source.chromium.org/chromium/chromium/src/+/main:base/functional/bind.h;l=169;drc=ef1375f2c9fffa0d9cd664b43b0035c09fb70e99
[2]: https://source.chromium.org/chromium/chromium/src/+/main:base/memory/weak_ptr.h
[3]: https://source.chromium.org/chromium/chromium/src/+/main:base/memory/scoped_refptr.h
[4]: https://source.chromium.org/chromium/chromium/src/+/main:base/sequence_checker.h
[5]: https://source.chromium.org/chromium/chromium/src/+/main:base/threading/sequence_bound.h

<a id="core-concepts"></a>

## 核心概念

- **Task（任务）**：待处理的工作单元，本质上是一个函数指针，可以附带状态。Chrome 中分别通过 `base::BindOnce`、`base::BindRepeating` 创建 `base::OnceCallback`、`base::RepeatingCallback`。见 [Callback 文档](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/callback.md)。
- Task queue（任务队列）：等待处理的任务组成的队列。
- Physical thread（物理线程）：操作系统提供的线程，例如 POSIX 的 pthread、Windows 的 `CreateThread()`。Chrome 的跨平台抽象是 `base::PlatformThread`，一般不应直接使用。
- `base::Thread`：持续处理专属任务队列中的消息，直到 `Quit()` 的物理线程。一般不应自行创建。
- Thread pool（线程池）：共享任务队列的一组物理线程。Chrome 中是 `base::ThreadPoolInstance`，每个进程恰好一个实例，为通过 [`base/task/thread_pool.h`](https://cs.chromium.org/chromium/src/base/task/thread_pool.h) 投递的任务提供服务；很少需要直接使用其 API。
- **Sequence / Virtual thread（序列 / 虚拟线程）**：由 Chrome 管理的执行序列。任意时刻，一个 sequence 上只能运行一个任务，每个任务都能看到此前任务产生的副作用。任务顺序执行，但不同任务可以运行在不同物理线程上。
- Task runner：投递任务的接口，即 `base::TaskRunner`。
- Sequenced task runner：保证任务按投递顺序依次执行，后续任务能看到此前任务的副作用。通常由一个虚拟或物理线程处理，对应继承 `base::TaskRunner` 的 `base::SequencedTaskRunner`。
- Single-thread task runner：进一步保证所有任务由同一物理线程处理，即继承 `base::SequencedTaskRunner` 的 `base::SingleThreadTaskRunner`。应尽可能[优先使用 sequence](#prefer-sequences-to-physical-threads)。

<a id="threading-lexicon"></a>

## 线程术语

下列术语用于衔接通常的线程术语与 Chrome 中的实际用法。初学时若觉得难以理解，可以先读后面的具体章节，再回来查阅。

- Thread-unsafe（非线程安全）：Chrome 中绝大多数类型有意设计为非线程安全，访问必须由外部同步。通常要求所有访问状态的任务投递到同一个 `base::SequencedTaskRunner`，并通过 `SEQUENCE_CHECKER` 成员在调试构建中验证。锁也是一种同步方式，但 Chrome 强烈[优先选择 sequence](#Using-Sequences-Instead-of-Locks)。
- Thread-affine（线程亲和）：必须始终从同一物理线程访问，即同一 `base::SingleThreadTaskRunner`，通常以 `THREAD_CHECKER` 验证。除非第三方 API 或底层依赖有此要求，Chrome 中的类型通常不必具有线程亲和性。由于 `SingleThreadTaskRunner` 也是 `SequencedTaskRunner`，线程亲和是非线程安全类型的一个子集，也称 thread-hostile。
- Thread-safe（线程安全）：可以安全地并行访问。
- Thread-compatible（线程兼容）：const 方法可安全并行访问，非 const 访问或 const / 非 const 混合访问需要同步。Chrome 不提供读写锁，因此其适用场景是以线程安全方式初始化一次、此后永远不变的对象，通常为全局对象。初始化可以发生在启动的单线程阶段，也可以使用类似 `base::NoDestructor` 的线程安全局部静态初始化方式。
- Immutable（不可变）：线程兼容类型的子集，构造后不可修改。
- Sequence-friendly（支持 sequence）：可通过 `base::SequencedTaskRunner` 调用的非线程安全类型。理想情况下所有非线程安全类型都应如此，但旧代码有时在只需要串行访问的场景中，过度要求线程亲和性。见[优先使用 sequence](#prefer-sequences-to-physical-threads)。

<a id="threads"></a>

### 线程

每个 Chrome 进程都有以下线程：

- 主线程：浏览器进程中为 `BrowserThread::UI`，iOS 上为 `web::WebThread::UI`，负责更新 UI；渲染器进程中为 Blink 主线程，执行 Blink 的大部分工作。
- IO 线程：所有 IPC 消息在此到达，但处理消息的应用逻辑可以在其他线程执行，例如将消息转发给绑定在另一线程的 [Mojo 接口](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/README.md#Mojo-Services)。更一般地，大部分异步 I/O 也在这里处理，例如通过 `base::FileDescriptorWatcher`。浏览器进程中称为 `BrowserThread::IO`，iOS 上为 `web::WebThread::IO`。
- 少量其他专用线程。
- 一组通用线程组成的线程池。

多数线程有一个循环，不断从队列取出任务并执行；多个线程可以共享队列。

<a id="tasks"></a>

### 任务

任务是加入队列、等待异步执行的 `base::OnceClosure`。它保存函数指针和参数，通过 `Run()` 使用绑定参数调用该函数，由 `base::BindOnce` 创建。见 [Callback 与 Bind 文档](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/callback.md)。

```
void TaskA() {}
void TaskB(int v) {}

auto task_a = base::BindOnce(&TaskA);
auto task_b = base::BindOnce(&TaskB, 42);
```

一组任务可以按以下方式执行：

- [并行](#Posting-a-Parallel-Task)：没有执行顺序保证，可能在任意线程同时运行。
- [Sequence](#Posting-a-Sequenced-Task)：按投递顺序逐个执行，物理线程不限。
- [单线程](#Posting-Multiple-Tasks-to-the-Same-Thread)：按投递顺序在一个物理线程上逐个执行。
- [COM 单线程](#Posting-Tasks-to-a-COM-Single_Thread-Apartment-STA_Thread-Windows)：初始化了 COM 的单线程变体。

<a id="prefer-sequences-to-physical-threads"></a>

### 优先使用 Sequence，而非物理线程

强烈推荐基于虚拟线程的 sequenced execution，而非基于物理线程的单线程执行。除了绑定 UI 或 IO 线程的类型、方法之外，通过 `base::SequencedTaskRunner` 实现线程安全优于自行管理物理线程，见[投递有序任务](#posting-a-sequenced-task)。

所有面向“当前物理线程”的 API 都有对应的“当前 sequence”版本，见[映射关系](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/threading_and_tasks_faq.md#How-to-migrate-from-SingleThreadTaskRunner-to-SequencedTaskRunner)。

如果你编写的类型支持 sequence，但底层依赖的线程亲和检查（例如 `THREAD_CHECKER`）失败，可以考虑让依赖也支持 sequence。Chrome 大多数核心 API 已支持；部分旧类型仍过度使用 `ThreadChecker` / `SingleThreadTaskRunner`，其实可以改为依赖当前 sequence。

<a id="posting-a-parallel-task"></a>
<a id="Posting-a-Parallel-Task"></a>

## 投递并行任务

<a id="direct-posting-to-the-thread-pool"></a>

### 直接投递到线程池

若任务可在任意线程运行，且与其他任务没有顺序或互斥要求，应使用 [`base/task/thread_pool.h`](https://cs.chromium.org/chromium/src/base/task/thread_pool.h) 中的 `base::ThreadPool::PostTask*()`。

```cpp
base::ThreadPool::PostTask(FROM_HERE, base::BindOnce(&Task));
```

上例使用默认 traits。也可以通过 TaskTraits 提供更多信息，见[用 TaskTraits 标注任务](#Annotating-Tasks-with-TaskTraits)。

```cpp
base::ThreadPool::PostTask(
    FROM_HERE, {base::TaskPriority::BEST_EFFORT, MayBlock()},
    base::BindOnce(&Task));
```

<a id="posting-via-a-taskrunner"></a>

### 通过 TaskRunner 投递

并行 [`base::TaskRunner`](https://cs.chromium.org/chromium/src/base/task/task_runner.h) 是直接调用 `ThreadPool::PostTask*()` 的另一种选择，主要适用于事先不知道任务会并行、有序还是单线程执行的情况。见[有序任务](#Posting-a-Sequenced-Task)和[单线程任务](#Posting-Multiple-Tasks-to-the-Same-Thread)。

由于 `TaskRunner` 是 `SequencedTaskRunner` 和 `SingleThreadTaskRunner` 的基类，`scoped_refptr<TaskRunner>` 成员可以持有这三种类型中的任意一种。

```cpp
class A {
 public:
  A() = default;

  void PostSomething() {
    task_runner_->PostTask(FROM_HERE, base::BindOnce(&A, &DoSomething));
  }

  void DoSomething() {
  }

 private:
  scoped_refptr<base::TaskRunner> task_runner_ =
      base::ThreadPool::CreateTaskRunner({base::TaskPriority::USER_VISIBLE});
};
```

除非测试需要精确控制执行方式，否则优先直接调用 `ThreadPool::PostTask*()`。侵入性更小的测试控制方式见[测试](#Testing)。

<a id="posting-a-sequenced-task"></a>
<a id="Posting-a-Sequenced-Task"></a>

## 投递有序任务

Sequence 是按投递顺序逐个执行的任务集合，不要求在同一物理线程运行。使用 [`base::SequencedTaskRunner`](https://cs.chromium.org/chromium/src/base/task/sequenced_task_runner.h) 向其中投递任务。

<a id="posting-to-a-new-sequence"></a>

### 投递到新的 Sequence

通过 `base::ThreadPool::CreateSequencedTaskRunner()` 创建。

```cpp
scoped_refptr<SequencedTaskRunner> sequenced_task_runner =
    base::ThreadPool::CreateSequencedTaskRunner(...);

// TaskB runs after TaskA completes.
sequenced_task_runner->PostTask(FROM_HERE, base::BindOnce(&TaskA));
sequenced_task_runner->PostTask(FROM_HERE, base::BindOnce(&TaskB));
```

<a id="posting-to-the-current-virtual-thread"></a>
<a id="Posting-to-the-Current-Virtual_Thread"></a>

### 投递到当前虚拟线程

推荐通过 `base::SequencedTaskRunner::GetCurrentDefault()` 投递。

```cpp
// The task will run on the current (virtual) thread's default task queue.
base::SequencedTaskRunner::GetCurrentDefault()->PostTask(
    FROM_HERE, base::BindOnce(&Task));
```

它返回当前虚拟线程的默认队列。在具有多个任务队列的线程上，例如 `BrowserThread::UI`，默认队列可能不是当前任务所属的队列。API 有意不通过静态 getter 暴露“当前” task runner：如果你知道它，就直接投递；如果不知道，合理的目标就是默认队列。详细讨论见 https://bit.ly/3JvCLsX 。

<a id="using-sequences-instead-of-locks"></a>
<a id="Using-Sequences-Instead-of-Locks"></a>

## 使用 Sequence 代替锁

Chrome 不推荐使用锁。Sequence 天然提供串行访问保障，因此优先让类始终从同一个 sequence 访问，而不是用锁自行管理线程安全。

**不绑定物理线程，如何保证线程安全？** 同一 sequence 上的任务顺序执行。一个任务完成后，下一任务可能由另一个工作线程执行，但保证能看到该 sequence 此前任务的所有副作用。

```cpp
class A {
 public:
  A() {
    // Do not require accesses to be on the creation sequence.
    DETACH_FROM_SEQUENCE(sequence_checker_);
  }

  void AddValue(int v) {
    // Check that all accesses are on the same sequence.
    DCHECK_CALLED_ON_VALID_SEQUENCE(sequence_checker_);
    values_.push_back(v);
}

 private:
  SEQUENCE_CHECKER(sequence_checker_);

  // No lock required, because all accesses are on the
  // same sequence.
  std::vector<int> values_;
};

A a;
scoped_refptr<SequencedTaskRunner> task_runner_for_a = ...;
task_runner_for_a->PostTask(FROM_HERE,
                      base::BindOnce(&A::AddValue, base::Unretained(&a), 42));
task_runner_for_a->PostTask(FROM_HERE,
                      base::BindOnce(&A::AddValue, base::Unretained(&a), 27));

// Access from a different sequence causes a DCHECK failure.
scoped_refptr<SequencedTaskRunner> other_task_runner = ...;
other_task_runner->PostTask(FROM_HERE,
                            base::BindOnce(&A::AddValue, base::Unretained(&a), 1));
```

锁应仅用于替换可被多个线程访问的共享数据结构。如果更新需要昂贵计算或磁盘访问，这些慢操作应在不持锁时执行；结果就绪后才加锁替换数据。示例见 [`PluginList::LoadPlugins`](https://cs.chromium.org/chromium/src/content/browser/plugin_list.cc)。确需用锁时，参见[最佳实践与陷阱](https://www.chromium.org/developers/lock-and-condition-variable)。

为了避免阻塞，Chrome 的许多 API 都是异步的：通常要求在特定线程或 sequence 上执行，通过自定义 delegate 返回结果；或者接收 `base::OnceCallback<>` / `base::RepeatingCallback<>`，在操作完成时调用。如何指定执行位置见前面的 PostTask 章节。

<a id="posting-multiple-tasks-to-the-same-thread"></a>
<a id="Posting-Multiple-Tasks-to-the-Same-Thread"></a>

## 将多个任务投递到同一线程

使用 [`base::SingleThreadTaskRunner`](https://cs.chromium.org/chromium/src/base/task/single_thread_task_runner.h)。投递到同一 runner 的全部任务会在同一线程按投递顺序执行。

<a id="posting-to-the-main-thread-or-to-the-io-thread-in-the-browser-process"></a>

### 投递到浏览器进程的主线程或 IO 线程

使用 [`content/public/browser/browser_thread.h`](https://cs.chromium.org/chromium/src/content/public/browser/browser_thread.h) 中的 `content::GetUIThreadTaskRunner({})` 或 `content::GetIOThreadTaskRunner({})`。

可以传入额外的 `BrowserTaskTraits`，但这在 BrowserThread 中并不常见，应保留给高级用例。代码库正从旧的“base API 加 traits”迁移到 [task APIs v3]，因此仍可能看到下面这种等价写法：

```cpp
base::PostTask(FROM_HERE, {content::BrowserThread::UI}, ...);

base::CreateSingleThreadTaskRunner({content::BrowserThread::IO})
    ->PostTask(FROM_HERE, ...);
```

迁移期间，使用 browser_thread.h API 仍需手动包含 [`browser_task_traits.h`](https://cs.chromium.org/chromium/src/content/public/browser/browser_task_traits.h)。

主线程和 IO 线程已经十分繁忙，应尽量使用通用线程，见[并行任务](#Posting-a-Parallel-Task)和[有序任务](#Posting-a-Sequenced-Task)。更新 UI 或访问绑定 UI 线程的对象（例如 `Profile`）适合投递到主线程；访问绑定 IO 线程的组件内部状态（例如 IPC、网络）适合投递到 IO 线程。发送、接收 IPC 或网络数据本身不要求显式投递任务到 IO 线程。

<a id="posting-to-the-main-thread-in-a-renderer-process"></a>

### 投递到渲染器进程的主线程

TODO(blink-dev)

> 译注：原文此节尚未补充。

<a id="posting-to-a-custom-singlethreadtaskrunner"></a>

### 投递到自定义 SingleThreadTaskRunner

若多个任务必须在同一线程运行，但不必是主线程或 IO 线程，可通过 `base::ThreadPool::CreateSingleThreadTaskRunner` 创建 `base::SingleThreadTaskRunner`。

```cpp
scoped_refptr<SingleThreadTaskRunner> single_thread_task_runner =
    base::Threadpool::CreateSingleThreadTaskRunner(...);

// TaskB runs after TaskA completes. Both tasks run on the same thread.
single_thread_task_runner->PostTask(FROM_HERE, base::BindOnce(&TaskA));
single_thread_task_runner->PostTask(FROM_HERE, base::BindOnce(&TaskB));
```

由于[优先使用 sequence](#prefer-sequences-to-physical-threads)，这种需求应当很少见。

<a id="posting-to-the-current-thread"></a>

### 投递到当前线程

> 若任务只需与当前 sequence 互斥，并非必须在当前物理线程运行，应使用 `base::SequencedTaskRunner::GetCurrentDefault()`，而非 `base::SingleThreadTaskRunner::GetCurrentDefault()`。这样更清晰地表达需求，也避免不必要的线程亲和性。在单线程任务中，两者等价。见[当前 sequence](#Posting-to-the-Current-Virtual_Thread)。

确实需要投递到当前物理线程时，使用 [`base::SingleThreadTaskRunner::CurrentDefaultHandle`](https://source.chromium.org/chromium/chromium/src/+/main:base/task/single_thread_task_runner.h) 对应的当前默认 runner：

```cpp
// The task will run on the current thread in the future.
base::SingleThreadTaskRunner::GetCurrentDefault()->PostTask(
    FROM_HERE, base::BindOnce(&Task));
```

<a id="posting-tasks-to-a-com-single-thread-apartment-sta-thread-windows"></a>
<a id="Posting-Tasks-to-a-COM-Single_Thread-Apartment-STA_Thread-Windows"></a>

## 投递到 COM 单线程单元（STA）线程（Windows）

需要 COM STA 的任务，必须投递到 `base::ThreadPool::CreateCOMSTATaskRunner()` 返回的 `base::SingleThreadTaskRunner`。同一 runner 上的任务会在同一线程按投递顺序运行，见[单线程任务](#Posting-Multiple-Tasks-to-the-Same-Thread)。

```cpp
// Task(A|B|C)UsingCOMSTA will run on the same COM STA thread.

void TaskAUsingCOMSTA() {
  // [ This runs on a COM STA thread. ]

  // Make COM STA calls.
  // ...

  // Post another task to the current COM STA thread.
  base::SingleThreadTaskRunner::GetCurrentDefault()->PostTask(
      FROM_HERE, base::BindOnce(&TaskCUsingCOMSTA));
}
void TaskBUsingCOMSTA() { }
void TaskCUsingCOMSTA() { }

auto com_sta_task_runner = base::ThreadPool::CreateCOMSTATaskRunner(...);
com_sta_task_runner->PostTask(FROM_HERE, base::BindOnce(&TaskAUsingCOMSTA));
com_sta_task_runner->PostTask(FROM_HERE, base::BindOnce(&TaskBUsingCOMSTA));
```

<a id="memory-ordering-guarantees-for-posted-tasks"></a>

## 已投递任务的内存顺序保证

任务系统保证：顺序执行中发生在任务投递之前的所有内存效果，在任务开始执行时均可见。形式化地说，`PostTask()` 调用与被投递任务的执行之间存在 [happens-before 关系](https://preshing.com/20130702/the-happens-before-relation/)。这适用于 `::base` 中所有投递变体，包括 `PostTaskAndReply()`。同一 `SequencedTaskRunner` 中顺序执行的任务之间也有这种关系。

Chrome 任务常访问 `base::OnceCallback` 直接复制的数据之外的内存，这种保证可避免任务内部额外同步。例如 callback 绑定的指针指向投递线程刚刚初始化的内存。

还可采用更受约束的模型：不同 task runner 上的任务各自独占访问某些内存对象，不显式同步；通过投递下一任务，将对象的这种“所有权”转移给它。对象所有权因此可扩展到 task runner 层面，形成易于推理的不变量。这种模型既避免竞争，也避免锁和原子操作，因其简单而广泛用于 Chrome。

<a id="annotating-tasks-with-tasktraits"></a>
<a id="Annotating-Tasks-with-TaskTraits"></a>

## 用 TaskTraits 标注任务

[`base::TaskTraits`](https://cs.chromium.org/chromium/src/base/task/task_traits.h) 封装任务信息，帮助线程池做调度决策。

默认 traits 足够时，接受 traits 的方法可以传入 `{}`。默认值适用于：不阻塞（参见 `MayBlock`、`WithBaseSyncPrimitives`）；属于会阻碍用户操作的工作，或在执行顺序上依赖此类组件；关闭时可以阻塞 shutdown，也可以被跳过，具体默认行为由线程池选择。

不符合上述描述的任务必须显式指定 traits。[task_traits.h](https://cs.chromium.org/chromium/src/base/task/task_traits.h) 列出所有可用项。Content 层还在 [browser_task_traits.h](https://cs.chromium.org/chromium/src/content/public/browser/browser_task_traits.h) 提供将任务投递到 BrowserThread 的额外 traits。

示例：

```cpp
// This task has no explicit TaskTraits. It cannot block. Its priority is
// USER_BLOCKING. It will either block shutdown or be skipped on shutdown.
base::ThreadPool::PostTask(FROM_HERE, base::BindOnce(...));

// This task has the highest priority. The thread pool will schedule it before
// USER_VISIBLE and BEST_EFFORT tasks.
base::ThreadPool::PostTask(
    FROM_HERE, {base::TaskPriority::USER_BLOCKING},
    base::BindOnce(...));

// This task has the lowest priority and is allowed to block (e.g. it
// can read a file from disk).
base::ThreadPool::PostTask(
    FROM_HERE, {base::TaskPriority::BEST_EFFORT, base::MayBlock()},
    base::BindOnce(...));

// This task blocks shutdown. The process won't exit before its
// execution is complete.
base::ThreadPool::PostTask(
    FROM_HERE, {base::TaskShutdownBehavior::BLOCK_SHUTDOWN},
    base::BindOnce(...));
```

<a id="keeping-the-browser-responsive"></a>

## 保持浏览器响应

不要在主线程、IO 线程或任何需要低延迟执行任务的 sequence 上执行昂贵工作。应通过 `base::ThreadPool::PostTaskAndReply*()` 或 `base::SequencedTaskRunner::PostTaskAndReply()` 异步执行。IO 线程上的异步 / 重叠 I/O 则是允许的。

下面的代码若在主线程运行，会让浏览器长时间无法响应用户输入：

```cpp
// GetHistoryItemsFromDisk() may block for a long time.
// AddHistoryItemsToOmniboxDropDown() updates the UI and therefore must
// be called on the main thread.
AddHistoryItemsToOmniboxDropdown(GetHistoryItemsFromDisk("keyword"));
```

改为在线程池执行 `GetHistoryItemsFromDisk()`，然后在原 sequence（此处为主线程）调用 `AddHistoryItemsToOmniboxDropdown()`，即可解决。第一次调用的返回值会自动作为第二次调用的参数。

```cpp
base::ThreadPool::PostTaskAndReplyWithResult(
    FROM_HERE, {base::MayBlock()},
    base::BindOnce(&GetHistoryItemsFromDisk, "keyword"),
    base::BindOnce(&AddHistoryItemsToOmniboxDropdown));
```

<a id="posting-a-task-with-a-delay"></a>

## 延迟投递任务

<a id="posting-a-one-off-task-with-a-delay"></a>

### 延迟执行一次

使用 `base::ThreadPool::PostDelayedTask*()` 或 `base::TaskRunner::PostDelayedTask()`。

```cpp
base::ThreadPool::PostDelayedTask(
  FROM_HERE, {base::TaskPriority::BEST_EFFORT}, base::BindOnce(&Task),
  base::Hours(1));

scoped_refptr<base::SequencedTaskRunner> task_runner =
    base::ThreadPool::CreateSequencedTaskRunner(
        {base::TaskPriority::BEST_EFFORT});
task_runner->PostDelayedTask(
    FROM_HERE, base::BindOnce(&Task), base::Hours(1));
```

> 一个延迟一小时的任务，通常不要求延迟结束后立刻执行。指定 `base::TaskPriority::BEST_EFFORT`，避免届时拖慢浏览器。

<a id="posting-a-repeating-task-with-a-delay"></a>

### 按间隔重复执行

使用 [`base::RepeatingTimer`](https://cs.chromium.org/chromium/src/base/timer/timer.h)。

```cpp
class A {
 public:
  ~A() {
    // The timer is stopped automatically when it is deleted.
  }
  void StartDoingStuff() {
    timer_.Start(FROM_HERE, Seconds(1),
                 this, &A::DoStuff);
  }
  void StopDoingStuff() {
    timer_.Stop();
  }
 private:
  void DoStuff() {
    // This method is called every second on the sequence that invoked
    // StartDoingStuff().
  }
  base::RepeatingTimer timer_;
};
```

<a id="cancelling-a-task"></a>

## 取消任务

<a id="using-baseweakptr"></a>

### 使用 base::WeakPtr

[`base::WeakPtr`](https://cs.chromium.org/chromium/src/base/memory/weak_ptr.h) 可确保绑定到对象的 callback 在对象销毁后被取消。

```cpp
int Compute() { … }

class A {
 public:
  void ComputeAndStore() {
    // Schedule a call to Compute() in a thread pool followed by
    // a call to A::Store() on the current sequence. The call to
    // A::Store() is canceled when |weak_ptr_factory_| is destroyed.
    // (guarantees that |this| will not be used-after-free).
    base::ThreadPool::PostTaskAndReplyWithResult(
        FROM_HERE, base::BindOnce(&Compute),
        base::BindOnce(&A::Store, weak_ptr_factory_.GetWeakPtr()));
  }

 private:
  void Store(int value) { value_ = value; }

  int value_;
  base::WeakPtrFactory<A> weak_ptr_factory_{this};
};
```

`WeakPtr` 不是线程安全的：`~WeakPtrFactory()` 与绑定弱指针的 `Store()` 必须在同一 sequence 运行。

<a id="using-basecancelabletasktracker"></a>

### 使用 base::CancelableTaskTracker

[`base::CancelableTaskTracker`](https://cs.chromium.org/chromium/src/base/task/cancelable_task_tracker.h) 允许从不同于任务执行位置的 sequence 取消任务，但无法取消已经开始执行的任务。

```cpp
auto task_runner = base::ThreadPool::CreateTaskRunner({});
base::CancelableTaskTracker cancelable_task_tracker;
cancelable_task_tracker.PostTask(task_runner.get(), FROM_HERE,
                                 base::DoNothing());
// Cancels Task(), only if it hasn't already started running.
cancelable_task_tracker.TryCancelAll();
```

<a id="posting-a-job-to-run-in-parallel"></a>

## 投递并行 Job

[`base::PostJob`](https://cs.chromium.org/chromium/src/base/task/post_job.h) 是高级 API：提交一个 `base::RepeatingCallback` 工作任务，并请求线程池的工作线程并行调用它。它避免两种低效情况：为每个工作项调用 `PostTask()`，产生大量调度开销；或者固定投递若干长时间运行的任务，把工作按核数切分。

后一种方式在多个组件都投递“CPU 核数个”任务并期待占满全部核时尤其有问题：调度器缺少上下文，无法公平处理同优先级请求，也无法在高优先级工作到来时要求低优先级工作让出执行权。

完整示例见 [`base/task/job_perftest.cc`](https://cs.chromium.org/chromium/src/base/task/job_perftest.cc)。

```cpp
// A canonical implementation of |worker_task|.
void WorkerTask(base::JobDelegate* job_delegate) {
  while (!job_delegate->ShouldYield()) {
    auto work_item = TakeWorkItem(); // Smallest unit of work.
    if (!work_item)
      return:
    ProcessWork(work_item);
  }
}

// Returns the latest thread-safe number of incomplete work items.
void NumIncompleteWorkItems(size_t worker_count) {
  // NumIncompleteWorkItems() may use |worker_count| if it needs to account for
  // local work lists, which is easier than doing its own accounting, keeping in
  // mind that the actual number of items may be racily overestimated and thus
  // WorkerTask() may be called when there's no available work.
  return GlobalQueueSize() + worker_count;
}

base::PostJob(FROM_HERE, {},
              base::BindRepeating(&WorkerTask),
              base::BindRepeating(&NumIncompleteWorkItems));
```

工作任务被调用后，尽量在循环中完成更多工作以降低调度开销，同时定期调用 `base::JobDelegate::ShouldYield()`，按需退出，让调度器优先处理其他工作。例如 user-visible job 可以使用所有核，但在 user-blocking 任务到来时让路。

<a id="adding-additional-work-to-a-running-job"></a>

### 向运行中的 Job 添加工作

添加工作项并希望增加并行调用线程时，最大并发数增加后必须及时调用 `JobHandle/JobDelegate::NotifyConcurrencyIncrease()`。

<a id="testing"></a>
<a id="Testing"></a>

## 测试

更多信息见[测试会投递任务的组件](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/threading_and_tasks_testing.md)。

测试使用 `SingleThreadTaskRunner::CurrentDefaultHandle`、`SequencedTaskRunner::CurrentDefaultHandle` 或 [`base/task/thread_pool.h`](https://cs.chromium.org/chromium/src/base/task/thread_pool.h) 的代码时，应在测试作用域内创建 [`base::test::TaskEnvironment`](https://cs.chromium.org/chromium/src/base/test/task_environment.h)。需要 BrowserThread 时，改用 `content::BrowserTaskEnvironment`。

测试可以通过 `base::RunLoop` 驱动 `TaskEnvironment` 的消息泵：运行到显式 `Quit()` 或 `RunLoop::QuitClosure()`，也可用 `RunUntilIdle()` 执行当前可运行任务后立即返回。

如果 `RunLoop::Run()` 在 `TestTimeouts::action_timeout()` 后仍未显式退出，TaskEnvironment 会触发 `GTEST_FAIL()`，优于因被测代码未触发退出而永久挂起。可通过 `base::test::ScopedRunLoopTimeout` 修改超时。

```cpp
class MyTest : public testing::Test {
 public:
  // ...
 protected:
   base::test::TaskEnvironment task_environment_;
};

TEST_F(MyTest, FirstTest) {
  base::SingleThreadTaskRunner::GetCurrentDefault()->PostTask(FROM_HERE, base::BindOnce(&A));
  base::SequencedTaskRunner::GetCurrentDefault()->PostTask(FROM_HERE,
                                                   base::BindOnce(&B));
  base::SingleThreadTaskRunner::GetCurrentDefault()->PostDelayedTask(
      FROM_HERE, base::BindOnce(&C), base::TimeDelta::Max());

  // This runs the (SingleThread|Sequenced)TaskRunner::CurrentDefaultHandle queue until it is empty.
  // Delayed tasks are not added to the queue until they are ripe for execution.
  // Prefer explicit exit conditions to RunUntilIdle when possible:
  // bit.ly/run-until-idle-with-care2.
  base::RunLoop().RunUntilIdle();
  // A and B have been executed. C is not ripe for execution yet.

  base::RunLoop run_loop;
  base::SingleThreadTaskRunner::GetCurrentDefault()->PostTask(FROM_HERE, base::BindOnce(&D));
  base::SingleThreadTaskRunner::GetCurrentDefault()->PostTask(FROM_HERE, run_loop.QuitClosure());
  base::SingleThreadTaskRunner::GetCurrentDefault()->PostTask(FROM_HERE, base::BindOnce(&E));

  // This runs the (SingleThread|Sequenced)TaskRunner::CurrentDefaultHandle queue until QuitClosure is
  // invoked.
  run_loop.Run();
  // D and run_loop.QuitClosure() have been executed. E is still in the queue.

  // Tasks posted to thread pool run asynchronously as they are posted.
  base::ThreadPool::PostTask(FROM_HERE, {}, base::BindOnce(&F));
  auto task_runner =
      base::ThreadPool::CreateSequencedTaskRunner({});
  task_runner->PostTask(FROM_HERE, base::BindOnce(&G));

  // To block until all tasks posted to thread pool are done running:
  base::ThreadPoolInstance::Get()->FlushForTesting();
  // F and G have been executed.

  base::ThreadPool::PostTaskAndReplyWithResult(
      FROM_HERE, {}, base::BindOnce(&H), base::BindOnce(&I));

  // This runs the (SingleThread|Sequenced)TaskRunner::CurrentDefaultHandle queue until both the
  // (SingleThread|Sequenced)TaskRunner::CurrentDefaultHandle queue and the ThreadPool queue are
  // empty. Prefer explicit exit conditions to RunUntilIdle when possible:
  // bit.ly/run-until-idle-with-care2.
  task_environment_.RunUntilIdle();
  // E, H, I have been executed.
}
```

<a id="using-threadpool-in-a-new-process"></a>

## 在新进程中使用 ThreadPool

使用 [`base/task/thread_pool.h`](https://cs.chromium.org/chromium/src/base/task/thread_pool.h) 之前必须初始化 `ThreadPoolInstance`。Chrome 浏览器进程和子进程（renderer、GPU、utility）已经完成这项工作。其他进程应在 main 函数早期初始化：

```cpp
// This initializes and starts ThreadPoolInstance with default params.
base::ThreadPoolInstance::CreateAndStartWithDefaultParams("process_name");
// The base/task/thread_pool.h API can now be used with base::ThreadPool trait.
// Tasks will be scheduled as they are posted.

// This initializes ThreadPoolInstance.
base::ThreadPoolInstance::Create("process_name");
// The base/task/thread_pool.h API can now be used with base::ThreadPool trait. No
// threads will be created and no tasks will be scheduled until after Start() is
// called.
base::ThreadPoolInstance::Get()->Start(params);
// ThreadPool can now create threads and schedule tasks.
```

在 main 函数末尾关闭：

```cpp
base::ThreadPoolInstance::Get()->Shutdown();
// Tasks posted with TaskShutdownBehavior::BLOCK_SHUTDOWN and
// tasks posted with TaskShutdownBehavior::SKIP_ON_SHUTDOWN that
// have started to run before the Shutdown() call have now completed their
// execution. Tasks posted with
// TaskShutdownBehavior::CONTINUE_ON_SHUTDOWN may still be
// running.
```

<a id="taskrunner-ownership-encourage-no-dependency-injection"></a>

## TaskRunner 所有权：通常不需要依赖注入

不要让 TaskRunner 穿过多个组件逐层传递，应由实际使用它的组件创建。这个[重构示例](https://codereview.chromium.org/2885173002/)中，runner 原本经过许多组件才到达最终使用的叶子组件；现在叶子组件应直接通过 [`base/task/thread_pool.h`](https://cs.chromium.org/chromium/src/base/task/thread_pool.h) 获取。

`base::test::TaskEnvironment` 已允许单元测试控制底层 runner 投递的任务。少数需要更精确控制任务顺序的测试可使用依赖注入，推荐方式如下：

```cpp
class Foo {
 public:

  // Overrides |background_task_runner_| in tests.
  void SetBackgroundTaskRunnerForTesting(
      scoped_refptr<base::SequencedTaskRunner> background_task_runner) {
    background_task_runner_ = std::move(background_task_runner);
  }

 private:
  scoped_refptr<base::SequencedTaskRunner> background_task_runner_ =
      base::ThreadPool::CreateSequencedTaskRunner(
          {base::MayBlock(), base::TaskPriority::BEST_EFFORT});
}
```

单元测试直接使用叶子组件，因此仍可移除 `//chrome` 到该组件之间的逐层传递。

<a id="faq"></a>

## FAQ

更多示例见[线程与任务 FAQ](https://chromium.googlesource.com/chromium/src/+/f5a9dd28d9af3a5450afb58ac199223fc6b49976/docs/threading_and_tasks_faq.md)。

[task APIs v3]: https://docs.google.com/document/d/1tssusPykvx3g0gvbvU4HxGyn3MjJlIylnsH13-Tv6s4/edit?ts=5de99a52#heading=h.ss4tw38hvh3s

<a id="internals"></a>

## 内部机制

<a id="sequencemanager"></a>

### SequenceManager

[SequenceManager](https://cs.chromium.org/chromium/src/base/task/sequence_manager/sequence_manager.h) 管理具有不同优先级、通用任务类型等属性的 TaskQueue，将全部任务复用到一个底层执行 sequence，通常由 MessagePump 驱动。不同消息泵也可能处理 UI 消息等其他事件。Windows 上还可能处理时间允许时的 APC 调用，以及注册 HANDLE 集合上的信号。

<a id="messagepump"></a>

### MessagePump

[消息泵](https://cs.chromium.org/chromium/src/base/message_loop/message_pump.h)负责处理原生消息，并周期性地让 delegate（SequenceManager）获得执行机会。它将 delegate 回调与原生消息处理交织，避免任何一方饿死另一方。

常见 [MessagePumpType](https://cs.chromium.org/chromium/src/base/message_loop/message_pump_type.h)：

- `DEFAULT`：仅支持任务和定时器。
- `UI`：支持原生 UI 事件，例如 Windows 消息。
- `IO`：支持异步 IO，不是文件 I/O。
- `CUSTOM`：用户提供的 MessagePump 实现。

<a id="runloop"></a>

### RunLoop

辅助运行当前线程关联的 `RunLoop::Delegate`，通常是 SequenceManager。可在栈上创建 RunLoop，通过 Run / Quit 运行嵌套循环，但生产代码应避免嵌套循环。

<a id="task-reentrancy"></a>

### 任务重入

SequenceManager 提供任务重入保护：处理一个任务期间，第二个任务不能在前者完成之前开始。但任务内部创建新的消息泵时，内层消息泵处理原生消息，可能隐式启动内层任务，从而产生重入。对话框 `DialogBox`、通用对话框 `GetOpenFileName`、OLE 的 `DoDragDrop`、打印函数 `StartDoc` 等许多操作都会创建内层消息泵。

```cpp
Sample workaround when inner task processing is needed:
  HRESULT hr;
  {
    CurrentThread::ScopedAllowApplicationTasksInNativeNestedLoop allow;
    hr = DoDragDrop(...); // Implicitly runs a modal message loop.
  }
  // Process |hr| (the result returned by DoDragDrop()).
```

使用 `CurrentThread::ScopedAllowApplicationTasksInNativeNestedLoop` 前，务必确认任务可重入、可嵌套，并且所有全局变量都处于稳定且可访问的状态。

<a id="apis-for-general-use"></a>

## 通用 API

普通代码几乎不需要直接访问面向调度实现的 SequenceManager API，而应使用：

- `base::RunLoop`：从 SequenceManager 绑定的线程驱动它。
- `base::Thread/SequencedTaskRunner::CurrentDefaultHandle`：从正在执行的任务向相应 SequenceManager 的 TaskQueue 投递任务。
- `SequenceLocalStorageSlot`：将外部状态绑定到 sequence。
- `base::CurrentThread`：访问绑定当前线程的一部分任务相关 API 的代理。
- 嵌入方提供的静态访问入口：向指定循环投递任务，例如 `content::BrowserThreads`。

<a id="singlethreadtaskexecutor-and-taskenvironment"></a>

### SingleThreadTaskExecutor 与 TaskEnvironment

只需要一个默认任务队列的简单环境，可以使用 [SingleThreadTaskExecutor](https://cs.chromium.org/chromium/src/base/task/single_thread_task_executor.h)，无需直接处理 SequenceManager、TaskQueue。单元测试可使用高度可配置的 [TaskEnvironment](https://cs.chromium.org/chromium/src/base/test/task_environment.h)。

<a id="messageloop-and-messageloopcurrent"></a>

## MessageLoop 与 MessageLoopCurrent

代码或文档中可能仍提到这些类，但它们已经不存在，相关引用正在移除。`base::MessageLoopCurrent` 已由 `base::CurrentThread` 替代；`base::MessageLoop` 的替代是 `base::SingleThreadTaskExecutor` 和 `base::test::TaskEnvironment`。
