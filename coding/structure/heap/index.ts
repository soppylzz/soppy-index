type Comparator<T> = (a: T, b: T) => number

class Heap<T> {
  private data: T[] = []
  private compare: Comparator<T>

  constructor(compare: Comparator<T> = ((a: number, b: number) => a - b) as Comparator<T>) {
    this.compare = compare
  }

  get size(): number {
    return this.data.length
  }

  peek(): T | undefined {
    return this.data[0]
  }

  push(value: T): void {
    this.data.push(value)
    this.siftUp(this.data.length - 1)
  }

  pop(): T | undefined {
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this.siftDown(0)
    }
    return top
  }

  static from<T>(values: Iterable<T>, compare?: Comparator<T>): Heap<T> {
    const heap = new Heap(compare)
    heap.data = [...values]
    for (let i = (heap.data.length >> 1) - 1; i >= 0; i--) heap.siftDown(i)
    return heap
  }

  private siftUp(i: number): void {
    const value = this.data[i]
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.compare(value, this.data[parent]) >= 0) break
      this.data[i] = this.data[parent]
      i = parent
    }
    this.data[i] = value
  }

  private siftDown(i: number): void {
    const n = this.data.length
    const value = this.data[i]
    while (true) {
      const left = 2 * i + 1
      const right = left + 1
      let best = i
      let bestValue = value
      if (left < n && this.compare(this.data[left], bestValue) < 0) {
        best = left
        bestValue = this.data[left]
      }
      if (right < n && this.compare(this.data[right], bestValue) < 0) {
        best = right
        bestValue = this.data[right]
      }
      if (best === i) break
      this.data[i] = bestValue
      i = best
    }
    this.data[i] = value
  }
}

/* ==================== demo ==================== */
const minHeap = new Heap<number>()
for (const x of [5, 3, 8, 1, 9]) minHeap.push(x)
console.log(minHeap.size)
console.log(minHeap.peek())
console.log(minHeap.pop())
console.log(minHeap.pop())

const maxHeap = Heap.from([7, 2, 9, 4], (a, b) => b - a)
console.log(maxHeap.pop())
console.log(maxHeap.peek())

const pairHeap = Heap.from<[number, string]>(
  [
    [2, "b"],
    [1, "a"],
    [3, "c"],
  ],
  (a, b) => a[0] - b[0]
)
console.log(pairHeap.pop())

// top-k smallest via a max-heap of capacity k => O(nlogk)
function topKSmallest(nums: number[], k: number): number[] {
  const heap = new Heap<number>((a, b) => b - a)
  for (const num of nums) {
    if (heap.size < k) {
      heap.push(num)
    } else if (num < heap.peek()!) {
      heap.pop()
      heap.push(num)
    }
  }
  const result: number[] = []
  while (heap.size > 0) result.push(heap.pop()!)
  return result.reverse()
}
console.log(topKSmallest([5, 3, 8, 1, 9, 2], 3))

export {}
