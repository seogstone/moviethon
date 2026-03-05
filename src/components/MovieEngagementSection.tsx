"use client";

import { useState } from "react";

import { CommunityPanel } from "@/components/CommunityPanel";
import { formatScore } from "@/lib/format";
import type { Comment } from "@/lib/types";

interface MovieEngagementSectionProps {
  movieId: string;
  imdbScore: number | null;
  initialCommunityAvg: number;
  initialCommunityCount: number;
  initialMyRating: number | null;
  initialComments: Comment[];
  isAuthenticated: boolean;
  viewerDisplayName?: string | null;
  viewerUserId?: string | null;
}

export function MovieEngagementSection({
  movieId,
  imdbScore,
  initialCommunityAvg,
  initialCommunityCount,
  initialMyRating,
  initialComments,
  isAuthenticated,
  viewerDisplayName,
  viewerUserId,
}: MovieEngagementSectionProps) {
  const [communityAvg, setCommunityAvg] = useState(initialCommunityAvg);
  const [communityCount, setCommunityCount] = useState(initialCommunityCount);
  const [myRating, setMyRating] = useState<number | null>(initialMyRating);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[#0f1318] p-3">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted)]">IMDb</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatScore(imdbScore)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[#0f1318] p-3">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted)]">your rating</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatScore(myRating)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[#0f1318] p-3">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-[var(--muted)]">community</div>
          <div className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatScore(communityAvg)}</div>
          <div className="mt-1 text-xs text-[var(--muted)]">{communityCount} vote{communityCount === 1 ? "" : "s"}</div>
        </div>
      </div>

      <CommunityPanel
        movieId={movieId}
        initialComments={initialComments}
        initialMyRating={initialMyRating}
        isAuthenticated={isAuthenticated}
        viewerDisplayName={viewerDisplayName}
        viewerUserId={viewerUserId}
        onStatsChange={({ myRating: nextMyRating, communityAvg: nextCommunityAvg, communityCount: nextCommunityCount }) => {
          setMyRating(nextMyRating);
          setCommunityAvg(nextCommunityAvg);
          setCommunityCount(nextCommunityCount);
        }}
      />
    </div>
  );
}
