#!/usr/bin/env python3
"""
Thermarch Rule Engine v2
------------------------
A deterministic, rule-based passive-design decision matrix, now driven by
representative SEASONAL conditions rather than a single live reading.

Contract
  argv[1]: one JSON-encoded string (see run() docstring for its shape)
  stdout:  EXACTLY ONE JSON object, nothing else.
  stderr:  diagnostics only (never parsed by the caller).

Why seasonal: classifying climate off whatever the weather happens to be
doing at request time is fragile and, for a site like Delhi, actively
misleading - a mild January morning reads as "moderate" even though the
same site is brutally hot for half the year and choked with winter smog.
This engine now runs its full decision matrix twice, once for the site's
representative hottest month and once for its coldest, and reports whether
one fixed design serves both or whether the site needs a seasonally
adaptive one. The caller (server.js) supplies those two representative
months, ideally averaged from historical normals; if that data isn't
available it may resend the same live reading for both slots, and this
engine has no way to tell the difference - the caller controls the
climate_basis label the API reports.

This is a decision-support heuristic, not a validated building-performance
simulation. Every number below is traceable to a rule in this file, and the
same input always produces the same output.
"""

import json
import math
import sys
from datetime import datetime, timezone

ENGINE_NAME = "Thermarch Rule Engine v2"
ENGINE_METHOD = "rule_based_recommendation_seasonal"


# ---------------------------------------------------------------------------
# small helpers
# ---------------------------------------------------------------------------

def clamp(value, low, high):
    return max(low, min(high, value))


def round_to(value, step):
    return int(round(value / step) * step)


# ---------------------------------------------------------------------------
# 1. CLIMATE CLASSIFICATION
# ---------------------------------------------------------------------------

def classify(temperature, humidity):
    """Transparent four-way classification. Order of tests matters."""
    if temperature < 10:
        return "cold"
    if temperature >= 30 and humidity >= 60:
        return "hot_humid"
    if temperature >= 30:
        return "hot_dry"
    if temperature >= 24 and humidity >= 70:
        # warm and sticky behaves like a mild hot-humid case
        return "hot_humid"
    return "moderate"


CLIMATE_LABELS = {
    "cold": "COLD",
    "hot_humid": "HOT / HUMID",
    "hot_dry": "HOT / DRY",
    "moderate": "MODERATE",
}

CLIMATE_SUMMARY = {
    "cold": (
        "Low outdoor temperature makes heat retention the dominant concern. "
        "Compact geometry, heavy insulation and controlled solar gain matter "
        "more than air movement."
    ),
    "hot_humid": (
        "High temperature combined with elevated humidity increases the "
        "importance of shading, ventilation, and reduction of unwanted solar "
        "heat gain. Evaporative cooling is ineffective when the air is "
        "already close to saturation."
    ),
    "hot_dry": (
        "High temperature with dry air produces a large day-night temperature "
        "swing. Thermal mass, small protected openings and shaded outdoor "
        "space are more effective than continuous cross ventilation."
    ),
    "moderate": (
        "Temperatures sit close to the comfort band for much of the day. The "
        "design can stay mixed-mode: usable daylight, openable windows, and "
        "moderate insulation rather than a strong bias toward heating or "
        "cooling."
    ),
}


def severity(temperature):
    """Coarse intensity tier used by the UI to shade the climate card."""
    if temperature < 0 or temperature >= 38:
        return "extreme"
    if temperature < 10 or temperature >= 32:
        return "high"
    return "standard"


# ---------------------------------------------------------------------------
# 2. HEURISTIC PERFORMANCE PROFILE
#    Derived from the inputs, never hardcoded per climate class.
# ---------------------------------------------------------------------------

def heuristic_profile(temperature, humidity, wind_speed, condition, climate):
    clear_sky = any(k in condition.lower() for k in ("clear", "sun", "haze"))

    solar_protection = 50 + (temperature - 20) * 2.5 + (10 if clear_sky else 0)
    ventilation = 40 + (humidity - 50) * 0.6 + (temperature - 22) * 2.0 \
        + (wind_speed - 3.0) * 2.0
    heat_retention = 95 - (temperature - 2) * 3.0
    thermal_mass = 100 - humidity * 0.9
    if climate == "cold":
        thermal_mass += 15          # mass also buffers an internally heated shell
    if climate == "hot_humid":
        thermal_mass -= 20          # mass re-radiates at night when nights stay warm
    glazing = 95 - abs(temperature - 22) * 1.2 - max(0.0, humidity - 60) * 0.2

    return {
        "heat_retention": int(clamp(round(heat_retention), 5, 98)),
        "solar_protection": int(clamp(round(solar_protection), 5, 98)),
        "ventilation": int(clamp(round(ventilation), 5, 98)),
        "thermal_mass": int(clamp(round(thermal_mass), 10, 95)),
        "glazing_efficiency": int(clamp(round(glazing), 20, 98)),
    }


# ---------------------------------------------------------------------------
# 3. PARAMETRIC RULES
# ---------------------------------------------------------------------------

BASE_WWR = {"cold": 0.35, "moderate": 0.30, "hot_dry": 0.20, "hot_humid": 0.28}

