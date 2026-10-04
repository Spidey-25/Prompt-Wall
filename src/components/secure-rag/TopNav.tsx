"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { BackendStatus } from "@/types";
import { Dot } from "./icons";
import { useTheme, type ThemeMode } from "@/hooks/useTheme";
import { useMagneticHover } from "@/hooks/useMagneticHover";
import { triggerConfetti } from "@/lib/effects/confetti";

interface TopNavProps {
  status: BackendStatus;
  approvalsPending?: number;
}

const STATUS_META: Record<
  BackendStatus,
  { color: string; label: string; pulse: boolean }
> = {
  Connected: { color: "#22C55E", label: "Live System", pulse: false },
  Connecting: { color: "#F59E0B", label: "Connecting", pulse: true },
  Disconnected: { color: "#EF4444", label: "Offline", pulse: true },
};

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/playground", label: "Agent Playground" },
  { href: "/security-testing", label: "Security Testing" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/evaluation", label: "Evaluation" },
];

const SearchIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);

const RefreshIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <polyline points="21 3 21 8 16 8" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <polyline points="3 21 3 16 8 16" />
  </svg>
);

const BellIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

const ShieldCheckIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const SunIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/** Magnetic nav link wrapper with framer-motion indicator */
const NavLink: React.FC<{ href: string; label: string; active: boolean }> = ({
  href,
  label,
  active,
}) => {
  const ref = useMagneticHover<HTMLAnchorElement>(0.25);
  return (
    <Link
      ref={ref}
      href={href}
      className={`relative rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
        active ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeNavTab"
          className="absolute inset-0 rounded-lg"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 106, 0, 0.22), rgba(255, 194, 26, 0.14))",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(255, 106, 0, 0.40), 0 0 14px -2px rgba(255, 106, 0, 0.30)",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </Link>
  );
};

const TopNav: React.FC<TopNavProps> = ({ status, approvalsPending = 0 }) => {
  const m = STATUS_META[status];
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Mouse-tracking glow for navigation bar
  const navRef = useRef<HTMLElement>(null);
  const [glow, setGlow] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      setGlow({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        visible: true,
      });
    };
    const onLeave = () => setGlow((g) => ({ ...g, visible: false }));
    nav.addEventListener("mousemove", onMove);
    nav.addEventListener("mouseleave", onLeave);
    return () => {
      nav.removeEventListener("mousemove", onMove);
      nav.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const handleRefresh = () => {
    triggerConfetti({ particleCount: 30, spread: 50 });
  };

  return (
    <nav
      ref={navRef}
      className="sticky top-3 z-30 mb-6 rounded-2xl border border-accent-blue/40 bg-ink-900/85 px-4 py-3 backdrop-blur-xl md:px-5"
      style={{
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 0 24px -2px rgba(255, 106, 0, 0.35), 0 8px 32px -8px rgba(0, 0, 0, 0.5)",
        transition: "box-shadow 300ms ease, border-color 300ms ease",
      }}
    >
      {/* Continuous glowing moving line effect across top border */}
      <div className="pointer-events-none absolute -top-px left-0 right-0 h-[2px] overflow-hidden rounded-t-2xl">
        <motion.div
          className="h-full w-1/3 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, #FF6A00 40%, #FFC21A 70%, transparent)",
            boxShadow: "0 0 16px 3px rgba(255, 106, 0, 0.85)",
          }}
          animate={{ x: ["-100%", "350%"] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
        />
      </div>

      {/* Mouse-tracking radial glow (JS effect) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: glow.visible ? 1 : 0,
          background: `radial-gradient(280px 80px at ${glow.x}px ${glow.y}px, rgba(255, 106, 0, 0.20), transparent 70%)`,
        }}
      />

      <div className="relative flex flex-nowrap items-center justify-between gap-2.5 md:gap-4 overflow-hidden">
        {/* Left: Brand Logo + Wordmark + Nav links */}
        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 transition-transform hover:scale-[1.02]"
          >
            {/* SVG Shield Icon — no image dependency */}
            <div className="logo-emblem flex h-8 w-8 items-center justify-center rounded-lg shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-blue">
                <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div className="hidden sm:flex sm:flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                PROMPT<span className="text-gradient-warm">WALL</span>
              </span>
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-accent-blue">
                Think Safe. Act Safe.
              </span>
            </div>
          </Link>

          <span className="hidden h-6 w-px bg-ink-600 md:inline-block" />

          {/* Navigation Links */}
          <div className="hidden items-center gap-1.5 lg:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(link.href)}
              />
            ))}
          </div>
        </div>

        {/* Right: Black & White Background Button + Approvals + Status + Search */}
        <div className="ml-auto flex flex-nowrap items-center gap-2 md:gap-3 shrink-0">
          {/* ============================================================ */}
          {/* BLACK & WHITE BACKGROUND COLOR BUTTON SWITCHER ON TOP HEADER */}
          {/* ============================================================ */}
          <div
            className="flex items-center rounded-xl border border-ink-600 bg-ink-850 p-1"
            style={{ boxShadow: "var(--shadow-3d-sm)" }}
            title="Toggle Page Background: Black (Dark Mode) vs White (Light Mode)"
          >
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                theme === "dark"
                  ? "bg-slate-900 text-white border border-accent-blue/50 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MoonIcon size={14} />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                theme === "light"
                  ? "bg-accent-blue text-white border border-accent-blue shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <SunIcon size={14} />
              <span>White</span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="relative hidden xl:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search security policies, agents, logs…"
              className="input-base w-48 rounded-lg py-1.5 pl-9 pr-12 text-[12.5px] md:w-56"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-ink-600 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
              ⌘K
            </kbd>
          </div>

          {/* Refresh Action Button */}
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Security Telemetry"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 bg-ink-850 text-slate-400 transition-all hover:-translate-y-0.5 hover:border-accent-blue/40 hover:text-accent-blue"
            style={{ boxShadow: "var(--shadow-3d-sm)" }}
          >
            <RefreshIcon size={15} />
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            title="Security Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-ink-600 bg-ink-850 text-slate-400 transition-all hover:-translate-y-0.5 hover:border-accent-blue/40 hover:text-accent-blue"
            style={{ boxShadow: "var(--shadow-3d-sm)" }}
          >
            <BellIcon size={15} />
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-blue"
              style={{ boxShadow: "0 0 6px rgba(255, 106, 0, 0.7)" }}
            />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
