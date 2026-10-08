import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import { BookOpen, Heart, Leaf, Sun, Trash2, RotateCcw } from "./icons";
import type { Preferences } from "../utils/preferences";
import { canvasText as t } from "../i18n/canvas";
import {
  moveCard,
  nearestCard,
  normalizedPoint,
  type Point,
} from "../utils/canvas";
import "../styles/creative-canvas.css";

const symbols = { leaf: Leaf, sun: Sun, heart: Heart, book: BookOpen };
const labels: Record<string, string> = {
  tasks: t.tasks,
  timer: t.timer,
  growth: t.growth,
  note: t.note,
};
const examples: Record<string, string> = {
  tasks: t.taskExample,
  timer: t.timerExample,
  growth: t.growthExample,
  note: t.noteExample,
};
const colors: Record<string, string[]> = {
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
type Drag = {
  kind: "card" | "sticker";
  id: string;
  pointer: number;
  capture: HTMLButtonElement;
  element: HTMLElement;
  start: Point;
  offset: Point;
  point: Point;
  target?: string;
  centers?: { id: string; x: number; y: number }[];
};

export function CreativeCanvas({
  prefs,
  onChange,
}: {
  prefs: Preferences;
  onChange: (next: Preferences) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const decorations = prefs.decorations ?? [];
  const selectedSticker = decorations.find((item) => item.id === selected);
  const [bg, paper, base, ink] = colors[prefs.theme] ?? colors.garden;
  const style = {
    "--canvas-bg": bg,
    "--canvas-paper": paper,
    "--canvas-ink": ink,
    "--canvas-accent":
      accents[prefs.accent]?.[prefs.theme === "night" ? 1 : 0] ?? base,
  } as CSSProperties;

  function clearDrag() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (current.capture.hasPointerCapture(current.pointer))
      current.capture.releasePointerCapture(current.pointer);
    current.element.removeAttribute("data-dragging");
    current.element.style.removeProperty("transform");
    cards.current
      ?.querySelectorAll("[data-drop-target]")
      .forEach((el) => el.removeAttribute("data-drop-target"));
  }
  useEffect(() => {
    clearDrag();
  }, [prefs]);
  useEffect(() => () => clearDrag(), []);

  function startCard(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!event.isPrimary || event.button !== 0) return;
    clearDrag();
    const element = event.currentTarget.closest<HTMLElement>("[data-card-id]");
    if (!element) return;
    const centers = Array.from(
      cards.current?.querySelectorAll<HTMLElement>("[data-card-id]") ?? [],
    ).map((item) => {
      const rect = item.getBoundingClientRect();
      return {
        id: item.dataset.cardId!,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });
    const origin = centers.find((item) => item.id === id)!;
    drag.current = {
      kind: "card",
      id,
      pointer: event.pointerId,
      capture: event.currentTarget,
      element,
      start: { x: event.clientX, y: event.clientY },
      offset: { x: event.clientX - origin.x, y: event.clientY - origin.y },
      point: origin,
      centers,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    element.dataset.dragging = "true";
  }

  function startSticker(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!event.isPrimary || event.button !== 0 || !stage.current) return;
    clearDrag();
    const sticker = decorations.find((item) => item.id === id);
    if (!sticker) return;
    setSelected(id);
    const rect = stage.current.getBoundingClientRect();
    drag.current = {
      kind: "sticker",
      id,
      pointer: event.pointerId,
      capture: event.currentTarget,
      element: event.currentTarget,
      start: { x: sticker.x, y: sticker.y },
      point: { x: sticker.x, y: sticker.y },
      offset: {
        x: event.clientX - rect.left - sticker.x * rect.width,
        y: event.clientY - rect.top - sticker.y * rect.height,
      },
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "true";
  }

  function track(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (current.kind === "sticker" && stage.current) {
      const rect = stage.current.getBoundingClientRect();
      current.point = normalizedPoint(
        event.clientX,
        event.clientY,
        rect,
        current.offset,
      );
      const x = (current.point.x - current.start.x) * rect.width;
      const y = (current.point.y - current.start.y) * rect.height;
      current.element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(var(--sticker-rotation))`;
    } else if (current.kind === "card") {
      const x = event.clientX - current.start.x;
      const y = event.clientY - current.start.y;
      current.element.style.transform = `translate(${x}px, ${y}px)`;
      current.target = nearestCard(
        event.clientX - current.offset.x,
        event.clientY - current.offset.y,
        current.centers ?? [],
      );
      cards.current
        ?.querySelectorAll<HTMLElement>("[data-card-id]")
        .forEach((el) => {
          if (
            el.dataset.cardId === current.target &&
            current.target !== current.id
          )
            el.dataset.dropTarget = "true";
          else el.removeAttribute("data-drop-target");
        });
    }
  }

  function finish(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    track(event);
    const completed = { ...current };
    clearDrag();
    if (completed.kind === "sticker") {
      onChange({
        ...prefs,
        decorations: decorations.map((item) =>
          item.id === completed.id ? { ...item, ...completed.point } : item,
        ),
      });
      setAnnouncement(t.moved);
    } else if (completed.target && completed.target !== completed.id) {
      onChange({
        ...prefs,
        order: moveCard(prefs.order, completed.id, completed.target),
      });
      setAnnouncement(t.reordered);
    }
  }

  function keyCard(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    const offset = ["ArrowUp", "ArrowLeft"].includes(event.key)
      ? -1
      : ["ArrowDown", "ArrowRight"].includes(event.key)
        ? 1
        : 0;
    if (!offset) return;
    event.preventDefault();
    const target = prefs.order[prefs.order.indexOf(id) + offset];
    if (target) {
      onChange({ ...prefs, order: moveCard(prefs.order, id, target) });
      setAnnouncement(t.reordered);
    }
  }
  function removeSticker(id: string) {
    clearDrag();
    onChange({
      ...prefs,
      decorations: decorations.filter((item) => item.id !== id),
    });
    setSelected(null);
    setAnnouncement(t.removed);
  }
  function keySticker(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSticker(id);
      return;
    }
    const delta = {
      ArrowLeft: [-0.025, 0],
      ArrowRight: [0.025, 0],
      ArrowUp: [0, -0.05],
      ArrowDown: [0, 0.05],
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    onChange({
      ...prefs,
      decorations: decorations.map((item) =>
        item.id === id
          ? {
              ...item,
              x: Math.max(0, Math.min(1, item.x + delta[0])),
              y: Math.max(0, Math.min(1, item.y + delta[1])),
            }
          : item,
      ),
    });
    setAnnouncement(t.moved);
  }
  function addSticker(kind: keyof typeof symbols) {
    if (decorations.length >= 8) return;
    const id = crypto.randomUUID();
    onChange({
      ...prefs,
      decorations: [
        ...decorations,
        {
          id,
          kind,
          x: 0.15 + (decorations.length % 4) * 0.23,
          y: decorations.length < 4 ? 0.3 : 0.7,
          rotation: 0,
        },
      ],
    });
    setSelected(id);
    setAnnouncement(t.added);
  }
  const handlers = {
    onPointerMove: track,
    onPointerUp: finish,
    onPointerCancel: () => clearDrag(),
    onLostPointerCapture: () => clearDrag(),
  };

  return (
    <section
      className="creative-canvas"
      style={style}
      data-card={prefs.card}
      data-texture={prefs.texture}
      data-corners={prefs.corners}
      data-layout={prefs.layout}
      aria-label={t.title}
    >
      <div className="creative-canvas__intro">
        <strong>{t.title}</strong>
        <p>{t.hint}</p>
      </div>
      <div className="creative-canvas__paper">
        <div className="creative-canvas__sticker-area">
          {!decorations.length && (
            <span className="creative-canvas__empty">{t.stickerEmpty}</span>
          )}
          <div className="creative-canvas__sticker-plane" ref={stage}>
            {decorations.map((item) => {
              const Icon = symbols[item.kind];
              return (
                <button
                  key={item.id}
                  type="button"
                  className="creative-canvas__sticker"
                  style={
                    {
                      left: `${item.x * 100}%`,
                      top: `${item.y * 100}%`,
                      "--sticker-rotation": `${item.rotation}deg`,
                    } as CSSProperties
                  }
                  data-selected={selected === item.id}
                  aria-label={`${t.moveSticker}${t[item.kind]}；${t.stickerHelp}`}
                  onFocus={() => setSelected(item.id)}
                  onPointerDown={(event) => startSticker(event, item.id)}
                  onKeyDown={(event) => keySticker(event, item.id)}
                  {...handlers}
                >
                  <Icon size={29} />
                </button>
              );
            })}
          </div>
        </div>
        <div className="creative-canvas__cards" ref={cards}>
          {prefs.order.map((id, index) => (
            <article
              key={id}
              className="creative-canvas__card"
              data-card-id={id}
              data-hidden={prefs.hidden.includes(id)}
            >
              <div className="creative-canvas__card-head">
                <span className="creative-canvas__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{labels[id]}</strong>
                <button
                  type="button"
                  className="creative-canvas__handle"
                  aria-label={`${t.move}${labels[id]}`}
                  onPointerDown={(event) => startCard(event, id)}
                  onKeyDown={(event) => keyCard(event, id)}
                  {...handlers}
                >
                  <span className="creative-canvas__grip" aria-hidden="true" />
                </button>
              </div>
              {prefs.hidden.includes(id) ? (
                <p>{t.hidden}</p>
              ) : (
                <>
                  <p>{examples[id]}</p>
                  {id === "tasks" && (
                    <div
                      className="creative-canvas__task-lines"
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                  {id === "timer" && (
                    <span className="creative-canvas__clock">25:00</span>
                  )}
                  {id === "growth" && (
                    <div className="creative-canvas__growth" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                  {id === "note" && (
                    <div
                      className="creative-canvas__note-line"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="creative-canvas__tools">
        <strong>{t.stickerTitle}</strong>
        <p>{t.stickerHint}</p>
        <div className="creative-canvas__tool-row">
          {(Object.keys(symbols) as (keyof typeof symbols)[]).map((kind) => {
            const Icon = symbols[kind];
            return (
              <button
                key={kind}
                type="button"
                className="creative-canvas__tool"
                onClick={() => addSticker(kind)}
                disabled={decorations.length >= 8}
              >
                <Icon size={22} />
                <span>{t[kind]}</span>
              </button>
            );
          })}
        </div>
        {decorations.length >= 8 && <p>{t.stickerFull}</p>}
        <div className="creative-canvas__selection-tools">
          <button
            type="button"
            disabled={!selectedSticker}
            onClick={() => selected && removeSticker(selected)}
          >
            <Trash2 size={17} />
            {t.remove}
          </button>
          <button
            type="button"
            disabled={!selectedSticker}
            onClick={() =>
              onChange({
                ...prefs,
                decorations: decorations.map((item) =>
                  item.id === selected
                    ? {
                        ...item,
                        rotation:
                          item.rotation >= 30 ? -30 : item.rotation + 15,
                      }
                    : item,
                ),
              })
            }
          >
            <RotateCcw size={17} />
            {t.rotate}
          </button>
        </div>
      </div>
      <span
        className="creative-canvas__announcement"
        role="status"
        aria-live="polite"
      >
        {announcement}
      </span>
    </section>
  );
}
