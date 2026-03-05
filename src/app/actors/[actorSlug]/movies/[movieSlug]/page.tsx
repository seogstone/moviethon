import { redirect } from "next/navigation";

interface LegacyMoviePageProps {
  params: Promise<{ actorSlug: string; movieSlug: string }>;
}

export default async function LegacyMoviePage({ params }: LegacyMoviePageProps) {
  const { actorSlug, movieSlug } = await params;
  redirect(`/movies/${movieSlug}?actor=${actorSlug}`);
}
