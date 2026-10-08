import { BoardAssets } from "./BoardAssets";
import { BoardStudio } from "./BoardStudio";
import { useRef, useState } from "react";
import { Download, Upload } from "./icons";
import { zh as t } from "../i18n/zh";
import type { Garden } from "../hooks/useGarden";
import { validateImport, type LearningState } from "../utils/learning";
import type { Preferences } from "../utils/preferences";
import { AppearanceStudio } from "./AppearanceStudio";
export function Settings({
  prefs,
  setPrefs,
  garden,
}: {
  prefs: Preferences;
  setPrefs: (value: Preferences) => void;
  garden: Garden;
}) {
  const file = useRef<HTMLInputElement>(null),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<LearningState | null>(null);

  function backup(state = garden.state) {
    const blob = new Blob([JSON.stringify({ version: 1, state }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "english-garden-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <BoardStudio
        garden={garden}
        onApply={(boardId) => setPrefs({ ...prefs, boardId })}
      />
      <BoardAssets
        key={garden.auth?.token ?? "preview"}
        token={garden.auth?.token}
      />
      <AppearanceStudio prefs={prefs} setPrefs={setPrefs} garden={garden} />
      <div className="settings-records">
        <section className="paper">
          <h2>计划与学习记录</h2>
          <label className="field-label" htmlFor="start-date">
            {t.startDate}
          </label>
          <input
            id="start-date"
            type="date"
            value={garden.state.startDate}
            onChange={(e) =>
              garden.update((prev) => ({ ...prev, startDate: e.target.value }))
            }
          />
          <label className="field-label mt-4" htmlFor="nickname">
            {t.nickname}
          </label>
          <input
            id="nickname"
            value={garden.state.nickname}
            maxLength={30}
            onChange={(e) =>
              garden.update((prev) => ({ ...prev, nickname: e.target.value }))
            }
          />
          <div className="row flex-wrap mt-5">
            <button className="button secondary" onClick={() => backup()}>
              <Download size={17} />
              {t.export}
            </button>
            <button
              className="button secondary"
              onClick={() => file.current?.click()}
            >
              <Upload size={17} />
              {t.import}
            </button>
            <input
              hidden
              type="file"
              accept="application/json,.json"
              ref={file}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 2000000) {
                  setMessage("文件超过 2 MB，无法导入");
                  return;
                }
                const parsed = validateImport(await f.text());
                if (!parsed.ok || !parsed.state) {
                  setMessage("这不是有效的学习备份");
                  return;
                }
                setPending(parsed.state);
                e.target.value = "";
              }}
            />
          </div>
          {pending && (
            <div className="notice">
              <p>{t.restoreWarning}</p>
              <div className="row">
                <button
                  className="button primary"
                  onClick={() => {
                    garden.update(() => pending);
                    setPending(null);
                    setMessage("记录已恢复");
                  }}
                >
                  {t.confirmImport}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setPending(null)}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}
          {message && <p role="status">{message}</p>}
          <p className="muted">{garden.status}</p>
          {garden.auth && (
            <button
              className="button secondary"
              onClick={() =>
                garden
                  .retrySync()
                  .then(() => setMessage("同步已完成"))
                  .catch((e) => setMessage(e.message))
              }
            >
              重试同步
            </button>
          )}
          {garden.recovery && (
            <div className="notice">
              <h3>发现尚未同步的记录</h3>
              <p>
                其他设备可能已更新云端。请先导出备份，再选择要保留的版本；恢复会替换当前云端记录。
              </p>
              <div className="row flex-wrap">
                <button
                  className="button secondary"
                  onClick={() => backup(garden.recovery!)}
                >
                  导出未同步备份
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    if (confirm("确认用这份未同步备份替换云端记录？"))
                      void garden
                        .restorePending()
                        .catch((e) => setMessage(e.message));
                  }}
                >
                  恢复未同步备份
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    if (
                      confirm(
                        "确认放弃未同步备份并保留云端记录？请先导出需要的作品。",
                      )
                    )
                      void garden
                        .keepCloud()
                        .catch((e) => setMessage(e.message));
                  }}
                >
                  保留云端记录
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
