import Link from "next/link";

const items = [
  { href: "/rankings/films", label: "films" },
  { href: "/rankings/actors", label: "actors" },
  { href: "/rankings/genres", label: "genres" },
  { href: "/rankings/gainers", label: "gainers" },
  { href: "/rankings/decliners", label: "decliners" },
];

export function RankingsNav({ activeHref }: { activeHref: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            activeHref === item.href
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--border)] bg-[#0f1318] text-[var(--muted)] hover:border-[#2a3340] hover:text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
