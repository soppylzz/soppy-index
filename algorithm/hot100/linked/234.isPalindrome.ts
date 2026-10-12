import { ListNode } from "./listNode"

function isPalindromeStupid(head: ListNode | null): boolean {
  let origin = "",
    reverse = "",
    p = head

  while (p !== null) {
    origin = origin + p.val
    reverse = p.val + reverse
    p = p.next
  }

  return origin === reverse
}

function reverseListSimplified(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null,
    cur = head

  while (cur !== null) {
    const temp = cur.next
    cur.next = prev
    prev = cur
    cur = temp
  }

  return prev
}

function isPalindrome(head: ListNode | null): boolean {
  if (head === null || head.next === null) return true

  // tip: use slow/fast pointers to find the center
  let slow = head,
    fast = head

  while (fast.next !== null && fast.next.next !== null) {
    slow = slow.next!
    fast = fast.next.next
  }

  const half = reverseListSimplified(slow.next)

  let p1 = head,
    p2 = half
  let result = true

  while (result && p2 !== null) {
    if (p1.val !== p2.val) {
      result = false
    }

    p1 = p1.next!
    p2 = p2.next
  }

  slow.next = reverseListSimplified(half)
  return result
}
