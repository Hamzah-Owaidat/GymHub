"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "info" | "success" | "warning" | "error";

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toasts: Toast[];
  showToast: (message: string, variant?: ToastVariant) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: Toast = { id, message, variant };
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      info: (message: string) => showToast(message, "info"),
      success: (message: string) => showToast(message, "success"),
      warning: (message: string) => showToast(message, "warning"),
      error: (message: string) => showToast(message, "error"),
      dismiss,
    }),
    [dismiss, showToast, toasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

