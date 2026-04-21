"use client";

import { useEffect } from "react";
import ServerError from "@/components/errors/ServerError";

/**
 * Global Next.js error boundary. Catches render/runtime errors anywhere in
 * the app tree and shows the themed 500 page with a "Try again" action.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <ServerError
      onRetry={reset}
      details={process.env.NODE_ENV !== "production" ? error?.stack || error?.message : null}
    />
  );
}
