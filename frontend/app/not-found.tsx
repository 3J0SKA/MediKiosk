import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#10241F] px-6 text-center text-[#F3ECDA]">
      <p className="text-sm uppercase tracking-[0.2em] text-[#B9CFC4]">404</p>
      <h1 className="mt-4 text-3xl font-medium">This page doesn't exist</h1>
      <p className="mt-2 max-w-sm text-sm text-[#D8E3DC]">
        The link you followed may be broken, or the page may have moved.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-[#E9A23F] px-5 py-2.5 text-sm font-semibold text-[#10241F] transition hover:bg-[#C97F28]"
        >
          Go to homepage
        </Link>
        <Link
          href="/patient-login"
          className="rounded-full border border-[#B9CFC4]/40 px-5 py-2.5 text-sm font-semibold transition hover:border-[#B9CFC4]"
        >
          Patient login
        </Link>
        <Link
          href="/patient-home"
          className="rounded-full border border-[#B9CFC4]/40 px-5 py-2.5 text-sm font-semibold transition hover:border-[#B9CFC4]"
        >
          Patient dashboard
        </Link>
      </div>
    </main>
  );
}