import { normalize, reply } from "@/utils/aiAssistant";
import type { AssistantPersonResult } from "@/utils/aiAssistant";
import { Person, Relationship } from "@/types";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { NextResponse } from "next/server";

interface AssistantResponse {
  kind: "faq" | "search" | "branch" | "lineage" | "stats";
  answer: string;
  results?: AssistantPersonResult[];
}

const MAX_RESULTS = 6;
const MAX_LISTED_CHILDREN = 8;

/** Từ khóa nhận diện ý định thống kê. */
const STATS_KEYWORDS = [
  "bao nhieu",
  "bao nhiêu",
  "so luong",
  "số lượng",
  "tong so",
  "tổng số",
  "dem",
  "đếm",
];

/** Từ khóa nhận diện ý định xem đường tổ tiên / đời thứ. */
const LINEAGE_KEYWORDS = [
  "doi thu may",
  "đời thứ mấy",
  "the he thu may",
  "thế hệ thứ mấy",
  "la con cua ai",
  "là con của ai",
  "cha me la ai",
  "cha mẹ là ai",
  "con ai",
  "thuoc nhanh nao",
  "thuộc nhánh nào",
  "xuat xu tu",
  "xuất phát từ",
  "hoi thuy to",
  "goc o dau",
];

/** Từ khóa nhận diện ý định xem nhánh hậu duệ. */
const BRANCH_KEYWORDS = [
  "nhanh",
  "nhánh",
  "nha con chiu",
  "con chau",
  "con cháu",
  "hau due",
  "hậu duệ",
  "cai cay",
  "descendants",
  "chi nhanh",
  "chi nhánh",
];

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(normalize(kw)));
}

