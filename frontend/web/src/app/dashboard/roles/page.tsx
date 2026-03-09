"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import {
  getRoles,
  exportRoles,
  deleteRole,
  getPermissions,
  createRole,
  updateRole,
  type Role,
  type Permission,
} from "@/lib/api/dashboard";
import React, { useEffect, useMemo, useState } from "react";

type RoleModalMode = "view" | "create" | "edit" | null;

export default function RolesPage() {
  const [data, setData] = useState<Role[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);

  const [modalMode, setModalMode] = useState<RoleModalMode>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  const { error: showError, success: showSuccess } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getRoles({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const ensurePermissionsLoaded = async () => {
    if (permissionsLoaded) return;
    try {
      const res = await getPermissions({ page: 1, limit: 200 });
      setPermissions(res.data);
      setPermissionsLoaded(true);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load permissions");
    }
  };

  useEffect(() => {
    load();
  }, [pagination.page, pagination.limit, search]);

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
      await exportRoles({ search: search || undefined });
      showSuccess("Roles exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    try {
      await deleteRole(id);
      showSuccess("Role deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const [form, setForm] = useState({
    name: "",
    description: "",
  });
  const [permissionSearch, setPermissionSearch] = useState("");

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
    });
    setSelectedPermissionIds([]);
  };

  const openCreateModal = async () => {
    resetForm();
    setSelectedRole(null);
    setModalMode("create");
    await ensurePermissionsLoaded();
  };

  const openEditModal = async (role: Role) => {
    setSelectedRole(role);
    setForm({
      name: role.name,
      description: (role as any).description || "",
    });
    const perms = (role as any).permissions as { id: number }[] | undefined;
    setSelectedPermissionIds(perms?.map((p) => p.id) ?? []);
    setModalMode("edit");
    await ensurePermissionsLoaded();
  };

  const openViewModal = (role: Role) => {
    setSelectedRole(role);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedRole(null);
    setSaving(false);
  };

  const togglePermission = (id: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.name.trim()) {
      showError("Role name is required.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        await createRole({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permission_ids: selectedPermissionIds,
        });
        showSuccess("Role created successfully");
      } else if (modalMode === "edit" && selectedRole) {
        await updateRole(selectedRole.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permission_ids: selectedPermissionIds,
        });
        showSuccess("Role updated successfully");
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

  const permissionOptions = useMemo(
    () =>
      permissions.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        label: `${p.code} — ${p.name}`,
      })),
    [permissions],
  );

  const filteredPermissionOptions = useMemo(() => {
    if (!permissionSearch.trim()) return permissionOptions;
    const term = permissionSearch.trim().toLowerCase();
    return permissionOptions.filter(
      (p) =>
        p.code.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term),
    );
  }, [permissionOptions, permissionSearch]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Roles" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search roles by name or description..."
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

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Manage system roles and their permissions.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add Role
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Description</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Permissions</th>
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
                      {(row as any).description || "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {(row as any).permissions?.length ? (
                        <span className="inline-flex max-w-xs items-center gap-1 truncate align-middle">
                          <span className="truncate">
                            {(row as any).permissions
                              .slice(0, 3)
                              .map((p: any) => p.code)
                              .join(", ")}
                          </span>
                          {(row as any).permissions.length > 3 && (
                            <span className="text-xs text-stone-400 dark:text-stone-500">
                              +{(row as any).permissions.length - 3} more
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
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

      <Modal isOpen={modalMode !== null} onClose={handleCloseModal} className="max-w-[720px] m-4">
        <div className="no-scrollbar relative w-full max-w-[720px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-stone-900 md:p-8">
          <div className="px-1 pr-10">
            <h4 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-50">
              {modalMode === "create" && "Add Role"}
              {modalMode === "edit" && "Edit Role"}
              {modalMode === "view" && "Role Details"}
            </h4>
            {selectedRole && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ID #{selectedRole.id}
              </p>
            )}
          </div>

          {isViewMode && selectedRole ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Name
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedRole.name}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Description
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {(selectedRole as any).description || "—"}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Permissions
                  </p>
                  {(selectedRole as any).permissions?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedRole as any).permissions.map((p: any) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                        >
                          <span className="mr-1 font-semibold">{p.code}</span>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400">
                            {p.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      No permissions
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Role Name</Label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Admin"
                  />
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
              </div>

              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 rounded-2xl border border-stone-200 p-3 dark:border-stone-700">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <input
                      type="text"
                      value={permissionSearch}
                      onChange={(e) => setPermissionSearch(e.target.value)}
                      placeholder="Filter by code or name..."
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
                    />
                    {permissionOptions.length > 0 && (
                      <div className="mt-1 flex gap-2 sm:mt-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPermissionIds(permissionOptions.map((p) => p.id))
                          }
                          className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPermissionIds([])}
                          className="rounded-full bg-transparent px-2.5 py-1 text-[11px] font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="custom-scrollbar max-h-64 space-y-2 overflow-y-auto pt-1">
                    {permissionOptions.length === 0 ? (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {permissionsLoaded ? "No permissions found." : "Loading permissions..."}
                      </p>
                    ) : filteredPermissionOptions.length === 0 ? (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        No permissions match "{permissionSearch}".
                      </p>
                    ) : (
                      filteredPermissionOptions.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 dark:text-stone-200 dark:hover:bg-stone-800"
                        >
                          <span className="flex-1 truncate">{perm.label}</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-stone-300 text-brand-500 focus:ring-brand-500"
                            checked={selectedPermissionIds.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                          />
                        </label>
                      ))
                    )}
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
                  {saving ? "Saving..." : modalMode === "create" ? "Create Role" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
