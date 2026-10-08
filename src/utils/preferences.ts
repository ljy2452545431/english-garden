/** 外观只存本机；与学习记录、账号和云端同步完全分离。 */
export type Appearance = {
  theme: string;
  density: string;
  font: string;
  motion: string;
  order: string[];
  card: string;
  texture: string;
  corners: string;
  accent: string;
  layout: string;
  hidden: string[];
  decorations: Decoration[];
};
export type Decoration = {
  id: string;
  kind: "leaf" | "sun" | "heart" | "book";
  x: number;
  y: number;
  rotation: number;
};
export type SavedLook = { id: string; name: string; appearance: Appearance };
export type Preferences = Appearance & { looks: SavedLook[] };
export const defaults: Preferences = {
  theme: "garden",
  density: "comfortable",
  font: "normal",
  motion: "low",
  order: ["tasks", "timer", "growth", "note"],
  hidden: [],
  card: "soft",
  texture: "plain",
  corners: "rounded",
  accent: "theme",
  layout: "balanced",
  looks: [],
  decorations: [],
};
const choices: Record<string, string[]> = {
  theme: ["garden", "cream", "rose", "ocean", "night"],
  density: ["comfortable", "compact"],
  font: ["normal", "large"],
  motion: ["full", "low", "none"],
  card: ["soft", "outlined", "flat"],
  texture: ["plain", "dots", "grid"],
  corners: ["rounded", "square"],
  accent: ["theme", "ink", "berry", "blue", "forest"],
  layout: ["balanced", "focus"],
};
function appearance(value: unknown): Appearance {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const result = Object.fromEntries(
    Object.entries(choices).map(([key, allowed]) => [
      key,
      allowed.includes(source[key] as string)
        ? source[key]
        : defaults[key as keyof Appearance],
    ]),
  );
  const order = source.order;
  return {
    ...result,
    decorations: Array.isArray(source.decorations)
      ? source.decorations
          .filter(
            (item, index, items) =>
              item &&
              typeof item.id === "string" &&
              /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
                item.id,
              ) &&
              items.findIndex((other) => other?.id === item.id) === index &&
              ["leaf", "sun", "heart", "book"].includes(item.kind) &&
              [item.x, item.y, item.rotation].every(Number.isFinite) &&
              item.x >= 0 &&
              item.x <= 1 &&
              item.y >= 0 &&
              item.y <= 1 &&
              item.rotation >= -30 &&
              item.rotation <= 30,
          )
          .slice(0, 8)
          .map((item) => ({
            id: item.id.slice(0, 100),
            kind: item.kind,
            x: item.x,
            y: item.y,
            rotation: item.rotation,
          }))
      : [],
    order:
      Array.isArray(order) &&
      order.length === 4 &&
      new Set(order).size === 4 &&
      order.every((key) => defaults.order.includes(key))
        ? [...order]
        : [...defaults.order],
    hidden: Array.isArray(source.hidden)
      ? [
          ...new Set(
            source.hidden.filter((key) =>
              ["timer", "growth", "note"].includes(key),
            ),
          ),
        ]
      : [],
  } as Appearance;
}
export function normalizePreferences(value: unknown): Preferences {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const looks = Array.isArray(source.looks)
    ? source.looks
        .filter(
          (item) =>
            item &&
            typeof item.name === "string" &&
            typeof item.id === "string" &&
            item.appearance &&
            typeof item.appearance === "object",
        )
        .slice(0, 6)
        .map((item) => ({
          id: item.id.slice(0, 100),
          name: item.name.slice(0, 24),
          appearance: appearance(item.appearance),
        }))
    : [];
  return { ...appearance(source), looks };
}
export function readPreferences(): Preferences {
  try {
    return normalizePreferences(
      JSON.parse(localStorage.getItem("english-garden.preferences") ?? "null"),
    );
  } catch {
    return normalizePreferences(null);
  }
}
export function saveLook(prefs: Preferences, name: string): Preferences {
  if (!name.trim()) return prefs;
  return {
    ...prefs,
    looks: [
      {
        id: crypto.randomUUID(),
        name: name.trim().slice(0, 24),
        appearance: appearance(prefs),
      },
      ...prefs.looks,
    ].slice(0, 6),
  };
}
