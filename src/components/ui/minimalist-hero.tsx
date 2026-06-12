import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * MinimalistHero — the 21st.dev "less is more" minimalist layout, adapted to
 * BuildForce: RTL, brand-token colours (indigo accent circle instead of the
 * demo yellow), a circular framed image, and reduced-motion safety. The demo's
 * own nav/footer/social are dropped — the app already has SiteNav.
 */
export function MinimalistHero({
  headline,
  mainText,
  readMoreLabel,
  readMoreHref,
  imageSrc,
  imageAlt,
  className,
}: {
  headline: { part1: string; part2: string };
  mainText: string;
  readMoreLabel: string;
  readMoreHref: string;
  imageSrc: string;
  imageAlt: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section
      className={cn(
        "relative flex min-h-[88vh] w-full items-center overflow-hidden bg-background px-6 py-20 md:px-12",
        className,
      )}
      dir="rtl"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-3">
        {/* Headline (inline-start / right in RTL) */}
        <motion.div {...rise(0.05)} className="order-2 text-center md:order-1 md:text-right">
          <h2 className="text-6xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-7xl lg:text-8xl">
            {headline.part1}
            <br />
            {headline.part2}
          </h2>
        </motion.div>

        {/* Center framed image with brand circle */}
        <div className="order-1 flex items-center justify-center md:order-2">
          <div className="relative">
            <motion.div
              aria-hidden
              initial={reduce ? false : { scale: 0.85, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -right-5 -top-5 h-60 w-60 rounded-full bg-primary md:h-72 md:w-72"
            />
            <motion.img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              width={320}
              height={320}
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="relative z-10 h-60 w-60 rounded-full object-cover shadow-2xl ring-1 ring-border md:h-72 md:w-72"
            />
          </div>
        </div>

        {/* Supporting text (inline-end / left in RTL) */}
        <motion.div {...rise(0.2)} className="order-3 text-center md:text-left">
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground md:mx-0">
            {mainText}
          </p>
          <a
            href={readMoreHref}
            className="mt-4 inline-block text-sm font-semibold text-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-primary"
          >
            {readMoreLabel}
          </a>
        </motion.div>
      </div>
    </section>
  );
}
