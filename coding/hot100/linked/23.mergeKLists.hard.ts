import { ListNode } from "./listNode"

/**
 * solution:
 * 1. priority queue
 * 2. merge sort concept (pairwise merging)
 */
function mergeKLists(lists: Array<ListNode | null>): ListNode | null {
  const preHead = new ListNode(0)
  const heap: ListNode[] = []

  function swin(node: ListNode) {
    heap.push(node)
    let cur = heap.length - 1
    while (cur > 0 && heap[cur].val < heap[(cur - 1) >> 1].val) {
      const parent = (cur - 1) >> 1
      ;[heap[cur], heap[parent]] = [heap[parent], heap[cur]]
      cur = parent
    }
  }

  function sink(): ListNode {
    ;[heap[0], heap[heap.length - 1]] = [heap[heap.length - 1], heap[0]]
    const heapLength = heap.length - 1
    let cur = 0

    while (true) {
      const left = 2 * cur + 1
      const right = 2 * cur + 2

      let child = cur

      if (left < heapLength && heap[child].val > heap[left].val) {
        child = left
      }
      // tip: compare the right child against the current child (smaller of cur/left)
      if (right < heapLength && heap[child].val > heap[right].val) {
        child = right
      }

      if (child === cur) break
      ;[heap[cur], heap[child]] = [heap[child], heap[cur]]
      cur = child
    }

    return heap.pop()!
  }

  for (let i = 0; i < lists.length; i++) {
    const node = lists[i]
    if (!node) continue
    swin(node)
  }

  let tail = preHead
  while (heap.length) {
    const min = sink()
    tail.next = min
    tail = tail.next

    const next = min.next
    if (next) {
      swin(next)
    }
  }

  return preHead.next
}

function merge(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const preHead = new ListNode(0)

  let tail = preHead
  while (l1 && l2) {
    if (l1.val <= l2.val) {
      tail.next = l1
      l1 = l1.next
    } else {
      tail.next = l2
      l2 = l2.next
    }

    tail = tail.next
  }
  tail.next = l1 || l2
  return preHead.next
}

function mergeKListsStupid(lists: Array<ListNode | null>): ListNode | null {
  if (lists.length === 0) return null

  let prev = lists.slice(),
    l = prev.length

  while (l > 1) {
    const merged = []
    for (let i = 0; i < l; i += 2) {
      if (i + 1 < l) {
        merged.push(merge(prev[i], prev[i + 1]))
      } else {
        merged.push(prev[i])
      }
    }
    prev = merged
    l = merged.length
  }

  return prev[0]
}
