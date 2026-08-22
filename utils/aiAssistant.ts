/**
 * Trợ lý ảo rule-based cho Gia Phả OS (port từ kanposvn AiAssistantService).
 * Khớp câu hỏi với từ khóa nghiệp vụ, hoạt động offline, không cần API AI.
 */

export interface AiAssistantTopic {
  /** Các từ khóa để khớp câu hỏi của user (kèm cả bản không dấu). */
  keywords: string[];
  answer: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  fromUser: boolean;
  /** Kết quả tra cứu database (thành viên) đính kèm câu trả lời của bot. */
  results?: AssistantPersonResult[];
}

/** Một thành viên được trả về từ tra cứu database gia phả. */
export interface AssistantPersonResult {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  death_year: number | null;
  is_deceased: boolean;
  generation: number | null;
  /** Cha/mẹ trong phả hệ. */
  parents?: string[];
  /** Vợ/chồng. */
  spouses?: string[];
  /** Số con trực tiếp. */
  childrenCount?: number;
  /** Tổng số hậu duệ (dùng cho tra cứu nhánh). */
  descendantsCount?: number;
}

const GREETING_KEYWORDS = [
  "chao",
  "hello",
  "hi",
  "helo",
  "xin chao",
  "alo",
];

const GREETING_ANSWER =
  "Chào bạn! Rất vui được hỗ trợ. Bạn có thể hỏi mình về các chức năng của " +
  "Gia Phả, hoặc thử các câu hỏi gợi ý bên dưới.";

const THANKS_KEYWORDS = [
  "cam on",
  "cảm ơn",
  "thanks",
  "thank",
  "tks",
  "ok",
];

const THANKS_ANSWER =
  "Không có gì! Nếu cần hỗ trợ thêm, bạn cứ hỏi mình nhé.";

export const assistantData = {
  assistantName: "Trợ lý Gia Phả",
  subtitle: "Trợ lý ảo dòng họ",
  intro:
    "Chào bạn! Mình là trợ lý của Gia Phả. Mình có thể tra cứu trực tiếp " +
    "database gia phả: tìm thành viên theo tên, xem nhánh con cháu, đời thứ, " +
    "cha mẹ - vợ chồng - con cái. Mình cũng hướng dẫn về sơ đồ phả hệ, danh " +
    "xưng họ hàng, sự kiện và sao lưu dữ liệu.",
  suggestions: [
    "Gia phả có bao nhiêu người?",
    "Cách tìm thành viên trong gia phả?",
    "Tra cứu danh xưng họ hàng?",
    "Cách thêm thành viên mới?",
  ],
};

