export type Dep = Set<ReactiveEffect>
const effectStack: ReactiveEffect[] = []

export class ReactiveEffect {
  active = true
  running = false
  deps: Dep[] = []
  computed = false

  readonly fn: () => unknown
  readonly scheduler?: () => void

  constructor(fn: () => unknown, scheduler?: () => void) {
    this.fn = fn
    this.scheduler = scheduler
  }

  run(): unknown {
    if (!this.active) return this.fn()
    if (this.running) return
    this.cleanup()
    this.running = true
    effectStack.push(this)
    try {
      return this.fn()
    } finally {
      effectStack.pop()
      this.running = false
    }
  }

  cleanup() {
    for (const dep of this.deps) dep.delete(this)
    this.deps.length = 0
  }

  stop() {
    this.active = false
    this.cleanup()
  }
}

export function trackDep(dep: Dep) {
  const activeEffect = effectStack.at(-1)
  if (!activeEffect?.active || dep.has(activeEffect)) return
  dep.add(activeEffect)
  activeEffect.deps.push(dep)
}

const pending = new Set<ReactiveEffect>()
let flushing = false

export function triggerEffects(effects: Iterable<ReactiveEffect>) {
  for (const effect of effects) {
    if (effect.active && !effect.running) pending.add(effect)
  }
  if (flushing) return
  flushing = true
  try {
    while (pending.size) {
      // Invalidate computed caches before a consumer reads them.
      const next = [...pending].find((effect) => effect.computed) ?? pending.values().next().value!
      pending.delete(next)
      if (next.active) {
        if (next.scheduler) next.scheduler()
        else next.run()
      }
    }
  } finally {
    pending.clear()
    flushing = false
  }
}

export interface EffectRunner {
  (): unknown
  effect: ReactiveEffect
}

export function effect(fn: () => unknown, options: { scheduler?: () => void } = {}): EffectRunner {
  const instance = new ReactiveEffect(fn, options.scheduler)
  const runner = instance.run.bind(instance) as EffectRunner
  runner.effect = instance
  try {
    runner()
  } catch (error) {
    instance.stop()
    throw error
  }
  return runner
}

export function stop(runner: EffectRunner) {
  runner.effect.stop()
}
