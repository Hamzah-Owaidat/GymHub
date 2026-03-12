"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import { useToast } from "@/context/ToastContext";
import { getMySessions, type Session } from "@/lib/api/sessions";
import React, { useEffect, useState } from "react";

type SessionModalMode = "view" | null;

export default function CoachSessionsPage() {
  const { error: showError } = useToast();

  const [data, setData] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "booked" | "completed" | "cancelled">("");

  const [modalMode, setModalMode] = useState<SessionModalMode>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMySessions({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    if (searchInput === "") {
      setSearch("");
      setPagination((p) => ({ ...p, page: 1 }));
      return;
    }

    const id = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((p) => ({ ...p, page: 1 }));
    }, 1000);

    return () => window.clearTimeout(id);
  }, [searchInput]);

  const openViewModal = (session: Session) => {
    setSelectedSession(session);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSession(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="My Sessions" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border-0 bg-stone-50 px-4 py-3.5 pl-11 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:bg-stone-800"
            />
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400 dark:text-stone-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 1 0 3.473 9.8l2.863 2.864a.75.75 0 1 0 1.06-1.06l-2.864-2.863A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0a3.5 3.5 0 0 1-7 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value as "" | "booked" | "completed" | "cancelled";
                  setStatusFilter(value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-11 min-w-[160px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">All statuses</option>
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center text-stone-500 dark:text-stone-400">
              Loading...
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Client</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Gym</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Date</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Time</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Status</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-stone-700">
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                      {row.user_first_name} {row.user_last_name}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.gym_name || `#${row.gym_id}`}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">{row.session_date}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.start_time} - {row.end_time}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openViewModal(row)}
                        className="text-xs font-medium text-brand-500 hover:text-brand-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="shrink-0">
          <Pagination
            currentPage={pagination.page}
            totalPages={Math.max(1, pagination.totalPages)}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          />
        </div>
      </div>
    </div>
  );
}

