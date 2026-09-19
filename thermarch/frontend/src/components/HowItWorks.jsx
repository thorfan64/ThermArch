import Section from "./Section";

const STEPS = [
  [
    "You give a location",
    "A place name is resolved to coordinates, or you enter latitude and longitude directly.",
  ],
  [
    "The server fetches conditions",
    "Temperature, humidity, wind speed and sky condition come from OpenWeatherMap. The API key stays on the server.",
  ],
  [
    "A rule engine classifies the climate",
    "A Python process sorts the site into cold, moderate, hot-dry or hot-humid using explicit thresholds you can read in engine.py.",
  ],
  [
    "Parameters are derived",
    "Each design value follows from a rule. Window-to-wall ratio starts from the climate class and is adjusted by temperature and humidity; insulation scales with how far the site sits below comfort.",
  ],
  [
    "The reasoning comes back with the answer",
    "Explanations are produced by the same code that produced the numbers, so the interface never invents a justification of its own.",
  ],
];

export default function HowItWorks() {
  return (
    <div className="space-y-6">
      <Section title="How it works">
        {/* Numbered markers are used here because this genuinely is a sequence. */}
        <ol className="space-y-6">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
              <span className="readout text-sm text-thermal-warm">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-base font-medium text-paper">{title}</h3>
                <p className="mt-1 max-w-reading text-sm leading-relaxed text-paper-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div id="about" className="scroll-mt-24">
      <Section title="About">
        <div className="max-w-reading space-y-4 text-sm leading-relaxed text-paper-muted">
          <p>
            Thermarch is a computational design decision-support prototype for
            exploring climate-responsive passive architecture. It is built for
            architecture and engineering students, researchers, and anyone
            testing how environmental conditions should shape a building.
          </p>
          <p>
            Version one is a rule-based conceptual recommendation engine. It is
            not a certified architectural simulation, it does not guarantee
            energy savings, and it is not professional engineering advice. The
            performance bars are Thermarch heuristic indicators, not measured
            results.
          </p>
          <p>
            The engine is deliberately isolated behind a REST boundary so it can
            be replaced later with solar radiation models, multi-objective
            optimisation, or a validated simulation workflow such as EnergyPlus,
            without touching the interface.
          </p>
        </div>
      </Section>
      </div>
    </div>
  );
}
