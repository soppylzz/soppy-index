import { ListNode } from "./listNode"

function addTwoNumbers(l1: ListNode | null, l2: ListNode | null): ListNode | null {
  const head = new ListNode((l1!.val + l2!.val) % 10)
  let add = Math.floor((l1!.val + l2!.val) / 10),
    tail = head

  l1 = l1!.next
  l2 = l2!.next

  while (l1 !== null && l2 !== null) {
    tail.next = new ListNode((l1!.val + l2!.val + add) % 10)
    add = Math.floor((l1!.val + l2!.val + add) / 10)

    tail = tail.next
    l1 = l1.next
    l2 = l2.next
  }

  let remain: ListNode | null = l1 !== null ? l1 : l2 !== null ? l2 : null

  while (remain !== null) {
    tail.next = new ListNode((remain.val + add) % 10)
    add = Math.floor((remain.val + add) / 10)

    tail = tail.next
    remain = remain.next
  }

  if (add === 1) {
    tail.next = new ListNode(add)
  }

  return head
}
