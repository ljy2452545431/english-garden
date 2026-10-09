import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  makeNode,
  type BoardDocument,
  type BoardNode,
} from "../../utils/board";
import { boardMobileText as t } from "../../i18n/board-mobile";
import {
  Image,
  Text,
  StickyNote,
  Square,
  PenLine,
  Palette,
  RotateCcw,
  X,
  ArrowUp,
  ArrowDown,
  Download,
  MousePointer,
} from "../icons";
import { BoardStage, type BoardStageHandle } from "./components/BoardStage";
import {
  EditorPanel,
  type EditorPanelKind,
  type EditorPanelHandle,
} from "./components/EditorPanel";
import { pushHistory, type BoardHistory } from "./utils/history";
import { boundBox } from "./utils/geometry";
import type { BoardEditorProps } from "./types";
import "./styles.css";
export type { BoardEditorProps } from "./types";

export function BoardEditor({
  document,
  onChange,
  onUpload,
  assetUrls,
  onExit,
  title = t.title,
  onTitleChange,
  onSave,
  onExport,
  canSave,
  busy,
  status,
  onFlushDraft,
}: BoardEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [tool, setTool] = useState<"select" | "pen">("select");
  const [panel, setPanel] = useState<EditorPanelKind | null>(null),
    [ink, setInk] = useState("#283443"),
    [penSize, setPenSize] = useState(16);
  const [history, setHistory] = useState<BoardHistory>({
      past: [],
      future: [],
    }),
    [notice, setNotice] = useState(""),
    [uploading, setUploading] = useState(false),
    [layers, setLayers] = useState(false);
  const latest = useRef(document);
  latest.current = document;
  const historyRef = useRef(history);
  historyRef.current = history;
  const panelRef = useRef<EditorPanelHandle>(null);
  const active = useRef(false),
    stage = useRef<BoardStageHandle>(null),
    dialog = useRef<HTMLDialogElement>(null),
    file = useRef<HTMLInputElement>(null);
  const selected = document.nodes.find((node) => node.id === selectedId);
  useEffect(() => {
    active.current = true;
    const element = dialog.current!;
    element.showModal();
    const before = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";
    const viewport = globalThis.visualViewport;
    const resize = () => {
      element.style.setProperty(
        "--editor-height",
        `${viewport?.height ?? innerHeight}px`,
      );
    };
    resize();
    viewport?.addEventListener("resize", resize);
    return () => {
      active.current = false;
      viewport?.removeEventListener("resize", resize);
      globalThis.document.body.style.overflow = before;
    };
  }, []);
  useEffect(() => {
    const flush = () => {
      panelRef.current?.flush();
      onFlushDraft?.();
    };
    const visibility = () => {
      if (globalThis.document.visibilityState === "hidden") flush();
    };
    globalThis.addEventListener("pagehide", flush);
    globalThis.document.addEventListener("visibilitychange", visibility);
    return () => {
      globalThis.removeEventListener("pagehide", flush);
      globalThis.document.removeEventListener("visibilitychange", visibility);
    };
  }, [onFlushDraft]);
  function commit(next: BoardDocument) {
    if (!active.current || next === latest.current) return;
    const previous = latest.current;
    const nextHistory = pushHistory(historyRef.current, previous);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    latest.current = next;
    onChange(next);
  }
  function patch(patch: Partial<BoardNode>) {
    if (
      !selected ||
      !latest.current.nodes.some((node) => node.id === selected.id)
    )
      return;
    const current = latest.current;
    commit({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selected.id
          ? boundBox({ ...node, ...patch }, current.width, current.height)
          : node,
      ),
    });
  }
  function flushPanel() {
    panelRef.current?.flush();
  }
  function openPanel(next: EditorPanelKind | null) {
    flushPanel();
    setPanel(next);
    setLayers(false);
  }
  function undo() {
    flushPanel();
    const old = historyRef.current,
      previous = old.past.at(-1);
    if (!previous) return;
    const nextHistory = {
      past: old.past.slice(0, -1),
      future: [latest.current, ...old.future],
    };
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    latest.current = previous;
    onChange(previous);
    setSelectedId(null);
    setPanel(null);
  }
  function redo() {
    flushPanel();
    const old = historyRef.current,
      next = old.future[0];
    if (!next) return;
    const nextHistory = {
      past: [...old.past, latest.current].slice(-30),
      future: old.future.slice(1),
    };
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    latest.current = next;
    onChange(next);
    setSelectedId(null);
    setPanel(null);
  }
  function exit() {
    flushPanel();
    onExit?.();
  }
  function add(
    kind: "text" | "note" | "rect" | "ellipse",
    extra: Partial<BoardNode> = {},
  ) {
    flushPanel();
    const current = latest.current;
    if (current.nodes.length >= 100) {
      setNotice(t.limit);
      return;
    }
    const width = current.width * 0.55,
      height = kind === "text" ? current.height * 0.18 : current.height * 0.24;
    const node = makeNode(kind, {
      width,
      height,
      x: (current.width - width) / 2,
      y: (current.height - height) / 2,
      fontSize: Math.min(80, Math.max(24, current.width * 0.048)),
      text: kind === "text" ? t.newText : kind === "note" ? t.newNote : "",
      ...extra,
    });
    commit({
      ...current,
      nodes: [...current.nodes, boundBox(node, current.width, current.height)],
    });
    setSelectedId(node.id);
    setTool("select");
    setPanel(kind === "text" || kind === "note" ? "text" : null);
  }
  async function upload(image?: File) {
    if (!image || uploading) return;
    if (latest.current.nodes.length >= 100) {
      setNotice(t.limit);
      return;
    }
    setUploading(true);
    setNotice(t.upload);
    try {
      const id = await onUpload(image);
      if (!active.current) return;
      flushPanel();
      const current = latest.current;
      if (current.nodes.length >= 100) {
        setNotice(t.limit);
        return;
      }
      const width = current.width * 0.6,
        height = current.height * 0.35;
      const node = makeNode("image", {
        assetId: id,
        width,
        height,
        x: (current.width - width) / 2,
        y: (current.height - height) / 2,
      });
      commit({ ...current, nodes: [...current.nodes, node] });
      setSelectedId(node.id);
      setPanel(null);
      setTool("select");
      setNotice("");
    } catch (cause) {
      if (active.current) setNotice((cause as Error).message || t.imageError);
    } finally {
      if (active.current) setUploading(false);
      if (file.current) file.current.value = "";
    }
  }
  function order(step: number) {
    flushPanel();
    const current = latest.current;
    const nodes = [...current.nodes],
      index = nodes.findIndex((n) => n.id === selectedId);
    if (index < 0) return;
    const next = Math.max(0, Math.min(nodes.length - 1, index + step));
    if (next === index) return;
    const node = nodes[index];
    nodes.splice(index, 1);
    nodes.splice(next, 0, node);
    commit({ ...current, nodes });
  }
  function remove() {
    flushPanel();
    if (!selected) return;
    commit({
      ...latest.current,
      nodes: latest.current.nodes.filter((node) => node.id !== selected.id),
    });
    setSelectedId(null);
    setPanel(null);
  }
  function duplicate() {
    flushPanel();
    const current = latest.current,
      source = current.nodes.find((node) => node.id === selectedId);
    if (!source || current.nodes.length >= 100) return;
    const node = boundBox(
      {
        ...source,
        id: crypto.randomUUID(),
        x: source.x + 30,
        y: source.y + 30,
      },
      current.width,
      current.height,
    );
    commit({ ...current, nodes: [...current.nodes, node] });
    setSelectedId(node.id);
    setPanel(null);
  }
  return createPortal(
    <dialog
      ref={dialog}
      className="creative-editor"
      aria-label={t.title}
      onClickCapture={(event) => {
        if (busy && !(event.target as HTMLElement).closest("[data-exit]")) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        exit();
      }}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input,textarea")) return;
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          event.shiftKey ? redo() : undo();
        }
        if (event.key === "Delete") remove();
      }}
    >
      <header className="ce-header">
        <button data-exit aria-label={t.close} onClick={exit}>
          <X size={20} />
        </button>
        <input
          aria-label={t.titleLabel}
          maxLength={40}
          value={title}
          onChange={(event) => onTitleChange?.(event.target.value)}
        />
        <button
          className="ce-save"
          disabled={busy || !canSave || !title.trim()}
          onClick={() => {
            flushPanel();
            onSave?.();
          }}
        >
          {busy ? t.saving : t.save}
        </button>
      </header>
      <div className="ce-utility">
        <div>
          <button
            aria-label={t.undo}
            disabled={!history.past.length}
            onClick={undo}
          >
            <RotateCcw size={19} />
          </button>
          <button
            aria-label={t.redo}
            disabled={!history.future.length}
            onClick={redo}
          >
            <RotateCcw size={19} style={{ transform: "scaleX(-1)" }} />
          </button>
          <button
            aria-label={t.zoomOut}
            onClick={() => stage.current?.zoom(0.8)}
          >
            −
          </button>
          <button onClick={() => stage.current?.fit()}>{t.fit}</button>
          <button
            aria-label={t.zoomIn}
            onClick={() => stage.current?.zoom(1.25)}
          >
            +
          </button>
        </div>
        <button
          onClick={() => openPanel(panel === "templates" ? null : "templates")}
        >
          {t.inspirations}
        </button>
        <button
          aria-label={t.export}
          disabled={
            busy ||
            uploading ||
            document.nodes.some(
              (node) => node.kind === "image" && !assetUrls[node.assetId!],
            )
          }
          onClick={() => {
            flushPanel();
            onExport?.();
          }}
        >
          <Download size={19} />
        </button>
      </div>
      <main className="ce-canvas-area" inert={busy || undefined}>
        <BoardStage
          ref={stage}
          document={document}
          assetUrls={assetUrls}
          selectedId={selectedId}
          tool={tool}
          ink={ink}
          penSize={penSize}
          onSelect={(id) => {
            flushPanel();
            setSelectedId(id);
            setPanel(null);
            setLayers(false);
          }}
          onCommit={commit}
        />
        {!document.nodes.length && !panel && (
          <div className="ce-empty">
            <p>{t.empty}</p>
            <span>{t.emptyHint}</span>
            <button onClick={() => openPanel("templates")}>
              {t.inspirations}
            </button>
          </div>
        )}
        {panel && (
          <div className="ce-sheet">
            <EditorPanel
              ref={panelRef}
              panel={panel}
              selected={selected}
              document={document}
              ink={ink}
              penSize={penSize}
              onPatch={patch}
              onDocumentChange={commit}
              onAdd={add}
              onTemplate={(next) => {
                flushPanel();
                if (document.nodes.length && !confirm(t.templateConfirm))
                  return;
                commit(next);
                setSelectedId(null);
                setPanel(null);
                setTool("select");
                requestAnimationFrame(() => stage.current?.fit());
              }}
              onInk={setInk}
              onPenSize={setPenSize}
              onClose={() => openPanel(null)}
            />
          </div>
        )}
        {layers && (
          <div className="ce-sheet ce-elements">
            <button onClick={() => setLayers(false)}>{t.closeElements}</button>
            {document.nodes.map((node, index) => (
              <button
                key={node.id}
                aria-pressed={selectedId === node.id}
                onClick={() => {
                  setSelectedId(node.id);
                  setLayers(false);
                }}
              >
                {index + 1}.{" "}
                {node.text.slice(0, 24) ||
                  {
                    image: t.image,
                    stroke: t.draw,
                    rect: t.shape,
                    ellipse: t.shape,
                    text: t.text,
                    note: t.note,
                  }[node.kind]}
              </button>
            ))}
          </div>
        )}
      </main>
      <div className="ce-context">
        {selected && tool === "select" ? (
          <>
            {(selected.kind === "text" || selected.kind === "note") && (
              <button onClick={() => openPanel("text")}>{t.edit}</button>
            )}
            <button onClick={() => openPanel("style")}>
              <Palette size={17} />
              {t.settings}
            </button>
            <button onClick={duplicate}>{t.copy}</button>
            <button aria-label={t.up} onClick={() => order(1)}>
              <ArrowUp size={18} />
            </button>
            <button aria-label={t.down} onClick={() => order(-1)}>
              <ArrowDown size={18} />
            </button>
            <button onClick={remove}>{t.remove}</button>
          </>
        ) : (
          <span>{tool === "pen" ? t.penHint : t.hint}</span>
        )}
      </div>
      <footer className="ce-footer">
        <nav aria-label={t.title}>
          <button disabled={uploading} onClick={() => file.current?.click()}>
            <Image size={22} />
            <span>{t.image}</span>
          </button>
          <button onClick={() => add("text")}>
            <Text size={22} />
            <span>{t.text}</span>
          </button>
          <button onClick={() => add("note")}>
            <StickyNote size={22} />
            <span>{t.note}</span>
          </button>
          <button
            aria-pressed={panel === "shapes"}
            onClick={() => openPanel(panel === "shapes" ? null : "shapes")}
          >
            <Square size={22} />
            <span>{t.shape}</span>
          </button>
          <button
            aria-pressed={tool === "pen"}
            onClick={() => {
              flushPanel();
              setSelectedId(null);
              setTool(tool === "pen" ? "select" : "pen");
              setPanel(tool === "pen" ? null : "draw");
            }}
          >
            {tool === "pen" ? (
              <MousePointer size={22} />
            ) : (
              <PenLine size={22} />
            )}
            <span>{tool === "pen" ? t.select : t.draw}</span>
          </button>
          <button
            aria-pressed={panel === "style"}
            onClick={() => openPanel(panel === "style" ? null : "style")}
          >
            <Palette size={22} />
            <span>{t.style}</span>
          </button>
        </nav>
        <div className="ce-status">
          <span role="status">
            {notice || status || (canSave ? t.local : t.login)}
          </span>
          <button
            aria-label={t.elements}
            onClick={() => {
              flushPanel();
              setLayers(!layers);
              setPanel(null);
            }}
          >
            {t.elements} {document.nodes.length}
          </button>
        </div>
      </footer>
      <input
        type="file"
        ref={file}
        hidden
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
    </dialog>,
    globalThis.document.body,
  );
}
export default BoardEditor;
