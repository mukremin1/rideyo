import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Headphones, Mail, MessageSquare, Phone, RefreshCw, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useDateLocale } from "@/hooks/useDateLocale";
import { openWhatsAppSupport, buildWhatsAppTicketMessage } from "@/lib/supportContact";

type SupportTicket = {
  id: string;
  ticket_ref: string;
  user_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subject: string;
  message: string;
  category: string;
  status: string;
  source: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

const STATUS_TABS = ["all", "open", "in_progress", "resolved", "closed"] as const;

const AdminSupportSection = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>("open");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("admin.support.loadError"));
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as SupportTicket[];
    setTickets(rows);

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);

      const map: Record<string, UserProfile> = {};
      for (const p of profileRows ?? []) {
        map[p.id] = p as UserProfile;
      }
      setProfiles(map);
    } else {
      setProfiles({});
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = useMemo(() => {
    if (statusTab === "all") return tickets;
    return tickets.filter((ticket) => ticket.status === statusTab);
  }, [tickets, statusTab]);

  const openCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length,
    [tickets],
  );

  const updateTicket = async (
    ticket: SupportTicket,
    patch: { status?: string; admin_notes?: string },
  ) => {
    setBusyId(ticket.id);
    const payload: Record<string, string | null> = {};
    if (patch.status) {
      payload.status = patch.status;
      payload.resolved_at =
        patch.status === "resolved" || patch.status === "closed" ? new Date().toISOString() : null;
    }
    if (patch.admin_notes !== undefined) {
      payload.admin_notes = patch.admin_notes || null;
    }

    const { error } = await supabase.from("support_tickets").update(payload).eq("id", ticket.id);
    setBusyId(null);

    if (error) {
      toast.error(t("admin.support.updateError"));
      return;
    }

    toast.success(t("admin.support.updateSuccess"));
    fetchTickets();
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "outline",
    };
    return (
      <Badge variant={variants[status] ?? "outline"} className="text-xs">
        {t(`admin.support.status.${status}`)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Headphones className="h-5 w-5 shrink-0" />
            {t("admin.support.title")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t("admin.support.subtitle")}
          </p>
          {openCount > 0 && (
            <p className="mt-2 text-sm font-medium text-destructive">
              {t("admin.support.openCount", { count: openCount })}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={fetchTickets} disabled={loading} className="shrink-0">
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.support.refresh")}
        </Button>
      </div>

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as (typeof STATUS_TABS)[number])}>
        <TabsList className="flex h-auto w-full max-w-full gap-1 overflow-x-auto p-1 hide-scrollbar">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="shrink-0 text-xs sm:text-sm">
              {t(`admin.support.tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-4">
            {loading ? (
              <p className="py-8 text-center text-muted-foreground">{t("common.loading")}</p>
            ) : filteredTickets.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t("admin.support.empty")}</p>
            ) : (
              filteredTickets.map((ticket) => {
                const profile = ticket.user_id ? profiles[ticket.user_id] : null;
                const displayName =
                  profile?.full_name || ticket.contact_name || t("admin.support.unknownUser");
                const phone = profile?.phone || ticket.contact_phone;
                const email = ticket.contact_email;
                const notesValue = notesDraft[ticket.id] ?? ticket.admin_notes ?? "";

                return (
                  <Card key={ticket.id} className="overflow-hidden p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{ticket.ticket_ref}</span>
                            {statusBadge(ticket.status)}
                            <Badge variant="outline" className="text-xs">
                              {t(`admin.support.category.${ticket.category}`)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {t(`admin.support.source.${ticket.source}`)}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold break-words">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(ticket.created_at), "dd MMM yyyy HH:mm", { locale: dateLocale })}
                          </p>
                        </div>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => updateTicket(ticket, { status: value })}
                          disabled={busyId === ticket.id}
                        >
                          <SelectTrigger className="w-[10.5rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["open", "in_progress", "resolved", "closed"] as const).map((status) => (
                              <SelectItem key={status} value={status}>
                                {t(`admin.support.status.${status}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.message}</p>

                      <div className="flex flex-wrap gap-4 border-t border-border/60 pt-4 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="break-words">{displayName}</span>
                        </div>
                        {phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <a href={`tel:${phone}`} className="hover:underline">
                              {phone}
                            </a>
                          </div>
                        )}
                        {email && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <a href={`mailto:${email}`} className="break-all hover:underline">
                              {email}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() =>
                            openWhatsAppSupport(
                              buildWhatsAppTicketMessage(ticket.ticket_ref, ticket.subject),
                            )
                          }
                        >
                          <MessageSquare className="h-4 w-4" />
                          {t("admin.support.replyWhatsApp")}
                        </Button>
                      </div>

                      <div className="space-y-2 border-t border-border/60 pt-4">
                        <Label className="text-sm">{t("admin.support.adminNotes")}</Label>
                        <Textarea
                          value={notesValue}
                          onChange={(e) =>
                            setNotesDraft((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          rows={2}
                          placeholder={t("admin.support.adminNotesPlaceholder")}
                        />
                        <Button
                          size="sm"
                          disabled={busyId === ticket.id}
                          onClick={() =>
                            updateTicket(ticket, {
                              admin_notes: notesValue,
                              status: ticket.status,
                            })
                          }
                        >
                          {t("admin.support.saveNotes")}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminSupportSection;
