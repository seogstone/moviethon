"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

interface WatchlistToggleProps {
  movieId: string;
  initialInWatchlist: boolean;
  isAuthenticated: boolean;
  className?: string;
}

export function WatchlistToggle({
  movieId,
  initialInWatchlist,
  isAuthenticated,
  className,
}: WatchlistToggleProps) {
  const pathname = usePathname();
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist);
  const [busy, setBusy] = useState(false);

  async function onToggle() {
    if (!isAuthenticated) {
      window.location.href = `/auth/login?returnTo=${encodeURIComponent(pathname || "/")}`;
      return;
    }

    if (busy) {
      return;
    }

    const nextState = !inWatchlist;
    setInWatchlist(nextState);
    setBusy(true);

    try {
      const response = await fetch(`/api/watchlist/${movieId}`, {
        method: nextState ? "POST" : "DELETE",
      });

      if (!response.ok) {
        setInWatchlist(!nextState);
      }
    } catch {
      setInWatchlist(!nextState);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={inWatchlist ? "remove from watchlist" : "add to watchlist"}
      title={inWatchlist ? "remove from watchlist" : "add to watchlist"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d7f2] bg-white text-[#7f7ca2] shadow-[0_6px_14px_rgba(42,39,85,0.08)] transition hover:border-[#605bff] hover:text-[#2f2b73] disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
      disabled={busy}
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden="true">
        <path
          d="M12 17.2l-5.56 3.16 1.48-6.26L3 9.94l6.48-.55L12 3.5l2.52 5.89 6.48.55-4.92 4.16 1.48 6.26z"
          fill={inWatchlist ? "#f4b400" : "none"}
          stroke={inWatchlist ? "#f4b400" : "currentColor"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
