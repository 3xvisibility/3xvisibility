import { motion, useInView } from "framer-motion";
import { ReactNode, useEffect, useRef, useState, type RefObject } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

const directionOffset = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
};

/**
 * Reveal-once helper with a safety net.
 *
 * `whileInView` alone can leave content permanently invisible (opacity: 0) when
 * the IntersectionObserver misses its trigger — e.g. after DOM mutations from
 * auto-translation, fast scrolling, or a hash-jump straight into the section.
 * The timeout fallback guarantees the content always becomes visible.
 */
export function useRevealed(ref: RefObject<Element>, fallbackMs = 900): boolean {
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [forced, setForced] = useState(false);

  useEffect(() => {
    if (inView) return;
    const id = setTimeout(() => {
      const el = ref.current;
      if (!el) return setForced(true);
      const rect = el.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (visible) setForced(true);
    }, fallbackMs);
    return () => clearTimeout(id);
  }, [inView, ref, fallbackMs]);

  return inView || forced;
}

export function ScrollReveal({ children, className, delay = 0, direction = "up" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={revealed ? { opacity: 1, x: 0, y: 0 } : undefined}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRevealed(ref);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={revealed ? "visible" : "hidden"}
      variants={{
        visible: { transition: { staggerChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
