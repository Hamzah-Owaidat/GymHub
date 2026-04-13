"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import {
  cancelMySession,
  createMySession,
  exportMySessions,
  getMySessionUsers,
  getMySessions,
  updateMySession,
  type CoachSessionUser,
  type Session,
} from "@/lib/api/sessions";
import React, { useEffect, useState } from "react";

type SessionModalMode = "view" | "create" | "edit" | null;

const emptyForm = {
  user_id: "",
  session_date: "",
  start_time: "",
  end_time: "",
  price: "",
  is_private: true,
};

export default function CoachSessionsPage() {
  const { error: showError, success: showSuccess } = useToast();

  const [data, setData] = useState<Session[]>([]);
  const [users, setUsers] = useState<CoachSessionUser[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "booked" | "completed" | "cancelled">("");

  const [modalMode, setModalMode] = useState<SessionModalMode>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

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

  const loadUsers = async () => {
    try {
      const res = await getMySessionUsers();
      setUsers(res.data || []);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load clients");
    }
  };

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, []);

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

  const resetForm = () => setForm({ ...emptyForm });

  const openCreateModal = () => {
    resetForm();
    setSelectedSession(null);
    setModalMode("create");
  };

  const openEditModal = (session: Session) => {
    setSelectedSession(session);
    setForm({
      user_id: String(session.user_id),
      session_date: session.session_date ? session.session_date.slice(0, 10) : "",
      start_time: session.start_time,
      end_time: session.end_time,
      price: session.price != null ? String(session.price) : "",
      is_private: !!session.is_private,
    });
    setModalMode("edit");
  };

  const openViewModal = (session: Session) => {
    setSelectedSession(session);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedSession(null);
    setSaving(false);
  };

  const handleCancelSession = async (session: Session) => {
    if (session.status === "completed") {
      showError("Completed sessions cannot be cancelled.");
      return;
    }
    if (!window.confirm(`Cancel session #${session.id}?`)) return;
    try {
      await cancelMySession(session.id);
      showSuccess("Session cancelled");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.user_id) return showError("Client is required.");
    if (!form.session_date) return showError("Session date is required.");
    if (!form.start_time || !form.end_time) return showError("Start and end time are required.");
    if (form.start_time >= form.end_time) return showError("Start time must be before end time.");

    setSaving(true);
    try {
      const payload = {
        user_id: Number(form.user_id),
        session_date: form.session_date.slice(0, 10),
        start_time: form.start_time,
        end_time: form.end_time,
        price: form.price ? Number(form.price) : null,
        is_private: form.is_private,
      };
      if (modalMode === "create") {
        await createMySession(payload);
        showSuccess("Session created successfully");
      } else if (selectedSession) {
        await updateMySession(selectedSession.id, payload);
        showSuccess("Session updated successfully");
      }
      handleCloseModal();
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportMySessions({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      showSuccess("Sessions exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add Session
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 disabled:opacity-50"
              >
                <DownloadIcon className="h-4 w-4" />
                Export Excel
              </button>
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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openViewModal(row)}
                          className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-300 dark:hover:text-white"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          disabled={row.status === "completed"}
                          className="text-xs font-medium text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelSession(row)}
                          disabled={row.status === "completed"}
                          className="text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <TrashBinIcon className="h-4 w-4" />
                        </button>
                      </div>
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

      <Modal isOpen={!!modalMode} onClose={handleCloseModal} className="max-w-[640px] m-4">
        <div className="no-scrollbar relative w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-stone-900 md:p-8">
          <div className="px-1 pr-10">
            <h4 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-50">
              {modalMode === "create" && "Add Session"}
              {modalMode === "edit" && "Edit Session"}
              {modalMode === "view" && "Session Details"}
            </h4>
          </div>

          {modalMode === "view" && selectedSession ? (
            <div className="mt-6 space-y-3 px-1 text-sm text-stone-700 dark:text-stone-200">
              <p><span className="font-medium">Client:</span> {selectedSession.user_first_name} {selectedSession.user_last_name}</p>
              <p><span className="font-medium">Gym:</span> {selectedSession.gym_name || `#${selectedSession.gym_id}`}</p>
              <p><span className="font-medium">Date:</span> {selectedSession.session_date}</p>
              <p><span className="font-medium">Time:</span> {selectedSession.start_time} - {selectedSession.end_time}</p>
              <p><span className="font-medium">Price:</span> {selectedSession.price ?? "N/A"}</p>
              <p><span className="font-medium">Status:</span> {selectedSession.status}</p>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div>
                <Label>Client</Label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="">Select client</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Session Date</Label>
                  <Input
                    type="date"
                    value={form.session_date}
                    onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="Leave empty for default"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="is_private"
                  type="checkbox"
                  checked={form.is_private}
                  onChange={(e) => setForm((f) => ({ ...f, is_private: e.target.checked }))}
                />
                <Label htmlFor="is_private">Private session</Label>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="inline-flex items-center rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? "Saving..." : modalMode === "create" ? "Create Session" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

