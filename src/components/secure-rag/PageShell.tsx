"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { BackendStatus } from "@/types";
import TopNav from "./TopNav";
import { fetchBackendHealth } from "@/lib/api/backendClient";

interface PageShellProps {
  children: React.ReactNode;
  status?: BackendStatus;
  approvalsPending?: number;
  /** Hide the faint corner watermark (default false). */
  hideWatermark?: boolean;
}

const PageShell: React.FC<PageShellProps> = ({
  children,
  status: initialStatus,
  approvalsPending,
  hideWatermark = false,
}) => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(initialStatus || "Connected");

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      const health = await fetchBackendHealth();
      if (!mounted) return;
      if (health && health.success) {
        setBackendStatus("Connected");
      } else {
        // If initial status was explicitly set or fallback
        setBackendStatus(initialStatus || "Connected");
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [initialStatus]);

  return (
    <main className="relative min-h-screen w-full px-5 py-5 md:px-8 md:py-7 lg:px-10">
      {!hideWatermark && (
        <Image
          src="/brand-m.png"
          alt=""
          width={360}
          height={360}
          aria-hidden
          className="logo-watermark"
        />
      )}
      <div className="relative mx-auto w-full max-w-[1600px]">
        <TopNav status={backendStatus} approvalsPending={approvalsPending} />
        {children}
      </div>
    </main>
  );
};

export default PageShell;
