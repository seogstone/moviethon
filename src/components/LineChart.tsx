"use client";

import { useMemo, useState } from "react";

interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: LineChartPoint[];
  height?: number;
  stroke?: string;
  showGrid?: boolean;
  interactive?: boolean;
}

interface PointCoordinate {
  x: number;
  y: number;
  label: string;
  value: number;
}

function formatPointLabel(label: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const date = new Date(`${label}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  return label;
}

export function LineChart({
  points,
  height = 220,
  stroke = "var(--accent-highlight)",
  showGrid = true,
  interactive = true,
}: LineChartProps) {
  const width = 1000;
  const safeValues = points.length ? points.map((point) => point.value) : [0];
  const max = Math.max(...safeValues);
  const min = Math.min(...safeValues);
  const range = Math.max(1, max - min);
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const gridRows = 4;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const coordinates = useMemo<PointCoordinate[]>(() => {
    return points.map((point, index) => {
      const x = index * stepX;
      const y = ((max - point.value) / range) * height;
      return {
        x,
        y,
        label: point.label,
        value: point.value,
      };
    });
  }, [height, max, points, range, stepX]);

  if (!points.length) {
    return <div className="panel-shell rounded-xl" style={{ height }} />;
  }

  const linePath = coordinates
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");

  const hoveredPoint = hoveredIndex === null ? null : coordinates[hoveredIndex] ?? null;

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || points.length < 1) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) {
      return;
    }

    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const ratio = rect.width === 0 ? 0 : relativeX / rect.width;
    const index = Math.round(ratio * (points.length - 1));
    setHoveredIndex(Math.min(points.length - 1, Math.max(0, index)));
  };

  const handlePointerLeave = () => {
    if (interactive) {
      setHoveredIndex(null);
    }
  };

  return (
    <div className="panel-shell relative rounded-xl" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-full w-full"
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {showGrid &&
          Array.from({ length: gridRows + 1 }).map((_, index) => {
            const y = (height / gridRows) * index;
            return <line key={index} x1={0} y1={y} x2={width} y2={y} stroke="#1c222a" strokeWidth="1" />;
          })}

        {hoveredPoint ? <line x1={hoveredPoint.x} y1={0} x2={hoveredPoint.x} y2={height} stroke="#2a3340" strokeWidth="1" /> : null}

        <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />

        {hoveredPoint ? <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4" fill={stroke} stroke="#0b0d10" strokeWidth="2" /> : null}
      </svg>

      {hoveredPoint ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${Math.max(8, (hoveredPoint.y / height) * 100 - 8)}%`,
          }}
        >
          <p>{formatPointLabel(hoveredPoint.label)}</p>
          <p className="chart-tooltip-value">{hoveredPoint.value.toFixed(1)}</p>
        </div>
      ) : null}
    </div>
  );
}
