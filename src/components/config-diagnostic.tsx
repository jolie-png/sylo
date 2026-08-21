import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getConfigStatus, type ConfigStatus } from "@/lib/config-status.functions";

/**
 * Operator-only environment check. Renders nothing unless the URL contains
 * `?diag=1` (or `#diag`), so judges never see it. Lets you confirm the DEPLOYED
 * environment has the keys live generation needs — visit e.g.
 * `https://your-app/roadmap-builder?diag=1`.
 */
export function ConfigDiagnostic() {
  const check = useServerFn(getConfigStatus);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("diag") && window.location.hash !== "#diag") return;
    setEnabled(true);
    check()
      .then(setStatus)
      .catch(() => setError(true));
  }, [check]);

  if (!enabled) return null;

  const Row = ({ label, ok, note }: { label: string; ok: boolean; note: string }) => (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
        aria-hidden
      />
      <span className="font-medium">{label}:</span>
      <span>{ok ? "set" : "MISSING"}</span>
      <span className="text-white/60">— {note}</span>
    </div>
  );

  return (
    <div className="fixed bottom-3 right-3 z-[9999] max-w-sm rounded-xl bg-neutral-900 px-4 py-3 text-[12px] text-white shadow-xl ring-1 ring-white/10">
      <p className="mb-1.5 font-semibold uppercase tracking-wide text-white/80">
        Env check (operator only)
      </p>
      {error ? (
        <p className="text-red-300">Couldn&apos;t reach the server function.</p>
      ) : !status ? (
        <p className="text-white/60">Checking…</p>
      ) : (
        <div className="space-y-1">
          <Row label="ANTHROPIC_API_KEY" ok={status.hasAnthropicKey} note="parsing + gap analysis" />
          <Row label="SERPER_API_KEY" ok={status.hasSerperKey} note="live web search" />
          {status.hasAnthropicKey && status.hasSerperKey ? (
            <p className="pt-1 text-emerald-300">Live generation ready.</p>
          ) : (
            <p className="pt-1 text-amber-300">
              Live generation degraded — set the missing key in the deployed env&apos;s secrets.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
