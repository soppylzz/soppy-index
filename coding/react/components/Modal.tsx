import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current!
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
    return () => {
      if (element.open) element.close()
    }
  }, [open])
  return createPortal(
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
    >
      <h2>{title}</h2>
      {children}
      <button onClick={onClose}>Close dialog</button>
    </dialog>,
    document.body
  )
}
