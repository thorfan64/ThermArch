export function placeLabel(location) {
  if (!location) return "";
  return [location.name, location.state, location.country].filter(Boolean).join(", ");
}

export function coordLabel(location) {
  if (!location) return "";
  const { latitude, longitude } = location;
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(2)}° ${ns}, ${Math.abs(longitude).toFixed(2)}° ${ew}`;
}

export function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Thermal ramp. Colour here always encodes temperature, never decoration. */
export function temperatureColor(celsius) {
  if (celsius < 10) return "#57A9E2";
  if (celsius < 24) return "#63BFA4";
  if (celsius < 32) return "#E3A23C";
  return "#DD6A50";
}

export function climateColor(classification) {
  return (
    {
      cold: "#57A9E2",
      moderate: "#63BFA4",
      hot_dry: "#E3A23C",
      hot_humid: "#DD6A50",
    }[classification] || "#63BFA4"
  );
}

/** OpenWeatherMap's 1-5 air pollution index. */
export function aqiColor(aqiIndex) {
  return (
    {
      1: "#63BFA4",
      2: "#57A9E2",
      3: "#E3A23C",
      4: "#DD6A50",
      5: "#B84A38",
    }[aqiIndex] || "#9DB4C6"
  );
}

/** WHO/EPA-style UV bands. */
export function uvColor(category) {
  return (
    {
      Low: "#63BFA4",
      Moderate: "#57A9E2",
      High: "#E3A23C",
      "Very High": "#DD6A50",
      Extreme: "#B84A38",
    }[category] || "#9DB4C6"
  );
}
