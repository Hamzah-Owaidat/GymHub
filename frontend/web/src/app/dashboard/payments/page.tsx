"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  exportPayments,
  getGyms,
  getUsers,
  type Payment,
  type Gym,
  type User,
} from "@/lib/api/dashboard";
import { useAuthStore } from "@/store/authStore";
import React, { useEffect, useState } from "react";

type PaymentModalMode = "view" | "create" | "edit" | null;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const METHODS = ["cash", "credit_card", "debit_card", "bank_transfer", "online"] as const;
const STATUSES = ["pending", "paid", "failed"] as const;

const emptyForm = {
  user_id: "",
  gym_id: "",
  amount: "",
  method: "cash",
  status: "pending",
  subscription_id: "",
  session_id: "",
};

const formatPrice = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? "0.00" : n.toFixed(2);
};

const formatMethod = (m: string | null) =>
  m
    ? m
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "N/A";

export default function PaymentsPage() {
  const [data, setData] = useState<Payment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "paid" | "failed" | "">("");
  const [gymFilter, setGymFilter] = useState<number | "">("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modalMode, setModalMode] = useState<PaymentModalMode>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoaded, setGymsLoaded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

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

  const loadUsers = async () => {
    if (usersLoaded) return;
    const role = useAuthStore.getState().user?.role;
    if (role !== "admin") { setUsersLoaded(true); return; }
    try {
      const res = await getUsers({ page: 1, limit: 1000, is_active: true });
      setUsers(res.data);
      setUsersLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load users");
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPayments({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
        method: methodFilter || undefined,
      });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, search, statusFilter, gymFilter, methodFilter]);

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
    loadUsers();
  }, []);

  const [form, setForm] = useState(emptyForm);

  const resetForm = () => setForm({ ...emptyForm });

  const openCreateModal = () => {
    resetForm();
    setSelectedPayment(null);
    setModalMode("create");
  };

  const openEditModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setForm({
      user_id: String(payment.user_id),
      gym_id: String(payment.gym_id),
      amount: String(payment.amount),
      method: payment.method || "cash",
      status: payment.status,
      subscription_id: payment.subscription_id != null ? String(payment.subscription_id) : "",
      session_id: payment.session_id != null ? String(payment.session_id) : "",
    });
    setModalMode("edit");
  };

  const openViewModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedPayment(null);
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Delete payment #${id}?`)) return;
    try {
      await deletePayment(id);
      showSuccess("Payment deleted");
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
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      showError("Amount must be a valid positive number.");
      return;
    }

    setSaving(true);
    try {
      const payload: Parameters<typeof createPayment>[0] = {
        user_id: Number(form.user_id),
        gym_id: Number(form.gym_id),
        amount: Number(form.amount),
        method: form.method,
        status: form.status,
        subscription_id: form.subscription_id ? Number(form.subscription_id) : null,
        session_id: form.session_id ? Number(form.session_id) : null,
      };

      if (modalMode === "create") {
        await createPayment(payload);
        showSuccess("Payment created successfully");
      } else if (modalMode === "edit" && selectedPayment) {
        await updatePayment(selectedPayment.id, payload);
        showSuccess("Payment updated successfully");
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

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPayments({
        search: search || undefined,
        gym_id: gymFilter === "" ? undefined : Number(gymFilter),
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      showSuccess("Payments exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const resolveGymName = (gym_id: number) => {
    const g = gyms.find((gym) => gym.id === gym_id);
    return g ? g.name : `#${gym_id}`;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Payments" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search payments by user name or email..."
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
                  const value = e.target.value as "" | "pending" | "paid" | "failed";
                  setStatusFilter(value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-11 min-w-[140px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
              </select>
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-11 min-w-[160px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">All methods</option>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {formatMethod(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add Payment
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Amount</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Method</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Status</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Subscription</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Session</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Created At</th>
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
                      {row.gym_name || resolveGymName(row.gym_id)}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      ${formatPrice(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {formatMethod(row.method)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE[row.status] ?? ""
                        }`}
                      >
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.subscription_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.session_id ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {new Date(row.created_at).toLocaleDateString()}
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
              {modalMode === "create" && "Add Payment"}
              {modalMode === "edit" && "Edit Payment"}
              {modalMode === "view" && "Payment Details"}
            </h4>
            {selectedPayment && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">ID #{selectedPayment.id}</p>
            )}
          </div>

          {isViewMode && selectedPayment ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    User
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedPayment.user_first_name} {selectedPayment.user_last_name}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {selectedPayment.user_email}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Gym
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedPayment.gym_name || resolveGymName(selectedPayment.gym_id)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Amount
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      ${formatPrice(selectedPayment.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Method
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {formatMethod(selectedPayment.method)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_BADGE[selectedPayment.status] ?? ""
                    }`}
                  >
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Subscription ID
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedPayment.subscription_id ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      Session ID
                    </p>
                    <p className="text-sm text-stone-900 dark:text-stone-50">
                      {selectedPayment.session_id ?? "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Created At
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {new Date(selectedPayment.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>User</Label>
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
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 49.99"
                    min={0}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Method</Label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {formatMethod(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-700 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Subscription ID (optional)</Label>
                  <Input
                    type="number"
                    value={form.subscription_id}
                    onChange={(e) => setForm((f) => ({ ...f, subscription_id: e.target.value }))}
                    placeholder="Leave blank if N/A"
                    min={1}
                  />
                </div>
                <div>
                  <Label>Session ID (optional)</Label>
                  <Input
                    type="number"
                    value={form.session_id}
                    onChange={(e) => setForm((f) => ({ ...f, session_id: e.target.value }))}
                    placeholder="Leave blank if N/A"
                    min={1}
                  />
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
                  {saving ? "Saving..." : modalMode === "create" ? "Create Payment" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
