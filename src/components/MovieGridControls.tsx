"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SortBy, SortDir } from "@/lib/types";

interface MovieGridControlsProps {
  decades: number[];
  genres: string[];
}

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "release_date", label: "release date" },
  { value: "imdb", label: "imdb" },
  { value: "community", label: "community" },
  { value: "owner", label: "your score" },
];

export function MovieGridControls({ decades, genres }: MovieGridControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const decade = searchParams.get("decade") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const sortBy = (searchParams.get("sortBy") as SortBy | null) ?? "release_date";
  const sortDir = (searchParams.get("sortDir") as SortDir | null) ?? "asc";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-[#d9d7f2] bg-white p-4 shadow-[0_8px_18px_rgba(42,39,85,0.04)] md:grid-cols-4">
      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">decade</span>
        <select
          value={decade}
          onChange={(event) => updateParam("decade", event.target.value)}
          className="w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff]"
        >
          <option value="">all</option>
          {decades.map((item) => (
            <option key={item} value={item.toString()}>
              {item}s
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">genre</span>
        <select
          value={genre}
          onChange={(event) => updateParam("genre", event.target.value)}
          className="w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff]"
        >
          <option value="">all</option>
          {genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">sort by</span>
        <select
          value={sortBy}
          onChange={(event) => updateParam("sortBy", event.target.value)}
          className="w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff]"
        >
          {sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">direction</span>
        <select
          value={sortDir}
          onChange={(event) => updateParam("sortDir", event.target.value)}
          className="w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff]"
        >
          <option value="asc">ascending</option>
          <option value="desc">descending</option>
        </select>
      </label>
    </div>
  );
}
