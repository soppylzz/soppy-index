const jobs = new Set<() => void>()
let pending: Promise<void> | undefined

export function queueJob(job: () => void) {
  jobs.add(job)
  pending ??= Promise.resolve().then(() => {
    try {
      while (jobs.size) {
        const job = jobs.values().next().value!
        jobs.delete(job)
        job()
      }
    } finally {
      jobs.clear()
      pending = undefined
    }
  })
}

export function nextTick(): Promise<void> {
  return pending ?? Promise.resolve()
}
