import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowLeftRight, X } from "lucide-react";
import Section from "./Section";
import ErrorState from "./ErrorState";
import { useSimulation } from "../hooks/useSimulation";
import { climateColor, placeLabel, titleCase } from "../utils/format";

const AXES = [
  ["heat_retention", "Heat retention"],
  ["solar_protection", "Solar protection"],
  ["ventilation", "Ventilation"],
  ["thermal_mass", "Thermal mass"],
  ["glazing_efficiency", "Glazing"],
];

const SUGGESTIONS = ["Ladakh", "Dubai", "London", "Chennai", "Reykjavik"];

function Column({ result, align = "left" }) {
  const accent = climateColor(result.climate.classification);
  const { recommendation, weather } = result;
  return (
    <div className={align === "right" ? "sm:text-right" : ""}>
      <p className="text-lg font-medium">{placeLabel(result.location)}</p>
      <p className="readout mt-3 text-3xl" style={{ color: accent }}>
        {weather.temperature_c}&deg;C
      </p>
      <p className="readout text-sm text-paper-muted">
        {weather.humidity_percent}% humidity &middot; {weather.wind_speed_mps} m/s
      </p>
      <p className="mt-4 text-xl font-semibold" style={{ color: accent }}>
        {result.climate.label}
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-paper-muted">
        <li>{titleCase(recommendation.thermal_strategy_label)}</li>
        <li>{titleCase(recommendation.ventilation_strategy_label)}</li>
        <li>{titleCase(recommendation.shading_strategy_label)}</li>
        <li>WWR {Math.round(recommendation.window_to_wall_ratio * 100)}%</li>
        <li>Insulation {recommendation.insulation_mm} mm</li>
        <li>{titleCase(recommendation.thermal_mass)} thermal mass</li>
      </ul>
    </div>
  );
}

export default function ComparisonPanel({ primary }) {
  const [query, setQuery] = useState("Ladakh");
  const { loading, result, error, run, reset } = useSimulation();

  const chartData = result
    ? AXES.map(([key, label]) => ({
        axis: label,
        a: primary.heuristic_profile[key],
        b: result.heuristic_profile[key],
      }))
    : [];

  return (
    <Section title="Compare two locations" note="Same engine, different climate" ticked>
      <p className="mb-5 max-w-reading text-sm text-paper-muted">
        Run a second site through the same pipeline. The engine does not change
        &mdash; only the environmental input does.
      </p>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim()) run({ location: query.trim() });
        }}
      >
        <label htmlFor="comparison-location" className="sr-only">
          Second location
        </label>
        <input
          id="comparison-location"
          className="field flex-1"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ladakh"
          disabled={loading}
          autoComplete="off"
        />
        <button type="submit" className="btn-ghost sm:px-6" disabled={loading}>
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          {loading ? "Comparing…" : "Compare"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.filter((name) => name !== primary.location.name).map((name) => (
          <button
            key={name}
            type="button"
            className="border border-rule px-3 py-1.5 text-sm text-paper-muted transition-colors hover:border-paper/40 hover:text-paper"
            disabled={loading}
            onClick={() => {
              setQuery(name);
              run({ location: name });
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-5">
          <ErrorState error={error} />
        </div>
      )}

      {result && (
        <div className="mt-8 border-t border-rule pt-8">
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm text-paper-faint hover:text-paper"
              onClick={reset}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear comparison
            </button>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <Column result={primary} />
            <Column result={result} align="right" />
          </div>

          <div className="mt-8 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} outerRadius="72%">
                <PolarGrid stroke="rgba(237,243,247,0.16)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#9DB4C6", fontSize: 11 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name={primary.location.name}
                  dataKey="a"
                  stroke={climateColor(primary.climate.classification)}
                  fill={climateColor(primary.climate.classification)}
                  fillOpacity={0.24}
                />
                <Radar
                  name={result.location.name}
                  dataKey="b"
                  stroke={climateColor(result.climate.classification)}
                  fill={climateColor(result.climate.classification)}
                  fillOpacity={0.24}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9DB4C6" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="annot mt-2 text-center">Thermarch heuristic assessment</p>
        </div>
      )}
    </Section>
  );
}
