function maxSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = []
  const deque: number[] = []

  // perf: could use a head pointer to implicitly manage the deque window (e.g. `let head = 0`)

  for (let i = 0; i < nums.length; i++) {
    /**
     * light: an if statement suffices because the window only slides
     * by 1, so at most one element expires per step. stale smaller
     * values are already cleared when a new element is inserted.
     */
    if (deque.length > 0 && deque[0] < i - k + 1) deque.shift()
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) deque.pop()

    deque.push(i)

    // record when window size == k
    if (i >= k - 1) {
      result.push(nums[deque[0]])
    }
  }

  return result
}

class PriorityQueue<Value> {
  private heap: Array<{ score: number; value: Value }> = []

  // default: max heap, larger score means higher priority
  constructor(private compare: (a: number, b: number) => number = (a, b) => a - b) {}

  private swap(aIdx: number, bIdx: number) {
    ;[this.heap[aIdx], this.heap[bIdx]] = [this.heap[bIdx], this.heap[aIdx]]
  }

  emplace(val: Value, score: number) {
    this.heap.push({ value: val, score })
    let idx = this.heap.length - 1

    // bubble up
    while (idx > 0) {
      // compute parent idx
      const parent = (idx - 1) >> 1
      if (this.compare(this.heap[idx].score, this.heap[parent].score) > 0) {
        this.swap(parent, idx)
        idx = parent
      } else {
        break
      }
    }
  }

  pop() {
    if (this.heap.length === 0) return undefined

    this.swap(0, this.heap.length - 1)
    const popped = this.heap.pop()!
    const len = this.heap.length

    // bubble down
    let idx = 0
    while (true) {
      // compute child idx
      const left = idx * 2 + 1
      const right = idx * 2 + 2
      let bestIdx = idx

      if (left < len && this.compare(this.heap[left].score, this.heap[bestIdx].score) > 0) {
        bestIdx = left
      }
      if (right < len && this.compare(this.heap[right].score, this.heap[bestIdx].score) > 0) {
        bestIdx = right
      }
      if (bestIdx === idx) break

      this.swap(idx, bestIdx)
      idx = bestIdx
    }

    return popped.value
  }

  peek() {
    return this.heap[0]?.value
  }

  get size() {
    return this.heap.length
  }
}

function maxSlidingWindowViaPriorityQueue(nums: number[], k: number): number[] {
  const pq = new PriorityQueue<number>()

  for (let i = 0; i < k - 1; i++) {
    pq.emplace(i, nums[i])
  }

  const res = []
  for (let i = k - 1; i < nums.length; i++) {
    pq.emplace(i, nums[i])
    while (pq.size) {
      const maxIdx = pq.peek()
      if (maxIdx < i - k + 1) {
        pq.pop()
      } else {
        res.push(nums[maxIdx])
        break
      }
    }
  }
  return res
}
