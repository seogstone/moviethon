import { ActorDiscovery } from "@/components/ActorDiscovery";
import { fallbackFeaturedActors } from "@/lib/data/fallback";
import { listFeaturedActors } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let actors = fallbackFeaturedActors();

  try {
    const fromDb = await listFeaturedActors();
    if (fromDb.length) {
      actors = fromDb;
    }
  } catch {
    // Local-first fallback mode when Supabase env is missing.
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <ActorDiscovery actors={actors} />
    </main>
  );
}