GEOMETRY = {
    "cold": ("compact_low_surface_area", "Compact form, minimised surface area"),
    "hot_humid": ("ventilation_oriented", "Elongated ventilation-oriented form"),
    "hot_dry": ("courtyard_massed", "Massed form around a shaded courtyard"),
    "moderate": ("balanced_linear", "Balanced linear form with openable facades"),
}

WALL = {
    "cold": ("insulated_cavity_wall", "Insulated cavity wall"),
    "hot_humid": ("hollow_clay_brick", "Hollow clay brick"),
    "hot_dry": ("high_mass_earth_or_stone", "High-mass earth or stone"),
    "moderate": ("insulated_brick", "Insulated solid brick"),
}

ROOF = {
    "cold": ("compact_insulated_roof", "Compact, heavily insulated roof"),
    "hot_humid": ("reflective_ventilated_roof", "High-reflectance ventilated roof"),
    "hot_dry": ("massive_shaded_roof", "Massive roof under a shading layer"),
    "moderate": ("insulated_pitched_roof", "Insulated pitched roof"),
}

SHADING = {
    "cold": ("seasonal_adjustable_shading", "Seasonal adjustable shading"),
    "hot_humid": ("deep_external_shading", "Deep external shading"),
    "hot_dry": ("small_recessed_openings", "Recessed openings and screens"),
    "moderate": ("horizontal_overhangs", "Horizontal overhangs"),
}

THERMAL_STRATEGY = {
    "cold": ("heat_retention", "Heat retention"),
    "hot_humid": ("heat_rejection", "Heat rejection"),
    "hot_dry": ("thermal_lag", "Thermal lag and night flush"),
    "moderate": ("mixed_mode", "Mixed mode"),
}


def ventilation_strategy(climate, wind_speed, humidity):
    if climate == "hot_humid":
        if wind_speed >= 3.0:
            return ("cross_ventilation", "Cross ventilation")
        return ("stack_and_cross_ventilation", "Stack-assisted cross ventilation")
    if climate == "hot_dry":
        return ("night_purge_ventilation", "Night purge ventilation")
    if climate == "cold":
        return ("controlled_mechanical_ventilation",
                "Controlled ventilation with heat recovery")
    if humidity >= 70:
        return ("cross_ventilation", "Cross ventilation")
    return ("operable_natural_ventilation", "Operable natural ventilation")


def thermal_mass_level(climate, humidity):
    if climate == "hot_dry":
        return "high"
    if climate == "cold":
        return "high" if humidity < 70 else "medium"
    if climate == "hot_humid":
        return "low"
    return "medium"


def window_to_wall_ratio(climate, temperature, humidity):
    wwr = BASE_WWR[climate]
    if climate == "hot_humid" and humidity >= 75:
        wwr += 0.02                      # openings double as the airflow path
    if temperature >= 38:
        wwr -= 0.04                      # extreme heat: shrink the aperture
    if temperature < 0:
        wwr -= 0.05                      # extreme cold: glass is the weak link
    return round(clamp(wwr, 0.15, 0.40), 2)


def orientation_deg(climate, latitude, wind_speed):
    """
    Rotation of the long axis, measured clockwise from north.
    0 deg  = long axis east-west, main facade toward the winter sun.
    Southern hemisphere mirrors the rule.
    """
    if climate in ("hot_humid",):
        base = 15 if wind_speed < 4.0 else 30   # angle into the prevailing breeze
    elif climate == "hot_dry":
        base = 10
    elif climate == "cold":
        base = 0
    else:
        base = 5
    if latitude < 0:
        base = (180 + base) % 360
    return int(base)


def insulation_mm(climate, temperature):
    if climate == "cold":
        value = 100 + (10 - temperature) * 4
    elif climate == "hot_dry":
        value = 75
    elif climate == "hot_humid":
        value = 50
    else:
        value = 60
    return int(round_to(clamp(value, 40, 250), 5))


def roof_overhang_m(solar_protection):
    return round(clamp(0.3 + (solar_protection / 100.0) * 0.9, 0.3, 1.2), 1)


# ---------------------------------------------------------------------------
# 4. EXPLANATIONS
#    Generated here so the frontend never invents its own reasoning.
# ---------------------------------------------------------------------------

