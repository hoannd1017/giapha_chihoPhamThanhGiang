import { createClient } from "@/utils/supabase/server";
import { computeKinship } from "@/utils/kinshipHelpers";
import { cookies } from "next/headers";

// ── Supabase Client ─────────────────────────────────────────────────────────

async function getDb() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

// ── Tool Definitions (Gemini Function Calling Schema) ───────────────────────

export const toolDefinitions = [
  {
    name: "search_members",
    description:
      "Tìm kiếm thành viên dòng họ theo tên. Trả về danh sách các người khớp tên kèm thông tin cơ bản (tên, giới tính, năm sinh, thế hệ). Dùng khi người dùng hỏi về 1 người cụ thể hoặc muốn tìm ai đó.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Tên cần tìm (có thể nhập một phần, ví dụ: 'Trí', 'Vạn Công Thuận')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_member_family",
    description:
      "Lấy thông tin gia đình đầy đủ của 1 người: bố mẹ, vợ/chồng, con cái, anh chị em ruột. Dùng khi người dùng hỏi 'Ai là bố mẹ của...', 'Vợ con của X là ai?', 'X có anh chị em nào?'",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description: "ID của thành viên (UUID格式, ví dụ: '30000000-0000-0000-0000-000000000001')",
        },
      },
      required: ["memberId"],
    },
  },
  {
    name: "get_kinship",
    description:
      "Tính toán danh xưng xưng hô giữa 2 người trong dòng họ. Trả về 'A gọi B là gì' và 'B gọi A là gì' kèm giải thích. Dùng khi người dùng hỏi 'Trí gọi Minh là gì?', 'Quan hệ giữa A và B là gì?', 'Xưng hô giữa 2 người này'",
    parameters: {
      type: "object",
      properties: {
        memberAId: {
          type: "string",
          description: "ID của người thứ nhất (A)",
        },
        memberBId: {
          type: "string",
          description: "ID của người thứ hai (B)",
        },
      },
      required: ["memberAId", "memberBId"],
    },
  },
  {
    name: "get_tree_statistics",
    description:
      "Lấy thống kê nhanh về dòng họ: tổng số thành viên, phân bố giới tính, số thế hệ, số người đã mất, số người đã kết hôn, số con dâu/con rể. Dùng khi người dùng hỏi 'Dòng họ có bao nhiêu người?', 'Thống kê dòng họ'",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_branch_overview",
    description:
      "Xem tổng quan các nhánh trong dòng họ từ tổ tiên gốc. Liệt kê các nhánh con chính (nhánh trưởng, nhánh thứ, nhánh út...) kèm số lượng thành viên mỗi nhánh. Dùng khi người dùng hỏi 'Có những nhánh nào?', 'Nhánh nào lớn nhất?', 'Dòng họ có mấy nhánh?'",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "find_branch_path",
    description:
      "Tìm đường dẫn từ tổ tiên gốc đến 1 thành viên cụ thể, hiển thị từng đời. Dùng khi người dùng hỏi 'X là con cháu đời thứ mấy?', 'Đường từ tổ tiên đến X?', 'X thuộc nhánh nào?'",
    parameters: {
      type: "object",
      properties: {
        memberId: {
          type: "string",
          description: "ID thành viên cần tìm đường dẫn",
        },
      },
      required: ["memberId"],
    },
  },
];

// ── Tool Executors ──────────────────────────────────────────────────────────

type ToolResult = { toolResult: string };

async function searchMembers(args: { query: string }): Promise<ToolResult> {
  const db = await getDb();
  const { data, error } = await db
    .from("persons")
    .select("id, full_name, gender, birth_year, death_year, generation, is_in_law, is_deceased, birth_order")
    .ilike("full_name", `%${args.query}%`)
    .order("birth_year", { ascending: true, nullsFirst: false })
    .limit(10);

  if (error) return { toolResult: `Lỗi truy vấn: ${error.message}` };
  if (!data || data.length === 0)
    return { toolResult: `Không tìm thấy thành viên nào tên "${args.query}".` };

  const lines = data.map(
    (p) =>
      `- ${p.full_name} (ID: ${p.id}, ${p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : "Khác"}, sinh ${p.birth_year ?? "không rõ"}, đời ${p.generation ?? "?"}, ${p.is_deceased ? "đã mất" : "còn sống"}, ${p.is_in_law ? "kết hôn vào dòng họ" : "máu thịt"})`,
  );

  return {
    toolResult: `Tìm thấy ${data.length} thành viên:\n${lines.join("\n")}`,
  };
}

