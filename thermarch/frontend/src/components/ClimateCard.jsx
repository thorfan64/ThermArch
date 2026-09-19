import Section from "./Section";
import { climateColor } from "../utils/format";

export default function ClimateCard({ climate }) {
  const accent = climateColor(climate.classification);
  return (
    <Section title="Climate class" note={`${climate.severity} intensity`} ticked>
      <p
        className="text-3xl font-bold tracking-tight sm:text-4xl"
        style={{ color: accent }}
      >
        {climate.label}
      </p>
      <p className="mt-4 max-w-reading text-sm leading-relaxed text-paper-muted">
        {climate.summary}
      </p>
      <div className="mt-5 h-1 w-full" aria-hidden="true">
        <div className="h-full" style={{ background: accent, width: "100%", opacity: 0.8 }} />
      </div>
    </Section>
  );
}
