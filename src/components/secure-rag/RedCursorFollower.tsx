"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * RedCursorFollower â€” a minimal trailing color smear effect.
 * No ball or ring; just a soft redâ†”white radial glow that smoothly
 * trails the cursor using requestAnimationFrame lerp.
 */
const RedCursorFollower: React.FC = () => {
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const trailRef = useRef({ x: -200, y: -200 });
  const animRef = useRef<number | null>(null);
  const [trailPos, setTrailPos] = useState({ x: -200, y: -200 });
  const [isMounted, setIsMounted] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      setIsHovering(
        !!(
          target &&
          (target.tagName === "BUTTON" ||
            target.tagName === "A" ||
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.closest("button") ||
            target.closest("a"))
        )
      );
    };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      trailRef.current = {
        x: lerp(trailRef.current.x, pos.x, 0.1),
        y: lerp(trailRef.current.y, pos.y, 0.1),
      };
      setTrailPos({ ...trailRef.current });
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [pos, isMounted]);

  if (!isMounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {/* Trailing soft smear â€” slightly behind cursor, red core */}
      <div
        style={{
          position: "fixed",
          left: trailPos.x,
          top: trailPos.y,
          width: isHovering ? 180 : 120,
          height: isHovering ? 180 : 120,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: isHovering
            ? "radial-gradient(circle, rgba(255,106,0,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 70%)"
            : "radial-gradient(circle, rgba(255,106,0,0.13) 0%, rgba(255,255,255,0.04) 45%, transparent 70%)",
          transition: "width 200ms ease, height 200ms ease",
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Sharp leading dot â€” exactly on cursor, white center + red halo */}
      <div
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          width: 6,
          height: 6,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, #FFFFFF 0%, #DC2626 60%, transparent 100%)",
          boxShadow: "0 0 6px 2px rgba(255,106,0,0.55), 0 0 2px 1px rgba(255,255,255,0.8)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};

export default RedCursorFollower;
