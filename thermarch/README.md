# Thermarch

**Thermarch is a climate-aware parametric architectural recommendation engine that converts local environmental conditions into explainable passive-building design parameters.**

You enter a location. Thermarch pulls current environmental conditions, classifies the thermal regime, and returns a set of passive-design parameters — geometry, orientation, window-to-wall ratio, roof strategy, wall material, insulation, thermal mass, shading and ventilation — together with the reasoning that produced each one.

---

## 1. Architecture

```
Browser (React + Vite)
        │  POST /api/simulate  { "location": "Chennai" }
        ▼
Express API (Node.js)
        ├── OpenWeatherMap geocoding      → latitude, longitude
        ├── OpenWeatherMap current weather → temperature, humidity, wind, condition
        └── Thermal Engine Interface
                 │  child_process.spawn (argv, no shell)
                 ▼
            engine.py  →  JSON on stdout
        ▲
        │  one normalised JSON response
        ▼
Results dashboard
```

The frontend never learns how the thermal calculation is performed. It only
knows the REST contract. Replacing `engine.py` with a solar-radiation model, an
optimiser, or EnergyPlus means rewriting `runThermalEngine()` in `server.js`
and nothing else.

### Folder structure

```
thermarch/
├── backend/
│   ├── server.js          Express API, weather ingestion, engine interface
│   ├── engine.py          deterministic rule-based decision matrix
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── services/api.js
│       ├── hooks/useSimulation.js
│       ├── utils/format.js
│       └── components/
│           ├── Header.jsx           Hero.jsx            Section.jsx
│           ├── LocationInput.jsx    LoadingStages.jsx   ErrorState.jsx
│           ├── WeatherCard.jsx      ClimateCard.jsx
│           ├── RecommendationPanel.jsx  ReasoningPanel.jsx
│           ├── ParameterPanel.jsx   ScorecardPanel.jsx
│           ├── ComparisonPanel.jsx  ThermalVisualization.jsx
│           └── HowItWorks.jsx
├── README.md
└── .gitignore
```

Two files were added beyond the original spec list, and one was dropped:

- `ScorecardPanel.jsx` — the passive performance profile was a distinct panel with
  its own labelling requirements, so it is not folded into `RecommendationPanel`.
- `Section.jsx`, `Hero.jsx`, `LoadingStages.jsx`, `ErrorState.jsx`, `HowItWorks.jsx` —
  shared shell pieces, kept separate so no component grew past a screenful.
- `src/pages/` is unused. With one route, a pages directory would be ceremony.

---

## 2. Prerequisites

- Node.js 18 or newer
- Python 3.9 or newer
- A free OpenWeatherMap API key: https://home.openweathermap.org/api_keys

Verify on Windows 11 (PowerShell):

```powershell
node --version
npm --version
python --version
```

If `python --version` opens the Microsoft Store or fails, use the Python
launcher instead and set `PYTHON_COMMAND=py` in `backend/.env`.

---

## 3. Installation

### Backend

```powershell
cd backend
npm install
```

If you are starting from an empty folder instead of this repo:

```powershell
npm init -y
npm install express axios cors dotenv
```

### Frontend

```powershell
cd frontend
npm install
```

From scratch:

```powershell
npm create vite@latest . -- --template react
npm install
npm install lucide-react recharts
npm install -D tailwindcss postcss autoprefixer
```

---

## 4. Environment configuration

Copy `backend/.env.example` to `backend/.env`:

```powershell
cd backend
Copy-Item .env.example .env
```

Then fill it in:

```env
OPENWEATHER_API_KEY=your_key_here
PORT=5000
PYTHON_COMMAND=python
PYTHON_TIMEOUT_MS=10000
WEATHER_TIMEOUT_MS=8000
FRONTEND_ORIGIN=http://localhost:5173
```

`.env` is gitignored. The key is only ever read by the Node process — it is
never sent to the browser.

---

## 5. Running

