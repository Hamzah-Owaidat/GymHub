"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Switch from "@/components/form/switch/Switch";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import {
  getGyms,
  exportGyms,
  deleteGym,
  createGym,
  updateGym,
  getRoles,
  getUsers,
  type Gym,
  type Role,
  type User,
} from "@/lib/api/dashboard";
import React, { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// Options for working hours (start/end) and days (start/end)
const WORKING_HOUR_OPTIONS = [
  "05:00",
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

const WORKING_DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function resolveGymImageUrl(imageUrl: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }
  // Ensure the path is `/storage/gym/...`
  const normalized =
    imageUrl.startsWith("/storage") || imageUrl.startsWith("storage")
      ? imageUrl.replace(/^storage/, "/storage")
      : `/storage/gym/${imageUrl.replace(/^\/+/, "")}`;

  return `${API_BASE_URL}${normalized}`;
}

type GymModalMode = "view" | "create" | "edit" | null;

export default function GymsPage() {
  const [data, setData] = useState<Gym[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [exporting, setExporting] = useState(false);

  const [modalMode, setModalMode] = useState<GymModalMode>(null);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [saving, setSaving] = useState(false);

  const [owners, setOwners] = useState<User[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);

  const [existingImages, setExistingImages] = useState<{ id: number; image_url: string }[]>([]);

  const { error: showError, success: showSuccess } = useToast();

  const [form, setForm] = useState({
    name: "",
    location: "",
    description: "",
    owner_id: "",
    working_hours_start: "",
    working_hours_end: "",
    working_days_start: "",
    working_days_end: "",
    phone: "",
    email: "",
    is_active: true,
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getGyms({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        is_active:
          statusFilter === ""
            ? undefined
            : statusFilter === "active"
            ? true
            : false,
      });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load gyms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const loadOwners = async () => {
      setOwnersLoading(true);
      try {
        const rolesRes = await getRoles({ limit: 100 });
        const ownerRole = rolesRes.data.find(
          (r: Role) => r.name.toLowerCase() === "owner"
        );
        if (!ownerRole) {
          setOwners([]);
          return;
        }

        const usersRes = await getUsers({
          limit: 1000,
          role_id: ownerRole.id,
          is_active: true,
        });
        setOwners(usersRes.data);
      } catch (e) {
        // Silent fail – owner select will just be empty
        console.error(e);
      } finally {
        setOwnersLoading(false);
      }
    };

    loadOwners();
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

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportGyms({
        search: search || undefined,
        is_active:
          statusFilter === ""
            ? undefined
            : statusFilter === "active"
            ? true
            : false,
      });
      showSuccess("Gyms exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete gym "${name}"?`)) return;
    try {
      await deleteGym(id);
      showSuccess("Gym deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      location: "",
      description: "",
      owner_id: "",
      working_hours_start: "",
      working_hours_end: "",
      working_days_start: "",
      working_days_end: "",
      phone: "",
      email: "",
      is_active: true,
    });
    setImageFiles([]);
    setExistingImages([]);
  };

  const openCreateModal = () => {
    resetForm();
    setSelectedGym(null);
    setModalMode("create");
  };

  const openEditModal = (gym: Gym) => {
    setSelectedGym(gym);
    const workingHours = (gym as any).working_hours as string | null | undefined;
    const workingDays = (gym as any).working_days as string | null | undefined;

    const [hoursStart = "", hoursEnd = ""] =
      workingHours && workingHours.includes("-")
        ? workingHours.split("-").map((s) => s.trim())
        : ["", ""];

    const [daysStart = "", daysEnd = ""] =
      workingDays && workingDays.includes("-")
        ? workingDays.split("-").map((s) => s.trim())
        : ["", ""];

    setForm({
      name: gym.name,
      location: (gym as any).location || "",
      description: gym.description || "",
      owner_id: (gym as any).owner_id ? String((gym as any).owner_id) : "",
      working_hours_start: hoursStart,
      working_hours_end: hoursEnd,
      working_days_start: daysStart,
      working_days_end: daysEnd,
      phone: (gym as any).phone || "",
      email: (gym as any).email || "",
      is_active: gym.is_active,
    });
    setImageFiles([]);
    setExistingImages(((gym as any).images as { id: number; image_url: string }[]) || []);
    setModalMode("edit");
  };

  const openViewModal = (gym: Gym) => {
    setSelectedGym(gym);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedGym(null);
    setSaving(false);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("location", form.location.trim());
    fd.append("description", form.description.trim());
    const workingHours =
      form.working_hours_start && form.working_hours_end
        ? `${form.working_hours_start} - ${form.working_hours_end}`
        : "";
    const workingDays =
      form.working_days_start && form.working_days_end
        ? `${form.working_days_start} - ${form.working_days_end}`
        : "";
    fd.append("working_hours", workingHours);
    fd.append("working_days", workingDays);
    fd.append("phone", form.phone.trim());
    fd.append("email", form.email.trim());
    if (form.owner_id.trim()) {
      fd.append("owner_id", form.owner_id.trim());
    }
    fd.append("is_active", form.is_active ? "1" : "0");
    imageFiles.slice(0, 5).forEach((file) => {
      fd.append("images", file);
    });
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.name.trim()) {
      showError("Gym name is required.");
      return;
    }

     if (!form.owner_id.trim()) {
       showError("Gym owner is required.");
       return;
     }

    setSaving(true);
    try {
      const fd = buildFormData();
      if (modalMode === "create") {
        await createGym(fd);
        showSuccess("Gym created successfully");
      } else if (modalMode === "edit" && selectedGym) {
        await updateGym(selectedGym.id, fd);
        showSuccess("Gym updated successfully");
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Gyms" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search gyms by name or address..."
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
                Add Gym
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Name</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Location</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Active</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-stone-700">
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {(row as any).location || "—"}
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
                          className="text-stone-500 hover:text-stone-700 dark:text-stone-300 dark:hover:text-white text-xs font-medium"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="text-brand-500 hover:text-brand-600 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id, row.name)}
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
              {modalMode === "create" && "Add Gym"}
              {modalMode === "edit" && "Edit Gym"}
              {modalMode === "view" && "Gym Details"}
            </h4>
            {selectedGym && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ID #{selectedGym.id}
              </p>
            )}
          </div>

          {isViewMode && selectedGym ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Name
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedGym.name}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Location
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {(selectedGym as any).location || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Description
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedGym.description || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Working Hours
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {(selectedGym as any).working_hours || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Working Days
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {(selectedGym as any).working_days || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Contact
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {(selectedGym as any).phone || "—"}
                    {(selectedGym as any).email ? ` · ${(selectedGym as any).email}` : ""}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedGym.is_active
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border border-red-500/40 bg-red-500/10 text-red-500"
                    }`}
                  >
                    {selectedGym.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Gym Name</Label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Downtown Fitness"
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="City, area"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Description</Label>
                  <Input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short description"
                  />
                </div>
                <div>
                  <Label>Owner</Label>
                  <select
                    value={form.owner_id}
                    onChange={(e) => setForm((f) => ({ ...f, owner_id: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">{ownersLoading ? "Loading owners..." : "Select owner"}</option>
                    {owners.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Working Hours</Label>
                  <select
                    value={form.working_hours_start}
                    onChange={(e) => setForm((f) => ({ ...f, working_hours_start: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">Start time</option>
                    {WORKING_HOUR_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <select
                      value={form.working_hours_end}
                      onChange={(e) => setForm((f) => ({ ...f, working_hours_end: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    >
                      <option value="">End time</option>
                      {WORKING_HOUR_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Working Days</Label>
                  <select
                    value={form.working_days_start}
                    onChange={(e) => setForm((f) => ({ ...f, working_days_start: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="">Start day</option>
                    {WORKING_DAY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2">
                    <select
                      value={form.working_days_end}
                      onChange={(e) => setForm((f) => ({ ...f, working_days_end: e.target.value }))}
                      className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    >
                      <option value="">End day</option>
                      {WORKING_DAY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Contact phone"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Contact email"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {modalMode === "edit" && existingImages.length > 0 && (
                  <div>
                    <Label>Current images</Label>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {existingImages.map((img) => (
                        <div
                          key={img.id}
                          className="relative h-20 w-20 overflow-hidden rounded-lg border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800"
                        >
                          <img
                            src={resolveGymImageUrl(img.image_url)}
                            alt="Gym"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label>{modalMode === "edit" ? "Replace images (max 5)" : "Images (max 5)"}</Label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(0, 5);
                      setImageFiles(files);
                    }}
                    className="block w-full text-xs text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-stone-800 hover:file:bg-stone-200 dark:text-stone-100 dark:file:bg-stone-800 dark:file:text-stone-100 dark:hover:file:bg-stone-700"
                  />
                  {imageFiles.length > 0 && (
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {imageFiles.length} file{imageFiles.length > 1 ? "s" : ""} selected
                    </p>
                  )}
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
                  {saving ? "Saving..." : modalMode === "create" ? "Create Gym" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
