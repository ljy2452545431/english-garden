import { useEffect, useRef, useState } from "react";
import {
  listLooks,
  createLook,
  deleteLook,
  type SharedLook,
} from "../@apis/looks";
import {
  normalizePreferences,
  type Preferences,
  type Appearance,
} from "../utils/preferences";
import { sharedLooksText as t } from "../i18n/shared-looks";
import { RefreshCw, Lock } from "./icons";
import type { Garden } from "../hooks/useGarden";

export function SharedLooks({
  garden,
  prefs,
  onApply,
}: {
  garden: Garden;
  prefs: Preferences;
  onApply: (appearance: Appearance) => void;
}) {
  const token = garden.auth?.token;
  const identity = useRef(token);
  identity.current = token;
  const [looks, setLooks] = useState<SharedLook[]>([]),
    [name, setName] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function refresh() {
    if (!token) return;
    setLoading(true);
    try {
      const result = await listLooks(token);
      if (identity.current === token) {
        setLooks(result.looks);
        setError("");
      }
    } catch (e) {
      if (identity.current === token) setError((e as Error).message);
    } finally {
      if (identity.current === token) setLoading(false);
    }
  }
  useEffect(() => {
    setLooks([]);
    setNotice("");
    setError("");
    setBusy(false);
    setLoading(false);
    void refresh();
  }, [token]);
  if (!token)
    return (
      <section className="studio-section shared-looks">
        <h2>{t.title}</h2>
        <p className="muted">
          <Lock size={16} /> {t.login}
        </p>
      </section>
    );
  return (
    <section className="studio-section shared-looks">
      <div className="row justify-between">
        <h2>{t.title}</h2>
        <button
          className="icon-button"
          disabled={loading || busy}
          aria-label={t.refresh}
          onClick={() => void refresh()}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <p className="muted">{t.intro}</p>
      <form
        className="studio-save row"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || !name.trim()) return;
          setBusy(true);
          setError("");
          try {
            const { looks: localLooks, ...appearance } = prefs;
            void localLooks;
            const result = await createLook(token, name.trim(), appearance);
            if (identity.current !== token) return;
            setLooks((previous) => [
              result.look,
              ...previous.filter((look) => look.id !== result.look.id),
            ]);
            setName("");
            setNotice(t.saved);
          } catch (e) {
            if (identity.current === token) setError((e as Error).message);
          } finally {
            if (identity.current === token) setBusy(false);
          }
        }}
      >
        <label className="sr-only" htmlFor="shared-look-name">
          {t.name}
        </label>
        <input
          id="shared-look-name"
          value={name}
          maxLength={24}
          required
          placeholder={t.placeholder}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          className="button primary"
          disabled={busy || loading || !name.trim()}
        >
          {busy ? t.busy : t.save}
        </button>
      </form>
      <p className="muted mt-3">{t.limit}</p>
      {loading && <p role="status">{t.loading}</p>}
      {!loading && !looks.length && !error && (
        <p className="muted">{t.empty}</p>
      )}
      <div className="shared-look-list">
        {looks.map((look) => (
          <article className="shared-look" key={look.id}>
            <div>
              <strong>{look.name}</strong>
              <p className="muted">
                {t.author}：{look.displayName}
              </p>
            </div>
            <div className="row flex-wrap">
              <button
                className="button secondary"
                onClick={() =>
                  onApply(
                    (({ looks, ...appearance }) => {
                      void looks;
                      return appearance;
                    })(normalizePreferences(look.appearance)),
                  )
                }
              >
                {t.apply}
              </button>
              {look.userId === garden.auth?.user.id && (
                <button
                  className="text-button"
                  disabled={busy || loading}
                  aria-label={`${t.remove}：${look.name}`}
                  onClick={async () => {
                    if (busy || loading) return;
                    setBusy(true);
                    try {
                      await deleteLook(token, look.id);
                      if (identity.current !== token) return;
                      setLooks((previous) =>
                        previous.filter((item) => item.id !== look.id),
                      );
                      setNotice(t.deleted);
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
              )}
            </div>
          </article>
        ))}
      </div>
      {notice && (
        <p className="muted" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
