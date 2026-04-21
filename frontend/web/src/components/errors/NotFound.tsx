"use client";

import React from "react";
import ErrorPageLayout from "./ErrorPageLayout";

export default function NotFoundView() {
  return (
    <ErrorPageLayout
      code="404"
      title="Page Not Found"
      description="We can't find the page you're looking for. It may have been moved, renamed, or is temporarily unavailable."
      illustration={{
        light: "/images/error/404.svg",
        dark: "/images/error/404-dark.svg",
        width: 472,
        height: 152,
      }}
    />
  );
}
