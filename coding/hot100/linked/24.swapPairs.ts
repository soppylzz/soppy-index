import { ListNode } from "./listNode"

function swapPairs(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head

  const result = head.next

  let one: ListNode | null = head,
    preOne: ListNode | null = null

  while (one !== null && one.next !== null) {
    const two: ListNode = one.next
    const nextOne = two.next

    if (preOne) preOne.next = two

    one.next = two.next
    two.next = one

    preOne = one
    one = nextOne
  }

  return result
}
