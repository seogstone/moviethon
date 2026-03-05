"use client";

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}

export function Sparkline({
  points,
  width = 84,
  height = 24,
  stroke = "var(--accent-highlight)",
  className = "h-6 w-20",
}: SparklineProps) {
  if (!points.length) {
    return <div className={className} style={{ borderRadius: 4, background: "#151b22" }} />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coordinates = points
    .map((point, index) => {
      const x = index * stepX;
      const y = height - ((point - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="activity trend"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coordinates}
      />
    </svg>
  );
}
