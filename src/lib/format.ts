export function formatScore(score: number | null): string {
  if (score === null || Number.isNaN(score)) {
    return "N/A";
  }

  return `${score.toFixed(1)}/10`;
}

export function formatDate(dateInput: string): string {
  return new Date(dateInput).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatIndexValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  return value.toFixed(1);
}

export function formatDelta(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}`;
}
