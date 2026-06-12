import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * BackgroundPaths — the 21st.dev animated SVG "paths" section, adapted to
 * BuildForce: brand-teal lines via the `primary` token, deterministic stroke
 * durations (no Math.random → SSR-safe), reduced-motion-safe, RTL-friendly, and
 * usable as an in-page section that hosts its own title + CTA via `children`.
 */

function FloatingPaths({ position }: { position: number }) {
  const reduce = useReducedMotion();
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <svg className="h-full w-full text-primary" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.08 + path.id * 0.025}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={
              reduce
                ? { pathLength: 1, opacity: 0.35 }
                : { pathLength: 1, opacity: [0.25, 0.5, 0.25], pathOffset: [0, 1, 0] }
            }
            transition={{
              duration: 20 + (path.id % 10),
              repeat: reduce ? 0 : Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths({
  title = "BuildForce",
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const words = title.split(" ");

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-background",
        "flex min-h-[80vh] items-center justify-center",
        className,
      )}
    >
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 1.4 }}
        >
          <h2 className="mb-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="me-3 inline-block last:me-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={reduce ? false : { y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.1 + letterIndex * 0.03,
                      type: "spring",
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h2>

          {subtitle && (
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {subtitle}
            </p>
          )}

          {children}
        </motion.div>
      </div>
    </div>
  );
}
