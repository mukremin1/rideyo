import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Bot, ChevronDown, Headphones, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from "@/lib/appConfig";
import { isNativeMobile } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  buildWhatsAppTicketMessage,
  createSupportTicket,
  openWhatsAppSupport,
} from "@/lib/supportContact";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const Chatbot = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const nativeMobile = isNativeMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const CHAT_URL = getSupabaseFunctionsUrl("chat");

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("components.chatbot.welcome") }]);
  }, [i18n.language, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getSupabaseAnonKey()}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (resp.status === 429) {
        setMessages([...newMessages, { role: "assistant", content: t("components.chatbot.tooManyRequests") }]);
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        setMessages([...newMessages, { role: "assistant", content: t("components.chatbot.serviceUnavailable") }]);
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) throw new Error(t("components.chatbot.streamError"));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages([...newMessages, { role: "assistant", content: assistantContent }]);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...newMessages, { role: "assistant", content: t("components.chatbot.genericError") }]);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    await streamChat(userMessage);
  };

  const handleTalkToHuman = async () => {
    if (escalating) return;
    setEscalating(true);

    const chatSummary = messages
      .filter((m) => m.role === "user")
      .slice(-3)
      .map((m) => m.content)
      .join("\n");

    try {
      if (user) {
        const ticket = await createSupportTicket({
          userId: user.id,
          subject: t("components.chatbot.humanTicketSubject"),
          message: chatSummary || t("components.chatbot.humanTicketDefaultMessage"),
          category: "other",
          source: "chatbot",
        });
        openWhatsAppSupport(buildWhatsAppTicketMessage(ticket.ticket_ref, chatSummary));
        toast.success(t("components.chatbot.ticketCreated", { ref: ticket.ticket_ref }));
      } else {
        openWhatsAppSupport(
          chatSummary
            ? `${t("components.chatbot.whatsappPrefill")}\n\n${chatSummary}`
            : t("components.chatbot.whatsappPrefill"),
        );
      }
    } catch {
      toast.error(t("components.chatbot.ticketCreateFailed"));
      openWhatsAppSupport(t("components.chatbot.whatsappPrefill"));
    } finally {
      setEscalating(false);
    }
  };

  const chatPanel = (
    <Card
      className={cn(
        "shadow-2xl flex flex-col overflow-hidden",
        nativeMobile
          ? "fixed inset-0 z-[60] h-[100dvh] w-full max-w-none rounded-none border-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-top-4 fade-in duration-200"
          : "fixed bottom-6 right-6 w-96 h-[500px] z-50",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-primary/5 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {nativeMobile ? (
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          ) : (
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
          )}
          <div className="min-w-0">
            <CardTitle className="truncate text-base sm:text-lg">
              {t("components.chatbot.title")}
            </CardTitle>
            {nativeMobile && (
              <p className="truncate text-xs text-muted-foreground">
                {t("components.chatbot.mobileSubtitle")}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 shrink-0"
          aria-label={t("components.chatbot.close")}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="border-t p-3 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleTalkToHuman}
            disabled={escalating}
          >
            {escalating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            {t("components.chatbot.talkToHuman")}
          </Button>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("components.chatbot.placeholder")}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (nativeMobile) {
    return (
      <>
        {!isOpen && (
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[60]">
            <div className="pointer-events-auto absolute right-3 top-[calc(env(safe-area-inset-top)+0.5rem)]">
              <Button
                onClick={() => setIsOpen(true)}
                size="sm"
                className="h-10 gap-1.5 rounded-full px-3 shadow-lg"
                aria-label={t("components.chatbot.open")}
              >
                <Bot className="h-4 w-4" />
                <span className="text-xs font-semibold">{t("components.chatbot.mobileBadge")}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </div>
          </div>
        )}
        {isOpen && chatPanel}
      </>
    );
  }

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
          aria-label={t("components.chatbot.open")}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
      {isOpen && chatPanel}
    </>
  );
};

export default Chatbot;
