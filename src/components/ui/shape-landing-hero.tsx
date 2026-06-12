import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * HeroGeometric — the 21st.dev "shape landing hero", adapted to BuildForce:
 * brand-aligned glow shapes (teal / cyan / terracotta instead of indigo/rose),
 * RTL-ready, reduced-motion-safe, and able to host real CTAs via `children`.
 *
 * Always dark by design (it's a dramatic full-bleed hero), so it uses explicit
 * light-on-near-black colours rather than theme tokens.
 */

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, 15, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "border-2 border-white/[0.15] backdrop-blur-[2px]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.08)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]",
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export function HeroGeometric({
  badge,
  title1,
  title2,
  subtitle,
  children,
  className,
}: {
  badge?: string;
  title1?: string;
  title2?: string;
  subtitle?: string;
  /** CTAs / trust signals rendered below the subtitle. */
  children?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: reduce ? 0 : 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 1, delay: 0.4 + i * 0.2, ease: [0.25, 0.4, 0.25, 1] as const },
    }),
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-[#0a0d0f]",
        "flex min-h-[88vh] items-center justify-center",
        className,
      )}
    >
      {/* brand wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.07] via-transparent to-violet-500/[0.07] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.16]"
          className="-left-[10%] top-[15%] md:-left-[5%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-orange-500/[0.14]"
          className="-right-[5%] top-[70%] md:right-[0%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.16]"
          className="left-[5%] bottom-[5%] md:left-[10%] md:bottom-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.15]"
          className="right-[15%] top-[10%] md:right-[20%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-fuchsia-500/[0.14]"
          className="left-[20%] top-[5%] md:left-[25%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center md:px-6">
        {badge && (
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 md:mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
            </span>
            <span className="text-sm tracking-wide text-white/70">{badge}</span>
          </motion.div>
        )}

        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl md:mb-8 md:text-7xl">
            {title1 && (
              <span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">
                {title1}
              </span>
            )}
            {title1 && title2 && <br />}
            {title2 && (
              <span className="bg-gradient-to-r from-indigo-300 via-white/90 to-violet-300 bg-clip-text text-transparent">
                {title2}
              </span>
            )}
          </h1>
        </motion.div>

        {subtitle && (
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
            <p className="mx-auto mb-8 max-w-xl text-base font-light leading-relaxed tracking-wide text-white/50 sm:text-lg md:text-xl">
              {subtitle}
            </p>
          </motion.div>
        )}

        {children && (
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
            {children}
          </motion.div>
        )}
      </div>

      {/* top/bottom vignette to blend into the page */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0d0f] via-transparent to-[#0a0d0f]/80" />
    </div>
  );
}