Two terminals.

```powershell
cd backend
node server.js
```

```powershell
cd frontend
npm run dev
```

| Service  | URL                    |
| -------- | ---------------------- |
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:5000  |

---

## 6. API

### `GET /api/health`

```json
{
  "success": true,
  "service": "thermarch-api",
  "version": "1.0.0",
  "engine": "Thermarch Rule Engine v1",
  "weather_key_configured": true,
  "python_command": "python",
  "uptime_seconds": 42
}
```

### `POST /api/simulate`

Request — either form:

```json
{ "location": "Chennai" }
```

```json
{ "latitude": 13.08, "longitude": 80.27 }
```

Response (abbreviated):

```json
{
  "success": true,
  "engine": "Thermarch Rule Engine v1",
  "method": "rule_based_recommendation",
  "location": { "name": "Chennai", "state": "Tamil Nadu", "country": "IN",
                "latitude": 13.0878, "longitude": 80.2785 },
  "weather": { "temperature_c": 32, "humidity_percent": 74,
               "wind_speed_mps": 4.2, "condition": "Clear" },
  "climate": { "classification": "hot_humid", "label": "HOT / HUMID",
               "summary": "…", "severity": "high" },
  "recommendation": {
    "building_shape": "ventilation_oriented",
    "orientation_deg": 30,
    "window_to_wall_ratio": 0.28,
    "wall_material": "hollow_clay_brick",
    "insulation_mm": 50,
    "thermal_mass": "low",
    "roof_strategy": "reflective_ventilated_roof",
    "roof_overhang_m": 1.1,
    "ventilation_strategy": "cross_ventilation",
    "ventilation_filtration": "standard_intake_acceptable",
    "shading_strategy": "deep_external_shading",
    "facade_uv_treatment": "uv_protective_glazing",
    "thermal_strategy": "heat_rejection"
  },
  "reasoning": ["High humidity increases the importance of air movement.", "…"],
  "explanations": [
    { "parameter": "window_to_wall_ratio",
      "question": "Why 28% window-to-wall ratio?",
      "drivers": ["Temperature: 32 C", "Humidity: 74 %", "Solar heat gain risk: HIGH"],
      "implications": ["excessive glazing can increase heat gain", "…"] }
  ],
  "heuristic_profile": { "heat_retention": 5, "solar_protection": 90,
                         "ventilation": 77, "thermal_mass": 13,
                         "glazing_efficiency": 80 },
  "site_adaptation": ["If the plot cannot be rotated into the prevailing wind, …", "…"],
  "emissions": { "co2_avoided_kg_per_m2_year": 26.9, "reduction_percent": 31.6, "…": "see §10" }
}
```

`explanations` is an addition to the spec's contract. The spec asked that the
"Why this design?" panel be generated from engine logic rather than hardcoded
in the frontend, which needs structure (drivers and implications per
parameter) that a flat string array cannot carry. `reasoning` is still present
and unchanged.

### Error contract

Every failure, at every layer:

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

| Code                    | Meaning                                       | HTTP |
| ----------------------- | --------------------------------------------- | ---- |
| `INVALID_LOCATION`      | Empty, malformed, or unresolvable location     | 400/404 |
| `WEATHER_API_ERROR`     | OpenWeatherMap unreachable or rejected the key | 502  |
| `WEATHER_API_TIMEOUT`   | OpenWeatherMap did not answer in time          | 504  |
| `PYTHON_ENGINE_ERROR`   | Engine failed to start or reported a failure   | 500/502 |
| `PYTHON_ENGINE_TIMEOUT` | Engine exceeded `PYTHON_TIMEOUT_MS`            | 504  |
| `INVALID_ENGINE_OUTPUT` | Engine produced empty or unparseable stdout    | 502  |
| `NOT_FOUND`             | Unknown endpoint                               | 404  |
| `INTERNAL_SERVER_ERROR` | Anything else                                  | 500  |

