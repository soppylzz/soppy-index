import { ListNode } from "./listNode"

function hasCycle(head: ListNode | null): boolean {
  if (head === null) return false

  let slow = head,
    fast = head,
    result = false

  while (!result && fast.next !== null && fast.next.next !== null) {
    slow = slow.next!
    fast = fast.next.next

    if (slow === fast) result = true
  }

  return result
}
