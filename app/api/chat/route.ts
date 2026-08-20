import { google } from "@ai-sdk/google";
import { streamText } from "ai";

const systemPrompt = `Bạn là trợ lý AI của ứng dụng "Gia Phả chi họ Phạm - Thanh Giang", một nền tảng quản lý gia phả dòng họ Phạm tại thôn Đan Giáp, xã Thanh Giang, huyện Thanh Miện, tỉnh Hải Dương (nay thuộc xã Nam Thanh Miện, TP Hải Phòng).

Nhiệm vụ của bạn:
1. Trả lời câu hỏi về dòng họ Phạm Thanh Giang, lịch sử, địa lý, văn hóa.
2. Hướng dẫn người dùng sử dụng các tính năng của ứng dụng:
   - Cây gia pha (Family Tree): xem, tìm kiếm, thêm/sửa thành viên
   - Tra cứu danh xưng (Kinship): tìm mối quan hệ họ hàng giữa các thành viên
   - Thống kê gia pha: số lượng thành viên, phân bố thế hệ, giới tính
   - Phòng trưng bày (Gallery): xem ảnh gia đình
   - Giới thiệu dự án: thông tin về dự án và địa điểm
3. Hỗ trợ general questions về lịch sử, văn hóa Việt Nam khi được yêu cầu.

Ngôn ngữ: Trả lời bằng tiếng Việt, thân thiện và dễ hiểu.
Phong cách: Ngắn gọn, súc tích, giúp đỡ nhiệt tình.`;

interface UIMessage {
  role: string;
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
}

function toModelMessages(messages: UIMessage[]) {
  return messages.map((msg) => {
    let text = "";
    if (msg.parts) {
      text = msg.parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("");
    } else if (msg.content) {
      text = msg.content;
    }
    return { role: msg.role as "user" | "assistant" | "system", content: text };
  });
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  const modelMessages = toModelMessages(messages);

  const result = streamText({
    model: google("gemini-3.6-flash"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toTextStreamResponse();
}
