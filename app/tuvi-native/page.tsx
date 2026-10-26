import { redirect } from "next/navigation";
import { getProfile } from "@/utils/supabase/queries";
import Link from "next/link";

export default async function TuViNativePage() {
  const profile = await getProfile();
  const role = profile?.role;
  const allowed = role === "admin" || role === "editor" || role === "member";

  if (!allowed) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="p-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-stone-300 hover:text-white"
        >
          ← Quay lại
        </Link>
      </div>
      <iframe
        src="/tuvi-native/index.html"
        title="Tu Vi Native"
        className="w-full h-[calc(100vh-56px)] border-0"
        allow="fullscreen; autoplay; cross-origin-isolated"
      />
    </div>
  );
}
