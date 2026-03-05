"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CommunityVelocityRow } from "@/lib/types";

type SortDirection = "asc" | "desc";
type SortKey = "movieTitle" | "newRatings24h" | "ratingVelocityRatio" | "comments24h";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

interface CommunityVelocityTableProps {
  rows: CommunityVelocityRow[];
}

const columns: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: "movieTitle", label: "film" },
  { key: "newRatings24h", label: "new ratings", numeric: true },
  { key: "ratingVelocityRatio", label: "rating velocity", numeric: true },
  { key: "comments24h", label: "comments", numeric: true },
];

function getDefaultDirection(key: SortKey): SortDirection {
  if (key === "movieTitle") {
    return "asc";
  }

  return "desc";
}

function compareValues(left: number | string | null, right: number | string | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right);
  }

  return Number(left) - Number(right);
}

function valueForSort(row: CommunityVelocityRow, key: SortKey): number | string | null {
  switch (key) {
    case "movieTitle":
      return row.movieTitle.toLowerCase();
    case "newRatings24h":
      return row.newRatings24h;
    case "ratingVelocityRatio":
      return row.ratingVelocityRatio;
    case "comments24h":
      return row.comments24h;
    default:
      return null;
  }
}

export function CommunityVelocityTable({ rows }: CommunityVelocityTableProps) {
  const [sortState, setSortState] = useState<SortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortState) {
      return rows;
    }

    const sorted = [...rows].sort((left, right) => {
      const result = compareValues(valueForSort(left, sortState.key), valueForSort(right, sortState.key));
      if (result === 0) {
        return left.movieTitle.localeCompare(right.movieTitle);
      }
      return sortState.direction === "asc" ? result : -result;
    });

    return sorted;
  }, [rows, sortState]);

  const handleSort = (key: SortKey) => {
    setSortState((previous) => {
      if (!previous || previous.key !== key) {
        return {
          key,
          direction: getDefaultDirection(key),
        };
      }

      return {
        key,
        direction: previous.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  return (
    <div className="table-shell thin-scroll is-scrollable rounded-xl">
      <table className="mv-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = sortState?.key === column.key;
              return (
                <th key={column.key} className={column.numeric ? "num" : undefined}>
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={`mv-sort-btn ${column.numeric ? "num" : ""}`}
                  >
                    <span>{column.label}</span>
                    <span className={`mv-sort-indicator ${isActive ? "active" : ""}`}>
                      {isActive ? (sortState?.direction === "asc" ? "asc" : "desc") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.slice(0, 25).map((row) => (
            <tr key={row.movieId}>
              <td>
                {row.actorSlug ? (
                  <Link href={`/movies/${row.movieSlug}?actor=${row.actorSlug}`} className="font-medium text-[var(--foreground)]">
                    {row.movieTitle}
                  </Link>
                ) : (
                  <Link href={`/movies/${row.movieSlug}`} className="font-medium text-[var(--foreground)]">
                    {row.movieTitle}
                  </Link>
                )}
                {row.actorName ? <p className="text-xs text-[var(--muted)]">{row.actorName}</p> : null}
              </td>
              <td className="num">{row.newRatings24h}</td>
              <td className="num">{row.ratingVelocityRatio === null ? "N/A" : row.ratingVelocityRatio.toFixed(2)}</td>
              <td className="num">{row.comments24h}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
