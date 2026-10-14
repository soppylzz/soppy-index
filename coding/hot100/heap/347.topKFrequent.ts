function topKFrequent(nums: number[], k: number): number[] {
  const freq = new Map<number, number>()
  for (let i = 0; i < nums.length; i++) {
    freq.set(nums[i], (freq.get(nums[i]) ?? 0) + 1)
  }

  const heap: [num: number, freq: number][] = []

  function push(num: number, freq: number) {
    heap.push([num, freq])
    let cur = heap.length - 1

    while (cur > 0 && heap[cur][1] < heap[(cur - 1) >> 1][1]) {
      const parent = (cur - 1) >> 1
      if (heap[parent][1] <= heap[cur][1]) break
      ;[heap[cur], heap[parent]] = [heap[parent], heap[cur]]
      cur = parent
    }
  }

  function unshift() {
    let cur = 0
    const heapLength = heap.length - 1

    ;[heap[cur], heap[heap.length - 1]] = [heap[heap.length - 1], heap[cur]]
    const result = heap.pop()

    while (cur < heapLength) {
      const left = 2 * cur + 1
      const right = 2 * cur + 2

      let latest = cur

      if (left < heapLength && heap[latest][1] > heap[left][1]) {
        latest = left
      }
      if (right < heapLength && heap[latest][1] > heap[right][1]) {
        latest = right
      }

      if (latest === cur) break
      ;[heap[latest], heap[cur]] = [heap[cur], heap[latest]]
      cur = latest
    }

    return result
  }

  for (const [num, count] of freq.entries()) {
    if (heap.length < k) {
      push(num, count)
    } else if (count > heap[0][1]) {
      push(num, count)
      unshift()
    }
  }

  return heap.map(([num]) => num)
}
