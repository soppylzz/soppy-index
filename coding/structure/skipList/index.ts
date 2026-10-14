const MAX_LEVEL = 16
const P = 0.25

class SkipListNode {
  score: number
  forward: (SkipListNode | null)[]

  constructor(score: number, level: number) {
    this.score = score
    this.forward = new Array(level).fill(null)
  }
}

class SkipList {
  private head = new SkipListNode(-Infinity, MAX_LEVEL)
  private level = 1

  search(target: number): boolean {
    const candidate = this.predecessors(target)[0].forward[0]
    return candidate !== null && candidate.score === target
  }

  insert(score: number): void {
    const updates = this.predecessors(score)
    const newLevel = this.randomLevel()
    if (newLevel > this.level) {
      for (let i = this.level; i < newLevel; i++) updates[i] = this.head
      this.level = newLevel
    }
    const node = new SkipListNode(score, newLevel)
    for (let i = 0; i < newLevel; i++) {
      node.forward[i] = updates[i].forward[i]
      updates[i].forward[i] = node
    }
  }

  erase(score: number): boolean {
    const updates = this.predecessors(score)
    const target = updates[0].forward[0]
    if (target === null || target.score !== score) return false
    for (let i = 0; i < this.level; i++) {
      if (updates[i].forward[i] === target) updates[i].forward[i] = target.forward[i]
    }
    while (this.level > 1 && this.head.forward[this.level - 1] === null) this.level--
    return true
  }

  // bottom level is the full sorted list
  toArray(): number[] {
    const result: number[] = []
    let node = this.head.forward[0]
    while (node !== null) {
      result.push(node.score)
      node = node.forward[0]
    }
    return result
  }

  // per-level predecessor of the first node with score >= target
  private predecessors(target: number): SkipListNode[] {
    const updates: SkipListNode[] = new Array(MAX_LEVEL).fill(this.head)
    let node = this.head
    for (let i = this.level - 1; i >= 0; i--) {
      while (node.forward[i] !== null && node.forward[i]!.score < target) {
        node = node.forward[i]!
      }
      updates[i] = node
    }
    return updates
  }

  private randomLevel(): number {
    let level = 1
    while (Math.random() < P && level < MAX_LEVEL) level++
    return level
  }
}

/* ==================== demo ==================== */
const list = new SkipList()
for (const x of [3, 6, 9, 2, 7, 1]) list.insert(x)
console.log(list.toArray())
console.log(list.search(7))
console.log(list.search(4))
console.log(list.erase(7))
console.log(list.search(7))
console.log(list.toArray())

export {}
