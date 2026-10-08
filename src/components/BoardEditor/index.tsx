import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  makeNode,
  type BoardDocument,
  type BoardNode,
  type BoardKind,
} from "../../utils/board";
import { boardEditorZh as t } from "../../i18n/board-editor";
import {
  ArrowDown,
  ArrowUp,
  MousePointer,
  Move,
  Text,
  StickyNote,
  Circle,
  PenLine,
  RotateCcw,
  Square,
  Upload,
  X,
} from "../icons";
import { NodeDrawing, nodeTransform } from "./BoardView";
import { boundBox, clamp, localPoint } from "./utils/geometry";
import { pushHistory, type BoardHistory } from "./utils/history";
import "./styles.css";
export { BoardView } from "./BoardView";
import type { BoardEditorProps, Tool, Gesture } from "./types";
export type { BoardEditorProps } from "./types";
const colors = [
  "#283443",
  "#E5EBF2",
  "#FFF1B8",
  "#E8DDD3",
  "#C5D7CD",
  "#D7CFEB",
  "#EEBEB8",
  "#FFFFFF",
];
const toolIcons = {
  select: MousePointer,
  pan: Move,
  pen: PenLine,
  text: Text,
  note: StickyNote,
  rect: Square,
  ellipse: Circle,
};
export function BoardEditor({
  document,
  onChange,
  onUpload,
  assetUrls,
  onExit,
}: BoardEditorProps) {
  const [tool, setTool] = useState<Tool>("select"),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1),
    [notice, setNotice] = useState(""),
    [uploading, setUploading] = useState(false);
  const [ink, setInk] = useState("#283443"),
    [penSize, setPenSize] = useState(16),
    [panel, setPanel] = useState(false);
  const [history, setHistory] = useState<BoardHistory>({
    past: [],
    future: [],
  });
  const [handleSize, setHandleSize] = useState(80);
  const svgRef = useRef<SVGSVGElement>(null),
    viewportRef = useRef<HTMLDivElement>(null),
    fileRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef(document);
  documentRef.current = document;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const gesture = useRef<Gesture | null>(null),
    draftRef = useRef<SVGPolylineElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = () =>
      setHandleSize(
        (28 * document.width) / Math.max(1, svg.getBoundingClientRect().width),
      );
    const observer = new ResizeObserver(update);
    observer.observe(svg);
    update();
    return () => observer.disconnect();
  }, [document.width, zoom]);
  const selected = document.nodes.find((node) => node.id === selectedId);
  const commit = (next: BoardDocument) => {
    if (!mounted.current) return;
    setHistory((old) => pushHistory(old, documentRef.current));
    onChange(next);
  };
  const changeNode = (patch: Partial<BoardNode>) => {
    if (!selected) return;
    commit({
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === selected.id
          ? boundBox({ ...node, ...patch }, document.width, document.height)
          : node,
      ),
    });
  };
  function undo() {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory({
      past: history.past.slice(0, -1),
      future: [document, ...history.future],
    });
    onChange(previous);
    setSelectedId(null);
  }
  function redo() {
    const next = history.future[0];
    if (!next) return;
    setHistory({
      past: [...history.past, document],
      future: history.future.slice(1),
    });
    onChange(next);
    setSelectedId(null);
  }
  function addNode(node: BoardNode) {
    if (!mounted.current) return;
    const current = documentRef.current;
    if (current.nodes.length >= 100) {
      setNotice(t.limit);
      return;
    }
    commit({
      ...current,
      nodes: [...current.nodes, boundBox(node, current.width, current.height)],
    });
    setSelectedId(node.id);
    setTool("select");
  }
  function point(event: ReactPointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    return localPoint(
      event.clientX,
      event.clientY,
      rect,
      document.width,
      document.height,
    );
  }
  function begin(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || gesture.current) return;
    const position = point(event),
      target = event.target as SVGElement;
    const id = target.closest("[data-node-id]")?.getAttribute("data-node-id");
    const node = document.nodes.find((item) => item.id === id);
    if (tool === "pan") {
      gesture.current = {
        pointerId: event.pointerId,
        mode: "pan",
        start: [event.clientX, event.clientY],
        scroll: [
          viewportRef.current!.scrollLeft,
          viewportRef.current!.scrollTop,
        ],
      };
    } else if (tool === "pen") {
      if (document.nodes.length >= 100) {
        setNotice(t.limit);
        return;
      }
      gesture.current = {
        pointerId: event.pointerId,
        mode: "draw",
        start: position,
        points: [position],
      };
      draftRef.current?.setAttribute("points", `${position[0]},${position[1]}`);
    } else if (tool !== "select") {
      addNode(
        makeNode(tool as BoardKind, {
          x: position[0],
          y: position[1],
          text: tool === "note" || tool === "text" ? t.missingText : "",
        }),
      );
      return;
    } else if (node) {
      setSelectedId(node.id);
      gesture.current = {
        pointerId: event.pointerId,
        mode: target.hasAttribute("data-resize") ? "resize" : "move",
        start: position,
        node,
      };
    } else {
      setSelectedId(null);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function move(event: ReactPointerEvent<SVGSVGElement>) {
    const state = gesture.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.mode === "pan") {
      viewportRef.current!.scrollLeft =
        state.scroll![0] - event.clientX + state.start[0];
      viewportRef.current!.scrollTop =
        state.scroll![1] - event.clientY + state.start[1];
      return;
    }
    const position = point(event);
    if (state.mode === "draw") {
      const last = state.points!.at(-1)!;
      if (Math.hypot(last[0] - position[0], last[1] - position[1]) < 2) return;
      if (state.points!.length >= 2000) {
        setNotice(t.pointLimit);
        return;
      }
      const clipped: [number, number] = [
        clamp(position[0], 0, document.width),
        clamp(position[1], 0, document.height),
      ];
      state.points = [...state.points!, clipped];
      draftRef.current?.setAttribute(
        "points",
        state.points.map((p) => p.join(",")).join(" "),
      );
      return;
    }
    const node = state.node!,
      dx = position[0] - state.start[0],
      dy = position[1] - state.start[1];
    const radians = (node.rotation * Math.PI) / 180;
    const localDx = dx * Math.cos(radians) + dy * Math.sin(radians),
      localDy = -dx * Math.sin(radians) + dy * Math.cos(radians);
    state.preview =
      state.mode === "move"
        ? boundBox(
            { ...node, x: node.x + dx, y: node.y + dy },
            document.width,
            document.height,
          )
        : boundBox(
            {
              ...node,
              width: node.width + localDx,
              height: node.height + localDy,
            },
            document.width,
            document.height,
          );
    const group = svgRef.current?.querySelector<SVGGElement>(
      `[data-node-id="${node.id}"]`,
    );
    if (state.mode === "move")
      group?.setAttribute(
        "transform",
        nodeTransform({ ...node, ...state.preview }),
      );
    else {
      group?.setAttribute(
        "transform",
        `${nodeTransform(node)} scale(${state.preview.width! / node.width} ${state.preview.height! / node.height})`,
      );
    }
  }
  function finish(event: ReactPointerEvent<SVGSVGElement>, cancelled = false) {
    const state = gesture.current;
    if (!state || state.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (state.mode === "draw") {
      draftRef.current?.setAttribute("points", "");
      if (cancelled || state.points!.length < 2) return;
      const points = state.points!,
        xs = points.map((p) => p[0]),
        ys = points.map((p) => p[1]);
      const x = Math.min(...xs),
        y = Math.min(...ys),
        width = Math.max(24, Math.max(...xs) - x),
        height = Math.max(24, Math.max(...ys) - y);
      addNode(
        makeNode("stroke", {
          x,
          y,
          width,
          height,
          color: ink,
          fontSize: penSize,
          points: points.map(([px, py]) => [
            (px - x) / width,
            (py - y) / height,
          ]),
        }),
      );
      setTool("pen");
    } else if (state.node) {
      svgRef.current
        ?.querySelector(`[data-node-id="${state.node.id}"]`)
        ?.setAttribute("transform", nodeTransform(state.node));
      if (!cancelled && state.preview)
        commit({
          ...document,
          nodes: document.nodes.map((node) =>
            node.id === state.node!.id ? { ...node, ...state.preview } : node,
          ),
        });
    }
  }
  async function upload(file?: File) {
    if (!file || uploading) return;
    if (document.nodes.length >= 100) {
      setNotice(t.limit);
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setNotice(t.invalidImage);
      return;
    }
    setUploading(true);
    setNotice(t.uploading);
    try {
      const assetId = await onUpload(file);
      if (!mounted.current) return;
      addNode(
        makeNode("image", {
          assetId,
          x: 80,
          y: 80,
          width: Math.min(480, document.width),
          height: Math.min(360, document.height),
        }),
      );
      setNotice("");
    } catch {
      if (mounted.current) setNotice(t.uploadError);
    } finally {
      if (mounted.current) setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function reorder(direction: number) {
    if (!selected) return;
    const index = document.nodes.findIndex((node) => node.id === selected.id),
      next = clamp(index + direction, 0, document.nodes.length - 1);
    const nodes = document.nodes.filter((node) => node.id !== selected.id);
    nodes.splice(next, 0, selected);
    commit({ ...document, nodes });
  }
  function resizeCanvas(width: number, height: number) {
    commit({
      ...document,
      width,
      height,
      nodes: document.nodes.map((node) => boundBox(node, width, height)),
    });
  }
  const numeric = (
    key: "width" | "height" | "rotation" | "fontSize",
    min: number,
    max: number,
  ) => (
    <label>
      {t[key]}
      <input
        type="number"
        min={min}
        max={max}
        value={selected![key]}
        onChange={(event) => {
          const number = event.target.valueAsNumber;
          if (Number.isFinite(number))
            changeNode({ [key]: clamp(number, min, max) });
        }}
      />
    </label>
  );
  return (
    <section className="board-editor" aria-label={t.title}>
      <div className="board-editor__header">
        <div>
          <h3>{t.title}</h3>
          <p>{t.hint}</p>
        </div>
        {onExit && (
          <button className="board-editor__finish" onClick={onExit}>
            {t.exit}
          </button>
        )}
      </div>
      <div
        className="board-editor__toolbar"
        role="toolbar"
        aria-label={t.title}
      >
        {(Object.keys(t.tools) as Tool[]).map((key) => {
          const Icon = toolIcons[key];
          return (
            <button
              key={key}
              title={t.tools[key]}
              aria-pressed={tool === key}
              onClick={() => setTool(key)}
            >
              <Icon size={18} />
              <span>{t.tools[key]}</span>
            </button>
          );
        })}
        <button onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Upload size={18} />
          <span>{t.upload}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => void upload(event.target.files?.[0])}
        />
      </div>
      <div className="board-editor__status">
        <p>{notice || t.addHint}</p>
        <div>
          <button
            aria-label={t.undo}
            disabled={!history.past.length}
            onClick={undo}
          >
            <RotateCcw size={18} />
          </button>
          <button
            aria-label={t.redo}
            disabled={!history.future.length}
            onClick={redo}
          >
            <RotateCcw size={18} style={{ transform: "scaleX(-1)" }} />
          </button>
          <button aria-expanded={panel} onClick={() => setPanel(!panel)}>
            {t.properties}
          </button>
        </div>
      </div>
      <div className="board-editor__workspace">
        <div
          className="board-editor__viewport"
          ref={viewportRef}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void upload(event.dataTransfer.files[0]);
          }}
        >
          <div
            className="board-editor__paper"
            style={{
              width: `${zoom * 100}%`,
              minWidth: zoom > 1 ? `${zoom * 100}%` : undefined,
              aspectRatio: `${document.width}/${document.height}`,
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${document.width} ${document.height}`}
              aria-label={t.drawing}
              role="application"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  (event.ctrlKey || event.metaKey) &&
                  event.key.toLowerCase() === "z"
                ) {
                  event.preventDefault();
                  if (event.shiftKey) redo();
                  else undo();
                }
                if (!selected) return;
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  commit({
                    ...document,
                    nodes: document.nodes.filter(
                      (node) => node.id !== selected.id,
                    ),
                  });
                  setSelectedId(null);
                }
                const directions: Record<string, [number, number]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                };
                const direction = directions[event.key];
                if (direction) {
                  event.preventDefault();
                  const step = event.shiftKey ? 10 : 1;
                  changeNode({
                    x: selected.x + direction[0] * step,
                    y: selected.y + direction[1] * step,
                  });
                }
              }}
              onPointerDown={begin}
              onPointerMove={move}
              onPointerUp={(event) => finish(event)}
              onPointerCancel={(event) => finish(event, true)}
              style={{
                background: document.background,
                cursor:
                  tool === "pan"
                    ? "grab"
                    : tool === "select"
                      ? "default"
                      : "crosshair",
              }}
            >
              {document.nodes.map((node) => (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  transform={nodeTransform(node)}
                  onDoubleClick={() => {
                    setSelectedId(node.id);
                    setPanel(true);
                  }}
                >
                  <NodeDrawing node={node} assetUrls={assetUrls} />
                  <rect
                    width={node.width}
                    height={node.height}
                    fill="transparent"
                    stroke={selectedId === node.id ? "#3676E8" : "none"}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  {selectedId === node.id && (
                    <rect
                      data-resize="true"
                      x={node.width - handleSize / 2}
                      y={node.height - handleSize / 2}
                      width={handleSize}
                      height={handleSize}
                      rx={handleSize / 2}
                      fill="#FFFFFF"
                      stroke="#3676E8"
                      strokeWidth={3}
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: "nwse-resize" }}
                    />
                  )}
                </g>
              ))}
              <polyline
                ref={draftRef}
                fill="none"
                stroke={ink}
                strokeWidth={penSize / 4}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            </svg>
          </div>
        </div>
        <aside className={`board-editor__inspector ${panel ? "is-open" : ""}`}>
          <button
            className="board-editor__close"
            onClick={() => setPanel(false)}
            aria-label={t.exit}
          >
            <X size={18} />
          </button>
          <h4>{selected ? t.edit : t.canvas}</h4>
          {selected ? (
            <>
              {(selected.kind === "text" || selected.kind === "note") && (
                <label>
                  {t.text}
                  <textarea
                    maxLength={4000}
                    value={selected.text}
                    onChange={(event) =>
                      changeNode({ text: event.target.value })
                    }
                  />
                </label>
              )}
              <div className="board-editor__fields">
                {numeric("width", 24, document.width)}
                {numeric("height", 24, document.height)}
                {numeric("rotation", -180, 180)}
                {numeric("fontSize", 8, 120)}
              </div>
              <label>
                {t.color}
                <input
                  type="color"
                  value={selected.color}
                  onChange={(event) =>
                    changeNode({ color: event.target.value })
                  }
                />
              </label>
              {selected.kind !== "image" && selected.kind !== "stroke" && (
                <label>
                  {t.fill}
                  <input
                    type="color"
                    value={
                      selected.fill === "transparent"
                        ? "#FFFFFF"
                        : selected.fill
                    }
                    onChange={(event) =>
                      changeNode({ fill: event.target.value })
                    }
                  />
                </label>
              )}
              <div className="board-editor__swatches">
                {colors.map((color) => (
                  <button
                    key={color}
                    aria-label={`${t.fill} ${color}`}
                    style={{ background: color }}
                    onClick={() => changeNode({ fill: color })}
                  />
                ))}
              </div>
              <div className="board-editor__actions">
                <button
                  onClick={() =>
                    changeNode({ x: (document.width - selected.width) / 2 })
                  }
                >
                  {t.alignX}
                </button>
                <button
                  onClick={() =>
                    changeNode({ y: (document.height - selected.height) / 2 })
                  }
                >
                  {t.alignY}
                </button>
                <button onClick={() => reorder(1)}>
                  <ArrowUp size={16} />
                  {t.up}
                </button>
                <button onClick={() => reorder(-1)}>
                  <ArrowDown size={16} />
                  {t.down}
                </button>
                <button
                  onClick={() =>
                    addNode({
                      ...selected,
                      id: crypto.randomUUID(),
                      x: selected.x + 24,
                      y: selected.y + 24,
                    })
                  }
                >
                  {t.duplicate}
                </button>
                <button
                  onClick={() => {
                    commit({
                      ...document,
                      nodes: document.nodes.filter(
                        (node) => node.id !== selected.id,
                      ),
                    });
                    setSelectedId(null);
                  }}
                >
                  {t.remove}
                </button>
              </div>
            </>
          ) : (
            <p>{t.selectHint}</p>
          )}
          <hr />
          <label>
            {t.background}
            <input
              type="color"
              value={document.background}
              onChange={(event) =>
                commit({ ...document, background: event.target.value })
              }
            />
          </label>
          <div className="board-editor__actions">
            <button onClick={() => resizeCanvas(1600, 1000)}>
              {t.landscape}
            </button>
            <button onClick={() => resizeCanvas(1000, 1600)}>
              {t.portrait}
            </button>
            <button onClick={() => resizeCanvas(1200, 1200)}>{t.square}</button>
          </div>
          <div className="board-editor__fields">
            <label>
              {t.width}
              <input
                type="number"
                min={200}
                max={4096}
                value={document.width}
                onChange={(event) => {
                  if (Number.isFinite(event.target.valueAsNumber))
                    resizeCanvas(
                      clamp(event.target.valueAsNumber, 200, 4096),
                      document.height,
                    );
                }}
              />
            </label>
            <label>
              {t.height}
              <input
                type="number"
                min={200}
                max={4096}
                value={document.height}
                onChange={(event) => {
                  if (Number.isFinite(event.target.valueAsNumber))
                    resizeCanvas(
                      document.width,
                      clamp(event.target.valueAsNumber, 200, 4096),
                    );
                }}
              />
            </label>
          </div>
          <label>
            {t.color}
            <input
              type="color"
              value={ink}
              onChange={(event) => setInk(event.target.value)}
            />
          </label>
          <label>
            {t.penSize}
            <input
              type="range"
              min={8}
              max={120}
              value={penSize}
              onChange={(event) => setPenSize(Number(event.target.value))}
            />
          </label>
        </aside>
      </div>
      <div className="board-editor__zoom">
        <button
          aria-label={t.zoomOut}
          onClick={() => setZoom((old) => clamp(old - 0.25, 0.25, 2))}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label={t.zoomIn}
          onClick={() => setZoom((old) => clamp(old + 0.25, 0.25, 2))}
        >
          +
        </button>
        <button onClick={() => setZoom(1)}>{t.fit}</button>
        <span>{document.nodes.length} / 100</span>
      </div>
    </section>
  );
}
export default BoardEditor;

