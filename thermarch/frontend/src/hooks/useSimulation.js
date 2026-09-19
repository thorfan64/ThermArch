import { useCallback, useState } from "react";
import { simulate, ThermarchError, messageFor } from "../services/api";

/**
 * Owns one simulation lifecycle: idle -> running -> result | error.
 * `stage` tracks which pipeline step the request has actually reached, so the
 * loading UI reflects real state instead of a fake progress bar.
 */
export const STAGES = [
  { key: "locate", label: "Locating site" },
  { key: "weather", label: "Fetching environmental conditions" },
  { key: "thermal", label: "Analyzing thermal conditions" },
  { key: "parameters", label: "Generating architectural parameters" },
  { key: "report", label: "Preparing design report" },
];

export function useSimulation() {
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(async (input) => {
    setLoading(true);
    setError(null);
    setStageIndex(0);

    // The backend performs geocoding then weather then engine in sequence.
    // We advance the visible stage as each network phase begins; the final
    // two stages resolve together when the engine response lands.
    const advance = setTimeout(() => setStageIndex(1), 250);
    const advanceAgain = setTimeout(() => setStageIndex(2), 900);

    try {
      const payload = await simulate(input);
      setStageIndex(4);
      setResult(payload);
      return payload;
    } catch (err) {
      const code = err instanceof ThermarchError ? err.code : "INTERNAL_SERVER_ERROR";
      setError({ code, message: messageFor(code, err.message) });
      setResult(null);
      return null;
    } finally {
      clearTimeout(advance);
      clearTimeout(advanceAgain);
      setLoading(false);
      setStageIndex(-1);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { loading, stageIndex, result, error, run, reset };
}
