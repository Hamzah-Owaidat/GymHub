"use client";
import { useToast } from "@/context/ToastContext";
import { XMarkIcon } from "@heroicons/react/24/solid";

const VARIANT_STYLES: Record<
  "info" | "success" | "warning" | "error",
  { wrapper: string; badge: string; iconBg: string }
> = {
  info: {
    wrapper: "border-sky-500/60 bg-sky-500/10",
    badge: "bg-sky-500 text-white",
    iconBg: "bg-sky-500/20 text-sky-300",
  },
  success: {
    wrapper: "border-emerald-500/60 bg-emerald-500/10",
    badge: "bg-emerald-500 text-white",
    iconBg: "bg-emerald-500/20 text-emerald-300",
  },
  warning: {
    wrapper: "border-amber-500/70 bg-amber-500/10",
    badge: "bg-amber-500 text-black",
    iconBg: "bg-amber-500/20 text-amber-300",
  },
  error: {
    wrapper: "border-red-500/70 bg-red-500/10",
    badge: "bg-red-500 text-white",
    iconBg: "bg-red-500/20 text-red-300",
  },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex flex-col items-center space-y-2 sm:items-end sm:right-4 sm:left-auto">
      {toasts.map((toast) => {
        const styles = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative flex w-[120%] max-w-xl items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 shadow-xl backdrop-blur-md dark:bg-stone-900/95 bg-white/90 ${styles.wrapper}`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${styles.iconBg}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {toast.variant[0].toUpperCase()}
                </span>
              </div>

              <div className="flex flex-col justify-center min-w-0">
                <span
                  className={`inline-flex max-w-max rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles.badge}`}
                >
                  {toast.variant}
                </span>
                <p className="mt-1 text-sm text-stone-900 dark:text-stone-100 truncate">
                  {toast.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-stone-800/60 text-stone-200 hover:bg-stone-700 flex-shrink-0"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