async function getMemberFamily(args: { memberId: string }): Promise<ToolResult> {
  const db = await getDb();

  const { data: person } = await db
    .from("persons")
    .select("*")
    .eq("id", args.memberId)
    .single();

  if (!person) return { toolResult: `Không tìm thấy thành viên ID: ${args.memberId}` };

  const { data: rels } = await db
    .from("relationships")
    .select("*, target:persons!person_b(*), source:persons!person_a(*)")
    .or(`person_a.eq.${args.memberId},person_b.eq.${args.memberId}`);

  const spouses: string[] = [];
  const children: string[] = [];
  const parents: string[] = [];

  rels?.forEach((r) => {
    if (r.type === "marriage") {
      const spouse = r.person_a === args.memberId ? r.target : r.source;
      if (spouse) spouses.push(`${spouse.full_name} (ID: ${spouse.id})`);
    } else if (r.type === "biological_child" || r.type === "adopted_child") {
      if (r.person_a === args.memberId) {
        const child = r.target;
        if (child) children.push(`${child.full_name} (ID: ${child.id})`);
      } else {
        const parent = r.source;
        if (parent) parents.push(`${parent.full_name} (ID: ${parent.id})`);
      }
    }
  });

  const lines = [
    `Họ tên: ${person.full_name}`,
    `Giới tính: ${person.gender === "male" ? "Nam" : person.gender === "female" ? "Nữ" : "Khác"}`,
    `Năm sinh: ${person.birth_year ?? "không rõ"}, Năm mất: ${person.death_year ?? "không rõ"}`,
    `Thế hệ: ${person.generation ?? "chưa xác định"}, Thứ tự sinh: ${person.birth_order ?? "không rõ"}`,
    `Trạng thái: ${person.is_deceased ? "Đã mất" : "Còn sống"}, ${person.is_in_law ? "Kết hôn vào dòng họ (dâu/rể)" : "Máu thịt"}`,
    "",
  ];

  if (parents.length > 0)
    lines.push(`Bố/Mẹ: ${parents.join(", ")}`);
  else lines.push("Bố/Mẹ: Chưa có thông tin");

  if (spouses.length > 0)
    lines.push(`Vợ/Chồng: ${spouses.join(", ")}`);
  else lines.push("Vợ/Chồng: Chưa có thông tin");

  if (children.length > 0)
    lines.push(`Con cái: ${children.join(", ")}`);
  else lines.push("Con cái: Chưa có thông tin");

  if (person.note) lines.push(`\nGhi chú: ${person.note}`);

  return { toolResult: lines.join("\n") };
}

