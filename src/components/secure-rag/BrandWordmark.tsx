"use client";

import React from "react";

/**
 * PROMPTWALL brand wordmark — recreated as styled HTML using the
 * uploaded wordmark image as design inspiration.
 *
 *   • "PROMPT"  — slate-800 (neutral)
 *   • "WALL"    — orange→amber gradient text (warm accent)
 *   • Star ✦  icon inline between the two halves (suggests AI/sparkle)
 *   • Lightning bolt ⚡ as a flourish at the end (energy/dynamism)
 *   • Slash accent on the leading "P" (forward momentum)
 *
 * The brand-mark image lives at /brand-wordmark.png and is used by the
 * floating bottom panel for the full-resolution treatment.
 */
interface BrandWordmarkProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
}

const SIZE_TEXT: Record<NonNullable<BrandWordmarkProps["size"]>, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl md:text-4xl",
};

const SIZE_ICON: Record<NonNullable<BrandWordmarkProps["size"]>, number> = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 22,
};

const StarIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M12 0c.6 4.5 2.7 6.6 7.2 7.2-4.5.6-6.6 2.7-7.2 7.2-.6-4.5-2.7-6.6-7.2-7.2C9.3 6.6 11.4 4.5 12 0z" />
    <path
      d="M19 14c.3 2.2 1.3 3.2 3.5 3.5-2.2.3-3.2 1.3-3.5 3.5-.3-2.2-1.3-3.2-3.5-3.5 2.2-.3 3.2-1.3 3.5-3.5z"
      opacity={0.85}
    />
  </svg>
);

const BoltIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
);

const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  className = "",
  size = "md",
  showTagline = false,
}) => {
  const textCls = SIZE_TEXT[size];
  const iconSize = SIZE_ICON[size];

  return (
    <div className="inline-flex flex-col">
      <span
        className={`inline-flex items-center gap-1 font-extrabold tracking-tight ${textCls} ${className}`}
      >
        {/* Slash accent — orange leading bar */}
        <span
          className="inline-block h-[1em] w-[3px] -mr-0.5 self-center rounded-full"
          style={{
            background:
              "linear-gradient(180deg, var(--color-accent-blue), var(--color-accent-purple))",
            boxShadow: "0 0 6px rgba(249, 115, 22, 0.55)",
          }}
          aria-hidden
        />
        {/* "PROMPT" — neutral text (slate-900 in light theme, white in dark theme) */}
        <span className="text-slate-900 dark:text-slate-100 text-shadow-soft">PROMPT</span>

        {/* Inline star ✦ — orange accent (suggests AI sparkle) */}
        <span className="text-accent-blue -mx-0.5 inline-flex items-center self-center">
          <StarIcon size={iconSize} />
        </span>

        {/* "WALL" — orange→amber gradient */}
        <span className="text-gradient-warm">WALL</span>

        {/* Trailing lightning bolt — orange flourish */}
        <span className="ml-1 inline-flex items-center self-center text-accent-blue">
          <BoltIcon size={iconSize} />
        </span>
      </span>

      {showTagline && (
        <span className="mt-1 text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-accent-blue">
          Think Safe. Act Safe.
        </span>
      )}
    </div>
  );
};

export default BrandWordmark;
