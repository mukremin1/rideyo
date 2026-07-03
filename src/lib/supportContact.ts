import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_WHATSAPP = "+905395263293";

export type SupportTicketCategory = "payment" | "rental" | "vehicle" | "account" | "other";
export type SupportTicketSource = "in_app" | "chatbot" | "support_page" | "contact_page" | "whatsapp";

export type CreateSupportTicketInput = {
  subject: string;
  message: string;
  category?: SupportTicketCategory;
  source?: SupportTicketSource;
  userId?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  bookingId?: string;
};

export function openWhatsAppSupport(message: string) {
  const digits = SUPPORT_WHATSAPP.replace(/[^0-9]/g, "");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildWhatsAppTicketMessage(ticketRef: string, summary?: string) {
  const lines = [
    `Merhaba, RideYo destek talebim var.`,
    `Talep no: ${ticketRef}`,
  ];
  if (summary?.trim()) {
    lines.push("", summary.trim());
  }
  return lines.join("\n");
}

export async function createSupportTicket(input: CreateSupportTicketInput) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: input.userId ?? null,
      contact_name: input.contactName ?? null,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      subject: input.subject,
      message: input.message,
      category: input.category ?? "other",
      source: input.source ?? "in_app",
      booking_id: input.bookingId ?? null,
    })
    .select("id, ticket_ref")
    .single();

  if (error) throw error;
  return data;
}
