"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";

/**
 * Dashboard layout: sidebar + header.
 * All routes under /dashboard/* use this layout (e.g. /dashboard, /dashboard/profile).
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  const mainContentMargin =
    isMobileOpen ? "ml-0" : isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div
        className={`flex min-h-0 flex-1 flex-col transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-stone-50 dark:bg-stone-900">
          <div className="mx-auto flex min-h-0 w-full max-w-(--breakpoint-2xl) flex-1 flex-col p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
