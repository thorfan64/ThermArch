import { STAGES } from "../hooks/useSimulation";

/**
 * Reflects the real request lifecycle. No percentage is shown, because the
 * backend cannot report one honestly.
 */
export default function LoadingStages({ stageIndex }) {
  return (
    <ul className="space-y-3" aria-live="polite">
      {STAGES.map((stage, index) => {
        const done = index < stageIndex;
        const active = index === stageIndex;
        return (
          <li key={stage.key} className="flex items-center gap-3 text-sm">
            <span
              className={`readout w-4 text-center ${
                done ? "text-thermal-mild" : active ? "text-thermal-warm" : "text-paper-faint"
              }`}
              aria-hidden="true"
            >
              {done ? "\u2713" : active ? "\u25C9" : "\u25CB"}
            </span>
            <span className={done || active ? "text-paper" : "text-paper-faint"}>
              {stage.label}
              {active && <span className="sr-only"> in progress</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
