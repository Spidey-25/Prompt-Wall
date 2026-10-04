"use client";

import React from "react";
import Image from "next/image";

/**
 * FloatingBrandPanel â€” bottom hero panel that wraps the bright PROMPTWALL
 * wordmark image. The wrapper continuously bobs (vertical float) while the
 * inner panel continuously rotates on Y/X axes in 3D. On hover the rotation
 * pauses and the panel snaps to a dramatic 3D tilt; inner content counter-
 * tilts so the wordmark stays readable.
 */
const FloatingBrandPanel: React.FC = () => {
  return (
    <section
      className="persp-deep relative mt-2 mb-6 flex w-full justify-center px-4"
      aria-label="PROMPTWALL brand panel"
    >
      {/* Outer wrapper â€” gentle continuous float */}
      <div className="float-bob relative w-full max-w-[1400px]">
        {/* Inner panel â€” continuous 3D rotation, dramatic tilt on hover */}
        <div className="tilt-3d">
          <div className="brand-panel px-6 py-8 md:px-10 md:py-10">
            {/* Inner counter-tilt â€” keeps the wordmark image readable while the panel tilts */}
            <div className="counter-tilt relative flex flex-col items-center gap-5 md:flex-row md:justify-between md:gap-8">
              {/* Left: wordmark image (the full PROMPTWALL brand strip) */}
              <div className="relative w-full max-w-[680px] shrink-0">
                <Image
                  src="/brand-wordmark.png"
                  alt="PROMPTWALL wordmark"
                  width={1600}
                  height={639}
                  priority
                  className="h-auto w-full"
                  style={{
                    filter:
                      "drop-shadow(0 4px 18px rgba(249, 115, 22, 0.45)) drop-shadow(0 1px 0 rgba(0,0,0,0.4))",
                  }}
                />
              </div>

              {/* Right: tagline + status pills */}
              <div className="flex flex-col items-center gap-3 text-center md:items-end md:text-right">
                <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-accent-blue">
                  Think Safe. Act Safe.
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-200/90">
                  Prompt Injection &amp; Action Security
                </p>
                <p className="max-w-xs text-[13px] font-medium leading-relaxed text-slate-700 dark:text-red-100/70">
                  A secure RAG agent pipeline - content firewall, action guard,
                  and live audit trail for prompt-injection defense.
                </p>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-2 md:justify-end">
                  <Pill label="v1.0" />
                  <Pill label="Frontend Demo" />
                  <Pill label="Mock Mode" />
                </div>
              </div>
            </div>

            {/* Subtle floor reflection / ambient glow at the panel's bottom edge */}
            <div
              className="pointer-events-none absolute -bottom-px left-1/2 h-px w-[80%] -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.6), transparent)",
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const Pill: React.FC<{ label: string }> = ({ label }) => (
  <span
    className="rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-200"
    style={{ boxShadow: "var(--shadow-3d-sm)" }}
  >
    {label}
  </span>
);

export default FloatingBrandPanel;
