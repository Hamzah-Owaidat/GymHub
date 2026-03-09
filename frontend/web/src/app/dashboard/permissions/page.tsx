"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import {
  getPermissions,
  exportPermissions,
  deletePermission,
  createPermission,
  updatePermission,
  type Permission,
} from "@/lib/api/dashboard";
import React, { useEffect, useState } from "react";

type PermissionModalMode = "view" | "create" | "edit" | null;

export default function PermissionsPage() {
  const [data, setData] = useState<Permission[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);

  const [modalMode, setModalMode] = useState<PermissionModalMode>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [saving, setSaving] = useState(false);

  const { error: showError, success: showSuccess } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPermissions({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        sortBy: "created_at",
        sortDir: "desc",
      });
      setData(res.data);
      setPagination((p) => ({ ...p, ...res.pagination }));
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load permissions");
    } finally {
      setLoading(false);
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
      await exportPermissions({ search: search || undefined });
      showSuccess("Permissions exported");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Delete permission "${code}"?`)) return;
    try {
      await deletePermission(id);
      showSuccess("Permission deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  const resetForm = () => {
    setForm({
      code: "",
      name: "",
      description: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setSelectedPermission(null);
    setModalMode("create");
  };

  const openEditModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setForm({
      code: permission.code,
      name: permission.name,
      description: permission.description || "",
    });
    setModalMode("edit");
  };

  const openViewModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setModalMode("view");
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedPermission(null);
    setSaving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMode || modalMode === "view") return;

    if (!form.code.trim() || !form.name.trim()) {
      showError("Code and name are required.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "create") {
        await createPermission({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
        showSuccess("Permission created successfully");
      } else if (modalMode === "edit" && selectedPermission) {
        await updatePermission(selectedPermission.id, {
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        });
        showSuccess("Permission updated successfully");
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
      <PageBreadcrumb pageTitle="Permissions" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-col gap-6 border-b border-stone-100 p-6 dark:border-stone-700 md:p-8">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search permissions by code or name..."
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
              Manage system permissions used across roles.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add Permission
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
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Code</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Name</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Description</th>
                  <th className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-stone-700">
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold uppercase text-stone-800 dark:text-stone-100">
                      {row.code}
                    </td>
                    <td className="px-4 py-3 text-stone-700 dark:text-stone-200">{row.name}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {row.description || "—"}
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
                          onClick={() => handleDelete(row.id, row.code)}
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
              {modalMode === "create" && "Add Permission"}
              {modalMode === "edit" && "Edit Permission"}
              {modalMode === "view" && "Permission Details"}
            </h4>
            {selectedPermission && isViewMode && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ID #{selectedPermission.id}
              </p>
            )}
          </div>

          {isViewMode && selectedPermission ? (
            <div className="mt-6 space-y-6 px-1">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Code
                  </p>
                  <p className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-mono font-semibold uppercase text-stone-800 dark:bg-stone-800 dark:text-stone-100">
                    {selectedPermission.code}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Name
                  </p>
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                    {selectedPermission.name}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Description
                  </p>
                  <p className="text-sm text-stone-900 dark:text-stone-50">
                    {selectedPermission.description || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-6 px-1" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Code</Label>
                  <Input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="e.g. users.view"
                  />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Readable name"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short description of what this permission allows"
                />
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
                  {saving ? "Saving..." : modalMode === "create" ? "Create Permission" : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