def build_explanations(climate, temperature, humidity, wind_speed, rec, profile,
                       aqi_index=-1, uv_index=0.0, uv_category="Low"):
    wwr_pct = int(round(rec["window_to_wall_ratio"] * 100))
    risk = "HIGH" if profile["solar_protection"] >= 70 else \
           "MODERATE" if profile["solar_protection"] >= 45 else "LOW"

    explanations = [
        {
            "parameter": "window_to_wall_ratio",
            "question": f"Why {wwr_pct}% window-to-wall ratio?",
            "drivers": [
                f"Temperature: {temperature} C",
                f"Humidity: {humidity} %",
                f"Solar heat gain risk: {risk}",
            ],
            "implications": (
                [
                    "excessive glazing can increase heat gain",
                    "controlled openings maintain ventilation",
                    "external shading reduces direct solar exposure",
                ] if climate in ("hot_humid", "hot_dry") else
                [
                    "larger glazed area captures useful winter solar gain",
                    "glass remains the weakest part of the thermal envelope",
                    "openings concentrate on the sun-facing facade",
                ] if climate == "cold" else
                [
                    "daylight is available without a large cooling penalty",
                    "openable area supports mixed-mode comfort",
                    "shading handles the warmest part of the year",
                ]
            ),
        },
        {
            "parameter": "insulation_mm",
            "question": f"Why {rec['insulation_mm']} mm insulation?",
            "drivers": [
                f"Temperature: {temperature} C",
                f"Heat retention priority: {profile['heat_retention']}/100",
            ],
            "implications": (
                [
                    "the gap between indoor and outdoor temperature is large",
                    "conduction losses dominate the heating demand",
                    "envelope thickness is cheaper than added heating capacity",
                ] if climate == "cold" else
                [
                    "insulation limits conducted gain through walls and roof",
                    "the roof receives the highest solar load, so it is treated first",
                    "beyond this point ventilation and shading return more than thickness",
                ]
            ),
        },
        {
            "parameter": "ventilation_strategy",
            "question": f"Why {rec['ventilation_strategy_label'].lower()}?",
            "drivers": [
                f"Humidity: {humidity} %",
                f"Wind speed: {wind_speed} m/s",
                f"Ventilation priority: {profile['ventilation']}/100",
            ],
            "implications": (
                [
                    "moist air limits evaporative cooling, so air movement does the work",
                    "openings are placed on opposing facades to create a flow path",
                    "internal partitions are kept permeable to airflow",
                ] if climate == "hot_humid" else
                [
                    "cool night air is used to discharge heat stored in the mass",
                    "daytime openings stay small to keep hot air out",
                    "shaded courtyards supply cooler intake air",
                ] if climate == "hot_dry" else
                [
                    "uncontrolled infiltration would waste retained heat",
                    "fresh air is supplied deliberately rather than by leakage",
                    "heat recovery keeps ventilation from cancelling insulation",
                ] if climate == "cold" else
                [
                    "operable windows cover most of the comfort range",
                    "mechanical systems stay as a fallback, not a default",
                    "the facade can respond to the season",
                ]
            ),
        },
        {
            "parameter": "thermal_mass",
            "question": f"Why {rec['thermal_mass']} thermal mass?",
            "drivers": [
                f"Humidity: {humidity} % (day-night swing indicator)",
                f"Thermal mass score: {profile['thermal_mass']}/100",
            ],
            "implications": (
                [
                    "dry air produces a wide day-night temperature swing",
                    "mass absorbs daytime heat and releases it after sunset",
                    "night ventilation resets the mass before the next day",
                ] if climate == "hot_dry" else
                [
                    "warm humid nights give the mass no chance to discharge",
                    "a lightweight shell cools down as soon as the sun drops",
                    "raised, ventilated construction avoids ground heat storage",
                ] if climate == "hot_humid" else
                [
                    "mass stabilises indoor temperature against outdoor swings",
                    "it pairs with insulation placed on the outer face",
                    "internal gains are retained rather than lost quickly",
                ]
            ),
        },
        {
            "parameter": "orientation_deg",
            "question": f"Why {rec['orientation_deg']} degrees from north?",
            "drivers": [
                f"Climate class: {CLIMATE_LABELS[climate]}",
                f"Wind speed: {wind_speed} m/s",
            ],
            "implications": (
                [
                    "the long axis is turned to catch the prevailing breeze",
                    "east and west facades stay short to limit low-angle sun",
                    "openings align across the plan to keep the air path open",
                ] if climate == "hot_humid" else
                [
                    "the long facades face the sun path for winter gain",
                    "short east-west facades reduce summer overheating",
                    "entrances are placed away from the coldest exposure",
                ] if climate == "cold" else
                [
                    "east and west exposure is minimised first",
                    "the sun-facing facade is the easiest to shade with overhangs",
                    "a small rotation tunes daylight without losing shading control",
                ]
            ),
        },
    ]

    if aqi_index in (1, 2, 3, 4, 5):
        explanations.append({
            "parameter": "ventilation_filtration",
            "question": f"Why {rec['ventilation_filtration_label'].lower()}?",
            "drivers": [
                f"Air quality index: {aqi_index}/5 ({AQI_CATEGORY[aqi_index]})",
            ],
            "implications": (
                [
                    "outdoor air currently carries a high pollutant load",
                    "unfiltered natural ventilation would bring that indoors",
                    "the airflow strategy above still stands - filter what enters it",
                ] if aqi_index in (4, 5) else
                [
                    "outdoor air quality is acceptable for direct intake",
                    "no filtration penalty on the ventilation strategy above",
                ]
            ),
        })

    explanations.append({
        "parameter": "facade_uv_treatment",
        "question": f"Why {rec['facade_uv_treatment_label'].lower()}?",
        "drivers": [
            f"Estimated UV index: {uv_index} ({uv_category})",
        ],
        "implications": (
            [
                "sustained high UV degrades unprotected paints and sealants",
                "glazing without UV filtering will fade interior finishes",
                "this is a material-durability concern, separate from solar heat gain",
            ] if uv_category in ("High", "Very High", "Extreme") else
            [
                "UV exposure at this level does not require special treatment",
                "standard exterior finishes have adequate service life here",
            ]
        ),
    })

    return explanations


