"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

interface NavActor {
  slug: string;
  name: string;
}

interface NavViewer {
  name: string | null;
}

interface NavBarProps {
  actors: NavActor[];
  viewer: NavViewer | null;
  authEnabled: boolean;
}

export function NavBar({ actors, viewer, authEnabled }: NavBarProps) {
  const pathname = usePathname();
  const [actorsOpen, setActorsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const actorLinks = useMemo(
    () => [...actors].sort((a, b) => a.name.localeCompare(b.name)),
    [actors],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[#0f1217]/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
          moviethon
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              pathname === "/"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[#171d25] hover:text-[var(--foreground)]"
            }`}
          >
            home
          </Link>

          <Link
            href="/rankings/films"
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              pathname.startsWith("/rankings")
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[#171d25] hover:text-[var(--foreground)]"
            }`}
          >
            rankings
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActorsOpen((value) => !value)}
              onBlur={() => setTimeout(() => setActorsOpen(false), 120)}
              className="rounded-full px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-[#171d25] hover:text-[var(--foreground)]"
              aria-expanded={actorsOpen}
              aria-haspopup="menu"
            >
              actors ▾
            </button>

            {actorsOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--border)] bg-[#0f1318] p-2 shadow-[0_20px_32px_rgba(0,0,0,0.45)]">
                {actorLinks.map((actor) => {
                  const href = `/actors/${actor.slug}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={actor.slug}
                      href={href}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--foreground)] hover:bg-[#171d25]"
                      }`}
                    >
                      {actor.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {authEnabled && (
            <>
              {viewer ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((value) => !value)}
                    onBlur={() => setTimeout(() => setProfileOpen(false), 120)}
                    className={`rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition ${
                      pathname === "/me" || pathname.startsWith("/me/")
                        ? "bg-[#171d25] text-[var(--foreground)]"
                        : "text-[var(--muted)] hover:bg-[#171d25] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {viewer.name || "member"} ▾
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[#0f1318] p-2 shadow-[0_20px_32px_rgba(0,0,0,0.45)]">
                      <Link
                        href="/me"
                        className="block rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[#171d25]"
                      >
                        profile
                      </Link>
                      <a
                        href="/auth/logout"
                        className="block rounded-lg px-3 py-2 text-sm text-[var(--muted)] hover:bg-[#171d25] hover:text-[var(--foreground)]"
                      >
                        log out
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <a
                  href="/auth/login"
                  className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm text-white transition hover:bg-[var(--accent-highlight)]"
                >
                  log in
                </a>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
