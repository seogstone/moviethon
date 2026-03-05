import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentAppUser } from "@/lib/auth/user";
import { listRatingsByUser } from "@/lib/data/queries";
import { formatDate, formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MyRatingsPage() {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect("/auth/login?returnTo=/me/ratings");
  }

  const ratings = await listRatingsByUser(appUser.id, 1, 100);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-4 rounded-3xl border border-[#d9d7f2] bg-white p-6 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-8">
        <h1 className="text-4xl font-semibold text-[#1a1738]">my ratings</h1>
        <p className="text-base text-[#4d4a6b]">
          {ratings.total} movie rating{ratings.total === 1 ? "" : "s"} tracked to your account.
        </p>
      </div>

      {!ratings.items.length && (
        <p className="rounded-2xl border border-[#d9d7f2] bg-white p-5 text-sm text-[#676489]">
          no ratings yet. browse an actor and start scoring movies.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ratings.items.map((item) => {
          const href = item.actorSlug
            ? `/movies/${item.movieSlug}?actor=${item.actorSlug}`
            : `/movies/${item.movieSlug}`;

          return (
            <Link
              key={`${item.movieId}:${item.updatedAt}`}
              href={href}
              className="group overflow-hidden rounded-3xl border border-[#d9d7f2] bg-white shadow-[0_10px_24px_rgba(42,39,85,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(42,39,85,0.1)]"
            >
              <div
                className="aspect-[2/3] w-full border-b border-[#e4e3f7] bg-no-repeat bg-center"
                style={{
                  backgroundImage: item.posterUrl
                    ? `url(${item.posterUrl})`
                    : "linear-gradient(180deg, #f2f1ff, #fafafe)",
                  backgroundSize: "contain",
                  backgroundColor: "#f3f2ff",
                }}
              />

              <div className="space-y-2 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8d8ab0]">
                  {formatDate(item.updatedAt)}
                </p>
                <h2 className="line-clamp-2 text-xl font-semibold text-[#1a1738]">{item.movieTitle}</h2>
                <p className="text-sm text-[#676489]">{item.actorName ?? "actor unavailable"}</p>
                <p className="text-sm font-medium text-[#3733b8]">{formatScore(item.score)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
