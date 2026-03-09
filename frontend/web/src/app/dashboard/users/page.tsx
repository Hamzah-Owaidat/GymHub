"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import {
  getUsers,
  exportUsers,
  deleteUser,
  getRoles,
  type User,
  type Role,
  createUser,
  updateUser,
} from "@/lib/api/dashboard";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

type UserModalMode = "view" | "create" | "edit" | null;

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

  const [modalMode, setModalMode] = useState<UserModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role_id: "",
    dob: "",
    phone: "",
    phone_country_code: "",
    is_active: true,
  });

  const { isOpen, openModal, closeModal } = useModal();
  const { error: showError, success: showSuccess } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        role_id: roleFilter ? Number(roleFilter) : undefined,
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
      showError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const ensureRolesLoaded = async () => {
    if (rolesLoaded) return;
    try {
      const res = await getRoles({ page: 1, limit: 100 });
      setRoles(res.data);
      setRolesLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load roles");
    }
  };

  useEffect(() => {
    // Preload roles so the filter select has data immediately
    void ensureRolesLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, search, roleFilter, statusFilter]);

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
      await exportUsers({ search: search || undefined });
      showSuccess("Users exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Delete user "${email}"?`)) return;
    try {
      await deleteUser(id);
      showSuccess("User deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const resetForm = () => {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      role_id: "",
      dob: "",
      phone: "",
      phone_country_code: "",
      is_active: true,
    });
  };

  const openCreateModal = async () => {
    resetForm();
    setSelectedUser(null);
    setModalMode("create");
    openModal();
    await ensureRolesLoaded();
  };

  const openEditModal = async (user: User) => {
    setSelectedUser(user);
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      password: "",
      role_id: user.role_id ? String(user.role_id) : "",
      dob: user.dob ? new Date(user.dob).toISOString().slice(0, 10) : "",
      phone: user.phone ?? "",
      phone_country_code: user.phone_country_code ?? "",
      is_active: user.is_active,
    });
    setModalMode("edit");
    openModal();
    await ensureRolesLoaded();
  };

  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setModalMode("view");
    openModal();
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setSaving(false);
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.first_name || !form.last_name || !form.email || !form.role_id) {
      showError("Please fill in all required fields.");
      return;
    }

    if (modalMode === "create" && !form.password) {
      showError("Password is required for new users.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        await createUser({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          role_id: Number(form.role_id),
          dob: form.dob || undefined,
          phone: form.phone || undefined,
          phone_country_code: form.phone_country_code || undefined,
        });
        showSuccess("User created successfully");
      } else if (modalMode === "edit" && selectedUser) {
        await updateUser(selectedUser.id, {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          role_id: Number(form.role_id),
          is_active: form.is_active,
          dob: form.dob || undefined,
          phone: form.phone || undefined,
          phone_country_code: form.phone_country_code || undefined,
        });
        showSuccess("User updated successfully");
      }

      handleCloseModal();
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: role.name })),
    [roles],
  );

  const filterRoleOptions = useMemo(
    () => [{ value: "", label: "All roles" }, ...roleOptions],
    [roleOptions],
  );

  const isViewMode = modalMode === "view";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Users" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left Side - Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 text-stone-400 dark:text-stone-500"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Filters
                </span>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="w-full sm:w-56">
                  <Select
                    options={filterRoleOptions}
                    placeholder={rolesLoaded ? "All roles" : "Loading roles..."}
                    defaultValue={roleFilter}
                    onChange={(value) => {
                      setRoleFilter(value);
                      setPagination((p) => ({ ...p, page: 1 }));
                    }}
                    className="w-full"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    const value = e.target.value as "" | "active" | "inactive";
                    setStatusFilter(value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="h-11 w-full rounded-xl border-0 bg-stone-50 px-3.5 text-sm text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-stone-900 dark:text-stone-100 dark:focus:bg-stone-800 sm:w-44"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              {/* Active Filter Indicator */}
              {(roleFilter || statusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter("");
                    setStatusFilter("");
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  Clear filters
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Right Side - Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-stone-600 dark:hover:bg-stone-700"
              >
                <DownloadIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Add User
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center text-stone-500 dark:text-stone-400">Loading...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-100 bg-stone-50 dark:border-stone-700 dark:bg-stone-700">
                <tr>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">ID</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Avatar</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Name</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Email</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Phone</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">DOB</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Role</th>
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
                    <td className="px-4 py-3">
                      {row.profile_image ? (
                        <div className="h-9 w-9 overflow-hidden rounded-full border border-stone-200 bg-stone-100 dark:border-stone-700">
                          <Image
                            src={row.profile_image}
                            alt={`${row.first_name} ${row.last_name}`}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-xs font-semibold uppercase text-white">
                          {(row.first_name || "")
                            .slice(0, 2)
                            .toUpperCase() || "US"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">
                      {row.first_name} {row.last_name}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">{row.email}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.phone_country_code || row.phone
                        ? `${row.phone_country_code || ""} ${row.phone || ""}`.trim()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.dob ? new Date(row.dob).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">{row.role ?? "—"}</td>
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
                          onClick={() => handleDelete(row.id, row.email)}
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

      <Modal isOpen={isOpen} onClose={handleCloseModal} className="max-w-[720px] m-4">
        <div className="no-scrollbar relative w-full max-w-[720px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-stone-900 md:p-8">
          <div className="px-1 pr-10">
            <h4 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-50">
              {modalMode === "create" && "Add User"}
              {modalMode === "edit" && "Edit User"}
              {modalMode === "view" && "User Details"}
            </h4>
            {selectedUser && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ID #{selectedUser.id} • Created {new Date(selectedUser.created_at).toLocaleString()}
              </p>
            )}
          </div>

          {isViewMode && selectedUser ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Name
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Email
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Phone
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedUser.phone_country_code || selectedUser.phone
                      ? `${selectedUser.phone_country_code || ""} ${selectedUser.phone || ""}`.trim()
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Date of Birth
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Role
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">{selectedUser.role ?? "—"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedUser.is_active
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                        : "border border-red-500/40 bg-red-500/10 text-red-500"
                    }`}
                  >
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>First Name</Label>
                  <Input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                {modalMode === "create" && (
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Set initial password"
                    />
                  </div>
                )}
                <div>
                  <Label>Role</Label>
                  <Select
                    options={roleOptions}
                    placeholder={rolesLoaded ? "Select role" : "Loading roles..."}
                    defaultValue={form.role_id}
                    onChange={(value) => setForm((f) => ({ ...f, role_id: value }))}
                  />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone Country Code</Label>
                  <Input
                    type="text"
                    value={form.phone_country_code}
                    onChange={(e) => setForm((f) => ({ ...f, phone_country_code: e.target.value }))}
                    placeholder="+1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="555 123 4567"
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
                  {saving ? "Saving..." : modalMode === "create" ? "Create User" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}