"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RoleGate from "@/components/auth/RoleGate";
import { verifyGymEntryQr, type GymEntryVerifyResponse } from "@/lib/api/gymEntry";

export default function GymEntryPage() {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5Ref = useRef<{ stop: () => Promise<void> } | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<GymEntryVerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleVerify = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setVerifying(true);
    setError(null);
    setResult(null);
    try {
      const res = await verifyGymEntryQr(trimmed);
      setResult(res);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg || (e instanceof Error ? e.message : "Verification failed"));
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !scannerRef.current) return;

        const scanner = new Html5Qrcode("gym-entry-scanner");
        html5Ref.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            handleVerify(decoded);
          },
          () => {},
        );
      } catch {
        if (!cancelled) {
          setCameraError("Camera access unavailable. Paste the code manually below.");
        }
      }
    })();

    return () => {
      cancelled = true;
      const s = html5Ref.current;
      if (s) {
        s.stop().catch(() => {});
        html5Ref.current = null;
      }
    };
  }, [handleVerify]);

  return (
    <RoleGate roles={["admin", "owner"]}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Gym entry scanner</h1>
        <p className="mt-2 text-sm text-stone-500">
          Scan a member&apos;s QR code at the door to verify their active subscription.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <div id="gym-entry-scanner" ref={scannerRef} className="min-h-[280px] w-full" />
          {cameraError && (
            <p className="border-t border-stone-100 px-4 py-3 text-sm text-amber-700 dark:border-stone-800 dark:text-amber-400">
              {cameraError}
            </p>
          )}
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Or paste QR payload
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="GYMHUB_ENTRY:v1:…"
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-900"
            />
            <button
              type="button"
              disabled={verifying || !manualCode.trim()}
              onClick={() => handleVerify(manualCode)}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {verifying ? "Checking…" : "Verify"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`mt-6 rounded-2xl border px-5 py-4 ${
              result.allowed
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
            }`}
          >
            <p
              className={`text-lg font-bold ${
                result.allowed ? "text-emerald-700 dark:text-emerald-400" : "text-amber-800 dark:text-amber-300"
              }`}
            >
              {result.allowed ? "Entry granted" : "Entry denied"}
            </p>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{result.message}</p>
            {result.member && (
              <dl className="mt-4 space-y-1 text-sm">
                {result.member.name && (
                  <>
                    <dt className="text-stone-500">Member</dt>
                    <dd className="font-medium text-stone-900 dark:text-white">{result.member.name}</dd>
                  </>
                )}
                {result.member.gym_name && (
                  <>
                    <dt className="mt-2 text-stone-500">Gym</dt>
                    <dd>{result.member.gym_name}</dd>
                  </>
                )}
                {result.member.plan_name && (
                  <>
                    <dt className="mt-2 text-stone-500">Plan</dt>
                    <dd>{result.member.plan_name}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
