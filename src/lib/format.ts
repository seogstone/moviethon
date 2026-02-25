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
