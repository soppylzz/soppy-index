class Node_ {
  key: number
  value: number
  prev: Node_ | null
  next: Node_ | null
  constructor(key: number, value: number) {
    this.key = key
    this.value = value
    this.prev = null
    this.next = null
  }
}

class LRUCache {
  private capacity: number
  private map: Map<number, Node_>

  // doubly linked list + dummy head / tail
  private head: Node_
  private tail: Node_

  constructor(capacity: number) {
    this.capacity = capacity
    this.map = new Map()
    this.head = new Node_(0, 0)
    this.tail = new Node_(0, 0)

    this.head.next = this.tail
    this.tail.prev = this.head
  }

  /**
   * private helpers:
   * - addToHead
   * - removeNode
   * - moveToHead
   * - removeTail (evicts the LRU end)
   */

  private addToHead(node: Node_) {
    node.prev = this.head
    node.next = this.head.next
    this.head.next!.prev = node
    this.head.next = node
  }

  private removeNode(node: Node_) {
    node.prev!.next = node.next
    node.next!.prev = node.prev

    node.prev = null
    node.next = null
  }

  private moveToHead(node: Node_) {
    this.removeNode(node)
    this.addToHead(node)
  }

  private removeTail() {
    const end = this.tail.prev!
    this.removeNode(end)
    return end
  }

  get(key: number): number {
    const node = this.map.get(key)
    if (!node) return -1
    this.moveToHead(node)
    return node.value
  }

  put(key: number, value: number): void {
    const existing = this.map.get(key)

    if (existing) {
      existing.value = value
      this.moveToHead(existing)
    } else {
      const node = new Node_(key, value)
      this.map.set(key, node)
      this.addToHead(node)

      if (this.map.size > this.capacity) {
        const end = this.removeTail()
        this.map.delete(end.key)
      }
    }
  }
}

/**
 * Your LRUCache object will be instantiated and called as such:
 * var obj = new LRUCache(capacity)
 * var param_1 = obj.get(key)
 * obj.put(key,value)
 */
