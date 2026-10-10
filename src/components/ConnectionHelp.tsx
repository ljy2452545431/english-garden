import { useState } from "react";
import { connectionText as t } from "../i18n/connection";
/** 仅本地生成脱敏诊断，由用户决定是否复制，不发送任何遥测。 */
export function ConnectionHelp({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  const [report] = useState(() =>
    [
      `${t.time}: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      `${t.code}: ${code}`,
      `${t.site}: ${location.origin}`,
      `${t.online}: ${navigator.onLine ? t.yes : t.no}`,
      `${t.browser}: ${navigator.userAgent}`,
    ].join("\n"),
  );
  return (
    <details className="mt-3">
      <summary>{t.details}</summary>
      <p className="muted">{t.hint}</p>
      <textarea
        aria-label={t.report}
        readOnly
        value={report}
        rows={6}
        onFocus={(e) => e.target.select()}
      />
      <button
        type="button"
        className="button secondary mt-3"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(report);
            setMessage(t.copied);
          } catch {
            setMessage(t.copyFailed);
          }
        }}
      >
        {t.copy}
      </button>
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
    </details>
  );
}
