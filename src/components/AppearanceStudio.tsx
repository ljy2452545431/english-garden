import { useRef, useState, type CSSProperties } from "react";
import type { Garden } from "../hooks/useGarden";
import { SharedLooks } from "./SharedLooks";
import { CreativeCanvas } from "./CreativeCanvas";
import { ArrowUp, ArrowDown, Check, Palette } from "./icons";
import { zh as t } from "../i18n/zh";
import { appearanceText as a } from "../i18n/appearance";
import {
  defaults,
  saveLook,
  type Preferences,
  type Appearance,
} from "../utils/preferences";

const palettes: Record<string, string[]> = {
  garden: ["#f4f6f4", "#ffffff", "#32664c", "#233c30"],
  cream: ["#f7f5f1", "#fffdf8", "#896039", "#4d3e30"],
  rose: ["#faf5f7", "#fffafb", "#974764", "#583c48"],
  ocean: ["#f3f7f9", "#fbfeff", "#2c6578", "#2e4a50"],
  night: ["#151e24", "#1e2a32", "#a9c69a", "#e7eee4"],
};
const accents: Record<string, string[]> = {
  ink: ["#303942", "#d6dde4"],
  berry: ["#93485f", "#edacc1"],
  blue: ["#3260a1", "#abcafb"],
  forest: ["#31634e", "#a8d6bb"],
};
const presets: Partial<Appearance>[] = [
  {
    theme: "garden",
    accent: "theme",
    card: "soft",
    texture: "plain",
    corners: "rounded",
    layout: "balanced",
  },
  {
    theme: "rose",
    accent: "berry",
    card: "outlined",
    texture: "dots",
    corners: "rounded",
    layout: "balanced",
  },
  {
    theme: "ocean",
    accent: "blue",
    card: "soft",
    texture: "plain",
    corners: "rounded",
    layout: "focus",
  },
  {
    theme: "garden",
    accent: "ink",
    card: "flat",
    texture: "plain",
    corners: "square",
    layout: "focus",
  },
  {
    theme: "night",
    accent: "theme",
    card: "soft",
    texture: "plain",
    corners: "rounded",
    layout: "focus",
  },
  {
    theme: "cream",
    accent: "ink",
    card: "outlined",
    texture: "grid",
    corners: "square",
    layout: "balanced",
  },
];
function move(order: string[], index: number, offset: number) {
  const next = [...order];
  [next[index], next[index + offset]] = [next[index + offset], next[index]];
  return next;
}
const names: Record<string, string> = {
  tasks: t.checklist,
  timer: t.timer,
  growth: t.progress,
  note: t.note,
};
function previewStyle(prefs: Partial<Appearance>): CSSProperties {
  const [bg, paper, base, ink] = palettes[prefs.theme ?? "garden"];
  const accent =
    accents[prefs.accent ?? "theme"]?.[prefs.theme === "night" ? 1 : 0] ?? base;
  return {
    "--preview-bg": bg,
    "--preview-paper": paper,
    "--preview-accent": accent,
    "--preview-ink": ink,
  } as CSSProperties;
}
function LookPreview({
  prefs,
  small = false,
}: {
  prefs: Partial<Appearance>;
  small?: boolean;
}) {
  return (
    <div
      className={`look-preview ${small ? "look-preview--small" : ""}`}
      data-card={prefs.card}
      data-texture={prefs.texture}
      data-corners={prefs.corners}
      style={previewStyle(prefs)}
      aria-hidden="true"
    >
      <div className="look-preview__bar">
        <span />
        <i />
        <i />
      </div>
      <div className="look-preview__heading">
        {small ? "" : a.lesson}
        <span>{small ? "" : a.lessonHint}</span>
      </div>
      <div className="look-preview__modules" data-layout={prefs.layout}>
        {(prefs.order ?? defaults.order)
          .filter((key) => !(prefs.hidden ?? []).includes(key))
          .map((key) => (
            <div
              className={`look-preview__module look-preview__module--${key}`}
              key={key}
            >
              {!small && <strong>{names[key]}</strong>}
              {key === "tasks" ? (
                <>
                  <div className="look-preview__task">
                    <i />
                    {!small && a.previewTask}
                  </div>
                  <div className="look-preview__task">
                    <i />
                    {!small && a.previewTask2}
                  </div>
                </>
              ) : key === "timer" ? (
                <span className="look-preview__timer">
                  {small ? "" : "25:00"}
                </span>
              ) : (
                <div className="look-preview__line" />
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
export function AppearanceStudio({
  prefs,
  setPrefs,
  garden,
}: {
  garden: Garden;
  prefs: Preferences;
  setPrefs: (next: Preferences) => void;
}) {
  const previous = useRef<Preferences | null>(null);
  const [canUndo, setCanUndo] = useState(false),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  function change(next: Preferences, notice = "") {
    previous.current = prefs;
    setCanUndo(true);
    setPrefs(next);
    setMessage(notice);
  }
  function choose(key: keyof Appearance, value: string) {
    change({ ...prefs, [key]: value });
  }
  function choices(key: keyof Appearance, values: string[]) {
    return (
      <fieldset className="studio-field">
        <legend>{a[key as keyof typeof a] as string}</legend>
        <div className="studio-options">
          {values.map((value) => (
            <button
              key={value}
              type="button"
              className="studio-option"
              aria-pressed={prefs[key] === value}
              onClick={() => choose(key, value)}
            >
              {a.options[value] ?? t[value as keyof typeof t]}
              {prefs[key] === value && <Check size={14} />}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <section className="appearance-studio" aria-label={a.title}>
      <div className="studio-preview-panel">
        <div className="row justify-between">
          <h2>{a.preview}</h2>
          <Palette size={20} />
        </div>
        <CreativeCanvas prefs={prefs} onChange={(next) => change(next)} />
        <p className="muted mt-3">{a.previewNote}</p>
        <div className="row flex-wrap">
          <button
            className="button secondary"
            disabled={!canUndo}
            onClick={() => {
              if (previous.current) {
                setPrefs(previous.current);
                previous.current = null;
                setCanUndo(false);
                setMessage(a.undoNotice);
              }
            }}
          >
            {a.undo}
          </button>
          <button
            className="text-button"
            onClick={() =>
              change({ ...defaults, looks: prefs.looks }, a.resetNotice)
            }
          >
            {a.reset}
          </button>
        </div>
        <p className="studio-status" role="status">
          {message || t.device}
        </p>
      </div>
      <div className="studio-controls">
        <SharedLooks
          garden={garden}
          prefs={prefs}
          onApply={(appearance) => change({ ...prefs, ...appearance })}
        />
        <section className="studio-section">
          <h2>{a.preset}</h2>
          <div className="studio-presets">
            {presets.map((preset, i) => (
              <button
                className="studio-preset"
                key={i}
                onClick={() => change({ ...prefs, ...preset })}
                aria-label={`${a.apply}：${a.presets[i]}`}
              >
                <LookPreview prefs={preset} small />
                <span>{a.presets[i]}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="studio-section">
          <h2>{a.palette}</h2>
          <div className="studio-palette">
            {Object.keys(palettes).map((theme) => (
              <button
                className="studio-swatch"
                key={theme}
                aria-pressed={prefs.theme === theme}
                onClick={() => choose("theme", theme)}
              >
                <span
                  style={{
                    background: palettes[theme][0],
                    borderColor: palettes[theme][2],
                  }}
                >
                  <i style={{ background: palettes[theme][2] }} />
                  {prefs.theme === theme && <Check size={15} />}
                </span>
                {a.options[theme]}
              </button>
            ))}
          </div>
          {choices("accent", ["theme", "ink", "berry", "blue", "forest"])}
        </section>
        <section className="studio-section">
          <h2>{a.material}</h2>
          {choices("card", ["soft", "outlined", "flat"])}
          {choices("texture", ["plain", "dots", "grid"])}
          {choices("corners", ["rounded", "square"])}
        </section>
        <section className="studio-section">
          <h2>{a.modules}</h2>
          {choices("layout", ["balanced", "focus"])}
          <p className="muted">{a.moduleNote}</p>
          <div className="studio-module-list">
            {prefs.order.map((key, index) => (
              <div className="studio-module-row" key={key}>
                <span>{names[key]}</span>
                <div className="row gap-1">
                  <button
                    className="icon-button"
                    disabled={index === 0}
                    aria-label={`${names[key]}${t.moveUp}`}
                    onClick={() =>
                      change({ ...prefs, order: move(prefs.order, index, -1) })
                    }
                  >
                    <ArrowUp size={17} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={index === 3}
                    aria-label={`${names[key]}${t.moveDown}`}
                    onClick={() =>
                      change({ ...prefs, order: move(prefs.order, index, 1) })
                    }
                  >
                    <ArrowDown size={17} />
                  </button>
                  {key === "tasks" ? (
                    <span className="studio-always">{a.always}</span>
                  ) : (
                    <button
                      className="studio-toggle"
                      aria-pressed={!prefs.hidden.includes(key)}
                      aria-label={`${names[key]}：${prefs.hidden.includes(key) ? a.show : a.hide}`}
                      onClick={() =>
                        change({
                          ...prefs,
                          hidden: prefs.hidden.includes(key)
                            ? prefs.hidden.filter((value) => value !== key)
                            : [...prefs.hidden, key],
                        })
                      }
                    >
                      <span />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="studio-section">
          <h2>{a.reading}</h2>
          {choices("font", ["normal", "large"])}
          {choices("density", ["comfortable", "compact"])}
          {choices("motion", ["full", "low", "none"])}
        </section>
        <section className="studio-section">
          <h2>{a.saved}</h2>
          <form
            className="studio-save row"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) {
                change(saveLook(prefs, name), a.savedNotice);
                setName("");
              }
            }}
          >
            <label className="sr-only" htmlFor="look-name">
              {a.name}
            </label>
            <input
              id="look-name"
              value={name}
              maxLength={24}
              placeholder={a.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button className="button primary" disabled={!name.trim()}>
              {a.save}
            </button>
          </form>
          <p className="muted mt-3">{a.limit}</p>
          {prefs.looks.length === 0 ? (
            <p className="muted">{a.empty}</p>
          ) : (
            <div className="studio-saved-list">
              {prefs.looks.map((look) => (
                <div className="studio-saved" key={look.id}>
                  <button
                    className="studio-preset"
                    aria-label={`${a.apply}：${look.name}`}
                    onClick={() => change({ ...prefs, ...look.appearance })}
                  >
                    <LookPreview prefs={look.appearance} small />
                    <span>{look.name}</span>
                  </button>
                  <button
                    className="text-button"
                    aria-label={`${a.remove}：${look.name}`}
                    onClick={() =>
                      change(
                        {
                          ...prefs,
                          looks: prefs.looks.filter(
                            (item) => item.id !== look.id,
                          ),
                        },
                        a.removedNotice,
                      )
                    }
                  >
                    {t.delete}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
