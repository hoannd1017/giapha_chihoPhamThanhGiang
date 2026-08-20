"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleSuggestion = (text: string) => {
    sendMessage({ text });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[520px] max-h-[calc(100vh-140px)] bg-white rounded-3xl shadow-soft border border-stone-200 flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px]">Trợ lý Gia Phả</h3>
                  <p className="text-amber-100 text-xs">AI powered by Gemini</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="size-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot className="size-7" />
                  </div>
                  <p className="text-stone-600 text-sm font-medium mb-1">
                    Xin chào! 👋
                  </p>
                  <p className="text-stone-400 text-xs leading-relaxed">
                    Tôi là trợ lý AI của Gia Phả họ Phạm.
                    <br />
                    Hãy hỏi tôi bất cứ điều gì!
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {[
                      "Giới thiệu dòng họ",
                      "Cách sử dụng cây gia pha",
                      "Tra cứu danh xưng",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestion(suggestion)}
                        className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200/50 hover:bg-amber-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 text-[13.5px] leading-relaxed ${
                      message.role === "user"
                        ? "bg-amber-500 text-white rounded-2xl rounded-br-md"
                        : "bg-stone-100 text-stone-700 rounded-2xl rounded-bl-md"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bot className="size-3.5 text-amber-600" />
                        <span className="text-[11px] font-semibold text-amber-600">
                          AI
                        </span>
                      </div>
                    )}
                    {message.parts.map((part, i) => {
                      if (part.type === "text") {
                        return (
                          <p key={i} className="whitespace-pre-wrap">
                            {part.text}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ))}

              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1].role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-stone-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="size-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-2 bg-stone-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-stone-100 px-4 py-3 flex items-center gap-2 shrink-0"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-[13.5px] text-stone-700 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="size-10 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 size-14 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="size-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
