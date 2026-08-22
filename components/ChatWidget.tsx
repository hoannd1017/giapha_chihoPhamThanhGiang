"use client";

import { Bot, HelpCircle, Send, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  assistantData,
  reply,
  type AssistantPersonResult,
  type ChatMessage,
} from "@/utils/aiAssistant";

function genderLabel(p: AssistantPersonResult): string {
  if (p.gender === "male") return "Nam";
  if (p.gender === "female") return "Nữ";
  return "Khác";
}

/** Thẻ kết quả thành viên — bấm để mở hồ sơ chi tiết. */
function MemberResultCard({ person }: { person: AssistantPersonResult }) {
  const metaParts = [
    person.generation != null ? `Đời ${person.generation}` : null,
    `${genderLabel(person)}`,
    person.birth_year != null ? `Sinh ${person.birth_year}` : null,
    person.is_deceased || person.death_year != null
      ? `Mất ${person.death_year ?? "?"}`
      : null,
  ].filter(Boolean);

  const relationParts = [
    person.parents?.length
      ? `Cha/mẹ: ${person.parents.join(", ")}`
      : null,
    person.spouses?.length ? `Vợ/chồng: ${person.spouses.join(", ")}` : null,
    person.childrenCount != null && person.childrenCount > 0
      ? `${person.childrenCount} con`
      : null,
    person.descendantsCount != null && person.descendantsCount > 0
      ? `${person.descendantsCount} hậu duệ`
      : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/dashboard/members/${person.id}`}
      className="block bg-surface border border-border rounded-2xl px-3.5 py-2.5 hover:border-amber-300 hover:shadow-soft transition-all"
    >
      <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
        <User className="size-3.5 text-tertiary shrink-0" />
        <span className="truncate">{person.full_name}</span>
      </p>
      <p className="text-xs text-secondary mt-1">
        {metaParts.join(" · ")}
      </p>
      {relationParts.length > 0 && (
        <p className="text-xs text-stone-400 mt-0.5 truncate">
          {relationParts.join(" · ")}
        </p>
      )}
    </Link>
  );
}

/**
 * Trợ lý ảo nổi dạng bong bóng — port UX từ kanposvn AiAssistantWidget.
 * Hiểu database gia phả qua /api/assistant: tìm theo tên, nhánh hậu duệ,
 * đời thứ, thống kê. Mất mạng thì tự fallback về engine rule-based cục bộ.
 */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "intro", text: assistantData.intro, fromUser: false },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(0);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    idCounter.current += 1;
    setMessages((prev) => [
      ...prev,
      { id: `user-${idCounter.current}`, text: trimmed, fromUser: true },
    ]);
    setInput("");
    setIsTyping(true);
    scrollToBottom();

    let answer: string;
    let results: AssistantPersonResult[] | undefined;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      answer =
        data.answer ||
        "Xin lỗi, mình chưa xử lý được câu hỏi này. Bạn thử cách khác nhé.";
      results = Array.isArray(data.results)
        ? data.results
        : undefined;
    } catch {
      // Offline / lỗi server: dùng engine rule-based cục bộ.
      answer = reply(trimmed);
    }

    // Giữ nhịp trò chuyện tự nhiên giống trợ lý kanposvn.
    setTimeout(() => {
      idCounter.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${idCounter.current}`,
          text: answer,
          fromUser: false,
          results,
        },
      ]);
      setIsTyping(false);
    }, 350);
  };

  return (
    <>
      <div
        className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-140px)] bg-neutral border border-border rounded-3xl shadow-[0_20px_40px_rgb(0,0,0,0.08)] flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        role="dialog"
        aria-label={assistantData.assistantName}
        aria-hidden={!isOpen}
      >
        <div className="bg-primary text-surface px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[15px] leading-tight">
                {assistantData.assistantName}
              </h3>
              <p className="text-stone-400 text-xs truncate">
                {assistantData.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Đóng trợ lý"
            className="size-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
          {messages.map((msg) =>
            msg.fromUser ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-tertiary text-primary font-medium rounded-2xl rounded-br-md">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] space-y-1.5">
                  <div className="bg-surface text-primary border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </div>
                  {msg.results && msg.results.length > 0 && (
                    <div className="space-y-1.5 pl-2">
                      {msg.results.map((r) => (
                        <MemberResultCard key={r.id} person={r} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-2.5">
                <span
                  className="block size-4 border-2 border-stone-300 border-t-tertiary rounded-full animate-spin"
                  aria-label="Đang tra cứu gia phả"
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && !isTyping && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-xs text-secondary mb-1.5">Câu hỏi gợi ý:</p>
            <div className="flex flex-wrap gap-1.5">
              {assistantData.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="inline-flex items-center gap-1 bg-surface border border-border text-primary text-xs px-3 py-1.5 rounded-full hover:bg-neutral hover:border-stone-300 transition-colors"
                >
                  <HelpCircle className="size-3.5 text-tertiary" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="bg-surface border-t border-border px-3 py-2.5 flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm tên, hỏi nhánh họ, đời thứ..."
            maxLength={500}
            className="flex-1 bg-neutral rounded-full px-4 py-2.5 text-sm text-primary placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300 transition-all"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            aria-label="Gửi"
            className="size-10 bg-tertiary disabled:bg-stone-300 disabled:text-stone-500 text-primary rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Đóng trợ lý Gia Phả" : "Mở trợ lý Gia Phả"}
        className="fixed bottom-5 right-4 sm:right-6 z-50 size-14 bg-tertiary hover:bg-amber-600 text-primary rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center"
      >
        {isOpen ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </>
  );
}
