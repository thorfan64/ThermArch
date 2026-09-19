import { CalendarClock, AlertTriangle } from "lucide-react";
import Section from "./Section";

export default function ClimateBasisBanner({ climateBasis, normalPeriod, designStrategy, designStrategyNote }) {
  const isNormal = climateBasis === "annual_normal";

  return (
    <Section ticked>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-thermal-warm" aria-hidden="true" />
          <div>
            <p className="annot mb-1">Design basis</p>
            <p className="text-sm text-paper">
              {isNormal ? (
                <>
                  Representative hottest and coldest months from{" "}
                  <span className="readout">{normalPeriod}</span> daily
                  history, not a single live reading.
                </>
              ) : (
                "Historical climate data was unavailable for this site - both seasons use the current live reading as a fallback."
              )}
            </p>
          </div>
        </div>

        {!isNormal && (
          <div className="flex items-start gap-2 border border-thermal-warm/40 px-3 py-2 text-xs text-thermal-warm sm:max-w-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Treat this result as provisional - it reflects one moment, not
              the site&rsquo;s climate.
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-rule pt-4">
        <p className="annot mb-1">
          {designStrategy === "seasonal_adaptive" ? "Seasonally adaptive design needed" : "One fixed design suffices"}
        </p>
        <p className="max-w-reading text-sm leading-relaxed text-paper-muted">{designStrategyNote}</p>
      </div>
    </Section>
  );
}
