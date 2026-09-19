import {
  Box,
  Compass,
  PanelsTopLeft,
  Layers,
  Shield,
  Wind,
  Sun,
  Home,
  Gauge,
  Filter,
  ShieldCheck,
} from "lucide-react";
import Section from "./Section";
import { titleCase } from "../utils/format";

export default function RecommendationPanel({ recommendation }) {
  const rows = [
    { icon: Box, label: "Building geometry", value: recommendation.building_shape_label },
    { icon: Compass, label: "Orientation", value: `${recommendation.orientation_deg}\u00B0 from north` },
    {
      icon: PanelsTopLeft,
      label: "Window-to-wall ratio",
      value: `${Math.round(recommendation.window_to_wall_ratio * 100)}%`,
    },
    { icon: Home, label: "Roof strategy", value: recommendation.roof_strategy_label },
    { icon: Layers, label: "Wall material", value: recommendation.wall_material_label },
    { icon: Shield, label: "Insulation", value: `${recommendation.insulation_mm} mm` },
    { icon: Gauge, label: "Thermal strategy", value: recommendation.thermal_strategy_label },
    { icon: Wind, label: "Ventilation", value: recommendation.ventilation_strategy_label },
    { icon: Sun, label: "Shading", value: recommendation.shading_strategy_label },
    { icon: Filter, label: "Ventilation filtration", value: recommendation.ventilation_filtration_label },
    { icon: ShieldCheck, label: "Facade UV treatment", value: recommendation.facade_uv_treatment_label },
  ];

  return (
    <Section title="Parametric design recommendation" note="Deterministic output" ticked>
      <dl className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-ink-raised p-4">
            <dt className="annot flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-2 text-base font-medium leading-snug text-paper">
              {titleCase(value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-paper-faint">
        Thermal mass: {titleCase(recommendation.thermal_mass)} &middot; Roof overhang:{" "}
        <span className="readout">{recommendation.roof_overhang_m} m</span>
      </p>
    </Section>
  );
}
