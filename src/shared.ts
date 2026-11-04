export const EXTENSION_NAME = "Lumi Phone Tracker";
export const BUILD_STEP = 6;
export const TRACKER_TAG = "phone-state";
export const TEXT_TAG = "phone-text";

export const TRACKER_FIELDS = ["location", "time", "present", "details", "weather", "notes"] as const;
export type TrackerField = typeof TRACKER_FIELDS[number];
export type TrackerPatch = Partial<{
  location: string;
  time: string;
  present: string[];
  details: string;
  weather: string;
  notes: string[];
}>;
export type ItemSwitches = Record<TrackerField | "messages", boolean>;
export const DEFAULT_ITEMS: Readonly<ItemSwitches> = Object.freeze({
  location: true, time: true, present: true, details: true,
  weather: true, notes: true, messages: true,
});

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function enabledPatch(patch: TrackerPatch, items: ItemSwitches): TrackerPatch {
  return Object.fromEntries(Object.entries(patch).filter(([key]) => items[key as TrackerField]));
}
