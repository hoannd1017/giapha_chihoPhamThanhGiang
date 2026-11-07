import { NextResponse } from "next/server";
import { getIsAdmin, getSupabase, getUser } from "@/utils/supabase/queries";

const TABLE = "tuvi_charts";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id");

  const isAdmin = await getIsAdmin();
  let queryUserId = user.id;
  if (targetUserId && targetUserId !== user.id) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    queryUserId = targetUserId;
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select("data, updated_at")
    .eq("user_id", queryUserId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ data: data?.data ?? null, updated_at: data?.updated_at ?? null });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { data?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const supabase = await getSupabase();
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: user.id,
      data: body?.data ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("user_id");

  const supabase = await getSupabase();
  let error;
  if (targetUserId) {
    ({ error } = await supabase.from(TABLE).delete().eq("user_id", targetUserId));
  } else {
    ({ error } = await supabase
      .from(TABLE)
      .delete()
      .neq("user_id", "00000000-0000-0000-0000-000000000000"));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
