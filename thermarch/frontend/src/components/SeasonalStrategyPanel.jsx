import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Section from "./Section";
import { climateColor, titleCase } from "../utils/format";

const AXES = [
  ["heat_retention", "Heat retention"],
  ["solar_protection", "Solar protection"],
  ["ventilation", "Ventilation"],
  ["thermal_mass", "Thermal mass"],
  ["glazing_efficiency", "Glazing"],
];

function SeasonColumn({ label, climate, recommendation }) {
  const accent = climateColor(climate.classification);
  return (
    <div>
      <p className="annot mb-2">{label}</p>
      <p className="readout text-2xl" style={{ color: accent }}>
        {climate.temperature_c}&deg;C
      </p>
      <p className="readout text-sm text-paper-muted">{climate.humidity_percent}% humidity</p>
      <p className="mt-3 text-lg font-semibold" style={{ color: accent }}>
        {climate.label}
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-paper-muted">
        <li>{titleCase(recommendation.thermal_strategy_label)}</li>
        <li>{titleCase(recommendation.ventilation_strategy_label)}</li>
        <li>{titleCase(recommendation.shading_strategy_label)}</li>
        <li>WWR {Math.round(recommendation.window_to_wall_ratio * 100)}%</li>
        <li>Insulation {recommendation.insulation_mm} mm</li>
      </ul>
    </div>
  );
}

export default function SeasonalStrategyPanel({ summer, winter, designStrategy }) {
  const chartData = AXES.map(([key, label]) => ({
    axis: label,
    summer: summer.heuristic_profile[key],
    winter: winter.heuristic_profile[key],
  }));

  return (
    <Section
      title="Summer vs. winter design"
      note={designStrategy === "seasonal_adaptive" ? "Adaptive design recommended" : "Same design serves both"}
      ticked
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <SeasonColumn label="Summer (hottest month)" climate={summer.climate} recommendation={summer.recommendation} />
        <SeasonColumn label="Winter (coldest month)" climate={winter.climate} recommendation={winter.recommendation} />
      </div>

      <div className="mt-8 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="72%">
            <PolarGrid stroke="rgba(237,243,247,0.16)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "#9DB4C6", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Summer"
              dataKey="summer"
              stroke={climateColor(summer.climate.classification)}
              fill={climateColor(summer.climate.classification)}
              fillOpacity={0.24}
            />
            <Radar
              name="Winter"
              dataKey="winter"
              stroke={climateColor(winter.climate.classification)}
              fill={climateColor(winter.climate.classification)}
              fillOpacity={0.24}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#9DB4C6" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="annot mt-2 text-center">Thermarch heuristic assessment, both seasons</p>
    </Section>
  );
}