def build_reasoning(climate, temperature, humidity, wind_speed):
    lines = []
    if humidity >= 60 and temperature >= 24:
        lines.append("High humidity increases the importance of air movement.")
    if temperature >= 30:
        lines.append("High outdoor temperature increases the importance of "
                     "solar heat rejection.")
    if temperature < 10:
        lines.append("Low outdoor temperature makes envelope heat loss the "
                     "dominant design constraint.")
    if humidity < 40 and temperature >= 28:
        lines.append("Dry air implies a large day-night swing, which thermal "
                     "mass can absorb.")
    if wind_speed >= 4.0:
        lines.append("Available wind speed makes passive cross ventilation a "
                     "realistic cooling route.")
    if climate == "moderate":
        lines.append("Conditions sit near the comfort band, so a mixed-mode "
                     "envelope outperforms a strongly specialised one.")
    lines.append("Controlled glazing helps balance daylight and unwanted heat "
                 "gain.")
    return lines


def build_air_reasoning(aqi_index, uv_category):
    lines = []
    if aqi_index in (4, 5):
        lines.append("Air quality is currently poor; natural ventilation "
                     "should be filtered rather than left open.")
    if uv_category in ("High", "Very High", "Extreme"):
        lines.append("Estimated UV exposure is high enough to warrant "
                     "UV-resistant exterior materials, independent of the "
                     "thermal shading strategy.")
    return lines


# ---------------------------------------------------------------------------
# 5. SITE ADAPTATION
#    Thermarch recommends climate-optimal parameters. A specific plot may not
#    allow the exact geometry or orientation - fixed street frontage, party
#    walls, local material availability, budget. This section states what to
#    prioritise if the primary recommendation cannot be built as specified,
#    so the tool degrades gracefully instead of pretending one answer fits
#    every plot in a given climate.
# ---------------------------------------------------------------------------

SITE_ADAPTATION = {
    "cold": [
        "If the plot forces the long facade off the ideal sun-facing "
        "orientation, keep the insulation and airtightness targets fixed "
        "and shrink glazing on whichever facade ends up shaded - retained "
        "heat matters more here than captured heat.",
        "If added insulation thickness is not buildable, shift the budget "
        "to shading-independent airtightness and heat-recovery ventilation "
        "first; they return more per rupee than a further increase in "
        "wall thickness once thermal bridging is controlled.",
    ],
    "hot_humid": [
        "If the plot cannot be rotated into the prevailing wind, keep the "
        "cross-ventilation path open through the internal plan instead - "
        "align windows, not the building, with the breeze.",
        "If deep external shading cannot be built (frontage limits, cost), "
        "reduce the window-to-wall ratio further before removing shading - "
        "a smaller, unshaded opening still outperforms a large one.",
    ],
    "hot_dry": [
        "If a shaded courtyard will not fit the plot, concentrate thermal "
        "mass on the walls that receive direct afternoon sun and keep "
        "openings small and recessed on those faces specifically.",
        "If night purge ventilation is not achievable (security, noise, "
        "site density), lean harder on thermal mass and daytime shading; "
        "the mass will discharge more slowly but still moderates the swing.",
    ],
    "moderate": [
        "If the site cannot support the full glazed area, prioritise the "
        "facade that gets daylight without direct summer sun - the mixed-"
        "mode benefit depends more on placement than on total area.",
        "If mechanical backup is unavoidable given the plot's density, keep "
        "the openable windows anyway; mixed-mode still cuts runtime "
        "substantially even where it cannot eliminate it.",
    ],
}


# ---------------------------------------------------------------------------
# 6. OPERATIONAL EMISSIONS ESTIMATE
#    Thermarch does not reduce emissions from an existing building - it
#    estimates emissions a NEW building avoids relative to a conventional
#    baseline built without passive strategies, in the same climate. The
#    numbers below are benchmark-based approximations, not a measured or
#    certified carbon audit. Every constant is named so it can be swapped
#    for a local energy-code benchmark or a metered figure later.
# ---------------------------------------------------------------------------

# Annual HVAC energy intensity for a CONVENTIONAL (non-passive) building in
# each climate class, in kWh per square metre per year. Illustrative
# benchmark figures in line with published building-energy-code baselines;
# treat as a placeholder to replace with a local code benchmark.
BASELINE_EUI_KWH_M2 = {
    "cold": 140.0,
    "moderate": 55.0,
    "hot_dry": 100.0,
    "hot_humid": 120.0,
}

# Average grid emission factor, kg CO2 per kWh, by ISO country code.
# A small illustrative set; unlisted countries fall back to a global average.
GRID_FACTOR_KG_CO2_PER_KWH = {
    "IN": 0.71,
    "US": 0.42,
    "GB": 0.21,
    "AE": 0.60,
    "CN": 0.58,
    "AU": 0.66,
    "DE": 0.35,
    "FR": 0.06,
    "JP": 0.46,
    "BR": 0.09,
    "ZA": 0.90,
}
DEFAULT_GRID_FACTOR = 0.48  # approximate global average

