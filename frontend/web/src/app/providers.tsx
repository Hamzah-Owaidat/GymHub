"use client";

import type React from "react";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import dynamic from "next/dynamic";

const ToastContainer = dynamic(
  () => import("@/components/ui/toast/ToastContainer"),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SidebarProvider>
          {children}
          <ToastContainer />
        </SidebarProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

