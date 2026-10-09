import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { BoardDocument, BoardNode } from "../../../utils/board";
import { boardCreativeText as t } from "../../../i18n/board-creative";
import { X, Square, Circle, StickyNote, Text } from "../../icons";
import { createTemplate, templateIds } from "../utils/templates";
import { BoardView } from "../BoardView";
import "./panel.css";

export type EditorPanelKind =
  "text" | "style" | "shapes" | "templates" | "draw";
export type EditorPanelHandle = { flush: () => void };
export type EditorPanelProps = {
  panel: EditorPanelKind;
  selected?: BoardNode;
  document: BoardDocument;
  ink: string;
  penSize: number;
  onPatch: (patch: Partial<BoardNode>) => void;
  onDocumentChange: (doc: BoardDocument) => void;
  onAdd: (kind: "text" | "note" | "rect" | "ellipse") => void;
  onTemplate: (doc: BoardDocument) => void;
  onInk: (color: string) => void;
  onPenSize: (size: number) => void;
  onClose: () => void;
};
const colors = [
  "#FFFFFF",
  "#FAF8F4",
  "#E9DED0",
  "#F2DFDD",
  "#DCE4DB",
  "#D6E4E9",
  "#C79E9C",
  "#294D5B",
  "#3D493E",
  "#5A4148",
];
const sizes = [32, 48, 64, 80];
const icons = { text: Text, note: StickyNote, rect: Square, ellipse: Circle };
function Swatches({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  return (
    <fieldset className="ce-field">
      <legend>{label}</legend>
      <div className="ce-swatches">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${t.colorName} ${color}`}
            aria-pressed={value.toUpperCase() === color}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </fieldset>
  );
}
/** 输入缓冲仅在明确结束时提交，避免每个按键生成整张作品与撤销快照。 */
export const EditorPanel = forwardRef<EditorPanelHandle, EditorPanelProps>(
  function EditorPanel(props, ref) {
    const {
      panel,
      selected,
      document,
      ink,
      penSize,
      onPatch,
      onDocumentChange,
      onAdd,
      onTemplate,
      onInk,
      onPenSize,
      onClose,
    } = props;
    const headingId = useId(),
      [text, setText] = useState(selected?.text ?? ""),
      [rotation, setRotation] = useState(selected?.rotation ?? 0);
    const submittedText = useRef(selected?.text ?? ""),
      submittedRotation = useRef(selected?.rotation ?? 0);
    useEffect(() => {
      setText(selected?.text ?? "");
      submittedText.current = selected?.text ?? "";
    }, [selected?.id, selected?.text]);
    useEffect(() => {
      setRotation(selected?.rotation ?? 0);
      submittedRotation.current = selected?.rotation ?? 0;
    }, [selected?.id, selected?.rotation]);
    function finishText() {
      if (selected && text !== submittedText.current) {
        submittedText.current = text;
        onPatch({ text });
      }
    }
    function finishRotation() {
      if (selected && rotation !== submittedRotation.current) {
        submittedRotation.current = rotation;
        onPatch({ rotation });
      }
    }
    useImperativeHandle(ref, () => ({
      flush() {
        finishText();
        finishRotation();
      },
    }));
    const writable = selected?.kind === "text" || selected?.kind === "note";
    return (
      <aside className="ce-panel" role="dialog" aria-labelledby={headingId}>
        <header className="ce-panel__header">
          <h3 id={headingId}>{t.panels[panel]}</h3>
          <button
            type="button"
            className="icon-button"
            aria-label={t.close}
            onClick={() => {
              finishText();
              finishRotation();
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </header>
        <div className="ce-panel__body">
          {panel === "text" &&
            (writable ? (
              <div className="ce-text">
                <label htmlFor={`${headingId}-text`}>{t.text}</label>
                <textarea
                  id={`${headingId}-text`}
                  value={text}
                  maxLength={4000}
                  onChange={(event) => setText(event.target.value)}
                  onBlur={finishText}
                />
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    finishText();
                    onClose();
                  }}
                >
                  {t.finishText}
                </button>
              </div>
            ) : (
              <p className="muted">{t.selectText}</p>
            ))}
          {panel === "style" && (
            <>
              <Swatches
                label={t.background}
                value={document.background}
                onChange={(background) =>
                  onDocumentChange({ ...document, background })
                }
              />
              {selected ? (
                <>
                  {selected.kind !== "image" && selected.kind !== "stroke" && (
                    <Swatches
                      label={t.fill}
                      value={selected.fill}
                      onChange={(fill) => onPatch({ fill })}
                    />
                  )}
                  {(writable || selected.kind === "stroke") && (
                    <Swatches
                      label={t.elementColor}
                      value={selected.color}
                      onChange={(color) => onPatch({ color })}
                    />
                  )}
                  {writable && (
                    <fieldset className="ce-field">
                      <legend>{t.size}</legend>
                      <div className="ce-options">
                        {sizes.map((fontSize) => (
                          <button
                            type="button"
                            key={fontSize}
                            aria-pressed={selected.fontSize === fontSize}
                            onClick={() => onPatch({ fontSize })}
                          >
                            {fontSize}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <label className="ce-slider">
                    {t.rotation}
                    <output>{rotation}°</output>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={rotation}
                      onChange={(event) =>
                        setRotation(Number(event.target.value))
                      }
                      onPointerUp={finishRotation}
                      onKeyUp={finishRotation}
                      onBlur={finishRotation}
                    />
                  </label>
                  <details className="ce-advanced">
                    <summary>{t.advanced}</summary>
                    <div className="ce-options">
                      {(["width", "height"] as const).map((key) => (
                        <label key={key}>
                          {t[key]}
                          <input
                            type="number"
                            min={24}
                            max={document[key]}
                            value={selected[key]}
                            onChange={(event) => {
                              const value = event.target.valueAsNumber;
                              if (Number.isFinite(value))
                                onPatch({
                                  [key]: Math.min(
                                    document[key],
                                    Math.max(24, value),
                                  ),
                                });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                </>
              ) : (
                <p className="muted">{t.selectStyle}</p>
              )}
            </>
          )}
          {panel === "shapes" && (
            <div className="ce-options ce-shapes">
              {(Object.keys(icons) as (keyof typeof icons)[]).map((kind) => {
                const Icon = icons[kind];
                return (
                  <button type="button" key={kind} onClick={() => onAdd(kind)}>
                    <Icon size={24} />
                    <span>{t.shapeNames[kind]}</span>
                  </button>
                );
              })}
            </div>
          )}
          {panel === "templates" && (
            <>
              <p className="muted">{t.templateHint}</p>
              <div className="ce-template-grid">
                {templateIds.map((id) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => onTemplate(createTemplate(id))}
                  >
                    <span className="ce-template-preview" aria-hidden="true">
                      <BoardView document={createTemplate(id)} assetUrls={{}} />
                    </span>
                    <strong>{t.templateNames[id]}</strong>
                  </button>
                ))}
              </div>
            </>
          )}
          {panel === "draw" && (
            <>
              <Swatches label={t.brushColor} value={ink} onChange={onInk} />
              <label className="ce-slider">
                {t.brushSize}
                <output>{penSize}</output>
                <input
                  type="range"
                  min={8}
                  max={120}
                  value={penSize}
                  onChange={(event) => onPenSize(Number(event.target.value))}
                />
              </label>
            </>
          )}
        </div>
      </aside>
    );
  },
);