# Percentage reduction each strategy contributes vs the conventional
# baseline, applied multiplicatively (independent, diminishing-return
# combination) rather than added, so the total never exceeds 100% and
# overlapping strategies do not double-count. Combined result is capped -
# even a strong passive design realistically avoids part, not all, of the
# baseline load.
MAX_COMBINED_REDUCTION = 0.55


def _shading_reduction(shading_key):
    return {
        "deep_external_shading": 0.18,
        "small_recessed_openings": 0.12,
        "horizontal_overhangs": 0.10,
        "seasonal_adjustable_shading": 0.08,
    }.get(shading_key, 0.0)


def _ventilation_reduction(ventilation_key):
    return {
        "controlled_mechanical_ventilation": 0.20,  # heat-recovery, cold
        "night_purge_ventilation": 0.15,
        "cross_ventilation": 0.12,
        "stack_and_cross_ventilation": 0.12,
        "operable_natural_ventilation": 0.06,
    }.get(ventilation_key, 0.0)


def _insulation_reduction(insulation_mm_value):
    # 25mm is treated as the conventional-baseline thickness.
    return clamp((insulation_mm_value - 25) / 225 * 0.25, 0.0, 0.25)


def _wwr_reduction(wwr):
    # 0.40 is treated as the conventional-baseline window-to-wall ratio.
    return clamp((0.40 - wwr) / 0.40 * 0.10, -0.05, 0.10)


def _thermal_mass_reduction(mass_level):
    return {"high": 0.08, "medium": 0.04, "low": 0.0}.get(mass_level, 0.0)


def estimate_emissions(climate, recommendation, country):
    baseline_eui = BASELINE_EUI_KWH_M2[climate]
    grid_factor = GRID_FACTOR_KG_CO2_PER_KWH.get(
        (country or "").upper(), DEFAULT_GRID_FACTOR
    )

    factors = [
        _shading_reduction(recommendation["shading_strategy"]),
        _ventilation_reduction(recommendation["ventilation_strategy"]),
        _insulation_reduction(recommendation["insulation_mm"]),
        _wwr_reduction(recommendation["window_to_wall_ratio"]),
        _thermal_mass_reduction(recommendation["thermal_mass"]),
    ]

    # Combine as independent probabilities of avoided load: this keeps the
    # combined effect below 100% without an arbitrary linear cap kicking in
    # awkwardly for very well-optimised designs.
    remaining = 1.0
    for factor in factors:
        remaining *= clamp(1.0 - factor, 0.45, 1.05)
    combined_reduction = clamp(1.0 - remaining, 0.0, MAX_COMBINED_REDUCTION)

    energy_saved = baseline_eui * combined_reduction
    energy_optimized = baseline_eui - energy_saved

    return {
        "grid_country": (country or "").upper() or None,
        "grid_factor_kg_co2_per_kwh": grid_factor,
        "baseline_energy_kwh_per_m2_year": round(baseline_eui, 1),
        "optimized_energy_kwh_per_m2_year": round(energy_optimized, 1),
        "energy_avoided_kwh_per_m2_year": round(energy_saved, 1),
        "reduction_percent": round(combined_reduction * 100, 1),
        "baseline_co2_kg_per_m2_year": round(baseline_eui * grid_factor, 1),
        "optimized_co2_kg_per_m2_year": round(energy_optimized * grid_factor, 1),
        "co2_avoided_kg_per_m2_year": round(energy_saved * grid_factor, 1),
        "basis": (
            "Benchmark-based estimate of operational HVAC emissions avoided "
            "relative to a conventional, non-passive baseline building in "
            "the same climate class. Not a certified carbon audit or energy "
            "simulation - a design-stage indicator only."
        ),
    }


# ---------------------------------------------------------------------------
# 7. AIR QUALITY AND UV EXPOSURE
#    Two independent environmental layers, additive to the thermal
#    recommendation rather than folded into climate classification:
#      - Air quality (AQI) is measured data, passed in from OpenWeatherMap's
#        Air Pollution API. It changes how outdoor air should be brought in,
#        not whether the building should be ventilated.
#      - UV exposure has no free real-time source, so it is estimated here
#        from latitude, day of year, and cloud cover using a standard
#        clear-sky solar-elevation approximation. Labelled as an estimate
#        throughout - never presented as measured.
# ---------------------------------------------------------------------------

AQI_CATEGORY = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}

UV_BANDS = [
    (2, "Low"),
    (5, "Moderate"),
    (7, "High"),
    (10, "Very High"),
    (float("inf"), "Extreme"),
]


def classify_uv(uv_index):
    for threshold, label in UV_BANDS:
        if uv_index <= threshold:
            return label
    return "Extreme"


def solar_elevation(latitude, day_of_year):
    """Solar-noon elevation angle in degrees, via Cooper's equation for
    declination. Shared by the UV estimate and the solar-generation
    estimate below - both are downstream of the same geometry."""
    declination = 23.44 * math.sin(math.radians(360 / 365 * (day_of_year - 81)))
    return clamp(90 - abs(latitude - declination), 0, 90)


