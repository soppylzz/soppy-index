import { useEffect, useState } from "react"
import { useIntersectionObserver } from "../hooks/useIntersectionObserver.ts"

export function LazyImage({
  src,
  alt,
  width,
  height,
}: {
  src: string
  alt: string
  width: number
  height: number
}) {
  const [element, setElement] = useState<HTMLImageElement | null>(null)
  const [requested, setRequested] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const { entry, supported } = useIntersectionObserver(requested === src ? null : element, {
    rootMargin: "100px",
  })
  useEffect(() => {
    if (entry?.isIntersecting || !supported) setRequested(src)
  }, [entry, supported, src])
  return (
    <figure>
      <img
        ref={setElement}
        src={requested === src ? src : undefined}
        alt={alt}
        width={width}
        height={height}
        onError={() => setFailed(src)}
        style={{ maxWidth: "100%", objectFit: "cover" }}
      />
      {failed === src && <figcaption role="alert">Image could not be loaded.</figcaption>}
    </figure>
  )
}
