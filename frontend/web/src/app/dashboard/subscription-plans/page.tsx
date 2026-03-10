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
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  exportSubscriptionPlans,
  getGyms,
  type SubscriptionPlan,
  type Gym,
} from "@/lib/api/dashboard";
import React, { useEffect, useState } from "react";

type PlanModalMode = "view" | "create" | "edit" | null;

export default function SubscriptionPlansPage() {
  const [data, setData] = useState<SubscriptionPlan[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [gymFilter, setGymFilter] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modalMode, setModalMode] = useState<PlanModalMode>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoaded, setGymsLoaded] = useState(false);

  const { error: showError, success: showSuccess } = useToast();

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

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSubscriptionPlans({
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
      showError(e instanceof Error ? e.message : "Failed to load subscription plans");
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
  }, []);

  const [form, setForm] = useState({
    gym_id: "",
    name: "",
    duration_days: "",
    price: "",
    description: "",
    is_active: true,
  });

  const resetForm = () => {
    setForm({
      gym_id: "",
      name: "",
      duration_days: "",
      price: "",
      description: "",
      is_active: true,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setSelectedPlan(null);
    setModalMode("create");
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setForm({
      gym_id: String(plan.gym_id),
      name: plan.name,
      duration_days: String(plan.duration_days),
      price: String(plan.price),
      description: plan.description || "",
      is_active: plan.is_active,
    });
    setModalMode("edit");
  };

  const openViewModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedPlan(null);
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete subscription plan "${name}"?`)) return;
    try {
      await deleteSubscriptionPlan(id);
      showSuccess("Subscription plan deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.gym_id || !form.name.trim()) {
      showError("Gym and plan name are required.");
      return;
    }
    if (!form.duration_days || Number.isNaN(Number(form.duration_days))) {
      showError("Duration (days) must be a valid number.");
      return;
    }
    if (!form.price || Number.isNaN(Number(form.price))) {
      showError("Price must be a valid number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        gym_id: Number(form.gym_id),
        name: form.name.trim(),
        duration_days: Number(form.duration_days),
        price: Number(form.price),
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      };

      if (modalMode === "create") {
        await createSubscriptionPlan(payload);
        showSuccess("Subscription plan created successfully");
      } else if (modalMode === "edit" && selectedPlan) {
        await updateSubscriptionPlan(selectedPlan.id, payload);
        showSuccess("Subscription plan updated successfully");
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

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSubscriptionPlans({
        search: search || undefined,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
        is_active:
          statusFilter === ""
            ? undefined
            : statusFilter === "active"
            ? true
            : false,
      });
      showSuccess("Subscription plans exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const formatPrice = (value: unknown) => {
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isNaN(num)) return String(value ?? "");
    return num.toFixed(2);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Subscription Plans" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search plans by name..."
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
                Add Plan
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Plan</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Gym</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Duration
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                    Price
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
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {resolveGymName(row.gym_id)}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.duration_days} days
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      ${formatPrice(row.price)}
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
              {modalMode === "create" && "Add Subscription Plan"}
              {modalMode === "edit" && "Edit Subscription Plan"}
              {modalMode === "view" && "Plan Details"}
            </h4>
            {selectedPlan && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">ID #{selectedPlan.id}</p>
            )}
          </div>

          {isViewMode && selectedPlan ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Plan
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedPlan.name}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Gym
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {resolveGymName(selectedPlan.gym_id)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Duration
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedPlan.duration_days} days
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Price
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      ${formatPrice(selectedPlan.price)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Description
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedPlan.description || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedPlan.is_active
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border border-red-500/40 bg-red-500/10 text-red-500"
                    }`}
                  >
                    {selectedPlan.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div>
                  <Label>Plan Name</Label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Monthly, Yearly"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Duration (days)</Label>
                  <Input
                    type="number"
                    value={form.duration_days}
                    onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
                    placeholder="e.g. 30"
                    min={1}
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="e.g. 49.99"
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description"
                />
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
                  {saving ? "Saving..." : modalMode === "create" ? "Create Plan" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

