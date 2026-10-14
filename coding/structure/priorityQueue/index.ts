type Comparator<T> = (a: T, b: T) => number

class PriorityQueue<T> {
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

  offer(value: T): void {
    this.data.push(value)
    this.siftUp(this.data.length - 1)
  }

  poll(): T | undefined {
    const top = this.data[0]
    const last = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = last
      this.siftDown(0)
    }
    return top
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
const tasks = new PriorityQueue<[number, string]>((a, b) => a[0] - b[0])
tasks.offer([3, "write report"])
tasks.offer([1, "fix prod incident"])
tasks.offer([2, "review pr"])
console.log(tasks.poll())
console.log(tasks.poll())
console.log(tasks.poll())
console.log(tasks.poll())

const urgent = new PriorityQueue<number>((a, b) => b - a)
urgent.offer(1)
urgent.offer(5)
urgent.offer(3)
console.log(urgent.poll())

// merge k sorted arrays: keep the current head of each array in the queue, O(N log k)
function mergeKSorted(arrays: number[][]): number[] {
  const pq = new PriorityQueue<[number, number, number]>((a, b) => a[0] - b[0])
  for (let i = 0; i < arrays.length; i++) {
    if (arrays[i].length > 0) pq.offer([arrays[i][0], i, 0])
  }
  const merged: number[] = []
  while (pq.size > 0) {
    const [value, ai, ei] = pq.poll()!
    merged.push(value)
    if (ei + 1 < arrays[ai].length) pq.offer([arrays[ai][ei + 1], ai, ei + 1])
  }
  return merged
}

console.log(
  mergeKSorted([
    [1, 4, 7],
    [2, 5, 8],
    [3, 6, 9],
  ])
)

export {}
