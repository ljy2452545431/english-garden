import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Garden } from "../hooks/useGarden";
import { useBoardImages } from "../hooks/useBoardImages";
import {
  listBoards,
  loadBoard,
  saveBoard,
  removeBoard,
  uploadBoardAsset,
} from "../@apis/boards";
import {
  emptyBoard,
  validBoard,
  type BoardDocument,
  type BoardSummary,
} from "../utils/board";
import {
  readDraft,
  writeDraft,
  writeImage,
  type BoardDraft,
} from "../utils/board-storage";
import { prepareImage, exportBoardPng } from "../utils/board-images";
import { boardStudioText as t } from "../i18n/board-studio";
import {
  Palette,
  ArrowUpRight,
  RefreshCw,
  Download,
  Image as ImageIcon,
} from "./icons";
import "../styles/board-studio.css";

const Editor = lazy(() =>
  import("./BoardEditor").then((module) => ({ default: module.BoardEditor })),
);
const View = lazy(() =>
  import("./BoardEditor/BoardView").then((module) => ({
    default: module.BoardView,
  })),
);
type Props = { garden: Garden; onApply: (id: string) => void };
const newDraft = (): BoardDraft => ({
  title: t.defaultTitle,
  document: emptyBoard(),
});

/** 身份改变立即重建子树，旧账号作品不会等待 effect 清理后才消失。 */
export function BoardStudio(props: Props) {
  const auth = props.garden.auth;
  return (
    <BoardStudioSession
      key={`${auth?.user.id ?? "preview"}:${auth?.token ?? ""}`}
      {...props}
    />
  );
}

