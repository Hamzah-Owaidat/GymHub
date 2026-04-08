"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  exportSessions,
  getGyms,
  getCoaches,
  getUsers,
  type Session,
  type Gym,
  type Coach,
} from "@/lib/api/dashboard";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";

type User = { id: number; first_name: string; last_name: string; email: string };
type SessionModalMode = "view" | "create" | "edit" | null;

const statusBadge: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const formatPrice = (v: unknown) => {
  const n = Number(v);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

const emptyForm = {
  user_id: "",
  gym_id: "",
  coach_id: "",
  session_date: "",
  start_time: "",
  end_time: "",
  price: "",
  status: "booked",
  is_private: true,
};

export default function SessionsPage() {
  const userRole = useAuthStore((s) => s.user?.role);
  const [data, setData] = useState<Session[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "booked" | "completed" | "cancelled">("");
  const [gymFilter, setGymFilter] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modalMode, setModalMode] = useState<SessionModalMode>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoaded, setGymsLoaded] = useState(false);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [coachesLoaded, setCoachesLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });

  const { error: showError, success: showSuccess } = useToast();
  const selectedGymId = form.gym_id ? Number(form.gym_id) : null;
  const filteredCoaches = selectedGymId
    ? coaches.filter((coach) => coach.gym_id === selectedGymId)
    : [];

  const loadGyms = async () => {
    if (gymsLoaded) return;
    try {
      const res = await getGyms({ page: 1, limit: 1000, is_active: true });
      setGyms(res.data);
      setGymsLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load gyms");
    }
  };

  const loadCoaches = async () => {
    if (coachesLoaded) return;
    try {
      const res = await getCoaches({ page: 1, limit: 1000, is_active: true });
      setCoaches(res.data);
      setCoachesLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load coaches");
    }
  };

  const loadUsers = async () => {
    if (usersLoaded) return;
    if (userRole !== "admin") {
      setUsersLoaded(true);
      return;
    }
    try {
      const res = await getUsers({ page: 1, limit: 1000, is_active: true });
      setUsers(res.data as User[]);
      setUsersLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load users");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSessions({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
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
  }, [pagination.page, pagination.limit, search, statusFilter, gymFilter]);

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

  useEffect(() => {
    loadGyms();
    loadCoaches();
    loadUsers();
  }, [userRole]);

  const resetForm = () => setForm({ ...emptyForm });

  const setGymAndSyncCoach = (gymId: string) => {
    setForm((prev) => {
      const nextGymId = gymId ? Number(gymId) : null;
      const currentCoachId = prev.coach_id ? Number(prev.coach_id) : null;
      const coachStillValid =
        nextGymId &&
        currentCoachId &&
        coaches.some((coach) => coach.id === currentCoachId && coach.gym_id === nextGymId);

      const fallbackGymPrice =
        nextGymId
          ? gyms.find((gym) => gym.id === nextGymId)?.session_price
          : null;

      return {
        ...prev,
        gym_id: gymId,
        coach_id: coachStillValid ? prev.coach_id : "",
        price:
          prev.price ||
          (fallbackGymPrice !== null && fallbackGymPrice !== undefined
            ? String(fallbackGymPrice)
            : ""),
      };
    });
  };

  const setCoachAndSyncPrice = (coachId: string) => {
    setForm((prev) => {
      const coach = coachId ? coaches.find((c) => c.id === Number(coachId)) : null;
      const gym = prev.gym_id ? gyms.find((g) => g.id === Number(prev.gym_id)) : null;
      const suggestedPrice =
        coach?.price_per_session ?? gym?.session_price ?? null;

      return {
        ...prev,
        coach_id: coachId,
        price:
          suggestedPrice !== null && suggestedPrice !== undefined
            ? String(suggestedPrice)
            : prev.price,
      };
    });
  };

  const openCreateModal = () => {
    resetForm();
    setSelectedSession(null);
    setModalMode("create");
  };

  const openEditModal = (session: Session) => {
    setSelectedSession(session);
    const dateOnly = session.session_date
      ? session.session_date.slice(0, 10)
      : "";
    setForm({
      user_id: String(session.user_id),
      gym_id: String(session.gym_id),
      coach_id: session.coach_id ? String(session.coach_id) : "",
      session_date: dateOnly,
      start_time: session.start_time,
      end_time: session.end_time,
      price: session.price != null ? String(session.price) : "",
      status: session.status,
      is_private: session.is_private,
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

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete session #${id}?`)) return;
    try {
      await deleteSession(id);
      showSuccess("Session deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.user_id) {
      showError("User is required.");
      return;
    }
    if (!form.gym_id) {
      showError("Gym is required.");
      return;
    }
    if (!form.session_date) {
      showError("Session date is required.");
      return;
    }
    if (!form.coach_id) {
      showError("Coach is required.");
      return;
    }
    if (!form.start_time || !form.end_time) {
      showError("Start time and end time are required.");
      return;
    }
    if (form.start_time >= form.end_time) {
      showError("Start time must be before end time.");
      return;
    }
    if (
      form.gym_id &&
      form.coach_id &&
      !coaches.some(
        (coach) =>
          coach.id === Number(form.coach_id) && coach.gym_id === Number(form.gym_id),
      )
    ) {
      showError("Selected coach does not belong to selected gym.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: Number(form.user_id),
        gym_id: Number(form.gym_id),
        coach_id: Number(form.coach_id),
        session_date: form.session_date.slice(0, 10),
        start_time: form.start_time,
        end_time: form.end_time,
        price: form.price ? Number(form.price) : null,
        status: form.status,
        is_private: form.is_private,
      };

      if (modalMode === "create") {
        await createSession(payload);
        showSuccess("Session created successfully");
      } else if (modalMode === "edit" && selectedSession) {
        await updateSession(selectedSession.id, payload);
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
      await exportSessions({
        search: search || undefined,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
        status: statusFilter || undefined,
      });
      showSuccess("Sessions exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const isViewMode = modalMode === "view";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Sessions" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
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

          {/* Filters and Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={gymFilter}
                onChange={(e) => {
                  const v = e.target.value;
                  setGymFilter(v === "" ? "" : Number(v));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-11 min-w-[160px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">All gyms</option>
                {gyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value as "" | "booked" | "completed" | "cancelled";
                  setStatusFilter(value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-11 min-w-[140px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">User</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Gym</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Coach</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Date</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Time</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Price</th>
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
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.coach_first_name && row.coach_last_name
                        ? `${row.coach_first_name} ${row.coach_last_name}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.session_date}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.start_time} - {row.end_time}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.price != null ? `$${formatPrice(row.price)}` : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          statusBadge[row.status] ?? "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
                        }`}
                      >
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
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
                          className="text-xs font-medium text-brand-500 hover:text-brand-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="text-red-500 hover:text-red-600"
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
            {selectedSession && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">ID #{selectedSession.id}</p>
            )}
          </div>

          {isViewMode && selectedSession ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    User
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedSession.user_first_name} {selectedSession.user_last_name}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {selectedSession.user_email}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Gym
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedSession.gym_name || `#${selectedSession.gym_id}`}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Coach
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedSession.coach_first_name && selectedSession.coach_last_name
                      ? `${selectedSession.coach_first_name} ${selectedSession.coach_last_name}`
                      : "N/A"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Date
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedSession.session_date}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Time
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedSession.start_time} - {selectedSession.end_time}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Price
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedSession.price != null ? `$${formatPrice(selectedSession.price)}` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Status
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusBadge[selectedSession.status] ?? "bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
                      }`}
                    >
                      {selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Visibility
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedSession.is_private
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}
                  >
                    {selectedSession.is_private ? "Private session" : "Public session"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{userRole === "admin" ? "User" : "User ID"}</Label>
                  {userRole === "admin" ? (
                    <select
                      value={form.user_id}
                      onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    >
                      <option value="">Select user</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <Input
                        type="number"
                        value={form.user_id}
                        onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                        placeholder="Enter customer user ID"
                        min={1}
                      />
                      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                        Enter the booked user ID. The backend validates that this user exists and is active.
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <Label>Gym</Label>
                  <select
                    value={form.gym_id}
                    onChange={(e) => setGymAndSyncCoach(e.target.value)}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">Select gym</option>
                    {gyms.map((gym) => (
                      <option key={gym.id} value={gym.id}>
                        {gym.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Coach</Label>
                  <select
                    value={form.coach_id}
                    onChange={(e) => setCoachAndSyncPrice(e.target.value)}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">
                      {form.gym_id ? "Select coach" : "Select gym first"}
                    </option>
                    {filteredCoaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user_first_name} {c.user_last_name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Only coaches from the selected gym are available.
                  </p>
                </div>
                <div>
                  <Label>Session Date</Label>
                  <Input
                    type="date"
                    value={form.session_date}
                    onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="e.g. 29.99"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="booked">Booked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Booked = upcoming, Completed = finished, Cancelled = void.
                  </p>
                </div>
              </div>

              <div className="mt-1 flex flex-col gap-2 rounded-2xl bg-stone-50 p-3.5 text-xs text-stone-700 dark:bg-stone-900/60 dark:text-stone-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-stone-900 dark:text-stone-50">Session visibility</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Private sessions cannot overlap with other private sessions for the same coach.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, is_private: true }))}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        form.is_private
                          ? "bg-brand-500 text-white"
                          : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                      }`}
                    >
                      Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, is_private: false }))}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        !form.is_private
                          ? "bg-emerald-500 text-white"
                          : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                      }`}
                    >
                      Public
                    </button>
                  </div>
                </div>
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
