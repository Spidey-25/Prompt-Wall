"use client";

import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 18): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const ShieldIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

export const SpinnerIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p} className={`animate-spin-slow ${p.className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <polyline points="4 12 9 17 20 6" />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
);

export const BoltIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);

export const FirewallIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="14" x2="21" y2="14" />
    <line x1="9" y1="4" x2="9" y2="9" />
    <line x1="15" y1="9" x2="15" y2="14" />
    <line x1="9" y1="14" x2="9" y2="20" />
  </svg>
);

export const CpuIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const ToolIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M14 6l3-3 4 4-3 3a4 4 0 0 1-5.66 0L7 14l-3 3-1-1 3-3 6.66-6.66A4 4 0 0 1 14 6z" />
  </svg>
);

export const DocIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M6 3h7l5 5v13H6z" />
    <polyline points="13 3 13 8 18 8" />
  </svg>
);

export const FlaskIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
    <path d="M7 15h10" />
  </svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3l10 18H2L12 3z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <circle cx="12" cy="17.5" r="0.5" fill="currentColor" />
  </svg>
);

export const GaugeIcon: React.FC<IconProps> = ({ size, ...p }) => (
  <svg {...base(size)} {...p}>
    <path d="M3 18a9 9 0 1 1 18 0" />
    <line x1="12" y1="18" x2="16" y2="13" />
  </svg>
);

export const Dot = React.forwardRef<
  HTMLSpanElement,
  { color: string; pulse?: boolean } & React.HTMLAttributes<HTMLSpanElement>
>(({ color, pulse, ...p }, ref) => (
  <span
    ref={ref}
    {...p}
    className={`inline-block h-2 w-2 rounded-full ${pulse ? "animate-pulse-soft" : ""}`}
    style={{ background: color, boxShadow: `0 0 8px ${color}` }}
  />
));
Dot.displayName = "Dot";
