"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Switch from "@/components/form/switch/Switch";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import { COACH_SPECIALIZATIONS } from "@/constants/coachSpecializations";
import {
  getCoaches,
  createCoach,
  updateCoach,
  deleteCoach,
  exportCoaches,
  getCoachUsers,
  getGyms,
  type Coach,
  type CoachAvailability,
  type CoachUser,
  type Gym,
} from "@/lib/api/dashboard";
import React, { useEffect, useState } from "react";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return `${h}:00`;
});

type AvailabilitySlot = {
  day: string;
  start_time: string;
  end_time: string;
  slot_mode: "private_only" | "public_only" | "both";
};

function validateAvailabilitySlots(slots: AvailabilitySlot[]): string | null {
  const seen = new Set<string>();

  for (const slot of slots) {
    if (!slot.day || !slot.start_time || !slot.end_time) {
      return "Each availability slot must include day, start time, and end time.";
    }

    if (slot.start_time >= slot.end_time) {
      return `Start time must be before end time for ${slot.day}.`;
    }

    const key = `${slot.day}|${slot.start_time}|${slot.end_time}`;
    if (seen.has(key)) {
      return `Duplicate slot detected: ${slot.day} ${slot.start_time}-${slot.end_time}.`;
    }
    seen.add(key);
  }

  const grouped = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    if (!grouped.has(slot.day)) grouped.set(slot.day, []);
    grouped.get(slot.day)!.push(slot);
  }

  for (const [day, daySlots] of grouped.entries()) {
    const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start_time < sorted[i - 1].end_time) {
        return `Availability slots overlap on ${day}.`;
      }
    }
  }

  return null;
}

type CoachModalMode = "view" | "create" | "edit" | null;

