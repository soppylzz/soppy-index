import { ListNode } from "./listNode"

function findKEnd(head: ListNode | null, k: number) {
  if (head === null) return null

  let probe: ListNode | null = head
  for (let i = 0; i < k - 1; i++) {
    if (probe === null) return null
    probe = probe.next
  }
  return probe
}

function reverseKGroup(head: ListNode | null, k: number): ListNode | null {
  if (!head || head.next === null) return head
  if (k === 1) return head
  const result = findKEnd(head, k)
  if (result === null) return head

  let pointer: ListNode | null = head,
    preEnd: ListNode | null = null

  while (pointer !== null) {
    let sHead = pointer

    const probe = findKEnd(sHead, k)
    if (probe === null) break
    if (preEnd) preEnd.next = probe

    for (let i = 0; i < k - 1; i++) {
      const next = pointer.next!
      pointer.next = next.next
      next.next = sHead
      sHead = next
    }
    preEnd = pointer
    pointer = pointer.next
  }
  return result
}
