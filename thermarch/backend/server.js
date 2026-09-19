/**
 * Thermarch API server
 * --------------------
 * Responsibilities, in order:
 *   1. validate the request
 *   2. resolve a location to coordinates (OpenWeatherMap geocoding)
 *   3. fetch current conditions (OpenWeatherMap weather)
 *   4. normalise that payload
 *   5. hand it to the Python thermal engine over argv
 *   6. return one stable JSON shape to the browser
 *
 * The frontend never learns how step 5 is implemented. Swapping engine.py for
 * EnergyPlus later means replacing runThermalEngine() and nothing else.
 */

const path = require("path");
const { spawn } = require("child_process");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const PORT = Number(process.env.PORT) || 5000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const PYTHON_COMMAND = process.env.PYTHON_COMMAND || "python";
const PYTHON_TIMEOUT_MS = Number(process.env.PYTHON_TIMEOUT_MS) || 10000;
const WEATHER_TIMEOUT_MS = Number(process.env.WEATHER_TIMEOUT_MS) || 8000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const ENGINE_PATH = path.join(__dirname, "engine.py");
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";
const REVERSE_GEO_URL = "https://api.openweathermap.org/geo/1.0/reverse";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const AIR_POLLUTION_URL = "https://api.openweathermap.org/data/2.5/air_pollution";

const app = express();

app.use(cors({ origin: FRONTEND_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json({ limit: "8kb" }));

/* -------------------------------------------------------------------------
 * error contract
 * ---------------------------------------------------------------------- */

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendError(res, error) {
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : "INTERNAL_SERVER_ERROR";
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong on the Thermarch server.";

  // Stack traces and upstream payloads stay on the server, never in the body.
  if (!(error instanceof ApiError)) console.error("[thermarch]", error);

  res.status(status).json({ success: false, error: { code, message } });
}

/* -------------------------------------------------------------------------
 * input validation
 * ---------------------------------------------------------------------- */

const LOCATION_PATTERN = /^[\p{L}\p{M}0-9 .,'\-()]{2,80}$/u;

function parseSimulationRequest(body) {
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "INVALID_LOCATION", "Send a JSON body containing a location.");
  }

  const { latitude, longitude, location } = body;

  // Advanced path: explicit coordinates win over the text field.
  if (latitude !== undefined && longitude !== undefined) {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new ApiError(400, "INVALID_LOCATION", "Latitude and longitude must be numbers.");
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new ApiError(400, "INVALID_LOCATION", "Coordinates are outside the valid range.");
    }
    return { mode: "coordinates", latitude: lat, longitude: lon };
  }

  if (typeof location !== "string" || !LOCATION_PATTERN.test(location.trim())) {
    throw new ApiError(400, "INVALID_LOCATION", "Enter a city, region, or country name.");
  }

  return { mode: "name", location: location.trim() };
}

/* -------------------------------------------------------------------------
 * OpenWeatherMap
 * ---------------------------------------------------------------------- */

function wrapUpstream(error, what) {
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    throw new ApiError(504, "WEATHER_API_TIMEOUT", `${what} timed out. Please try again.`);
  }
  if (error.response && error.response.status === 401) {
    throw new ApiError(502, "WEATHER_API_ERROR", "The weather service rejected the server credentials.");
  }
  throw new ApiError(502, "WEATHER_API_ERROR", "Climate data is temporarily unavailable.");
}