export const assistantTopics: AiAssistantTopic[] = [
  {
    keywords: [
      "tim kiem thanh vien",
      "tìm kiếm thành viên",
      "cach tim",
      "cách tìm",
      "tra cuu thanh vien",
      "tra cứu thành viên",
    ],
    answer:
      "Bạn chỉ cần gõ tên người cần tìm, ví dụ: \"tìm Văn Hòa\" hoặc nhập " +
      "trực tiếp tên. Mình cũng hiểu các câu như: \"đời thứ mấy của <tên>\", " +
      "\"nhánh con cháu của <tên>\", \"cha mẹ ai là <tên>\" hoặc hỏi thống kê " +
      "\"gia phả có bao nhiêu người\".",
  },
  {
    keywords: [
      "gia pha la gi",
      "gia phả là gì",
      "pha he la gi",
      "phả hệ là gì",
      "gia pha dong ho",
      "gia phả dòng họ",
      "dong ho la gi",
      "dòng họ là gì",
      "thuy to",
      "thủy tổ",
      "to tien",
      "tổ tiên",
    ],
    answer:
      "Gia phả (phả ký) là hồ sơ ghi chép sự tiếp nối của dòng họ qua các " +
      "đời: từ thủy tổ, tổ tiên xuống con cháu, kèm tên tuổi, quan hệ và " +
      "công đức để con cháu nhớ nguồn cội. Trong Gia Phả OS, mỗi người là một " +
      "hồ sơ có đời thứ (generation), cha mẹ, vợ/chồng và con cái, được vẽ " +
      "thành sơ đồ trực quan và lưu an toàn trên cloud của dòng họ.",
  },
  {
    keywords: [
      "the he la gi",
      "thế hệ là gì",
      "doi thu",
      "đời thứ",
      "tinh doi",
      "tính đời",
      "generation",
    ],
    answer:
      "Trong app, mỗi thành viên có trường \"Đời\" (generation): thủy tổ là " +
      "đời 1, con trai/con gái là đời 2 và cứ thế tiếp xuống. Con dâu, rể " +
      "(người ngoài kết hôn vào) được đánh dấu riêng nhưng vẫn hiển thị trên " +
      "cùng sơ đồ. Bạn có thể hỏi mình: \"đời thứ mấy của <tên>\" để tra nhanh.",
  },
  {
    keywords: [
      "am lich",
      "âm lịch",
      "ngay gio am lich",
      "ngày giỗ âm lịch",
      "gio tho",
      "giỗ tễ",
      "cung kinh",
    ],
    answer:
      "Ngày mất của thành viên được lưu cả dương lịch và âm lịch để tiện " +
      "chọn ngày giỗ hằng năm. Trang Sự kiện sẽ tự tính ngày giỗ sắp tới theo " +
      "âm lịch và nhắc trên bảng điều khiển trước 30 ngày.",
  },
  {
    keywords: [
      "cay gia pha",
      "cây gia phả",
      "so do",
      "sơ đồ",
      "sodo",
      "tree",
      "xem cay",
      "che do xem",
      "chế độ xem",
      "mindmap",
      "sơ đồ tư duy",
      "so do tu duy",
      "bubble",
    ],
    answer:
      'Trang chủ có các chế độ xem: "Cây" (Family Tree) dọc theo thế hệ, ' +
      '"Mindmap" dạng tư duy ngang và "Bubble" dạng bong bóng. Dùng nút chọn ' +
      'chế độ xem trên thanh công cụ để chuyển đổi. Chọn "Gốc" (Root) để tập ' +
      "trung vào một nhánh cụ thể.",
  },
  {
    keywords: [
      "them thanh vien",
      "thêm thành viên",
      "thanh vien",
      "thành viên",
      "member",
      "ho so",
      "hồ sơ",
      "them nguoi",
      "thêm người",
      "con",
      "sinh con",
    ],
    answer:
      'Vào mục "Thành viên" rồi bấm nút Thêm (màu hổ phách). Nhập họ tên, ' +
      "giới tính, ngày sinh/mất, avatar và cha/mẹ hoặc vợ/chồng để gắn vào " +
      "phả hệ. Thành viên mới sẽ xuất hiện ngay trên sơ đồ cây.",
  },
  {
    keywords: [
      "quan he",
      "quan hệ",
      "ket hon",
      "kết hôn",
      "vo",
      "vợ",
      "chong",
      "chồng",
      "da the",
      "đa thê",
      "da phu",
      "đa phu",
      "cha me",
      "cha mẹ",
    ],
    answer:
      'Mục "Quan hệ" quản lý hôn phối và quan hệ cha–con, hỗ trợ trường hợp ' +
      "đặc biệt như đa thê, đa phu. Khi thêm/sửa thành viên, chọn cha, mẹ và " +
      "vợ/chồng để hệ thống tự vẽ nhánh trên sơ đồ.",
  },
  {
    keywords: [
      "danh xung",
      "danh xưng",
      "bac",
      "bác",
      "chu",
      "chú",
      "co",
      "cô",
      "di",
      "dì",
      "ong ba",
      "ông bà",
      "ho hang",
      "họ hàng",
      "kinship",
      "than thuoc",
      "thân thuộc",
      "cach goi",
      "cách gọi",
    ],
    answer:
      'Mục "Danh xưng" (Kinship Finder): chọn người thứ nhất, chọn người thứ ' +
      "hai, hệ thống tự tính quan hệ và hiển thị cách gọi đúng (Bác, Chú, Cô, " +
      "Dì, Anh chị...). Hữu ích khi con cháu nhỏ không nhớ cách xưng hô.",
  },
  {
    keywords: [
      "su kien",
      "sự kiện",
      "gio",
      "giỗ",
      "ngay gio",
      "ngày giỗ",
      "ky niem",
      "kỷ niệm",
      "event",
      "lich su kien",
      "lịch sự kiện",
    ],
    answer:
      'Mục "Sự kiện" hiển thị lịch giỗ, kỷ niệm của dòng họ. Bấm thêm sự kiện ' +
      "tùy chỉnh để tạo ngày giỗ mới cho từng thành viên; sự kiện sắp tới sẽ " +
      "được nhắc ở trang tổng quan.",
  },
  {
    keywords: [
      "thong ke",
      "thống kê",
      "stats",
      "nhan khau",
      "nhân khẩu",
      "so lieu",
      "số liệu",
      "doanh thu",
    ],
    answer:
      'Mục "Thống kê" tổng hợp nhân khẩu học dòng họ: số lượng nam/nữ, phân ' +
      "bố thế hệ, độ tuổi... Giúp nắm nhanh quy mô và tình trạng phả hệ.",
  },
  {
    keywords: [
      "anh",
      "ảnh",
      "image",
      "gallery",
      "thu vien",
      "thư viện",
      "hinh",
      "hình",
      "avatar",
      "anh dai dien",
      "ảnh đại diện",
    ],
    answer:
      'Mục "Thư viện" lưu ảnh gia đình. Tải ảnh lên trực tiếp trong thư viện ' +
      'hoặc đặt "Ảnh đại diện" cho từng thành viên trong hồ sơ. Avatar hiển thị ' +
      "trên sơ đồ cây nếu bật chế độ avatar.",
  },
  {
    keywords: [
      "sao luu",
      "sao lưu",
      "backup",
      "xuat du lieu",
      "xuất dữ liệu",
      "export",
      "nhap du lieu",
      "nhập dữ liệu",
      "import",
      "json",
      "csv",
      "gedcom",
      "excel",
    ],
    answer:
      'Mục "Dữ liệu" hỗ trợ Xuất/Nhập file JSON (đầy đủ nhất), CSV (bảng) và ' +
      'GEDCOM (chuẩn phả hệ quốc tế). Nên xuất JSON định kỳ để sao lưu phòng ' +
      "trường hợp cần khôi phục hoặc di chuyển sang máy chủ khác.",
  },
  {
    keywords: [
      "phan quyen",
      "phân quyền",
      "quyen",
      "quyền",
      "admin",
      "editor",
      "role",
      "vai tro",
      "vai trò",
      "tai khoan",
      "tài khoản",
      "duyet",
      "duyệt",
      "kich hoat",
      "kích hoạt",
    ],
    answer:
      "Hệ thống có 3 vai trò: Admin (toàn quyền, duyệt tài khoản), Editor " +
      "(thêm/sửa/xóa hồ sơ) và Member (chỉ xem). Admin quản lý người dùng và " +
      'phân quyền tại mục "Người dùng". Tài khoản mới cần Admin kích hoạt.',
  },
  {
    keywords: [
      "dang nhap",
      "đăng nhập",
      "login",
      "mat khau",
      "mật khẩu",
      "password",
      "dang ky",
      "đăng ký",
      "register",
      "quen mat khau",
      "quên mật khẩu",
    ],
    answer:
      "Đăng nhập bằng email và mật khẩu đã đăng ký. Người đăng ký đầu tiên " +
      "tự động là Admin, các tài khoản sau là Member và chờ duyệt. Quên mật " +
      "khẩu thì liên hệ Admin hoặc dùng chức năng khôi phục qua email Supabase.",
  },
  {
    keywords: [
      "tim kiem",
      "tìm kiếm",
      "search",
      "tra cuu",
      "tra cứu",
      "loc",
      "lọc",
    ],
    answer:
      'Dùng ô tìm kiếm trong mục "Thành viên" để lọc theo tên. Trên sơ đồ cây, ' +
      'dùng "Gốc" (Root Selector) để nhảy nhanh tới nhánh của một người cụ thể.',
  },
];

