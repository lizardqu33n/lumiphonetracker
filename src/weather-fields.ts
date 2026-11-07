import { placeholder } from "./record-values";

export const WEATHER_CONDITIONS = {
  sunny: "Sunny", clear_night: "Clear night", partly_cloudy: "Partly cloudy",
  cloudy: "Cloudy", rain: "Rain", storm: "Storm", snow: "Snow", fog: "Fog", windy: "Windy", other: "Other",
} as const;
export type WeatherCondition = keyof typeof WEATHER_CONDITIONS;
export const WEATHER_DETAILS = ["temperature", "weather_description", "weather_alert"] as const;
export type WeatherDetail = typeof WEATHER_DETAILS[number];
export const WEATHER_KEYS = ["weather", ...WEATHER_DETAILS] as const;
export const WEATHER_SWITCHES = {
  weather: "weather", temperature: "weather.temperature",
  weather_description: "weather.description", weather_alert: "weather.alert",
} as const;
export const WEATHER_EXTRAS = ["weather.description", "weather.alert", "weather.time", "weather.date", "scene.season"] as const;

export function displayCondition(text: string): { kind: WeatherCondition; label: string } {
  const key = text.trim().toLowerCase().replaceAll(" ", "_");
  if (Object.hasOwn(WEATHER_CONDITIONS, key)) {
    const kind = key as WeatherCondition;
    return { kind, label: WEATHER_CONDITIONS[kind] };
  }
  return { kind: "other", label: text.startsWith("other | ") ? text.slice(8) : text };
}

export function validateCondition(text: string): string {
  const other = /^other \| (.+)$/i.exec(text);
  if (other && validWeatherText(other[1], 100)) return `other | ${other[1].trim()}`;
  const key = text.trim().toLowerCase().replaceAll(" ", "_");
  if (key !== "other" && Object.hasOwn(WEATHER_CONDITIONS, key)) return key.replaceAll("_", " ");
  throw Error("Choose a listed weather condition or write an Other condition.");
}

export function temperatureParts(value: string): {number: string; unit?: string} | undefined {
  const match = /^([+-]?(?:\d{1,6}(?:\.\d{1,6})?|\.\d{1,6}))(?:\s*°?\s*([FC]))?$/i.exec(value.trim().replaceAll("\u2212","-"));
  if (!match) return;
  return { number: match[1], ...(match[2] ? {unit: match[2].toUpperCase()} : {}) };
}

export function validWeatherText(value: string, limit: number): boolean {
  return !!value.trim() && value.length <= limit && !placeholder(value) && !/[<>\u0000\r\n]/.test(value) && !value.includes(" | ");
}

export const WEATHER_ALERT_ENDED = "ended";
export function alertEndedIn(quote: string): boolean {
  return /\b(?:alert|warning|advisory|watch|all clear)\b/i.test(quote) &&
    /\b(?:ended|lifted|expired|cancel[le]*d|called off|no longer (?:active|in effect)|all clear)\b/i.test(quote) &&
    !/\b(?:not|never|will|might|could)\b/i.test(quote);
}

/** Require the stated figure, without matching a substring of a different number. */
export function statedTemperature(value: string, prose: string): boolean {
  const parts = temperatureParts(value);
  if (!parts) return false;
  const figures = prose.replaceAll("\u2212","-").matchAll(/(?<![\d.])([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?!\d|\.\d)(?:\s*(?:degrees?\s*|°\s*)?(Fahrenheit|Celsius|[FC])\b)?/gi);
  return [...figures].some(([, number, unit]) => number === parts.number &&
    (!parts.unit || unit?.[0].toUpperCase() === parts.unit));
}
