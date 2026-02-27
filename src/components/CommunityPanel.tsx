"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { HcaptchaWidget } from "@/components/HcaptchaWidget";
import { formatScore } from "@/lib/format";
import type { Comment } from "@/lib/types";

interface CommunityPanelProps {
  movieId: string;
  initialComments: Comment[];
  initialMyRating?: number | null;
  isAuthenticated: boolean;
  viewerDisplayName?: string | null;
  onStatsChange?: (stats: { myRating: number | null; communityAvg: number; communityCount: number }) => void;
}

export function CommunityPanel({
  movieId,
  initialComments,
  initialMyRating = null,
  isAuthenticated,
  viewerDisplayName,
  onStatsChange,
}: CommunityPanelProps) {
  const [score, setScore] = useState<number>(initialMyRating ?? 8);
  const [ratingTouched, setRatingTouched] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetNonce, setCaptchaResetNonce] = useState(0);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [myRating, setMyRating] = useState<number | null>(initialMyRating);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [deleteTokens, setDeleteTokens] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [comments],
  );

  async function submitContribution() {
    setStatusMessage("");

    if (!isAuthenticated) {
      setStatusMessage("Log in to rate and comment.");
      return;
    }

    if (!captchaToken) {
      setStatusMessage("Complete captcha before submitting.");
      return;
    }

    const commentText = commentBody.trim();
    const shouldSubmitComment = commentText.length > 0;
    const shouldSubmitRating = ratingTouched;

    if (!shouldSubmitComment && !shouldSubmitRating) {
      setStatusMessage("Add a comment or change your rating before submitting.");
      return;
    }

    setBusy(true);

    try {
      const requestPayload: {
        captchaToken: string;
        score?: number;
        body?: string;
      } = { captchaToken };

      if (shouldSubmitRating) {
        requestPayload.score = score;
      }

      if (shouldSubmitComment) {
        requestPayload.body = commentText;
      }

      const response = await fetch(`/api/movies/${movieId}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const payload = (await response.json()) as {
        error?: string;
        notices?: string[];
        errors?: string[];
        ratingSaved?: boolean;
        commentPosted?: boolean;
        communityAvg?: number;
        communityCount?: number;
        myRating?: number | null;
        comment?: Comment | null;
        deleteToken?: string | null;
      };

      if (!response.ok) {
        setStatusMessage(payload.error ?? "Submission failed");
        return;
      }

      if (typeof payload.myRating === "number") {
        setMyRating(payload.myRating);
        setScore(payload.myRating);
      }

      if (payload.ratingSaved) {
        setRatingTouched(false);
      }

      if (
        onStatsChange &&
        typeof payload.communityAvg === "number" &&
        typeof payload.communityCount === "number"
      ) {
        onStatsChange({
          myRating: typeof payload.myRating === "number" ? payload.myRating : myRating,
          communityAvg: payload.communityAvg,
          communityCount: payload.communityCount,
        });
      }

      if (payload.commentPosted && payload.comment) {
        const postedComment = payload.comment;
        setComments((prev) => [postedComment, ...prev]);
        setCommentBody("");
        const deleteToken = payload.deleteToken;
        if (deleteToken) {
          setDeleteTokens((prev) => ({ ...prev, [postedComment.id]: deleteToken }));
        }
      }

      const notices = payload.notices ?? [];
      const errors = payload.errors ?? [];
      if (errors.length && notices.length) {
        setStatusMessage(`${notices.join(" ")} ${errors.join(" ")}`);
      } else if (errors.length) {
        setStatusMessage(errors.join(" "));
      } else if (notices.length) {
        setStatusMessage(notices.join(" "));
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setBusy(false);
      setCaptchaResetNonce((prev) => prev + 1);
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

    const knownToken = deleteTokens[commentId];
    const token =
      knownToken ??
      window.prompt("Enter the delete token for this comment. Token display is hidden from the public UI.");
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
    setDeleteTokens((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
    setStatusMessage("Comment deleted.");
  }

  return (
    <section
      id="community"
      className="space-y-5 rounded-3xl border border-[#d9d7f2] bg-white p-5 shadow-[0_12px_26px_rgba(42,39,85,0.05)] sm:p-6"
    >
      <div className="space-y-4 rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[#1a1738]">add your take</h3>
          <p className="text-sm text-[#676489]">Use one captcha and one submit. You can rate, comment, or do both.</p>
        </div>

        {!isAuthenticated ? (
          <div className="rounded-xl border border-[#d9d7f2] bg-white p-4 text-sm text-[#4d4a6b]">
            <p>Rate and comment are available for logged-in members.</p>
            <Link
              href="/auth/login"
              className="mt-3 inline-flex rounded-xl bg-[#1a1738] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111022]"
            >
              log in
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-[#e4e3f7] bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">rating (optional)</p>
                <label className="block text-sm text-[#4d4a6b]">
                  score (1-10)
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={score}
                    onChange={(event) => {
                      setScore(Number(event.target.value));
                      setRatingTouched(true);
                    }}
                    className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
                  />
                </label>
                <p className="text-xs text-[#676489]">
                  {ratingTouched ? "rating will be submitted" : `current saved rating: ${formatScore(myRating)}`}
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-[#e4e3f7] bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">comment (optional)</p>
                <p className="text-xs text-[#676489]">posting as {(viewerDisplayName || "member").trim()}</p>
                <label className="block text-sm text-[#4d4a6b]">
                  comment
                  <textarea
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-xl border border-[#d9d7f2] bg-white px-3 py-2 text-[#1a1738] outline-none transition focus:border-[#605bff]"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <HcaptchaWidget token={captchaToken} onTokenChange={setCaptchaToken} resetNonce={captchaResetNonce} />
              <button
                type="button"
                onClick={submitContribution}
                disabled={busy || !captchaToken}
                className="rounded-xl bg-[#1a1738] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111022] disabled:opacity-50"
              >
                submit contribution
              </button>
            </div>
          </>
        )}
      </div>

      {statusMessage && <p className="text-sm text-[#605bff]">{statusMessage}</p>}

      <footer className="space-y-3 border-t border-[#e4e3f7] pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-[#1a1738]">comment feed</h3>
          <p className="text-xs text-[#8d8ab0]">latest first</p>
        </div>

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
