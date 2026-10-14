class UnionFind {
  count: number
  private parent: number[]
  private rank: number[]

  constructor(n: number) {
    this.count = n
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array(n).fill(0)
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]] // path halving
      x = this.parent[x]
    }
    return x
  }

  // returns false when already connected
  union(x: number, y: number): boolean {
    const rx = this.find(x)
    const ry = this.find(y)
    if (rx === ry) return false
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx
    } else {
      this.parent[ry] = rx
      this.rank[rx]++
    }
    this.count--
    return true
  }

  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y)
  }
}

/* ==================== demo ==================== */
const uf = new UnionFind(6)
uf.union(0, 1)
uf.union(1, 2)
uf.union(3, 4)
console.log(uf.connected(0, 2))
console.log(uf.connected(0, 3))
console.log(uf.count)
console.log(uf.union(2, 3))
console.log(uf.union(1, 4)) // false: already connected
console.log(uf.count)

export {}
