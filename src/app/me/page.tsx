import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentAppUser } from "@/lib/auth/user";
import { getUserContributionSummary, listRatingsByUser } from "@/lib/data/queries";
import { formatDate, formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect("/auth/login?returnTo=/me");
  }

  const summary = await getUserContributionSummary(appUser.id);
  const recentRatings = await listRatingsByUser(appUser.id, 1, 12);
  const averageRating = recentRatings.items.length
    ? recentRatings.items.reduce((sum, item) => sum + item.score, 0) / recentRatings.items.length
    : null;
  const lastRated = recentRatings.items[0]?.updatedAt ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="rounded-3xl border border-[#d9d7f2] bg-white p-5 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-[#1a1738] sm:text-4xl">my profile</h1>
            <p className="text-sm text-[#676489]">{appUser.email ?? "no email provided"}</p>
          </div>
          <a
            href="/auth/logout"
            className="rounded-xl border border-[#d9d7f2] px-3 py-2 text-sm text-[#5c5a82] transition hover:bg-[#f0efff] hover:text-[#2f2d66]"
          >
            log out
          </a>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr,1fr]">
        <ProfileForm initialDisplayName={appUser.displayName ?? appUser.name ?? "member"} initialBio={appUser.bio ?? ""} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">ratings</p>
            <p className="mt-1 text-2xl font-semibold text-[#1a1738]">{summary.ratingsCount}</p>
          </div>
          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">comments</p>
            <p className="mt-1 text-2xl font-semibold text-[#1a1738]">{summary.commentsCount}</p>
          </div>
          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">avg score</p>
            <p className="mt-1 text-2xl font-semibold text-[#1a1738]">{averageRating === null ? "N/A" : formatScore(averageRating)}</p>
          </div>
          <div className="rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">last rated</p>
            <p className="mt-1 text-sm font-medium text-[#1a1738]">{lastRated ? formatDate(lastRated) : "N/A"}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-[#d9d7f2] bg-white p-5 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[#1a1738]">recent rated movies</h2>
          <Link
            href="/me/ratings"
            className="rounded-xl border border-[#d9d7f2] px-3 py-1.5 text-xs text-[#5c5a82] transition hover:bg-[#f0efff] hover:text-[#2f2d66]"
          >
            view full history
          </Link>
        </div>

        {!recentRatings.items.length && (
          <p className="rounded-2xl border border-[#d9d7f2] bg-[#f8f7ff] p-4 text-sm text-[#676489]">
            no ratings yet. browse an actor and start scoring movies.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {recentRatings.items.map((item) => {
            const href = item.actorSlug
              ? `/actors/${item.actorSlug}/movies/${item.movieSlug}`
              : `/api/movies/${item.movieId}`;

            return (
              <Link
                key={`${item.movieId}:${item.updatedAt}`}
                href={href}
                className="group overflow-hidden rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] transition hover:-translate-y-0.5 hover:border-[#c9c6ef]"
              >
                <div
                  className="aspect-[2/3] w-full border-b border-[#e4e3f7] bg-no-repeat bg-center"
                  style={{
                    backgroundImage: item.posterUrl
                      ? `url(${item.posterUrl})`
                      : "linear-gradient(180deg, #f2f1ff, #fafafe)",
                    backgroundSize: "cover",
                    backgroundColor: "#f3f2ff",
                  }}
                />
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-1 text-xs font-medium text-[#1a1738]">{item.movieTitle}</p>
                  <p className="text-[11px] text-[#676489]">{formatScore(item.score)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
