import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User as UserIcon, Loader2, MessageSquare, Phone, Headphones } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from "@/lib/appConfig";
import { useAuth } from "@/hooks/useAuth";
import {
  SUPPORT_WHATSAPP,
  buildWhatsAppTicketMessage,
  createSupportTicket,
  openWhatsAppSupport,
} from "@/lib/supportContact";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const Support = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("support.page.welcome") }]);
  }, [i18n.language, t]);

  const handleWhatsApp = () => {
    openWhatsAppSupport(t("support.page.whatsappMessage"));
  };

  const handlePhoneCall = () => {
    window.location.href = `tel:${SUPPORT_WHATSAPP}`;
  };

  const handleTalkToHuman = async () => {
    if (escalating) return;
    setEscalating(true);

    try {
      const chatSummary = messages
        .filter((m) => m.role === "user")
        .slice(-3)
        .map((m) => m.content)
        .join("\n");

      if (user) {
        const ticket = await createSupportTicket({
          userId: user.id,
          subject: t("support.page.humanTicketSubject"),
          message: chatSummary || t("support.page.humanTicketDefaultMessage"),
          category: "other",
          source: "support_page",
        });
        openWhatsAppSupport(buildWhatsAppTicketMessage(ticket.ticket_ref, chatSummary));
        toast.success(t("support.page.ticketCreated", { ref: ticket.ticket_ref }));
      } else {
        openWhatsAppSupport(
          chatSummary
            ? `${t("support.page.whatsappMessage")}\n\n${chatSummary}`
            : t("support.page.whatsappMessage"),
        );
      }
    } catch {
      toast.error(t("support.page.ticketCreateFailed"));
      openWhatsAppSupport(t("support.page.whatsappMessage"));
    } finally {
      setEscalating(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const response = await fetch(getSupabaseFunctionsUrl("ai-support"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getSupabaseAnonKey()}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok || !response.body) {
        throw new Error(t("support.page.streamError"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

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
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (const raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || !raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            // ignore malformed trailing chunk
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(t("support.page.sendFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-4xl font-bold text-foreground">{t("support.page.title")}</h1>
              <Badge variant="secondary" className="gap-2">
                <Bot className="w-4 h-4" />
                {t("support.page.aiBadge")}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4">{t("support.page.subtitle")}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleTalkToHuman} disabled={escalating} className="gap-2">
                {escalating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Headphones className="w-4 h-4" />
                )}
                {t("support.page.talkToHuman")}
              </Button>
              <Button onClick={handleWhatsApp} variant="outline" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                {t("support.page.whatsappContact")}
              </Button>
              <Button onClick={handlePhoneCall} variant="outline" className="gap-2">
                <Phone className="w-4 h-4" />
                {t("support.page.phone")}: {SUPPORT_WHATSAPP}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t("support.page.humanHint")}</p>
          </div>

          <Card className="p-4 h-[600px] flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="rounded-lg p-3 bg-muted">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder={t("support.page.placeholder")}
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
