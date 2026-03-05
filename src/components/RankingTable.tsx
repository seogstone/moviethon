"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Sparkline } from "@/components/Sparkline";
import { formatDelta, formatIndexValue } from "@/lib/format";
import type { RankingRow } from "@/lib/types";

interface RankingTableProps {
  title: string;
  rows: RankingRow[];
  emptyMessage: string;
}

type SortDirection = "asc" | "desc";
type SortKey = "label" | "rankPosition" | "indexValue" | "delta1d" | "delta7d" | "delta30d" | "volatilityClass";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const sortColumns: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: "label", label: "entity" },
  { key: "rankPosition", label: "rank", numeric: true },
  { key: "indexValue", label: "index", numeric: true },
  { key: "delta1d", label: "24h", numeric: true },
  { key: "delta7d", label: "7d", numeric: true },
  { key: "delta30d", label: "30d", numeric: true },
  { key: "volatilityClass", label: "volatility", numeric: true },
];

function entityHref(row: RankingRow): string {
  if (row.entityType === "film") {
    return row.actorSlug ? `/movies/${row.slug}?actor=${row.actorSlug}` : `/movies/${row.slug}`;
  }

  if (row.entityType === "actor") {
    return `/actors/${row.slug}`;
  }

  return `/genres/${row.slug}`;
}

function deltaClass(value: number | null): string {
  if (value === null) {
    return "delta-neutral";
  }
  if (value > 0) {
    return "delta-positive";
  }
  if (value < 0) {
    return "delta-negative";
  }
  return "delta-neutral";
}

function getDefaultDirection(key: SortKey): SortDirection {
  if (key === "label" || key === "rankPosition") {
    return "asc";
  }

  return "desc";
}

function getVolatilityRank(value: RankingRow["volatilityClass"]): number {
  switch (value) {
    case "high":
      return 3;
    case "moderate":
      return 2;
    case "stable":
      return 1;
    default:
      return 0;
  }
}

function getSortValue(row: RankingRow, key: SortKey): number | string | null {
  switch (key) {
    case "label":
      return row.label.toLowerCase();
    case "rankPosition":
      return row.rankPosition;
    case "indexValue":
      return row.indexValue;
    case "delta1d":
      return row.delta1d;
    case "delta7d":
      return row.delta7d;
    case "delta30d":
      return row.delta30d;
    case "volatilityClass":
      return getVolatilityRank(row.volatilityClass);
    default:
      return null;
  }
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

export function RankingTable({ title, rows, emptyMessage }: RankingTableProps) {
  const [sortState, setSortState] = useState<SortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!sortState) {
      return rows;
    }

    const sorted = [...rows].sort((left, right) => {
      const leftValue = getSortValue(left, sortState.key);
      const rightValue = getSortValue(right, sortState.key);
      const result = compareValues(leftValue, rightValue);
      if (result === 0) {
        return left.label.localeCompare(right.label);
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
    <section className="space-y-3 panel-shell rounded-2xl p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>

      {!rows.length ? <p className="text-sm text-[var(--muted)]">{emptyMessage}</p> : null}

      {rows.length ? (
        <div className="table-shell thin-scroll is-scrollable rounded-xl">
          <table className="mv-table">
            <thead>
              <tr>
                {sortColumns.map((column) => {
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
                <th className="num">trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={`${row.entityType}:${row.id}`}>
                  <td>
                    <Link href={entityHref(row)} className="font-medium text-[var(--foreground)] hover:text-[var(--accent-highlight)]">
                      {row.label}
                    </Link>
                    {row.actorName && row.entityType === "film" ? (
                      <p className="text-xs text-[var(--muted)]">{row.actorName}</p>
                    ) : null}
                  </td>
                  <td className="num">{row.rankPosition ?? "N/A"}</td>
                  <td className="num">{formatIndexValue(row.indexValue)}</td>
                  <td className="num">
                    <span className={`delta-badge ${deltaClass(row.delta1d)}`}>{formatDelta(row.delta1d)}</span>
                  </td>
                  <td className="num">
                    <span className={`delta-badge ${deltaClass(row.delta7d)}`}>{formatDelta(row.delta7d)}</span>
                  </td>
                  <td className="num">
                    <span className={`delta-badge ${deltaClass(row.delta30d)}`}>{formatDelta(row.delta30d)}</span>
                  </td>
                  <td className="num">
                    <span className="volatility-badge">{row.volatilityClass}</span>
                  </td>
                  <td className="num">
                    {row.trendPoints?.length ? <Sparkline points={row.trendPoints} className="h-5 w-24" /> : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