async function geocode(name) {
  let response;
  try {
    response = await axios.get(GEO_URL, {
      params: { q: name, limit: 1, appid: API_KEY },
      timeout: WEATHER_TIMEOUT_MS,
    });
  } catch (error) {
    wrapUpstream(error, "Location lookup");
  }

  const hit = Array.isArray(response.data) ? response.data[0] : null;
  if (!hit) {
    throw new ApiError(404, "INVALID_LOCATION", "We couldn't find that location.");
  }

  return {
    name: hit.name,
    state: hit.state || null,
    country: hit.country || null,
    latitude: hit.lat,
    longitude: hit.lon,
  };
}

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await axios.get(REVERSE_GEO_URL, {
      params: { lat: latitude, lon: longitude, limit: 1, appid: API_KEY },
      timeout: WEATHER_TIMEOUT_MS,
    });
    const hit = Array.isArray(response.data) ? response.data[0] : null;
    return {
      name: hit ? hit.name : `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      state: hit ? hit.state || null : null,
      country: hit ? hit.country || null : null,
      latitude,
      longitude,
    };
  } catch {
    // A missing place name must not abort a valid coordinate simulation.
    return {
      name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      state: null,
      country: null,
      latitude,
      longitude,
    };
  }
}

async function fetchWeather(latitude, longitude) {
  let response;
  try {
    response = await axios.get(WEATHER_URL, {
      params: { lat: latitude, lon: longitude, units: "metric", appid: API_KEY },
      timeout: WEATHER_TIMEOUT_MS,
    });
  } catch (error) {
    wrapUpstream(error, "Weather lookup");
  }

  const data = response.data || {};
  const main = data.main || {};
  const wind = data.wind || {};
  const weather = Array.isArray(data.weather) && data.weather[0] ? data.weather[0] : {};

  if (typeof main.temp !== "number") {
    throw new ApiError(502, "WEATHER_API_ERROR", "Climate data came back incomplete.");
  }

  return {
    temperature_c: Math.round(main.temp * 10) / 10,
    feels_like_c: typeof main.feels_like === "number" ? Math.round(main.feels_like * 10) / 10 : null,
    humidity_percent: typeof main.humidity === "number" ? main.humidity : 50,
    pressure_hpa: main.pressure ?? null,
    wind_speed_mps: typeof wind.speed === "number" ? Math.round(wind.speed * 10) / 10 : 0,
    wind_direction_deg: typeof wind.deg === "number" ? wind.deg : null,
    condition: weather.main || "Unknown",
    description: weather.description || "",
    icon: weather.icon || null,
    observed_at: data.dt ? new Date(data.dt * 1000).toISOString() : null,
  };
}

/* -------------------------------------------------------------------------
 * air quality (soft-fails: pollution data is supplementary, never blocks
 * the simulation if OpenWeatherMap's air pollution endpoint hiccups)
 * ---------------------------------------------------------------------- */

async function fetchAirQuality(latitude, longitude) {
  try {
    const response = await axios.get(AIR_POLLUTION_URL, {
      params: { lat: latitude, lon: longitude, appid: API_KEY },
      timeout: WEATHER_TIMEOUT_MS,
    });
    const entry = response.data?.list?.[0];
    const aqi = entry?.main?.aqi;
    if (![1, 2, 3, 4, 5].includes(aqi)) return { aqi_index: null, components: null };
    return { aqi_index: aqi, components: entry.components || null };
  } catch (error) {
    console.warn("[thermarch] air pollution lookup failed:", error.message);
    return { aqi_index: null, components: null };
  }
}

function dayOfYear(unixSeconds) {
  const date = unixSeconds ? new Date(unixSeconds * 1000) : new Date();
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / 86400000);
}

/* -------------------------------------------------------------------------
 * seasonal climate normals (Open-Meteo, free, no key)
 *
 * Classifying off one live reading is fragile - Delhi on a mild January
 * morning reads as "moderate" despite baking for half the year. This pulls
 * a full prior calendar year of daily history for the site, buckets it into
 * 12 months, and returns the hottest and coldest month as representative
 * summer/winter conditions.
 *
 * NOTE: Open-Meteo's exact daily field names have changed before and may
 * change again. This is written defensively - if the response shape doesn't
 * match what's expected below, or the request fails outright, it returns
 * { available: false } and the caller falls back to duplicating the live
 * reading for both seasons. Nothing crashes; climate_basis in the API
 * response tells you which path was taken.
 * ---------------------------------------------------------------------- */

const OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

function lastFullCalendarYear() {
  const year = new Date().getUTCFullYear() - 1;
  return { year, start: `${year}-01-01`, end: `${year}-12-31` };
}

function conditionFromNormals(monthMean) {
  // A coarse proxy since we only have monthly aggregates, not an hourly sky
  // condition history. Good enough to feed the UV cloud-attenuation model
  // and the reasoning text - not presented as a forecast.
  if (monthMean.precipitation_mm > 100) return "Rain";
  if (monthMean.humidity !== null && monthMean.humidity < 40) return "Clear";
  return "Clouds";
}

async function fetchClimateNormals(latitude, longitude) {
  const { year, start, end } = lastFullCalendarYear();

  try {
    const response = await axios.get(OPEN_METEO_ARCHIVE_URL, {
      params: {
        latitude,
        longitude,
        start_date: start,
        end_date: end,
        daily: [
          "temperature_2m_mean",
          "relative_humidity_2m_mean",
          "wind_speed_10m_max",
          "precipitation_sum",
        ].join(","),
        wind_speed_unit: "ms",
        timezone: "auto",
      },
      timeout: WEATHER_TIMEOUT_MS * 3, // a year of daily data is a larger payload
    });

    const daily = response.data?.daily;
    const dates = daily?.time;
    if (!Array.isArray(dates) || dates.length < 300) {
      throw new Error("incomplete or missing daily series");
    }

    const months = Array.from({ length: 12 }, () => ({
      tempSum: 0, tempCount: 0,
      humiditySum: 0, humidityCount: 0,
      windMax: 0,
      precipSum: 0,
    }));

    dates.forEach((dateStr, i) => {
      const monthIndex = new Date(`${dateStr}T00:00:00Z`).getUTCMonth();
      const bucket = months[monthIndex];
      const t = daily.temperature_2m_mean?.[i];
      const h = daily.relative_humidity_2m_mean?.[i];
      const w = daily.wind_speed_10m_max?.[i];
      const p = daily.precipitation_sum?.[i];
      if (typeof t === "number") { bucket.tempSum += t; bucket.tempCount += 1; }
      if (typeof h === "number") { bucket.humiditySum += h; bucket.humidityCount += 1; }
      if (typeof w === "number") bucket.windMax = Math.max(bucket.windMax, w);
      if (typeof p === "number") bucket.precipSum += p;
    });

    const monthly = months.map((bucket, index) => {
      if (bucket.tempCount === 0) return null;
      return {
        month: index + 1,
        temperature: Math.round((bucket.tempSum / bucket.tempCount) * 10) / 10,
        humidity: bucket.humidityCount > 0
          ? Math.round(bucket.humiditySum / bucket.humidityCount)
          : null,
        wind_speed: Math.round(bucket.windMax * 10) / 10,
        precipitation_mm: Math.round(bucket.precipSum),
      };
    });

    if (monthly.some((m) => m === null) || monthly.some((m) => m.humidity === null)) {
      throw new Error("incomplete monthly coverage (missing temperature or humidity)");
    }

    const hottest = monthly.reduce((a, b) => (b.temperature > a.temperature ? b : a));
    const coldest = monthly.reduce((a, b) => (b.temperature < a.temperature ? b : a));

    return {
      available: true,
      period: String(year),
      summer: { ...hottest, condition: conditionFromNormals(hottest) },
      winter: { ...coldest, condition: conditionFromNormals(coldest) },
    };
  } catch (error) {
    console.warn("[thermarch] climate normals fetch failed, falling back to live reading:", error.message);
    return { available: false };
  }
}

/* -------------------------------------------------------------------------
 * thermal engine interface
 * ---------------------------------------------------------------------- */

function runThermalEngine(weather, site, air, normals) {
  return new Promise((resolve, reject) => {
    const currentDayOfYear = dayOfYear(
      weather.observed_at ? Date.parse(weather.observed_at) / 1000 : null
    );

    const seasonFrom = (monthData) => ({
      temperature: monthData.temperature,
      humidity: monthData.humidity,
      wind_speed: monthData.wind_speed,
      condition: monthData.condition,
      day_of_year: dayOfYear(Date.UTC(
        Number(normals.period), monthData.month - 1, 15
      ) / 1000),
      aqi_index: air.aqi_index ?? -1, // known limitation: seasonal AQI
      // history isn't wired up yet, so the current live reading is applied
      // to both seasons - see README "Air quality and UV exposure".
    });

    const payload = normals.available
      ? {
          current: {
            temperature: weather.temperature_c,
            humidity: weather.humidity_percent,
            wind_speed: weather.wind_speed_mps,
            condition: weather.condition,
            observed_at: weather.observed_at,
            aqi_index: air.aqi_index ?? -1,
          },
          summer: seasonFrom(normals.summer),
          winter: seasonFrom(normals.winter),
          site: { latitude: site.latitude, longitude: site.longitude, country: site.country || "" },
          climate_basis: "annual_normal",
          normal_period: normals.period,
        }
      : {
          // fallback: no reliable historical data, duplicate the live
          // reading into both seasonal slots so the engine still runs -
          // the API response's climate_basis flags this honestly.
          current: {
            temperature: weather.temperature_c,
            humidity: weather.humidity_percent,
            wind_speed: weather.wind_speed_mps,
            condition: weather.condition,
            observed_at: weather.observed_at,
            aqi_index: air.aqi_index ?? -1,
          },
          summer: {
            temperature: weather.temperature_c, humidity: weather.humidity_percent,
            wind_speed: weather.wind_speed_mps, condition: weather.condition,
            day_of_year: currentDayOfYear, aqi_index: air.aqi_index ?? -1,
          },
          winter: {
            temperature: weather.temperature_c, humidity: weather.humidity_percent,
            wind_speed: weather.wind_speed_mps, condition: weather.condition,
            day_of_year: currentDayOfYear, aqi_index: air.aqi_index ?? -1,
          },
          site: { latitude: site.latitude, longitude: site.longitude, country: site.country || "" },
          climate_basis: "live_reading_fallback",
          normal_period: null,
        };

    // Single JSON argument, still array-form spawn - no shell, no
    // interpolation risk, and no positional-argument ordering to get wrong.
    const args = [ENGINE_PATH, JSON.stringify(payload)];

    let child;
    try {
      child = spawn(PYTHON_COMMAND, args, { shell: false, windowsHide: true });
    } catch {
      reject(new ApiError(500, "PYTHON_ENGINE_ERROR", "The design engine could not be started."));
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(reject, new ApiError(504, "PYTHON_ENGINE_TIMEOUT", "Thermal analysis took too long."));
    }, PYTHON_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      console.error("[thermarch] spawn failed:", err.message);
      finish(
        reject,
        new ApiError(
          500,
          "PYTHON_ENGINE_ERROR",
          "The design engine could not be started. Check PYTHON_COMMAND on the server."
        )
      );
    });

    child.on("close", (code) => {
      if (stderr.trim()) console.error("[thermarch] engine stderr:", stderr.trim());

      const raw = stdout.trim();
      if (!raw) {
        finish(
          reject,
          new ApiError(502, "INVALID_ENGINE_OUTPUT", "The design engine returned no output.")
        );
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        finish(
          reject,
          new ApiError(502, "INVALID_ENGINE_OUTPUT", "The design engine returned unreadable output.")
        );
        return;
      }

      if (parsed.success !== true) {
        const message =
          parsed.error && parsed.error.message
            ? parsed.error.message
            : "Thermal analysis couldn't be completed.";
        finish(reject, new ApiError(502, "PYTHON_ENGINE_ERROR", message));
        return;
      }

      if (code !== 0) {
        finish(
          reject,
          new ApiError(502, "PYTHON_ENGINE_ERROR", "The design engine exited unexpectedly.")
        );
        return;
      }

      finish(resolve, parsed);
    });
  });
}

/* -------------------------------------------------------------------------
 * routes
 * ---------------------------------------------------------------------- */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "thermarch-api",
    version: "1.0.0",
    engine: "Thermarch Rule Engine v2",
    weather_key_configured: Boolean(API_KEY),
    python_command: PYTHON_COMMAND,
    uptime_seconds: Math.round(process.uptime()),
  });
});

app.post("/api/simulate", async (req, res) => {
  try {
    if (!API_KEY) {
      throw new ApiError(
        500,
        "WEATHER_API_ERROR",
        "The server has no weather API key configured."
      );
    }

    const request = parseSimulationRequest(req.body);
    const site =
      request.mode === "coordinates"
        ? await reverseGeocode(request.latitude, request.longitude)
        : await geocode(request.location);

    const weather = await fetchWeather(site.latitude, site.longitude);
    const air = await fetchAirQuality(site.latitude, site.longitude);
    const normals = await fetchClimateNormals(site.latitude, site.longitude);
    const engine = await runThermalEngine(weather, site, air, normals);

    res.json({
      success: true,
      engine: engine.engine,
      method: engine.method,
      location: {
        name: site.name,
        state: site.state,
        country: site.country,
        latitude: Math.round(site.latitude * 10000) / 10000,
        longitude: Math.round(site.longitude * 10000) / 10000,
      },
      weather,
      climate_basis: engine.climate_basis,
      normal_period: engine.normal_period,
      design_strategy: engine.design_strategy,
      design_strategy_note: engine.design_strategy_note,
      climate: { ...engine.climate, pollutants: air.components },
      recommendation: engine.recommendation,
      reasoning: engine.reasoning,
      explanations: engine.explanations,
      heuristic_profile: engine.heuristic_profile,
      site_adaptation: engine.site_adaptation,
      emissions: engine.emissions,
      winter_design: engine.winter_design,
      emissions_annualised: engine.emissions_annualised,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.use((req, res) => {
  sendError(res, new ApiError(404, "NOT_FOUND", "That endpoint does not exist."));
});

// Express error handler, e.g. malformed JSON bodies.
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError) {
    sendError(res, new ApiError(400, "INVALID_LOCATION", "The request body was not valid JSON."));
    return;
  }
  sendError(res, error);
});

app.listen(PORT, () => {
  console.log(`Thermarch API listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
  console.log(`Python command: ${PYTHON_COMMAND}`);
  if (!API_KEY) console.warn("WARNING: OPENWEATHER_API_KEY is not set in backend/.env");
});

process.on("unhandledRejection", (reason) => {
  console.error("[thermarch] unhandled rejection:", reason);
});