function toResult(
  person: Person,
  extra: Partial<AssistantPersonResult> = {}
): AssistantPersonResult {
  return {
    id: person.id,
    full_name: person.full_name,
    gender: person.gender,
    birth_year: person.birth_year,
    death_year: person.death_year,
    is_deceased: person.is_deceased,
    generation: person.generation,
    ...extra,
  };
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let question = "";
  try {
    const body = await req.json();
    question = String(body?.question ?? "").trim();
  } catch {
    // ignore malformed body
  }
  if (!question) {
    return NextResponse.json<AssistantResponse>({
      kind: "faq",
      answer: reply(""),
    });
  }

  const supabase = await getSupabase();
  const [personsRes, relsRes] = await Promise.all([
    supabase.from("persons").select("*"),
    supabase.from("relationships").select("*"),
  ]);
  const persons = (personsRes.data ?? []) as Person[];
  const relationships = (relsRes.data ?? []) as Relationship[];

  /* ── Maps quan hệ ─────────────────────────────────────────────── */
  const byId = new Map(persons.map((p) => [p.id, p]));
  const parentsOf = new Map<string, Person[]>();
  const childrenOf = new Map<string, Person[]>();
  const spousesOf = new Map<string, Person[]>();

  for (const r of relationships) {
    if (r.type === "marriage") {
      if (!spousesOf.has(r.person_a)) spousesOf.set(r.person_a, []);
      if (!spousesOf.has(r.person_b)) spousesOf.set(r.person_b, []);
      const b = byId.get(r.person_b);
      const a = byId.get(r.person_a);
      if (b) spousesOf.get(r.person_a)!.push(b);
      if (a) spousesOf.get(r.person_b)!.push(a);
    } else if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childrenOf.has(r.person_a)) childrenOf.set(r.person_a, []);
      if (!parentsOf.has(r.person_b)) parentsOf.set(r.person_b, []);
      const child = byId.get(r.person_b);
      const parent = byId.get(r.person_a);
      if (child) childrenOf.get(r.person_a)!.push(child);
      if (parent) parentsOf.get(r.person_b)!.push(parent);
    }
  }

  const normQ = normalize(question);

  /** Tìm người có tên xuất hiện nguyên vẹn trong câu hỏi (ưu tiên tên dài). */
  const matchPersonsInText = (): Person[] => {
    const matches: { person: Person; len: number }[] = [];
    for (const p of persons) {
      const fn = normalize(p.full_name);
      if (fn.length < 3) continue;
      let idx = normQ.indexOf(fn);
      while (idx !== -1) {
        const beforeOk = idx === 0 || normQ[idx - 1] === " ";
        const afterIdx = idx + fn.length;
        const afterOk =
          afterIdx === normQ.length || normQ[afterIdx] === " ";
        if (beforeOk && afterOk) {
          matches.push({ person: p, len: fn.length });
          break;
        }
        idx = normQ.indexOf(fn, idx + 1);
      }
      if (!matches.some((m) => m.person.id === p.id) && p.other_names) {
        const on = normalize(p.other_names);
        if (on.length >= 3 && normQ.includes(on)) {
          matches.push({ person: p, len: on.length });
        }
      }
    }
    return matches
      .sort((a, b) => b.len - a.len)
      .map((m) => m.person);
  };

  /** Tìm theo chuỗi con trong tên / tên khác / ghi chú. */
  const searchBySubstring = (term: string): Person[] => {
    const t = normalize(term);
    if (t.length < 2) return [];
    return persons
      .map((p) => {
        const fn = normalize(p.full_name);
        let score = 0;
        if (fn === t) score = 100;
        else if (fn.startsWith(t)) score = 80;
        else if (fn.includes(t)) score = 60;
        else if (
          p.other_names &&
          normalize(p.other_names).includes(t)
        )
          score = 40;
        else if (p.note && normalize(p.note).includes(t)) score = 10;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (a.p.generation ?? 99) - (b.p.generation ?? 99)
      )
      .map((x) => x.p);
  };

  const describePerson = (p: Person): AssistantPersonResult => {
    const parents = (parentsOf.get(p.id) ?? []).map((x) => x.full_name);
    const spouses = (spousesOf.get(p.id) ?? []).map((x) => x.full_name);
    const childrenCount = (childrenOf.get(p.id) ?? []).length;
    return toResult(p, { parents, spouses, childrenCount });
  };

  /** Đếm tổng hậu duệ + phân bố theo đời. */
  const countDescendants = (rootId: string) => {
    const rootGen = byId.get(rootId)?.generation ?? null;
    let total = 0;
    const perGeneration = new Map<number, number>();
    const queue = [...(childrenOf.get(rootId) ?? [])];
    const visited = new Set<string>([rootId]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur.id)) continue;
      visited.add(cur.id);
      total += 1;
      const gen = cur.generation ?? -1;
      perGeneration.set(gen, (perGeneration.get(gen) ?? 0) + 1);
      for (const c of childrenOf.get(cur.id) ?? []) {
        if (!visited.has(c.id)) queue.push(c);
      }
    }
    const gens = [...perGeneration.keys()].filter((g) => g >= 0).sort(
      (a, b) =>
        (rootGen !== null ? Math.abs(a - rootGen) : a) -
        (rootGen !== null ? Math.abs(b - rootGen) : b)
    );
    return { total, perGeneration, depth: gens.length };
  };

  /* ── 1. Chào hỏi / cảm ơn ─────────────────────────────────────── */
  const nq = normQ;
  if (
    ["chao", "xin chao", "hello", "hi", "helo", "alo"].some((k) => nq === k)
  ) {
    return NextResponse.json<AssistantResponse>({
      kind: "faq",
      answer: reply(question),
    });
  }

  /* ── 2. Thống kê database ─────────────────────────────────────── */
  if (includesAny(nq, STATS_KEYWORDS)) {
    const males = persons.filter((p) => p.gender === "male").length;
    const females = persons.filter((p) => p.gender === "female").length;
    const deceased = persons.filter((p) => p.is_deceased).length;
    const generations = new Set(
      persons.map((p) => p.generation).filter((g): g is number => g != null)
    );
    const marriages = relationships.filter((r) => r.type === "marriage").length;
    const lines = [
      `Hiện gia phả đang lưu **${persons.length} thành viên**: ${males} nam, ${females} nữ${persons.length - males - females > 0 ? `, ${persons.length - males - females} khác` : ""}.`,
      `• Còn sống: ${persons.length - deceased} · Đã mất: ${deceased}`,
      `• Số đời (generation): từ ${generations.size ? Math.min(...generations) : "?"} đến ${generations.size ? Math.max(...generations) : "?"}`,
      `• Số hôn phối đã ghi nhận: ${marriages}`,
      "",
      'Hỏi thêm: "nhánh con cháu của <tên>" để xem hậu duệ một người cụ thể.',
    ];
    return NextResponse.json<AssistantResponse>({
      kind: "stats",
      answer: lines.join("\n"),
    });
  }

  /* ── 3. Đường tổ tiên / đời thứ ───────────────────────────────── */
  if (includesAny(nq, LINEAGE_KEYWORDS)) {
    const matched = matchPersonsInText();
    if (matched.length > 0) {
      const p = matched[0];
      const chain: string[] = [p.full_name];
      let cur: Person | undefined = p;
      const seen = new Set<string>([p.id]);
      while (cur && chain.length < 16) {
        const currentId = cur.id;
        const parentList: Person[] = (
          parentsOf.get(currentId) ?? []
        ).filter((x) => !seen.has(x.id));
        if (parentList.length === 0) break;
        parentList.sort(
          (a, b) => (a.generation ?? 99) - (b.generation ?? 99)
        );
        const next: Person | undefined = parentList[0];
        if (!next) break;
        seen.add(next.id);
        chain.unshift(next.full_name);
        cur = next;
      }
      const genLine =
        p.generation != null
          ? `${p.full_name} thuộc **đời thứ ${p.generation}** của dòng họ.`
          : `${p.full_name} chưa được cập nhật đời thứ.`;
      const lines = [
        genLine,
        chain.length > 1
          ? `• Chuỗi tổ tiên trực hệ: ${chain.join(" → ")}`
          : "• Đây là thủy tổ/gốc hiện có trong phả hệ.",
        `• Cha/mẹ: ${(parentsOf.get(p.id) ?? []).map((x) => x.full_name).join(", ") || "chưa ghi nhận"}`,
        `• Vợ/chồng: ${(spousesOf.get(p.id) ?? []).map((x) => x.full_name).join(", ") || "chưa ghi nhận"}`,
        `• Số con: ${(childrenOf.get(p.id) ?? []).length}`,
      ];
      return NextResponse.json<AssistantResponse>({
        kind: "lineage",
        answer: lines.join("\n"),
        results: [describePerson(p)],
      });
    }
  }

  /* ── 4. Nhánh hậu duệ ─────────────────────────────────────────── */
  if (includesAny(nq, BRANCH_KEYWORDS)) {
    const matched = matchPersonsInText();
    if (matched.length > 0) {
      const p = matched[0];
      const { total, depth } = countDescendants(p.id);
      const children = childrenOf.get(p.id) ?? [];
      const childNames = children
        .slice(0, MAX_LISTED_CHILDREN)
        .map((c) => c.full_name);
      const lines = [
        `Nhánh của **${p.full_name}**${p.generation != null ? ` (đời ${p.generation})` : ""}:`,
        `• Số con trực tiếp: ${children.length}`,
        `• Tổng hậu duệ: ${total} người qua ${depth} đời`,
        childNames.length
          ? `• Con gồm: ${childNames.join(", ")}${children.length > MAX_LISTED_CHILDREN ? `, ...+${children.length - MAX_LISTED_CHILDREN} nữa` : ""}`
          : "• Chưa ghi nhận con cái.",
      ];
      return NextResponse.json<AssistantResponse>({
        kind: "branch",
        answer: lines.join("\n"),
        results: [
          describePerson(p),
          ...children.slice(0, MAX_RESULTS - 1).map((c) => describePerson(c)),
        ],
      });
    }
  }

  /* ── 5. Tìm kiếm theo tên ─────────────────────────────────────── */
  const directMatches = matchPersonsInText();
  let searchPool: Person[] = directMatches;

  if (searchPool.length === 0) {
    // Bỏ từ câu lệnh để lấy cụm cần tìm rồi tìm theo substring.
    let term = normQ;
    const stopWords = [
      "tim kiem",
      "tim",
      "tra cuu",
      "xem",
      "cho biet",
      "thong tin ve",
      "thong tin",
      "gioi thieu ve",
      "gioi thieu",
      "ai la",
      "la ai",
      "ai",
      "ten",
      "nguoi",
      "trong gia pha",
      "trong",
      "gia pha",
      "dong ho",
      "cua",
      "voi",
    ];
    for (let i = 0; i < 4; i++) {
      const before = term;
      term = term
        .replace(new RegExp(`^(${stopWords.join("|")})\\b\\s*`), "")
        .replace(new RegExp(`\\s*\\b(${stopWords.join("|")})$`), "")
        .replace(/\s+/g, " ")
        .trim();
      if (term === before) break;
    }
    searchPool = searchBySubstring(term);
  }

  if (searchPool.length > 0) {
    const shown = searchPool.slice(0, MAX_RESULTS).map(describePerson);
    const more = searchPool.length - shown.length;
    const intro =
      searchPool.length === 1
        ? "Tìm thấy 1 thành viên khớp:"
        : `Tìm thấy ${searchPool.length} thành viên khớp "${question.trim()}".${
            more > 0
              ? ` (Hiển thị ${shown.length} — hãy gõ tên cụ thể hơn để thu hẹp kết quả.)`
              : ""
          }`;
    return NextResponse.json<AssistantResponse>({
      kind: "search",
      answer: intro,
      results: shown,
    });
  }

  /* ── 6. FAQ fallback ──────────────────────────────────────────── */
  return NextResponse.json<AssistantResponse>({
    kind: "faq",
    answer: reply(question),
  });
}
