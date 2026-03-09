import "./globals.css";
import type React from "react";
import Providers from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="dark:bg-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

