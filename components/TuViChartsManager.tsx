"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

export interface TuViChartRow {
  user_id: string;
  updated_at: string | null;
}

export default function TuViChartsManager({
  initialCharts,
}: {
  initialCharts: TuViChartRow[];
}) {
  const [charts, setCharts] = useState<TuViChartRow[]>(initialCharts);
  const [deleting, setDeleting] = useState<string | null>(null);

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
        alert(body?.error ?? "Xóa thất bại");
      }
    } finally {
      setDeleting(null);
    }
  };

  if (charts.length === 0) {
    return <p className="text-stone-500">Chưa có lá số nào được lưu.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-stone-500 border-b">
            <th className="py-2 pr-4">User ID</th>
            <th className="py-2 pr-4">Cập nhật</th>
            <th className="py-2">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {charts.map((c) => (
            <tr key={c.user_id} className="border-b">
              <td className="py-2 pr-4 font-mono text-xs">{c.user_id}</td>
              <td className="py-2 pr-4">
                {c.updated_at ? new Date(c.updated_at).toLocaleString() : "-"}
              </td>
              <td className="py-2">
                <button
                  onClick={() => handleDelete(c.user_id)}
                  disabled={deleting === c.user_id}
                  className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
