import { useId, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

const EXAMPLES = ["Chennai", "Ladakh", "Dubai", "London"];

export default function LocationInput({ onSubmit, loading }) {
  const [value, setValue] = useState("Chennai");
  const [advanced, setAdvanced] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [localError, setLocalError] = useState("");

  const inputId = useId();
  const latId = useId();
  const lonId = useId();

  function submit(event) {
    event.preventDefault();
    if (loading) return;

    if (advanced) {
      const latitude = Number(lat);
      const longitude = Number(lon);
      if (!lat.trim() || !lon.trim() || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        setLocalError("Enter both latitude and longitude as numbers.");
        return;
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        setLocalError("Latitude must be -90 to 90 and longitude -180 to 180.");
        return;
      }
      setLocalError("");
      onSubmit({ latitude, longitude });
      return;
    }

    if (!value.trim()) {
      setLocalError("Enter a city, region, or country name.");
      return;
    }
    setLocalError("");
    onSubmit({ location: value.trim() });
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="annot mb-2 block">
        Enter location
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-faint"
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="text"
            className="field pl-11"
            placeholder="Chennai"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={advanced || loading}
            autoComplete="off"
          />
        </div>
        <button type="submit" className="btn-primary sm:px-8" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze climate"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="annot mr-1">Try</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="border border-rule px-3 py-1.5 text-sm text-paper-muted transition-colors hover:border-paper/40 hover:text-paper"
            disabled={loading}
            onClick={() => {
              setAdvanced(false);
              setValue(example);
              onSubmit({ location: example });
            }}
          >
            {example}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 text-sm text-paper-faint transition-colors hover:text-paper"
        aria-expanded={advanced}
        onClick={() => {
          setAdvanced((previous) => !previous);
          setLocalError("");
        }}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        {advanced ? "Use a place name instead" : "Use coordinates instead"}
      </button>

      {advanced && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={latId} className="annot mb-2 block">
              Latitude
            </label>
            <input
              id={latId}
              className="field readout"
              inputMode="decimal"
              placeholder="13.08"
              value={lat}
              onChange={(event) => setLat(event.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor={lonId} className="annot mb-2 block">
              Longitude
            </label>
            <input
              id={lonId}
              className="field readout"
              inputMode="decimal"
              placeholder="80.27"
              value={lon}
              onChange={(event) => setLon(event.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      )}

      {localError && (
        <p role="alert" className="mt-3 text-sm text-thermal-hot">
          {localError}
        </p>
      )}
    </form>
  );
}