export default function CoachesPage() {
  const [data, setData] = useState<Coach[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [gymFilter, setGymFilter] = useState<number | "">("");

  const [modalMode, setModalMode] = useState<CoachModalMode>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [coachUsers, setCoachUsers] = useState<CoachUser[]>([]);
  const [lookupLoaded, setLookupLoaded] = useState(false);

  const { error: showError, success: showSuccess } = useToast();

  const loadLookups = async () => {
    if (lookupLoaded) return;
    try {
      const [gymsRes, coachUsersRes] = await Promise.all([
        getGyms({ page: 1, limit: 1000, is_active: true }),
        getCoachUsers(),
      ]);
      setGyms(gymsRes.data);
      setCoachUsers(coachUsersRes.data);
      setLookupLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load lookups");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCoaches({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        is_active:
          statusFilter === ""
            ? undefined
            : statusFilter === "active"
            ? true
            : false,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
      });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load coaches");
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
    loadLookups();
  }, []);

  const [form, setForm] = useState({
    user_id: "",
    gym_id: "",
    specialization: "",
    bio: "",
    price_per_session: "",
    gym_share_percentage: "0",
    is_active: true,
  });
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);

  const resetForm = () => {
    setForm({
      user_id: "",
      gym_id: "",
      specialization: "",
      bio: "",
      price_per_session: "",
      gym_share_percentage: "0",
      is_active: true,
    });
    setAvailabilitySlots([]);
  };

  const addSlot = () => {
    setAvailabilitySlots((prev) => [
      ...prev,
      { day: "monday", start_time: "08:00", end_time: "17:00", slot_mode: "private_only" },
    ]);
  };

  const removeSlot = (idx: number) => {
    setAvailabilitySlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: keyof AvailabilitySlot, value: string) => {
    setAvailabilitySlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const openCreateModal = () => {
    resetForm();
    setAvailabilitySlots([]);
    setSelectedCoach(null);
    setModalMode("create");
  };

  const openEditModal = (coach: Coach) => {
    setSelectedCoach(coach);
    setForm({
      user_id: String(coach.user_id),
      gym_id: String(coach.gym_id),
      specialization: coach.specialization || "",
      bio: coach.bio || "",
      price_per_session:
        coach.price_per_session !== null && coach.price_per_session !== undefined
          ? String(coach.price_per_session)
          : "",
      gym_share_percentage:
        coach.gym_share_percentage !== null && coach.gym_share_percentage !== undefined
          ? String(coach.gym_share_percentage)
          : "0",
      is_active: coach.is_active,
    });
    setAvailabilitySlots(
      (coach.availability || []).map((a) => ({
        day: a.day,
        start_time: a.start_time ? a.start_time.slice(0, 5) : "08:00",
        end_time: a.end_time ? a.end_time.slice(0, 5) : "17:00",
        slot_mode: a.slot_mode || (a.is_private ? "private_only" : "public_only"),
      })),
    );
    setModalMode("edit");
  };

  const openViewModal = (coach: Coach) => {
    setSelectedCoach(coach);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedCoach(null);
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete coach "${name}"?`)) return;
    try {
      await deleteCoach(id);
      showSuccess("Coach deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.user_id || !form.gym_id) {
      showError("Coach user and gym are required.");
      return;
    }
    const sharePct = Number(form.gym_share_percentage || "0");
    if (Number.isNaN(sharePct) || sharePct < 0 || sharePct > 100) {
      showError("Gym share % must be between 0 and 100.");
      return;
    }

    const availabilityValidationError = validateAvailabilitySlots(availabilitySlots);
    if (availabilityValidationError) {
      showError(availabilityValidationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: Number(form.user_id),
        gym_id: Number(form.gym_id),
        specialization: form.specialization.trim() || undefined,
        bio: form.bio.trim() || undefined,
        price_per_session: form.price_per_session
          ? Number(form.price_per_session)
          : undefined,
        gym_share_percentage: sharePct,
        is_active: form.is_active,
        availability: availabilitySlots.map((s) => ({
          day: s.day,
          start_time: s.start_time || null,
          end_time: s.end_time || null,
          slot_mode: s.slot_mode,
        })),
      };

      if (modalMode === "create") {
        await createCoach(payload);
        showSuccess("Coach created successfully");
      } else if (modalMode === "edit" && selectedCoach) {
        await updateCoach(selectedCoach.id, payload);
        showSuccess("Coach updated successfully");
      }

      handleCloseModal();
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const isViewMode = modalMode === "view";

  const resolveGymName = (gym_id: number) => {
    const g = gyms.find((gym) => gym.id === gym_id);
    return g ? g.name : `#${gym_id}`;
  };

  const resolveCoachName = (coach: Coach) => {
    const u = coachUsers.find((user) => user.id === coach.user_id);
    if (u) return `${u.first_name} ${u.last_name}`;
    if (coach.user_first_name || coach.user_last_name) {
      return `${coach.user_first_name ?? ""} ${coach.user_last_name ?? ""}`.trim();
    }
    return `User #${coach.user_id}`;
  };

  const resolveCoachEmail = (coach: Coach) => {
    const u = coachUsers.find((user) => user.id === coach.user_id);
    return u?.email ?? coach.user_email ?? "";
  };

  const formatPrice = (value: unknown) => {
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(num)) return String(value ?? "");
    return num.toFixed(2);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCoaches({
        search: search || undefined,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
        is_active:
          statusFilter === ""
            ? undefined
            : statusFilter === "active"
            ? true
            : false,
      });
      showSuccess("Coaches exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Coaches" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search coaches by name or email..."
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
                  const value = e.target.value as "" | "active" | "inactive";
                  setStatusFilter(value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-11 min-w-[140px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add Coach
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">ID</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Coach
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Gym</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Specialization
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Price / session
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Gym share
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Availability
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Active
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-stone-700">
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-4 py-3 text-stone-800 dark:text-stone-100">
                      <div className="flex flex-col">
                        <span className="font-medium">{resolveCoachName(row)}</span>
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          {resolveCoachEmail(row)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {resolveGymName(row.gym_id)}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.specialization || "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.price_per_session != null ? `$${formatPrice(row.price_per_session)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.gym_share_percentage != null ? `${Number(row.gym_share_percentage).toFixed(2)}%` : "0%"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.availability && row.availability.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.availability.slice(0, 3).map((a, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium capitalize text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                            >
                              {a.day.slice(0, 3)}
                              {a.start_time && a.end_time
                                ? ` ${a.start_time.slice(0, 5)}-${a.end_time.slice(0, 5)}`
                                : ""}
                            </span>
                          ))}
                          {row.availability.length > 3 && (
                            <span className="text-[10px] text-stone-400">
                              +{row.availability.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          row.is_active
                            ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border border-red-500/40 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {row.is_active ? "Active" : "Inactive"}
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
                          onClick={() => handleDelete(row.id, resolveCoachName(row))}
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

      <Modal isOpen={modalMode !== null} onClose={handleCloseModal} className="max-w-[640px] m-4">
        <div className="no-scrollbar relative w-full max-w-[640px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-stone-900 md:p-8">
          <div className="px-1 pr-10">
            <h4 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-50">
              {modalMode === "create" && "Add Coach"}
              {modalMode === "edit" && "Edit Coach"}
              {modalMode === "view" && "Coach Details"}
            </h4>
            {selectedCoach && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">ID #{selectedCoach.id}</p>
            )}
          </div>

          {isViewMode && selectedCoach ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Coach
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {resolveCoachName(selectedCoach)}
                  </p>
                  {resolveCoachEmail(selectedCoach) && (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {resolveCoachEmail(selectedCoach)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Gym
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {resolveGymName(selectedCoach.gym_id)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Specialization
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedCoach.specialization || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Price / session
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedCoach.price_per_session != null
                        ? `$${formatPrice(selectedCoach.price_per_session)}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Gym share
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedCoach.gym_share_percentage != null
                        ? `${Number(selectedCoach.gym_share_percentage).toFixed(2)}%`
                        : "0%"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Bio
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedCoach.bio || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Availability
                  </p>
                  {selectedCoach.availability && selectedCoach.availability.length > 0 ? (
                    <div className="mt-1 space-y-1.5">
                      {selectedCoach.availability.map((a, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-800"
                        >
                          <span className="min-w-[80px] text-xs font-semibold capitalize text-brand-500">
                            {a.day}
                          </span>
                          <span className="text-xs text-stone-600 dark:text-stone-300">
                            {a.start_time && a.end_time
                              ? `${a.start_time.slice(0, 5)} — ${a.end_time.slice(0, 5)}`
                              : "All day"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-900 dark:text-stone-50">—</p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedCoach.is_active
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border border-red-500/40 bg-red-500/10 text-red-500"
                    }`}
                  >
                    {selectedCoach.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Coach User</Label>
                  <select
                    value={form.user_id}
                    onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">Select user</option>
                    {coachUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Gym</Label>
                  <select
                    value={form.gym_id}
                    onChange={(e) => setForm((f) => ({ ...f, gym_id: e.target.value }))}
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
                  <Label>Specialization</Label>
                  <select
                    value={form.specialization}
                    onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">Select specialization</option>
                    {COACH_SPECIALIZATIONS.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Price / session</Label>
                  <Input
                    type="number"
                    value={form.price_per_session}
                    onChange={(e) => setForm((f) => ({ ...f, price_per_session: e.target.value }))}
                    placeholder="e.g. 25"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Gym share %</Label>
                  <Input
                    type="number"
                    value={form.gym_share_percentage}
                    onChange={(e) => setForm((f) => ({ ...f, gym_share_percentage: e.target.value }))}
                    placeholder="e.g. 50"
                    min={0}
                    max={100}
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label>Bio</Label>
                <Input
                  type="text"
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Short bio"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Availability</Label>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    + Add slot
                  </button>
                </div>
                {availabilitySlots.length === 0 && (
                  <p className="text-xs text-stone-400">No availability slots added.</p>
                )}
                <div className="space-y-2">
                  {availabilitySlots.map((slot, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2">
                      <select
                        value={slot.day}
                        onChange={(e) => updateSlot(idx, "day", e.target.value)}
                        className="h-9 min-w-[110px] rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.start_time}
                        onChange={(e) => updateSlot(idx, "start_time", e.target.value)}
                        className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-stone-400">to</span>
                      <select
                        value={slot.end_time}
                        onChange={(e) => updateSlot(idx, "end_time", e.target.value)}
                        className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.slot_mode}
                        onChange={(e) =>
                          setAvailabilitySlots((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, slot_mode: e.target.value as AvailabilitySlot["slot_mode"] } : s,
                            ),
                          )
                        }
                        className="h-9 min-w-[120px] rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      >
                        <option value="private_only">Private only</option>
                        <option value="public_only">Public only</option>
                        <option value="both">Both</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSlot(idx)}
                        className="ml-1 text-red-400 hover:text-red-600"
                      >
                        <TrashBinIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {modalMode === "edit" && (
                <div className="mt-2">
                  <Switch
                    label={form.is_active ? "Active" : "Inactive"}
                    defaultChecked={form.is_active}
                    onChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                  />
                </div>
              )}

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
                  {saving ? "Saving..." : modalMode === "create" ? "Create Coach" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

