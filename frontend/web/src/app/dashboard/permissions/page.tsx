"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/common/Pagination";
import { getPermissions, exportPermissions, deletePermission, type Permission } from "@/lib/api/dashboard";
import { useToast } from "@/context/ToastContext";
import { DownloadIcon, TrashBinIcon } from "@/icons";
import React, { useEffect, useState } from "react";

export default function PermissionsPage() {
  const [data, setData] = useState<Permission[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPermissions({ page: pagination.page, limit: pagination.limit, search: search || undefined });
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
  }, [pagination.page, pagination.limit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    load();
  };

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
    if (!confirm("Delete permission \"" + code + "\"?")) return;
    try {
      await deletePermission(id);
      showSuccess("Permission deleted");
      load();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="Permissions" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-stone-100 p-4 dark:border-stone-700 md:p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input type="text" placeholder="Search permissions..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100" />
            <button type="submit" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Search</button>
          </form>
          <button type="button" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 disabled:opacity-50">
            <DownloadIcon className="h-4 w-4" /> Export Excel
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex min-h-[12rem] items-center justify-center text-stone-500 dark:text-stone-400">Loading...</div>
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
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">{row.code}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">{row.name}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">{row.description || "-"}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => handleDelete(row.id, row.code)} className="text-red-500 hover:text-red-600"><TrashBinIcon className="h-4 w-4" /></button>
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
