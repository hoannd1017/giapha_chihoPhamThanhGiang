"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminUserData } from "@/types";

export interface TuViChartRow {
  user_id: string;
  updated_at: string | null;
}

export default function TuViChartsManager({
  initialUsers,
  initialCharts,
}: {
  initialUsers: AdminUserData[];
  initialCharts: TuViChartRow[];
}) {
  const [charts, setCharts] = useState<TuViChartRow[]>(initialCharts);
  const [deleting, setDeleting] = useState<string | null>(null);

  const chartMap = new Map(charts.map((c) => [c.user_id, c.updated_at]));

  const handleDelete = async (userId: string) => {
    if (!confirm("Xóa lá số của user này?")) return;
    setDeleting(userId);
    try {
      const res = await fetch(`/api/tuvi-data?user_id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCharts((prev) => prev.filter((c) => c.user_id !== userId));
      } else {
        const body = await res.json().catch(() => ({}));
        alert((body as { error?: string })?.error ?? "Xóa thất bại");
      }
    } finally {
      setDeleting(null);
    }
  };

  if (initialUsers.length === 0) {
    return <p className="text-stone-500">Chưa có tài khoản nào.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500 border-b">
            <th className="py-2 pr-4">Email / User</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2 pr-4">Lá số</th>
            <th className="py-2 pr-4">Cập nhật</th>
            <th className="py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {initialUsers.map((u) => {
            const updatedAt = chartMap.get(u.id) ?? null;
            const hasChart = chartMap.has(u.id);
            return (
              <tr key={u.id} className="border-b">
                <td className="py-2 pr-4">
                  <div className="font-medium">{u.email}</div>
                  <div className="font-mono text-xs text-stone-400">{u.id}</div>
                </td>
                <td className="py-2 pr-4">{u.role}</td>
                <td className="py-2 pr-4">
                  {hasChart ? (
                    <span className="text-emerald-600 font-medium">Đã lưu</span>
                  ) : (
                    <span className="text-stone-400">Chưa có</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {updatedAt ? new Date(updatedAt).toLocaleString() : "-"}
                </td>
                <td className="py-2">
                  {hasChart ? (
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={deleting === u.id}
                      className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                      Xóa
                    </button>
                  ) : (
                    <span className="text-stone-300">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
