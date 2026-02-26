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
  const [open, setOpen] = useState(false);

  const actorLinks = useMemo(
    () => [...actors].sort((a, b) => a.name.localeCompare(b.name)),
    [actors],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#e0dff5] bg-[rgba(248,248,254,0.85)] backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#2a2755]">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#7b77ff]" />
          moviethon
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              pathname === "/"
                ? "bg-[#ecebff] text-[#3733b8]"
                : "text-[#5c5a82] hover:bg-[#f0efff] hover:text-[#2f2d66]"
            }`}
          >
            home
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              className="rounded-full px-3 py-1.5 text-sm text-[#5c5a82] transition hover:bg-[#f0efff] hover:text-[#2f2d66]"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              Actors ▾
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#dddaf6] bg-white p-2 shadow-[0_16px_36px_rgba(42,39,85,0.14)]">
                {actorLinks.map((actor) => {
                  const href = `/actors/${actor.slug}`;
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={actor.slug}
                      href={href}
                      className={`block rounded-xl px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-[#ecebff] text-[#3733b8]"
                          : "text-[#4a4768] hover:bg-[#f4f3ff] hover:text-[#2f2d66]"
                      }`}
                    >
                      {actor.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {authEnabled && viewer && (
            <Link
              href="/me/ratings"
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                pathname.startsWith("/me/ratings")
                  ? "bg-[#ecebff] text-[#3733b8]"
                  : "text-[#5c5a82] hover:bg-[#f0efff] hover:text-[#2f2d66]"
              }`}
            >
              my ratings
            </Link>
          )}

          {authEnabled && (
            <>
              {viewer ? (
                <>
                  <span className="hidden rounded-full border border-[#d9d7f2] px-3 py-1.5 text-xs text-[#5c5a82] md:inline-flex">
                    {viewer.name || "member"}
                  </span>
                  <a
                    href="/auth/logout"
                    className="rounded-full px-3 py-1.5 text-sm text-[#5c5a82] transition hover:bg-[#f0efff] hover:text-[#2f2d66]"
                  >
                    log out
                  </a>
                </>
              ) : (
                <a
                  href="/auth/login"
                  className="rounded-full bg-[#1a1738] px-3 py-1.5 text-sm text-white transition hover:bg-[#111022]"
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
