import { useState } from "react";
import { connectionText as t } from "../i18n/connection";
import { getServiceDiagnostics, serviceBase } from "../utils/service-route";
/** 仅本地生成脱敏诊断，由用户决定是否复制，不发送任何遥测。 */
export function ConnectionHelp({ code }: { code: string }) {
  const [message, setMessage] = useState("");
  const [report] = useState(() =>
    [
      `${t.version}: 2026-10-10.2`,
      `${t.selected}: ${(() => {
        try {
          return new URL(serviceBase()).hostname;
        } catch {
          return t.unknown;
        }
      })()}`,
      `${t.time}: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
      `${t.code}: ${code}`,
      `${t.site}: ${location.origin}`,
      `${t.online}: ${navigator.onLine ? t.yes : t.no}`,
      `${t.browser}: ${navigator.userAgent}`,
      ...getServiceDiagnostics().map(
        (route) =>
          `${t.route}: ${route.host}\n${t.status[route.status]}${route.httpStatus ? ` · HTTP ${route.httpStatus}` : ""}\n${t.elapsed}: ${route.durationMs}`,
      ),
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
        rows={9}
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
