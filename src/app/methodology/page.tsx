export const dynamic = "force-dynamic";

export default function MethodologyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1100px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">methodology</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">understanding the moviethon index</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          The Moviethon Index is a daily recalculated performance score designed to measure cultural momentum across
          films, actors, and genres. It combines structured community participation signals with external context and
          time-weighted behavior.
        </p>
      </section>

      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">core components</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
          <p>
            <span className="text-[var(--foreground)]">rating quality.</span> Bayesian-adjusted rating quality to
            reduce low-sample distortion and prioritize sustained, credible scoring patterns.
          </p>
          <p>
            <span className="text-[var(--foreground)]">engagement velocity.</span> Directional movement from rating and
            discussion activity, measured through short-window versus baseline acceleration.
          </p>
          <p>
            <span className="text-[var(--foreground)]">recency weighting.</span> Recent behavior receives greater
            influence to keep the index focused on current momentum rather than historical peaks.
          </p>
          <p>
            <span className="text-[var(--foreground)]">external signals.</span> External popularity context is
            normalized and applied as a secondary signal, not a dominant one.
          </p>
        </div>
      </section>

      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">time-series architecture</h2>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Index values are recomputed daily and persisted as historical snapshots. This enables rank tracking,
          volatility classification, and transparent trend analysis over multiple windows without relying on ad hoc
          recalculations.
        </p>
      </section>

      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">volatility and hierarchy</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
          <p>
            Volatility is derived from trailing index variability and classified as stable, moderate, or high.
            Volatility reflects movement profile, not quality.
          </p>
          <p>
            Moviethon uses a hierarchical model where film indices are primary and actor/genre indices are derived from
            those film-level signals.
          </p>
        </div>
      </section>

      <section className="panel-shell rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">what the index is not</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-[var(--muted)]">
          <li>not a box office metric</li>
          <li>not a review-site clone score</li>
          <li>not a financial instrument</li>
          <li>not predictive guidance</li>
        </ul>
      </section>
    </main>
  );
}