/** Chuẩn hóa chuỗi: bỏ dấu tiếng Việt, lowercase, rút gọn khoảng trắng. */
export function normalize(input: string): string {
  const withDiacritics =
    "áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ";
  const withoutDiacritics =
    "aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuuyyyyy";
  let result = "";
  for (const ch of input.toLowerCase()) {
    const idx = withDiacritics.indexOf(ch);
    result += idx >= 0 ? withoutDiacritics[idx] : ch;
  }
  return result.replace(/\s+/g, " ").trim();
}

function findMatch(
  topics: AiAssistantTopic[],
  normalized: string
): AiAssistantTopic | null {
  let best: AiAssistantTopic | null = null;
  let bestLength = 0;
  for (const topic of topics) {
    for (const kw of topic.keywords) {
      const key = normalize(kw);
      if (key && normalized.includes(key) && key.length > bestLength) {
        best = topic;
        bestLength = key.length;
      }
    }
  }
  return best;
}

/** Trả lời câu hỏi của user dựa trên từ khóa nghiệp vụ của Gia Phả. */
export function reply(question: string): string {
  const normalized = normalize(question);

  if (!normalized) return assistantData.intro;

  if (
    findMatch(
      [{ keywords: GREETING_KEYWORDS, answer: GREETING_ANSWER }],
      normalized
    )
  ) {
    return GREETING_ANSWER;
  }

  if (
    findMatch([{ keywords: THANKS_KEYWORDS, answer: THANKS_ANSWER }], normalized)
  ) {
    return THANKS_ANSWER;
  }

  const topic = findMatch(assistantTopics, normalized);
  if (topic) return topic.answer;

  return (
    `Mình chưa rõ câu hỏi "${question.trim()}" thuộc phần nào của ` +
    `"${assistantData.assistantName}". Bạn có thể hỏi về: sơ đồ phả hệ, thành ` +
    "viên, quan hệ, danh xưng, sự kiện, thống kê, thư viện ảnh hoặc sao lưu " +
    "dữ liệu. Hoặc bấm vào một câu gợi ý bên dưới để mình hướng dẫn nhé."
  );
}
