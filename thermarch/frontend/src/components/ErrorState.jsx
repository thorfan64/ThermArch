import { AlertTriangle, RotateCcw } from "lucide-react";

const TITLES = {
  INVALID_LOCATION: "Location not found",
  WEATHER_API_ERROR: "Climate data unavailable",
  WEATHER_API_TIMEOUT: "Climate data unavailable",
  PYTHON_ENGINE_ERROR: "Thermal analysis incomplete",
  PYTHON_ENGINE_TIMEOUT: "Thermal analysis incomplete",
  INVALID_ENGINE_OUTPUT: "Thermal analysis incomplete",
  NETWORK_ERROR: "Backend unavailable",
};

export default function ErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="sheet border-thermal-hot/40 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-thermal-hot" aria-hidden="true" />
        <div>
          <p className="font-medium text-paper">{TITLES[error.code] || "Simulation failed"}</p>
          <p className="mt-1 max-w-reading text-sm text-paper-muted">{error.message}</p>
          {onRetry && (
            <button type="button" className="btn-ghost mt-4 px-4 py-2" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
