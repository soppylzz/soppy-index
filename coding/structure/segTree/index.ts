// sum segment tree with lazy propagation over range add
class SegTree {
  private n: number
  private sum: number[]
  private lazy: number[]

  constructor(values: number[]) {
    this.n = values.length
    this.sum = new Array(4 * this.n).fill(0)
    this.lazy = new Array(4 * this.n).fill(0)
    this.build(1, 0, this.n - 1, values)
  }

  queryRange(left: number, right: number): number {
    return this.query(1, 0, this.n - 1, left, right)
  }

  addRange(left: number, right: number, v: number): void {
    this.add(1, 0, this.n - 1, left, right, v)
  }

  private build(node: number, l: number, r: number, values: number[]): void {
    if (l === r) {
      this.sum[node] = values[l]
      return
    }
    const mid = (l + r) >> 1
    this.build(2 * node, l, mid, values)
    this.build(2 * node + 1, mid + 1, r, values)
    this.sum[node] = this.sum[2 * node] + this.sum[2 * node + 1]
  }

  private add(node: number, l: number, r: number, left: number, right: number, v: number): void {
    if (right < l || r < left) return
    if (left <= l && r <= right) {
      this.sum[node] += v * (r - l + 1)
      this.lazy[node] += v
      return
    }
    this.pushDown(node, l, r)
    const mid = (l + r) >> 1
    this.add(2 * node, l, mid, left, right, v)
    this.add(2 * node + 1, mid + 1, r, left, right, v)
    this.sum[node] = this.sum[2 * node] + this.sum[2 * node + 1]
  }

  private pushDown(node: number, l: number, r: number): void {
    if (this.lazy[node] === 0) return
    const mid = (l + r) >> 1
    for (const child of [2 * node, 2 * node + 1]) {
      this.sum[child] += this.lazy[node] * (child === 2 * node ? mid - l + 1 : r - mid)
      this.lazy[child] += this.lazy[node]
    }
    this.lazy[node] = 0
  }

  private query(node: number, l: number, r: number, left: number, right: number): number {
    if (right < l || r < left) return 0
    if (left <= l && r <= right) return this.sum[node]
    this.pushDown(node, l, r)
    const mid = (l + r) >> 1
    return (
      this.query(2 * node, l, mid, left, right) + this.query(2 * node + 1, mid + 1, r, left, right)
    )
  }
}

/* ==================== demo ==================== */
const seg = new SegTree([1, 3, 5, 7, 9, 11])
console.log(seg.queryRange(1, 3))
seg.addRange(1, 3, 2)
console.log(seg.queryRange(1, 3))
console.log(seg.queryRange(0, 5))

export {}
