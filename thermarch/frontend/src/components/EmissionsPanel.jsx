import { useState } from "react";
import { Leaf, TreePine, Car } from "lucide-react";
import Section from "./Section";

const TREE_KG_CO2_PER_YEAR = 21; // one mature tree absorbs roughly this much annually
const CAR_KG_CO2_PER_KM = 0.12; // typical petrol car tailpipe emissions

function BarPair({ label, baseline, optimized, unit }) {
  const max = Math.max(baseline, optimized, 1);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-paper-muted">{label}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="annot w-20 shrink-0">Baseline</span>
          <div className="h-2 flex-1 bg-ink-deep">
            <div
              className="h-full bg-thermal-hot/70"
              style={{ width: `${(baseline / max) * 100}%` }}
            />
          </div>
          <span className="readout w-24 shrink-0 text-right text-sm text-paper-muted">
            {baseline.toFixed(1)} {unit}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="annot w-20 shrink-0">Thermarch</span>
          <div className="h-2 flex-1 bg-ink-deep">
            <div
              className="h-full bg-thermal-mild"
              style={{ width: `${(optimized / max) * 100}%` }}
            />
          </div>
          <span className="readout w-24 shrink-0 text-right text-sm text-paper">
            {optimized.toFixed(1)} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EmissionsPanel({ emissions }) {
  const [area, setArea] = useState(100);

  const safeArea = Number.isFinite(area) && area > 0 ? area : 0;
  const totalAvoidedKg = emissions.co2_avoided_kg_per_m2_year * safeArea;
  const trees = totalAvoidedKg / TREE_KG_CO2_PER_YEAR;
  const carKm = totalAvoidedKg / CAR_KG_CO2_PER_KM;

  return (
    <Section title="Operational emissions estimate" note="Avoided vs. conventional baseline" ticked>
      <p className="mb-6 max-w-reading text-sm leading-relaxed text-paper-muted">
        This is not a reduction in an existing building&rsquo;s emissions. It
        is an estimate of the operational HVAC emissions a{" "}
        <em>new</em> building on this site would avoid each year, compared to
        a conventional building built without these passive strategies in the
        same climate.
      </p>

      <div className="grid gap-8 sm:grid-cols-2">
        <BarPair
          label="Energy demand"
          baseline={emissions.baseline_energy_kwh_per_m2_year}
          optimized={emissions.optimized_energy_kwh_per_m2_year}
          unit="kWh/m²/yr"
        />
        <BarPair
          label="Operational CO₂"
          baseline={emissions.baseline_co2_kg_per_m2_year}
          optimized={emissions.optimized_co2_kg_per_m2_year}
          unit="kg/m²/yr"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-rule pt-5">
        <div className="flex items-baseline gap-2">
          <Leaf className="h-4 w-4 text-thermal-mild" aria-hidden="true" />
          <span className="readout text-2xl font-medium text-thermal-mild">
            {emissions.reduction_percent}%
          </span>
          <span className="text-sm text-paper-muted">estimated avoidance vs. baseline</span>
        </div>
        <span className="annot">
          Grid factor: {emissions.grid_factor_kg_co2_per_kwh} kg CO&#8322;/kWh
          {emissions.grid_country ? ` (${emissions.grid_country})` : " (global average)"}
        </span>
      </div>

      <div className="mt-6 border-t border-rule pt-5">
        <label htmlFor="floor-area" className="annot mb-2 block">
          Estimate for a floor area of
        </label>
        <div className="flex items-center gap-3">
          <input
            id="floor-area"
            type="number"
            min="1"
            step="10"
            className="field w-32"
            value={area}
            onChange={(event) => setArea(Number(event.target.value))}
          />
          <span className="text-sm text-paper-muted">m²</span>
        </div>

        {safeArea > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 border border-rule p-4">
              <TreePine className="h-5 w-5 shrink-0 text-thermal-mild" aria-hidden="true" />
              <p className="text-sm text-paper-muted">
                <span className="readout text-paper">{Math.round(trees)}</span>{" "}
                mature trees&rsquo; worth of annual CO&#8322; absorption
              </p>
            </div>
            <div className="flex items-center gap-3 border border-rule p-4">
              <Car className="h-5 w-5 shrink-0 text-thermal-mild" aria-hidden="true" />
              <p className="text-sm text-paper-muted">
                <span className="readout text-paper">{Math.round(carKm).toLocaleString()}</span>{" "}
                km of car travel, avoided each year
              </p>
            </div>
          </div>
        )}
        <p className="annot mt-3">
          {Math.round(totalAvoidedKg).toLocaleString()} kg CO&#8322; avoided/year at {safeArea} m² &middot; illustrative equivalents, not part of the emissions estimate itself
        </p>
      </div>

      <p className="mt-6 max-w-reading text-sm text-paper-faint">{emissions.basis}</p>
    </Section>
  );
}
