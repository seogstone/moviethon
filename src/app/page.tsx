import { ActorDiscovery } from "@/components/ActorDiscovery";
import { fallbackFeaturedActors, fallbackHomepageMarketPayload } from "@/lib/data/fallback";
import { getHomepageMarketStats, listFeaturedActors } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let actors = fallbackFeaturedActors();
  let market = fallbackHomepageMarketPayload(actors);

  try {
    const fromDb = await listFeaturedActors();
    if (fromDb.length) {
      actors = fromDb;
    }

    market = await getHomepageMarketStats({
      actorScope: "featured",
      windowDays: 7,
      sparkDays: 14,
      minVotesForDelta: 5,
    });
  } catch {
    // Local-first fallback mode when Supabase env is missing.
    market = fallbackHomepageMarketPayload(actors);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ActorDiscovery actors={actors} market={market} />
    </main>
  );
}
