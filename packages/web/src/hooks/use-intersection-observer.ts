import { useCallback, useRef, useState } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {}

export function useIntersectionObserver({
  root,
  rootMargin = "200px",
  threshold,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setIsIntersecting(entry?.isIntersecting ?? false);
        },
        { root, rootMargin, threshold },
      );

      observerRef.current.observe(node);
    },
    [root, rootMargin, threshold],
  );

  return { ref, isIntersecting };
}
