import type { Metadata } from "next";
import { Funnel_Display } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

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
        {gtmId ? (
          <>
            <Script id="gtm-loader" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        ) : null}
        <NavBar actors={actors} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