async function getKinship(args: {
  memberAId: string;
  memberBId: string;
}): Promise<ToolResult> {
  const db = await getDb();

  const [{ data: personA }, { data: personB }] = await Promise.all([
    db.from("persons").select("id, full_name, gender, birth_year, birth_order, generation, is_in_law").eq("id", args.memberAId).single(),
    db.from("persons").select("id, full_name, gender, birth_year, birth_order, generation, is_in_law").eq("id", args.memberBId).single(),
  ]);

  if (!personA) return { toolResult: `Không tìm thấy thành viên A (ID: ${args.memberAId})` };
  if (!personB) return { toolResult: `Không tìm thấy thành viên B (ID: ${args.memberBId})` };
  if (personA.id === personB.id)
    return { toolResult: `${personA.full_name} và ${personB.full_name} là cùng 1 người.` };

  const { data: persons } = await db.from("persons").select("id, full_name, gender, birth_year, birth_order, generation, is_in_law");
  const { data: relationships } = await db.from("relationships").select("type, person_a, person_b");

  if (!persons || !relationships)
    return { toolResult: "Lỗi tải dữ liệu gia phả." };

  const result = computeKinship(
    personA as any,
    personB as any,
    persons as any,
    relationships as any,
  );

  if (!result)
    return { toolResult: `Không xác định được quan hệ giữa ${personA.full_name} và ${personB.full_name}.` };

  const lines = [
    `${personA.full_name} gọi ${personB.full_name} là: ${result.aCallsB}`,
    `${personB.full_name} gọi ${personA.full_name} là: ${result.bCallsA}`,
    `Loại quan hệ: ${result.description}`,
  ];

  if (result.pathLabels.length > 0) {
    lines.push("\nChi tiết con đường quan hệ:");
    result.pathLabels.forEach((label, i) => {
      lines.push(`  ${i + 1}. ${label}`);
    });
  }

  return { toolResult: lines.join("\n") };
}

async function getTreeStatistics(): Promise<ToolResult> {
  const db = await getDb();

  const { data: persons } = await db.from("persons").select("id, gender, generation, is_deceased, is_in_law, birth_order");
  const { data: relationships } = await db.from("relationships").select("type, person_a, person_b");

  if (!persons) return { toolResult: "Lỗi tải dữ liệu." };

  const total = persons.length;
  const male = persons.filter((p) => p.gender === "male").length;
  const female = persons.filter((p) => p.gender === "female").length;
  const deceased = persons.filter((p) => p.is_deceased).length;
  const daughtersInLaw = persons.filter((p) => p.is_in_law && p.gender === "female").length;
  const sonsInLaw = persons.filter((p) => p.is_in_law && p.gender === "male").length;

  const marriedIds = new Set<string>();
  relationships
    ?.filter((r) => r.type === "marriage")
    .forEach((r) => {
      marriedIds.add(r.person_a);
      marriedIds.add(r.person_b);
    });
  const married = persons.filter((p) => marriedIds.has(p.id)).length;

  const genMap = new Map<number, number>();
  persons.forEach((p) => {
    if (p.generation != null) {
      genMap.set(p.generation, (genMap.get(p.generation) ?? 0) + 1);
    }
  });
  const genBreakdown = Array.from(genMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([g, c]) => `  Đời ${g}: ${c} người`)
    .join("\n");

  const lines = [
    `Tổng số thành viên: ${total}`,
    `Giới tính: ${male} nam, ${female} nữ`,
    `Đã kết hôn: ${married}, Chưa kết hôn: ${total - married}`,
    `Con dâu: ${daughtersInLaw}, Con rể: ${sonsInLaw}`,
    `Đã mất: ${deceased}, Còn sống: ${total - deceased}`,
    "",
    "Phân bố theo thế hệ:",
    genBreakdown || "  Chưa có dữ liệu thế hệ",
  ];

  return { toolResult: lines.join("\n") };
}

