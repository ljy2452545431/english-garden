import { lazy, Suspense, useEffect, useState } from "react";
import { loadBoard } from "../@apis/boards";
import { emptyBoard, validBoard, type BoardDocument } from "../utils/board";
import { useBoardImages } from "../hooks/useBoardImages";
import { boardStudioText as t } from "../i18n/board-studio";
const View = lazy(() =>
  import("./BoardEditor/BoardView").then((module) => ({
    default: module.BoardView,
  })),
);
type Props = { id: string; owner: string; token?: string; onHide: () => void };
export function BoardDecoration(props: Props) {
  return (
    <DecorationSession
      key={`${props.owner}:${props.token ?? ""}:${props.id}`}
      {...props}
    />
  );
}
function DecorationSession({ id, owner, token, onHide }: Props) {
  const [document, setDocument] = useState<BoardDocument>(emptyBoard);
  const [title, setTitle] = useState(""),
    [error, setError] = useState(""),
    [full, setFull] = useState(false);
  const images = useBoardImages(document, owner, token);
  useEffect(() => {
    let cancelled = false;
    if (token)
      void loadBoard(token, id)
        .then((result) => {
          if (cancelled) return;
          if (!validBoard(result.board.document)) throw new Error(t.loadError);
          setDocument(result.board.document);
          setTitle(result.board.title);
        })
        .catch((cause) => {
          if (!cancelled) setError((cause as Error).message);
        });
    return () => {
      cancelled = true;
    };
  }, [id, owner, token]);
  return (
    <section className={"board-decoration " + (full ? "expanded" : "")}>
      <div className="row justify-between">
        <strong>{title || t.used}</strong>
        <div className="row">
          <button className="text-button" onClick={() => setFull(!full)}>
            {full ? t.close : t.expand}
          </button>
          <button className="text-button" onClick={onHide}>
            {t.hide}
          </button>
        </div>
      </div>
      {!token ? (
        <p className="muted">{t.auth}</p>
      ) : error || images.error ? (
        <p role="alert">{error || images.error}</p>
      ) : title ? (
        <Suspense fallback={<p>{t.loading}</p>}>
          <View document={document} assetUrls={images.urls} />
        </Suspense>
      ) : (
        <p role="status">{t.loading}</p>
      )}
    </section>
  );
}
