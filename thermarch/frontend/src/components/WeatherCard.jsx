import { Thermometer, Droplets, Wind, CloudSun, MapPin, Wind as AirIcon, Sun } from "lucide-react";
import Section from "./Section";
import { placeLabel, coordLabel, temperatureColor, aqiColor, uvColor } from "../utils/format";

function Reading({ icon: Icon, label, value, accent }) {
  return (
    <div className="border-l border-rule pl-4">
      <div className="annot flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <p
        className="readout mt-2 text-2xl font-medium sm:text-3xl"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export default function WeatherCard({ location, weather, climate }) {
  return (
    <Section title="Thermal site profile" note={weather.description || weather.condition} ticked>
      <div className="mb-6 flex items-center gap-2 text-lg font-medium">
        <MapPin className="h-4 w-4 text-thermal-warm" aria-hidden="true" />
        {placeLabel(location)}
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <Reading
          icon={Thermometer}
          label="Temperature"
          value={`${weather.temperature_c}\u00B0C`}
          accent={temperatureColor(weather.temperature_c)}
        />
        <Reading icon={Droplets} label="Humidity" value={`${weather.humidity_percent}%`} />
        <Reading icon={Wind} label="Wind" value={`${weather.wind_speed_mps} m/s`} />
        <Reading icon={CloudSun} label="Condition" value={weather.condition} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 border-t border-rule pt-6 lg:grid-cols-4">
        <Reading
          icon={AirIcon}
          label="Air quality"
          value={climate.aqi_category || "Unavailable"}
          accent={climate.aqi_index ? aqiColor(climate.aqi_index) : undefined}
        />
        <Reading
          icon={Sun}
          label="UV index (est.)"
          value={`${climate.uv_index} \u00B7 ${climate.uv_category}`}
          accent={uvColor(climate.uv_category)}
        />
      </div>

      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 border-t border-rule pt-4">
        <div className="flex gap-2">
          <dt className="annot">Coordinates</dt>
          <dd className="readout text-sm text-paper-muted">{coordLabel(location)}</dd>
        </div>
        {weather.feels_like_c !== null && (
          <div className="flex gap-2">
            <dt className="annot">Feels like</dt>
            <dd className="readout text-sm text-paper-muted">{weather.feels_like_c}&deg;C</dd>
          </div>
        )}
        {weather.observed_at && (
          <div className="flex gap-2">
            <dt className="annot">Observed</dt>
            <dd className="readout text-sm text-paper-muted">
              {new Date(weather.observed_at).toLocaleString()}
            </dd>
          </div>
        )}
      </dl>
      <p className="annot mt-3">UV index is a clear-sky estimate from latitude, date, and cloud cover &mdash; not a measured reading.</p>
    </Section>
  );
}
