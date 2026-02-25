"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Actor } from "@/lib/types";

interface ActorDiscoveryProps {
  actors: Actor[];
}

export function ActorDiscovery({ actors }: ActorDiscoveryProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return actors;
    }

    return actors.filter((actor) => actor.name.toLowerCase().includes(term));
  }, [actors, search]);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-[#d9d7f2] bg-white p-8 shadow-[0_18px_50px_rgba(42,39,85,0.07)] sm:p-10">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#676489]">curated binge lists</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#1a1738] sm:text-5xl">moviethon</h1>
        <p className="mt-4 max-w-2xl text-base text-[#4d4a6b]">
          binge the best runs from your favorite actors. move decade by decade, compare scores, and build your next
          weekend watchlist.
        </p>

        <label className="mt-8 block max-w-xl">
          <span className="mb-2 block text-sm font-medium text-[#676489]">find an actor</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="search your next binge"
            className="w-full rounded-2xl border border-[#d9d7f2] bg-white px-4 py-3 text-sm text-[#1a1738] outline-none transition focus:border-[#605bff] focus:ring-2 focus:ring-[#605bff]/20"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((actor) => (
          <Link
            key={actor.id}
            href={`/actors/${actor.slug}`}
            className="group overflow-hidden rounded-3xl border border-[#d9d7f2] bg-white shadow-[0_10px_24px_rgba(42,39,85,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(42,39,85,0.1)]"
          >
            <div
              className="aspect-[2/3] w-full border-b border-[#e4e3f7] bg-no-repeat bg-center"
              style={{
                backgroundImage: actor.heroImage ? `url(${actor.heroImage})` : "linear-gradient(140deg, #efeeff, #f8f8ff)",
                backgroundSize: "contain",
                backgroundColor: "#f3f2ff",
              }}
            />
            <div className="space-y-2 p-4">
              <h2 className="text-xl font-semibold text-[#1a1738]">{actor.name}</h2>
              <p className="line-clamp-2 text-sm leading-6 text-[#4d4a6b]">{actor.bio ?? "No bio yet."}</p>
              <p className="pt-1 text-sm font-medium text-[#605bff]">start binge →</p>
            </div>
          </Link>
        ))}
      </div>

      {!filtered.length && (
        <p className="rounded-2xl border border-[#d9d7f2] bg-white p-5 text-sm text-[#676489]">
          No actor found. Add more actor seeds to expand discovery.
        </p>
      )}
    </section>
  );
}
