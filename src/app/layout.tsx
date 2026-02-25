import type { Metadata } from "next";
import { Funnel_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { NavBar } from "@/components/NavBar";
import { fallbackActors } from "@/lib/data/fallback";
import { listFeaturedActors } from "@/lib/data/queries";
import "./globals.css";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "moviethon",
  description: "binge the defining movies of your favorite actors.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let actors = fallbackActors().map((actor) => ({ slug: actor.slug, name: actor.name }));

  try {
    const fromDb = await listFeaturedActors();
    if (fromDb.length) {
      actors = fromDb.map((actor) => ({ slug: actor.slug, name: actor.name }));
    }
  } catch {
    // Keep fallback actors when DB is unavailable.
  }

  return (
    <html lang="en">
      <body className={`${funnelDisplay.variable} antialiased`}>
        <NavBar actors={actors} />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
