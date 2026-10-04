"use client";

import React from "react";
import Image from "next/image";
import type { BackendStatus } from "@/types";
import { Dot } from "./icons";
import BrandWordmark from "./BrandWordmark";

interface HeaderProps {
  status: BackendStatus;
}

const STATUS_META: Record<
  BackendStatus,
  { color: string; label: string; pulse: boolean }
> = {
  Connected: { color: "#22c55e", label: "Connected", pulse: false },
  Connecting: { color: "#eab308", label: "Connecting…", pulse: true },
  Disconnected: { color: "#ef4444", label: "Disconnected", pulse: true },
};

const Header: React.FC<HeaderProps> = ({ status }) => {
  return (
    <header className="card card-pad hover-lift h-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          {/* Brand emblem — uses the uploaded Midjourney-style "M" image */}
          <div
            className="logo-emblem flex h-16 w-16 items-center justify-center animate-float"
            style={{ borderRadius: "1rem" }}
          >
            <Image
              src="/brand-m.png"
              alt="PROMPTWALL brand logo"
              width={64}
              height={64}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col gap-1">
            <BrandWordmark size="lg" />
            <p className="text-sm font-medium tracking-wide text-slate-500 text-shadow-soft">
              Prompt Injection &amp; Action Security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BackendChip status={status} />
        </div>
      </div>
    </header>
  );
};

const BackendChip: React.FC<{ status: BackendStatus }> = ({ status }) => {
  const m = STATUS_META[status];
  return (
    <div
      className="glass chip border border-orange-200 bg-white/70"
      title="Backend status"
    >
      <Dot color={m.color} pulse={m.pulse} />
      <span className="text-slate-700">Backend</span>
      <span className="text-slate-400">·</span>
      <span className="font-semibold" style={{ color: m.color }}>
        {m.label}
      </span>
    </div>
  );
};

export default Header;
