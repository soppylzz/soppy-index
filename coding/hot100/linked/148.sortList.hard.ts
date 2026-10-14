import { ListNode } from "./listNode"

/**
 * merge sort:
 * 1) recursion (O(log n) stack)
 * 2) iteration (sublist sizes 1, 2, 4, 8...; implemented below)
 * just memorize it
 */
function sortList(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head

  let length = 0
  for (let p: ListNode | null = head; p; p = p.next) length++

  const preHead = new ListNode(0, head)

  for (let sub = 1; sub < length; sub <<= 1) {
    let prev = preHead
    let cur = preHead.next

    while (cur) {
      const l1 = cur
      let tail1 = l1
      for (let i = 1; i < sub && tail1.next; i++) tail1 = tail1.next

      const l2 = tail1.next
      if (!l2) break
      let tail2 = l2
      for (let i = 1; i < sub && tail2.next; i++) tail2 = tail2.next

      const next = tail2.next
      tail1.next = null
      tail2.next = null

      prev.next = merge(l1, l2)
      while (prev.next) prev = prev.next
      prev.next = next

      cur = next
    }
  }

  return preHead.next
}

function getMiddle(head: ListNode) {
  let slow: ListNode = head
  let fast: ListNode | null = head

  while (fast.next && fast.next.next) {
    slow = slow.next!
    fast = fast.next.next
  }

  return slow
}

function sortListViaRecursion(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head

  const mid = getMiddle(head)
  const rightHead = mid.next
  // ensure getMiddle stops before mid
  mid.next = null

  const left = sortListViaRecursion(head)
  const right = sortListViaRecursion(rightHead)

  return merge(left, right)
}

function merge(l1: ListNode | null, l2: ListNode | null) {
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
