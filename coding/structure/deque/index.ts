class Deque<T> {
  private data: (T | undefined)[] = new Array(4)
  private head = 0
  private count = 0

  get size(): number {
    return this.count
  }

  peekFront(): T | undefined {
    return this.data[this.head]
  }

  peekBack(): T | undefined {
    return this.data[this.index(this.count - 1)]
  }

  pushBack(value: T): void {
    this.growIfNeeded()
    this.data[this.index(this.count)] = value
    this.count++
  }

  pushFront(value: T): void {
    this.growIfNeeded()
    this.head = this.mod(this.head - 1)
    this.data[this.head] = value
    this.count++
  }

  popFront(): T | undefined {
    if (this.count === 0) return undefined
    const value = this.data[this.head]
    this.data[this.head] = undefined
    this.head = this.mod(this.head + 1)
    this.count--
    return value
  }

  popBack(): T | undefined {
    if (this.count === 0) return undefined
    const idx = this.index(this.count - 1)
    const value = this.data[idx]
    this.data[idx] = undefined
    this.count--
    return value
  }

  // physical slot of logical position i
  private index(i: number): number {
    return this.mod(this.head + i)
  }

  // positive modulo, safe when i is negative
  private mod(i: number): number {
    return ((i % this.data.length) + this.data.length) % this.data.length
  }

  private growIfNeeded(): void {
    if (this.count < this.data.length) return
    const next: (T | undefined)[] = new Array(this.data.length * 2)
    for (let i = 0; i < this.count; i++) next[i] = this.data[this.index(i)]
    this.data = next
    this.head = 0
  }
}

/* ==================== demo ==================== */
const deque = new Deque<number>()
deque.pushBack(1)
deque.pushBack(2)
deque.pushFront(0)
console.log(deque.peekFront())
console.log(deque.peekBack())
console.log(deque.popFront())
console.log(deque.popBack())
console.log(deque.size)

// palindrome check from both ends
function isPalindrome(str: string): boolean {
  const chars = new Deque<string>()
  for (const ch of str) chars.pushBack(ch)
  while (chars.size > 1) {
    if (chars.popFront() !== chars.popBack()) return false
  }
  return true
}
console.log(isPalindrome("level"))
console.log(isPalindrome("hello"))

/**
 * sliding window maximum: monotonic decreasing deque of indices, O(n)
 * https://leetcode.cn/problems/sliding-window-maximum/
 */
function maxSlidingWindow(nums: number[], k: number): number[] {
  const result: number[] = []
  const window = new Deque<number>()
  for (let i = 0; i < nums.length; i++) {
    while (window.size > 0 && nums[i] > nums[window.peekBack()!]) window.popBack()
    window.pushBack(i)
    if (window.peekFront()! <= i - k) window.popFront()
    if (i >= k - 1) result.push(nums[window.peekFront()!])
  }
  return result
}
console.log(maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3))

export {}
