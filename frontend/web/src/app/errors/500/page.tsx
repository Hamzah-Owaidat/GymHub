"use client";

import ServerError from "@/components/errors/ServerError";

export default function Page() {
  return <ServerError onRetry={() => window.location.reload()} />;
}
