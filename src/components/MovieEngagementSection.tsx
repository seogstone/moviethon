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
}: MovieEngagementSectionProps) {
  const [communityAvg, setCommunityAvg] = useState(initialCommunityAvg);
  const [communityCount, setCommunityCount] = useState(initialCommunityCount);
  const [myRating, setMyRating] = useState<number | null>(initialMyRating);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">IMDb</div>
          <div className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(imdbScore)}</div>
        </div>
        <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">your rating</div>
          <div className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(myRating)}</div>
        </div>
        <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8d8ab0]">community</div>
          <div className="mt-1 text-2xl font-semibold text-[#1a1738]">{formatScore(communityAvg)}</div>
          <div className="mt-1 text-xs text-[#8d8ab0]">{communityCount} vote{communityCount === 1 ? "" : "s"}</div>
        </div>
      </div>

      <CommunityPanel
        movieId={movieId}
        initialComments={initialComments}
        initialMyRating={initialMyRating}
        isAuthenticated={isAuthenticated}
        viewerDisplayName={viewerDisplayName}
        onStatsChange={({ myRating: nextMyRating, communityAvg: nextCommunityAvg, communityCount: nextCommunityCount }) => {
          setMyRating(nextMyRating);
          setCommunityAvg(nextCommunityAvg);
          setCommunityCount(nextCommunityCount);
        }}
      />
    </div>
  );
}
