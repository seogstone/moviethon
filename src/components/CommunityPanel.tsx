"use client";

import { useMemo, useState } from "react";

import { HcaptchaWidget } from "@/components/HcaptchaWidget";
import { formatScore } from "@/lib/format";
import type { Comment } from "@/lib/types";

interface CommunityPanelProps {
  movieId: string;
  initialCommunityAvg: number;
  initialCommunityCount: number;
  initialComments: Comment[];
  initialMyRating?: number | null;
  isAuthenticated: boolean;
  viewerDisplayName?: string | null;
}

export function CommunityPanel({
  movieId,
  initialCommunityAvg,
  initialCommunityCount,
  initialComments,
  initialMyRating = null,
  isAuthenticated,
  viewerDisplayName,
}: CommunityPanelProps) {
  const [score, setScore] = useState<number>(initialMyRating ?? 8);
  const [displayName, setDisplayName] = useState(viewerDisplayName ?? "");
  const [commentBody, setCommentBody] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [communityAvg, setCommunityAvg] = useState(initialCommunityAvg);
  const [communityCount, setCommunityCount] = useState(initialCommunityCount);
  const [myRating, setMyRating] = useState<number | null>(initialMyRating);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [deleteTokenHint, setDeleteTokenHint] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [comments],
  );

  async function submitRating() {
    if (!isAuthenticated) {
      setStatusMessage("Log in to submit ratings.");
      return;
    }

    setBusy(true);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/movies/${movieId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, captchaToken }),
      });

      const payload = (await response.json()) as {
        error?: string;
        communityAvg?: number;
        communityCount?: number;
        myRating?: number | null;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Rating failed");
      }

      if (typeof payload.communityAvg === "number") {
        setCommunityAvg(payload.communityAvg);
      }
      if (typeof payload.communityCount === "number") {
        setCommunityCount(payload.communityCount);
      }
      if (typeof payload.myRating === "number") {
        setMyRating(payload.myRating);
        setScore(payload.myRating);
      }

      setStatusMessage("Rating saved.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Rating failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    setBusy(true);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/movies/${movieId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          body: commentBody,
          captchaToken,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        comment?: Comment;
        deleteToken?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Comment failed");
      }

      const postedComment = payload.comment;
      if (postedComment) {
        setComments((prev) => [postedComment, ...prev]);
      }

      setCommentBody("");
      setDeleteTokenHint(payload.deleteToken ?? "");
      setStatusMessage("Comment posted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  }

  async function reportComment(commentId: string) {
    setStatusMessage("");

    const reason = window.prompt("Reason for report:", "Offensive or spam");
    if (!reason) {
      return;
    }

    const response = await fetch(`/api/comments/${commentId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    if (response.ok) {
      setStatusMessage("Comment reported.");
    } else {
      const payload = (await response.json()) as { error?: string };
      setStatusMessage(payload.error ?? "Failed to report comment.");
    }
  }

  async function deleteOwnComment(commentId: string) {
    setStatusMessage("");

    const token = window.prompt("Paste the delete token that was returned when you posted this comment.");
    if (!token) {
      return;
    }

    const response = await fetch(`/api/comments/${commentId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setStatusMessage(payload.error ?? "Delete failed.");
      return;
    }

    setComments((prev) => prev.filter((item) => item.id !== commentId));
    setStatusMessage("Comment deleted.");
  }

  return (
    <section
      id="community"
      className="space-y-6 rounded-3xl border border-[#d9d7f2] bg-white p-5 shadow-[0_12px_26px_rgba(42,39,85,0.05)] sm:p-6"
    >
      <div>
        <h2 className="text-2xl font-semibold text-[#1a1738]">community score</h2>
        <p className="mt-1 text-sm text-[#676489]">
          {formatScore(communityAvg)} from {communityCount} vote{communityCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
          <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">rate this movie</h3>

          {!isAuthenticated && (
            <p className="rounded-xl border border-[#d9d7f2] bg-white p-3 text-sm text-[#4d4a6b]">
              Ratings require an account. <a href="/auth/login" className="font-medium text-[#605bff]">log in</a> to track your scores.
            </p>
          )}

          {isAuthenticated && (
            <>
              <label className="block text-sm text-[#4d4a6b]">
                score (1-10)
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={score}
                  onChange={(event) => setScore(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
                />
              </label>
              {myRating !== null && <p className="text-xs text-[#676489]">your saved rating: {formatScore(myRating)}</p>}
            </>
          )}

          <HcaptchaWidget token={captchaToken} onTokenChange={setCaptchaToken} />
          <button
            type="button"
            onClick={submitRating}
            disabled={busy || !captchaToken || !isAuthenticated}
            className="rounded-xl bg-[#1a1738] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111022] disabled:opacity-50"
          >
            {myRating === null ? "submit rating" : "update rating"}
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
          <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">leave a comment</h3>
          <label className="block text-sm text-[#4d4a6b]">
            display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={isAuthenticated ? "name shown on your comments" : "required for guests"}
              className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
            />
          </label>
          <label className="block text-sm text-[#4d4a6b]">
            comment
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
            />
          </label>
          <button
            type="button"
            onClick={submitComment}
            disabled={busy || !captchaToken || !commentBody.trim() || (!isAuthenticated && !displayName.trim())}
            className="rounded-xl bg-[#605bff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#504bd8] disabled:opacity-50"
          >
            post comment
          </button>
          {deleteTokenHint && (
            <p className="rounded-xl border border-[#f4d7ff] bg-[#faf0ff] p-3 text-xs text-[#6d3687]">
              delete token for your latest comment: <code className="select-all">{deleteTokenHint}</code>
            </p>
          )}
        </div>
      </div>

      {statusMessage && <p className="text-sm text-[#605bff]">{statusMessage}</p>}

      <footer className="space-y-3 border-t border-[#e4e3f7] pt-5">
        <h3 className="text-sm font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">comment feed</h3>
        {!sortedComments.length && <p className="text-sm text-[#676489]">no comments yet.</p>}
        <ul className="space-y-3">
          {sortedComments.map((comment) => (
            <li key={comment.id} className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[#1a1738]">
                    {comment.displayName}
                    {comment.isVerifiedUser && (
                      <span className="ml-2 rounded-full bg-[#ecebff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#3733b8]">
                        member
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#8d8ab0]">
                    {new Date(comment.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => reportComment(comment.id)}
                    className="rounded-lg border border-[#d9d7f2] px-2 py-1 text-[#676489] transition hover:border-[#605bff] hover:text-[#1a1738]"
                  >
                    report
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteOwnComment(comment.id)}
                    className="rounded-lg border border-[#d9d7f2] px-2 py-1 text-[#676489] transition hover:border-[#605bff] hover:text-[#1a1738]"
                  >
                    delete
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-[#4d4a6b]">{comment.body}</p>
            </li>
          ))}
        </ul>
      </footer>
    </section>
  );
}