Stack traces and upstream payloads stay in the server log.

---

## 7. The Python engine

`engine.py` takes six positional arguments and writes exactly one JSON object
to stdout:

```
engine.py <temperature> <humidity> <wind_speed> <condition> <latitude> <longitude>
```

### Classification

```python
if temperature < 10:                           climate = "cold"
elif temperature >= 30 and humidity >= 60:     climate = "hot_humid"
elif temperature >= 30:                        climate = "hot_dry"
elif temperature >= 24 and humidity >= 70:     climate = "hot_humid"
else:                                          climate = "moderate"
```

### Derived parameters

| Parameter | Rule |
| --------- | ---- |
| Window-to-wall ratio | class baseline (cold 0.35 / moderate 0.30 / hot-dry 0.20 / hot-humid 0.28), +0.02 when humid ≥ 75, −0.04 above 38 °C, −0.05 below 0 °C, clamped 0.15–0.40 |
| Insulation | cold: `100 + (10 − T) × 4`; hot-dry 75; hot-humid 50; moderate 60; clamped 40–250, rounded to 5 mm |
| Orientation | 0° cold, 10° hot-dry, 15° hot-humid (30° when wind ≥ 4 m/s), 5° moderate; mirrored in the southern hemisphere |
| Roof overhang | `0.3 + solar_protection / 100 × 0.9`, clamped 0.3–1.2 m |
| Thermal mass | high for hot-dry and cold, low for hot-humid, medium otherwise |
| Ventilation | cross / stack-assisted / night-purge / heat-recovery, chosen from class, wind speed and humidity |

### Heuristic profile

The five indicators are computed from the inputs, not stored per climate class:

```
solar_protection = 50 + (T − 20) × 2.5 + 10 if the sky is clear
ventilation      = 40 + (RH − 50) × 0.6 + (T − 22) × 2.0 + (wind − 3) × 2.0
heat_retention   = 95 − (T − 2) × 3.0
thermal_mass     = 100 − RH × 0.9  (+15 cold, −20 hot-humid)
glazing          = 95 − |T − 22| × 1.2 − max(0, RH − 60) × 0.2
```

All clamped to a 0–100 band. The same input always produces the same output —
nothing in the engine is random or time-dependent.

### Engine failures

On bad arguments or an unhandled exception the engine writes
`{"success": false, "error": {...}}` to stdout and exits with code 2. Node
parses that, maps it to `PYTHON_ENGINE_ERROR`, and keeps running.

---

## 8. API testing (PowerShell)

Health:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method GET
```

Simulation:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:5000/api/simulate" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"location":"Chennai"}'
```

**First thing to check on this response: `climate_basis`.** It should read
`annual_normal`. If it reads `live_reading_fallback` instead, the Open-Meteo
integration didn't work this run — check the backend terminal for a
`[thermarch] climate normals fetch failed` warning, which names the actual
reason, and see README §10 for the known-limitations note on this.

Delhi is the sharpest test of the new seasonal logic — it should come back
`"design_strategy": "seasonal_adaptive"`, with `climate.label` (summer)
reading hot/dry-ish and `winter_design.climate.label` reading COLD:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/simulate" -Method POST `
  -ContentType "application/json" -Body '{"location":"Delhi"}' |
  Select-Object climate_basis, design_strategy, design_strategy_note
```

All four demo climates:

```powershell
"Chennai","Ladakh","Dubai","London" | ForEach-Object {
  $r = Invoke-RestMethod -Uri "http://localhost:5000/api/simulate" -Method POST `
       -ContentType "application/json" -Body (@{ location = $_ } | ConvertTo-Json)
  "{0,-10} {1,-12} {2}C  WWR {3}  insulation {4}mm" -f `
    $_, $r.climate.classification, $r.weather.temperature_c,
    $r.recommendation.window_to_wall_ratio, $r.recommendation.insulation_mm
}
```

Coordinates:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/simulate" -Method POST `
  -ContentType "application/json" -Body '{"latitude":13.08,"longitude":80.27}'
