"use client";

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ points, width = 84, height = 24 }: SparklineProps) {
  if (!points.length) {
    return <div className="h-6 w-20 rounded bg-[#f1f0ff]" />;
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

  const isUpward = points[points.length - 1] >= points[0];
  const stroke = isUpward ? "#2f9e44" : "#d9480f";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-6 w-20"
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
