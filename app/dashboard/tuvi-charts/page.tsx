import { redirect } from "next/navigation";
import { getIsAdmin, getSupabase } from "@/utils/supabase/queries";
import { AdminUserData } from "@/types";
import TuViChartsManager from "@/components/TuViChartsManager";

export default async function TuViChartsPage() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const supabase = await getSupabase();

  const [{ data: users }, { data: charts }] = await Promise.all([
    supabase.rpc("get_admin_users"),
    supabase.from("tuvi_charts").select("user_id, updated_at"),
  ]);

  const typedUsers = (users as AdminUserData[]) || [];
  const typedCharts = (charts ?? []).map((r) => ({
    user_id: (r as { user_id: string }).user_id,
    updated_at: (r as { updated_at: string | null }).updated_at ?? null,
  }));

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="title">Quản lý Lá số Tử Vi</h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Danh sách tài khoản và trạng thái lá số đã lưu.
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200/60 p-6 shadow-sm">
          <TuViChartsManager initialUsers={typedUsers} initialCharts={typedCharts} />
        </div>
      </div>
    </main>
  );
}
