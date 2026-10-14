import { ListNode } from "./listNode"

// Floyd's cycle detection algorithm
function detectCycle(head: ListNode | null): ListNode | null {
  if (head === null) return null

  let slow = head,
    fast = head

  while (true) {
    if (fast.next === null || fast.next.next === null) {
      return null
    }

    slow = slow.next!
    fast = fast.next.next

    if (slow === fast) break
  }

  // reset slow to head
  slow = head

  while (slow !== fast) {
    slow = slow.next!
    fast = fast.next!
  }

  return slow
}
