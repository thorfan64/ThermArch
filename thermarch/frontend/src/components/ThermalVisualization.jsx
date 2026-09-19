import Section from "./Section";
import { climateColor } from "../utils/format";

/**
 * A procedural section drawing. Geometry is driven by the engine output:
 *   - overhang length  <- roof_overhang_m
 *   - aperture width   <- window_to_wall_ratio
 *   - wall thickness   <- insulation_mm
 *   - airflow path     <- ventilation_strategy
 *   - heat arrows      <- thermal_strategy
 * Change the location and the drawing changes with it.
 */

const COPY = {
  cold: {
    sun: "Solar gain captured",
    air: "Ventilation controlled",
    heat: "Heat retained",
    caption:
      "The section closes down: thick envelope, modest apertures on the sun-facing side, and air exchange that is deliberate rather than continuous.",
  },
  hot_humid: {
    sun: "Solar load rejected",
    air: "Cross ventilation",
    heat: "Heat carried away",
    caption:
      "The section opens up: deep shade over tall openings, a ventilated roof, and a clear air path straight through the plan.",
  },
  hot_dry: {
    sun: "Solar load rejected",
    air: "Night purge",
    heat: "Heat stored, released at night",
    caption:
      "The section thickens: small recessed openings, heavy mass that absorbs the day, and night air used to discharge it.",
  },
  moderate: {
    sun: "Seasonal solar control",
    air: "Operable ventilation",
    heat: "Balanced exchange",
    caption:
      "The section stays flexible: usable glazing, overhangs sized for the warm season, and windows that do the work most of the year.",
  },
};

export default function ThermalVisualization({ recommendation, climate }) {
  const accent = climateColor(climate.classification);
  const copy = COPY[climate.classification] || COPY.moderate;
  const isHot = climate.classification.startsWith("hot");

  const overhang = Math.min(90, recommendation.roof_overhang_m * 70);
  const wallThickness = 6 + (recommendation.insulation_mm / 250) * 16;
  const apertureWidth = Math.max(18, recommendation.window_to_wall_ratio * 190);

  const left = 210;
  const right = 430;
  const top = 175;
  const bottom = 320;

  return (
    <Section title="Thermal strategy" note={`${recommendation.orientation_deg}\u00B0 from north`} ticked>
      <svg
        viewBox="0 0 640 400"
        className="w-full"
        role="img"
        aria-label={`Section diagram for a ${climate.label} climate: ${copy.caption}`}
      >
        <defs>
          <marker id="tip" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="currentColor" />
          </marker>
        </defs>

        {/* ground line */}
        <line x1="60" y1={bottom} x2="580" y2={bottom} stroke="rgba(237,243,247,0.35)" strokeWidth="1.5" />
        {Array.from({ length: 18 }).map((_, index) => (
          <line
            key={index}
            x1={64 + index * 30}
            y1={bottom}
            x2={54 + index * 30}
            y2={bottom + 10}
            stroke="rgba(237,243,247,0.18)"
            strokeWidth="1"
          />
        ))}

        {/* sun */}
        <g stroke={accent} fill="none" color={accent}>
          <circle cx="520" cy="58" r="16" strokeWidth="1.5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const radians = (angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1={520 + Math.cos(radians) * 22}
                y1={58 + Math.sin(radians) * 22}
                x2={520 + Math.cos(radians) * 28}
                y2={58 + Math.sin(radians) * 28}
                strokeWidth="1.2"
              />
            );
          })}
          <line
            x1="500"
            y1="86"
            x2={right - 10}
            y2={top - 22}
            strokeWidth="1.5"
            markerEnd="url(#tip)"
          />
        </g>
        <text x="472" y="30" fill={accent} fontSize="11" fontFamily="JetBrains Mono, monospace">
          {copy.sun.toUpperCase()}
        </text>

        {/* roof plus overhang, length set by the engine */}
        <line
          x1={left - overhang}
          y1={top}
          x2={right + overhang}
          y2={top}
          stroke="#EDF3F7"
          strokeWidth="4"
          strokeLinecap="square"
        />
        <text
          x={right + 8}
          y={top - 10}
          fill="rgba(237,243,247,0.7)"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
        >
          overhang {recommendation.roof_overhang_m}m
        </text>

        {/* walls, thickness set by insulation */}
        <rect
          x={left}
          y={top}
          width={wallThickness}
          height={bottom - top}
          fill="rgba(237,243,247,0.75)"
        />
        <rect
          x={right - wallThickness}
          y={top}
          width={wallThickness}
          height={bottom - top}
          fill="rgba(237,243,247,0.75)"
        />
        <rect
          x={left}
          y={top}
          width={right - left}
          height={bottom - top}
          fill="rgba(237,243,247,0.04)"
          stroke="rgba(237,243,247,0.25)"
        />

        {/* apertures, width set by window-to-wall ratio */}
        <rect
          x={left - 1}
          y={228}
          width={wallThickness + 2}
          height={apertureWidth * 0.32}
          fill={accent}
          opacity="0.9"
        />
        <rect
          x={right - wallThickness - 1}
          y={228}
          width={wallThickness + 2}
          height={apertureWidth * 0.32}
          fill={accent}
          opacity="0.9"
        />
        <text
          x={left + 12}
          y={220}
          fill="rgba(237,243,247,0.7)"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
        >
          WWR {Math.round(recommendation.window_to_wall_ratio * 100)}%
        </text>

        {/* airflow */}
        <g color="#57A9E2" stroke="#57A9E2" fill="none" strokeWidth="1.5">
          <line x1="80" y1="245" x2={left - 12} y2="245" markerEnd="url(#tip)" />
          {isHot && (
            <>
              <line x1={left + 20} y1="245" x2={right - 24} y2="245" strokeDasharray="5 5" />
              <line x1={right + 12} y1="245" x2="560" y2="245" markerEnd="url(#tip)" />
            </>
          )}
        </g>
        <text x="66" y="234" fill="#57A9E2" fontSize="11" fontFamily="JetBrains Mono, monospace">
          {copy.air.toUpperCase()}
        </text>

        {/* heat flow */}
        <g color={accent} stroke={accent} fill="none" strokeWidth="1.5">
          {isHot ? (
            <>
              <line x1="320" y1={top - 12} x2="320" y2="120" markerEnd="url(#tip)" />
              <line x1="280" y1={top - 12} x2="280" y2="136" markerEnd="url(#tip)" />
              <line x1="360" y1={top - 12} x2="360" y2="136" markerEnd="url(#tip)" />
            </>
          ) : (
            <>
              <path d="M300,290 C300,255 340,255 340,290" strokeDasharray="4 4" />
              <line x1="320" y1="270" x2="320" y2="248" markerEnd="url(#tip)" />
            </>
          )}
        </g>
        <text
          x="248"
          y={isHot ? 108 : 348}
          fill={accent}
          fontSize="11"
          fontFamily="JetBrains Mono, monospace"
        >
          {copy.heat.toUpperCase()}
        </text>

        <text
          x={left + (right - left) / 2}
          y={bottom - 16}
          textAnchor="middle"
          fill="rgba(237,243,247,0.55)"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
        >
          {recommendation.insulation_mm}mm &middot; {recommendation.thermal_mass} mass
        </text>
      </svg>

      <p className="mt-4 max-w-reading text-sm text-paper-muted">{copy.caption}</p>
    </Section>
  );
}