function BoardStudioSession({ garden, onApply }: Props) {
  const token = garden.auth?.token,
    owner = garden.auth?.user.id ?? "preview";
  const active = useRef(false),
    locked = useRef(false),
    galleryRequest = useRef(0);
  const [draft, setDraft] = useState<BoardDraft>(newDraft);
  const [editorSession, setEditorSession] = useState(0);
  const [open, setOpen] = useState(false),
    [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false),
    [boards, setBoards] = useState<BoardSummary[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(Boolean(token));
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const { urls, error: imageError } = useBoardImages(
    draft.document,
    owner,
    token,
  );

  async function refresh() {
    if (!token || !active.current || locked.current) return;
    const request = ++galleryRequest.current;
    setGalleryLoading(true);
    setError("");
    try {
      const result = await listBoards(token);
      if (active.current && request === galleryRequest.current)
        setBoards(result.boards);
    } catch (cause) {
      if (active.current && request === galleryRequest.current)
        setError((cause as Error).message);
    } finally {
      if (active.current && request === galleryRequest.current)
        setGalleryLoading(false);
    }
  }

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    void readDraft(owner)
      .then((value) => {
        if (!cancelled && active.current)
          setDraft(value && validBoard(value.document) ? value : newDraft());
      })
      .catch((cause) => {
        if (!cancelled && active.current) setError((cause as Error).message);
      })
      .finally(() => {
        if (!cancelled && active.current) setReady(true);
      });
    void refresh();
    return () => {
      cancelled = true;
      active.current = false;
      galleryRequest.current += 1;
    };
  }, [owner, token]);

  function update(next: BoardDraft) {
    if (!active.current) return;
    latestDraft.current = next;
    setDraft(next);
    setMessage("");
    void writeDraft(owner, next).catch((cause) => {
      if (active.current) setError((cause as Error).message);
    });
  }

  function beginOperation() {
    if (locked.current || !active.current) return false;
    locked.current = true;
    setBusy(true);
    setError("");
    // 已在读取的旧列表不能在保存/删除之后覆盖新的作品元数据。
    galleryRequest.current += 1;
    setGalleryLoading(false);
    return true;
  }
  function endOperation() {
    if (!active.current) return;
    locked.current = false;
    setBusy(false);
  }
  function requireSession() {
    if (!active.current) throw new Error(t.accountChanged);
  }

  async function upload(file: File) {
    requireSession();
    const blob = await prepareImage(file);
    requireSession();
    const asset = token
      ? await uploadBoardAsset(token, blob)
      : { id: crypto.randomUUID() };
    requireSession();
    await writeImage(owner, asset.id, blob);
    requireSession();
    return asset.id;
  }

  async function save(copy = false) {
    if (!token || !draft.title.trim() || !beginOperation()) return;
    const submitted = draft;
    setMessage(t.saving);
    try {
      const result = await saveBoard(
        token,
        submitted.title.trim(),
        submitted.document,
        copy ? undefined : submitted.id,
        copy ? undefined : submitted.version,
      );
      if (!active.current) return;
      const board = result.board;
      // 保存等待时用户仍可编辑；只更新云端身份，不覆盖刚刚画出的内容。
      update({ ...latestDraft.current, id: board.id, version: board.version });
      setMessage(
        latestDraft.current.document === submitted.document &&
          latestDraft.current.title === submitted.title
          ? t.saved
          : t.savedEarlier,
      );
      setBoards((previous) => [
        {
          id: board.id,
          title: board.title,
          version: board.version,
          userId: board.userId,
          displayName: board.displayName,
          updatedAt: board.updatedAt,
        },
        ...previous.filter((item) => item.id !== board.id),
      ]);
    } catch (cause) {
      if (active.current) {
        setMessage("");
        setError((cause as Error).message);
      }
    } finally {
      endOperation();
    }
  }

  async function edit(id: string) {
    if (!token || !beginOperation()) return;
    try {
      const result = await loadBoard(token, id);
      if (!active.current) return;
      const board = result.board;
      if (!validBoard(board.document)) throw new Error(t.loadError);
      update({
        id: board.id,
        version: board.version,
        title: board.title,
        document: board.document,
      });
      setEditorSession((value) => value + 1);
      setOpen(true);
    } catch (cause) {
      if (active.current) setError((cause as Error).message);
    } finally {
      endOperation();
    }
  }

  async function remove(board: BoardSummary) {
    if (!token || !confirm(t.confirmDelete) || !beginOperation()) return;
    try {
      await removeBoard(token, board.id);
      if (!active.current) return;
      setBoards((previous) => previous.filter((item) => item.id !== board.id));
      const current = latestDraft.current;
      if (current.id === board.id)
        update({ title: current.title, document: current.document });
      setMessage(t.deleted);
    } catch (cause) {
      if (active.current) setError((cause as Error).message);
    } finally {
      endOperation();
    }
  }

  async function exportImage() {
    const svg = stage.current?.querySelector<SVGSVGElement>(
      ".board-export-source svg",
    );
    if (!svg || !beginOperation()) return;
    try {
      await exportBoardPng(svg, draft.title);
    } catch (cause) {
      if (active.current) setError((cause as Error).message);
    } finally {
      endOperation();
    }
  }
  const missingImages =
    Object.values(urls).length <
    new Set(
      draft.document.nodes
        .filter((node) => node.kind === "image")
        .map((node) => node.assetId),
    ).size;
  return (
    <section className="board-studio" aria-label={t.title}>
      <div className="board-studio-heading">
        <div>
          <span className="row">
            <Palette size={20} />
            <h2>{t.title}</h2>
          </span>
          <p className="muted">{t.intro}</p>
        </div>
        <div className="row flex-wrap">
          <button
            className="button primary"
            disabled={!ready || busy}
            onClick={() => setOpen(!open)}
          >
            <ArrowUpRight size={17} />
            {open ? t.close : t.open}
          </button>
          <button
            className="button secondary"
            disabled={!ready || busy}
            onClick={() => {
              if (draft.document.nodes.length && !confirm(t.confirmNew)) return;
              update(newDraft());
              setEditorSession((value) => value + 1);
              setOpen(true);
            }}
          >
            {t.new}
          </button>
        </div>
      </div>
      {open && ready && (
        <div ref={stage} className="board-workspace">
          <div className="board-save-bar">
            <label htmlFor="board-title">{t.name}</label>
            <input
              id="board-title"
              maxLength={40}
              value={draft.title}
              onChange={(event) =>
                update({ ...draft, title: event.target.value })
              }
            />
            <div className="row flex-wrap">
              <button
                className="button primary"
                disabled={busy || !token || !draft.title.trim()}
                onClick={() => void save()}
              >
                {busy ? t.saving : t.save}
              </button>
              {draft.id && (
                <button
                  className="button secondary"
                  disabled={busy || !token}
                  onClick={() => void save(true)}
                >
                  {t.saveCopy}
                </button>
              )}
              <button
                className="button secondary"
                disabled={busy || !draft.id}
                onClick={() => {
                  if (draft.id) {
                    onApply(draft.id);
                    setMessage(t.applied);
                  }
                }}
              >
                {t.apply}
              </button>
              <button
                className="button secondary"
                disabled={busy || missingImages}
                onClick={() => void exportImage()}
              >
                <Download size={17} />
                {t.export}
              </button>
            </div>
          </div>
          <p className="muted">{token ? t.local : t.auth}</p>
          <Suspense fallback={<p role="status">{t.loading}</p>}>
            <Editor
              key={`${owner}:${editorSession}`}
              document={draft.document}
              onChange={(document: BoardDocument) =>
                update({ ...latestDraft.current, document })
              }
              onUpload={upload}
              assetUrls={urls}
            />
            <div className="board-export-source" aria-hidden="true">
              <View document={draft.document} assetUrls={urls} />
            </div>
          </Suspense>
          <p className="muted">{t.limit}</p>
        </div>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {(error || imageError) && (
        <p role="alert" className="notice">
          {error || imageError}
        </p>
      )}
      <div className="board-gallery">
        <div className="row justify-between">
          <h3>{t.gallery}</h3>
          {token && (
            <button
              className="icon-button"
              disabled={busy || galleryLoading}
              onClick={() => void refresh()}
              aria-label={t.refresh}
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
        {!token ? (
          <p className="muted">{t.auth}</p>
        ) : galleryLoading ? (
          <p role="status" className="muted">
            {t.galleryLoading}
          </p>
        ) : !boards.length ? (
          <p className="muted">{t.empty}</p>
        ) : (
          <div className="board-gallery-grid">
            {boards.map((board) => (
              <article className="board-gallery-item" key={board.id}>
                <ImageIcon size={22} />
                <strong>{board.title}</strong>
                <p className="muted">
                  {t.owner}：{board.displayName} · {t.version} {board.version}
                </p>
                <div className="row flex-wrap">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void edit(board.id)}
                  >
                    {t.edit}
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      onApply(board.id);
                      setMessage(t.applied);
                    }}
                  >
                    {t.apply}
                  </button>
                  {board.userId === owner && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void remove(board)}
                    >
                      {t.remove}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
