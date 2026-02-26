import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentAppUser } from "@/lib/auth/user";
import { getUserContributionSummary } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect("/auth/login?returnTo=/me");
  }

  const summary = await getUserContributionSummary(appUser.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-4 rounded-3xl border border-[#d9d7f2] bg-white p-6 shadow-[0_12px_30px_rgba(42,39,85,0.05)] sm:p-8">
        <h1 className="text-4xl font-semibold text-[#1a1738]">my profile</h1>
        <p className="text-base text-[#4d4a6b]">
          manage how your identity appears in comments and track your account activity.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr,1fr]">
        <ProfileForm initialDisplayName={appUser.displayName ?? appUser.name ?? "member"} initialBio={appUser.bio ?? ""} />

        <div className="space-y-3 rounded-2xl border border-[#e4e3f7] bg-[#f8f7ff] p-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-[#8d8ab0]">account summary</h2>
          <p className="text-sm text-[#4d4a6b]">
            <span className="font-medium text-[#1a1738]">email:</span> {appUser.email ?? "not shared"}
          </p>
          <p className="text-sm text-[#4d4a6b]">
            <span className="font-medium text-[#1a1738]">ratings:</span> {summary.ratingsCount}
          </p>
          <p className="text-sm text-[#4d4a6b]">
            <span className="font-medium text-[#1a1738]">comments:</span> {summary.commentsCount}
          </p>
          <Link
            href="/me/ratings"
            className="inline-flex rounded-xl bg-[#1a1738] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#111022]"
          >
            view my ratings
          </Link>
        </div>
      </section>
    </main>
  );
}
