import { ListNode } from "./listNode"

// via recursion
function reverse(head: ListNode, tail: ListNode) {
  if (head.next === tail) {
    tail.next = head
    head.next = null
  } else {
    reverse(head.next!, tail)
    head.next!.next = head
    head.next = null
  }
}

function reverseListViaRecursion(head: ListNode | null): ListNode | null {
  if (head === null) return null
  if (head.next === null) return head

  let tail = head.next
  while (tail.next !== null) {
    tail = tail.next
  }

  reverse(head, tail)
  return tail
}

function reverseList(head: ListNode | null): ListNode | null {
  if (head === null) return null

  const tail = head
  let pointer: ListNode | null = head.next,
    temp

  while (pointer !== null) {
    temp = pointer
    pointer = pointer.next

    temp.next = head
    tail.next = pointer
    head = temp
  }

  return head
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
