/**
 * The single place the frontend talks to the backend.
 * Every failure is normalised into { code, message } so components never
 * have to interpret a raw network error or an HTTP status.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export class ThermarchError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const FALLBACK_MESSAGES = {
  INVALID_LOCATION: "We couldn't find that location. Try a city, region, or country name.",
  WEATHER_API_ERROR: "Climate data is temporarily unavailable. Please try again.",
  WEATHER_API_TIMEOUT: "Climate data is temporarily unavailable. Please try again.",
  PYTHON_ENGINE_ERROR:
    "Thermal analysis couldn't be completed. The weather data was retrieved successfully, but the design engine failed.",
  PYTHON_ENGINE_TIMEOUT:
    "Thermal analysis couldn't be completed. The design engine did not respond in time.",
  INVALID_ENGINE_OUTPUT:
    "Thermal analysis couldn't be completed. The design engine returned an unreadable result.",
  NETWORK_ERROR:
    "Backend unavailable. Make sure the Thermarch server is running on port 5000.",
  INTERNAL_SERVER_ERROR: "Something went wrong on the Thermarch server.",
};

export function messageFor(code, fallback) {
  return FALLBACK_MESSAGES[code] || fallback || FALLBACK_MESSAGES.INTERNAL_SERVER_ERROR;
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new ThermarchError("NETWORK_ERROR", FALLBACK_MESSAGES.NETWORK_ERROR);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new ThermarchError("INVALID_ENGINE_OUTPUT", messageFor("INVALID_ENGINE_OUTPUT"));
  }

  if (!response.ok || payload.success !== true) {
    const code = payload?.error?.code || "INTERNAL_SERVER_ERROR";
    throw new ThermarchError(code, messageFor(code, payload?.error?.message));
  }

  return payload;
}

export function checkHealth() {
  return request("/api/health", { method: "GET" });
}

/**
 * @param {{ location?: string, latitude?: number, longitude?: number }} input
 */
export function simulate(input) {
  return request("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}
