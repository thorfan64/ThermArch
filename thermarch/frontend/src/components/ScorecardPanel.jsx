import Section from "./Section";

const LABELS = {
  heat_retention: "Heat retention",
  solar_protection: "Solar protection",
  ventilation: "Ventilation",
  thermal_mass: "Thermal mass",
  glazing_efficiency: "Glazing efficiency",
};

const ORDER = [
  "heat_retention",
  "solar_protection",
  "ventilation",
  "thermal_mass",
  "glazing_efficiency",
];

export default function ScorecardPanel({ profile, compact = false }) {
  return compact ? (
    <Bars profile={profile} />
  ) : (
    <Section title="Passive performance profile" note="Thermarch heuristic assessment" ticked>
      <Bars profile={profile} />
      <p className="mt-6 max-w-reading text-sm text-paper-faint">
        These are Thermarch heuristic indicators showing which passive
        strategies matter most at this site. They are not certified
        energy-performance scores.
      </p>
    </Section>
  );
}

function Bars({ profile }) {
  return (
    <ul className="space-y-4">
      {ORDER.map((key) => {
        const value = profile[key];
        const filled = Math.round(value / 10);
        return (
          <li key={key}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="text-paper-muted">{LABELS[key]}</span>
              <span className="readout text-paper">{value}</span>
            </div>
            <div
              className="readout text-sm tracking-[0.12em] text-thermal-warm"
              role="img"
              aria-label={`${LABELS[key]}: ${value} out of 100`}
            >
              {"\u2588".repeat(filled)}
              <span className="text-paper-faint/40">{"\u2591".repeat(10 - filled)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
