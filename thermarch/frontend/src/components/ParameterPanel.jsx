import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import Section from "./Section";

/**
 * Sensitivity explorer. Moving a slider does NOT re-run the engine - it shows
 * the direction in which the heuristic indicators would move, using the same
 * relationships the engine encodes. Labelled as such so nobody mistakes it
 * for a validated simulation.
 */
const SLIDERS = [
  { key: "wwr", label: "Window-to-wall ratio", min: 10, max: 60, step: 1, unit: "%" },
  { key: "overhang", label: "Roof overhang", min: 0, max: 20, step: 1, unit: "m", scale: 0.1 },
  { key: "insulation", label: "Insulation", min: 25, max: 250, step: 5, unit: "mm" },
  { key: "mass", label: "Thermal mass", min: 0, max: 100, step: 5, unit: "" },
];

const MASS_LEVELS = { low: 25, medium: 55, high: 85 };

function angularDeviation(angle, baselineAngle) {
  const diff = Math.abs(angle - baselineAngle) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function compassLabel(deg) {
  const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return points[Math.round(deg / 45) % 8];
}

function deriveEffects(values, baseline) {
  // Same directional relationships as engine.py, applied to the delta only.
  const wwrDelta = values.wwr - baseline.wwr;
  const overhangDelta = values.overhang - baseline.overhang;
  const insulationDelta = values.insulation - baseline.insulation;
  const massDelta = values.mass - baseline.mass;
  const orientationDeviation = angularDeviation(values.orientation, baseline.orientation);

  return [
    {
      label: "Daylight availability",
      delta: wwrDelta * 1.4,
    },
    {
      label: "Solar heat gain",
      delta: wwrDelta * 1.6 - overhangDelta * 1.1 + orientationDeviation * 0.4,
    },
    {
      label: "Envelope heat loss",
      delta: wwrDelta * 1.2 - insulationDelta * 0.25,
    },
    {
      label: "Indoor temperature stability",
      delta: massDelta * 0.6 + insulationDelta * 0.15 - wwrDelta * 0.4,
    },
    {
      label: "Shading design alignment",
      delta: -orientationDeviation * 0.5,
    },
  ];
}

function Arrow({ delta, deadZone = 3 }) {
  if (Math.abs(delta) < deadZone) {
    return <span className="text-paper-faint">unchanged</span>;
  }
  const rising = delta > 0;
  const magnitude = Math.min(3, Math.ceil(Math.abs(delta) / 12));
  return (
    <span style={{ color: rising ? "#DD6A50" : "#57A9E2" }}>
      {(rising ? "\u25B2" : "\u25BC").repeat(magnitude)}{" "}
      <span className="text-paper-muted">{rising ? "increases" : "decreases"}</span>
    </span>
  );
}

export default function ParameterPanel({ recommendation }) {
  const baseline = useMemo(
    () => ({
      wwr: Math.round(recommendation.window_to_wall_ratio * 100),
      overhang: Math.round(recommendation.roof_overhang_m * 10),
      insulation: recommendation.insulation_mm,
      mass: MASS_LEVELS[recommendation.thermal_mass] ?? 55,
      orientation: recommendation.orientation_deg,
    }),
    [recommendation]
  );

  const [values, setValues] = useState(baseline);
  useEffect(() => setValues(baseline), [baseline]);

  const effects = deriveEffects(values, baseline);
  const touched =
    SLIDERS.some((slider) => values[slider.key] !== baseline[slider.key]) ||
    values.orientation !== baseline.orientation;
  const orientationDeviation = angularDeviation(values.orientation, baseline.orientation);

  return (
    <Section
      title="Design parameters"
      note="Explore design sensitivity"
      ticked
    >
      <p className="mb-6 max-w-reading text-sm text-paper-muted">
        These sliders show the direction each parameter pushes the design. They
        do not re-run the engine and they are not a validated building
        simulation. Orientation is location-dependent already &mdash; the
        engine sets it from climate, wind speed, and hemisphere &mdash; this
        slider shows what happens if the plot forces a different angle.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="slider-orientation" className="text-sm text-paper">
                Orientation from north
              </label>
              <span className="readout text-sm text-thermal-warm">
                {values.orientation}&deg; ({compassLabel(values.orientation)})
              </span>
            </div>
            <input
              id="slider-orientation"
              type="range"
              min="0"
              max="355"
              step="5"
              value={values.orientation}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  orientation: Number(event.target.value),
                }))
              }
              className="w-full accent-[#E3A23C]"
            />
            <p className="annot mt-1">
              Engine value: {baseline.orientation}&deg; ({compassLabel(baseline.orientation)})
              {orientationDeviation > 0 && ` \u00B7 ${orientationDeviation}\u00B0 off plan`}
            </p>
          </div>

          {SLIDERS.map((slider) => {
            const raw = values[slider.key];
            const display = slider.scale ? (raw * slider.scale).toFixed(1) : raw;
            return (
              <div key={slider.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <label htmlFor={`slider-${slider.key}`} className="text-sm text-paper">
                    {slider.label}
                  </label>
                  <span className="readout text-sm text-thermal-warm">
                    {display}
                    {slider.unit}
                  </span>
                </div>
                <input
                  id={`slider-${slider.key}`}
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={raw}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      [slider.key]: Number(event.target.value),
                    }))
                  }
                  className="w-full accent-[#E3A23C]"
                />
                <p className="annot mt-1">
                  Engine value:{" "}
                  {slider.scale
                    ? (baseline[slider.key] * slider.scale).toFixed(1)
                    : baseline[slider.key]}
                  {slider.unit}
                </p>
              </div>
            );
          })}
        </div>

        <div className="border border-rule p-5">
          <p className="annot mb-4">Conceptual effect</p>
          <ul className="space-y-4">
            {effects.map((effect) => (
              <li key={effect.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-paper-muted">{effect.label}</span>
                <Arrow delta={effect.delta} deadZone={effect.label.includes("Shading") ? 5 : 3} />
              </li>
            ))}
          </ul>
          {touched && (
            <button
              type="button"
              className="btn-ghost mt-6 px-4 py-2"
              onClick={() => setValues(baseline)}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset to engine values
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}