async function getBranchOverview(): Promise<ToolResult> {
  const db = await getDb();

  const { data: persons } = await db.from("persons").select("id, full_name, gender, birth_year, generation, is_in_law");
  const { data: relationships } = await db.from("relationships").select("type, person_a, person_b");

  if (!persons || !relationships) return { toolResult: "Lỗi tải dữ liệu." };

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const childParents = new Map<string, string[]>();
  const parentChildren = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();

  relationships.forEach((r) => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    } else if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, []);
      spouseMap.get(r.person_a)!.push(r.person_b);
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, []);
      spouseMap.get(r.person_b)!.push(r.person_a);
    }
  });

  const roots = persons.filter((p) => !childParents.has(p.id));
  if (roots.length === 0)
    return { toolResult: "Không tìm thấy tổ tiên gốc trong dữ liệu." };

  const lines: string[] = [];

  for (const root of roots) {
    const rootSpouses = (spouseMap.get(root.id) || [])
      .map((sid) => personsMap.get(sid))
      .filter(Boolean);
    const spouseLabel = rootSpouses.length > 0
      ? ` & ${rootSpouses.map((s) => s!.full_name).join(", ")}`
      : "";

    lines.push(`🌳 Tổ tiên gốc: ${root.full_name}${spouseLabel} (Đời ${root.generation ?? "?"})`);

    const children = parentChildren.get(root.id) || [];
    if (children.length === 0) {
      lines.push("  └─ Không có con ghi nhận");
      continue;
    }

    children.forEach((childId, i) => {
      const child = personsMap.get(childId);
      if (!child) return;
      const isLast = i === children.length - 1;
      const prefix = isLast ? "  └─" : "  ├─";
      const spliced = (spouseMap.get(childId) || [])
        .map((sid) => personsMap.get(sid))
        .filter(Boolean);
      const spLabel = spliced.length > 0
        ? ` & ${spliced.map((s) => s!.full_name).join(", ")}`
        : "";

      lines.push(`${prefix} Nhánh ${i + 1}: ${child.full_name}${spLabel} (Đời ${child.generation ?? "?"})`);

      const grandchildren = parentChildren.get(childId) || [];
      grandchildren.forEach((gcId, j) => {
        const gc = personsMap.get(gcId);
        if (!gc) return;
        const gcPrefix = isLast ? "    " : "  │ ";
        const gcSuffix = j === grandchildren.length - 1 ? "" : "";
        lines.push(`${gcPrefix}  ${j === grandchildren.length - 1 ? "└" : "├"}─ ${gc.full_name} (Đời ${gc.generation ?? "?"})`);
      });
    });
  }

  return { toolResult: lines.join("\n") };
}

async function findBranchPath(args: { memberId: string }): Promise<ToolResult> {
  const db = await getDb();

  const { data: person } = await db
    .from("persons")
    .select("id, full_name, gender, generation")
    .eq("id", args.memberId)
    .single();

  if (!person) return { toolResult: `Không tìm thấy thành viên ID: ${args.memberId}` };

  const { data: persons } = await db.from("persons").select("id, full_name, gender, generation");
  const { data: relationships } = await db.from("relationships").select("type, person_a, person_b");

  if (!persons || !relationships)
    return { toolResult: "Lỗi tải dữ liệu." };

  const childParents = new Map<string, string[]>();
  relationships.forEach((r) => {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);
    }
  });

  const personsMap = new Map(persons.map((p) => [p.id, p]));

  const path: Array<{ name: string; generation: number | null }> = [];
  const visited = new Set<string>();
  let currentId: string | null = args.memberId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const p = personsMap.get(currentId);
    if (p) path.unshift({ name: p.full_name, generation: p.generation });
    const parents = childParents.get(currentId);
    currentId = parents && parents.length > 0 ? parents[0] : null;
  }

  if (path.length === 0)
    return { toolResult: `Không tìm thấy đường dẫn đến ${person.full_name}.` };

  const pathStr = path.map((p) => `${p.name} (Đời ${p.generation ?? "?"})`).join(" → ");

  const lines = [
    `Đường dẫn đến ${person.full_name}:`,
    pathStr,
    "",
    `Tổng cộng: ${path.length} đời`,
    `Tổ tiên gốc: ${path[0].name}`,
  ];

  return { toolResult: lines.join("\n") };
}

// ── Main Dispatcher ─────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    let result: ToolResult;

    switch (name) {
      case "search_members":
        result = await searchMembers(args as { query: string });
        break;
      case "get_member_family":
        result = await getMemberFamily(args as { memberId: string });
        break;
      case "get_kinship":
        result = await getKinship(args as { memberAId: string; memberBId: string });
        break;
      case "get_tree_statistics":
        result = await getTreeStatistics();
        break;
      case "get_branch_overview":
        result = await getBranchOverview();
        break;
      case "find_branch_path":
        result = await findBranchPath(args as { memberId: string });
        break;
      default:
        result = { toolResult: `Tool "${name}" không tồn tại.` };
    }

    return result.toolResult;
  } catch (err) {
    return `Lỗi thực thi tool "${name}": ${(err as Error).message}`;
  }
}
