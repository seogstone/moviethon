import { readEnv } from "@/lib/env";

export interface WatchProvider {
  id: number;
  name: string;
  logoUrl: string;
}

export interface WatchProvidersByType {
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
  link: string | null;
}

interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

function mapProviders(providers: TmdbProvider[] | undefined): WatchProvider[] {
  if (!providers?.length) {
    return [];
  }

  const deduped = new Map<number, WatchProvider>();
  for (const provider of providers) {
    if (!provider.logo_path) {
      continue;
    }

    deduped.set(provider.provider_id, {
      id: provider.provider_id,
      name: provider.provider_name,
      logoUrl: `https://image.tmdb.org/t/p/w92${provider.logo_path}`,
    });
  }

  return [...deduped.values()];
}

export async function fetchTmdbWatchProviders(tmdbMovieId: number, region = "US"): Promise<WatchProvidersByType | null> {
  const apiKey = readEnv("TMDB_API_KEY");
  if (!apiKey) {
    return null;
  }

  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbMovieId}/watch/providers`);
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbProvider[];
        rent?: TmdbProvider[];
        buy?: TmdbProvider[];
      }
    >;
  };

  const regionData = payload.results?.[region];
  if (!regionData) {
    return null;
  }

  return {
    flatrate: mapProviders(regionData.flatrate),
    rent: mapProviders(regionData.rent),
    buy: mapProviders(regionData.buy),
    link: regionData.link ?? null,
  };
}
