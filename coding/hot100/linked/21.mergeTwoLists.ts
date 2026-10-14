import { ListNode } from "./listNode"

function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
  if (list1 === null) return list2
  if (list2 === null) return list1

  let head, tail
  if (list1.val < list2.val) {
    head = list1
    list1 = list1.next
  } else {
    head = list2
    list2 = list2.next
  }

  tail = head

  while (true) {
    if (list1 === null) {
      tail.next = list2
      break
    }
    if (list2 === null) {
      tail.next = list1
      break
    }

    if (list1.val < list2.val) {
      tail.next = list1
      list1 = list1.next
    } else {
      tail.next = list2
      list2 = list2.next
    }
    tail = tail.next
  }
  return head
}
