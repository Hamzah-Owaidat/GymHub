"use client";

import { useEffect, useState } from "react";
import { getSubscriptionEntryQr, type EntryQrData } from "@/lib/api/gymEntry";

type Props = {
  subscriptionId: number;
  gymName?: string;
  open: boolean;
  onClose: () => void;
};

export default function GymEntryQrModal({ subscriptionId, gymName, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EntryQrData | null>(null);
  const [QrSvg, setQrSvg] = useState<React.ComponentType<{ value: string; size?: number }> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const [qrMod, res] = await Promise.all([
          import("qrcode.react").then((m) => m.QRCodeSVG),
          getSubscriptionEntryQr(subscriptionId),
        ]);
        if (cancelled) return;
        setQrSvg(() => qrMod);
        setData(res.data);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load entry QR");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, subscriptionId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-stone-900 dark:text-white">Gym entry QR</h2>
        <p className="mt-1 text-sm text-stone-500">
          Show this at the entrance. Staff will scan it to let you in.
        </p>

        <div className="mt-6 flex flex-col items-center">
          {loading && <p className="text-sm text-stone-500">Loading…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !error && data && QrSvg && (
            <>
              <div className="rounded-2xl bg-white p-4 shadow-inner">
                <QrSvg value={data.qr_payload} size={220} />
              </div>
              <p className="mt-4 font-semibold text-stone-900 dark:text-white">
                {data.gym_name || gymName}
              </p>
              <p className="text-sm text-stone-500">{data.plan_name}</p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-stone-100 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200"
        >
          Close
        </button>
      </div>
    </div>
  );
}
