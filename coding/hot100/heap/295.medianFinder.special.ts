class Heap_ {
  private data: number[] = []

  constructor(private compare: (a: number, b: number) => boolean) {}

  get size() {
    return this.data.length
  }

  peek() {
    return this.data[0]
  }

  push(val: number) {
    this.data.push(val)

    let cur = this.data.length - 1

    while (cur > 0) {
      const parent = (cur - 1) >> 1

      if (!this.compare(this.data[cur], this.data[parent])) break

      ;[this.data[cur], this.data[parent]] = [this.data[parent], this.data[cur]]

      cur = parent
    }
  }

  pop() {
    if (this.data.length === 0) return undefined
    if (this.data.length === 1) return this.data.pop()

    const top = this.data[0]
    this.data[0] = this.data.pop()!

    let cur = 0

    while (true) {
      const left = cur * 2 + 1
      const right = cur * 2 + 2
      let best = cur

      if (left < this.data.length && this.compare(this.data[left], this.data[best])) {
        best = left
      }

      if (right < this.data.length && this.compare(this.data[right], this.data[best])) {
        best = right
      }

      if (best === cur) break

      ;[this.data[cur], this.data[best]] = [this.data[best], this.data[cur]]

      cur = best
    }

    return top
  }
}

// just memorize this pattern
class MedianFinder {
  private maxHeap = new Heap_((a, b) => a > b)
  private minHeap = new Heap_((a, b) => a < b)

  constructor() {}

  addNum(num: number): void {
    this.maxHeap.push(num)

    this.minHeap.push(this.maxHeap.pop()!)

    if (this.minHeap.size > this.maxHeap.size) {
      this.maxHeap.push(this.minHeap.pop()!)
    }
  }

  findMedian(): number {
    if (this.maxHeap.size > this.minHeap.size) {
      return this.maxHeap.peek()
    }

    return (this.maxHeap.peek() + this.minHeap.peek()) / 2
  }
}