def sky_attenuation(condition):
    """How much a reported sky condition cuts clear-sky radiation. Shared
    by UV and solar-yield estimates - both are attenuated by cloud cover
    the same way."""
    condition_lower = condition.lower()
    if any(k in condition_lower for k in ("clear", "sun")):
        return 1.0
    if "cloud" in condition_lower:
        return 0.7
    if any(k in condition_lower for k in ("mist", "haze", "fog", "smoke")):
        return 0.6
    if any(k in condition_lower for k in ("rain", "drizzle", "thunderstorm", "snow")):
        return 0.35
    return 0.8


def estimate_uv_index(latitude, condition, day_of_year):
    """
    Clear-sky solar-elevation approximation, not measured UV data. Higher
    solar elevation means more direct, less atmosphere-filtered UV; cloud
    cover attenuates the clear-sky figure.
    """
    elevation = solar_elevation(latitude, day_of_year)
    clear_sky_uv = (elevation / 90) * 12.5
    return round(clamp(clear_sky_uv * sky_attenuation(condition), 0, 14), 1)


def ventilation_filtration(aqi_index):
    if aqi_index in (4, 5):
        return ("filtered_intake_recommended", "Filtered air intake recommended")
    if aqi_index in (1, 2, 3):
        return ("standard_intake_acceptable", "Standard natural intake acceptable")
    return ("unknown", "Air quality data unavailable")


def facade_uv_treatment(uv_category):
    if uv_category in ("Very High", "Extreme"):
        return ("uv_stabilised_coating", "UV-stabilised exterior coating")
    if uv_category == "High":
        return ("uv_protective_glazing", "UV-protective glazing film")
    return ("standard_treatment", "Standard exterior finish")


# ---------------------------------------------------------------------------
# 7b. SOLAR SELF-GENERATION ESTIMATE
#     Optional - only computed when the caller supplies a usable roof/
#     terrace area. Uses the same clear-sky solar-elevation model as the UV
#     estimate, converted to an irradiance proxy (kWh/m2/day, i.e. "peak
#     sun hours") rather than a satellite-measured GHI dataset - the same
#     reliability trade-off made for UV, and for the same reason: no free
#     no-signup irradiance API was wired in, so this stays fully offline
#     and deterministic rather than adding a third live network dependency
#     right before a demo.
# ---------------------------------------------------------------------------

USABLE_ROOF_FRACTION = 0.70     # setbacks, access paths, obstructions
AREA_PER_KWP_M2 = 6.5           # typical panel + spacing area per kWp
PERFORMANCE_RATIO = 0.75        # inverter, wiring, temperature, soiling losses
MIN_ROOF_AREA_M2 = 5
MAX_ROOF_AREA_M2 = 100000


def estimate_ghi_kwh_m2_day(latitude, condition, day_of_year):
    """Peak-sun-hours proxy: clear-sky irradiance scaled by solar elevation,
    attenuated by reported sky condition. Not a measured GHI dataset."""
    elevation = solar_elevation(latitude, day_of_year)
    clear_sky_ghi = 1.0 + 6.5 * (elevation / 90)
    return round(clamp(clear_sky_ghi * sky_attenuation(condition), 0.5, 8.5), 2)


def estimate_solar_generation(roof_area_m2, latitude, country,
                               summer_condition, summer_day_of_year,
                               winter_condition, winter_day_of_year):
    if not roof_area_m2 or roof_area_m2 <= 0:
        return None

    roof_area_m2 = clamp(roof_area_m2, MIN_ROOF_AREA_M2, MAX_ROOF_AREA_M2)
    usable_area_m2 = round(roof_area_m2 * USABLE_ROOF_FRACTION, 1)
    capacity_kwp = round(usable_area_m2 / AREA_PER_KWP_M2, 2)

    ghi_summer = estimate_ghi_kwh_m2_day(latitude, summer_condition, summer_day_of_year)
    ghi_winter = estimate_ghi_kwh_m2_day(latitude, winter_condition, winter_day_of_year)
    annual_ghi_avg = round((ghi_summer + ghi_winter) / 2, 2)

    annual_yield_kwh = round(capacity_kwp * annual_ghi_avg * 365 * PERFORMANCE_RATIO, 0)

    grid_factor = GRID_FACTOR_KG_CO2_PER_KWH.get((country or "").upper(), DEFAULT_GRID_FACTOR)
    co2_offset_kg_year = round(annual_yield_kwh * grid_factor, 0)

    return {
        "roof_area_m2": roof_area_m2,
        "usable_roof_fraction": USABLE_ROOF_FRACTION,
        "usable_area_m2": usable_area_m2,
        "area_per_kwp_m2": AREA_PER_KWP_M2,
        "system_capacity_kwp": capacity_kwp,
        "performance_ratio": PERFORMANCE_RATIO,
        "estimated_ghi_summer_kwh_m2_day": ghi_summer,
        "estimated_ghi_winter_kwh_m2_day": ghi_winter,
        "estimated_ghi_annual_avg_kwh_m2_day": annual_ghi_avg,
        "annual_yield_kwh": annual_yield_kwh,
        "grid_factor_kg_co2_per_kwh": grid_factor,
        "co2_offset_kg_year": co2_offset_kg_year,
        "basis": (
            "Standard rule-of-thumb PV sizing: capacity (usable area / area "
            "per kWp) x irradiance (estimated peak-sun-hours, not measured "
            "GHI) x 365 days x performance ratio. Does not account for roof "
            "tilt, azimuth, shading from adjacent structures, or roof "
            "structural load capacity - a design-stage indicator only."
        ),
    }


