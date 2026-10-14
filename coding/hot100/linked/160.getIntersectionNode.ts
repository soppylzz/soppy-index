import { ListNode } from "./listNode"

function getIntersectionNode(headA: ListNode | null, headB: ListNode | null): ListNode | null {
  if (headA === null || headB === null) return null

  let a = headA,
    b = headB,
    aNullFlag = false,
    bNullFlag = false

  while (true) {
    if (a == b) return a

    if (a.next === null) {
      if (aNullFlag) return null
      aNullFlag = true

      a = headB
    } else {
      a = a.next
    }

    if (b.next === null) {
      if (bNullFlag) return null
      bNullFlag = true

      b = headA
    } else {
      b = b.next
    }
  }
}

function getIntersectionNodeSimplified(
  headA: ListNode | null,
  headB: ListNode | null
): ListNode | null {
  let a = headA
  let b = headB

  while (a !== b) {
    a = a === null ? headB : a.next
    b = b === null ? headA : b.next
  }

  return a
}
