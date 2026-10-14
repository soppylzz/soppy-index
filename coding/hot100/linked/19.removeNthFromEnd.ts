import { ListNode } from "./listNode"

function removeNthFromEnd(head: ListNode | null, n: number): ListNode | null {
  if (!head || head.next === null) return null

  let pointer: ListNode | null = head!.next,
    kPrev: ListNode | null = null,
    k: ListNode
  for (let i = 0; i < n - 1; i++) {
    pointer = pointer!.next
  }

  k = head!

  while (pointer !== null) {
    kPrev = k
    k = k.next!
    pointer = pointer.next
  }

  if (kPrev) kPrev.next = k.next
  else head = head!.next

  return head
}
