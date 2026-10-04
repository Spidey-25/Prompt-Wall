"use client";

import React, { useId } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}

/**
 * Sparkline — minimal SVG line chart for KPI cards.
 * Renders a smooth polyline + area fill (gradient) + end dot.
 */
const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 96,
  height = 32,
  color = "#f97316",
  fill = true,
  strokeWidth = 1.75,
  className = "",
}) => {
  const gradId = `spark-${useId()}`;
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 3;
  const innerH = height - padY * 2;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;

  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - padY - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${width.toFixed(2)},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={4.5}
        fill={color}
        opacity={0.18}
      />
    </svg>
  );
};

export default Sparkline;
