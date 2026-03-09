"use client";

import React from "react";
import { ChevronLeftIcon } from "@/icons";

const MAX_VISIBLE_PAGES = 5;

function getPageItems(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);
  const sorted = Array.from(set)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push("ellipsis");
    }
    result.push(sorted[i]!);
  }
  return result;
}

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages < 1) return null;

  const items = getPageItems(currentPage, totalPages);

  return (
    <div
      className={`flex items-center justify-center gap-1 border-t border-stone-100 py-4 dark:border-stone-700 ${className}`}
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-colors hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-1">
        {items.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-stone-500 dark:text-stone-400"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors ${
                currentPage === item
                  ? "border-brand-500 bg-brand-500 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-white"
                  : "border-stone-200 text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-colors hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
      >
        <ChevronLeftIcon className="h-5 w-5 rotate-180" />
      </button>
    </div>
  );
}
