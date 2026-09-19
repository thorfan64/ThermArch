export default function Hero({ onStart, onDemo }) {
  return (
    <section id="top" className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <h1 className="text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
            Design buildings for the climate they&rsquo;re born in.
          </h1>
          <p className="mt-6 max-w-reading text-base leading-relaxed text-paper-muted sm:text-lg">
            Thermarch transforms environmental conditions into explainable
            passive-architecture design parameters.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={onStart}>
              Start simulation
            </button>
            <button type="button" className="btn-ghost" onClick={onDemo}>
              Explore demo
            </button>
          </div>
        </div>

        {/* The pipeline itself is the hero image: the product is the
            transformation, so it is drawn rather than described. */}
        <div className="sheet ticked p-6">
          <ol className="space-y-0">
            {[
              ["Location", "a place on the map"],
              ["Environmental conditions", "temperature, humidity, wind"],
              ["Climate class", "one of four thermal regimes"],
              ["Design parameters", "geometry, envelope, openings"],
            ].map(([label, sub], index, all) => (
              <li key={label} className="relative pl-7">
                <span
                  className="absolute left-[7px] top-[9px] h-2 w-2 rounded-full bg-thermal-warm"
                  aria-hidden="true"
                />
                {index < all.length - 1 && (
                  <span
                    className="absolute left-[11px] top-[17px] h-[calc(100%-10px)] w-px bg-rule"
                    aria-hidden="true"
                  />
                )}
                <div className="pb-6">
                  <p className="text-sm font-medium text-paper">{label}</p>
                  <p className="text-sm text-paper-faint">{sub}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