```

Deliberate failures:

```powershell
# INVALID_LOCATION
Invoke-RestMethod -Uri "http://localhost:5000/api/simulate" -Method POST `
  -ContentType "application/json" -Body '{"location":"zzzzzzzz"}'

# engine independence: rename engine.py, then simulate — expect PYTHON_ENGINE_ERROR,
# and confirm the Node process is still alive afterwards.
```

You can also call the engine on its own, without the server:

```powershell
cd backend
python engine.py 32 74 4.2 Clear 13.08 80.27
python engine.py -5 35 2.1 Snow 34.15 77.57
```

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Backend unavailable` in the browser | Node is not running | Start `node server.js` in `backend/` |
| CORS error in the console | Vite picked a different port | Set `FRONTEND_ORIGIN` to the port Vite printed, restart Node |
| `PYTHON_ENGINE_ERROR` immediately | `python` is not on PATH | Set `PYTHON_COMMAND=py` in `.env` |
| `WEATHER_API_ERROR` on every request | Missing or unactivated key | Check `.env`; new OpenWeatherMap keys can take up to two hours to activate |
| `INVALID_LOCATION` for a valid place | Geocoder needs disambiguation | Add region or country: `Ladakh, IN` |
| Blank page, no errors | Frontend deps not installed | `npm install` in `frontend/` |
| Tailwind classes have no effect | PostCSS config not picked up | Confirm `postcss.config.js` and `tailwind.config.js` sit in `frontend/` |

---

## 10. Seasonal climate normals (v2)

The single biggest fragility in v1: classifying climate off whatever the
weather happened to be doing at request time. A mild January morning in
Delhi would read as "moderate" — hiding a summer that hits 45°C and a winter
that chokes on smog under one instant reading. Worse, two very different
cities landing in the same climate bucket at the moment you happened to run
the demo could get an identical recommendation, which isn't defensible in
front of anyone who actually designs buildings.

**What changed:** `server.js` now pulls a full prior calendar year of daily
history for the site from **Open-Meteo's free Archive API**
(`archive-api.open-meteo.com`, no key, no signup), buckets it into 12
months, and identifies the hottest and coldest month by mean temperature.
The engine runs its entire decision matrix **twice** — once per season —
and compares the results:

- **Same climate bucket both seasons** → `design_strategy: "fixed_design"`.
  One recommendation reasonably serves the whole year (Chennai: hot-humid
  in June, hot-humid in January).
- **Different buckets** → `design_strategy: "seasonal_adaptive"`. The API
  returns both seasonal designs plus a note explaining that a single fixed
  geometry would under-serve one season (Delhi: hot-dry summer, cold
  winter — the tool now says so instead of quietly picking one).

The live weather reading didn't go away — it's still shown as
`current_conditions`, clearly separated from the design basis, so the UI
can honestly say "here's what it's like right now" and "here's what we
designed for" as two different things.

### The engine's contract changed

`engine.py` no longer takes positional arguments — at 9 positional values it
was already past the point of being sane, and carrying two full seasons
plus site metadata made a rewrite the right call:

```
engine.py '<one JSON-encoded argument>'
```

See the docstring on `run()` in `engine.py` for the exact shape. Still
spawned as an array (`shell: false`) — a single JSON string has no
shell-interpolation risk and no argument-ordering to get wrong.

### Known limitations — read before you present this

- **The Open-Meteo integration could not be tested against a live network
  call while building this** (no internet access in the build
  environment). Field names used
  (`temperature_2m_mean`, `relative_humidity_2m_mean`,
  `wind_speed_10m_max`, `precipitation_sum`) are believed correct as of my
  knowledge cutoff, but third-party APIs change. **Run it once locally and
  check `climate_basis` in the response.** `"annual_normal"` means it
  worked. `"live_reading_fallback"` even with working internet means check
  the backend terminal for a line starting `[thermarch] climate normals
  fetch failed` — that message names the actual problem and the field
  mapping can be fixed from it directly.
- **AQI is still current-reading-only, applied to both seasons.** Seasonal
  AQI history (Delhi's winter smog is measurably worse than its summer AQI)
  is a real, known gap — deliberately not closed in this pass to avoid
  stacking two unverified live integrations at once.
- **Two representative months stand in for twelve.** `emissions_annualised`
  is a simple average of the summer and winter estimates, not a proper
  monthly-weighted annual integral — labelled as such in its `basis` field.

---

## 11. Site constraints and emissions estimate

Two additions since v1, made in direct response to review feedback.

### The same climate can mean different plots

Thermarch classifies by climate, not by site. Two cities in the same climate
class will always receive the same recommendation, because the engine has no
input describing plot geometry, frontage orientation, adjacent buildings,
local material availability, or budget — those are architectural-drawing
concerns, not climate concerns, and out of scope for a rule engine.

Rather than pretend to solve that, each result now includes an explicit
**"if this exact design cannot be built here"** note (`site_adaptation` in the
API response), generated per climate class in `engine.py`. It states which
parameter to protect first if a constraint forces a compromise — e.g. in a
hot-humid climate, if the plot can't be rotated into the prevailing wind, keep
the window placement aligned with airflow even if the building's long axis
can't be. This doesn't make the tool site-aware; it makes the tool honest
about what it can and can't decide, and gives a designer something concrete
to do when the ideal answer isn't buildable.

### "Avoided," not "reduced"

Thermarch does not reduce emissions from an existing building — it estimates
the operational HVAC emissions a **new** building would avoid annually,
compared to a **conventional baseline** built without these passive
strategies in the same climate. The `emissions` field in the API response
makes this a real number instead of a claim:

```json
"emissions": {
  "grid_country": "IN",
  "grid_factor_kg_co2_per_kwh": 0.71,
  "baseline_energy_kwh_per_m2_year": 120.0,
  "optimized_energy_kwh_per_m2_year": 82.1,
  "energy_avoided_kwh_per_m2_year": 37.9,
  "reduction_percent": 31.6,
  "baseline_co2_kg_per_m2_year": 85.2,
  "optimized_co2_kg_per_m2_year": 58.3,
  "co2_avoided_kg_per_m2_year": 26.9,
  "basis": "Benchmark-based estimate…"
}
```

**Method** (all in `engine.py`, fully deterministic, no external calls):

1. Start from a published-benchmark annual HVAC energy intensity for a
   *conventional* building in the climate class (`BASELINE_EUI_KWH_M2`) — e.g.
   120 kWh/m²/yr for hot-humid.
2. Apply an independent reduction factor for each strategy Thermarch actually
   recommended — shading, ventilation, insulation thickness vs a 25mm
   baseline, window-to-wall ratio vs a 0.40 baseline, and thermal mass —
   combined multiplicatively (as independent avoided-load probabilities) so
   overlapping strategies don't double-count, capped at 55% combined.
3. Convert the avoided energy to CO₂ using a grid emission factor
   (`GRID_FACTOR_KG_CO2_PER_KWH`), looked up by the site's country code, or a
   ~0.48 kg CO₂/kWh global average if the country isn't in the small lookup
   table.

The frontend (`EmissionsPanel.jsx`) shows baseline vs. optimized energy and
CO₂ side by side, lets you scale by floor area, and translates the yearly
total into trees'-worth of absorption and equivalent car-km avoided — clearly
separated as illustrative equivalents, not part of the estimate itself.

**This is explicitly not** a certified carbon audit, a metered result, or an
EnergyPlus-grade simulation. Every constant it depends on
(`BASELINE_EUI_KWH_M2`, the per-strategy reduction percentages, the grid
factors) is named in `engine.py` specifically so it can be swapped for a
local building-energy-code benchmark or a metered figure before anyone treats
the number as more than a design-stage indicator. Say this out loud in a
demo — reviewers respect a tool that states its own limits more than one that
doesn't have any labelled.

---

## 12. Air quality and UV exposure

Two more environmental layers, added on top of the thermal recommendation
rather than mixed into climate classification — they answer a different
question ("is the outdoor air safe to bring in?", "will UV degrade the
facade?") than temperature and humidity do.

### Air quality (measured)

Real data from OpenWeatherMap's free Air Pollution API
(`/data/2.5/air_pollution`), using the same key you already have. Returns an
index from 1 (Good) to 5 (Very Poor). When the index is 4 or 5, Thermarch adds
a `ventilation_filtration` recommendation on top of the existing ventilation
strategy — it doesn't replace cross-ventilation or night-purge, it says
*filter what comes through it*. This lookup fails soft: if the endpoint is
unreachable, `aqi_index` comes back `null` and the recommendation reads "Air
quality data unavailable" rather than blocking the whole simulation.

### UV index (estimated, not measured)

There's no free, no-signup real-time UV API. Rather than depend on a paid
subscription (OpenWeatherMap's One Call 3.0) that could break your demo if
its billing isn't configured, `engine.py` estimates UV from the site's
latitude, day of year, and current cloud cover using a standard clear-sky
solar-elevation approximation (`estimate_uv_index()`). Every UV figure in the
UI is labelled "est." and the underlying `uv_basis` field is always
`"estimated"` — this is deliberately never presented as a sensor reading.

When the estimate lands in the High/Very High/Extreme band, Thermarch adds a
`facade_uv_treatment` recommendation (UV-protective glazing film, or a
UV-stabilised exterior coating at the top end) — a material-durability
concern that is real even in climates where solar heat gain itself isn't
severe (e.g. a cold, high-altitude, low-humidity site at midday in summer).

### Extended argv contract

`engine.py` now accepts up to 9 positional arguments, each stage optional and
backward-compatible with earlier calls:

```
engine.py <temperature> <humidity> <wind_speed> <condition> <latitude> <longitude> [country] [day_of_year] [aqi_index]
```

`day_of_year` is derived by `server.js` from the weather observation's own
timestamp, not the server's clock — so a cached or replayed weather reading
still produces a UV estimate consistent with when that reading was taken, and
the engine stays a pure function of its inputs. `aqi_index` of `-1` or absent
means "unknown" and skips filtration logic entirely, rather than guessing.

---

## 13. Limitations

Thermarch v1 is a **rule-based conceptual recommendation engine**, and should
be described as *a computational design decision-support prototype for
exploring climate-responsive passive architecture*.

It is **not**:

- a certified architectural simulation
- a guarantee of energy savings
- validated building-performance software
- professional engineering advice

Specifically:

- It reads a single current weather observation, not a climate normal. A cold
  morning in Chennai will classify differently from a hot afternoon.
- It has no solar radiation model, no prevailing wind direction, no seasonal
  or diurnal data, and no precipitation.
- The performance bars are labelled *Thermarch heuristic assessment*
  throughout. They rank which passive strategies matter at this site; they are
  not predicted performance.
- The parameter sliders are labelled *Explore design sensitivity*. They show
  the direction each parameter pushes the design. They do not re-run the engine
  and they are not a simulation.

---

## 14. Roadmap

**V2 — better climate intelligence.** Historical and seasonal data, solar
radiation, prevailing wind direction, precipitation, daylight hours.

**V3 — optimisation.** Multi-objective search over thermal comfort, energy
demand, construction cost and embodied carbon.

**V4 — simulation.** Swap the rule engine for EnergyPlus or OpenStudio behind
the same REST boundary.

**V5 — computational architecture.** Generate floor plans, building and roof
geometry, and shading geometry from the parameters.

**V6 — AI assistance.** Natural-language design explanation, alternative
generation, report writing — layered on top of the deterministic engine, never
replacing it.
