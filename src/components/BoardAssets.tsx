import { useRef, useState } from "react";
import {
  listBoardAssets,
  removeBoardAsset,
  type BoardAsset,
} from "../@apis/boards";
import { boardAssetsText as t } from "../i18n/board-assets";
export function BoardAssets({ token }: { token?: string }) {
  const identity = useRef(token);
  identity.current = token;
  const [assets, setAssets] = useState<BoardAsset[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    if (!token || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await listBoardAssets(token);
      if (identity.current === token) setAssets(result.assets);
    } catch (e) {
      if (identity.current === token) setError((e as Error).message);
    } finally {
      if (identity.current === token) setBusy(false);
    }
  }
  if (!token) return null;
  return (
    <details
      className="board-assets"
      onToggle={(event) => {
        if (event.currentTarget.open) void refresh();
      }}
    >
      <summary>{t.title}</summary>
      <p className="muted">{t.intro}</p>
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => void refresh()}
      >
        {t.refresh}
      </button>
      {busy && <p role="status">{t.loading}</p>}
      <div className="board-asset-list">
        {assets.map((asset) => (
          <div className="row justify-between" key={asset.id}>
            <span>
              {asset.mime.split("/")[1].toUpperCase()} ·{" "}
              {Math.ceil(asset.size / 1024)} KB · {asset.id.slice(0, 8)}
            </span>
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                if (!token || busy || !confirm(t.confirm)) return;
                setBusy(true);
                setError("");
                try {
                  await removeBoardAsset(token, asset.id);
                  if (identity.current === token)
                    setAssets((previous) =>
                      previous.filter((item) => item.id !== asset.id),
                    );
                } catch (e) {
                  if (identity.current === token)
                    setError((e as Error).message);
                } finally {
                  if (identity.current === token) setBusy(false);
                }
              }}
            >
              {t.remove}
            </button>
          </div>
        ))}
      </div>
      {!busy && !assets.length && !error && <p className="muted">{t.empty}</p>}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
