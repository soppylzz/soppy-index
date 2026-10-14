// solution: 1) hash O(n) 2) knot-way (interleave copies into the list, implemented below)
class _Node {
  val: number
  next: _Node | null
  random: _Node | null
  constructor(val?: number, next?: _Node, random?: _Node) {
    this.val = val === undefined ? 0 : val
    this.next = next === undefined ? null : next
    this.random = random === undefined ? null : random
  }
}

function copyRandomList(head: _Node | null): _Node | null {
  if (head === null) return null
  let pointer: _Node | null = head

  // create copy
  while (pointer !== null) {
    const copy: _Node = new _Node(pointer.val)

    copy.next = pointer.next
    pointer.next = copy

    pointer = copy.next
  }

  // fill random
  pointer = head
  while (pointer !== null && pointer.next !== null) {
    const copy = pointer.next
    if (pointer.random) copy.random = pointer.random.next

    pointer = pointer.next.next
  }

  // extract copy
  const newHead = head.next
  pointer = head
  while (pointer !== null && pointer.next !== null) {
    const copy: _Node = pointer.next
    pointer.next = copy.next
    if (copy.next) copy.next = copy.next.next

    pointer = pointer.next
  }

  return newHead
}
