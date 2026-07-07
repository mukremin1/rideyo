export type SmsProvider = "demo" | "netgsm";

export type SmsSendResult = { ok: true } | { ok: false; error: string };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function resolveProvider(): SmsProvider {
  const raw = (Deno.env.get("SMS_PROVIDER") || "demo").toLowerCase();
  if (raw === "netgsm") return "netgsm";
  return "demo";
}

/** Netgsm expects 90XXXXXXXXXX (no +). */
export function formatSmsRecipient(phoneE164: string): string {
  const digits = digitsOnly(phoneE164);
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  return digits;
}

export async function sendSms(phoneE164: string, message: string): Promise<SmsSendResult> {
  const provider = resolveProvider();

  if (provider === "demo") {
    console.log(`[sms:demo] To ${phoneE164}: ${message}`);
    return { ok: true };
  }

  const usercode = Deno.env.get("NETGSM_USERCODE");
  const password = Deno.env.get("NETGSM_PASSWORD");
  const msgheader = Deno.env.get("NETGSM_MSGHEADER");

  if (!usercode || !password || !msgheader) {
    return { ok: false, error: "Netgsm yapilandirmasi eksik (NETGSM_USERCODE, NETGSM_PASSWORD, NETGSM_MSGHEADER)" };
  }

  const gsm = formatSmsRecipient(phoneE164);
  const url = new URL("https://api.netgsm.com.tr/sms/send/get");
  url.searchParams.set("usercode", usercode);
  url.searchParams.set("password", password);
  url.searchParams.set("gsmno", gsm);
  url.searchParams.set("message", message);
  url.searchParams.set("msgheader", msgheader);
  url.searchParams.set("dil", "TR");

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    const body = (await res.text()).trim();
    // Netgsm success codes often start with 00
    if (!res.ok || (!body.startsWith("00") && !body.startsWith("0"))) {
      console.error("[sms:netgsm] response:", body);
      return { ok: false, error: `SMS gonderilemedi (${body || res.status})` };
    }
    return { ok: true };
  } catch (error) {
    console.error("[sms:netgsm] error:", error);
    return { ok: false, error: "SMS servisine ulasilamadi" };
  }
}

export function isSmsDemoMode(): boolean {
  return resolveProvider() === "demo";
}
