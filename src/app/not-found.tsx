import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-semibold text-[#111111]">Not Found</h1>
      <p className="mt-3 text-base text-[#6e6e73]">That actor or movie page does not exist.</p>
      <Link
        href="/"
        className="mt-7 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black"
      >
        Back to Home
      </Link>
    </main>
  );
}