# ---------------------------------------------------------------------------
# 8. PER-SEASON PACKAGE
#    Runs the full decision matrix once, for one set of conditions. Called
#    twice by run() below - once for the representative hottest month, once
#    for the coldest - so the two seasons never share hidden state.
# ---------------------------------------------------------------------------

def build_season_package(temperature, humidity, wind_speed, condition,
                          latitude, longitude, country="", day_of_year=None,
                          aqi_index=-1):
    if day_of_year is None:
        day_of_year = datetime.now(timezone.utc).timetuple().tm_yday
    climate = classify(temperature, humidity)
    profile = heuristic_profile(temperature, humidity, wind_speed,
                                condition, climate)

    geometry_key, geometry_label = GEOMETRY[climate]
    wall_key, wall_label = WALL[climate]
    roof_key, roof_label = ROOF[climate]
    shading_key, shading_label = SHADING[climate]
    strategy_key, strategy_label = THERMAL_STRATEGY[climate]
    vent_key, vent_label = ventilation_strategy(climate, wind_speed, humidity)
    filtration_key, filtration_label = ventilation_filtration(aqi_index)
    uv_index = estimate_uv_index(latitude, condition, day_of_year)
    uv_category = classify_uv(uv_index)
    uv_treatment_key, uv_treatment_label = facade_uv_treatment(uv_category)

    recommendation = {
        "building_shape": geometry_key,
        "building_shape_label": geometry_label,
        "orientation_deg": orientation_deg(climate, latitude, wind_speed),
        "window_to_wall_ratio": window_to_wall_ratio(climate, temperature,
                                                     humidity),
        "wall_material": wall_key,
        "wall_material_label": wall_label,
        "insulation_mm": insulation_mm(climate, temperature),
        "thermal_mass": thermal_mass_level(climate, humidity),
        "roof_strategy": roof_key,
        "roof_strategy_label": roof_label,
        "roof_overhang_m": roof_overhang_m(profile["solar_protection"]),
        "ventilation_strategy": vent_key,
        "ventilation_strategy_label": vent_label,
        "ventilation_filtration": filtration_key,
        "ventilation_filtration_label": filtration_label,
        "shading_strategy": shading_key,
        "shading_strategy_label": shading_label,
        "facade_uv_treatment": uv_treatment_key,
        "facade_uv_treatment_label": uv_treatment_label,
        "thermal_strategy": strategy_key,
        "thermal_strategy_label": strategy_label,
    }

    return {
        "climate": {
            "classification": climate,
            "label": CLIMATE_LABELS[climate],
            "summary": CLIMATE_SUMMARY[climate],
            "severity": severity(temperature),
            "temperature_c": temperature,
            "humidity_percent": humidity,
            "wind_speed_mps": wind_speed,
            "condition": condition,
            "latitude": latitude,
            "longitude": longitude,
            "hemisphere": "north" if latitude >= 0 else "south",
            "aqi_index": aqi_index if aqi_index in (1, 2, 3, 4, 5) else None,
            "aqi_category": AQI_CATEGORY.get(aqi_index),
            "uv_index": uv_index,
            "uv_category": uv_category,
            "uv_basis": "estimated",
        },
        "recommendation": recommendation,
        "reasoning": build_reasoning(climate, temperature, humidity, wind_speed)
                     + build_air_reasoning(aqi_index, uv_category),
        "explanations": build_explanations(climate, temperature, humidity,
                                           wind_speed, recommendation, profile,
                                           aqi_index, uv_index, uv_category),
        "heuristic_profile": profile,
        "site_adaptation": SITE_ADAPTATION[climate],
        "emissions": estimate_emissions(climate, recommendation, country),
    }


def blend_emissions(summer_emissions, winter_emissions):
    """
    A simple 50/50 average of the two seasonal estimates. This is a stated
    simplification - two representative months standing in for twelve are
    already an approximation, and averaging them is the honest way to give
    a single annual figure without pretending to a precision the underlying
    two-point sample doesn't support.
    """
    def avg(key):
        return round((summer_emissions[key] + winter_emissions[key]) / 2, 1)

    return {
        "grid_country": summer_emissions["grid_country"],
        "grid_factor_kg_co2_per_kwh": summer_emissions["grid_factor_kg_co2_per_kwh"],
        "baseline_energy_kwh_per_m2_year": avg("baseline_energy_kwh_per_m2_year"),
        "optimized_energy_kwh_per_m2_year": avg("optimized_energy_kwh_per_m2_year"),
        "energy_avoided_kwh_per_m2_year": avg("energy_avoided_kwh_per_m2_year"),
        "reduction_percent": avg("reduction_percent"),
        "baseline_co2_kg_per_m2_year": avg("baseline_co2_kg_per_m2_year"),
        "optimized_co2_kg_per_m2_year": avg("optimized_co2_kg_per_m2_year"),
        "co2_avoided_kg_per_m2_year": avg("co2_avoided_kg_per_m2_year"),
        "basis": (
            "Simple average of the summer-design and winter-design "
            "estimates above, standing in for a full annual profile. Two "
            "representative months, not twelve - a design-stage indicator, "
            "not a metered or simulated annual total."
        ),
    }


# ---------------------------------------------------------------------------
# 9. RUN - seasonal orchestration
# ---------------------------------------------------------------------------

def run(payload):
    """
    Expected payload shape:
    {
      "current":  {"temperature":.., "humidity":.., "wind_speed":.., "condition":.., "observed_at":.., "aqi_index":..},
      "summer":   {"temperature":.., "humidity":.., "wind_speed":.., "condition":.., "day_of_year":.., "aqi_index":..},
      "winter":   {"temperature":.., "humidity":.., "wind_speed":.., "condition":.., "day_of_year":.., "aqi_index":..},
      "site":     {"latitude":.., "longitude":.., "country":..},
      "climate_basis": "annual_normal" | "live_reading_fallback",
      "normal_period": "2025" | null
    }
    "summer" and "winter" may be identical to "current" - that's the caller's
    fallback path, not something this function decides.
    """
    site = payload["site"]
    latitude = float(site["latitude"])
    longitude = float(site["longitude"])
    country = site.get("country", "") or ""

    current = payload["current"]
    summer = payload["summer"]
    winter = payload["winter"]

    summer_package = build_season_package(
        float(summer["temperature"]), float(summer["humidity"]),
        float(summer["wind_speed"]), str(summer["condition"]),
        latitude, longitude, country,
        summer.get("day_of_year"), int(summer.get("aqi_index", -1)),
    )
    winter_package = build_season_package(
        float(winter["temperature"]), float(winter["humidity"]),
        float(winter["wind_speed"]), str(winter["condition"]),
        latitude, longitude, country,
        winter.get("day_of_year"), int(winter.get("aqi_index", -1)),
    )

    same_bucket = (summer_package["climate"]["classification"]
                   == winter_package["climate"]["classification"])
    design_strategy = "fixed_design" if same_bucket else "seasonal_adaptive"

    if same_bucket:
        design_strategy_note = (
            f"Summer and winter both classify as "
            f"{summer_package['climate']['label']}. One fixed design "
            f"reasonably serves the whole year."
        )
    else:
        design_strategy_note = (
            f"Summer classifies as {summer_package['climate']['label']} "
            f"while winter classifies as {winter_package['climate']['label']}. "
            "A single fixed design would under-serve one season - operable, "
            "seasonally adjustable openings and shading are recommended "
            "rather than a strategy fixed to one extreme."
        )

    return {
        "success": True,
        "engine": ENGINE_NAME,
        "method": ENGINE_METHOD,
        "climate_basis": payload.get("climate_basis", "live_reading_fallback"),
        "normal_period": payload.get("normal_period"),
        "current_conditions": {
            "temperature_c": current.get("temperature"),
            "humidity_percent": current.get("humidity"),
            "wind_speed_mps": current.get("wind_speed"),
            "condition": current.get("condition"),
            "observed_at": current.get("observed_at"),
        },
        "design_strategy": design_strategy,
        "design_strategy_note": design_strategy_note,
        # Primary = summer. Flattened at top level so every existing panel
        # (recommendation, reasoning, scorecard, emissions, parameters,
        # thermal visualisation) keeps working unchanged - summer is the
        # thermally harder constraint in the large majority of sites, and
        # the classic passive-design idiom is "design for the hot season,
        # adapt for the cold one."
        "climate": summer_package["climate"],
        "recommendation": summer_package["recommendation"],
        "reasoning": summer_package["reasoning"],
        "explanations": summer_package["explanations"],
        "heuristic_profile": summer_package["heuristic_profile"],
        "site_adaptation": summer_package["site_adaptation"],
        "emissions": summer_package["emissions"],
        "winter_design": winter_package,
        "emissions_annualised": blend_emissions(
            summer_package["emissions"], winter_package["emissions"]
        ),
    }


def fail(code, message):
    """Emit a machine-readable failure on stdout and stop."""
    sys.stdout.write(json.dumps({
        "success": False,
        "engine": ENGINE_NAME,
        "error": {"code": code, "message": message},
    }))
    sys.stdout.flush()
    sys.exit(2)


def main():
    args = sys.argv[1:]
    if len(args) != 1:
        fail("ENGINE_BAD_ARGUMENTS",
             f"Expected exactly one JSON argument, received {len(args)}.")
        return

    try:
        payload = json.loads(args[0])
    except json.JSONDecodeError as exc:
        fail("ENGINE_BAD_ARGUMENTS", f"Argument was not valid JSON: {exc}")
        return

    try:
        result = run(payload)
    except (KeyError, TypeError, ValueError) as exc:
        fail("ENGINE_BAD_ARGUMENTS", f"Malformed payload: {exc}")
        return

    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:                      # noqa: BLE001 - last resort
        print(f"thermarch engine crashed: {exc}", file=sys.stderr)
        fail("ENGINE_UNHANDLED_ERROR", "The thermal engine failed unexpectedly.")